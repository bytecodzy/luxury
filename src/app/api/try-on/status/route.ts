import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

/**
 * GET /api/try-on/status
 *
 * Lightweight availability check for the AI try-on feature.
 * Checks both env vars and file-based config, then verifies reachability.
 * Returns { available: boolean, mode: string, reason?: string }
 */
export async function GET() {
  try {
    const aiCheck = await isZAIAvailable()
    return NextResponse.json({
      available: aiCheck.available,
      mode: aiCheck.mode,
      reason: aiCheck.reason || null,
    })
  } catch {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      reason: 'AI service check failed',
    })
  }
}

export const dynamic = 'force-dynamic'
