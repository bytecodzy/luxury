import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Verify SDK config at startup
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
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  attempt?: number
  strategy?: string
  faceScore?: number
  productScore?: number
  suggestions?: any[]
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

// ── VLM Prompts ────────────────────────────────────────────────────

const VLM_PERSON_PROMPT = `Describe this person's appearance in precise detail for an AI virtual try-on:
1. Face shape, skin tone (exact shade), and distinctive features
2. Eye shape and color, eyebrow shape
3. Hair color, texture, length, and style
4. Body type and build
5. Current outfit (color, type, neckline)
6. Expression and pose (front-facing? smiling?)
Be very specific about skin tone, hair, and face. 3 sentences max.`

const VLM_PRODUCT_PROMPT = `Describe this product precisely for an AI virtual try-on:
1. Exact type and name (saree, necklace, shirt, etc.)
2. Primary color (exact shade like "deep maroon", "rose gold")
3. Pattern and design (floral, geometric, solid, etc.)
4. Material and texture (silk sheen, matte cotton, shiny gold)
5. Key details (embroidery, gemstones, collar style, border design)
6. Size relative to body (how much does it cover?)
Be very specific about color and pattern. 3 sentences max.`

// ── Product placement helpers ──────────────────────────────────────

function getProductPlacement(categorySlug: string, productName: string): string {
  const n = productName.toLowerCase()
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) return 'earrings on both earlobes'
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple')) return 'necklace around the neck'
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle')) return 'bracelet on the wrist'
    if (n.includes('ring')) return 'ring on the finger'
    if (n.includes('set') || n.includes('bridal')) return 'jewelry set - necklace and earrings'
    return 'jewelry on the body'
  }
  if (categorySlug === 'sarees') return 'saree draped in Indian style with pallu over shoulder'
  if (categorySlug === 'mens-shirts') return 'shirt on the torso'
  if (categorySlug === 'watches') return 'watch on the wrist'
  if (categorySlug === 'fashion') return 'outfit worn on the body'
  return 'product on the person'
}

function getImageSize(categorySlug: string): ImageSize {
  if (['sarees', 'fashion', 'mens-shirts'].includes(categorySlug)) return '768x1344'
  if (categorySlug === 'home-living') return '1344x768'
  return '864x1152'
}

// ── Category pairing for suggestions ───────────────────────────────

function getPairingCategory(categorySlug: string): string[] {
  const pairs: Record<string, string[]> = {
    'sarees': ['jewelry'],
    'jewelry': ['sarees', 'fashion'],
    'watches': ['mens-shirts', 'leather-goods'],
    'mens-shirts': ['watches', 'leather-goods'],
    'fashion': ['jewelry', 'watches'],
    'fragrances': ['jewelry', 'fashion'],
    'leather-goods': ['watches', 'fashion'],
  }
  return pairs[categorySlug] || ['jewelry']
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, selfieData, productImageUrl } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
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
    const productImageBase64 = productImageToUse ? getProductImageBase64(productImageToUse) : null

    if (!productImageBase64) {
      return NextResponse.json({ error: 'Product image not available' }, { status: 400 })
    }

    // Fetch AI suggestions in parallel with job creation
    const pairingCategories = getPairingCategory(product.category.slug)
    const suggestionsPromise = db.product.findMany({
      where: {
        category: { slug: { in: pairingCategories } },
        id: { not: productId },
        stock: { gt: 0 },
      },
      include: { category: true },
      take: 4,
      orderBy: { rating: 'desc' },
    })

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    jobs.set(jobId, {
      status: 'processing',
      createdAt: Date.now(),
      categorySlug: product.category.slug,
      attempt: 1,
    })

    // Start suggestions fetch and background processing in parallel
    suggestionAndProcess(jobId, product.name, product.category.slug, selfieData, productImageBase64, suggestionsPromise)
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
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 })
  }
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const job = jobs.get(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

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
    suggestions: job.suggestions,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  return await ZAI.create()
}

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch { return '' }
}

