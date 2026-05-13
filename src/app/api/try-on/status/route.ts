import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

/**
 * GET /api/try-on/status
 *
 * Checks if the AI style service is available and reachable.
 * On Vercel: always returns unavailable (client uses canvas fallback).
 * Locally: performs real health checks.
 */
export async function GET() {
  // On Vercel: AI service is always unreachable
  const isVercel = !!process.env.VERCEL

  if (isVercel) {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      message: 'AI style service is not available on this deployment. Use visual style preview instead.',
    })
  }

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
