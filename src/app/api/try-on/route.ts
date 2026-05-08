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

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  return await ZAI.create()
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Generation with retry ──────────────────────────────────────────

async function generateWithRetry(
  zai: any,
  params: { prompt: string; images?: { url: string }[]; size: ImageSize },
  maxRetries: number = 2,
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[try-on] Retry attempt ${attempt}/${maxRetries}, waiting ${attempt * 3}s...`)
        await sleep(attempt * 3000)
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
        return `data:image/png;base64,${b64}`
      }
      console.warn(`[try-on] No base64 in response (attempt ${attempt})`)
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.error(`[try-on] Generation error (attempt ${attempt}): ${msg.substring(0, 300)}`)

      // If rate limited, wait longer
      if (msg.includes('429') || msg.includes('rate') || msg.includes('Too many')) {
        const waitTime = (attempt + 1) * 5000
        console.log(`[try-on] Rate limited, waiting ${waitTime}ms...`)
        await sleep(waitTime)
      }
    }
  }
  return null
}

// ── Main pipeline (simplified: max 2-3 API calls) ──────────────────

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
    const zai = await createZAI()
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // ── Strategy 1: Image edit with BOTH selfie + product (best combined result) ──
    if (job) { job.attempt = 1; job.progress = 'Generating your virtual try-on look...' }
    console.log(`[try-on] Strategy 1: edit-both for job ${jobId}`)

    const promptBoth = `Professional fashion photograph of the person in the first image, now ${placement}. The product from the second image is: ${productName}. Combine them naturally: keep the exact same face, skin tone, hair, eye color from the first image. Apply the exact product from the second image on this person. Studio lighting, photorealistic, 8K quality, editorial fashion photography.`

    const result1 = await generateWithRetry(zai, {
      prompt: promptBoth,
      images: [{ url: selfieData }, { url: productImageBase64 }],
      size,
    })

    if (result1) {
      console.log(`[try-on] Strategy 1 succeeded for job ${jobId}`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = result1
        job.productName = productName
        job.strategy = 'edit-both'
        job.progress = 'Complete!'
      }
      return
    }

    // ── Strategy 2: Image edit with selfie only (face preservation) ──
    if (job) { job.attempt = 2; job.progress = 'Trying alternative approach...' }
    console.log(`[try-on] Strategy 2: edit-selfie for job ${jobId}`)

    const promptSelfie = `Professional fashion photograph of this person ${placement}. The product is: ${productName}. Keep the exact same face, skin tone, hair, and eye color. Studio lighting, photorealistic, 8K quality, editorial fashion photography.`

    const result2 = await generateWithRetry(zai, {
      prompt: promptSelfie,
      images: [{ url: selfieData }],
      size,
    })

    if (result2) {
      console.log(`[try-on] Strategy 2 succeeded for job ${jobId}`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = result2
        job.productName = productName
        job.strategy = 'edit-selfie'
        job.progress = 'Complete!'
      }
      return
    }

    // ── Strategy 3: Text-to-image generation (no reference images, pure prompt) ──
    if (job) { job.attempt = 3; job.progress = 'Generating from description...' }
    console.log(`[try-on] Strategy 3: text-to-image for job ${jobId}`)

    const bodyType = ['sarees', 'fashion', 'mens-shirts'].includes(categorySlug)
      ? 'Full-body professional fashion photograph'
      : ['jewelry', 'watches'].includes(categorySlug)
        ? 'Close-up professional beauty photograph from chest up'
        : 'Professional fashion photograph'

    const promptCreate = `${bodyType} of a beautiful person ${placement}. The product is ${productName}. Photorealistic, studio lighting, 8K, high detail, professional fashion photography, luxury editorial style.`

    const result3 = await generateWithRetry(zai, {
      prompt: promptCreate,
      size,
    })

    if (result3) {
      console.log(`[try-on] Strategy 3 succeeded for job ${jobId}`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = result3
        job.productName = productName
        job.strategy = 'create'
        job.progress = 'Complete!'
      }
      return
    }

    // All strategies exhausted
    throw new Error('All generation strategies failed. The AI service may be temporarily busy — please try again in a moment.')

  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Generation failed'
    }
  }
}
