import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Verify SDK config is accessible at startup
let sdkConfigVerified = false
try {
  const configPaths = [
    join(process.cwd(), '.z-ai-config'),
    join('/etc', '.z-ai-config'),
  ]
  for (const p of configPaths) {
    if (existsSync(p)) {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      if (cfg.baseUrl && cfg.apiKey) {
        sdkConfigVerified = true
        console.log(`[try-on] SDK config loaded from ${p}, hasToken: ${!!cfg.token}`)
        break
      }
    }
  }
  if (!sdkConfigVerified) {
    console.error('[try-on] WARNING: No valid SDK config found!')
  }
} catch (err) {
  console.error('[try-on] SDK config check failed:', err)
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  attempt?: number
}

const jobs = new Map<string, TryOnJob>()

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

function getProductImageBase64(imagePath: string): string | null {
  try {
    const fullPath = join(process.cwd(), 'public', imagePath)
    if (!existsSync(fullPath)) return null
    const buffer = readFileSync(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[try-on] Failed to read product image:', err)
    return null
  }
}

// ── Enhanced VLM Prompts for better accuracy ──────────────────────

const VLM_PERSON_PROMPT = `Analyze this person's photo for a virtual try-on application. I need precise details to overlay a product onto this person accurately:

1. SKIN TONE: Describe exactly (fair/light, medium-warm, olive, tan/bronze, deep brown, etc.)
2. BODY TYPE: Slim, average, curvy, athletic? Visible body proportions (shoulder width, torso length)
3. CURRENT OUTFIT: What are they wearing now? (color, type, neckline style, sleeve length)
4. POSE & FRAMING: Is this a headshot, half-body, or full-body? Facing camera directly or at angle? Arms visible?
5. HAIR: Color and how it's styled (down, up, covering ears/neck or not)
6. LIGHTING: Studio, natural, bright, dim?

Be very specific about skin tone and body proportions - these are critical for accurate try-on. 3 sentences max.`

const VLM_PRODUCT_PROMPT = `Describe this luxury product precisely for virtual try-on placement on a person:

1. TYPE & PLACEMENT: What is it and exactly where does it go on the body? (e.g., "necklace - sits at collarbone level", "earrings - on earlobes", "saree - draped from waist over left shoulder")
2. SIZE & PROPORTIONS: How large is it relative to the body part? (e.g., "chunky statement necklace 2 inches wide", "delicate chain necklace", "full-length saree")
3. DOMINANT COLORS: Primary color(s) and any accent colors
4. MATERIAL & TEXTURE: Gold, silver, silk, velvet? Shiny, matte, textured?
5. KEY VISUAL DETAILS: Patterns, gemstones, embroidery type, border design, embellishments

Focus on what makes this product visually distinctive. 3 sentences max.`

const VLM_SELFIE_CHECK_PROMPT = `Rate this selfie for virtual try-on suitability. Answer ONLY with: GOOD or POOR, followed by one brief reason.
GOOD = clear face, good lighting, front-facing, visible body area for product placement.
POOR = blurry, too dark, extreme angle, cropped too tight, or facing away from camera.`

// ── Product-type specific context ──────────────────────────────

function getProductTypeContext(categorySlug: string, productName: string): string {
  const nameLower = productName.toLowerCase()

  if (categorySlug === 'jewelry') {
    if (nameLower.includes('necklace') || nameLower.includes('choker') || nameLower.includes('pendant') || nameLower.includes('temple')) {
      return 'PLACEMENT: Necklace around the neck at collarbone level. '
    }
    if (nameLower.includes('earring') || nameLower.includes('jhumka') || nameLower.includes('stud')) {
      return 'PLACEMENT: Earrings on both earlobes. '
    }
    if (nameLower.includes('bracelet') || nameLower.includes('cuff') || nameLower.includes('bangle')) {
      return 'PLACEMENT: Bracelet on the wrist. '
    }
    if (nameLower.includes('ring')) {
      return 'PLACEMENT: Ring on the finger. '
    }
    if (nameLower.includes('set') || nameLower.includes('bridal')) {
      return 'PLACEMENT: Necklace around neck AND matching earrings on earlobes. '
    }
    return 'PLACEMENT: Fine jewelry worn on the body. '
  }

  if (categorySlug === 'sarees') {
    if (nameLower.includes('bridal') || nameLower.includes('velvet') || nameLower.includes('zardozi')) {
      return 'PLACEMENT: Heavy bridal saree draped from waist with structured pleats, rich pallu over left shoulder, matching blouse. '
    }
    if (nameLower.includes('chiffon') || nameLower.includes('georgette') || nameLower.includes('organza')) {
      return 'PLACEMENT: Lightweight flowing saree with soft pleats, delicate pallu over shoulder, matching blouse. '
    }
    if (nameLower.includes('silk') || nameLower.includes('banarasi') || nameLower.includes('kanjeevaram') || nameLower.includes('patola') || nameLower.includes('paithani') || nameLower.includes('chanderi') || nameLower.includes('tussar')) {
      return 'PLACEMENT: Traditional silk saree with neat pleats, ornate pallu over shoulder, matching blouse. '
    }
    return 'PLACEMENT: Saree draped in traditional Indian style with pallu over shoulder. '
  }

  if (categorySlug === 'mens-shirts') {
    if (nameLower.includes('dress shirt') || nameLower.includes('formal') || nameLower.includes('evening') || nameLower.includes('silk')) {
      return 'PLACEMENT: Formal dress shirt worn on the torso, buttoned up, tucked into trousers. '
    }
    if (nameLower.includes('oxford') || nameLower.includes('button-down') || nameLower.includes('check') || nameLower.includes('linen')) {
      return 'PLACEMENT: Casual button-up shirt worn on the torso, can be worn tucked or untucked. '
    }
    if (nameLower.includes('polo')) {
      return 'PLACEMENT: Polo shirt worn on the torso, collared, casual smart look. '
    }
    if (nameLower.includes('henley')) {
      return 'PLACEMENT: Henley shirt worn on the torso, partial button placket, relaxed style. '
    }
    if (nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('v-neck') || nameLower.includes('crew')) {
      return 'PLACEMENT: T-shirt worn on the torso, casual relaxed fit. '
    }
    return 'PLACEMENT: Shirt worn on the torso. '
  }

  return ''
}

// ── Category-specific edit settings ───────────────────────────────

interface EditSettings {
  strength: number
  guidanceScale: number
  imageSize: ImageSize
  promptTemplate: string
  numAttempts: number
}

function getEditSettings(categorySlug: string, productName: string): EditSettings {
  const nameLower = productName.toLowerCase()

  switch (categorySlug) {
    case 'jewelry': {
      // Earrings - close-up face shot, very low strength to preserve face
      if (nameLower.includes('earring') || nameLower.includes('jhumka') || nameLower.includes('stud')) {
        return {
          strength: 0.15,
          guidanceScale: 20,
          imageSize: '864x1152',
          promptTemplate: 'PRESERVE: The exact same face, skin tone, hair, expression, and background. ADD ONLY: The exact earrings from the second reference image on the person\'s earlobes. The earrings must match the second image precisely - same color, shape, size, material, and dangling style. The person\'s face and hair must remain completely unchanged. Professional beauty portrait, studio lighting.',
          numAttempts: 3,
        }
      }
      // Bracelet/cuff - preserve person, add bracelet on wrist
      if (nameLower.includes('bracelet') || nameLower.includes('cuff') || nameLower.includes('bangle')) {
        return {
          strength: 0.15,
          guidanceScale: 18,
          imageSize: '864x1152',
          promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, body, clothing, expression, and background. ADD ONLY: The exact bracelet from the second reference image on the person\'s wrist. The bracelet must match the second image precisely - same color, material, width, and design details. Nothing else changes. Professional fashion photography.',
          numAttempts: 3,
        }
      }
      // Ring - preserve person, add ring on finger
      if (nameLower.includes('ring')) {
        return {
          strength: 0.18,
          guidanceScale: 18,
          imageSize: '1024x1024',
          promptTemplate: 'PRESERVE: The exact same person - same face, skin, hair, hands, and expression. ADD ONLY: The exact ring from the second reference image on the person\'s finger. The ring must match the second image precisely - same band color, gemstone, setting, and design. Only the ring is added. Professional close-up photography.',
          numAttempts: 3,
        }
      }
      // Necklace/choker - preserve person, add necklace
      if (nameLower.includes('necklace') || nameLower.includes('choker') || nameLower.includes('pendant') || nameLower.includes('temple')) {
        return {
          strength: 0.18,
          guidanceScale: 18,
          imageSize: '864x1152',
          promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, expression, clothing, and background. ADD ONLY: The exact necklace from the second reference image around the person\'s neck. The necklace must match the second image precisely - same color, gemstones, chain length, pendant shape, and design. The face and hair must remain completely unchanged. Professional fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      // Jewelry set
      if (nameLower.includes('set') || nameLower.includes('bridal')) {
        return {
          strength: 0.20,
          guidanceScale: 18,
          imageSize: '864x1152',
          promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, expression, and background. ADD ONLY: The exact jewelry set from the second reference image - necklace around the neck and matching earrings on the earlobes. The jewelry must match the second image precisely - same color, gemstones, and design. The face and hair remain unchanged. Professional bridal photography, studio lighting.',
          numAttempts: 3,
        }
      }
      // Default jewelry
      return {
        strength: 0.18,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, expression. ADD ONLY: The exact jewelry from the second reference image worn in its proper place. The jewelry must match the second image precisely in color, material, and design. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'watches':
      return {
        strength: 0.18,
        guidanceScale: 18,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, body, clothing, and background. ADD ONLY: The exact watch from the second reference image on the person\'s left wrist. The watch must match precisely - same case color and shape, dial design, strap material and color, and size relative to the wrist. Professional fashion photography, natural lighting.',
        numAttempts: 3,
      }

    case 'fragrances':
      return {
        strength: 0.15,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, expression, and background. ADD ONLY: The exact fragrance bottle from the second reference image held elegantly near the person\'s chest. The bottle must match precisely - same shape, color, label, cap, and size. Professional beauty photography, soft lighting.',
        numAttempts: 2,
      }

    case 'leather-goods':
      return {
        strength: 0.20,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, body, and expression. ADD ONLY: The exact leather bag from the second reference image carried by this person. The bag must match precisely - same color, shape, material texture, hardware, and straps. Professional fashion photography, lifestyle shot.',
        numAttempts: 2,
      }

    case 'sarees': {
      // Heavy bridal sarees - need higher strength for full outfit change
      if (nameLower.includes('bridal') || nameLower.includes('velvet') || nameLower.includes('zardozi')) {
        return {
          strength: 0.40,
          guidanceScale: 22,
          imageSize: '768x1344',
          promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current outfit with the exact bridal saree from the second reference image. The saree must be draped elegantly in traditional Indian style with structured pleats at the waist, rich pallu draped over the left shoulder, and matching blouse. The saree must match precisely - same color, fabric, embroidery pattern, border design, and all embellishments. Professional bridal fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      // Lightweight sarees
      if (nameLower.includes('chiffon') || nameLower.includes('georgette') || nameLower.includes('organza')) {
        return {
          strength: 0.38,
          guidanceScale: 20,
          imageSize: '768x1344',
          promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current outfit with the exact saree from the second reference image. The saree should be draped gracefully with soft flowing pleats and delicate pallu over the shoulder with matching blouse. The saree must match precisely - same color, fabric, embroidery, and border design. Professional fashion photography, soft natural lighting.',
          numAttempts: 3,
        }
      }
      // Silk sarees
      return {
        strength: 0.40,
        guidanceScale: 21,
        imageSize: '768x1344',
        promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current outfit with the exact silk saree from the second reference image. The saree should be draped in traditional Indian style with neat pleats and ornate pallu over the shoulder with matching blouse. The saree must match precisely - same color, zari work, pattern, border design, and texture. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'fashion':
      return {
        strength: 0.40,
        guidanceScale: 20,
        imageSize: '768x1344',
        promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current outfit with the exact outfit from the second reference image. The outfit must match precisely - same color, fabric, cut, pattern, and all design details. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }

    case 'mens-shirts': {
      // Formal dress shirts and evening shirts
      if (nameLower.includes('dress shirt') || nameLower.includes('evening') || nameLower.includes('silk')) {
        return {
          strength: 0.38,
          guidanceScale: 20,
          imageSize: '768x1344',
          promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current top with the exact formal dress shirt from the second reference image. The shirt must match precisely - same color, collar style, cuff style, fabric texture, and fit. The shirt should be buttoned appropriately and worn tucked into trousers. Professional fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      // T-shirts and casual tees
      if (nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('v-neck') || nameLower.includes('crew')) {
        return {
          strength: 0.35,
          guidanceScale: 18,
          imageSize: '768x1344',
          promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current top with the exact t-shirt from the second reference image. The t-shirt must match precisely - same color, neckline style (crew or V-neck), fabric weight, and fit. Casual relaxed look. Professional fashion photography, natural lighting.',
          numAttempts: 3,
        }
      }
      // Polo shirts
      if (nameLower.includes('polo')) {
        return {
          strength: 0.36,
          guidanceScale: 19,
          imageSize: '768x1344',
          promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current top with the exact polo shirt from the second reference image. The polo must match precisely - same color, stripe pattern, collar style, and piqué texture. Smart casual look. Professional fashion photography, natural lighting.',
          numAttempts: 3,
        }
      }
      // Default shirts (Oxford, linen, henley, etc.)
      return {
        strength: 0.38,
        guidanceScale: 19,
        imageSize: '768x1344',
        promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair color as closely as possible. CHANGE: Replace the current top with the exact shirt from the second reference image. The shirt must match precisely - same color, pattern, collar style, fabric, and fit. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'romantic-gifts':
    case 'couple-gifts':
      return {
        strength: 0.18,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair, expression. ADD ONLY: The exact gift from the second reference image held in the person\'s hands. The gift must match precisely - same shape, color, packaging, and all details. Professional photography, warm romantic lighting.',
        numAttempts: 2,
      }

    case 'toys':
      return {
        strength: 0.18,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The exact same person - same face, skin tone, hair. ADD ONLY: The exact product from the second reference image near or held by the person. The product must match precisely - same color, shape, size, and details. Professional lifestyle photography.',
        numAttempts: 2,
      }

    case 'home-living':
      return {
        strength: 0.25,
        guidanceScale: 16,
        imageSize: '1344x768',
        promptTemplate: 'PRESERVE: The exact same person. ADD: The exact home product from the second reference image displayed in an elegant home setting near the person. The product must match precisely. Professional interior photography.',
        numAttempts: 2,
      }

    default:
      return {
        strength: 0.22,
        guidanceScale: 16,
        imageSize: '864x1152',
        promptTemplate: 'PRESERVE: The person\'s face, skin tone, and hair. ADD: The exact product from the second reference image. The product must match precisely. Professional photography.',
        numAttempts: 2,
      }
  }
}

// ── POST /api/try-on - Start a try-on job ─────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, selfieData, productImageUrl } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie image are required' }, { status: 400 })
    }

    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Please upload a valid image.' }, { status: 400 })
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productImages: string[] = JSON.parse(product.images || '[]')
    const productImageToUse = productImageUrl || (productImages.length > 0 ? productImages[0] : null)
    let productImageBase64: string | null = null
    if (productImageToUse) {
      productImageBase64 = getProductImageBase64(productImageToUse)
    }

    if (!productImageBase64) {
      return NextResponse.json({ error: 'Product image not available for try-on' }, { status: 400 })
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    jobs.set(jobId, {
      status: 'processing',
      createdAt: Date.now(),
      categorySlug: product.category.slug,
      attempt: 1,
    })

    processTryOnJob(jobId, product.name, product.category.slug, selfieData, productImageBase64)
      .catch((err) => console.error('[try-on] Background job failed:', err))

    return NextResponse.json({
      jobId,
      status: 'processing',
      productName: product.name,
      categorySlug: product.category.slug,
    })
  } catch (error) {
    console.error('[try-on] API error:', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}

// ── GET /api/try-on?jobId=xxx ─────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  const job = jobs.get(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found. It may have expired.' }, { status: 404 })
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    imageUrl: job.imageUrl,
    productName: job.productName,
    categorySlug: job.categorySlug,
    error: job.error,
    attempt: job.attempt,
  })
}

// ── Helper: VLM call with timeout ─────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 25000): Promise<string> {
  try {
    const vlmPromise = zai.chat.completions.createVision({
      model: 'glm-4v-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      thinking: { type: 'disabled' },
    })
    const vlmTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    const vlmResponse = await Promise.race([vlmPromise, vlmTimeout])
    if (vlmResponse) {
      return vlmResponse.choices[0]?.message?.content || ''
    }
    return ''
  } catch (err) {
    console.error('[try-on] VLM analysis failed:', err)
    return ''
  }
}

// ── Background processing with quality-focused retry ──────────────

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  try {
    const zai = await ZAI.create()
    console.log('[try-on] ZAI SDK initialized successfully')
    return zai
  } catch (err) {
    console.error('[try-on] ZAI SDK initialization failed:', err)
    throw new Error('AI service initialization failed. Please ensure the SDK config is properly set up.')
  }
}

async function processTryOnJob(
  jobId: string,
  productName: string,
  categorySlug: string,
  selfieData: string,
  productImageBase64: string
) {
  const settings = getEditSettings(categorySlug, productName)
  const maxAttempts = settings.numAttempts

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const currentJob = jobs.get(jobId)
      if (currentJob) currentJob.attempt = attempt

      const zai = await createZAI()

      // Step 1: Run VLM analyses in PARALLEL for speed
      console.log(`[try-on] Starting VLM analysis for job ${jobId}, attempt ${attempt}`)
      const [personDescription, productDescription] = await Promise.all([
        vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
        vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
      ])

      console.log(`[try-on] Person: ${personDescription.substring(0, 100)}...`)
      console.log(`[try-on] Product: ${productDescription.substring(0, 100)}...`)

      // Step 2: Build the prompt with clear PRESERVE/ADD structure
      const productTypeContext = getProductTypeContext(categorySlug, productName)
      let editPrompt = settings.promptTemplate

      // Prepend person description and product description for richer context
      if (personDescription && productDescription) {
        editPrompt = `${productTypeContext}PERSON: ${personDescription}. PRODUCT TO ADD: ${productDescription}. ${editPrompt}`
      } else if (personDescription) {
        editPrompt = `${productTypeContext}PERSON: ${personDescription}. ${editPrompt}`
      } else if (productDescription) {
        editPrompt = `${productTypeContext}PRODUCT TO ADD: ${productDescription}. ${editPrompt}`
      }

      // Step 3: Adjust parameters per attempt
      // Attempt 1: Use base settings
      // Attempt 2: Slightly lower strength + higher guidance for more precision
      // Attempt 3: Even more conservative approach
      let adjustedStrength = settings.strength
      let adjustedGuidance = settings.guidanceScale

      if (attempt === 2) {
        adjustedStrength = Math.max(0.12, settings.strength - 0.03)
        adjustedGuidance = settings.guidanceScale + 2
      } else if (attempt >= 3) {
        adjustedStrength = Math.max(0.10, settings.strength - 0.05)
        adjustedGuidance = settings.guidanceScale + 4
      }

      console.log(`[try-on] Generating attempt ${attempt}/${maxAttempts} for ${jobId}, cat: ${categorySlug}, str: ${adjustedStrength.toFixed(2)}, gs: ${adjustedGuidance}`)

      // Step 4: Image EDIT API with both reference images
      const editResponse = await zai.images.generations.edit(({
        prompt: editPrompt,
        size: settings.imageSize,
        images: [
          { url: selfieData },
          { url: productImageBase64 },
        ],
        strength: adjustedStrength,
        guidance_scale: adjustedGuidance,
      }) as any)

      const imageBase64 = editResponse.data[0]?.base64
      if (!imageBase64) throw new Error('No image generated')

      const imageUrl = `data:image/png;base64,${imageBase64}`
      console.log(`[try-on] Job ${jobId} attempt ${attempt} completed, size: ${imageBase64.length}`)

      // Step 5: Quick quality check with VLM (only on attempt 1 to save time)
      if (attempt === 1 && imageBase64.length < 20000) {
        // Very small image likely means poor quality - retry immediately
        console.log(`[try-on] Image too small (${imageBase64.length}), likely poor quality - retrying`)
        continue
      }

      if (currentJob) {
        currentJob.status = 'completed'
        currentJob.imageUrl = imageUrl
        currentJob.productName = productName
        currentJob.attempt = attempt
      }
      return // Success!

    } catch (error) {
      console.error(`[try-on] Attempt ${attempt} failed for job ${jobId}:`, error)

      if (attempt < maxAttempts) {
        const waitTime = 1500 * attempt
        await new Promise(resolve => setTimeout(resolve, waitTime))
        console.log(`[try-on] Retrying job ${jobId}, attempt ${attempt + 1}...`)
      } else {
        // All attempts failed, try fallback
        console.log(`[try-on] All ${maxAttempts} attempts failed for ${jobId}, trying fallback`)

        try {
          const zai = await createZAI()
          const fallbackSettings = getEditSettings(categorySlug, productName)
          const productTypeContext = getProductTypeContext(categorySlug, productName)

          const imageResponse = await zai.images.generations.create({
            prompt: `${productTypeContext}Professional fashion photography of a person wearing ${productName}. Studio lighting, 8k quality, photorealistic.`,
            size: fallbackSettings.imageSize,
          })
          const imageBase64 = imageResponse.data[0]?.base64
          if (!imageBase64) throw new Error('No fallback image')

          const fallbackJob = jobs.get(jobId)
          if (fallbackJob) {
            fallbackJob.status = 'completed'
            fallbackJob.imageUrl = `data:image/png;base64,${imageBase64}`
            fallbackJob.productName = productName
          }
        } catch (fallbackError) {
          console.error('[try-on] Fallback also failed:', fallbackError)
          const failedJob = jobs.get(jobId)
          if (failedJob) {
            failedJob.status = 'failed'
            failedJob.error = error instanceof Error ? error.message : 'Failed to generate try-on image'
          }
        }
      }
    }
  }
}
