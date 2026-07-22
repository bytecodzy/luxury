import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Cached health check ──────────────────────────────────────────────
let healthCache: { reachable: boolean; timestamp: number } | null = null
const HEALTH_CACHE_TTL = 30_000 // 30 seconds

let proxyHealthCache: { reachable: boolean; timestamp: number } | null = null
const PROXY_HEALTH_CACHE_TTL = 60_000 // 60 seconds

let localProxyCache: { reachable: boolean; timestamp: number } | null = null
const LOCAL_PROXY_CACHE_TTL = 30_000 // 30 seconds

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
 * Check if the local ai-proxy service on port 3030 is reachable and available.
 * This is the PRIMARY way to reach ZAI from within the sandbox.
 */
export async function isLocalProxyReachable(): Promise<boolean> {
  const now = Date.now()
  if (localProxyCache && now - localProxyCache.timestamp < LOCAL_PROXY_CACHE_TTL) {
    return localProxyCache.reachable
  }

  // Only check local proxy in sandbox environment (not on Vercel)
  if (process.env.VERCEL) {
    localProxyCache = { reachable: false, timestamp: now }
    return false
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch('http://localhost:3030/api/try-on/status', {
      signal: controller.signal,
      headers: { 'User-Agent': '3BOXES-LocalProxyCheck/1.0' },
    })

    clearTimeout(timeout)
    if (response.ok) {
      const data = await response.json()
      // Check both `available` AND `zaiReachable` — the proxy may be UP
      // but the ZAI API it connects to may be DOWN
      const reachable = data.available === true && data.zaiReachable !== false
      if (data.available && !data.zaiReachable) {
        console.log('[ZAI] Local proxy is UP but ZAI API is UNREACHABLE (zaiReachable=false)')
      }
      localProxyCache = { reachable, timestamp: now }
      return reachable
    }
    localProxyCache = { reachable: false, timestamp: now }
    return false
  } catch {
    localProxyCache = { reachable: false, timestamp: now }
    return false
  }
}

/**
 * Check if the ZAI AI service endpoint is actually reachable.
 * Uses a lightweight HTTP check to verify connectivity.
 */
