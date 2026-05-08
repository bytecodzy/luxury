import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

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
  suggestions?: any[]
  progress?: string
}

const jobs = new Map<string, TryOnJob>()

// ── Rate limit tracker ──────────────────────────────────────────────
// Tracks when the API was last rate-limited to provide fast feedback
let lastRateLimitAt = 0
let rateLimitCooldownMs = 180_000 // Start with 3-minute cooldown
let consecutiveRateLimits = 0
let lastApiCheckAt = 0
let lastApiCheckResult: 'ok' | 'rate-limited' = 'ok'

function isRateLimitCoolingDown(): { cooling: boolean; waitSeconds: number } {
  if (lastRateLimitAt === 0) return { cooling: false, waitSeconds: 0 }
  const elapsed = Date.now() - lastRateLimitAt
  if (elapsed >= rateLimitCooldownMs) {
    // Cooldown has passed, but we don't reset until we confirm the API works
    return { cooling: false, waitSeconds: 0 }
  }
  return { cooling: true, waitSeconds: Math.ceil((rateLimitCooldownMs - elapsed) / 1000) }
}

function recordRateLimit() {
  lastRateLimitAt = Date.now()
  lastApiCheckResult = 'rate-limited'
  consecutiveRateLimits++
  // Increase cooldown aggressively: 3min, 5min, 7min, max 10min
  rateLimitCooldownMs = Math.min(600_000, 180_000 + (consecutiveRateLimits - 1) * 120_000)
}

function recordSuccess() {
  consecutiveRateLimits = 0
  rateLimitCooldownMs = 180_000
  lastRateLimitAt = 0
  lastApiCheckResult = 'ok'
  lastApiCheckAt = Date.now()
}

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 15 * 60 * 1000) {
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

// ── Product placement helpers ──────────────────────────────────────

function getProductPlacement(categorySlug: string, productName: string): string {
  const n = productName.toLowerCase()
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) return 'wearing earrings on both earlobes'
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple')) return 'wearing a necklace around the neck'
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle')) return 'wearing a bracelet on the wrist'
    if (n.includes('ring')) return 'wearing a ring on the finger'
    if (n.includes('set') || n.includes('bridal')) return 'wearing a matching jewelry set of necklace and earrings'
    return 'wearing the jewelry piece'
  }
  if (categorySlug === 'sarees') return 'draped in the saree in traditional Indian style with pallu over shoulder'
  if (categorySlug === 'mens-shirts') return 'wearing the shirt on the torso'
  if (categorySlug === 'watches') return 'wearing the watch on the wrist'
  if (categorySlug === 'fashion') return 'wearing the outfit'
  return 'wearing the product'
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
    // Check if we're in a rate limit cooldown
    const { cooling, waitSeconds } = isRateLimitCoolingDown()
    if (cooling) {
      return NextResponse.json({
        error: `AI service is currently busy. Please wait about ${waitSeconds} seconds and try again.`,
        rateLimited: true,
        waitSeconds,
      }, { status: 429 })
    }

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

    // Fetch AI suggestions in parallel
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
      progress: 'Preparing your virtual try-on...',
    })

    // Start background processing
    backgroundProcess(jobId, product.name, product.category.slug, selfieData, productImageBase64, suggestionsPromise)
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

  // Special endpoint: check rate limit status
  if (jobId === 'check') {
    const { cooling, waitSeconds } = isRateLimitCoolingDown()
    return NextResponse.json({ rateLimited: cooling, waitSeconds })
  }

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
    suggestions: job.suggestions,
    progress: job.progress,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Single generation call with retry ──────────────────────────────

