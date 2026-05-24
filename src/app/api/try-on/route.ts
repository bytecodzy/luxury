import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI, isZAIAvailable, getZAIConfig } from '@/lib/zai'
import { addWatermark } from '@/lib/watermark'

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
  progress?: string
  proxyJobId?: string // If created via proxy, store proxy's jobId for polling
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

/**
 * Fetch a local (public-dir) image via HTTP so it works on both
 * local dev (Next.js serves /public) and Vercel (CDN serves assets).
 */
async function getProductImageBase64ViaHttp(imagePath: string): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  try {
    const response = await fetch(`${baseUrl}${imagePath}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': '3BOXES-Internal/1.0' },
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const mimeType = contentType.split(';')[0].trim()
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[try-on] Failed to fetch product image via HTTP:', err)
    return null
  }
}

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (!imagePath) return null

  // Handle external URLs (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
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
      const proxyUrlObj = new URL(imagePath, 'http://localhost')
      const originalUrl = proxyUrlObj.searchParams.get('url')
      if (originalUrl) {
        const directResult = await getProductImageBase64(originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl)
        if (directResult) return directResult
      }
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
  // Local path — fetch via HTTP (works on both local and Vercel)
  const httpResult = await getProductImageBase64ViaHttp(imagePath)
  if (httpResult) return httpResult

  // Last resort: try reading from filesystem directly (local dev only)
  if (!process.env.VERCEL) {
    try {
      const { existsSync, readFileSync } = await import('fs')
      const { join } = await import('path')
      const fullPath = join(process.cwd(), 'public', imagePath)
      if (!existsSync(fullPath)) return null
      const buffer = readFileSync(fullPath)
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('[try-on] Failed to read local product image from filesystem:', err)
    }
  }

  return null
}

// ── Proxy helper ────────────────────────────────────────────────────

function getProxyHeaders(proxyUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  try {
    const proxyHost = new URL(proxyUrl).hostname
    if (proxyHost.includes('.space-z.ai')) {
      headers['Abc'] = proxyHost.split('.')[0]
    }
  } catch {}
  return headers
}

/**
 * Build the proxy URL for a given path.
 *
 * The .space-z.ai gateway routes ALL requests to the sandbox's Next.js
 * server (port 3000), which has direct access to the ZAI SDK.
 * We do NOT use XTransformPort here because the external gateway
 * does not support it — adding it causes the gateway to return an
 * HTML error page instead of proxying the request.
 */
function buildProxyUrl(proxyUrl: string, path: string, queryParams?: Record<string, string>): string {
  const base = proxyUrl.replace(/\/+$/, '')
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams)
    return `${base}${path}?${params.toString()}`
  }
  return `${base}${path}`
}

// ── VLM Prompts ────────────────────────────────────────────────────

const VLM_PERSON_PROMPT = `Describe this person for a virtual try-on in EXACT detail:
- Face: shape, features, skin tone (exact shade like "warm olive" or "cool fair")
- Hair: exact color, length, style
- Body: build, height impression, visible clothing
- Pose: how they are positioned in the frame
Be extremely specific about all colors. 2-3 sentences.`

const VLM_PRODUCT_PROMPT = `Describe this product in EXACT detail for a virtual try-on:
- Type and category (e.g., "gold temple necklace", "maroon silk saree")
- EXACT primary color (NOT just "red" — say "deep maroon red" or "burgundy wine red")
- EXACT secondary/accent colors with the same specificity
- Material and texture (e.g., "polished gold metal", "silk fabric with zari work")
- Key design elements: patterns, stones, embellishments, engravings
- Size and proportions relative to how it would appear on a person
You MUST be extremely precise about every color — this is critical for accurate virtual try-on. 3-4 sentences.`

const VLM_COMBINED_PROMPT = `I have TWO images for a virtual try-on:
1) The FIRST image is a person's selfie
2) The SECOND image is the product they want to try on

