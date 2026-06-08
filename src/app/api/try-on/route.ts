import { NextRequest, NextResponse } from 'next/server'
import { hfTryOn, type HFTryOnInput } from '@/lib/huggingface-tryon'

// Maximum duration for Vercel serverless function (Pro plan = 60s)
export const maxDuration = 60

// ── Hard timeout constants ──────────────────────────────────────────
const TOTAL_HARD_TIMEOUT_MS = 55_000 // 55 seconds — hard server timeout (leaves 5s buffer for Vercel)
const HF_TRYON_TIMEOUT_MS = 35_000  // 35 seconds for HuggingFace try-on (includes all 3 strategies)
const ZAI_EDIT_TIMEOUT_MS = 25_000  // 25 seconds for ZAI image edit

// ── Product image helpers ──────────────────────────────────────────

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
    } catch {
      return null
    }
  }
  // Local path — fetch via HTTP
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
  } catch {
    // Try filesystem as fallback (local dev only)
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
      } catch {
        return null
      }
    }
    return null
  }
}

// ── Strategy 1: HuggingFace IDM-VTON (all 3 sub-strategies) ──────────
// Uses hfTryOn() from huggingface-tryon.ts which tries:
//   1. Manual Gradio REST API (most reliable)
//   2. @gradio/client (handles Space wake-up)
//   3. HuggingFace Inference API (always available, lower quality)

async function tryHuggingFace(
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  hardTimeoutMs: number,
): Promise<{ imageUrl: string; strategy: string } | null> {
  try {
    console.log(`[try-on] HuggingFace: Starting with ${hardTimeoutMs}ms timeout`)

    const input: HFTryOnInput = {
      selfieData,
      productImageBase64,
      productName,
      categorySlug,
    }

    // Race hfTryOn against the hard timeout
    const result = await Promise.race([
      hfTryOn(input, (msg) => console.log(`[try-on] HuggingFace: ${msg}`)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), hardTimeoutMs)),
    ])

    if (result?.success && result.imageUrl) {
      console.log(`[try-on] HuggingFace success! Strategy: ${result.strategy}`)
      return { imageUrl: result.imageUrl, strategy: result.strategy }
    }

    console.log(`[try-on] HuggingFace failed: ${result?.error || 'timed out'}`)
    return null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[try-on] HuggingFace error:', errMsg.substring(0, 300))
    return null
  }
}

// ── Strategy 2: ZAI Dual-Image Edit ────────────────────────────────

