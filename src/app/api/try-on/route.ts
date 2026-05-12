import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI, isZAIAvailable } from '@/lib/zai'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Virtual Try-On API — v1.1
 *
 * Key fix: The ZAI SDK's `images.generations.edit()` accepts `image: string`
 * (singular, a base64 data-URL or URL), NOT `images: [{url:...}]` (array).
 * Previous code used `images` array with `as any`, causing the API to ignore
 * the reference image entirely — producing text-only generation ("completely mismatch").
 *
 * v1.1 changes:
 *  1. Use `image` field (singular) with selfie data-URL for edit calls
 *  2. Use VLM analysis of both person + product for a detailed text prompt
 *  3. Two strategies: edit-selfie (primary) + create-detailed (fallback)
 *  4. Skip VLM verification to reduce latency (was ~60s extra per attempt)
 *  5. Better prompt engineering for virtual try-on accuracy
 */

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
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

// ── Product image helpers ──────────────────────────────────────────

function getProductImageBase64Local(imagePath: string): string | null {
  try {
    const fullPath = join(process.cwd(), 'public', imagePath)
    if (!existsSync(fullPath)) return null
    const buffer = readFileSync(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[try-on] Failed to read local product image:', err)
    return null
  }
}

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  // Handle external URLs (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('[try-on] Failed to fetch external product image:', err)
      return null
    }
  }
  // Handle protocol-relative URLs
  if (imagePath.startsWith('//')) {
    return getProductImageBase64(`https:${imagePath}`)
  }
  // Handle image-proxy URLs — extract the original URL and fetch directly
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      // Extract the original URL from the proxy URL query parameter
      const proxyUrlObj = new URL(imagePath, 'http://localhost')
      const originalUrl = proxyUrlObj.searchParams.get('url')
      if (originalUrl) {
        // Fetch the original URL directly instead of going through our proxy
        const directResult = await getProductImageBase64(originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl)
        if (directResult) return directResult
      }
      // Fallback: try self-fetching through the proxy
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const response = await fetch(`${baseUrl}${imagePath}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('[try-on] Failed to fetch proxied product image:', err)
      return null
    }
  }
  // Local path
  return getProductImageBase64Local(imagePath)
}

// ── VLM Prompts ────────────────────────────────────────────────────

const VLM_PERSON_PROMPT = `Analyze this person's face and appearance in EXACT detail for a virtual try-on. Describe:
1. Face shape (round/oval/square/heart/oblong), skin tone (light/fair/medium/olive/brown/dark, with warm/cool/neutral undertone)
2. Hair: color, texture (straight/wavy/curly), length, style
3. Body type and build (slim/average/athletic/plus-size)
4. Current expression, pose, and what part of body is visible
5. Any distinctive features
Be extremely specific about skin tone, hair, and face shape. 3-4 sentences.`

const VLM_PRODUCT_PROMPT = `Describe this fashion/luxury product in EXACT detail for a virtual try-on. Describe:
1. Type and name (saree, necklace, shirt, watch, etc.)
2. EXACT primary color (not just "red" - say "deep maroon red" or "rose pink")
3. Secondary colors and accents
4. Pattern: floral/geometric/solid/striped/paisley/embroidered - describe the pattern precisely
5. Material and texture: silk sheen/matte cotton/shiny gold/satin/mesh - be specific
6. Key design details: borders, embellishments, gemstones, stitching, collar style
7. How it would be worn on the body (draped, fitted, layered, etc.)
Be extremely specific about color, material, and pattern. 3-4 sentences.`

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
  if (categorySlug === 'mens-shirts') return 'wearing the shirt on the torso, buttoned up'
  if (categorySlug === 'watches') return 'wearing the watch on the left wrist'
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
    // Check if AI service is available and reachable
    const aiCheck = await isZAIAvailable()

    if (aiCheck.mode === 'proxy') {
      // AI service not reachable locally — proxy to sandbox
      const proxyUrl = process.env.ZAI_PROXY_URL
      if (proxyUrl) {
        console.log('[try-on] AI not reachable locally, proxying to sandbox:', proxyUrl)
        try {
          const body = await request.json()
          const proxyHost = new URL(proxyUrl).hostname
          const abcHeader = proxyHost.split('.')[0]
          const proxyResponse = await fetch(`${proxyUrl}/api/try-on`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Abc': abcHeader,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000),
          })
          const proxyResult = await proxyResponse.json()
          return NextResponse.json(proxyResult, { status: proxyResponse.status })
        } catch (proxyError) {
          console.error('[try-on] Proxy failed:', proxyError)
          return NextResponse.json({
            error: 'Virtual try-on is temporarily unavailable. Could not connect to the AI style service.',
            code: 'AI_SERVICE_UNAVAILABLE',
          }, { status: 503 })
        }
      }
    }

    if (!aiCheck.available) {
      return NextResponse.json({
        error: 'Virtual try-on is currently unavailable. This feature requires our AI style service which is not configured.',
        code: 'AI_SERVICE_UNAVAILABLE',
      }, { status: 503 })
    }

    const body = await request.json()
    const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Try to fetch product from database first, then client-provided data, then Shopify fallback
    let product = null
    try {
      product = await db.product.findUnique({
        where: { id: productId },
        include: { category: true },
      })
    } catch (dbError) {
      console.log('[try-on] Database unavailable, trying other sources...')
    }

    // Client-provided data (most reliable on Vercel and when DB is unavailable)
    // This ensures try-on works on Vercel even without DB/Shopify access
    if (!product && clientProductName && clientCategorySlug) {
      console.log('[try-on] Using client-provided product details')
      product = {
        id: productId,
        name: clientProductName,
        images: JSON.stringify(productImageUrl ? [productImageUrl] : []),
        category: { name: clientCategorySlug, slug: clientCategorySlug },
      }
    }

    // If not in DB and no client data, try Shopify fallback
    if (!product) {
      try {
        const { fetchShopifyProducts } = await import('@/lib/shopify')
        const shopifyProducts = await fetchShopifyProducts()
        const sp = shopifyProducts.find(p => p.id === productId)
        if (sp) {
          product = {
            id: sp.id,
            name: sp.name,
            images: JSON.stringify(sp.images),
            category: { name: sp.category, slug: sp.categorySlug },
          }
        }
      } catch (shopifyError) {
        console.error('[try-on] Shopify fallback also failed:', shopifyError)
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found. Please ensure the product is loaded before trying on.' }, { status: 404 })
    }

    const productImages: string[] = JSON.parse(product.images || '[]')
    const productImageToUse = productImageUrl || (productImages.length > 0 ? productImages[0] : null)
    const productImageBase64 = productImageToUse ? await getProductImageBase64(productImageToUse) : null

    if (!productImageBase64) {
      return NextResponse.json({ error: 'Product image not available' }, { status: 400 })
    }

    // Fetch AI suggestions in parallel with job creation
    const pairingCategories = getPairingCategory(product.category?.slug || '')
    let suggestionsPromise: Promise<any[]>
    try {
      suggestionsPromise = db.product.findMany({
        where: {
          category: { slug: { in: pairingCategories } },
          id: { not: productId },
          stock: { gt: 0 },
        },
        include: { category: true },
        take: 4,
        orderBy: { rating: 'desc' },
      })
    } catch {
      suggestionsPromise = (async () => {
        try {
          const { fetchShopifyProducts } = await import('@/lib/shopify')
          const allProducts = await fetchShopifyProducts()
          return allProducts
            .filter(p => pairingCategories.includes(p.categorySlug) && p.id !== productId)
            .slice(0, 4)
            .map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              images: JSON.stringify(p.images),
              category: { name: p.category, slug: p.categorySlug },
            }))
        } catch {
          return []
        }
      })()
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    jobs.set(jobId, {
      status: 'processing',
      createdAt: Date.now(),
      categorySlug: product.category.slug,
      progress: 'Analyzing your photo and product...',
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
    const message = error instanceof Error ? error.message : 'Unexpected error occurred'
    if (message.includes('AI_STYLE_SERVICE_UNAVAILABLE') || message.includes('.z-ai-config') || message.includes('not configured')) {
      return NextResponse.json({
        error: 'Virtual try-on is currently unavailable. This feature requires our AI style service which is not configured.',
        code: 'AI_SERVICE_UNAVAILABLE',
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred while generating your style preview.' }, { status: 500 })
  }
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const job = jobs.get(jobId)

  // If job not found locally, try proxying to sandbox
  if (!job) {
    const proxyUrl = process.env.ZAI_PROXY_URL
    if (proxyUrl) {
      try {
        const proxyHost = new URL(proxyUrl).hostname
        const abcHeader = proxyHost.split('.')[0]
        const proxyResponse = await fetch(`${proxyUrl}/api/try-on?jobId=${jobId}`, {
          headers: { 'Abc': abcHeader },
          signal: AbortSignal.timeout(10000),
        })
        const proxyResult = await proxyResponse.json()
        return NextResponse.json(proxyResult, { status: proxyResponse.status })
      } catch {
        return NextResponse.json({ error: 'Job not found and proxy unavailable' }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    imageUrl: job.imageUrl,
    productName: job.productName,
    categorySlug: job.categorySlug,
    error: job.error,
    strategy: job.strategy,
    suggestions: job.suggestions,
    progress: job.progress,
  })
}

// ── VLM Analysis Helper ────────────────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 45000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
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

// ── Generation strategies (v1.1 — corrected API usage) ─────────────

/**
 * Strategy A: Edit the selfie image with a detailed prompt.
 * Uses the CORRECT `image` field (singular) to pass the selfie as a
 * reference image that the AI edits. This preserves the person's face
 * and body while applying the product described in the prompt.
 */
async function strategyEditSelfie(
  zai: any, selfieData: string, _productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // Build a highly specific prompt that instructs the AI to edit the
    // selfie image while keeping the person's identity intact
    const prompt = `Edit this photo: show this exact same person now ${placement}. The product is: ${productDesc}. CRITICAL RULES: Keep the EXACT same face, skin tone, hair color, eye color, and body type as the original person. Do NOT change the person's identity or features. Only add/modify the clothing/jewelry/accessory as described. ${personDesc ? `The person's appearance: ${personDesc}.` : ''} Professional fashion photography, studio lighting, photorealistic, high detail, Vogue magazine quality.`

    console.log(`[try-on v1.1] Strategy: edit-selfie (image field), prompt: ${prompt.substring(0, 200)}...`)

    // v1.1 FIX: Use `image` field (singular) instead of `images` array
    const response = await zai.images.generations.edit({
      prompt,
      image: selfieData,  // CORRECT: singular `image` field with data-URL
      size,
    })

    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on v1.1] Strategy edit-selfie failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

