import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Verify SDK config is accessible at startup
try {
  const configPaths = [
    join(process.cwd(), '.z-ai-config'),
    join('/etc', '.z-ai-config'),
  ]
  for (const p of configPaths) {
    if (existsSync(p)) {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      if (cfg.baseUrl && cfg.apiKey) {
        console.log(`[try-on] SDK config loaded from ${p}, hasToken: ${!!cfg.token}`)
        break
      }
    }
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
  strategy?: string
  faceScore?: number
  productScore?: number
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

// ── VLM Prompts (EXTREMELY DETAILED for text-to-image accuracy) ───

const VLM_FACE_PROMPT = `Describe this person's face and appearance in EXCRUCIATING detail for an AI image generator that must recreate this exact person:

1. FACE SHAPE: Exactly (round, oval, oblong, square, heart, diamond)
2. SKIN: Exact tone (fair porcelain, light beige, medium warm, olive, tan, deep brown, dark ebony) and undertone (cool pink, warm yellow, neutral)
3. EYES: Shape (almond, round, hooded, monolid), color (dark brown, light brown, hazel, green, blue), size, eyelid type
4. EYEBROWS: Thickness (thin, medium, thick), shape (arched, straight, curved), color
5. NOSE: Shape (button, pointed, wide, narrow, roman), size relative to face
6. LIPS: Shape (full, thin, wide, heart-shaped), color (pink, rosy, brown, red-tinted)
7. HAIR: Color (black, dark brown, brown, auburn, etc.), texture (straight, wavy, curly, coily), length (short/medium/long), style (down, up, ponytail, braids)
8. DISTINCTIVE FEATURES: Any visible marks, dimples, freckles, beauty marks
9. BODY: Frame (petite, slim, average, athletic, curvy), visible proportions, skin tone on body
10. EXPRESSION: Smiling, neutral, serious? Teeth visible?

Be EXTREMELY specific - every detail matters for recreating this person accurately. 4 sentences max.`

const VLM_PRODUCT_PROMPT = `Describe this product in EXCRUCIATING detail for an AI that must recreate this EXACT product on a person:

1. EXACT TYPE: What is it? (e.g., "Banarasi silk saree", "diamond choker necklace", "Oxford button-down shirt")
2. PRIMARY COLOR: Exact shade (e.g., "deep maroon", "rose gold", "navy blue", "ivory white")
3. SECONDARY COLORS/ACCENTS: All other visible colors
4. PATTERN: Solid, floral, geometric, striped, checkered? Describe the exact pattern
5. MATERIAL TEXTURE: Silk sheen, matte cotton, shiny gold, velvet? How does light interact with it?
6. SHAPE & CUT: For clothing - neckline, sleeves, length, drape style. For jewelry - shape, size, setting type
7. ORNAMENTATION: Embroidery, zari work, gemstones, sequins, beads, buttons? Describe exactly
8. BORDER/EDGE DETAIL: For sarees - border width, color, pattern. For jewelry - chain type, clasp style
9. SIZE RELATIVE TO BODY: How much of the body does it cover? How large is it on the person?
10. MOST DISTINCTIVE FEATURE: What makes this product unique and recognizable?

Be EXTREMELY specific about colors and patterns - the AI must recreate this EXACT product. 4 sentences max.`

const VLM_OUTFIT_PROMPT = `Describe the full outfit this person is currently wearing:
1. Top: Color, type, neckline, sleeve length
2. Bottom: Color, type, length  
3. Any visible accessories
4. Overall color scheme and style
Be brief, 2 sentences max.`

// ── Product type specific details ──────────────────────────────

function getProductPlacementDescription(categorySlug: string, productName: string): string {
  const nameLower = productName.toLowerCase()

  if (categorySlug === 'jewelry') {
    if (nameLower.includes('earring') || nameLower.includes('jhumka') || nameLower.includes('stud')) {
      return 'worn on both earlobes, framing the face'
    }
    if (nameLower.includes('necklace') || nameLower.includes('choker') || nameLower.includes('pendant') || nameLower.includes('temple')) {
      return 'draped around the neck at collarbone level'
    }
    if (nameLower.includes('bracelet') || nameLower.includes('cuff') || nameLower.includes('bangle')) {
      return 'worn on the wrist'
    }
    if (nameLower.includes('ring')) {
      return 'worn on the finger'
    }
    if (nameLower.includes('set') || nameLower.includes('bridal')) {
      return 'necklace around the neck and matching earrings on earlobes'
    }
    return 'worn in its proper place on the body'
  }

  if (categorySlug === 'sarees') {
    return 'draped in traditional Indian style with pleats at the waist and pallu over the left shoulder, with a matching blouse'
  }

  if (categorySlug === 'mens-shirts') {
    return 'worn on the torso, fitting properly'
  }

  if (categorySlug === 'watches') {
    return 'worn on the left wrist'
  }

  if (categorySlug === 'fashion') {
    return 'worn on the body as intended'
  }

  return 'positioned appropriately on or near the person'
}

function getImageSizeForCategory(categorySlug: string): ImageSize {
  switch (categorySlug) {
    case 'sarees':
    case 'fashion':
    case 'mens-shirts':
      return '768x1344' // Full body portrait
    case 'home-living':
      return '1344x768' // Landscape
    default:
      return '864x1152' // Half body portrait
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
    strategy: job.strategy,
    faceScore: job.faceScore,
    productScore: job.productScore,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  try {
    const zai = await ZAI.create()
    return zai
  } catch (err) {
    console.error('[try-on] ZAI SDK init failed:', err)
    throw new Error('AI service initialization failed.')
  }
}

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 35000): Promise<string> {
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

// VLM verification: check both face match AND product match
async function verifyResult(
  zai: any,
  selfieData: string,
  productImageBase64: string,
  resultImageUrl: string,
  productName: string,
): Promise<{ faceScore: number; productScore: number; faceReason: string; productReason: string }> {
  try {
    // Run face and product checks in parallel
    const [faceResult, productResult] = await Promise.all([
      // Face check: compare selfie vs result
      (async () => {
        try {
          const response = await zai.chat.completions.createVision({
            model: 'glm-4v-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: `Compare these two images. The FIRST is the original selfie, the SECOND is the AI-generated try-on result. Rate how well the FACE in the second image matches the FACE in the first image. Consider: face shape, skin tone, eye shape/color, nose, lips, hair color/style, and overall facial identity. Rate 1-10: 1=completely different person, 5=somewhat similar, 7=clearly same person with minor differences, 9-10=near perfect match. Answer format: SCORE|REASON` },
                { type: 'image_url', image_url: { url: selfieData } },
                { type: 'image_url', image_url: { url: resultImageUrl } },
              ],
            }],
            thinking: { type: 'disabled' },
          })
          const content = response.choices[0]?.message?.content || ''
          const scoreMatch = content.match(/(\d+)/)
          const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5
          const reason = content.replace(/^\d+[\|.\-\s]*/, '').trim()
          return { score, reason }
        } catch {
          return { score: 5, reason: 'Check unavailable' }
        }
      })(),
      // Product check: compare product image vs product in result
      (async () => {
        try {
          const response = await zai.chat.completions.createVision({
            model: 'glm-4v-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: `Compare these two images. The FIRST is the original product photo for "${productName}". The SECOND is an AI-generated image showing someone wearing a product. Rate how well the product shown in the second image matches the original product in the first image. Consider: color, pattern, material, shape, design details, and overall visual identity. Rate 1-10: 1=completely different product, 5=somewhat similar product type, 7=clearly the same product with minor differences, 9-10=near perfect match. Answer format: SCORE|REASON` },
                { type: 'image_url', image_url: { url: productImageBase64 } },
                { type: 'image_url', image_url: { url: resultImageUrl } },
              ],
            }],
            thinking: { type: 'disabled' },
          })
          const content = response.choices[0]?.message?.content || ''
          const scoreMatch = content.match(/(\d+)/)
          const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5
          const reason = content.replace(/^\d+[\|.\-\s]*/, '').trim()
          return { score, reason }
        } catch {
          return { score: 5, reason: 'Check unavailable' }
        }
      })(),
    ])

    return {
      faceScore: faceResult.score,
      productScore: productResult.score,
      faceReason: faceResult.reason,
      productReason: productResult.reason,
    }
  } catch (err) {
    console.error('[try-on] Verification failed:', err)
    return { faceScore: 5, productScore: 5, faceReason: 'Unavailable', productReason: 'Unavailable' }
  }
}

