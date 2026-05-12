import { NextResponse } from 'next/server'
import { isZAIAvailable } from '@/lib/zai'

/**
 * GET /api/try-on/status
 *
 * Lightweight availability check — does NOT make any API calls.
 * Just verifies the SDK config exists so we don't waste rate-limited quota.
 * Returns { available: boolean, message?: string }
 */
export async function GET() {
  try {
    const check = isZAIAvailable()
    if (check.available) {
      return NextResponse.json({ available: true })
    }

    // Check if a proxy is configured (for Vercel deployments)
    const proxyUrl = process.env.ZAI_PROXY_URL
    if (proxyUrl) {
      // Test if the proxy is reachable
      try {
        const proxyCheck = await fetch(`${proxyUrl}/api/try-on/status`, {
          signal: AbortSignal.timeout(5000),
        })
        const proxyResult = await proxyCheck.json()
        if (proxyResult.available) {
          return NextResponse.json({ available: true, proxied: true })
        }
      } catch {
        // Proxy not reachable
      }
    }

    return NextResponse.json({
      available: false,
      message: check.reason || 'Virtual try-on is currently unavailable. This feature requires our AI style service.',
    })
  } catch {
    return NextResponse.json({
      available: false,
      message: 'Could not check AI availability.',
    })
  }
}
