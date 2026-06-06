import { NextResponse } from 'next/server'
import { isZAIAvailable, isLocalProxyReachable } from '@/lib/zai'
import { isHFAvailable } from '@/lib/huggingface-tryon'

// Cache the AI availability check for 30 seconds
let statusCache: { available: boolean; mode: string; reason?: string; timestamp: number } | null = null
const STATUS_CACHE_TTL = 30_000

export async function GET() {
  try {
    // Check HuggingFace first (instant, no network call needed)
    const hfAvailable = isHFAvailable()
    if (hfAvailable) {
      return NextResponse.json({
        available: true,
        mode: 'huggingface',
        hfAvailable,
        reason: 'HuggingFace free inference API configured',
      })
    }

    const now = Date.now()

    // Return cached result if still valid
    if (statusCache && now - statusCache.timestamp < STATUS_CACHE_TTL) {
      return NextResponse.json({
        available: statusCache.available,
        mode: statusCache.mode,
        reason: statusCache.reason,
        hfAvailable,
      })
    }

    const check = await isZAIAvailable()

    // Cache the result
    statusCache = {
      available: check.available,
      mode: check.mode,
      reason: check.reason || undefined,
      timestamp: now,
    }

    return NextResponse.json({
      available: check.available,
      mode: check.mode,
      reason: check.reason || undefined,
      hfAvailable,
    })
  } catch (err) {
    const hfAvailable = isHFAvailable()

    // As a last resort, try checking the local proxy directly
    if (!process.env.VERCEL) {
      try {
        const localProxyOk = await isLocalProxyReachable()
        if (localProxyOk) {
          return NextResponse.json({
            available: true,
            mode: 'local-proxy',
            reason: 'Local ai-proxy is available (fallback check)',
            hfAvailable,
          })
        }
      } catch {}
    }

    return NextResponse.json({
      available: hfAvailable,
      mode: hfAvailable ? 'huggingface' : 'unavailable',
      reason: hfAvailable ? 'HuggingFace free inference available' : 'Health check failed',
      hfAvailable,
    })
  }
}
