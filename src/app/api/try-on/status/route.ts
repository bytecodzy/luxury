import { NextResponse } from 'next/server'
import { checkIDMVTONSpaceStatus } from '@/lib/huggingface-tryon'

// Cache space status for 60 seconds
let spaceStatusCache: { running: boolean; status: string; stage?: string; timestamp: number } | null = null
const SPACE_STATUS_CACHE_TTL = 60_000

export async function GET() {
  try {
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
    const modeDesc = spaceStatus.running
      ? 'IDM-VTON virtual try-on (running)'
      : `IDM-VTON virtual try-on (space ${spaceStatus.stage || spaceStatus.status})`

    return NextResponse.json({
      available: true,
      mode: 'huggingface-idm-vton',
      spaceRunning: spaceStatus.running,
      spaceStage: spaceStatus.stage || spaceStatus.status,
      reason: modeDesc,
    })
  } catch {
    return NextResponse.json({
      available: true,
      mode: 'huggingface-idm-vton',
      spaceRunning: false,
      spaceStage: 'unknown',
      reason: 'IDM-VTON virtual try-on (status check failed)',
    })
  }
}

// POST to pre-warm the Space
export async function POST() {
  try {
    // Clear cache and check status fresh
    spaceStatusCache = null

    const spaceStatus = await checkIDMVTONSpaceStatus()
    const now = Date.now()
    spaceStatusCache = { ...spaceStatus, timestamp: now }

    return NextResponse.json({
      available: true,
      spaceRunning: spaceStatus.running,
      spaceStage: spaceStatus.stage || spaceStatus.status,
    })
  } catch {
    return NextResponse.json({
      available: true,
      spaceRunning: false,
      spaceStage: 'unknown',
    })
  }
}
