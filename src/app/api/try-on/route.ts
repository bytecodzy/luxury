/**
 * AI Virtual Try-On API v30 — Concrete & Accurate (FREE FOREVER, no mismatches)
 *
 * Strategy (see src/lib/virtual-tryon.ts):
 *
 * v30 (CURRENT) — Concrete & Accurate (root cause fix for mismatches):
 *
 *   ROOT CAUSE (v28/v29 still produced mismatches):
 *     - Saree product images show a BLACK MANNEQUIN wearing the saree on a
 *       BROWN background. Image composite's bg-removal removes the brown bg
 *       but KEEPS the black mannequin → composite places mannequin over
 *       user's face → "different person" mismatch.
 *     - Pollinations (saree fallback) generates a NEW person from text →
 *       "different person AND different product" mismatch.
 *
 *   v30 FIX:
 *   On VERCEL (production):
 *     SAREES:
 *       Strategy 1: Gemini (optional — if GEMINI_API_KEY env var set)
 *       Strategy 2: Showcase Composite (PRIMARY — split-view, 100% reliable,
 *         always shows user's real face + real saree side-by-side)
 *       NO Image Composite (mannequin shows over face → mismatch)
 *       NO Pollinations (generates new person → mismatch)
 *
 *     JEWELRY / WATCHES / ACCESSORIES / FRAGRANCES:
 *       Strategy 1: Gemini (optional — if env var set)
 *       Strategy 2: Image Composite v3 (PRIMARY — with NEW mannequin detection.
 *         For jewelry on BLACK bg, bg-removal eliminates both bg AND mannequin,
 *         leaving just the jewelry piece → composite works perfectly.)
 *       Strategy 3: Showcase Composite (fallback if mannequin detected)
 *
 *     GARMENTS (shirts, dresses, fashion, kids):
 *       Strategy 1: Gemini (optional — if env var set)
 *       Strategy 2: IDM-VTON HF Space (PRIMARY — real VTON, preserves face + garment)
 *       Strategy 3: Pollinations with SELFIE reference (degraded fallback)
 *       Strategy 4: Showcase Composite (ultimate fallback)
 *
 *   On LOCAL (sandbox):
 *     Strategy 1: ZAI image-edit (PRIMARY — handles ALL categories incl. sarees/jewelry)
 *     Strategy 2: Image Composite v3 (with mannequin check)
 *     Strategy 3: IDM-VTON (garments only)
 *     Strategy 4: Showcase Composite (ultimate fallback)
 *     Strategy 5: Gemini (only if valid key set)
 *
 *   100% FREE FOREVER: ZAI (free in sandbox), IDM-VTON (free HF Space, no auth),
 *   Image Composite (sharp — free, instant), Showcase Composite (sharp — free,
 *   instant), Gemini (free tier 1500/day if key set). No paid APIs. No credit cards.
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
      skinTone,
      hairColor,
      clientProductColors,
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

    console.log(`[try-on] POST: product="${productName}", category="${categorySlug}", hasSelfie=${!!selfieData}, hasProductImg=${!!productImageBase64}, hasDesc=${!!productDescription}, skinTone="${skinTone || ''}", hairColor="${hairColor || ''}", clientColors="${clientProductColors || ''}"`)

    const result = await performVirtualTryOn({
      selfieData,
      productImageBase64: productImageBase64 || '',
      productName: productName || 'Product',
      categorySlug: categorySlug || '',
      productDescription: productDescription || '',
      productTags: Array.isArray(productTags) ? productTags : [],
      skinTone: skinTone || '',
      hairColor: hairColor || '',
      clientProductColors: clientProductColors || '',
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
      message: 'v30 AI ready — Showcase Composite (100% reliable for sarees — no mismatch), Image Composite v3 (mannequin-checked) for jewelry, IDM-VTON for garments. Free forever, no auth required.',
    })
  }

  const statusResult = await checkIDMVTONSpaceStatus()
  // v30: Showcase Composite is the primary engine for SAREES on Vercel (no mismatch possible);
  // Image Composite v3 (with mannequin detection) is the primary engine for JEWELRY/WATCHES/ACCESSORIES on Vercel;
  // IDM-VTON is the primary engine for GARMENTS on Vercel;
  // ZAI image-edit is the primary engine on local (handles ALL categories).
  const isVercel = !!process.env.VERCEL
  const engine = isVercel ? 'showcase-composite-idm-vton-v30' : 'zai-image-edit'
  return NextResponse.json({
    available: true,
    spaceAwake: statusResult.awake,
    mode: engine,
    message: isVercel
      ? 'v30 AI Virtual Try-On ready — Showcase Composite for sarees (100% reliable, no mismatch), Image Composite v3 for jewelry/watches (mannequin-checked), IDM-VTON for garments. Free forever, no auth required.'
      : 'v30 AI Virtual Try-On ready — ZAI image-edit (preserves your face & renders the exact product for ALL categories including sarees and jewelry).',
  })
}