/**
 * Strategy B: Generate from detailed descriptions (no reference image).
 * Fallback when edit doesn't work — uses VLM descriptions of both
 * person and product to create a text-to-image generation.
 */
async function strategyCreateDetailed(
  zai: any, _selfieData: string, _productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion'
      ? 'Full-body professional fashion photograph'
      : categorySlug === 'jewelry' || categorySlug === 'watches'
      ? 'Close-up professional beauty photograph from chest up'
      : 'Professional fashion photograph'

    const prompt = `${bodyType} of a person ${placement}. Person: ${personDesc}. Product: ${productDesc}. The person is ${placement}. Photorealistic, studio lighting, high detail, professional fashion photography, Vogue magazine quality.`

    console.log(`[try-on v1.1] Strategy: create-detailed, prompt: ${prompt.substring(0, 200)}...`)

    const response = await zai.images.generations.create({ prompt, size })
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on v1.1] Strategy create-detailed failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

/**
 * Strategy C: Edit the product image with a prompt describing the person.
 * Uses the product as the reference image and instructs the AI to
 * show it being worn by the described person.
 */
async function strategyEditProduct(
  zai: any, _selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Show this product being worn by a person. The person is ${placement}. Person description: ${personDesc}. The product is: ${productDesc}. Show the person wearing this exact product with accurate colors and details. Professional fashion photography, studio lighting, photorealistic, high detail.`

    console.log(`[try-on v1.1] Strategy: edit-product (image field), prompt: ${prompt.substring(0, 200)}...`)

    // v1.1 FIX: Use `image` field (singular) with product image
    const response = await zai.images.generations.edit({
      prompt,
      image: productImageBase64,  // CORRECT: singular `image` field
      size,
    })

    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on v1.1] Strategy edit-product failed:', (err as Error).message?.substring(0, 200))
    return null
  }
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
    // Step 1: Fetch suggestions early
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

    // Step 2: VLM analysis (parallel) — analyze both person and product
    if (job) job.progress = 'AI is analyzing your face and product details...'
    console.log(`[try-on v1.1] Starting VLM analysis for job ${jobId}`)

    const zai = await createZAI()
    const [personDesc, productDesc] = await Promise.all([
      vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
      vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
    ])
    console.log(`[try-on v1.1] Person: ${personDesc.substring(0, 150)}...`)
    console.log(`[try-on v1.1] Product: ${productDesc.substring(0, 150)}...`)

    // Step 3: Try generation strategies
    // Strategy A: Edit selfie with person's image as reference (BEST for face preservation)
    if (job) { job.progress = 'Generating your try-on look (Strategy 1/3)...' }
    const aResult = await strategyEditSelfie(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (aResult) {
      console.log(`[try-on v1.1] Strategy A (edit-selfie) succeeded`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = aResult
        job.productName = productName
        job.strategy = 'edit-selfie'
        job.progress = 'Complete!'
      }
      return
    }

    // Strategy B: Edit product image with person description
    if (job) { job.progress = 'Optimizing product display (Strategy 2/3)...' }
    const bResult = await strategyEditProduct(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (bResult) {
      console.log(`[try-on v1.1] Strategy B (edit-product) succeeded`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = bResult
        job.productName = productName
        job.strategy = 'edit-product'
        job.progress = 'Complete!'
      }
      return
    }

    // Strategy C: Create from detailed description (fallback)
    if (job) { job.progress = 'Generating from detailed descriptions (Strategy 3/3)...' }
    const cResult = await strategyCreateDetailed(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (cResult) {
      console.log(`[try-on v1.1] Strategy C (create-detailed) succeeded`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = cResult
        job.productName = productName
        job.strategy = 'create-detailed'
        job.progress = 'Complete!'
      }
      return
    }

    throw new Error('All strategies failed')
  } catch (error) {
    console.error(`[try-on v1.1] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      const msg = error instanceof Error ? error.message : 'Generation failed'
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached. Please try again.'
      } else if (msg.includes('.z-ai-config')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service is being configured.'
      } else {
        job.error = msg
      }
    }
  }
}
