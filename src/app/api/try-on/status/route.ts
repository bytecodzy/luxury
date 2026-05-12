import { NextResponse } from 'next/server'

/**
 * GET /api/try-on/status
 *
 * Checks availability of the AI style service.
 * The client-side Style Preview is ALWAYS available (canvas-based, no backend needed).
 * This endpoint just tells the frontend which mode to use:
 *   - ai:     AI service is available AND reachable → use server-side AI generation
 *   - client: AI service unreachable               → use client-side Canvas compositing
 * 
 * We do a quick health check to the AI service rather than just checking config,
 * because on Vercel the config/env vars may point to an internal IP that is not reachable.
 */
export async function GET() {
  try {
    // Try a quick health check to the AI service
    const isReachable = await checkAIReachable()
    
    if (isReachable) {
      return NextResponse.json({ available: true, mode: 'ai' })
    }

    // AI not reachable, but client-side mode ALWAYS works
    return NextResponse.json({
      available: true,
      mode: 'client',
      message: 'Style Preview is available using client-side compositing.',
    })
  } catch {
    // Even on error, client-side mode is available
    return NextResponse.json({
      available: true,
      mode: 'client',
      message: 'Style Preview is available using client-side compositing.',
    })
  }
}

/**
 * Quick health check — try to reach the AI service.
 * Returns true if the service responds, false otherwise.
 */
async function checkAIReachable(): Promise<boolean> {
  // Get the base URL from env vars or config
  let baseUrl = process.env.ZAI_BASE_URL
  
  if (!baseUrl) {
    // Try reading from config file (only on non-Vercel)
    if (!process.env.VERCEL) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const os = await import('os')
        const configPaths = [
          path.join(process.cwd(), '.z-ai-config'),
          path.join(os.homedir(), '.z-ai-config'),
          '/etc/.z-ai-config',
        ]
        for (const filePath of configPaths) {
          try {
            const configStr = fs.readFileSync(filePath, 'utf-8')
            const config = JSON.parse(configStr)
            if (config.baseUrl) {
              baseUrl = config.baseUrl
              break
            }
          } catch {
            continue
          }
        }
      } catch {
        // Can't read files
      }
    }
  }

  if (!baseUrl) return false

  // Quick health check — try to reach the AI service with a short timeout
  // Try multiple endpoints since different AI services have different health endpoints
  const healthPaths = ['/v1/models', '/dashboard/', '/v1/chat/completions', '/']
  
  for (const healthPath of healthPaths) {
    try {
      const url = `${baseUrl.replace(/\/$/, '')}${healthPath}`
      const response = await fetch(url, {
        method: healthPath === '/v1/chat/completions' ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.ZAI_API_KEY || 'Z.ai'}`,
          'Content-Type': 'application/json',
        },
        body: healthPath === '/v1/chat/completions' ? JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }) : undefined,
        signal: AbortSignal.timeout(3000), // 3 second timeout
      })
      // Any response (even 404) means the server is reachable
      // Only connection failures (caught by catch) mean unreachable
      return true
    } catch {
      // This endpoint failed, try next
      continue
    }
  }

  return false
}
