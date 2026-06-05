import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Cached health check ──────────────────────────────────────────────
let healthCache: { reachable: boolean; timestamp: number } | null = null
const HEALTH_CACHE_TTL = 30_000 // 30 seconds

let proxyHealthCache: { reachable: boolean; timestamp: number } | null = null
const PROXY_HEALTH_CACHE_TTL = 60_000 // 60 seconds

/**
 * Get the 'Abc' header value for authenticating with the sandbox gateway.
 */
function getAbcHeader(urlStr: string): string | undefined {
  try {
    const hostname = new URL(urlStr).hostname
    if (hostname.includes('.space-z.ai')) {
      return hostname.split('.')[0]
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Check if a URL is a .space-z.ai gateway URL.
 */
function isSpaceZaiGateway(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname
    return hostname.includes('.space-z.ai')
  } catch {
    return false
  }
}

/**
 * Check if the ZAI AI service endpoint is actually reachable.
 * Uses a lightweight SDK-based health check — makes a tiny chat completion
 * to verify the API is truly functional, not just that DNS resolves.
 */
export async function isAIReachable(baseUrl: string): Promise<boolean> {
  const now = Date.now()
  if (healthCache && now - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.reachable
  }

  try {
    // Use the ZAI SDK to make a minimal API call to check connectivity.
    // This is the most reliable check because it tests the full request path.
    const config = getZAIConfig()
    if (!config) {
      healthCache = { reachable: false, timestamp: now }
      return false
    }

    const zai = new ZAI({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      chatId: config.chatId || '',
      token: config.token || '',
      userId: config.userId || '',
    })

    // Make a minimal chat completion request with 1 token max
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Z-AI-From': 'Z',
        ...(config.chatId ? { 'X-Chat-Id': config.chatId } : {}),
        ...(config.userId ? { 'X-User-Id': config.userId } : {}),
        ...(config.token ? { 'X-Token': config.token } : {}),
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 1,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.ok) {
      healthCache = { reachable: true, timestamp: now }
      return true
    }

    // Even a 4xx response means the server is reachable
    if (response.status < 500) {
      healthCache = { reachable: true, timestamp: now }
      return true
    }

    healthCache = { reachable: false, timestamp: now }
    return false
  } catch (err) {
    console.log('[ZAI] AI reachable check failed:', err instanceof Error ? err.message : String(err))
    healthCache = { reachable: false, timestamp: now }
    return false
  }
}

/**
 * Check if the sandbox proxy URL is reachable.
 * Routes through the .space-z.ai gateway with XTransformPort=3030
 * to reach the ai-proxy service.
 */
export async function isProxyReachable(proxyUrl: string): Promise<boolean> {
  const now = Date.now()
  if (proxyHealthCache && now - proxyHealthCache.timestamp < PROXY_HEALTH_CACHE_TTL) {
    return proxyHealthCache.reachable
  }

  try {
    const abcHeader = getAbcHeader(proxyUrl)
    const headers: Record<string, string> = { 'User-Agent': '3BOXES-ProxyCheck/1.0' }
    if (abcHeader) headers['Abc'] = abcHeader

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    // For .space-z.ai gateway URLs, we need XTransformPort=3030
    // to route to the ai-proxy service instead of the Next.js app
    const statusUrl = isSpaceZaiGateway(proxyUrl)
      ? `${proxyUrl}/api/try-on/status?XTransformPort=3030`
      : `${proxyUrl}/api/try-on/status`

    const response = await fetch(statusUrl, {
      signal: controller.signal,
      headers,
    })

    clearTimeout(timeout)
    if (response.ok) {
      const data = await response.json()
      proxyHealthCache = { reachable: data.available === true, timestamp: now }
      return data.available === true
    }
    proxyHealthCache = { reachable: false, timestamp: now }
    return false
  } catch {
    proxyHealthCache = { reachable: false, timestamp: now }
    return false
  }
}

/**
 * Get the ZAI config from environment variables or file.
 */
export function getZAIConfig(): { baseUrl: string; apiKey: string; chatId?: string; token?: string; userId?: string } | null {
  const envBaseUrl = process.env.ZAI_BASE_URL
  const envApiKey = process.env.ZAI_API_KEY
  if (envBaseUrl && envApiKey) {
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      chatId: process.env.ZAI_CHAT_ID || undefined,
      token: process.env.ZAI_TOKEN || undefined,
      userId: process.env.ZAI_USER_ID || undefined,
    }
  }

  // On Vercel, don't check config files
  if (process.env.VERCEL) {
    return null
  }

  // Local development: check config files
  try {
    const configPaths = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(os.homedir(), '.z-ai-config'),
      '/etc/.z-ai-config',
    ]
    for (const filePath of configPaths) {
      try {
        const configStr = fs.readFileSync(filePath, 'utf-8')
        const config = JSON.parse(configStr)
        if (config.baseUrl && config.apiKey) {
          return {
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            chatId: config.chatId || undefined,
            token: config.token || undefined,
            userId: config.userId || undefined,
          }
        }
      } catch {
        // Continue to next path
      }
    }
  } catch {
    // fs not available
  }

  return null
}

