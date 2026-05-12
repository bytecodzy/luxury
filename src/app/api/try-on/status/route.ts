import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

/**
 * GET /api/try-on/status
 *
 * Checks if the AI style service is available and reachable.
 * Uses the async isZAIAvailable() which performs real health checks
 * including proxy verification.
 */
export async function GET() {
  try {
    const status = await isZAIAvailable()
    return NextResponse.json({
      available: status.available,
      mode: status.mode,
      message: status.reason,
    })
  } catch {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      message: 'Could not check AI service availability.',
    })
  }
}
