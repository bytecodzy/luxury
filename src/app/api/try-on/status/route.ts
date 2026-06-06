import { NextResponse } from 'next/server'
import { isZAIAvailable, isLocalProxyReachable } from '@/lib/zai'
import { isExternalAIAvailable } from '@/lib/external-ai'

// Cache the AI availability check for 30 seconds
let statusCache: { available: boolean; mode: string; reason?: string; timestamp: number } | null = null
const STATUS_CACHE_TTL = 30_000

export async function GET() {
  try {
    // Check external AI first (instant, no network call needed)
    const externalAI = isExternalAIAvailable()
    if (externalAI.replicate || externalAI.openai) {
      return NextResponse.json({
        available: true,
        mode: externalAI.replicate ? 'replicate' : 'openai',
        externalAI,
        reason: 'External AI service configured',
      })
    }

    const now = Date.now()

    // Return cached result if still valid
    if (statusCache && now - statusCache.timestamp < STATUS_CACHE_TTL) {
      return NextResponse.json({
        available: statusCache.available,
        mode: statusCache.mode,
        reason: statusCache.reason,
        externalAI,
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
      externalAI,
    })
  } catch (err) {
    const externalAI = isExternalAIAvailable()

    // As a last resort, try checking the local proxy directly
    if (!process.env.VERCEL) {
      try {
        const localProxyOk = await isLocalProxyReachable()
        if (localProxyOk) {
          return NextResponse.json({
            available: true,
            mode: 'local-proxy',
            reason: 'Local ai-proxy is available (fallback check)',
            externalAI,
          })
        }
      } catch {}
    }

    return NextResponse.json({
      available: externalAI.replicate || externalAI.openai,
      mode: externalAI.replicate ? 'replicate' : externalAI.openai ? 'openai' : 'unavailable',
      reason: externalAI.replicate || externalAI.openai ? 'External AI available' : 'Health check failed',
      externalAI,
    })
  }
}
