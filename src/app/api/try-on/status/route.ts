import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

// Cache the AI availability check for 60 seconds to avoid repeated slow checks
let statusCache: { available: boolean; mode: string; reason?: string; timestamp: number } | null = null
const STATUS_CACHE_TTL = 60_000 // 60 seconds

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached result if still valid
    if (statusCache && now - statusCache.timestamp < STATUS_CACHE_TTL) {
      return NextResponse.json({
        available: statusCache.available,
        mode: statusCache.mode,
        reason: statusCache.reason,
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
    })
  } catch (err) {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      reason: 'Health check failed',
    })
  }
}
