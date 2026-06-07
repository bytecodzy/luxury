import { NextResponse } from 'next/server'
import { isZAIAvailable, isLocalProxyReachable } from '@/lib/zai'
import { isHFAvailable, checkIDMVTONSpaceStatus } from '@/lib/huggingface-tryon'

// Cache the AI availability check for 30 seconds
let statusCache: { available: boolean; mode: string; reason?: string; timestamp: number } | null = null
const STATUS_CACHE_TTL = 30_000

// Cache space status for 60 seconds
let spaceStatusCache: { running: boolean; status: string; stage?: string; timestamp: number } | null = null
const SPACE_STATUS_CACHE_TTL = 60_000

export async function GET() {
  try {
    const hfAvailable = isHFAvailable()

    // Check IDM-VTON Space status (cached for 60s)
    let spaceStatus: { running: boolean; status: string; stage?: string } = { running: false, status: 'unknown' }
    const now = Date.now()
    if (spaceStatusCache && now - spaceStatusCache.timestamp < SPACE_STATUS_CACHE_TTL) {
      spaceStatus = spaceStatusCache
    } else {
      spaceStatus = await checkIDMVTONSpaceStatus()
      spaceStatusCache = { ...spaceStatus, timestamp: now }
    }

    // IDM-VTON is always available (public Space) but may need wake-up
    if (hfAvailable) {
      const modeDesc = spaceStatus.running
        ? 'IDM-VTON virtual try-on (running)'
        : `IDM-VTON virtual try-on (space ${spaceStatus.stage || spaceStatus.status})`

      return NextResponse.json({
        available: true,
        mode: 'huggingface-idm-vton',
        hfAvailable,
        spaceRunning: spaceStatus.running,
        spaceStage: spaceStatus.stage || spaceStatus.status,
        reason: modeDesc,
      })
    }

    // Return cached ZAI result if still valid
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
      mode: hfAvailable ? 'huggingface-idm-vton' : 'unavailable',
      reason: hfAvailable ? 'IDM-VTON virtual try-on available' : 'Health check failed',
      hfAvailable,
    })
  }
}