async function vlmVerify(
  zai: any, selfieData: string, productImageBase64: string, resultImageUrl: string, productName: string,
): Promise<{ faceScore: number; productScore: number }> {
  try {
    const [faceRes, prodRes] = await Promise.all([
      zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Rate how well the FACE in the SECOND image matches the FIRST image (original selfie). 1=different person, 5=similar, 7=same person minor diff, 9-10=near perfect. Reply: SCORE|REASON` },
          { type: 'image_url', image_url: { url: selfieData } },
          { type: 'image_url', image_url: { url: resultImageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Rate how well the PRODUCT in the SECOND image matches the FIRST image (original "${productName}" photo). 1=different product, 5=similar type, 7=same product minor diff, 9-10=near perfect. Reply: SCORE|REASON` },
          { type: 'image_url', image_url: { url: productImageBase64 } },
          { type: 'image_url', image_url: { url: resultImageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
    ])

    const parseScore = (res: any) => {
      const content = res?.choices?.[0]?.message?.content || ''
      const m = content.match(/(\d+)/)
      return m ? Math.min(10, Math.max(1, parseInt(m[1]))) : 5
    }

    return { faceScore: parseScore(faceRes), productScore: parseScore(prodRes) }
  } catch {
    return { faceScore: 5, productScore: 5 }
  }
}

// ── Generation with correct `images` array ─────────────────────────

async function generateWithBothImages(
  zai: any, selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // KEY FIX: API requires `images` array, not `image` string
    // Selfie first = primary reference for person, Product second = reference for product
    const prompt = `Photo of this person wearing ${productName} (${placement}). ${productDesc ? `The product is: ${productDesc}.` : ''} Keep the person's face, hair, skin tone exactly the same. Professional fashion photography, studio lighting.`

    console.log(`[try-on] Strategy: edit-both-images, prompt: ${prompt.substring(0, 120)}...`)

    const response = await zai.images.generations.edit({
      prompt,
      size,
      images: [
        { url: selfieData },
        { url: productImageBase64 },
      ],
    } as any)

    const b64 = response.data[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-both-images failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function generateWithSelfieOnly(
  zai: any, selfieData: string,
  productName: string, categorySlug: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // Simple prompt: just tell it what to add, don't describe the face
    const prompt = `This person is now wearing ${productName} (${placement}). ${productDesc ? `Product details: ${productDesc}.` : ''} Keep the exact same face, hair, skin, and expression. Professional fashion photography.`

    console.log(`[try-on] Strategy: edit-selfie-only, prompt: ${prompt.substring(0, 120)}...`)

    const response = await zai.images.generations.edit({
      prompt,
      size,
      images: [{ url: selfieData }],
    } as any)

    const b64 = response.data[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-selfie-only failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function generateWithCreate(
  zai: any, productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion'
      ? 'Full-body professional fashion photograph'
      : categorySlug === 'jewelry' || categorySlug === 'watches'
      ? 'Close-up professional beauty photograph'
      : 'Professional fashion photograph'

    const prompt = `${bodyType} of a person ${personDesc ? `with: ${personDesc}. ` : ''}They are wearing ${productName} (${placement}). ${productDesc ? `Product: ${productDesc}.` : ''} Photorealistic, studio lighting, 8K, high detail.`

    console.log(`[try-on] Strategy: create-detailed, prompt: ${prompt.substring(0, 120)}...`)

    const response = await zai.images.generations.create({ prompt, size })
    const b64 = response.data[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy create-detailed failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

// ── Main pipeline with suggestions ─────────────────────────────────

interface GenResult {
  imageUrl: string
  strategy: string
  faceScore: number
  productScore: number
}

async function suggestionAndProcess(
  jobId: string, productName: string, categorySlug: string,
  selfieData: string, productImageBase64: string,
  suggestionsPromise: Promise<any>,
) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    // Fetch suggestions early and store them
    const suggestions = await suggestionsPromise
    const formattedSuggestions = suggestions.map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      image: JSON.parse(s.images || '[]')[0] || '/images/placeholder.jpg',
      category: s.category?.name || '',
      categorySlug: s.category?.slug || '',
    }))
    if (job) job.suggestions = formattedSuggestions

    // Now start the generation pipeline
    const zai = await createZAI()

    // Step 1: VLM analysis (parallel)
    console.log(`[try-on] Starting VLM analysis for job ${jobId}`)
    const [personDesc, productDesc] = await Promise.all([
      vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
      vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
    ])
    console.log(`[try-on] Person: ${personDesc.substring(0, 120)}...`)
    console.log(`[try-on] Product: ${productDesc.substring(0, 120)}...`)

    // Step 2: Try multiple strategies
    const results: GenResult[] = []

    // Strategy A: Edit with BOTH images (selfie + product) — best chance for both face+product match
    if (job) job.attempt = 1
    const aResult = await generateWithBothImages(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (aResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, aResult, productName)
      console.log(`[try-on] Strategy A (both-images): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: aResult, strategy: 'edit-both-images', faceScore: v.faceScore, productScore: v.productScore })
      // Early exit if excellent
      if (v.faceScore >= 8 && v.productScore >= 7) {
        console.log(`[try-on] Excellent result from Strategy A, skipping others`)
      }
    }

    // Strategy B: Edit with selfie only + product description — best for face preservation
    if (job) job.attempt = 2
    const bResult = await generateWithSelfieOnly(zai, selfieData, productName, categorySlug, productDesc)
    if (bResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, bResult, productName)
      console.log(`[try-on] Strategy B (selfie-only): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: bResult, strategy: 'edit-selfie-only', faceScore: v.faceScore, productScore: v.productScore })
    }

    // Strategy C: Create from detailed description — fallback
    if (job) job.attempt = 3
    const cResult = await generateWithCreate(zai, productName, categorySlug, personDesc, productDesc)
    if (cResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, cResult, productName)
      console.log(`[try-on] Strategy C (create): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: cResult, strategy: 'create-detailed', faceScore: v.faceScore, productScore: v.productScore })
    }

    if (results.length === 0) throw new Error('All strategies failed')

    // Step 3: Pick best result (60% face weight, 40% product weight)
    const best = results.reduce((a, b) => {
      const sa = a.faceScore * 0.6 + a.productScore * 0.4
      const sb = b.faceScore * 0.6 + b.productScore * 0.4
      return sb > sa ? b : a
    })

    console.log(`[try-on] Best: ${best.strategy}, Face=${best.faceScore}/10, Product=${best.productScore}/10`)

    if (job) {
      job.status = 'completed'
      job.imageUrl = best.imageUrl
      job.productName = productName
      job.strategy = best.strategy
      job.faceScore = best.faceScore
      job.productScore = best.productScore
    }
  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Generation failed'
    }
  }
}
