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
  isComposite?: boolean
}

const jobs = new Map<string, TryOnJob>()

// ── Global Request Queue ─────────────────────────────────────────────
// Ensures only ONE API call is in-flight at a time, with minimum spacing
let lastApiCallAt = 0
const MIN_API_SPACING_MS = 10_000 // 10s between API calls
let apiCallInProgress = false

async function waitForApiSlot(): Promise<void> {
  while (apiCallInProgress) {
    await sleep(1000)
  }
  const elapsed = Date.now() - lastApiCallAt
  if (elapsed < MIN_API_SPACING_MS) {
    await sleep(MIN_API_SPACING_MS - elapsed)
  }
  apiCallInProgress = true
}

function releaseApiSlot() {
  lastApiCallAt = Date.now()
  apiCallInProgress = false
}

// ── Rate Limit State ──────────────────────────────────────────────────
// Tracks if the API is rate-limited so we can fast-fallback to composite
let consecutive429s = 0
let rateLimitUntil = 0

function isRateLimitActive(): { active: boolean; waitSeconds: number } {
  if (rateLimitUntil === 0) return { active: false, waitSeconds: 0 }
  const remaining = rateLimitUntil - Date.now()
  if (remaining <= 0) {
    rateLimitUntil = 0
    return { active: false, waitSeconds: 0 }
  }
  return { active: true, waitSeconds: Math.ceil(remaining / 1000) }
}

function record429() {
  consecutive429s++
  // Progressive cooldown: 30s, 45s, 60s, max 90s
  const cooldownMs = Math.min(90_000, 30_000 + (consecutive429s - 1) * 15_000)
  rateLimitUntil = Date.now() + cooldownMs
  console.log(`[try-on] 🔴 Rate limited! Cooldown: ${cooldownMs / 1000}s (consecutive: ${consecutive429s})`)
}

function recordApiSuccess() {
  if (consecutive429s > 0) {
    console.log(`[try-on] 🟢 API recovered after ${consecutive429s} rate limits`)
  }
  consecutive429s = 0
  rateLimitUntil = 0
}

