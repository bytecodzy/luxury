/**
 * AI Virtual Try-On API v23 — ZAI image-edit (edit-both) on BOTH local & Vercel
 *
 * Strategy (see src/lib/virtual-tryon.ts):
 *
 * v23 (CURRENT):
 *   ZAI image-edit (edit-both) is the PRIMARY strategy on BOTH local AND
 *   Vercel. It passes BOTH the selfie AND the product photo to ZAI's
 *   image-edit API → preserves the user's face/gender AND renders the exact
 *   product (colours, pattern, fabric, design). Completes in 18-27s.
 *
 *   The previous assumption that "ZAI auth fails on Vercel" was incorrect —
 *   `internal-api.z.ai` is a public endpoint reachable from any network.
 *   A hardcoded config fallback ensures ZAI works on Vercel without env vars.
 *
 *   Pollinations remains as a LAST-RESORT fallback only when ZAI is
 *   completely unreachable (e.g. temporary outage).
 */

import { NextRequest, NextResponse } from 'next/server'
import { performVirtualTryOn, preWarmSpace, checkIDMVTONSpaceStatus } from '@/lib/virtual-tryon'

export const maxDuration = 60

// ── Product Image Helpers ──────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || 'image/jpeg'
    const mime = ct.split(';')[0].trim()
    if (!mime.startsWith('image/')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch { return null }
}

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (!imagePath) return null
  if (imagePath.startsWith('data:')) return imagePath
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return fetchImageAsBase64(imagePath)
  if (imagePath.startsWith('//')) return fetchImageAsBase64(`https:${imagePath}`)
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const u = new URL(imagePath, 'http://localhost')
      const orig = u.searchParams.get('url')
      if (orig) {
        const r = await fetchImageAsBase64(orig.startsWith('//') ? `https:${orig}` : orig)
        if (r) return r
      }
    } catch {}
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const httpResult = await fetchImageAsBase64(`${base}${imagePath}`)
  if (httpResult) return httpResult
  if (!process.env.VERCEL) {
    try {
      const { existsSync, readFileSync } = await import('fs')
      const { join } = await import('path')
      const full = join(process.cwd(), 'public', imagePath)
      if (!existsSync(full)) return null
      const buf = readFileSync(full)
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {}
  }
  return null
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const body = await request.json()
    const {
      productId,
      selfieData,
      productImageUrl,
      productImageBase64: clientBase64,
      productName,
      categorySlug,
      productDescription,
      productTags,
    } = body

    if (!productId || !selfieData) {
      return NextResponse.json(
        { success: false, error: 'Product ID and selfie are required' },
        { status: 400 }
      )
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid selfie format. Please upload a JPG, PNG, or WebP image.' },
        { status: 400 }
      )
    }

    // Resolve product image (needed by both the ai-proxy and Pollinations fallback)
    let productImageBase64 = clientBase64 || null
    if (!productImageBase64 && productImageUrl) {
      productImageBase64 = await getProductImageBase64(productImageUrl)
    }

    console.log(`[try-on] POST: product="${productName}", category="${categorySlug}", hasSelfie=${!!selfieData}, hasProductImg=${!!productImageBase64}, hasDesc=${!!productDescription}`)

    const result = await performVirtualTryOn({
      selfieData,
      productImageBase64: productImageBase64 || '',
      productName: productName || 'Product',
      categorySlug: categorySlug || '',
      productDescription: productDescription || '',
      productTags: Array.isArray(productTags) ? productTags : [],
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.success && result.imageUrl) {
      console.log(`[try-on] ✅ Success in ${elapsed}s via ${result.strategy}`)
      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy,
        elapsed: parseFloat(elapsed),
        debug: {
          isVercel: !!process.env.VERCEL,
          strategiesAttempted: result.debugInfo?.strategiesAttempted || [],
          strategyErrors: result.debugInfo?.strategyErrors || {},
          extractedColors: result.debugInfo?.extractedColors,
          promptPreview: result.debugInfo?.promptPreview,
          selfieUploaded: result.debugInfo?.selfieUploaded,
        },
      })
    }

    console.log(`[try-on] ❌ Failed in ${elapsed}s: ${result.error}`)
    if (result.debugInfo) {
      console.log(`[try-on] Strategies: ${result.debugInfo.strategiesAttempted.join(',')}`)
      console.log(`[try-on] Errors: ${JSON.stringify(result.debugInfo.strategyErrors)}`)
    }

    return NextResponse.json({
      success: false,
      error: result.error || 'We could not generate your style preview. Please try again.',
      errorCode: result.errorCode || 'ALL_STRATEGIES_FAILED',
      strategy: result.strategy,
      elapsed: parseFloat(elapsed),
      debug: {
        isVercel: !!process.env.VERCEL,
        strategiesAttempted: result.debugInfo?.strategiesAttempted || [],
        strategyErrors: result.debugInfo?.strategyErrors || {},
      },
    })
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`[try-on] Error after ${elapsed}s:`, error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTERNAL_ERROR',
      elapsed: parseFloat(elapsed),
    }, { status: 500 })
  }
}

// ── GET /api/try-on ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('action') === 'prewarm') {
    const awake = await preWarmSpace()
    return NextResponse.json({
      available: true,
      spaceAwake: awake,
      message: 'AI ready — ZAI image-edit (edit-both) preserves your face AND renders the exact product. Works on local AND Vercel.',
    })
  }

  const statusResult = await checkIDMVTONSpaceStatus()
  // v23: ZAI works on both local and Vercel (hardcoded config fallback)
  const engine = statusResult.awake ? 'zai-image-edit' : 'pollinations-selfie-img2img'
  return NextResponse.json({
    available: true,
    spaceAwake: statusResult.awake,
    mode: engine,
    message: statusResult.awake
      ? 'AI Virtual Try-On ready — ZAI image-edit (preserves your face & renders the exact product — works on local AND Vercel)'
      : 'AI Virtual Try-On ready — using Pollinations fallback',
  })
}