// ── Generation Strategies ──────────────────────────────────────────

// Strategy 1: Edit API with selfie as base image + product description in prompt
async function strategyEditSelfieBase(
  zai: any,
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  personDesc: string,
  productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacementDescription(categorySlug, productName)
    const imageSize = getImageSizeForCategory(categorySlug)

    // Build a prompt that heavily emphasizes face preservation
    let prompt = ''
    
    if (personDesc) {
      prompt += `This person has: ${personDesc}. `
    }
    
    prompt += `They are now wearing ${productName} ${placement}. `
    
    if (productDesc) {
      prompt += `The product looks like: ${productDesc}. `
    }
    
    prompt += `IMPORTANT: Keep the exact same face, hair, skin tone, and expression as the original photo. The person must be clearly recognizable as the same person. Professional fashion photography, studio lighting, 8K quality.`

    console.log(`[try-on] Strategy: edit-selfie-base, prompt length: ${prompt.length}`)

    const response = await zai.images.generations.edit({
      prompt,
      image: selfieData,
      size: imageSize,
    })

    const imageBase64 = response.data[0]?.base64
    if (!imageBase64) return null
    return `data:image/png;base64,${imageBase64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-selfie-base failed:', err)
    return null
  }
}

// Strategy 2: Create API with ultra-detailed text description (no image input)
async function strategyCreateDetailed(
  zai: any,
  productName: string,
  categorySlug: string,
  personDesc: string,
  productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacementDescription(categorySlug, productName)
    const imageSize = getImageSizeForCategory(categorySlug)

    // Build an extremely detailed prompt for text-to-image
    let prompt = ''

    if (categorySlug === 'sarees' || categorySlug === 'fashion') {
      prompt += `Full-body professional fashion photograph of a person `
    } else if (categorySlug === 'jewelry' || categorySlug === 'watches') {
      prompt += `Close-up professional beauty photograph of a person `
    } else {
      prompt += `Professional fashion photograph of a person `
    }

    if (personDesc) {
      prompt += `with these exact features: ${personDesc}. `
    }

    prompt += `They are wearing ${productName} ${placement}. `

    if (productDesc) {
      prompt += `The product is: ${productDesc}. `
    }

    prompt += `Photorealistic, studio lighting, 8K quality, high detail, professional fashion editorial.`

    console.log(`[try-on] Strategy: create-detailed, prompt length: ${prompt.length}`)

    const response = await zai.images.generations.create({
      prompt,
      size: imageSize,
    })

    const imageBase64 = response.data[0]?.base64
    if (!imageBase64) return null
    return `data:image/png;base64,${imageBase64}`
  } catch (err) {
    console.error('[try-on] Strategy create-detailed failed:', err)
    return null
  }
}

// Strategy 3: Edit API with product image as base + person description
async function strategyEditProductBase(
  zai: any,
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  personDesc: string,
  productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacementDescription(categorySlug, productName)
    const imageSize = getImageSizeForCategory(categorySlug)

    let prompt = `Show this ${productName} being worn by a person ${placement}. `

    if (personDesc) {
      prompt += `The person wearing it has these features: ${personDesc}. `
    }

    prompt += `Professional fashion photography, studio lighting, 8K quality, photorealistic.`

    console.log(`[try-on] Strategy: edit-product-base, prompt length: ${prompt.length}`)

    const response = await zai.images.generations.edit({
      prompt,
      image: productImageBase64,
      size: imageSize,
    })

    const imageBase64 = response.data[0]?.base64
    if (!imageBase64) return null
    return `data:image/png;base64,${imageBase64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-product-base failed:', err)
    return null
  }
}

