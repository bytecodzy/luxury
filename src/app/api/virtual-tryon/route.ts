/**
 * AI Virtual Try-On API v11 — Vercel-Production-Ready
 *
 * Key fixes:
 * 1. Better Vercel-specific error messages
 * 2. Proper product image resolution
 * 3. Enhanced ZAI connectivity test endpoint
 * 4. Detailed debug info for Vercel diagnostics
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

    // AI failed — honest error with helpful message + debug info
    console.log(`[virtual-tryon] ❌ Failed in ${elapsed}s: ${result.error}`)
    if (result.debugInfo) {
      console.log(`[virtual-tryon] Debug: strategies=${result.debugInfo.strategiesAttempted.join(',')}`)
      console.log(`[virtual-tryon] Strategy errors: ${JSON.stringify(result.debugInfo.strategyErrors)}`)
    }

    const zaiConfigured = isZAIConfigured()
    const isVercel = !!process.env.VERCEL
    const zaiConfig = getZAIConfig()

    // Detect if ZAI_BASE_URL points to internal-api.z.ai (unreachable from Vercel)
    const isInternalZAI = zaiConfig?.baseUrl?.includes('internal-api.z.ai') ?? false

    let errorMessage = result.error || 'AI try-on is currently unavailable. Please try again in a few minutes.'
    let hint: string | undefined

    if (isVercel && isInternalZAI) {
      hint = 'ZAI_BASE_URL points to internal-api.z.ai which may not be reachable from Vercel servers. Use the public API endpoint instead (e.g., https://api.z.ai/api/v1).'
    } else if (isVercel && !zaiConfigured) {
      hint = 'Set ZAI_BASE_URL and ZAI_API_KEY environment variables on Vercel to enable AI-powered virtual try-on.'
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
        zaiBaseUrl: zaiConfig?.baseUrl || 'NOT SET',
        strategiesAttempted: result.debugInfo?.strategiesAttempted || [],
        strategyErrors: result.debugInfo?.strategyErrors || {},
        healthCheck: result.debugInfo?.healthCheck || null,
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

  // ── Debug endpoint: test ZAI connectivity directly ──
  if (searchParams.get('action') === 'test-zai') {
    const zaiConfigured = isZAIConfigured()
    const zaiConfig = getZAIConfig()
    const isVercel = !!process.env.VERCEL

    if (!zaiConfigured || !zaiConfig) {
      return NextResponse.json({
        configured: false,
        error: 'ZAI_BASE_URL and ZAI_API_KEY must be set in Vercel environment variables',
        isVercel,
        hint: 'Go to Vercel Dashboard → Settings → Environment Variables and add ZAI_BASE_URL and ZAI_API_KEY',
      })
    }

    // Test 1: Simple models list to verify API connectivity
    try {
      const startTime = Date.now()
      const response = await fetch(`${zaiConfig.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${zaiConfig.apiKey}`,
          'X-Z-AI-From': 'Z',
        },
        signal: AbortSignal.timeout(10_000),
      })
      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown')
        return NextResponse.json({
          configured: true,
          connectivityTest: 'FAIL',
          status: response.status,
          error: `API returned status ${response.status}: ${errorBody.substring(0, 300)}`,
          baseUrl: zaiConfig.baseUrl,
          apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
          isVercel,
          elapsedMs: elapsed,
        })
      }

      const result = await response.json().catch(() => null)
      return NextResponse.json({
        configured: true,
        connectivityTest: 'PASS',
        baseUrl: zaiConfig.baseUrl,
        apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
        isVercel,
        elapsedMs: elapsed,
        modelsAvailable: Array.isArray(result?.data) ? result.data.length : 'unknown',
      })
    } catch (err) {
      const errMsg = (err as Error).message || String(err)
      return NextResponse.json({
        configured: true,
        connectivityTest: 'FAIL',
        error: errMsg.substring(0, 500),
        baseUrl: zaiConfig.baseUrl,
        apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
        isVercel,
      })
    }
  }

  // ── Debug endpoint: test ZAI image generation directly ──
  if (searchParams.get('action') === 'test-zai-image') {
    const zaiConfigured = isZAIConfigured()
    const zaiConfig = getZAIConfig()
    const isVercel = !!process.env.VERCEL

    if (!zaiConfigured || !zaiConfig) {
      return NextResponse.json({
        configured: false,
        error: 'ZAI_BASE_URL and ZAI_API_KEY must be set',
        isVercel,
      })
    }

    try {
      const startTime = Date.now()
      const response = await fetch(`${zaiConfig.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${zaiConfig.apiKey}`,
          'X-Z-AI-From': 'Z',
        },
        body: JSON.stringify({
          model: 'cogview-4-plus',
          prompt: 'A simple red t-shirt on a white background, product photography',
          size: '1024x1024',
        }),
        signal: AbortSignal.timeout(30_000),
      })
      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'unknown')
        return NextResponse.json({
          configured: true,
          imageTest: 'FAIL',
          status: response.status,
          error: `API returned status ${response.status}: ${errorBody.substring(0, 500)}`,
          baseUrl: zaiConfig.baseUrl,
          apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
          isVercel,
          elapsedMs: elapsed,
        })
      }

      const result = await response.json()
      const hasImage = !!result?.data?.[0]?.base64 || !!result?.data?.[0]?.url
      return NextResponse.json({
        configured: true,
        imageTest: hasImage ? 'PASS' : 'PARTIAL',
        hasImage,
        baseUrl: zaiConfig.baseUrl,
        apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
        isVercel,
        elapsedMs: elapsed,
        responsePreview: JSON.stringify(result).substring(0, 300),
      })
    } catch (err) {
      const errMsg = (err as Error).message || String(err)
      return NextResponse.json({
        configured: true,
        imageTest: 'FAIL',
        error: errMsg.substring(0, 500),
        baseUrl: zaiConfig.baseUrl,
        apiKeyPrefix: zaiConfig.apiKey.substring(0, 8) + '...',
        isVercel,
      })
    }
  }

  if (searchParams.get('action') === 'prewarm') {
    const awake = await preWarmSpace()
    const zaiConfigured = isZAIConfigured()
    const isVercel = !!process.env.VERCEL
    const zaiConfig = getZAIConfig()

    return NextResponse.json({
      available: true,
      spaceAwake: awake,
      zaiConfigured,
      zaiBaseUrl: zaiConfig?.baseUrl || 'NOT SET',
      isVercel,
      message: zaiConfigured
        ? 'ZAI ready'
        : awake
          ? 'IDM-VTON ready'
          : 'Warming up',
    })
  }

  const statusResult = await checkIDMVTONSpaceStatus()
  const awake = statusResult.awake
  const zaiConfigured = isZAIConfigured()
  const isVercel = !!process.env.VERCEL
  const zaiConfig = getZAIConfig()

  return NextResponse.json({
    available: true,
    spaceAwake: awake,
    zaiConfigured,
    zaiBaseUrl: zaiConfig?.baseUrl || 'NOT SET',
    isVercel,
    mode: zaiConfigured ? 'zai-edit + idm-vton' : awake ? 'idm-vton' : 'unavailable',
    message: zaiConfigured
      ? 'ZAI Image Edit + IDM-VTON available'
      : awake
        ? 'IDM-VTON ready — best quality'
        : 'AI service not configured',
  })
}
