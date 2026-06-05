import { NextRequest, NextResponse } from 'next/server'

/**
 * Remote Try-On Route — forwards try-on requests to the sandbox ai-proxy.
 *
 * On Vercel, the ZAI SDK is not directly accessible.
 * This route forwards try-on requests to the sandbox's ai-proxy service
 * (port 3030) via the external gateway URL (ZAI_PROXY_URL).
 *
 * The sandbox URL is configured via the ZAI_PROXY_URL environment variable.
 * For .space-z.ai gateway URLs, XTransformPort=3030 is automatically added
 * to route to the ai-proxy service.
 */

function isSpaceZaiGateway(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname
    return hostname.includes('.space-z.ai')
  } catch {
    return false
  }
}

function buildProxyUrl(proxyUrl: string, path: string, extraParams?: Record<string, string>): string {
  const base = proxyUrl.replace(/\/+$/, '')
  const params = new URLSearchParams(extraParams || {})

  // For .space-z.ai gateway URLs, add XTransformPort=3030
  // to route to the ai-proxy service on the sandbox
  if (isSpaceZaiGateway(proxyUrl)) {
    params.set('XTransformPort', '3030')
  }

  const paramStr = params.toString()
  return paramStr ? `${base}${path}?${paramStr}` : `${base}${path}`
}

function getProxyHeaders(proxyUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  try {
    const proxyHost = new URL(proxyUrl).hostname
    if (proxyHost.includes('.space-z.ai')) {
      headers['Abc'] = proxyHost.split('.')[0]
    }
  } catch {}
  return headers
}

export async function POST(request: NextRequest) {
  const proxyUrl = process.env.ZAI_PROXY_URL

  if (!proxyUrl) {
    return NextResponse.json({
      error: 'Virtual try-on is not configured for this deployment. Please set ZAI_PROXY_URL environment variable.',
      code: 'AI_SERVICE_UNAVAILABLE',
    }, { status: 503 })
  }

  try {
    const body = await request.json()
    const proxyHeaders = getProxyHeaders(proxyUrl)

    // Forward the request to the sandbox ai-proxy
    const proxyFetchUrl = buildProxyUrl(proxyUrl, '/api/try-on')
    console.log('[try-on-remote] Forwarding to:', proxyFetchUrl)

    const response = await fetch(proxyFetchUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    const result = await response.json()
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('[try-on-remote] Error:', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        error: 'The AI service took too long to respond. Please try again.',
        code: 'TIMEOUT',
      }, { status: 504 })
    }
    return NextResponse.json({
      error: 'Failed to connect to the AI style service. Please try again later.',
      code: 'CONNECTION_ERROR',
    }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  const proxyUrl = process.env.ZAI_PROXY_URL

  if (!proxyUrl) {
    return NextResponse.json({ available: false, message: 'AI proxy not configured' })
  }

  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const proxyHeaders = getProxyHeaders(proxyUrl)

    const proxyFetchUrl = buildProxyUrl(proxyUrl, '/api/try-on', jobId ? { jobId } : undefined)
    const response = await fetch(proxyFetchUrl, {
      headers: proxyHeaders,
      signal: AbortSignal.timeout(10000),
    })
    const result = await response.json()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({
      status: 'failed',
      error: 'Failed to check job status',
    })
  }
}
