import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

/**
 * GET /api/try-on/status
 *
 * Checks if the AI style service is available and reachable.
 * Returns mode='ai' only if the service is confirmed reachable.
 * On Vercel (cloud), the internal AI service is typically unreachable,
 * so the status will reflect that.
 */
export async function GET() {
  try {
    // On Vercel, skip file-based config (the .z-ai-config may exist but points to internal IP)
    if (process.env.VERCEL) {
      // Check if env vars point to a reachable service
      const baseUrl = process.env.ZAI_BASE_URL
      if (baseUrl) {
        // Try a quick health check
        try {
          const healthUrl = baseUrl.replace(/\/v1$/, '').replace(/\/$/, '')
          const check = await fetch(`${healthUrl}/dashboard/`, {
            signal: AbortSignal.timeout(4000),
          })
          // Any response (even 404) means the server is reachable
          return NextResponse.json({ available: true, mode: 'ai' })
        } catch {
          // Service not reachable from Vercel
          return NextResponse.json({
            available: false,
            mode: 'unavailable',
            message: 'AI style service is not reachable from this cloud deployment. Use the development preview for full AI try-on features.',
          })
        }
      }
      // No env vars
      return NextResponse.json({
        available: false,
        mode: 'unavailable',
        message: 'AI style service is not configured for this deployment.',
      })
    }

    // Local development: check config availability + reachability
    const check = isZAIAvailable()
    if (check.available) {
      // Verify the service is actually reachable
      try {
        const fs = await import('fs')
        const path = await import('path')
        const config = JSON.parse(fs.readFileSync(
          path.join(process.cwd(), '.z-ai-config'), 'utf-8'
        ))
        const healthUrl = config.baseUrl?.replace(/\/v1$/, '').replace(/\/$/, '') || ''
        if (healthUrl) {
          await fetch(`${healthUrl}/dashboard/`, { signal: AbortSignal.timeout(4000) })
        }
        return NextResponse.json({ available: true, mode: 'ai' })
      } catch {
        return NextResponse.json({
          available: false,
          mode: 'unavailable',
          message: 'AI service configured but not reachable.',
        })
      }
    }

    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      message: check.reason || 'AI style service is not configured.',
    })
  } catch {
    return NextResponse.json({
      available: false,
      mode: 'unavailable',
      message: 'Could not check AI service availability.',
    })
  }
}