Describe in precise detail:
- The person's face features, skin tone, hair color/style, and body type
- The product's EXACT colors (be hyper-specific — "deep maroon" not "red", "antique gold" not "gold"), materials, textures, and design details
- How the product should look when worn on this specific person (position, scale, fit)

CRITICAL: Be extremely precise about the product's colors and materials — the AI needs this to reproduce the exact product appearance. 3-4 sentences.`

// ── Product placement helpers ──────────────────────────────────────

function getProductPlacement(categorySlug: string, productName: string): string {
  const n = productName.toLowerCase()
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) return 'wearing earrings on both earlobes'
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala')) return 'wearing a necklace around the neck'
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada')) return 'wearing a bracelet on the wrist'
    if (n.includes('ring')) return 'wearing a ring on the finger'
    if (n.includes('set') || n.includes('bridal')) return 'wearing a matching jewelry set - necklace around the neck and earrings on both earlobes, with the pieces complementing each other perfectly'
    return 'wearing the jewelry piece'
  }
  if (categorySlug === 'sarees') return 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist'
  if (categorySlug === 'mens-shirts' || categorySlug === 'mens-shirts-t-shirts') return 'wearing the shirt on the torso'
  if (categorySlug === 'watches') return 'wearing the watch on the left wrist'
  if (categorySlug === 'fashion') return 'wearing the outfit'
  return 'wearing the product'
}

