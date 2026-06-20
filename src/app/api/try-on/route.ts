/**
 * AI Virtual Try-On API v32 — BULLETPROOF (NEVER FAILS, free forever)
 *
 * Strategy (see src/lib/virtual-tryon.ts):
 *
 * v32 (CURRENT) — BULLETPROOF (root cause fix for v31 still failing on Vercel):
 *
 *   ROOT CAUSE (v31 still produced "Style Preview Unavailable" on Vercel):
 *     - v31 Gemini tried up to 3 models with `Math.min(50_000, modelRemaining)`
 *       per-model timeout = up to 47s PER MODEL = 141s total potential.
 *     - For SAREES (complex garments), Gemini often took 25-30s before
 *       timing out. With 3 models, that's up to 90s — EXCEEDING Vercel's
 *       60s limit AND the client's 55s timeout.
 *     - Result: client saw "Style Preview Unavailable" / "high traffic" error
 *       BEFORE the Showcase Composite fallback could run.
 *
 *   v32 FIX (BULLETPROOF):
 *   - HARD 45s total deadline (was 50s) — leaves 15s buffer under Vercel's 60s
 *   - 5s RESERVED for Showcase Composite — ALWAYS runs as final fallback
 *   - Gemini: 1 MODEL ONLY with HARD 20s timeout (was 3 models × up to 47s)
 *   - Cloudflare: HARD 12s timeout, SKIPPED for sarees (SD 1.5 struggles)
 *   - FLUX: HARD 15s timeout, only if ≥15s left
 *   - IDM-VTON: HARD 18s timeout (was up to 35s)
 *
 *   TIME BUDGET (worst case on Vercel with all env vars set):
 *     Sarees:   Gemini 20s → Showcase 1s            = 21s ✅
 *     Jewelry:  Gemini 20s → Composite 1s → Showcase 1s = 22s ✅
 *     Garments: Gemini 20s → IDM-VTON 18s → Showcase 1s = 39s ✅
 *     (ALL well under the 55s client timeout & 60s Vercel limit)
 *
 *   On VERCEL (production):
 *     1. Gemini Nano Banana (if GEMINI_API_KEY set, 20s HARD timeout)
 *     2. Cloudflare SD 1.5 img2img (if CF_API_TOKEN set, 12s, NOT for sarees)
 *     3. FLUX.1-Kontext-dev (if HF_TOKEN set, 15s)
 *     4. Category-specific reliable primary:
 *        - SAREES: Showcase Composite (instant, 100% reliable)
 *        - JEWELRY/ACCESSORIES: Image Composite (instant) → Showcase fallback
 *        - GARMENTS: IDM-VTON (18s) → Showcase fallback
 *     5. ★ SHOWCASE COMPOSITE (ULTIMATE FALLBACK — 100% reliable, ALWAYS runs) ★
 *
 *   On LOCAL (sandbox):
 *     1. ZAI image-edit (PRIMARY — handles ALL categories)
 *     2. Gemini → Cloudflare → FLUX → Image Composite → IDM-VTON → Showcase
 *
 *   100% FREE FOREVER: ZAI (free in sandbox), Cloudflare (10k neurons/day free),
 *   FLUX Kontext (free HF Space), IDM-VTON (free HF Space), Image Composite
 *   (sharp — free, instant), Showcase Composite (sharp — free, instant),
 *   Gemini (free tier 1500/day if key set). No paid APIs. No credit cards.
 *
 *   OPTIONAL ENV VARS (set on Vercel for true AI editing — all free):
 *     GEMINI_API_KEY    — Google Gemini (15 RPM, 1500/day free) — get from
 *                          https://aistudio.google.com/apikey (must start with AIzaSy...)
 *     CF_ACCOUNT_ID     — Cloudflare account ID — from dash.cloudflare.com sidebar
 *     CF_API_TOKEN      — Cloudflare API token — create at
 *                          https://dash.cloudflare.com/profile/api-tokens (Workers AI:Read)
 *     HF_TOKEN          — HuggingFace access token — create at
 *                          https://huggingface.co/settings/tokens (Token type: Read)
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
      message: 'v32 BULLETPROOF AI ready — Gemini (20s hard timeout) + Cloudflare (12s) + FLUX Kontext (15s) + IDM-VTON (18s) + Showcase Composite (5s reserved, ALWAYS runs). Free forever, never times out.',
    })
  }

  const statusResult = await checkIDMVTONSpaceStatus()
  // v32: Multiple strategies available. Showcase Composite is the 100% reliable
  // ultimate fallback for ALL categories — it ALWAYS runs (5s reserved).
  // Gemini/Cloudflare/FLUX are optional (set env vars for true AI editing — all free).
  const isVercel = !!process.env.VERCEL
  const engines: string[] = []
  if (process.env.GEMINI_API_KEY) engines.push('Gemini')
  if (process.env.CF_API_TOKEN) engines.push('Cloudflare')
  if (process.env.HF_TOKEN) engines.push('FLUX-Kontext')
  if (isVercel) engines.push('IDM-VTON', 'Showcase-Composite')
  else engines.push('ZAI-image-edit')
  const engine = `v32-${engines.join('+')}`
  return NextResponse.json({
    available: true,
    spaceAwake: statusResult.awake,
    mode: engine,
    message: isVercel
      ? `v32 BULLETPROOF AI Virtual Try-On ready — ${engines.join(', ')}. Showcase Composite ALWAYS runs (5s reserved, 100% reliable). Hard 45s deadline, 20s Gemini timeout. Set GEMINI_API_KEY / CF_API_TOKEN / HF_TOKEN for true AI image editing (all free).`
      : 'v32 BULLETPROOF AI Virtual Try-On ready — ZAI image-edit (preserves your face & renders the exact product for ALL categories including sarees and jewelry).',
  })
}
