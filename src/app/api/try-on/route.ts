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
  originalSelfie?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  attempt?: number
  faceScore?: number
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

// ── Enhanced VLM Prompts ──────────────────────────────────────────

const VLM_PERSON_PROMPT = `Analyze this person's photo for a virtual try-on. I need VERY precise details:

1. FACE: Face shape (round, oval, square, heart), skin tone (fair, medium-warm, olive, tan, deep brown), any distinctive facial features
2. BODY: Body type (slim, average, curvy, athletic), visible proportions
3. HAIR: Exact color, length, and style (up/down, covering ears or not)
4. POSE: Headshot, half-body, or full-body? Facing camera or angled? Arms visible?
5. CURRENT OUTFIT: What they're wearing now, neckline style, colors
6. EXPRESSION: Smiling, neutral, serious?

Be extremely specific about face shape, skin tone, and hair - these are CRITICAL for face preservation. 3 sentences max.`

const VLM_PRODUCT_PROMPT = `Describe this luxury product in precise detail for virtual try-on:

1. TYPE: What is it? (necklace, earrings, saree, shirt, watch, etc.)
2. WHERE ON BODY: Exactly where does it go? (around neck, on earlobes, draped from waist, on torso, on wrist)
3. COLORS: Primary color and all accent colors
4. MATERIAL: Gold, silver, silk, cotton, leather? Shiny or matte?
5. KEY DETAILS: Patterns, gemstones, embroidery, border design, collar style, sleeve type
6. SIZE RELATIVE TO BODY: How big is it on the body? (delicate, statement, full-length)

Be very specific - every detail helps accuracy. 3 sentences max.`

const VLM_FACE_CHECK_PROMPT = `Compare these two images. The FIRST image is the original selfie, the SECOND is an AI-generated try-on result. 

Rate how well the face in the SECOND image matches the face in the FIRST image. Consider: face shape, skin tone, hair color/style, facial features (eyes, nose, mouth), and overall facial identity.

Answer with ONLY a number from 1-10 where:
1-3 = Face is completely different person
4-5 = Face somewhat resembles but clearly different
6-7 = Face is similar but noticeably altered
8-9 = Face is very close match, minor differences
10 = Face is identical, perfect match

Then give ONE brief reason for your score. Format: SCORE|REASON`

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
      return 'PLACEMENT: Formal dress shirt on the torso, buttoned up. '
    }
    if (nameLower.includes('oxford') || nameLower.includes('button-down') || nameLower.includes('check') || nameLower.includes('linen')) {
      return 'PLACEMENT: Casual button-up shirt on the torso. '
    }
    if (nameLower.includes('polo')) {
      return 'PLACEMENT: Polo shirt on the torso, collared. '
    }
    if (nameLower.includes('henley')) {
      return 'PLACEMENT: Henley shirt on the torso. '
    }
    if (nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('v-neck') || nameLower.includes('crew')) {
      return 'PLACEMENT: T-shirt on the torso, casual fit. '
    }
    return 'PLACEMENT: Shirt on the torso. '
  }

  return ''
}

