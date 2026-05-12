import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Check if the ZAI AI service is available (file config or env vars).
 * Returns { available: boolean, reason?: string }
 */
export function isZAIAvailable(): { available: boolean; reason?: string } {
  // On Vercel, only trust environment variables — the .z-ai-config file
  // may be present in the deployment but points to an internal IP
  // that is not reachable from Vercel's servers.
  const isVercel = !!process.env.VERCEL

  // Check environment variables first (works everywhere)
  const envBaseUrl = process.env.ZAI_BASE_URL
  const envApiKey = process.env.ZAI_API_KEY
  if (envBaseUrl && envApiKey) {
    return { available: true }
  }

  // On Vercel, don't check config files — they may point to unreachable internal IPs
  if (isVercel) {
    return {
      available: false,
      reason: 'AI service is not configured via environment variables on this deployment. Using client-side Style Preview.',
    }
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
          return { available: true }
        }
      } catch {
        // Continue to next path
      }
    }
  } catch {
    // fs not available (edge runtime)
  }

  return {
    available: false,
    reason: 'AI service is not configured. The Style Preview feature will use client-side compositing instead.',
  }
}

/**
 * Create a ZAI SDK instance with environment variable fallback.
 *
 * Priority:
 * 1. Environment variables: ZAI_BASE_URL + ZAI_API_KEY (for Vercel/serverless)
 * 2. File-based config (.z-ai-config in project root, home dir, or /etc)
 *
 * On Vercel, the .z-ai-config file may exist but points to an
 * unreachable internal IP, so only env vars are trusted.
 */
export async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  // Try environment variables first (works on Vercel/serverless)
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY
  if (baseUrl && apiKey) {
    const config = {
      baseUrl,
      apiKey,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
    try {
      return new ZAI(config) as InstanceType<typeof ZAI>
    } catch (err) {
      console.error('[ZAI] Failed to create from env vars:', err)
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