// How many 429s before we give up and use composite fallback
const MAX_429S_BEFORE_FALLBACK = 3

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 20 * 60 * 1000) {
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

    const { active: rateLimited, waitSeconds } = isRateLimitActive()

    jobs.set(jobId, {
      status: 'processing',
      createdAt: Date.now(),
      categorySlug: product.category.slug,
      attempt: 1,
      progress: rateLimited
        ? `AI service recovering, ~${waitSeconds}s wait...`
        : 'Preparing your virtual try-on...',
    })

    // Start background processing
    backgroundProcess(jobId, product.name, product.category.slug, selfieData, productImageBase64, suggestionsPromise)
      .catch((err) => console.error('[try-on] Background job failed:', err))

    return NextResponse.json({
      jobId,
      status: 'processing',
      productName: product.name,
      categorySlug: product.category.slug,
      rateLimited,
      waitSeconds: rateLimited ? waitSeconds : undefined,
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
    suggestions: job.suggestions,
    progress: job.progress,
    isComposite: job.isComposite,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Single API call attempt ──────────────────────────────────────────
// Returns: { image: string } on success, { rateLimited: boolean } on 429, { error: string } on other error

async function tryApiCall(
  zai: ZAI,
  method: 'edit' | 'create',
  params: {
    prompt: string
    image?: string
    size: ImageSize
  },
  job: TryOnJob,
): Promise<{ image: string } | { rateLimited: boolean } | { error: string }> {
  // Wait for API slot
  await waitForApiSlot()

  try {
    if (job) job.progress = method === 'edit'
      ? 'AI is generating your virtual try-on...'
      : 'AI is creating a visualization...'

    let response: any

    if (method === 'edit' && params.image) {
      response = await zai.images.generations.edit({
        prompt: params.prompt,
        image: params.image,
        size: params.size,
      })
    } else {
      response = await zai.images.generations.create({
        prompt: params.prompt,
        size: params.size,
      })
    }

    releaseApiSlot()

    const b64 = response?.data?.[0]?.base64
    if (b64) {
      console.log(`[try-on] ✅ ${method} succeeded`)
      recordApiSuccess()
      return { image: `data:image/png;base64,${b64}` }
    }

    console.warn(`[try-on] No base64 in ${method} response`)
    return { error: 'No image data in response' }
  } catch (err: any) {
    releaseApiSlot()
    const msg = (err?.message || String(err)).substring(0, 500)
    const isRateLimit = msg.includes('429') || msg.includes('Too many') || msg.includes('rate limit')

    if (isRateLimit) {
      record429()
      return { rateLimited: true }
    }

    console.error(`[try-on] ${method} error: ${msg.substring(0, 200)}`)
    return { error: msg }
  }
}

// ── Wait for rate limit cooldown, returns false if deadline exceeded ──

async function waitForRateLimit(job: TryOnJob, deadline: number): Promise<boolean> {
  const { active, waitSeconds } = isRateLimitActive()
  if (!active) return true

  // Cap wait at 60 seconds per cycle, or remaining deadline
  const maxWait = Math.min(60_000, deadline - Date.now())
  if (maxWait <= 0) return false

  if (job) job.progress = `AI service busy, waiting ~${Math.ceil(maxWait / 1000)}s...`
  console.log(`[try-on] Waiting ${maxWait / 1000}s for rate limit cooldown...`)
  await sleep(maxWait)
  return true
}

// ── Composite fallback ────────────────────────────────────────────────

function setCompositeResult(job: TryOnJob, selfieData: string, productImageBase64: string, productName: string, categorySlug: string) {
  job.status = 'completed'
  job.productName = productName
  job.strategy = 'composite-preview'
  job.isComposite = true
  job.progress = 'Preview generated (AI busy — try again later for full try-on)'
  job.imageUrl = JSON.stringify({
    type: 'composite',
    selfie: selfieData,
    product: productImageBase64,
    productName,
    categorySlug,
  })
}

// ── Main pipeline ──────────────────────────────────────────────────

async function backgroundProcess(
  jobId: string, productName: string, categorySlug: string,
  selfieData: string, productImageBase64: string,
  suggestionsPromise: Promise<any>,
) {
  const job = jobs.get(jobId)
  if (!job) return

  const startTime = Date.now()
  // Hard deadline: 3 minutes (fast enough for good UX, long enough for rate limit waits)
  const deadline = startTime + 3 * 60 * 1000
  let total429s = 0

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

    // ── If API is deeply rate-limited, try one call then fallback fast ──
    const { active: initiallyRateLimited } = isRateLimitActive()
    if (initiallyRateLimited && consecutive429s >= MAX_429S_BEFORE_FALLBACK) {
      console.log(`[try-on] API deeply rate-limited (${consecutive429s} consecutive 429s), using composite fallback`)
      if (job) job.progress = 'AI service is busy — generating preview instead...'
      await sleep(1000) // Brief pause for UX
      setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug)
      return
    }

    // ── Strategy 1: Image EDIT with selfie ──
    if (Date.now() > deadline) { setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug); return }

    if (job) { job.attempt = 1; job.progress = 'Generating your virtual try-on look...' }
    console.log(`[try-on] Strategy 1: edit for job ${jobId}`)

    const editPrompt = `Professional fashion photograph: the person in this image is now ${placement}. The product is: ${productName}. Keep the exact same face, skin tone, hair, and features. Apply the product naturally onto this person. Studio lighting, photorealistic, 8K quality, editorial fashion photography.`

    // Wait for rate limit if active
    if (!await waitForRateLimit(job, deadline)) { setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug); return }

    const result1 = await tryApiCall(zai, 'edit', {
      prompt: editPrompt,
      image: selfieData,
      size,
    }, job)

    if ('image' in result1) {
      console.log(`[try-on] ✅ Strategy 1 (edit) succeeded in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      job.status = 'completed'
      job.imageUrl = result1.image
      job.productName = productName
      job.strategy = 'edit-selfie'
      job.progress = 'Complete!'
      return
    }

    if ('rateLimited' in result1) {
      total429s++
      // Wait for cooldown and retry ONCE
      if (!await waitForRateLimit(job, deadline)) { setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug); return }

      const retry1 = await tryApiCall(zai, 'edit', {
        prompt: editPrompt,
        image: selfieData,
        size,
      }, job)

      if ('image' in retry1) {
        job.status = 'completed'
        job.imageUrl = retry1.image
        job.productName = productName
        job.strategy = 'edit-selfie'
        job.progress = 'Complete!'
        return
      }

      if ('rateLimited' in retry1) total429s++
    }

    // ── Check if we should fast-fallback ──
    if (total429s >= MAX_429S_BEFORE_FALLBACK) {
      console.log(`[try-on] ${total429s} rate limits hit, using composite fallback`)
      if (job) job.progress = 'AI service is busy — generating preview instead...'
      await sleep(500)
      setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug)
      return
    }

    // ── Strategy 2: Text-to-image ──
    if (Date.now() > deadline) { setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug); return }

    if (job) { job.attempt = 2; job.progress = 'Trying alternative generation approach...' }
    console.log(`[try-on] Strategy 2: text-to-image for job ${jobId}`)

    const bodyType = ['sarees', 'fashion', 'mens-shirts'].includes(categorySlug)
      ? 'Full-body professional fashion photograph'
      : ['jewelry', 'watches'].includes(categorySlug)
        ? 'Close-up professional beauty photograph from chest up'
        : 'Professional fashion photograph'

    const createPrompt = `${bodyType} of a beautiful person ${placement}. The product is ${productName}. Photorealistic, studio lighting, 8K, high detail, professional fashion photography, luxury editorial style.`

    if (!await waitForRateLimit(job, deadline)) { setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug); return }

    const result2 = await tryApiCall(zai, 'create', {
      prompt: createPrompt,
      size,
    }, job)

    if ('image' in result2) {
      console.log(`[try-on] ✅ Strategy 2 (text-to-image) succeeded in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      job.status = 'completed'
      job.imageUrl = result2.image
      job.productName = productName
      job.strategy = 'text-to-image'
      job.progress = 'Complete!'
      return
    }

    if ('rateLimited' in result2) total429s++

    // ── Final fallback: Composite ──
    console.log(`[try-on] All API strategies exhausted (${total429s} rate limits), using composite fallback`)
    setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug)

  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    // Even on unexpected error, provide composite
    setCompositeResult(job, selfieData, productImageBase64, productName, categorySlug)
  }
}