// ── Category-specific edit settings (OPTIMIZED FOR FACE PRESERVATION) ───

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
      // Jewelry: VERY low strength - we only need to add small items, face must stay identical
      if (nameLower.includes('earring') || nameLower.includes('jhumka') || nameLower.includes('stud')) {
        return {
          strength: 0.12,
          guidanceScale: 25,
          imageSize: '864x1152',
          promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, expression, eyes, nose, mouth, and background. Do NOT alter the face in ANY way. ADD ONLY: The described earrings on the person\'s earlobes. The earrings must match the product description precisely. NOTHING ELSE CHANGES. The face must be 100% identical to the original. Professional beauty portrait, studio lighting.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('bracelet') || nameLower.includes('cuff') || nameLower.includes('bangle')) {
        return {
          strength: 0.12,
          guidanceScale: 24,
          imageSize: '864x1152',
          promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, body, clothing, expression, and background. Do NOT alter the face in ANY way. ADD ONLY: The described bracelet on the person\'s wrist matching the product description precisely. NOTHING ELSE CHANGES. The face must be 100% identical to the original. Professional fashion photography.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('ring')) {
        return {
          strength: 0.14,
          guidanceScale: 24,
          imageSize: '1024x1024',
          promptTemplate: 'CRITICAL: Keep the EXACT same face, skin, hair, hands, and expression. Do NOT alter the face in ANY way. ADD ONLY: The described ring on the person\'s finger matching the product description precisely. NOTHING ELSE CHANGES. The face must be 100% identical to the original. Professional close-up photography.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('necklace') || nameLower.includes('choker') || nameLower.includes('pendant') || nameLower.includes('temple')) {
        return {
          strength: 0.14,
          guidanceScale: 24,
          imageSize: '864x1152',
          promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, expression, eyes, nose, mouth, and background. Do NOT alter the face in ANY way. ADD ONLY: The described necklace around the person\'s neck matching the product description precisely - same color, gemstones, chain length, pendant shape, and design. The face and hair must be 100% identical to the original. Professional fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('set') || nameLower.includes('bridal')) {
        return {
          strength: 0.16,
          guidanceScale: 24,
          imageSize: '864x1152',
          promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, expression, and background. Do NOT alter the face in ANY way. ADD ONLY: The described jewelry set - necklace around the neck and matching earrings on the earlobes, matching the product description precisely. The face and hair must be 100% identical to the original. Professional bridal photography, studio lighting.',
          numAttempts: 3,
        }
      }
      return {
        strength: 0.14,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, and expression. Do NOT alter the face in ANY way. ADD ONLY: The described jewelry worn in its proper place, matching the product description precisely. The face must be 100% identical to the original. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'watches':
      return {
        strength: 0.14,
        guidanceScale: 24,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, body, clothing, and background. Do NOT alter the face in ANY way. ADD ONLY: The described watch on the person\'s left wrist matching the product description precisely. The face must be 100% identical to the original. Professional fashion photography.',
        numAttempts: 3,
      }

    case 'fragrances':
      return {
        strength: 0.12,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, expression, and background. Do NOT alter the face in ANY way. ADD ONLY: The described fragrance bottle held elegantly near the person. The bottle must match the product description precisely. The face must be 100% identical to the original. Professional beauty photography.',
        numAttempts: 2,
      }

    case 'leather-goods':
      return {
        strength: 0.16,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, body, and expression. Do NOT alter the face in ANY way. ADD ONLY: The described leather bag carried by this person, matching the product description precisely. The face must be 100% identical to the original. Professional fashion photography.',
        numAttempts: 2,
      }

    case 'sarees': {
      // Sarees need higher strength for outfit change, but face MUST be preserved
      if (nameLower.includes('bridal') || nameLower.includes('velvet') || nameLower.includes('zardozi')) {
        return {
          strength: 0.30,
          guidanceScale: 28,
          imageSize: '768x1344',
          promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the outfit: Replace the current outfit with the described bridal saree. The saree must be draped elegantly in traditional Indian style with structured pleats at the waist, rich pallu draped over the left shoulder, and matching blouse. The saree must match the product description precisely. Professional bridal fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('chiffon') || nameLower.includes('georgette') || nameLower.includes('organza')) {
        return {
          strength: 0.28,
          guidanceScale: 26,
          imageSize: '768x1344',
          promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the outfit: Replace the current outfit with the described lightweight saree. The saree should be draped gracefully with soft flowing pleats and delicate pallu over the shoulder with matching blouse. The saree must match the product description precisely. Professional fashion photography, soft natural lighting.',
          numAttempts: 3,
        }
      }
      // Silk sarees
      return {
        strength: 0.30,
        guidanceScale: 27,
        imageSize: '768x1344',
        promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the outfit: Replace the current outfit with the described silk saree. The saree should be draped in traditional Indian style with neat pleats and ornate pallu over the shoulder with matching blouse. The saree must match the product description precisely. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'fashion':
      return {
        strength: 0.30,
        guidanceScale: 26,
        imageSize: '768x1344',
        promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the outfit: Replace the current outfit with the described outfit matching the product description precisely - same color, fabric, cut, pattern, and all design details. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }

    case 'mens-shirts': {
      if (nameLower.includes('dress shirt') || nameLower.includes('evening') || nameLower.includes('silk')) {
        return {
          strength: 0.28,
          guidanceScale: 26,
          imageSize: '768x1344',
          promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the shirt: Replace the current top with the described formal dress shirt matching the product description precisely - same color, collar style, cuff style, fabric texture, and fit. Professional fashion photography, studio lighting.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('t-shirt') || nameLower.includes('tee') || nameLower.includes('v-neck') || nameLower.includes('crew')) {
        return {
          strength: 0.25,
          guidanceScale: 24,
          imageSize: '768x1344',
          promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the shirt: Replace the current top with the described t-shirt matching the product description precisely - same color, neckline style, fabric, and fit. Professional fashion photography, natural lighting.',
          numAttempts: 3,
        }
      }
      if (nameLower.includes('polo')) {
        return {
          strength: 0.26,
          guidanceScale: 25,
          imageSize: '768x1344',
          promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the shirt: Replace the current top with the described polo shirt matching the product description precisely. Professional fashion photography, natural lighting.',
          numAttempts: 3,
        }
      }
      return {
        strength: 0.28,
        guidanceScale: 25,
        imageSize: '768x1344',
        promptTemplate: 'ABSOLUTE PRIORITY: Keep the person\'s face, facial features, skin tone, and hair EXACTLY the same as the original photo. The face must be 100% identical - same eyes, nose, mouth, face shape, skin tone, hair color and style. CHANGE ONLY the shirt: Replace the current top with the described shirt matching the product description precisely. Professional fashion photography, studio lighting.',
        numAttempts: 3,
      }
    }

    case 'romantic-gifts':
    case 'couple-gifts':
      return {
        strength: 0.14,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair, and expression. Do NOT alter the face. ADD ONLY: The described gift held in the person\'s hands. The face must be 100% identical to the original. Professional photography, warm romantic lighting.',
        numAttempts: 2,
      }

    case 'toys':
      return {
        strength: 0.14,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the EXACT same face, skin tone, hair. Do NOT alter the face. ADD ONLY: The described product near or held by the person. The face must be 100% identical to the original. Professional lifestyle photography.',
        numAttempts: 2,
      }

    case 'home-living':
      return {
        strength: 0.20,
        guidanceScale: 22,
        imageSize: '1344x768',
        promptTemplate: 'CRITICAL: Keep the EXACT same person. Do NOT alter the face. ADD: The described home product displayed near the person. The face must be 100% identical to the original. Professional interior photography.',
        numAttempts: 2,
      }

    default:
      return {
        strength: 0.18,
        guidanceScale: 22,
        imageSize: '864x1152',
        promptTemplate: 'CRITICAL: Keep the person\'s face, skin tone, and hair EXACTLY the same. Do NOT alter the face. ADD: The described product. The face must be 100% identical to the original. Professional photography.',
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
      originalSelfie: selfieData,
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
    faceScore: job.faceScore,
  })
}

// ── Helper: VLM call with timeout ─────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
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

// ── Helper: VLM face comparison between selfie and result ──────────

async function verifyFaceMatch(
  zai: any,
  selfieData: string,
  resultImageUrl: string,
): Promise<{ score: number; reason: string }> {
  try {
    const prompt = VLM_FACE_CHECK_PROMPT
    const response = await zai.chat.completions.createVision({
      model: 'glm-4v-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: selfieData } },
          { type: 'image_url', image_url: { url: resultImageUrl } },
        ],
      }],
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content || ''
    console.log(`[try-on] Face check response: ${content}`)

    // Parse score from response like "8|Face is very close match" or "8 - Face is close"
    const scoreMatch = content.match(/(\d+)/)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5
    const reason = content.replace(/^\d+[\|.\-\s]*/, '').trim()

    return { score: Math.min(10, Math.max(1, score)), reason }
  } catch (err) {
    console.error('[try-on] Face verification failed:', err)
    return { score: 7, reason: 'Verification unavailable' }
  }
}

// ── Background processing with face-priority quality loop ──────────

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  try {
    const zai = await ZAI.create()
    console.log('[try-on] ZAI SDK initialized successfully')
    return zai
  } catch (err) {
    console.error('[try-on] ZAI SDK initialization failed:', err)
    throw new Error('AI service initialization failed.')
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
  const MIN_FACE_SCORE = 7 // Accept results with face score >= 7

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const currentJob = jobs.get(jobId)
      if (currentJob) currentJob.attempt = attempt

      const zai = await createZAI()

      // Step 1: Run VLM analyses in PARALLEL
      console.log(`[try-on] Starting VLM analysis for job ${jobId}, attempt ${attempt}`)
      const [personDescription, productDescription] = await Promise.all([
        vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
        vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
      ])

      console.log(`[try-on] Person: ${personDescription.substring(0, 120)}...`)
      console.log(`[try-on] Product: ${productDescription.substring(0, 120)}...`)

      // Step 2: Build the prompt with face-priority instructions
      const productTypeContext = getProductTypeContext(categorySlug, productName)
      let editPrompt = settings.promptTemplate

      // Prepend rich context from VLM
      if (personDescription && productDescription) {
        editPrompt = `${productTypeContext}PERSON DETAILS: ${personDescription}. PRODUCT TO APPLY: ${productDescription}. INSTRUCTION: ${editPrompt}`
      } else if (personDescription) {
        editPrompt = `${productTypeContext}PERSON DETAILS: ${personDescription}. INSTRUCTION: ${editPrompt}`
      } else if (productDescription) {
        editPrompt = `${productTypeContext}PRODUCT TO APPLY: ${productDescription}. INSTRUCTION: ${editPrompt}`
      }

      // Step 3: Progressive parameter adjustment per attempt
      // Each subsequent attempt uses MORE conservative settings for better face preservation
      let adjustedStrength = settings.strength
      let adjustedGuidance = settings.guidanceScale

      if (attempt === 2) {
        adjustedStrength = Math.max(0.08, settings.strength - 0.04)
        adjustedGuidance = settings.guidanceScale + 3
      } else if (attempt >= 3) {
        adjustedStrength = Math.max(0.06, settings.strength - 0.06)
        adjustedGuidance = settings.guidanceScale + 6
      }

      console.log(`[try-on] Generating attempt ${attempt}/${maxAttempts} for ${jobId}, cat: ${categorySlug}, str: ${adjustedStrength.toFixed(2)}, gs: ${adjustedGuidance}`)

      // Step 4: Image EDIT API
      // KEY CHANGE: Use `image` parameter with selfie as the BASE image to edit
      // This makes the API start FROM the selfie, preserving it much better
      // Also include product image in `images` array as a reference
      const editBody: Record<string, any> = {
        prompt: editPrompt,
        size: settings.imageSize,
        image: selfieData, // PRIMARY: Selfie is the base image being edited (STRONG face preservation)
        images: [
          { url: productImageBase64 }, // REFERENCE: Product image for visual reference
        ],
        strength: adjustedStrength,
        guidance_scale: adjustedGuidance,
      }

      const editResponse = await zai.images.generations.edit(editBody as any)

      const imageBase64 = editResponse.data[0]?.base64
      if (!imageBase64) throw new Error('No image generated')

      const imageUrl = `data:image/png;base64,${imageBase64}`
      console.log(`[try-on] Job ${jobId} attempt ${attempt} completed, size: ${imageBase64.length}`)

      // Step 5: Quality check - reject very small images (likely poor quality)
      if (imageBase64.length < 15000) {
        console.log(`[try-on] Image too small (${imageBase64.length}), likely poor quality - retrying`)
        continue
      }

      // Step 6: VLM Face Verification (on all attempts for quality assurance)
      console.log(`[try-on] Running face verification for job ${jobId}, attempt ${attempt}`)
      const faceResult = await verifyFaceMatch(zai, selfieData, imageUrl)
      const faceScore = faceResult.score

      console.log(`[try-on] Face verification score: ${faceScore}/10 - ${faceResult.reason}`)

      if (currentJob) {
        currentJob.faceScore = faceScore
      }

      // If face score is good enough, accept the result
      if (faceScore >= MIN_FACE_SCORE) {
        console.log(`[try-on] Face score ${faceScore} >= ${MIN_FACE_SCORE}, accepting result`)
        if (currentJob) {
          currentJob.status = 'completed'
          currentJob.imageUrl = imageUrl
          currentJob.productName = productName
          currentJob.attempt = attempt
        }
        return // Success with good face match!
      }

      // Face score too low - retry with more conservative settings
      console.log(`[try-on] Face score ${faceScore} < ${MIN_FACE_SCORE}, will retry with more conservative settings`)

      // If this was the last attempt, accept anyway (best we could do)
      if (attempt === maxAttempts) {
        console.log(`[try-on] Last attempt, accepting result despite face score ${faceScore}`)
        if (currentJob) {
          currentJob.status = 'completed'
          currentJob.imageUrl = imageUrl
          currentJob.productName = productName
          currentJob.attempt = attempt
        }
        return
      }

      // Otherwise continue to next attempt with automatically adjusted params

    } catch (error) {
      console.error(`[try-on] Attempt ${attempt} failed for job ${jobId}:`, error)

      if (attempt < maxAttempts) {
        const waitTime = 1500 * attempt
        await new Promise(resolve => setTimeout(resolve, waitTime))
        console.log(`[try-on] Retrying job ${jobId}, attempt ${attempt + 1}...`)
      } else {
        // All attempts failed, try simple fallback
        console.log(`[try-on] All ${maxAttempts} attempts failed for ${jobId}, trying fallback`)

        try {
          const zai = await createZAI()
          const fallbackSettings = getEditSettings(categorySlug, productName)
          const productTypeContext = getProductTypeContext(categorySlug, productName)

          // Fallback: Use edit with selfie as base (simpler prompt)
          const fallbackResponse = await zai.images.generations.edit({
            prompt: `${productTypeContext}Edit this photo: Add ${productName} on this person. Keep their face exactly the same. Professional photography.`,
            size: fallbackSettings.imageSize,
            image: selfieData,
            strength: 0.15,
          } as any)

          const fbImageBase64 = fallbackResponse.data[0]?.base64
          if (!fbImageBase64) throw new Error('No fallback image')

          const fallbackJob = jobs.get(jobId)
          if (fallbackJob) {
            fallbackJob.status = 'completed'
            fallbackJob.imageUrl = `data:image/png;base64,${fbImageBase64}`
            fallbackJob.productName = productName
          }
        } catch (fallbackError) {
          console.error('[try-on] Fallback also failed:', fallbackError)
          
          // Last resort: use create() with description
          try {
            const zai = await createZAI()
            const imageResponse = await zai.images.generations.create({
              prompt: `Professional fashion photography of a person wearing ${productName}. Studio lighting, 8k quality, photorealistic.`,
              size: settings.imageSize,
            })
            const imageBase64 = imageResponse.data[0]?.base64
            if (!imageBase64) throw new Error('No last-resort image')

            const lastJob = jobs.get(jobId)
            if (lastJob) {
              lastJob.status = 'completed'
              lastJob.imageUrl = `data:image/png;base64,${imageBase64}`
              lastJob.productName = productName
            }
          } catch (lastError) {
            console.error('[try-on] Last resort also failed:', lastError)
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
}