function getImageSize(categorySlug: string): ImageSize {
  if (['sarees', 'fashion', 'mens-shirts', 'mens-shirts-t-shirts'].includes(categorySlug)) return '768x1344'
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

// ── Rate-limit-aware delay ─────────────────────────────────────────

const API_CALL_DELAY = 1500 // 1.5s between API calls to respect 2 QPS limit

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Parse body outside try so it's available in catch for canvas fallback
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const isVercel = !!process.env.VERCEL
    const proxyUrl = process.env.ZAI_PROXY_URL

    const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }

    // ── On Vercel: try proxy first, then direct SDK, then canvas mode ──
    if (isVercel) {
      // Strategy 1: Try proxy if URL is configured and reachable
      if (proxyUrl) {
        console.log('[try-on] Vercel: attempting proxy to AI service:', proxyUrl)
        try {
          // Resolve product image to base64 for proxy
          const clientProvidedBase64 = body.productImageBase64 as string | undefined
          let resolvedBase64: string | null = null
          if (productImageUrl && !clientProvidedBase64) {
            resolvedBase64 = await getProductImageBase64(productImageUrl)
          }
          const finalProductImageBase64 = clientProvidedBase64 || resolvedBase64 || null

          const proxyHeaders = getProxyHeaders(proxyUrl)

          const proxyBody: Record<string, unknown> = {
            productId,
            selfieData,
            productName: clientProductName || body.productName,
            categorySlug: clientCategorySlug || body.categorySlug,
          }

          if (finalProductImageBase64) {
            proxyBody.productImageBase64 = finalProductImageBase64
            console.log('[try-on] Proxying with productImageBase64 (source:', clientProvidedBase64 ? 'client' : 'resolved', ', length:', finalProductImageBase64.length, ')')
          } else if (productImageUrl) {
            proxyBody.productImageUrl = productImageUrl
            console.log('[try-on] Could not resolve image on Vercel, passing URL to proxy:', productImageUrl)
          }
          
          const proxyFetchUrl = buildProxyUrl(proxyUrl, '/api/try-on')
          console.log('[try-on] Proxy fetch URL:', proxyFetchUrl)
          const proxyResponse = await fetch(proxyFetchUrl, {
            method: 'POST',
            headers: proxyHeaders,
            body: JSON.stringify(proxyBody),
            signal: AbortSignal.timeout(90000), // 90s timeout for proxy (image gen takes time)
          })

          if (proxyResponse.ok) {
            const proxyResult = await proxyResponse.json()
            console.log('[try-on] Proxy success, jobId:', proxyResult.jobId, 'status:', proxyResult.status)

            // Return the proxy's jobId directly to the client.
            // On Vercel, serverless function instances are stateless —
            // a local jobs Map won't persist between requests.
            // By returning the proxy's own jobId, the client can poll
            // and the GET handler will forward the request to the proxy.
            return NextResponse.json({
              ...proxyResult,
              // Ensure these fields are always present
              jobId: proxyResult.jobId,
              status: proxyResult.status || 'processing',
              productName: proxyResult.productName || clientProductName,
              categorySlug: proxyResult.categorySlug || clientCategorySlug,
            })
          } else {
            const errorText = await proxyResponse.text().catch(() => 'unknown error')
            console.error(`[try-on] Proxy returned ${proxyResponse.status}: ${errorText.substring(0, 300)}`)
          }
        } catch (proxyError) {
          const errMsg = proxyError instanceof Error ? proxyError.message : String(proxyError)
          console.error('[try-on] Proxy failed:', errMsg)
        }
      } else {
        console.log('[try-on] No ZAI_PROXY_URL configured on Vercel')
      }

      // Strategy 2: Try direct ZAI SDK if ZAI_BASE_URL and ZAI_API_KEY are configured
      const zaiConfig = getZAIConfig()
      if (zaiConfig?.baseUrl && zaiConfig?.apiKey) {
        console.log('[try-on] Vercel: checking if direct ZAI SDK is reachable at', zaiConfig.baseUrl)
        try {
          const aiCheck = await isZAIAvailable()
          if (aiCheck.available) {
            console.log('[try-on] Vercel: ZAI SDK available! Processing AI generation directly')
            // Don't return early — fall through to the main AI processing code below
            // by jumping past the Vercel canvas fallback
            // We'll handle this by continuing to the non-Vercel code path
            return await handleLocalAIGeneration(body, isVercel)
          } else {
            console.log('[try-on] Vercel: ZAI SDK not reachable:', aiCheck.reason)
          }
        } catch (directError) {
          console.error('[try-on] Direct ZAI SDK check failed:', directError)
        }
      }

      // Strategy 3: Canvas fallback — AI service unavailable
      console.log('[try-on] All AI strategies unavailable on Vercel, returning canvas mode')

      // Resolve product image to base64 so the client can use it directly in canvas fallback
      // (avoids CORS issues when loading product images client-side)
      let canvasProductImageBase64: string | null = null
      try {
        if (productImageUrl) {
          canvasProductImageBase64 = await getProductImageBase64(productImageUrl)
        }
      } catch (imgErr) {
        console.error('[try-on] Failed to resolve product image base64 for canvas mode:', imgErr)
      }

      return NextResponse.json({
        mode: 'canvas',
        message: 'AI style preview is temporarily unavailable. Showing style overlay with product image instead.',
        code: 'AI_CANVAS_MODE',
        productName: clientProductName,
        categorySlug: clientCategorySlug,
        productImageBase64: canvasProductImageBase64,
        productImageUrl: productImageUrl || null,
      }, { status: 200 })
    }

    // ── Non-Vercel: local AI processing ──
    return await handleLocalAIGeneration(body, isVercel)
  } catch (error) {
    console.error('[try-on] API error:', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Unexpected error occurred'
    if (message.includes('AI_STYLE_SERVICE_UNAVAILABLE') || message.includes('.z-ai-config') || message.includes('not configured')) {
      // Try to resolve product image base64 for canvas fallback
      let errorProductImageBase64: string | null = null
      try {
        const imgUrl = body?.productImageUrl
        if (imgUrl) {
          errorProductImageBase64 = await getProductImageBase64(imgUrl)
        }
      } catch {}

      return NextResponse.json({
        mode: 'canvas',
        message: 'AI style preview is not configured. Showing style overlay with product image instead.',
        code: 'AI_CANVAS_MODE',
        productImageBase64: errorProductImageBase64,
        productImageUrl: body?.productImageUrl || null,
      }, { status: 200 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred while generating your style preview.' }, { status: 500 })
  }
}

// ── Local AI Generation Handler ────────────────────────────────────

async function handleLocalAIGeneration(body: any, isVercel: boolean) {
  const aiCheck = await isZAIAvailable()

  if (!aiCheck.available) {
    console.log('[try-on] AI unavailable:', aiCheck.reason)
    // Try to resolve product image for the canvas fallback
    const fallbackProductImage = body.productImageUrl
      ? await getProductImageBase64(body.productImageUrl).catch(() => null)
      : null
    return NextResponse.json({
      mode: 'canvas',
      message: 'AI style preview is temporarily unavailable. Showing style overlay with product image instead.',
      code: 'AI_CANVAS_MODE',
      productImageBase64: fallbackProductImage,
      productImageUrl: body.productImageUrl || null,
    }, { status: 200 })
  }

  const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

  if (!productId || !selfieData) {
    return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
  }
  if (!selfieData.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
  }

  // Resolve product info
  interface TryOnProduct {
    id: string
    name: string
    images: string
    category: { name: string; slug: string }
  }
  let product: TryOnProduct | null = null

  if (!isVercel) {
    try {
      const dbProduct = await db.product.findUnique({
        where: { id: productId },
        include: { category: true },
      })
      if (dbProduct) {
        product = {
          id: dbProduct.id,
          name: dbProduct.name,
          images: dbProduct.images,
          category: { name: dbProduct.category.name, slug: dbProduct.category.slug },
        }
      }
    } catch (dbError) {
      console.log('[try-on] Database unavailable, trying other sources...')
    }
  }

  if (!product && clientProductName && clientCategorySlug) {
    console.log('[try-on] Using client-provided product details')
    product = {
      id: productId,
      name: clientProductName,
      images: JSON.stringify(productImageUrl ? [productImageUrl] : []),
      category: { name: clientCategorySlug, slug: clientCategorySlug },
    }
  }

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
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
  }

  const productImages: string[] = JSON.parse(product.images || '[]')
  const productImageToUse = productImageUrl || (productImages.length > 0 ? productImages[0] : null)

  // Use client-provided base64 if available, otherwise resolve server-side
  const clientProvidedBase64 = body.productImageBase64 as string | undefined
  let resolvedBase64: string | null = null
  if (!clientProvidedBase64 && productImageToUse) {
    resolvedBase64 = await getProductImageBase64(productImageToUse)
  }
  const productImageBase64 = clientProvidedBase64 || resolvedBase64 || null

  if (!productImageBase64) {
    return NextResponse.json({ 
      error: 'Product image not available',
    }, { status: 400 })
  }

  // Fetch AI suggestions in parallel
  const pairingCategories = getPairingCategory(product.category?.slug || '')
  let suggestionsPromise: Promise<any[]>

  if (isVercel) {
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
  } else {
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
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  jobs.set(jobId, {
    status: 'processing',
    createdAt: Date.now(),
    categorySlug: product.category.slug,
    attempt: 1,
    progress: 'Analyzing your photo and product...',
  })

  backgroundProcess(jobId, product.name, product.category.slug, selfieData, productImageBase64, suggestionsPromise)
    .catch((err) => console.error('[try-on] Background job failed:', err))

  return NextResponse.json({
    jobId,
    status: 'processing',
    productName: product.name,
    categorySlug: product.category.slug,
  })
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const job = jobs.get(jobId)

  if (!job) {
    // Job not found locally — might be on the proxy
    const proxyUrl = process.env.ZAI_PROXY_URL
    if (proxyUrl) {
      try {
        const proxyHeaders = getProxyHeaders(proxyUrl)
        
        const proxyFetchUrl = buildProxyUrl(proxyUrl, '/api/try-on', { jobId: jobId })
        const proxyResponse = await fetch(proxyFetchUrl, {
          headers: proxyHeaders,
          signal: AbortSignal.timeout(15000),
        })
        
        if (!proxyResponse.ok) {
          const errorData = await proxyResponse.json().catch(() => ({ error: 'Proxy returned error' }))
          return NextResponse.json(errorData, { status: proxyResponse.status })
        }
        
        const proxyResult = await proxyResponse.json()
        return NextResponse.json(proxyResult, { status: 200 })
      } catch (proxyError) {
        console.error('[try-on] GET proxy failed:', proxyError)
        return NextResponse.json({ error: 'Job not found and proxy unavailable' }, { status: 404 })
      }
    }
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // If this job has a proxyJobId, poll the proxy for status
  if (job.proxyJobId) {
    const proxyUrl = process.env.ZAI_PROXY_URL
    if (proxyUrl) {
      try {
        const proxyHeaders = getProxyHeaders(proxyUrl)
        const proxyFetchUrl = buildProxyUrl(proxyUrl, '/api/try-on', { jobId: job.proxyJobId! })
        const proxyResponse = await fetch(proxyFetchUrl, {
          headers: proxyHeaders,
          signal: AbortSignal.timeout(15000),
        })

        if (proxyResponse.ok) {
          const proxyResult = await proxyResponse.json()
          // Update local job status from proxy
          if (proxyResult.status === 'completed') {
            job.status = 'completed'
            job.imageUrl = proxyResult.imageUrl
            job.productName = proxyResult.productName
            job.strategy = proxyResult.strategy
            job.faceScore = proxyResult.faceScore
            job.productScore = proxyResult.productScore
            job.suggestions = proxyResult.suggestions
            job.progress = 'Complete!'
          } else if (proxyResult.status === 'failed') {
            job.status = 'failed'
            job.error = proxyResult.error
          } else {
            job.progress = proxyResult.progress || job.progress
          }
        }
      } catch (proxyError) {
        console.error('[try-on] GET proxy poll failed:', proxyError)
        // Continue with local job status
      }
    }
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
    suggestions: job.suggestions,
    progress: job.progress,
  })
}

// ── VLM Analysis Helper ────────────────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
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
  } catch (err) {
    console.error('[try-on] VLM analysis failed:', (err as Error).message?.substring(0, 200))
    return ''
  }
}

/**
 * VLM analysis with BOTH selfie and product images in a single call.
 * This provides the AI with full context of both the person and the product,
 * enabling a much more accurate combined description for try-on.
 */
async function vlmAnalyzeCombined(zai: any, selfieUrl: string, productUrl: string, timeoutMs = 45000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{ role: 'user', content: [
          { type: 'text', text: VLM_COMBINED_PROMPT },
          { type: 'image_url', image_url: { url: selfieUrl } },
          { type: 'image_url', image_url: { url: productUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch (err) {
    console.error('[try-on] VLM combined analysis failed:', (err as Error).message?.substring(0, 200))
    return ''
  }
}

// ── Safe image generation wrappers ─────────────────────────────────

async function safeImageEdit(zai: any, params: { prompt: string; images: { url: string }[]; size: ImageSize }): Promise<string | null> {
  try {
    const response = await zai.images.generations.edit({
      prompt: params.prompt,
      images: params.images,
      size: params.size,
    } as any)

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    if (response?.data?.[0]?.url && !response.data[0].base64) {
      console.warn('[try-on] Edit API returned URL instead of base64, SDK download may have failed')
      return null
    }
    if (!response?.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.warn('[try-on] Edit API returned unexpected response:', JSON.stringify(response)?.substring(0, 200))
      return null
    }
    return null
  } catch (err) {
    const msg = (err as Error).message?.substring(0, 200) || 'Unknown error'
    console.error('[try-on] Image edit failed:', msg)
    return null
  }
}

async function safeImageCreate(zai: any, params: { prompt: string; size: ImageSize }): Promise<string | null> {
  try {
    const response = await zai.images.generations.create({
      prompt: params.prompt,
      size: params.size,
    })

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    if (response?.data?.[0]?.url && !response.data[0].base64) {
      console.warn('[try-on] Create API returned URL instead of base64, SDK download may have failed')
      return null
    }
    if (!response?.data || !Array.isArray(response.data)) {
      console.warn('[try-on] Create API returned unexpected response:', JSON.stringify(response)?.substring(0, 200))
      return null
    }
    return null
  } catch (err) {
    const msg = (err as Error).message?.substring(0, 200) || 'Unknown error'
    console.error('[try-on] Image create failed:', msg)
    return null
  }
}

// ── Main pipeline ──────────────────────────────────────────────────

interface GenResult {
  imageUrl: string
  strategy: string
  faceScore: number
  productScore: number
}

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

    // Step 2: VLM analysis — combined analysis with both images, plus individual analyses
    if (job) job.progress = 'AI is analyzing your photo and product...'
    console.log(`[try-on] Starting VLM analysis for job ${jobId}`)

    const zai = await createZAI()

    // Combined VLM analysis (both images together — best context)
    const combinedDesc = await vlmAnalyzeCombined(zai, selfieData, productImageBase64)
    console.log(`[try-on] Combined desc: ${combinedDesc.substring(0, 150)}...`)

    await delay(API_CALL_DELAY)

    // Individual analyses as fallbacks
    const personDesc = await vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData)
    console.log(`[try-on] Person desc: ${personDesc.substring(0, 100)}...`)

    await delay(API_CALL_DELAY)

    const productDesc = await vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64)
    console.log(`[try-on] Product desc: ${productDesc.substring(0, 100)}...`)

    // Step 3: Try generation strategies — attempt ALL and keep best
    const results: GenResult[] = []
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    // Use the best available description for the product
    const bestProductDesc = productDesc || combinedDesc || 'a luxury fashion item'
    const bestPersonDesc = personDesc || combinedDesc || 'a person'

    // Strategy 1: Edit selfie with VLM combined description (BEST — preserves face + accurate product)
    if (job) { job.attempt = 1; job.progress = 'Creating your virtual try-on...' }
    await delay(API_CALL_DELAY)
    console.log(`[try-on] Strategy 1: edit-selfie-combined`)
    const s1Result = await safeImageEdit(zai, {
      prompt: `Professional fashion photograph of this EXACT person ${placement}. PRODUCT TO APPLY: "${productName}". ${combinedDesc || bestProductDesc}. CRITICAL INSTRUCTIONS: 1) Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them at all. 2) Apply the product with its EXACT colors, materials, texture, and design — match every color precisely as described. 3) The product must look realistic, natural, and properly fitted on this person. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: selfieData }],
      size,
    })
    if (s1Result) {
      console.log(`[try-on] Strategy 1 (edit-selfie-combined) succeeded`)
      results.push({ imageUrl: s1Result, strategy: 'edit-selfie-combined', faceScore: 9, productScore: 7 })
    }

    // Strategy 2: Edit selfie with individual product description (GOOD — face preserved, product from VLM)
    if (job) { job.attempt = 2; job.progress = 'Refining your try-on look...' }
    await delay(API_CALL_DELAY)
    console.log(`[try-on] Strategy 2: edit-selfie-product`)
    const s2Result = await safeImageEdit(zai, {
      prompt: `Professional fashion photograph. Edit this person's photo to show them ${placement}. The product is "${productName}": ${bestProductDesc}. CRITICAL: 1) Keep the EXACT same face, skin tone, hair, and body. 2) The product MUST match its EXACT described colors, materials, and design — no color shifting or substitution. 3) Product should look natural and realistically worn. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: selfieData }],
      size,
    })
    if (s2Result) {
      console.log(`[try-on] Strategy 2 (edit-selfie-product) succeeded`)
      results.push({ imageUrl: s2Result, strategy: 'edit-selfie-product', faceScore: 9, productScore: 6 })
    }

    // Strategy 3: Edit product image with person description (GOOD — product preserved from image)
    if (job) { job.attempt = 3; job.progress = 'Creating product-focused preview...' }
    await delay(API_CALL_DELAY)
    console.log(`[try-on] Strategy 3: edit-product`)
    const s3Result = await safeImageEdit(zai, {
      prompt: `Professional fashion photograph showing this EXACT product "${productName}" being worn by a person who is ${placement}. Person: ${bestPersonDesc}. CRITICAL: 1) The product's colors, materials, and design MUST match EXACTLY as shown in the image — do NOT change any color or detail. 2) The person should look natural wearing it. Studio lighting, photorealistic, 8K quality.`,
      images: [{ url: productImageBase64 }],
      size,
    })
    if (s3Result) {
      console.log(`[try-on] Strategy 3 (edit-product) succeeded`)
      results.push({ imageUrl: s3Result, strategy: 'edit-product', faceScore: 5, productScore: 9 })
    }

    // Strategy 4: Text-to-image with combined description
    if (results.length === 0) {
      if (job) { job.attempt = 4; job.progress = 'Generating from descriptions...' }
      await delay(API_CALL_DELAY)
      console.log(`[try-on] Strategy 4: create-detailed`)

      const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion' || categorySlug === 'mens-shirts-t-shirts'
        ? 'Full-body professional fashion photograph'
        : categorySlug === 'jewelry' || categorySlug === 'watches'
        ? 'Close-up professional beauty photograph from chest up'
        : 'Professional fashion photograph'

      const s4Result = await safeImageCreate(zai, {
        prompt: `${bodyType} of a person ${placement}. The product is "${productName}": ${bestProductDesc}. Person: ${bestPersonDesc}. Combined context: ${combinedDesc || ''}. Show the product being worn with EXACT colors, materials, and details. Photorealistic, studio lighting, 8K, high detail.`,
        size,
      })
      if (s4Result) {
        console.log(`[try-on] Strategy 4 (create-detailed) succeeded`)
        results.push({ imageUrl: s4Result, strategy: 'create-detailed', faceScore: 4, productScore: 5 })
      }
    }

    if (results.length === 0) {
      console.warn(`[try-on] All AI generation strategies failed for job ${jobId}, returning canvas mode`)
      if (job) {
        job.status = 'completed'
        job.imageUrl = ''
        job.strategy = 'canvas-fallback'
        job.progress = 'AI generation unavailable — using style preview'
      }
      return
    }

    // Step 4: Pick best result — prioritize PRODUCT accuracy (user expects to see the exact product)
    const best = results.reduce((a, b) => {
      const sa = a.productScore * 0.6 + a.faceScore * 0.4
      const sb = b.productScore * 0.6 + b.faceScore * 0.4
      return sb > sa ? b : a
    })

    console.log(`[try-on] Best: ${best.strategy}, Face=${best.faceScore}/10, Product=${best.productScore}/10, Score=${best.productScore * 0.6 + best.faceScore * 0.4}`)

    // Step 5: Apply 3BOXES GIFTS watermark
    if (job) job.progress = 'Adding finishing touches...'
    let finalImageUrl = best.imageUrl
    try {
      finalImageUrl = await addWatermark(best.imageUrl)
      console.log(`[try-on] Watermark applied successfully`)
    } catch (wmErr) {
      console.error('[try-on] Watermark failed, using original:', wmErr)
    }

    if (job) {
      job.status = 'completed'
      job.imageUrl = finalImageUrl
      job.productName = productName
      job.strategy = best.strategy
      job.faceScore = best.faceScore
      job.productScore = best.productScore
      job.progress = 'Complete!'
    }
  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      const msg = error instanceof Error ? error.message : 'Generation failed'
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached.'
      } else {
        job.error = msg
      }
    }
  }
}
