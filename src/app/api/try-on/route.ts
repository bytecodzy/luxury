import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createZAI, isZAIAvailable } from '@/lib/zai'
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
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        console.error('[try-on] Failed to fetch external image:', response.status)
        return null
      }
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
  // Handle image-proxy URLs
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
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
2. Eyes: shape (almond/round/hooded), color, eyelashes
3. Eyebrows: thickness, shape, color
4. Nose: shape, size relative to face
5. Lips: fullness, color, shape
6. Hair: color, texture (straight/wavy/curly), length, style
7. Chin and jawline shape
8. Any distinctive features (moles, dimples, freckles)
9. Body type and build
10. Current expression and pose
Be extremely specific about skin tone, eye color, hair, and face shape. 4-5 sentences.`

const VLM_PRODUCT_PROMPT = `Describe this fashion/luxury product in EXACT detail for a virtual try-on. Describe:
1. Type and name (saree, necklace, shirt, watch, etc.)
2. EXACT primary color (not just "red" - say "deep maroon red" or "rose pink")
3. Secondary colors and accents
4. Pattern: floral/geometric/solid/striped/paisley/embroidered - describe the pattern precisely
5. Material and texture: silk sheen/matte cotton/shiny gold/satin/mesh - be specific
6. Key design details: borders, embellishments, gemstones, stitching, collar style
7. How it would be worn on the body (draped, fitted, layered, etc.)
8. Size/coverage: how much of the body does it cover
Be extremely specific about color, material, and pattern. 4-5 sentences.`

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
    // Check if AI service is available locally (file config or env vars)
    const aiCheck = isZAIAvailable()

    if (!aiCheck.available) {
      // AI service not available locally — try proxying to the sandbox
      const proxyUrl = process.env.ZAI_PROXY_URL
      if (proxyUrl) {
        console.log('[try-on] AI not available locally, proxying to sandbox:', proxyUrl)
        try {
          const body = await request.json()
          const proxyResponse = await fetch(`${proxyUrl}/api/try-on`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000),
          })
          const proxyResult = await proxyResponse.json()
          return NextResponse.json(proxyResult, { status: proxyResponse.status })
        } catch (proxyError) {
          console.error('[try-on] Proxy failed:', proxyError)
          return NextResponse.json({
            error: 'Virtual try-on is temporarily unavailable. Could not connect to the AI style service. Please try again in a moment.',
            code: 'AI_SERVICE_UNAVAILABLE',
          }, { status: 503 })
        }
      }

      // No proxy configured either — show unavailable message
      return NextResponse.json({
        error: 'Virtual try-on is currently unavailable. This feature requires our AI style service which is not configured on this deployment. Please contact support or try again later.',
        code: 'AI_SERVICE_UNAVAILABLE',
      }, { status: 503 })
    }

    const body = await request.json()
    const { productId, selfieData, productImageUrl } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Try to fetch product from database first, then Shopify fallback
    let product = null
    try {
      product = await db.product.findUnique({
        where: { id: productId },
        include: { category: true },
      })
    } catch (dbError) {
      console.log('[try-on] Database unavailable, trying Shopify fallback...')
    }

    // If not in DB, try Shopify fallback
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
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
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
      // Fallback: use Shopify products for suggestions
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
    // Check if it's a config/service error
    if (message.includes('AI_STYLE_SERVICE_UNAVAILABLE') || message.includes('.z-ai-config') || message.includes('not configured')) {
      return NextResponse.json({
        error: 'Virtual try-on is currently unavailable. This feature requires our AI style service which is not configured on this deployment. Please contact support or try again later.',
        code: 'AI_SERVICE_UNAVAILABLE',
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred while generating your style preview. Please try again.', status: 500 })
  }
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const job = jobs.get(jobId)

  // If job not found locally, try proxying to sandbox (for Vercel deployments)
  if (!job) {
    const proxyUrl = process.env.ZAI_PROXY_URL
    if (proxyUrl) {
      try {
        const proxyResponse = await fetch(`${proxyUrl}/api/try-on?jobId=${jobId}`, {
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
    attempt: job.attempt,
    strategy: job.strategy,
    faceScore: job.faceScore,
    productScore: job.productScore,
    suggestions: job.suggestions,
    progress: job.progress,
  })
}

// ── Helpers ────────────────────────────────────────────────────────

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 45000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
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
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Compare the FACE in these two images. The FIRST is the original selfie, the SECOND is the AI-generated result. Rate how similar the FACE is from 1 to 10: 1=completely different person, 5=similar ethnicity/gender but different person, 7=same person with changes, 9=same person minor lighting differences, 10=identical. Reply ONLY with: SCORE|BRIEF_REASON` },
          { type: 'image_url', image_url: { url: selfieData } },
          { type: 'image_url', image_url: { url: resultImageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      zai.chat.completions.createVision({
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Compare the PRODUCT in these two images. The FIRST is the original "${productName}" photo, the SECOND is the AI-generated result. Rate how similar the PRODUCT is from 1 to 10: 1=completely different product, 5=similar type/color, 7=same product minor differences, 9=same product nearly exact, 10=identical. Reply ONLY with: SCORE|BRIEF_REASON` },
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

// ── Generation strategies ──────────────────────────────────────────

async function strategyEditSelfie(
  zai: any, selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Professional fashion photograph of the person in this image, now ${placement}. The product is: ${productDesc}. Keep the exact same face, skin tone, hair, eye color, and body type. ${personDesc ? `The person has ${personDesc}.` : ''} Studio lighting, photorealistic, 8K quality.`

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

async function strategyCreateDetailed(
  zai: any, productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion'
      ? 'Full-body professional fashion photograph'
      : categorySlug === 'jewelry' || categorySlug === 'watches'
      ? 'Close-up professional beauty photograph from chest up'
      : 'Professional fashion photograph'

    const prompt = `${bodyType} of a person ${placement}. Person: ${personDesc}. Product: ${productDesc}. The person is ${placement}. Photorealistic, studio lighting, 8K, high detail, professional fashion photography.`

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

async function strategyEditBoth(
  zai: any, selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Professional fashion photograph. The FIRST image is the person, the SECOND image is the ${productName}. Combine them: show this person ${placement}. Keep the exact same face, hair, skin tone from the first image. Apply the exact product from the second image. Studio lighting, photorealistic, 8K quality.`

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

async function strategyEditProduct(
  zai: any, selfieData: string, productImageBase64: string,
  productName: string, categorySlug: string, personDesc: string, productDesc: string,
): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)

    const prompt = `Professional fashion photograph of a person ${placement}. The person has: ${personDesc}. Keep the exact product shown in the image on this person. Studio lighting, photorealistic, 8K quality.`

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

// ── Main pipeline with suggestions ─────────────────────────────────

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
    // Step 1: Fetch suggestions early and store them
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

    // Step 3: Try generation strategies
    const results: GenResult[] = []

    // Strategy A: Edit with BOTH images (selfie + product) — best chance for combined accuracy
    if (job) { job.attempt = 1; job.progress = 'Generating your try-on look (Strategy 1/4)...' }
    const aResult = await strategyEditBoth(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (aResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, aResult, productName)
      console.log(`[try-on] Strategy A (edit-both): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: aResult, strategy: 'edit-both', faceScore: v.faceScore, productScore: v.productScore })
      // Early exit if excellent
      if (v.faceScore >= 8 && v.productScore >= 7) {
        console.log(`[try-on] Excellent result from Strategy A, skipping others`)
        if (job) {
          job.status = 'completed'
          job.imageUrl = aResult
          job.productName = productName
          job.strategy = 'edit-both'
          job.faceScore = v.faceScore
          job.productScore = v.productScore
          job.progress = 'Complete!'
        }
        return
      }
    }

    // Strategy B: Edit with selfie only — best for face preservation
    if (job) { job.attempt = 2; job.progress = 'Preserving your face details (Strategy 2/4)...' }
    const bResult = await strategyEditSelfie(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (bResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, bResult, productName)
      console.log(`[try-on] Strategy B (edit-selfie): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: bResult, strategy: 'edit-selfie', faceScore: v.faceScore, productScore: v.productScore })
    }

    // Strategy C: Edit with product only — best for product accuracy
    if (job) { job.attempt = 3; job.progress = 'Optimizing product accuracy (Strategy 3/4)...' }
    const cResult = await strategyEditProduct(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (cResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, cResult, productName)
      console.log(`[try-on] Strategy C (edit-product): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: cResult, strategy: 'edit-product', faceScore: v.faceScore, productScore: v.productScore })
    }

    // Strategy D: Create from detailed description — fallback
    if (job) { job.attempt = 4; job.progress = 'Generating from detailed descriptions (Strategy 4/4)...' }
    const dResult = await strategyCreateDetailed(zai, productName, categorySlug, personDesc, productDesc)
    if (dResult) {
      const v = await vlmVerify(zai, selfieData, productImageBase64, dResult, productName)
      console.log(`[try-on] Strategy D (create-detailed): Face=${v.faceScore}, Product=${v.productScore}`)
      results.push({ imageUrl: dResult, strategy: 'create-detailed', faceScore: v.faceScore, productScore: v.productScore })
    }

    if (results.length === 0) throw new Error('All strategies failed')

    // Step 4: Pick best result (60% face weight, 40% product weight)
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
      job.progress = 'Complete!'
    }
  } catch (error) {
    console.error(`[try-on] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      const msg = error instanceof Error ? error.message : 'Generation failed'
      // Provide user-friendly error for common issues
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached. Please try again in a moment.'
      } else if (msg.includes('.z-ai-config')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service is being configured. Please try again later.'
      } else {
        job.error = msg
      }
    }
  }
}
