/**
 * AI Virtual Try-On API v6 — Synchronous, Honest, Fast
 *
 * Key improvements:
 * 1. Synchronous processing — single POST, return first success
 * 2. 50-second server timeout — never exceed Vercel's 60s limit
 * 3. NO canvas overlay fallback — either real AI result or honest error
 * 4. If AI is busy, tell user to try later — don't make them wait
 * 5. maxDuration = 60 for Vercel Pro
 */

import { NextRequest, NextResponse } from 'next/server'
import { performVirtualTryOn, preWarmSpace, checkIDMVTONSpaceStatus } from '@/lib/virtual-tryon'

export const maxDuration = 60

// ── Product Image Helpers ──────────────────────────────────────────

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (!imagePath) return null
  if (imagePath.startsWith('data:')) return imagePath
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return fetchImageAsBase64(imagePath)
  if (imagePath.startsWith('//')) return fetchImageAsBase64(`https:${imagePath}`)
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const u = new URL(imagePath, 'http://localhost')
      const orig = u.searchParams.get('url')
      if (orig) { const r = await fetchImageAsBase64(orig.startsWith('//') ? `https:${orig}` : orig); if (r) return r }
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

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const body = await request.json()
    const { productId, selfieData, productImageUrl, productImageBase64: clientBase64, productName, categorySlug } = body

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

    // Resolve product image
    let productImageBase64 = clientBase64 || null
    if (!productImageBase64 && productImageUrl) {
      productImageBase64 = await getProductImageBase64(productImageUrl)
    }
    if (!productImageBase64) {
      return NextResponse.json({
        success: false,
        error: 'Could not load product image. Please try again.',
        errorCode: 'NO_PRODUCT_IMAGE',
        elapsed: ((Date.now() - startTime) / 1000).toFixed(1),
      })
    }

    console.log(`[try-on] Starting virtual try-on for "${productName}" (${categorySlug})`)

    // Run the multi-strategy try-on engine
    const result = await performVirtualTryOn({
      selfieData,
      productImageBase64,
      productName: productName || 'Product',
      categorySlug: categorySlug || '',
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.success && result.imageUrl) {
      console.log(`[try-on] ✅ Success in ${elapsed}s via ${result.strategy}`)
      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy,
        elapsed: parseFloat(elapsed),
      })
    }

    // AI failed — honest error, tell user to try later
    console.log(`[try-on] ❌ Failed in ${elapsed}s: ${result.error}`)
    return NextResponse.json({
      success: false,
      error: result.error || 'AI try-on is currently unavailable. Please try again in a few minutes.',
      errorCode: result.errorCode || 'ALL_STRATEGIES_FAILED',
      strategy: result.strategy,
      elapsed: parseFloat(elapsed),
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
      message: awake ? 'IDM-VTON ready' : 'IDM-VTON warming up — try-on will use AI image generation',
    })
  }
  const statusResult = await checkIDMVTONSpaceStatus()
  const awake = statusResult.awake
  return NextResponse.json({
    available: true,
    spaceAwake: awake,
    mode: awake ? 'idm-vton' : 'zai-fallback',
    message: awake ? 'IDM-VTON ready — best quality' : 'Using AI image generation — good quality',
  })
}