/**
 * Check if the ZAI AI service is available AND reachable.
 * Strategy chain:
 * 1. Direct ZAI SDK (if config exists and API is reachable)
 * 2. Proxy to sandbox ai-proxy via ZAI_PROXY_URL
 * 3. Unavailable
 */
export async function isZAIAvailable(): Promise<{
  available: boolean
  mode: 'ai' | 'proxy' | 'unavailable' | 'sdk-auto'
  reason?: string
}> {
  const config = getZAIConfig()

  // Strategy 1: Direct ZAI SDK if config exists and API is reachable
  if (config) {
    const reachable = await isAIReachable(config.baseUrl)

    if (reachable) {
      return { available: true, mode: 'ai' }
    }

    // Config exists but service is unreachable — try proxy
    if (process.env.ZAI_PROXY_URL) {
      const proxyReachable = await isProxyReachable(process.env.ZAI_PROXY_URL)
      if (proxyReachable) {
        console.log('[ZAI] AI service at', config.baseUrl, 'is unreachable, falling back to proxy')
        return { available: true, mode: 'proxy', reason: 'AI service unreachable, using proxy' }
      }
    }
  }

  // Strategy 2: Try SDK auto-discovery (ZAI.create()) — works in sandbox environment
  if (!process.env.VERCEL) {
    try {
      const testInstance = await ZAI.create()
      if (testInstance) {
        const sdkBaseUrl = testInstance.config?.baseUrl
        if (sdkBaseUrl) {
          const reachable = await isAIReachable(sdkBaseUrl)
          if (reachable) {
            console.log('[ZAI] SDK auto-discovery succeeded AND API is reachable')
            return { available: true, mode: 'sdk-auto', reason: 'Using SDK auto-discovery' }
          }
          console.log('[ZAI] SDK auto-discovery succeeded but API is NOT reachable at', sdkBaseUrl)
        } else {
          console.log('[ZAI] SDK auto-discovery succeeded (no base URL to check)')
          return { available: true, mode: 'sdk-auto', reason: 'Using SDK auto-discovery' }
        }
      }
    } catch (sdkErr) {
      console.log('[ZAI] SDK auto-discovery failed:', sdkErr instanceof Error ? sdkErr.message : String(sdkErr))
    }
  }

  // Strategy 3: Try proxy URL
  if (process.env.ZAI_PROXY_URL) {
    const proxyReachable = await isProxyReachable(process.env.ZAI_PROXY_URL)
    if (proxyReachable) {
      return { available: true, mode: 'proxy', reason: 'Using proxy to sandbox AI service' }
    }
    return {
      available: false,
      mode: 'unavailable',
      reason: 'Proxy URL is configured but not reachable.',
    }
  }

  return {
    available: false,
    mode: 'unavailable',
    reason: config ? 'AI service is configured but not reachable, and no proxy is available.' : 'AI service is not configured and SDK auto-discovery failed.',
  }
}

/**
 * Create a ZAI SDK instance.
 * Tries explicit config first, then SDK auto-discovery, then throws.
 */
export async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  const config = getZAIConfig()

  // Strategy 1: Explicit config from env vars or .z-ai-config file
  if (config) {
    try {
      return new ZAI({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        chatId: config.chatId || process.env.ZAI_CHAT_ID || '',
        token: config.token || process.env.ZAI_TOKEN || '',
        userId: config.userId || process.env.ZAI_USER_ID || '',
      }) as InstanceType<typeof ZAI>
    } catch (err) {
      console.error('[ZAI] Failed to create from config:', err)
    }
  }

  // Strategy 2: SDK auto-discovery — works in sandbox without config files
  if (!process.env.VERCEL) {
    try {
      const instance = await ZAI.create()
      if (instance) {
        return instance
      }
    } catch (err) {
      console.error('[ZAI] SDK auto-discovery failed:', err instanceof Error ? err.message : String(err))
    }
  }

  throw new Error('AI_STYLE_SERVICE_UNAVAILABLE')
}
