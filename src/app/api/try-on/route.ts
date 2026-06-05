import { NextRequest, NextResponse } from 'next/server'
import { isZAIAvailable, getZAIConfig } from '@/lib/zai'
import { createJob, getJob, runPipeline } from '@/lib/try-on-pipeline'
import { externalTryOn, isExternalAIAvailable } from '@/lib/external-ai'

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

function isSpaceZaiGateway(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname
    return hostname.includes('.space-z.ai')
  } catch {
    return false
  }
}

function buildProxyUrl(proxyUrl: string, path: string, queryParams?: Record<string, string>): string {
  const base = proxyUrl.replace(/\/+$/, '')
  const params = new URLSearchParams(queryParams || {})

  // For .space-z.ai gateway URLs, add XTransformPort=3030
  // to route to the ai-proxy service on the sandbox
  if (isSpaceZaiGateway(proxyUrl)) {
    params.set('XTransformPort', '3030')
  }

  const paramStr = params.toString()
  return paramStr ? `${base}${path}?${paramStr}` : `${base}${path}`
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

// ── Canvas fallback helper (ALWAYS returns 200, never shows errors to user) ──

function returnCanvasMode(
  productImageUrl: string | null | undefined,
  productImageBase64: string | null | undefined,
  productName: string | null | undefined,
  categorySlug: string | null | undefined,
  message?: string,
): NextResponse {
  return NextResponse.json({
    mode: 'canvas',
    message: message || 'AI style preview is temporarily unavailable. Showing style overlay with product image instead.',
    code: 'AI_CANVAS_MODE',
    productName: productName || null,
    categorySlug: categorySlug || null,
    productImageBase64: productImageBase64 || null,
    productImageUrl: productImageUrl || null,
  }, { status: 200 })
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

  // PERMANENT FIX: The entire handler is wrapped so that ANY error
  // falls back to canvas mode. The user should NEVER see "AI unavailable".
  try {
    const isVercel = !!process.env.VERCEL
    const proxyUrl = process.env.ZAI_PROXY_URL

    const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }

    // ── Resolve product image base64 (used by multiple strategies) ──
    const clientProvidedBase64 = body.productImageBase64 as string | undefined
    let resolvedBase64: string | null = null
    if (productImageUrl && !clientProvidedBase64) {
      resolvedBase64 = await getProductImageBase64(productImageUrl)
    }
    const finalProductImageBase64 = clientProvidedBase64 || resolvedBase64 || null

    // ── Strategy 0: External AI services (Replicate IDM-VTON / OpenAI) ──
    // These work from BOTH sandbox and Vercel — publicly accessible APIs
    const externalAI = isExternalAIAvailable()
    if (externalAI.replicate || externalAI.openai) {
      console.log('[try-on] External AI available: replicate=', externalAI.replicate, 'openai=', externalAI.openai)
      try {
        if (!finalProductImageBase64) {
          console.log('[try-on] No product image base64 for external AI, skipping')
        } else {
          // Create a job for polling
          const jobId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          createJob(jobId, {
            categorySlug: clientCategorySlug || '',
            productName: clientProductName || '',
            progress: 'Generating AI try-on with external service...',
          })

          // Run external AI in background
          ;(async () => {
            const job = getJob(jobId)
            if (!job) return
            try {
              const result = await externalTryOn({
                selfieData,
                productImageBase64: finalProductImageBase64,
                productName: clientProductName || 'Product',
                categorySlug: clientCategorySlug || '',
              })

              if (result.success && result.imageUrl) {
                job.status = 'completed'
                job.imageUrl = result.imageUrl
                job.strategy = result.strategy
                job.progress = 'Complete!'
              } else {
                job.status = 'failed'
                job.error = result.error || 'External AI generation failed'
              }
            } catch (err) {
              job.status = 'failed'
              job.error = err instanceof Error ? err.message : 'External AI error'
            }
          })()

          // Return jobId for polling
          return NextResponse.json({
            jobId,
            status: 'processing',
            productName: clientProductName,
            categorySlug: clientCategorySlug,
          })
        }
      } catch (extErr) {
        console.error('[try-on] External AI error:', extErr)
      }
    }

    // ── On Vercel: try proxy first, then direct SDK, then canvas mode ──
    if (isVercel) {
      // Strategy 1: Try proxy if URL is configured and reachable
      if (proxyUrl) {
        console.log('[try-on] Vercel: attempting proxy to AI service:', proxyUrl)
        try {
          // Product image base64 already resolved above

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
            signal: AbortSignal.timeout(15000), // 15s timeout — fail fast, let client canvas fallback work
          })

          if (proxyResponse.ok) {
            const proxyResult = await proxyResponse.json()
            console.log('[try-on] Proxy success, jobId:', proxyResult.jobId, 'status:', proxyResult.status)
            return NextResponse.json({
              ...proxyResult,
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

      let canvasProductImageBase64: string | null = null
      try {
        if (productImageUrl) {
          canvasProductImageBase64 = await getProductImageBase64(productImageUrl)
        }
      } catch (imgErr) {
        console.error('[try-on] Failed to resolve product image base64 for canvas mode:', imgErr)
      }

      // Also try client-provided base64 (already resolved above as clientProvidedBase64)
      const finalBase64 = clientProvidedBase64 || canvasProductImageBase64

      return returnCanvasMode(productImageUrl, finalBase64, clientProductName, clientCategorySlug)
    }

    // ── Non-Vercel: local AI processing ──
    // First try the local ai-proxy service on port 3030 (dedicated AI service)
    // If that fails, try direct ZAI SDK, then canvas fallback
    return await handleLocalAIGeneration(body, isVercel)
  } catch (error) {
    console.error('[try-on] API error (falling back to canvas mode):', error)
    
    // PERMANENT FIX: ANY error falls back to canvas mode.
    // The user should NEVER see "AI unavailable" or any other error.
    // Only truly invalid requests (missing body) get error responses.
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // For ALL other errors — return canvas mode so the client can
    // generate a style preview overlay. This ensures the user ALWAYS
    // gets a visual result, never a broken error message.
    let errorProductImageBase64: string | null = null
    try {
      const imgUrl = body?.productImageUrl
      if (imgUrl) {
        errorProductImageBase64 = await getProductImageBase64(imgUrl)
      }
    } catch {}

    // Also try client-provided base64
    const clientBase64 = body?.productImageBase64 as string | undefined

    return returnCanvasMode(
      body?.productImageUrl || null,
      clientBase64 || errorProductImageBase64,
      body?.productName || body?.productName || null,
      body?.categorySlug || null,
    )
  }
}

// ── Local AI Generation Handler ────────────────────────────────────

async function handleLocalAIGeneration(body: any, isVercel: boolean) {
  // ── Strategy 0: Try local ai-proxy service on port 3030 ──
  // The ai-proxy is a dedicated service with the ZAI SDK that may have
  // better connectivity than the Next.js app. Try it first.
  if (!isVercel) {
    try {
      const proxyCheck = await fetch('http://localhost:3030/api/try-on/status', {
        signal: AbortSignal.timeout(3000),
      })
      if (proxyCheck.ok) {
        const proxyStatus = await proxyCheck.json()
        if (proxyStatus.available) {
          console.log('[try-on] Local ai-proxy (port 3030) is available, routing through it')
          const proxyRes = await fetch('http://localhost:3030/api/try-on', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          })
          if (proxyRes.ok) {
            const proxyResult = await proxyRes.json()
            console.log('[try-on] ai-proxy accepted job:', proxyResult.jobId)
            return NextResponse.json(proxyResult)
          }
          console.warn('[try-on] ai-proxy POST returned', proxyRes.status)
        }
      }
    } catch (proxyErr) {
      console.log('[try-on] Local ai-proxy not reachable:', proxyErr instanceof Error ? proxyErr.message : String(proxyErr))
    }
  }

  // ── Strategy 1: Direct ZAI SDK ──
  const aiCheck = await isZAIAvailable()

  if (!aiCheck.available) {
    console.log('[try-on] AI unavailable:', aiCheck.reason)
    const fallbackProductImage = body.productImageUrl
      ? await getProductImageBase64(body.productImageUrl).catch(() => null)
      : null
    // Also try client-provided base64
    const clientBase64 = body.productImageBase64 as string | undefined
    return returnCanvasMode(
      body.productImageUrl || null,
      clientBase64 || fallbackProductImage,
      body.productName || null,
      body.categorySlug || null,
    )
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

  // Use dynamic import for db to avoid top-level crash on Vercel
  if (!isVercel) {
    try {
      const { db } = await import('@/lib/db')
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
    // Try static products (Corporate Gifts, Office, New Arrivals)
    try {
      const { getStaticProductById } = await import('@/lib/static-products')
      const staticProduct = getStaticProductById(productId)
      if (staticProduct) {
        product = {
          id: staticProduct.id,
          name: staticProduct.name,
          images: JSON.stringify(staticProduct.images),
          category: { name: staticProduct.category, slug: staticProduct.categorySlug },
        }
      }
    } catch {}
  }

  if (!product) {
    // PERMANENT FIX: Instead of returning 404, fall back to canvas mode
    // The user should still get a visual preview even if the product isn't found in DB
    console.log('[try-on] Product not found in any source, falling back to canvas mode')
    const clientBase64 = body.productImageBase64 as string | undefined
    let fallbackBase64: string | null = null
    try {
      if (productImageUrl) {
        fallbackBase64 = await getProductImageBase64(productImageUrl)
      }
    } catch {}
    return returnCanvasMode(
      productImageUrl || null,
      clientBase64 || fallbackBase64,
      clientProductName || null,
      clientCategorySlug || null,
      'Product details not found. Showing style overlay with product image instead.',
    )
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
    // PERMANENT FIX: Instead of returning 400, fall back to canvas mode
    // The client-side canvas can still work with just the product image URL
    console.log('[try-on] Could not resolve product image base64, falling back to canvas mode')
    return returnCanvasMode(
      productImageUrl || productImageToUse || null,
      null,
      product.name,
      product.category?.slug || null,
      'Product image could not be processed. Showing style overlay instead.',
    )
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
      const { db } = await import('@/lib/db')
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

  // Create job using the pipeline module
  createJob(jobId, {
    categorySlug: product.category.slug,
    productName: product.name,
  })

  // Start the pipeline in the background
  runPipeline({
    jobId,
    productName: product.name,
    categorySlug: product.category.slug,
    selfieData,
    productImageBase64,
    suggestionsPromise,
  }).catch((err) => console.error('[try-on] Pipeline failed:', err))

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

  const job = getJob(jobId)

  if (!job) {
    // Job not found locally — might be on the local ai-proxy or the remote proxy

    // Try local ai-proxy first (same sandbox)
    if (!process.env.VERCEL) {
      try {
        const localProxyRes = await fetch(`http://localhost:3030/api/try-on?jobId=${jobId}`, {
          signal: AbortSignal.timeout(5000),
        })
        if (localProxyRes.ok) {
          const localResult = await localProxyRes.json()
          if (localResult.status && localResult.status !== 'failed') {
            return NextResponse.json(localResult, { status: 200 })
          }
        }
      } catch {}
    }

    // Try remote proxy (for Vercel → sandbox routing)
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

  return NextResponse.json({
    jobId,
    status: job.status,
    imageUrl: job.imageUrl,
    productName: job.productName,
    categorySlug: job.categorySlug,
    error: job.error,
    strategy: job.strategy,
    colorAccuracy: job.colorAccuracy,
    faceAccuracy: job.faceAccuracy,
    pipelinePhase: job.pipelinePhase,
    totalPasses: job.totalPasses,
    suggestions: job.suggestions,
    progress: job.progress,
  })
}