// ── Main Processing Pipeline ───────────────────────────────────────

interface GenerationResult {
  imageUrl: string
  strategy: string
  faceScore: number
  productScore: number
}

async function processTryOnJob(
  jobId: string,
  productName: string,
  categorySlug: string,
  selfieData: string,
  productImageBase64: string
) {
  const currentJob = jobs.get(jobId)
  if (!currentJob) return

  try {
    const zai = await createZAI()

    // Step 1: Deep VLM analysis of person, product, and current outfit (all in parallel)
    console.log(`[try-on] Starting deep VLM analysis for job ${jobId}`)
    const [personDescription, productDescription, outfitDescription] = await Promise.all([
      vlmAnalyze(zai, VLM_FACE_PROMPT, selfieData),
      vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
      vlmAnalyze(zai, VLM_OUTFIT_PROMPT, selfieData),
    ])

    console.log(`[try-on] Person: ${personDescription.substring(0, 150)}...`)
    console.log(`[try-on] Product: ${productDescription.substring(0, 150)}...`)
    console.log(`[try-on] Outfit: ${outfitDescription.substring(0, 100)}...`)

    // Step 2: Try multiple strategies and keep the best result
    const results: GenerationResult[] = []

    // Strategy A: Edit with selfie as base (best for face preservation)
    if (currentJob) currentJob.attempt = 1
    console.log(`[try-on] Trying Strategy A: edit-selfie-base`)
    const stratAResult = await strategyEditSelfieBase(
      zai, selfieData, productImageBase64, productName, categorySlug,
      personDescription, productDescription,
    )
    if (stratAResult) {
      const verification = await verifyResult(zai, selfieData, productImageBase64, stratAResult, productName)
      console.log(`[try-on] Strategy A scores - Face: ${verification.faceScore}/10, Product: ${verification.productScore}/10`)
      results.push({
        imageUrl: stratAResult,
        strategy: 'edit-selfie-base',
        faceScore: verification.faceScore,
        productScore: verification.productScore,
      })
      // If we got great scores, no need to try more
      if (verification.faceScore >= 8 && verification.productScore >= 7) {
        console.log(`[try-on] Strategy A excellent - Face: ${verification.faceScore}, Product: ${verification.productScore}`)
      }
    }

    // Strategy B: Create with ultra-detailed description (best for product matching, face from description)
    if (currentJob) currentJob.attempt = 2
    console.log(`[try-on] Trying Strategy B: create-detailed`)
    const stratBResult = await strategyCreateDetailed(
      zai, productName, categorySlug,
      personDescription, productDescription,
    )
    if (stratBResult) {
      const verification = await verifyResult(zai, selfieData, productImageBase64, stratBResult, productName)
      console.log(`[try-on] Strategy B scores - Face: ${verification.faceScore}/10, Product: ${verification.productScore}/10`)
      results.push({
        imageUrl: stratBResult,
        strategy: 'create-detailed',
        faceScore: verification.faceScore,
        productScore: verification.productScore,
      })
    }

    // Strategy C: Edit with product as base (best for product accuracy, face from description)
    if (currentJob) currentJob.attempt = 3
    console.log(`[try-on] Trying Strategy C: edit-product-base`)
    const stratCResult = await strategyEditProductBase(
      zai, selfieData, productImageBase64, productName, categorySlug,
      personDescription, productDescription,
    )
    if (stratCResult) {
      const verification = await verifyResult(zai, selfieData, productImageBase64, stratCResult, productName)
      console.log(`[try-on] Strategy C scores - Face: ${verification.faceScore}/10, Product: ${verification.productScore}/10`)
      results.push({
        imageUrl: stratCResult,
        strategy: 'edit-product-base',
        faceScore: verification.faceScore,
        productScore: verification.productScore,
      })
    }

    // Step 3: Select the BEST result using a composite score
    // Weight face score higher (60%) since user specifically wants face preservation
    // But also weight product score (40%) since product must match
    if (results.length === 0) {
      throw new Error('All generation strategies failed')
    }

    const bestResult = results.reduce((best, current) => {
      const bestComposite = best.faceScore * 0.6 + best.productScore * 0.4
      const currentComposite = current.faceScore * 0.6 + current.productScore * 0.4
      return currentComposite > bestComposite ? current : best
    })

    console.log(`[try-on] Best result: Strategy ${bestResult.strategy}, Face: ${bestResult.faceScore}/10, Product: ${bestResult.productScore}/10`)

    // Step 4: If the best result has poor face score but there's a result with better face, 
    // try one more generation with adjusted approach
    let finalResult = bestResult

    // If best face score is still low (< 5), try one more with even simpler prompt
    if (bestResult.faceScore < 5 && results.length > 0) {
      console.log(`[try-on] Face score still low, trying simplified generation...`)
      const simpleResult = await strategyEditSelfieBase(
        zai, selfieData, productImageBase64, productName, categorySlug,
        '', // No person description - let the image speak for itself
        productDescription,
      )
      if (simpleResult) {
        const verification = await verifyResult(zai, selfieData, productImageBase64, simpleResult, productName)
        console.log(`[try-on] Simplified generation scores - Face: ${verification.faceScore}/10, Product: ${verification.productScore}/10`)
        const simpleComposite = verification.faceScore * 0.6 + verification.productScore * 0.4
        const bestComposite = finalResult.faceScore * 0.6 + finalResult.productScore * 0.4
        if (simpleComposite > bestComposite) {
          finalResult = {
            imageUrl: simpleResult,
            strategy: 'edit-selfie-simple',
            faceScore: verification.faceScore,
            productScore: verification.productScore,
          }
        }
      }
    }

    // Update job with best result
    if (currentJob) {
      currentJob.status = 'completed'
      currentJob.imageUrl = finalResult.imageUrl
      currentJob.productName = productName
      currentJob.strategy = finalResult.strategy
      currentJob.faceScore = finalResult.faceScore
      currentJob.productScore = finalResult.productScore
    }

  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed completely:`, error)
    const failedJob = jobs.get(jobId)
    if (failedJob) {
      failedJob.status = 'failed'
      failedJob.error = error instanceof Error ? error.message : 'Failed to generate try-on image'
    }
  }
}