async function tryZAIImageEdit(
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  hardTimeoutMs: number,
): Promise<{ imageUrl: string; strategy: string } | null> {
  try {
    const { createZAI } = await import('@/lib/zai')
    const zai = await createZAI()

    // Build a prompt for the image edit
    const cat = (categorySlug || '').toLowerCase()
    let bodyType = 'Professional fashion photograph, upper body'
    let placement = 'wearing the product'

    if (cat.includes('saree') || cat.includes('lehenga')) {
      bodyType = 'Full-body professional fashion photograph of an Indian woman, standing pose, well-lit studio'
      placement = 'wearing the saree draped elegantly in traditional Indian style with pallu gracefully draped over the left shoulder, pleats at the waist, the saree fabric flowing naturally. The person\'s face, skin tone, and hair MUST remain exactly the same as the original photo'
    } else if (cat.includes('fashion') || cat.includes('dress')) {
      bodyType = 'Full-body professional fashion photograph'
      placement = 'wearing the outfit'
    } else if (cat.includes('jewel') || cat.includes('women-jewel')) {
      bodyType = 'Close-up beauty photograph from chest up'
      const name = productName.toLowerCase()
      if (name.includes('earring') || name.includes('jhumka')) placement = 'wearing the earrings'
      else if (name.includes('necklace') || name.includes('pendant')) placement = 'wearing the necklace'
      else if (name.includes('bracelet') || name.includes('bangle')) placement = 'wearing the bracelet'
      else if (name.includes('ring')) placement = 'wearing the ring'
      else placement = 'wearing the jewelry'
    } else if (cat.includes('watch')) {
      bodyType = 'Close-up photograph from waist up'
      placement = 'wearing the watch on the wrist'
    } else if (cat.includes('shirt') || cat.includes('tshirt')) {
      bodyType = 'Full-body professional fashion photograph'
      placement = 'wearing the shirt'
    }

    const prompt = `${bodyType}. Show this EXACT person ${placement}. The product is "${productName}". Preserve the person's face exactly - same eyes, nose, lips, jawline. Do NOT change skin tone or hair. The product must look naturally worn with proper shadows and fit. Studio-quality photorealistic result.`

    console.log(`[try-on] ZAI: Attempting dual-image edit for "${productName}"`)

    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [
          { url: selfieData },
          { url: productImageBase64 },
        ],
        size: '1024x1536',
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), hardTimeoutMs)),
    ])

    if (response?.data?.[0]?.base64) {
      console.log(`[try-on] ZAI: Dual-image edit succeeded!`)
      return {
        imageUrl: `data:image/png;base64,${response.data[0].base64}`,
        strategy: 'zai-dual-edit',
      }
    }

    // If dual-image edit failed, try single-image edit with just the selfie
    console.log(`[try-on] ZAI: Dual-image edit returned no result, trying single-image edit`)

    const singleResponse = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [{ url: selfieData }],
        size: '1024x1536',
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), 15000)),
    ])

    if (singleResponse?.data?.[0]?.base64) {
      console.log(`[try-on] ZAI: Single-image edit succeeded!`)
      return {
        imageUrl: `data:image/png;base64,${singleResponse.data[0].base64}`,
        strategy: 'zai-selfie-edit',
      }
    }

    console.log(`[try-on] ZAI: Both edit strategies returned no result`)
    return null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[try-on] ZAI error:', errMsg.substring(0, 300))
    return null
  }
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const pipelineStart = Date.now()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { productId, selfieData, productImageUrl, productName, categorySlug } = body

  if (!productId || !selfieData) {
    return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
  }

  console.log(`[try-on] POST request for product: ${productName} (${productId})`)

  // Resolve product image base64
  const clientProvidedBase64 = body.productImageBase64 as string | undefined
  let resolvedBase64: string | null = null

  if (!clientProvidedBase64 && productImageUrl) {
    resolvedBase64 = await getProductImageBase64(productImageUrl)
  }

  const finalProductImageBase64 = clientProvidedBase64 || resolvedBase64

  if (!finalProductImageBase64) {
    console.log('[try-on] No product image available, returning canvas mode')
    return NextResponse.json({
      mode: 'canvas',
      code: 'AI_CANVAS_MODE',
      message: 'Product image not available for AI processing.',
      productImageBase64: null,
      productImageUrl: productImageUrl || null,
      productName: productName || null,
      categorySlug: categorySlug || null,
    })
  }

  // Check if we still have time left
  const elapsedSoFar = Date.now() - pipelineStart
  if (elapsedSoFar > TOTAL_HARD_TIMEOUT_MS - 10000) {
    console.log(`[try-on] Already used ${elapsedSoFar}ms, not enough time for AI. Returning canvas mode.`)
    return NextResponse.json({
      mode: 'canvas',
      code: 'AI_CANVAS_MODE',
      message: 'Image preparation took too long. A style overlay preview will be shown instead.',
      productImageBase64: finalProductImageBase64,
      productImageUrl: productImageUrl || null,
      productName: productName || null,
      categorySlug: categorySlug || null,
    })
  }

  // ── Category-aware strategy selection ────────────────────────────
  // IDM-VTON only works with FLAT garment images (shirts, tops, etc).
  // For sarees, lehengas, and full-body outfits, the product image is
  // typically a model wearing the garment — IDM-VTON cannot process these.
  // So for saree/full-body categories, we try ZAI FIRST (it uses LLM-based
  // image generation which understands "drape this saree").
  const cat = (categorySlug || '').toLowerCase()
  const isFullBodyCategory = cat.includes('saree') || cat.includes('lehenga') || cat.includes('women-fashion') || cat.includes('dress') || cat.includes('gown') || cat.includes('salwar') || cat.includes('kurta')

  if (isFullBodyCategory) {
    // ── For sarees/full-body: ZAI first, HuggingFace second ────────
    console.log(`[try-on] Full-body category detected (${categorySlug}): trying ZAI first`)

    // Strategy 1 (for sarees): ZAI Image Edit
    const zaiTimeout = Math.min(ZAI_EDIT_TIMEOUT_MS + 10000, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 5000)
    if (zaiTimeout > 5000) {
      console.log(`[try-on] Strategy 1 (saree): ZAI Image Edit (timeout: ${zaiTimeout}ms)`)

      const zaiResult = await tryZAIImageEdit(
        selfieData,
        finalProductImageBase64,
        productName || 'Product',
        categorySlug || '',
        zaiTimeout,
      )

      if (zaiResult) {
        console.log(`[try-on] ZAI success! Strategy: ${zaiResult.strategy} (${Date.now() - pipelineStart}ms)`)
        return NextResponse.json({
          success: true,
          imageUrl: zaiResult.imageUrl,
          strategy: zaiResult.strategy,
          productName,
          categorySlug,
        })
      }

      console.log(`[try-on] ZAI failed (${Date.now() - pipelineStart}ms elapsed)`)
    }

    // Strategy 2 (for sarees): HuggingFace IDM-VTON
    const hfTimeout = Math.min(HF_TRYON_TIMEOUT_MS, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 3000)
    if (hfTimeout > 10000) {
      console.log(`[try-on] Strategy 2 (saree): HuggingFace (timeout: ${hfTimeout}ms)`)

      const hfResult = await tryHuggingFace(
        selfieData,
        finalProductImageBase64,
        productName || 'Product',
        categorySlug || '',
        hfTimeout,
      )

      if (hfResult) {
        console.log(`[try-on] HuggingFace success! Strategy: ${hfResult.strategy} (${Date.now() - pipelineStart}ms)`)
        return NextResponse.json({
          success: true,
          imageUrl: hfResult.imageUrl,
          strategy: hfResult.strategy,
          productName,
          categorySlug,
        })
      }

      console.log(`[try-on] HuggingFace failed (${Date.now() - pipelineStart}ms elapsed)`)
    }
  } else {
    // ── For shirts/jewelry/etc: HuggingFace first, ZAI second ───────

    // Strategy 1: HuggingFace IDM-VTON (all 3 sub-strategies)
    const hfTimeout = Math.min(HF_TRYON_TIMEOUT_MS, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 5000)
    if (hfTimeout > 10000) {
      console.log(`[try-on] Strategy 1: HuggingFace (timeout: ${hfTimeout}ms)`)

      const hfResult = await tryHuggingFace(
        selfieData,
        finalProductImageBase64,
        productName || 'Product',
        categorySlug || '',
        hfTimeout,
      )

      if (hfResult) {
        console.log(`[try-on] HuggingFace success! Strategy: ${hfResult.strategy} (${Date.now() - pipelineStart}ms)`)
        return NextResponse.json({
          success: true,
          imageUrl: hfResult.imageUrl,
          strategy: hfResult.strategy,
          productName,
          categorySlug,
        })
      }

      console.log(`[try-on] HuggingFace failed (${Date.now() - pipelineStart}ms elapsed)`)
    }

    // Strategy 2: ZAI Image Edit
    const zaiTimeout = Math.min(ZAI_EDIT_TIMEOUT_MS, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 3000)
    if (zaiTimeout > 5000) {
      console.log(`[try-on] Strategy 2: ZAI Image Edit (timeout: ${zaiTimeout}ms)`)

      const zaiResult = await tryZAIImageEdit(
        selfieData,
        finalProductImageBase64,
        productName || 'Product',
        categorySlug || '',
        zaiTimeout,
      )

      if (zaiResult) {
        console.log(`[try-on] ZAI success! Strategy: ${zaiResult.strategy} (${Date.now() - pipelineStart}ms)`)
        return NextResponse.json({
          success: true,
          imageUrl: zaiResult.imageUrl,
          strategy: zaiResult.strategy,
          productName,
          categorySlug,
        })
      }

      console.log(`[try-on] ZAI failed (${Date.now() - pipelineStart}ms elapsed)`)
    }
  }

  // ── All AI strategies failed — return canvas mode ────────────────
  const totalTime = Date.now() - pipelineStart
  console.log(`[try-on] All AI strategies failed after ${totalTime}ms, returning canvas mode`)

  return NextResponse.json({
    mode: 'canvas',
    code: 'AI_CANVAS_MODE',
    message: totalTime > TOTAL_HARD_TIMEOUT_MS - 5000
      ? 'AI virtual try-on timed out. Please try again — it usually works on the second attempt!'
      : 'AI virtual try-on is currently busy. A style overlay preview will be shown instead.',
    productImageBase64: finalProductImageBase64,
    productImageUrl: productImageUrl || null,
    productName: productName || null,
    categorySlug: categorySlug || null,
  })
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────
// Kept for backward compatibility — no longer uses job polling

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  return NextResponse.json({
    status: 'failed',
    error: 'Job polling is no longer supported. Please use the synchronous API.',
    jobId,
  })
}
