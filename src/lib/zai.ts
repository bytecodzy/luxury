import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Check if the ZAI AI service is available (file config or env vars).
 * Returns { available: boolean, reason?: string }
 */
export function isZAIAvailable(): { available: boolean; reason?: string } {
  // Check environment variables first (works on Vercel/serverless)
  const envBaseUrl = process.env.ZAI_BASE_URL
  const envApiKey = process.env.ZAI_API_KEY
  if (envBaseUrl && envApiKey) {
    return { available: true }
  }

  // Check if config file exists
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
    reason: 'AI service is not configured. The virtual try-on feature requires the AI service to be available. Please try again later or contact support.',
  }
}

/**
 * Create a ZAI SDK instance with environment variable fallback.
 *
 * Priority:
 * 1. Environment variables: ZAI_BASE_URL + ZAI_API_KEY (for Vercel/serverless)
 * 2. File-based config (.z-ai-config in project root, home dir, or /etc)
 *
 * On Vercel, the .z-ai-config file may not exist, so we prefer env vars.
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

  // Fallback: Try the standard file-based config
  try {
    return await ZAI.create()
  } catch (err) {
    console.error('[ZAI] File-based config failed:', err instanceof Error ? err.message : String(err))
  }

  throw new Error(
    'AI_STYLE_SERVICE_UNAVAILABLE'
  )
}
