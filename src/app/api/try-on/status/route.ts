import { NextResponse } from 'next/server'
import { isTryOnServiceReady } from '@/lib/virtual-tryon'

// Cache space status for 30 seconds
let statusCache: { ready: boolean; engine: string; reason?: string; timestamp: number } | null = null
const STATUS_CACHE_TTL = 30_000

export async function GET() {
  try {
    let status: { ready: boolean; engine: string; reason?: string } | null = null
    const now = Date.now()
    if (statusCache && now - statusCache.timestamp < STATUS_CACHE_TTL) {
      status = statusCache
    } else {
      status = await isTryOnServiceReady()
      statusCache = { ...status, timestamp: now }
    }

    return NextResponse.json({
      available: true,
      mode: status.engine,
      spaceRunning: status.ready,
      spaceStage: status.engine,
      reason: status.reason || `Virtual try-on ready — engine: ${status.engine}`,
    })
  } catch {
    return NextResponse.json({
      available: true,
      mode: 'fallback',
      spaceRunning: true,
      spaceStage: 'fallback',
      reason: 'Virtual try-on ready (status check failed — using fallback)',
    })
  }
}

// POST to pre-warm the engine (triggers ZAI SDK init in the background)
export async function POST() {
  try {
    statusCache = null
    const status = await isTryOnServiceReady()
    const now = Date.now()
    statusCache = { ...status, timestamp: now }

    return NextResponse.json({
      available: true,
      spaceRunning: status.ready,
      spaceStage: status.engine,
    })
  } catch {
    return NextResponse.json({
      available: true,
      spaceRunning: true,
      spaceStage: 'fallback',
    })
  }
}
