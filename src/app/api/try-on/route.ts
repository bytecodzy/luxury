import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI, isZAIAvailable } from '@/lib/zai'
import { addWatermark } from '@/lib/watermark'
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
  faceScore?: number
  productScore?: number
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
  // Local path — try filesystem first, then HTTP on Vercel
  const localResult = getProductImageBase64Local(imagePath)
  if (localResult) return localResult

  // On Vercel, local files aren't on the filesystem but are served by the CDN
  if (process.env.VERCEL || process.env.VERCEL_URL) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      if (!baseUrl) return null
      console.log('[try-on] Fetching local image via CDN:', `${baseUrl}${imagePath}`)
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
      console.error('[try-on] Failed to fetch local image via CDN:', err)
      return null
    }
  }

  return null
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

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // On Vercel, always try proxy first (AI service is only accessible from sandbox)
    const isVercel = !!process.env.VERCEL
    const proxyUrl = process.env.ZAI_PROXY_URL

    if (isVercel && proxyUrl) {
      console.log('[try-on] Vercel detected, proxying to AI service:', proxyUrl)
      try {
        const body = await request.json()
        const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

        // Validate required fields before proxying
        if (!productId || !selfieData) {
          return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
        }

        // Try to resolve product image to base64 on Vercel
        // This works for external URLs (CDN) but NOT for local paths (Vercel can't fetch from itself)
        let productImageBase64: string | null = null
        if (productImageUrl) {
          productImageBase64 = await getProductImageBase64(productImageUrl)
        }
        if (!productImageBase64) {
          // Try to get from database if available (non-Vercel)
          if (!isVercel) {
            try {
              const dbProduct = await db.product.findUnique({
                where: { id: productId },
                include: { category: true },
              })
              if (dbProduct) {
                const images: string[] = JSON.parse(dbProduct.images || '[]')
                if (images.length > 0) {
                  productImageBase64 = await getProductImageBase64(images[0])
                }
              }
            } catch (dbErr) {
              console.log('[try-on] DB lookup for product image failed during proxy:', dbErr)
            }
          }
        }

        const proxyHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        // Add Abc header only for .space-z.ai domains
        try {
          const proxyHost = new URL(proxyUrl).hostname
          if (proxyHost.includes('.space-z.ai')) {
            proxyHeaders['Abc'] = proxyHost.split('.')[0]
          }
        } catch {}

        // Build the proxy request body
        // If we have base64, pass it directly. Otherwise, pass the URL and let the proxy resolve it
        // (the sandbox proxy has access to the filesystem and can resolve local paths)
        const proxyBody: Record<string, unknown> = {
          ...body,
          productName: clientProductName || body.productName,
          categorySlug: clientCategorySlug || body.categorySlug,
        }

        if (productImageBase64) {
          proxyBody.productImageBase64 = productImageBase64
          proxyBody.productImageUrl = undefined // Don't send URL if we have base64
          console.log('[try-on] Proxying with productImageBase64 (length:', productImageBase64.length, ')')
        } else {
          // Can't resolve on Vercel — pass the URL to the proxy
          // The sandbox proxy has its own getProductImageBase64 that can handle local paths
          console.log('[try-on] Could not resolve image on Vercel, passing URL to proxy:', productImageUrl)
        }
        
        const proxyResponse = await fetch(`${proxyUrl}/api/try-on`, {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify(proxyBody),
          signal: AbortSignal.timeout(30000), // 30s timeout for initial response
        })
        const proxyResult = await proxyResponse.json()
        return NextResponse.json(proxyResult, { status: proxyResponse.status })
      } catch (proxyError) {
        console.error('[try-on] Proxy failed:', proxyError)
        // If proxy fails and AI is also unavailable, return canvas mode fallback
        return NextResponse.json({
          mode: 'canvas',
          message: 'AI style preview mode — creating style overlay',
          code: 'AI_CANVAS_MODE',
        }, { status: 200 })
      }
    }

    // Check if AI service is available locally (for non-Vercel deployments)
    const aiCheck = await isZAIAvailable()

    if (!aiCheck.available) {
      // Return canvas mode instead of error — client will use canvas fallback
      return NextResponse.json({
        mode: 'canvas',
        message: 'AI style preview mode — creating style overlay',
        code: 'AI_CANVAS_MODE',
      }, { status: 200 })
    }

    const body = await request.json()
    const { productId, selfieData, productImageUrl, productName: clientProductName, categorySlug: clientCategorySlug } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Try to fetch product from database first (skip on Vercel), then client-provided data, then Shopify fallback
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

    // Client-provided data (most reliable on Vercel where DB may be unavailable)
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
      return NextResponse.json({ 
        error: 'Product image not available',
        debug: { isVercel, proxyUrl: proxyUrl ? 'set' : 'not set', path: 'local-ai' },
      }, { status: 400 })
    }

    // Fetch AI suggestions in parallel with job creation
    const pairingCategories = getPairingCategory(product.category?.slug || '')
    let suggestionsPromise: Promise<any[]>

    if (isVercel) {
      // On Vercel, use Shopify directly for suggestions
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
        const proxyHeaders: Record<string, string> = {}
        try {
          const proxyHost = new URL(proxyUrl).hostname
          if (proxyHost.includes('.space-z.ai')) {
            proxyHeaders['Abc'] = proxyHost.split('.')[0]
          }
        } catch {}
        
        const proxyResponse = await fetch(`${proxyUrl}/api/try-on?jobId=${encodeURIComponent(jobId)}`, {
          headers: proxyHeaders,
          signal: AbortSignal.timeout(15000), // 15s timeout for job status polling
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
    attempt: job.attempt,
    strategy: job.strategy,
    faceScore: job.faceScore,
    productScore: job.productScore,
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

// ── Generation strategies ──────────────────────────────────────────

async function strategyEditBoth(
  zai: any, selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Professional fashion photograph. The FIRST image is the person, the SECOND image is the ${productName}. Combine them: show this person ${placement}. Keep the exact same face, hair, skin tone from the first image. Apply the exact product from the second image. ${personDesc ? `Person: ${personDesc}.` : ''} ${productDesc ? `Product: ${productDesc}.` : ''} Studio lighting, photorealistic, 8K quality.`

    console.log(`[try-on] Strategy: edit-both, prompt: ${prompt.substring(0, 150)}...`)

    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: selfieData }, { url: productImageBase64 }],
      size,
    } as any)

    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-both failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function strategyEditSelfie(
  zai: any, selfieData: string, _productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Edit this photo: show this exact same person now ${placement}. The product is: ${productDesc}. CRITICAL: Keep the EXACT same face, skin tone, hair color, eye color, and body type. Do NOT change the person's identity. Only add/modify the clothing/jewelry/accessory. ${personDesc ? `Person: ${personDesc}.` : ''} Studio lighting, photorealistic, 8K quality.`

    console.log(`[try-on] Strategy: edit-selfie, prompt: ${prompt.substring(0, 150)}...`)

    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: selfieData }],
      size,
    } as any)

    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-selfie failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function strategyEditProduct(
  zai: any, _selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Show this product being worn by a person. The person is ${placement}. Person: ${personDesc}. Product: ${productDesc}. Show the person wearing this exact product with accurate colors and details. Studio lighting, photorealistic, 8K quality.`

    console.log(`[try-on] Strategy: edit-product, prompt: ${prompt.substring(0, 150)}...`)

    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: productImageBase64 }],
      size,
    } as any)

    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy edit-product failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

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

    const prompt = `${bodyType} of a person ${placement}. Person: ${personDesc}. Product: ${productDesc}. The person is ${placement}. Photorealistic, studio lighting, 8K, high detail.`

    console.log(`[try-on] Strategy: create-detailed, prompt: ${prompt.substring(0, 150)}...`)

    const response = await zai.images.generations.create({ prompt, size })
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[try-on] Strategy create-detailed failed:', (err as Error).message?.substring(0, 200))
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

    // Step 2: VLM analysis (parallel)
    if (job) job.progress = 'AI is analyzing your face and product details...'
    console.log(`[try-on] Starting VLM analysis for job ${jobId}`)

    const zai = await createZAI()
    const [personDesc, productDesc] = await Promise.all([
      vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
      vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
    ])
    console.log(`[try-on] Person: ${personDesc.substring(0, 150)}...`)
    console.log(`[try-on] Product: ${productDesc.substring(0, 150)}...`)

    // Step 3: Try generation strategies (with delays to avoid rate limiting)
    const results: GenResult[] = []
    const STRATEGY_DELAY = 2000 // 2 second delay between strategies

    // Strategy A: Edit with BOTH images (best quality if it works)
    if (job) { job.attempt = 1; job.progress = 'Generating your try-on look (Strategy 1/4)...' }
    const aResult = await strategyEditBoth(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (aResult) {
      console.log(`[try-on] Strategy A (edit-both) succeeded`)
      results.push({ imageUrl: aResult, strategy: 'edit-both', faceScore: 7, productScore: 7 })
    }

    // If first strategy worked, skip to result (avoid rate limiting)
    if (results.length === 0) {
      await new Promise(r => setTimeout(r, STRATEGY_DELAY))

      // Strategy B: Edit with selfie only
      if (job) { job.attempt = 2; job.progress = 'Preserving your face details (Strategy 2/4)...' }
      const bResult = await strategyEditSelfie(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
      if (bResult) {
        console.log(`[try-on] Strategy B (edit-selfie) succeeded`)
        results.push({ imageUrl: bResult, strategy: 'edit-selfie', faceScore: 8, productScore: 6 })
      }
    }

    // If still no results, try product edit
    if (results.length === 0) {
      await new Promise(r => setTimeout(r, STRATEGY_DELAY))

      // Strategy C: Edit with product only
      if (job) { job.attempt = 3; job.progress = 'Optimizing product accuracy (Strategy 3/4)...' }
      const cResult = await strategyEditProduct(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
      if (cResult) {
        console.log(`[try-on] Strategy C (edit-product) succeeded`)
        results.push({ imageUrl: cResult, strategy: 'edit-product', faceScore: 6, productScore: 8 })
      }
    }

    // If still no results, try text-to-image as last resort
    if (results.length === 0) {
      await new Promise(r => setTimeout(r, STRATEGY_DELAY))

      // Strategy D: Create from detailed description
      if (job) { job.attempt = 4; job.progress = 'Generating from descriptions (Strategy 4/4)...' }
      const dResult = await strategyCreateDetailed(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
      if (dResult) {
        console.log(`[try-on] Strategy D (create-detailed) succeeded`)
        results.push({ imageUrl: dResult, strategy: 'create-detailed', faceScore: 5, productScore: 5 })
      }
    }

    if (results.length === 0) throw new Error('All strategies failed')

    // Step 4: Pick best result
    const best = results.reduce((a, b) => {
      const sa = a.faceScore * 0.6 + a.productScore * 0.4
      const sb = b.faceScore * 0.6 + b.productScore * 0.4
      return sb > sa ? b : a
    })

    console.log(`[try-on] Best: ${best.strategy}, Face=${best.faceScore}/10, Product=${best.productScore}/10`)

    // Step 5: Apply 3BOXES GIFTS watermark
    if (job) { job.progress = 'Adding finishing touches...' }
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
