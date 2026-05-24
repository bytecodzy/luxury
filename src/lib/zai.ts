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
 * Check if the ZAI AI service endpoint is actually reachable.
 */
export async function isAIReachable(baseUrl: string): Promise<boolean> {
  const now = Date.now()
  if (healthCache && now - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.reachable
  }

  try {
    const isInternalIP = baseUrl.includes('172.25.') || baseUrl.includes('192.168.') || baseUrl.includes('10.')
      || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')

    if (isInternalIP) {
      const healthUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      await fetch(`${healthUrl}/dashboard/`, {
        signal: controller.signal,
        headers: { 'User-Agent': '3BOXES-HealthCheck/1.0' },
      })

      clearTimeout(timeout)
      healthCache = { reachable: true, timestamp: now }
      return true
    } else {
      const healthUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '')
      const abcHeader = getAbcHeader(healthUrl)
      const headers: Record<string, string> = { 'User-Agent': '3BOXES-HealthCheck/1.0' }
      if (abcHeader) headers['Abc'] = abcHeader

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${healthUrl}/api/try-on/status`, {
        signal: controller.signal,
        headers,
      })

      clearTimeout(timeout)
      if (response.ok) {
        const data = await response.json()
        healthCache = { reachable: data.available === true, timestamp: now }
        return data.available === true
      }
      healthCache = { reachable: false, timestamp: now }
      return false
    }
  } catch {
    healthCache = { reachable: false, timestamp: now }
    return false
  }
}

/**
 * Check if the sandbox proxy URL is reachable.
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
    const timeout = setTimeout(() => controller.abort(), 5000)

    // The .space-z.ai gateway routes all requests to the sandbox's
    // Next.js server (port 3000) which has the ZAI SDK available.
    // Do NOT add XTransformPort — the external gateway doesn't support it.
    const statusUrl = `${proxyUrl}/api/try-on/status`

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
 */
export async function isZAIAvailable(): Promise<{
  available: boolean
  mode: 'ai' | 'proxy' | 'unavailable'
  reason?: string
}> {
  const config = getZAIConfig()

  if (!config) {
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
      reason: 'AI service is not configured.',
    }
  }

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

  return {
    available: false,
    mode: 'unavailable',
    reason: 'AI service is configured but not reachable, and no proxy is available.',
  }
}

/**
 * Create a ZAI SDK instance.
 */
export async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  const config = getZAIConfig()

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

  // On Vercel, don't try file-based config
  if (process.env.VERCEL) {
    throw new Error('AI_STYLE_SERVICE_UNAVAILABLE')
  }

  // Fallback: Try the standard file-based config (local dev only)
  try {
    return await ZAI.create()
  } catch (err) {
    console.error('[ZAI] File-based config failed:', err instanceof Error ? err.message : String(err))
  }

  throw new Error('AI_STYLE_SERVICE_UNAVAILABLE')
}
