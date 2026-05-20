import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

export async function GET() {
  try {
    const check = await isZAIAvailable()
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