export async function isAIReachable(baseUrl: string): Promise<boolean> {
  const now = Date.now()
  if (healthCache && now - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.reachable
  }

  try {
    const config = getZAIConfig()
    if (!config) {
      healthCache = { reachable: false, timestamp: now }
      return false
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

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

    if (response.ok || response.status < 500) {
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
      // Check both `available` AND `zaiReachable` — the proxy may be UP
      // but the ZAI API it connects to may be DOWN
      const reachable = data.available === true && data.zaiReachable !== false
      if (data.available && !data.zaiReachable) {
        console.log('[ZAI] Proxy is UP but ZAI API is UNREACHABLE (zaiReachable=false)')
      }
      proxyHealthCache = { reachable, timestamp: now }
      return reachable
    }
    proxyHealthCache = { reachable: false, timestamp: now }
    return false
  } catch {
    proxyHealthCache = { reachable: false, timestamp: now }
    return false
  }
}

/**
 * REMOVED v45: getPublicZAIUrl() — this function remapped internal-api.z.ai
 * to api.z.ai/api/v1, but the public API has different auth/format and
 * doesn't work for image editing. On Vercel, we now route through the
 * ai-proxy service (ZAI_PROXY_URL) instead of making direct API calls.
 * The internal-api.z.ai is only accessible from the sandbox network.
 */

/**
 * Get the ZAI config from environment variables or file.
 * Priority:
 * 1. ZAI_BASE_URL + ZAI_API_KEY env vars (works on Vercel and locally)
 * 2. .z-ai-config files (sandbox/local development)
 *
 * On Vercel: env vars are used only by the ai-proxy service (not directly).
 * The ZAI_PROXY_URL routes requests through the ai-proxy.
 */
export function getZAIConfig(): { baseUrl: string; apiKey: string; chatId?: string; token?: string; userId?: string } | null {
  const envBaseUrl = process.env.ZAI_BASE_URL
  const envApiKey = process.env.ZAI_API_KEY
  if (envBaseUrl && envApiKey) {
    // v45: No URL remapping on Vercel — internal-api.z.ai is NOT reachable
    // from Vercel (private IPs), and api.z.ai/api/v1 has incompatible auth.
    // On Vercel, we use ZAI_PROXY_URL to route through the ai-proxy instead.
    // The ZAI_BASE_URL env var is still needed for the ZAI SDK in the ai-proxy,
    // but direct calls from Vercel are NOT made anymore.
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      chatId: process.env.ZAI_CHAT_ID || undefined,
      token: process.env.ZAI_TOKEN || undefined,
      userId: process.env.ZAI_USER_ID || undefined,
    }
  }

  // On Vercel, don't check config files — env vars are required
  if (process.env.VERCEL) {
    console.warn('[ZAI] ZAI_BASE_URL and ZAI_API_KEY environment variables are not set on Vercel. Virtual try-on requires these to be configured.')
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
 * Check if ZAI is properly configured (has baseUrl and apiKey).
 * This is different from reachable — it just checks if config exists.
 */
export function isZAIConfigured(): boolean {
  return getZAIConfig() !== null
}

/**
 * Check if the ZAI AI service is available AND reachable.
 * Strategy chain (optimized — checks cheapest/most-likely first):
 * 1. Local ai-proxy on port 3030 (fastest, sandbox-only)
 * 2. Direct ZAI SDK (if config exists and API is reachable)
 * 3. Proxy to sandbox ai-proxy via ZAI_PROXY_URL (for Vercel)
 * 4. Unavailable
 */
export async function isZAIAvailable(): Promise<{
  available: boolean
  mode: 'ai' | 'proxy' | 'local-proxy' | 'unavailable' | 'sdk-auto'
  reason?: string
}> {
  // Strategy 0: Check local ai-proxy FIRST (cheapest check, most likely to work in sandbox)
  if (!process.env.VERCEL) {
    const localProxyReachable = await isLocalProxyReachable()
    if (localProxyReachable) {
      return { available: true, mode: 'local-proxy', reason: 'Local ai-proxy on port 3030 is available' }
    }
  }

  // Strategy 1: Direct ZAI SDK if config exists and API is reachable
  const config = getZAIConfig()
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

    // Config exists but API is unreachable
    return {
      available: false,
      mode: 'unavailable',
      reason: 'ZAI API is configured but currently unreachable. Check ZAI_BASE_URL and ZAI_API_KEY.',
    }
  }

  // Strategy 2: Try SDK auto-discovery (ZAI.create()) — works in sandbox
  if (!process.env.VERCEL) {
    try {
      const testInstance = await ZAI.create()
      if (testInstance) {
        // Actually verify the API is reachable with a lightweight chat call
        try {
          await Promise.race([
            testInstance.chat.completions.create({
              model: 'glm-4-flash',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 1,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('connectivity check timed out')), 8000)
            ),
          ])
          console.log('[ZAI] SDK auto-discovery succeeded — AI available and reachable')
          return { available: true, mode: 'sdk-auto', reason: 'Using SDK auto-discovery' }
        } catch (connErr) {
          console.log('[ZAI] SDK created but AI service is unreachable:', connErr instanceof Error ? connErr.message : String(connErr))
          return { available: false, mode: 'unavailable', reason: 'AI service is configured but currently unreachable (connection timeout)' }
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
    reason: process.env.VERCEL
      ? 'ZAI_BASE_URL and ZAI_API_KEY environment variables are not set. These are required on Vercel for virtual try-on to work.'
      : 'AI service is not configured and local proxy is unavailable.',
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

  // Strategy 2: SDK auto-discovery — works in sandbox only (not on Vercel)
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

  // Provide a helpful error message based on environment
  if (process.env.VERCEL) {
    throw new Error('AI_STYLE_SERVICE_NOT_CONFIGURED: Set ZAI_BASE_URL and ZAI_API_KEY environment variables on Vercel to enable virtual try-on.')
  }

  throw new Error('AI_STYLE_SERVICE_UNAVAILABLE: No ZAI configuration found. Create a .z-ai-config file or set ZAI_BASE_URL and ZAI_API_KEY environment variables.')
}