async function generateWithRetry(
  zai: any,
  params: {
    prompt: string
    images?: { url: string }[]
    size: ImageSize
  },
  maxRetries: number = 3,
  job?: TryOnJob,
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if we're still in cooldown before attempting
    const { cooling, waitSeconds } = isRateLimitCoolingDown()
    if (cooling) {
      console.log(`[try-on] In cooldown (${waitSeconds}s remaining). Waiting...`)
      if (job) job.progress = `AI service recovering, ${waitSeconds}s remaining...`
      await sleep(waitSeconds * 1000 + 2000) // Wait for cooldown + 2s buffer
    }

    try {
      if (attempt > 0) {
        const waitMs = attempt * 8000
        console.log(`[try-on] Retry attempt ${attempt}/${maxRetries}, waiting ${waitMs / 1000}s...`)
        if (job) job.progress = `Retrying generation (${attempt + 1}/${maxRetries + 1})...`
        await sleep(waitMs)
      }

      let response: any
      if (params.images && params.images.length > 0) {
        response = await zai.images.generations.edit({
          prompt: params.prompt,
          images: params.images,
          size: params.size,
        } as any)
      } else {
        response = await zai.images.generations.create({
          prompt: params.prompt,
          size: params.size,
        })
      }

      const b64 = response.data?.[0]?.base64
      if (b64) {
        console.log(`[try-on] Generation succeeded on attempt ${attempt}`)
        recordSuccess()
        return `data:image/png;base64,${b64}`
      }
      console.warn(`[try-on] No base64 in response (attempt ${attempt})`)
    } catch (err: any) {
      const msg = err?.message || String(err)
      const isRateLimit = msg.includes('429') || msg.includes('rate') || msg.includes('Too many') || msg.includes('busy')

      if (isRateLimit) {
        recordRateLimit()
        console.log(`[try-on] Rate limited on attempt ${attempt}. Cooldown set.`)

        if (attempt < maxRetries) {
          // Wait for the cooldown period + buffer
          const waitMs = rateLimitCooldownMs + 5000
          if (job) job.progress = `AI service busy, waiting ${Math.ceil(waitMs / 1000)}s before retry...`
          await sleep(waitMs)
          continue
        }
      } else {
        console.error(`[try-on] Non-rate-limit error (attempt ${attempt}): ${msg.substring(0, 300)}`)
      }
    }
  }
  return null
}

// ── Main pipeline ──────────────────────────────────────────────────

async function backgroundProcess(
  jobId: string, productName: string, categorySlug: string,
  selfieData: string, productImageBase64: string,
  suggestionsPromise: Promise<any>,
) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    // Step 1: Fetch suggestions in background
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

    // Step 2: Initialize SDK
    if (job) job.progress = 'Connecting to AI service...'
    const zai = await ZAI.create()
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // ── Strategy 1: Image edit with BOTH selfie + product ──
    if (job) { job.attempt = 1; job.progress = 'Generating your virtual try-on look...' }
    console.log(`[try-on] Strategy 1: edit-both for job ${jobId}`)

    const promptBoth = `Professional fashion photograph of the person in the first image, now ${placement}. The product from the second image is: ${productName}. Combine them naturally: keep the exact same face, skin tone, hair, eye color from the first image. Apply the exact product from the second image on this person. Studio lighting, photorealistic, 8K quality, editorial fashion photography.`

    const result1 = await generateWithRetry(zai, {
      prompt: promptBoth,
      images: [{ url: selfieData }, { url: productImageBase64 }],
      size,
    }, 3, job)

    if (result1) {
      console.log(`[try-on] Strategy 1 (edit-both) succeeded for job ${jobId}`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = result1
        job.productName = productName
        job.strategy = 'edit-both'
        job.progress = 'Complete!'
      }
      return
    }

    // ── Strategy 2: Text-to-image generation (fallback, no reference images) ──
    if (job) { job.attempt = 2; job.progress = 'Trying alternative generation approach...' }
    console.log(`[try-on] Strategy 2: text-to-image for job ${jobId}`)

    const bodyType = ['sarees', 'fashion', 'mens-shirts'].includes(categorySlug)
      ? 'Full-body professional fashion photograph'
      : ['jewelry', 'watches'].includes(categorySlug)
        ? 'Close-up professional beauty photograph from chest up'
        : 'Professional fashion photograph'

    const promptCreate = `${bodyType} of a beautiful person ${placement}. The product is ${productName}. Photorealistic, studio lighting, 8K, high detail, professional fashion photography, luxury editorial style.`

    const result2 = await generateWithRetry(zai, {
      prompt: promptCreate,
      size,
    }, 2, job)

    if (result2) {
      console.log(`[try-on] Strategy 2 (text-to-image) succeeded for job ${jobId}`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = result2
        job.productName = productName
        job.strategy = 'create'
        job.progress = 'Complete!'
      }
      return
    }

    // All strategies exhausted
    throw new Error('AI service is currently busy with too many requests. Please wait 2-3 minutes and try again.')

  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Generation failed'
    }
  }
}
