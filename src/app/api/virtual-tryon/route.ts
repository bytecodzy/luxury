/**
 * AI Virtual Try-On API v10 — Fixed for Vercel
 *
 * Key fixes:
 * 1. Better Vercel-specific error messages (internal-api.z.ai is unreachable)
 * 2. Proper product image resolution
 * 3. IDM-VTON as primary strategy
 * 4. ZAI Image Edit with correct `image` parameter format
 */

import { NextRequest, NextResponse } from 'next/server'
import { performVirtualTryOn, preWarmSpace, checkIDMVTONSpaceStatus } from '@/lib/virtual-tryon'
import { isZAIConfigured, getZAIConfig } from '@/lib/zai'

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

// ── POST /api/virtual-tryon ───────────────────────────────────────

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

    // Resolve product image — prefer client-provided base64 over URL fetch
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

    console.log(`[virtual-tryon] Starting virtual try-on for "${productName}" (${categorySlug})`)

    const result = await performVirtualTryOn({
      selfieData,
      productImageBase64,
      productName: productName || 'Product',
      categorySlug: categorySlug || '',
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.success && result.imageUrl) {
      console.log(`[virtual-tryon] ✅ Success in ${elapsed}s via ${result.strategy}`)
      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy,
        elapsed: parseFloat(elapsed),
      })
    }

    // AI failed — honest error with helpful message
    console.log(`[virtual-tryon] ❌ Failed in ${elapsed}s: ${result.error}`)

    const zaiConfigured = isZAIConfigured()
    const isVercel = !!process.env.VERCEL
    const zaiConfig = getZAIConfig()

    // Detect if ZAI_BASE_URL points to internal-api.z.ai (unreachable from Vercel)
    const isInternalZAI = zaiConfig?.baseUrl?.includes('internal-api.z.ai') ?? false

    let errorMessage = result.error || 'AI try-on is currently unavailable. Please try again in a few minutes.'
    let hint: string | undefined

    if (isVercel && isInternalZAI) {
      hint = 'ZAI_BASE_URL points to internal-api.z.ai which is NOT reachable from Vercel servers. Set ZAI_BASE_URL to a public API endpoint, or rely on the HuggingFace IDM-VTON service (which may need warming up).'
    } else if (isVercel && !zaiConfigured) {
      hint = 'Set ZAI_BASE_URL and ZAI_API_KEY environment variables on Vercel to enable AI-powered virtual try-on. Note: internal-api.z.ai is not reachable from Vercel.'
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorCode: result.errorCode || 'ALL_STRATEGIES_FAILED',
      strategy: result.strategy,
      elapsed: parseFloat(elapsed),
      debug: {
        zaiConfigured,
        isVercel,
        isInternalZAI,
        hint,
      },
    })
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`[virtual-tryon] Error after ${elapsed}s:`, error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTERNAL_ERROR',
      elapsed: parseFloat(elapsed),
    }, { status: 500 })
  }
}

// ── GET /api/virtual-tryon ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('action') === 'prewarm') {
    const awake = await preWarmSpace()
    const zaiConfigured = isZAIConfigured()
    const isVercel = !!process.env.VERCEL
    const zaiConfig = getZAIConfig()
    const isInternalZAI = zaiConfig?.baseUrl?.includes('internal-api.z.ai') ?? false

    return NextResponse.json({
      available: true,
      spaceAwake: awake,
      zaiConfigured,
      zaiReachable: zaiConfigured && !isInternalZAI,
      isVercel,
      message: zaiConfigured && !isInternalZAI
        ? 'ZAI + IDM-VTON ready'
        : awake
          ? 'IDM-VTON ready'
          : 'Warming up IDM-VTON',
    })
  }
  const statusResult = await checkIDMVTONSpaceStatus()
  const awake = statusResult.awake
  const zaiConfigured = isZAIConfigured()
  const isVercel = !!process.env.VERCEL
  const zaiConfig = getZAIConfig()
  const isInternalZAI = zaiConfig?.baseUrl?.includes('internal-api.z.ai') ?? false
  const zaiReachable = zaiConfigured && !isInternalZAI

  return NextResponse.json({
    available: true,
    spaceAwake: awake,
    zaiConfigured,
    zaiReachable,
    isVercel,
    mode: zaiReachable ? 'zai-vlm-edit + idm-vton' : awake ? 'idm-vton' : 'unavailable',
    message: zaiReachable
      ? 'ZAI VLM+Edit + IDM-VTON available'
      : awake
        ? 'IDM-VTON ready — best quality'
        : isVercel
          ? 'AI service not configured for Vercel. IDM-VTON is sleeping — try again in 30s.'
          : 'AI service not configured',
  })
}
