import ZAI from 'z-ai-web-dev-sdk'

/**
 * Create a ZAI SDK instance with environment variable fallback.
 *
 * Priority:
 * 1. File-based config (.z-ai-config in project root, home dir, or /etc)
 * 2. Environment variables: ZAI_BASE_URL + ZAI_API_KEY (for Vercel/serverless)
 *
 * On Vercel, the .z-ai-config file may not exist, so we fall back to
 * environment variables that can be set in the Vercel dashboard.
 */
export async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  // Try the standard file-based config first
  try {
    return await ZAI.create()
  } catch {
    // Fallback: construct config from environment variables (for Vercel/serverless)
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
      return new ZAI(config) as InstanceType<typeof ZAI>
    }
    throw new Error('AI service not configured. Set ZAI_BASE_URL and ZAI_API_KEY environment variables or create .z-ai-config file.')
  }
}
