/**
 * Virtual Try-On Engine v15 — Vercel-Production-Ready
 *
 * CRITICAL FIXES from v14:
 * 1. Replaced ZAI SDK calls with DIRECT fetch() + AbortSignal.timeout()
 *    - SDK had NO timeout control → hangs on Vercel
 *    - SDK's downloadImageAsBase64() had no timeout → hangs on unreachable URLs
 * 2. Strip data URL prefix before sending to API (raw base64 only)
 * 3. Pre-flight ZAI connectivity check with 8s timeout
 * 4. On Vercel: try ONE ZAI strategy with full 45s budget (no sequential waste)
 * 5. Detailed error logging for Vercel diagnostics
 *
 * STRATEGY ORDER (Vercel-optimized):
 * 1. ZAI Selfie Edit (face preserved, best for Vercel) — 45s budget
 * 2. If time remains → ZAI Product Edit — remaining time
 * 3. If time remains → IDM-VTON — remaining time
 */

import { performTryOn as hfPerformTryOn, checkSpaceStatus } from './huggingface-tryon'
import { isZAIConfigured, getZAIConfig } from './zai'
import { externalTryOn, isExternalAIAvailable } from './external-ai'
import type { ExternalTryOnResult } from './external-ai'

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string         // base64 data URL of the person's selfie
  productImageBase64: string // base64 data URL of the product/garment image
  productName: string
  categorySlug: string
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string           // base64 data URL of the result
  strategy?: string           // 'idm-vton' | 'zai-product-edit' | 'zai-selfie-edit' | 'zai-generate'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'SERVICE_BUSY' | 'NO_PRODUCT_IMAGE' | 'ZAI_NOT_CONFIGURED' | 'EXTERNAL_AI_FAILED'
  elapsedMs?: number
  debugInfo?: {
    strategiesAttempted: string[]
    strategyErrors: Record<string, string>
    healthCheck: { zaiReachable: boolean; spaceAwake: boolean }
  }
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000        // 50s hard limit (10s buffer for Vercel 60s)
const VERCEL_PRIMARY_STRATEGY_MS = 45_000 // 45s for the primary ZAI strategy on Vercel
const HEALTH_CHECK_TIMEOUT_MS = 8_000  // 8s for ZAI health check
const IDM_VTON_TIMEOUT_MS = 40_000     // 40s for IDM-VTON

// ── Category Configuration ─────────────────────────────────────────

interface CategoryPromptConfig {
  bodyType: string
  placement: string
  colorFocus: string
  size: ImageSize
  garmentType: string
}

const CATEGORY_PROMPTS: Record<string, CategoryPromptConfig> = {
  jewelry: {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part — necklace around the neck, earrings on the earlobes, bracelet on the wrist, ring on the finger',
    colorFocus: 'jewelry metal tone (gold/silver/rose-gold) and stone colors',
    size: '864x1152',
    garmentType: 'Jewelry',
  },
  sarees: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
    garmentType: 'Traditional Indian saree',
  },
  watches: {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist, with the watch face visible and properly sized relative to the wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
    garmentType: 'Watch',
  },
  fashion: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit with proper fit, natural draping, and realistic fabric behavior — the garment should follow the contours of the body naturally',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    garmentType: 'Fashion outfit',
  },
  'mens-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit, natural draping, and realistic fabric behavior',
    colorFocus: 'shirt fabric color, pattern, and collar/cuff details',
    size: '768x1344',
    garmentType: 'Shirt',
  },
  'mens-shirts-t-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit and natural draping',
    colorFocus: 'shirt fabric color, pattern, and details',
    size: '768x1344',
    garmentType: 'Shirt',
  },
  'leather-goods': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding or wearing the leather product naturally',
    colorFocus: 'leather color, grain texture, and hardware metal color',
    size: '864x1152',
    garmentType: 'Leather product',
  },
  fragrances: {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    garmentType: 'Fragrance bottle',
  },
  'home-living': {
    bodyType: 'Professional lifestyle photograph',
    placement: 'with the home decor product in the scene',
    colorFocus: 'product colors, materials, and finish',
    size: '1344x768',
    garmentType: 'Home decor product',
  },
  'corporate-gifts': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the gift product elegantly',
    colorFocus: 'product colors, materials, and packaging',
    size: '864x1152',
    garmentType: 'Gift product',
  },
  'women-sarees': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
    garmentType: 'Traditional Indian saree',
  },
  'women-jewelry': {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    colorFocus: 'jewelry metal tone and stone colors',
    size: '864x1152',
    garmentType: 'Jewelry',
  },
  'women-fashion': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit elegantly with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    garmentType: 'Fashion outfit',
  },
  'women-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    garmentType: 'Fragrance bottle',
  },
  'women-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
    garmentType: 'Fashion accessory',
  },
  'kids-fashion': {
    bodyType: 'Full-body professional fashion photograph of a child/teenager',
    placement: 'wearing the outfit with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    garmentType: 'Kids fashion outfit',
  },
  'men-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
    garmentType: 'Fashion accessory',
  },
  'men-watches': {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
    garmentType: 'Watch',
  },
  'men-tshirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the t-shirt with proper fit and natural draping',
    colorFocus: 't-shirt fabric color, pattern, and details',
    size: '768x1344',
    garmentType: 'T-shirt',
  },
  'men-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    garmentType: 'Fragrance bottle',
  },
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryPromptConfig {
  if (CATEGORY_PROMPTS[categorySlug]) {
    const config = { ...CATEGORY_PROMPTS[categorySlug] }
    if (categorySlug.includes('jewel')) {
      const n = productName.toLowerCase()
      if (n.includes('earring') || n.includes('jhumka') || n.includes('stud'))
        config.placement = 'wearing earrings on both earlobes'
      else if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala'))
        config.placement = 'wearing a necklace around the neck, the chain sitting naturally at the collarbone'
      else if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada'))
        config.placement = 'wearing a bracelet on the wrist'
      else if (n.includes('ring'))
        config.placement = 'wearing a ring on the finger'
      else if (n.includes('set') || n.includes('bridal'))
        config.placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
    }
    return config
  }

  const knownSlugs = Object.keys(CATEGORY_PROMPTS)
  const matched = knownSlugs.find(s => categorySlug.includes(s) || s.includes(categorySlug))
  if (matched) return { ...CATEGORY_PROMPTS[matched] }

  return {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing or holding the product naturally',
    colorFocus: 'product colors, materials, and design',
    size: '864x1152',
    garmentType: 'Fashion item',
  }
}

// ── Direct ZAI API Helpers ─────────────────────────────────────────
// These replace the ZAI SDK calls with direct fetch() that has proper
// AbortSignal.timeout() control — critical for Vercel serverless.

/**
 * Strip data URL prefix to get raw base64.
 * ZAI API expects raw base64, not data URLs.
 */
function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

/**
 * Build headers for ZAI API requests.
 */
function buildZAIHeaders(config: { apiKey: string; chatId?: string; userId?: string; token?: string }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    'X-Z-AI-From': 'Z',
  }
  if (config.chatId) headers['X-Chat-Id'] = config.chatId
  if (config.userId) headers['X-User-Id'] = config.userId
  if (config.token) headers['X-Token'] = config.token
  return headers
}

/**
 * Quick connectivity check: does the ZAI API respond at all?
 * Uses a lightweight models endpoint call.
 */
async function isZAIReachable(config: { baseUrl: string; apiKey: string }, timeoutMs = HEALTH_CHECK_TIMEOUT_MS): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
    return { reachable: response.status < 500, status: response.status }
  } catch (err) {
    const errMsg = (err as Error).message || String(err)
    return { reachable: false, error: errMsg.substring(0, 200) }
  }
}

/**
 * Direct ZAI Image Edit API call with proper timeout.
 * This replaces `zai.images.generations.edit()` — the SDK had no timeout control.
 */
async function zaiImageEdit(
  config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string },
  params: { prompt: string; image: string; size: ImageSize },
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; status?: number }> {
  const url = `${config.baseUrl}/images/generations/edit`
  const headers = buildZAIHeaders(config)

  // Strip data URL prefix — ZAI API expects raw base64
  const rawBase64 = stripDataUrl(params.image)

  const body = {
    prompt: params.prompt,
    image: rawBase64,
    size: params.size,
  }

  console.log(`[virtual-tryon] Direct ZAI Image Edit: POST ${url.substring(0, 60)}... (timeout: ${timeoutMs}ms, imageBase64Length: ${rawBase64.length})`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const startTime = Date.now()
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown error')
      const errMsg = `ZAI API error ${response.status} after ${elapsed}s: ${errorBody.substring(0, 300)}`
      console.log(`[virtual-tryon] ${errMsg}`)
      return { success: false, error: errMsg, status: response.status }
    }

    const result = await response.json()
    return processZAIResponse(result, elapsed)
  } catch (err) {
    clearTimeout(timeoutId)
    const errMsg = (err as Error).message || String(err)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `ZAI Image Edit timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `ZAI Image Edit fetch error: ${errMsg.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

/**
 * Direct ZAI Image Generation API call with proper timeout.
 * This replaces `zai.images.generations.create()`.
 */
async function zaiImageGenerate(
  config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string },
  params: { prompt: string; size: ImageSize; model?: string },
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; status?: number }> {
  const url = `${config.baseUrl}/images/generations`
  const headers = buildZAIHeaders(config)

  const body = {
    model: params.model || 'cogview-4-plus',
    prompt: params.prompt,
    size: params.size,
  }

  console.log(`[virtual-tryon] Direct ZAI Image Generate: POST ${url.substring(0, 60)}... (timeout: ${timeoutMs}ms)`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const startTime = Date.now()
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown error')
      const errMsg = `ZAI Generate API error ${response.status} after ${elapsed}s: ${errorBody.substring(0, 300)}`
      console.log(`[virtual-tryon] ${errMsg}`)
      return { success: false, error: errMsg, status: response.status }
    }

    const result = await response.json()
    return processZAIResponse(result, elapsed)
  } catch (err) {
    clearTimeout(timeoutId)
    const errMsg = (err as Error).message || String(err)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `ZAI Generate timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `ZAI Generate fetch error: ${errMsg.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

/**
 * Process ZAI API response — extract image from base64 or URL.
 */
function processZAIResponse(result: any, elapsed: string): { success: boolean; imageUrl?: string; error?: string } {
  if (!result) {
    return { success: false, error: 'ZAI returned empty response' }
  }

  // Check for error in response body
  if (result.error) {
    const errMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error).substring(0, 300)
    return { success: false, error: `ZAI API body error: ${errMsg}` }
  }

  // Check for content_filter blocks
  if (result.content_filter?.some((f: any) => f.level >= 2)) {
    return { success: false, error: 'ZAI content filter blocked the request' }
  }

  if (!result.data?.[0]) {
    return { success: false, error: `ZAI returned no image data after ${elapsed}s: ${JSON.stringify(result).substring(0, 200)}` }
  }

  const item = result.data[0]

  // Prefer base64 (already downloaded by SDK or returned directly)
  if (item.base64) {
    console.log(`[virtual-tryon] Got base64 image from ZAI after ${elapsed}s (length: ${item.base64.length})`)
    return { success: true, imageUrl: `data:image/png;base64,${item.base64}` }
  }

  // Fall back to URL
  if (item.url) {
    console.log(`[virtual-tryon] Got URL from ZAI after ${elapsed}s: ${item.url.substring(0, 80)}`)
    // Return the URL directly — the frontend can display it
    // Don't try to download it on Vercel (could hang)
    return { success: true, imageUrl: item.url }
  }

  return { success: false, error: `ZAI returned unrecognized data format: ${JSON.stringify(item).substring(0, 200)}` }
}

// ── Prompt Builders ────────────────────────────────────────────────

function buildSelfieEditPrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}". Keep the person's EXACT face, skin tone, and body proportions. The ${config.colorFocus} must be accurate. The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body. ${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

function buildProductEditPrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: Transform this product image into a photo of a person ${config.placement}. The product is "${productName}" — the colors, materials, and design MUST match the original product image exactly. The product should look NATURALLY WORN — proper fit, realistic fabric behavior, natural shadows and highlights. ${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

function buildGeneratePrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: A professional model ${config.placement}. The product is "${productName}". The ${config.colorFocus} must be rendered accurately. The product must look NATURALLY WORN — proper shadows, highlights, folds, and fit. ${config.bodyType}. Studio-quality, 8K detail.`
}

// ── Space Status Helpers ────────────────────────────────────────────

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000

async function isSpaceAwake(): Promise<boolean> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return spaceAwakeCache.awake
  }
  try {
    const awake = await Promise.race([
      checkSpaceStatus(),
      new Promise<false>(r => setTimeout(() => r(false), 4_000)),
    ])
    spaceAwakeCache = { awake, timestamp: Date.now() }
    return awake
  } catch {
    spaceAwakeCache = { awake: false, timestamp: now }
    return false
  }
}

export async function preWarmSpace(): Promise<boolean> {
  try {
    const awake = await isSpaceAwake()
    if (!awake) {
      fetch('https://yisol-idm-vton.hf.space/', {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {})
    }
    return awake
  } catch {
    return false
  }
}

export function getCachedSpaceStatus(): { awake: boolean; timestamp: number } | null {
  return spaceAwakeCache
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = []
  const isVercel = !!process.env.VERCEL
  const zaiConfig = getZAIConfig()

  console.log(`[virtual-tryon] Starting try-on v15 for "${input.productName}" (${input.categorySlug})`)
  console.log(`[virtual-tryon] Environment: VERCEL=${isVercel}, ZAI_CONFIGURED=${isZAIConfigured()}`)

  // Vercel diagnostic: log ZAI config details
  if (isVercel && zaiConfig) {
    console.log(`[virtual-tryon] Vercel ZAI config: baseUrl=${zaiConfig.baseUrl}, apiKeySet=${!!zaiConfig.apiKey}, apiKeyPrefix=${zaiConfig.apiKey?.substring(0, 8)}...`)
  } else if (isVercel && !zaiConfig) {
    console.log(`[virtual-tryon] Vercel ZAI NOT CONFIGURED — ZAI_BASE_URL and ZAI_API_KEY env vars required`)
  }

  // ── Step 1: Quick ZAI connectivity check (skip on Vercel to save time) ──
  let zaiReachable = isZAIConfigured()
  if (!isVercel && zaiConfig) {
    const check = await isZAIReachable(zaiConfig)
    zaiReachable = check.reachable
    console.log(`[virtual-tryon] ZAI health check: reachable=${check.reachable}, status=${check.status}, error=${check.error || 'none'}`)
  } else if (isVercel && zaiConfig) {
    // On Vercel, do a quick 5s check to avoid wasting 45s on an unreachable API
    const check = await isZAIReachable(zaiConfig, 5_000)
    zaiReachable = check.reachable
    console.log(`[virtual-tryon] Vercel ZAI quick check: reachable=${check.reachable}, status=${check.status}, error=${check.error || 'none'}`)
    if (!check.reachable && check.status) {
      // Got a response but it's an error status — API is reachable but something's wrong
      console.log(`[virtual-tryon] ZAI responded with status ${check.status} — attempting strategies anyway`)
      zaiReachable = true // Still try — the edit endpoint might work even if /models doesn't
    }
  }

  // ── VERCEL PATH ──────────────────────────────────────────────────
  if (isVercel) {
    // Strategy V1: ZAI Selfie Edit — the primary strategy for Vercel
    // Give it the full 45s budget instead of splitting across multiple strategies
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 10_000) {
      strategiesAttempted.push('zai-selfie-edit')
      console.log('[virtual-tryon] Strategy V1: ZAI Selfie Edit (Vercel primary)')

      const prompt = buildSelfieEditPrompt(config, input.productName)
      const remainingTime = Math.min(VERCEL_PRIMARY_STRATEGY_MS, totalDeadline - Date.now() - 5_000)

      const result = await zaiImageEdit(zaiConfig, {
        prompt,
        image: input.selfieData,
        size: config.size,
      }, remainingTime)

      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI Selfie Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result.imageUrl,
          strategy: 'zai-selfie-edit',
          elapsedMs: elapsed,
          debugInfo: {
            strategiesAttempted,
            strategyErrors,
            healthCheck: { zaiReachable, spaceAwake: false },
          },
        }
      }
      strategyErrors['zai-selfie-edit'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] ZAI Selfie Edit failed: ${result.error?.substring(0, 200)}`)
    }

    // Strategy V2: ZAI Product Edit (if time remains)
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 15_000) {
      strategiesAttempted.push('zai-product-edit')
      console.log('[virtual-tryon] Strategy V2: ZAI Product Edit (Vercel)')

      const prompt = buildProductEditPrompt(config, input.productName)
      const remainingTime = Math.min(30_000, totalDeadline - Date.now() - 5_000)

      const result = await zaiImageEdit(zaiConfig, {
        prompt,
        image: input.productImageBase64,
        size: config.size,
      }, remainingTime)

      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI Product Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result.imageUrl,
          strategy: 'zai-product-edit',
          elapsedMs: elapsed,
          debugInfo: {
            strategiesAttempted,
            strategyErrors,
            healthCheck: { zaiReachable, spaceAwake: false },
          },
        }
      }
      strategyErrors['zai-product-edit'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] ZAI Product Edit failed: ${result.error?.substring(0, 200)}`)
    }

    // Strategy V3: ZAI Text-to-Image (if time remains)
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 12_000) {
      strategiesAttempted.push('zai-generate')
      console.log('[virtual-tryon] Strategy V3: ZAI Text-to-Image (Vercel)')

      const prompt = buildGeneratePrompt(config, input.productName)
      const remainingTime = Math.min(25_000, totalDeadline - Date.now() - 5_000)

      const result = await zaiImageGenerate(zaiConfig, {
        prompt,
        size: config.size,
      }, remainingTime)

      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI Text-to-Image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result.imageUrl,
          strategy: 'zai-generate',
          elapsedMs: elapsed,
          debugInfo: {
            strategiesAttempted,
            strategyErrors,
            healthCheck: { zaiReachable, spaceAwake: false },
          },
        }
      }
      strategyErrors['zai-generate'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] ZAI Text-to-Image failed: ${result.error?.substring(0, 200)}`)
    }

    // Strategy V4: IDM-VTON (only if time remains)
    if (Date.now() < totalDeadline - 20_000) {
      strategiesAttempted.push('idm-vton-vercel')
      console.log('[virtual-tryon] Strategy V4: IDM-VTON (Vercel, if time remains)')
      try {
        const idmDeadline = Math.min(25_000, totalDeadline - Date.now())
        const result = await Promise.race([
          hfPerformTryOn({
            selfieData: input.selfieData,
            productImageBase64: input.productImageBase64,
            productName: input.productName,
            categorySlug: input.categorySlug,
          }),
          new Promise<TryOnResult>(r => setTimeout(() => r({
            success: false,
            error: 'IDM-VTON timed out',
            errorCode: 'TIMEOUT',
            elapsedMs: Date.now() - totalStart,
          }), idmDeadline)),
        ])

        if (result.success && result.imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ IDM-VTON succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            ...result,
            strategy: 'idm-vton',
            elapsedMs: elapsed,
            debugInfo: {
              strategiesAttempted,
              strategyErrors,
              healthCheck: { zaiReachable, spaceAwake: false },
            },
          }
        }
        strategyErrors['idm-vton-vercel'] = result.error || 'IDM-VTON failed'
      } catch (err) {
        strategyErrors['idm-vton-vercel'] = (err as Error).message || String(err)
      }
    }

    // Strategy V5: External AI (if configured and time remains)
    const extAvail = isExternalAIAvailable()
    if ((extAvail.replicate || extAvail.openai) && Date.now() < totalDeadline - 15_000) {
      strategiesAttempted.push('external-ai')
      console.log('[virtual-tryon] Strategy V5: External AI (Vercel)')
      try {
        const result = await Promise.race<ExternalTryOnResult>([
          externalTryOn({
            selfieData: input.selfieData,
            productImageBase64: input.productImageBase64,
            productName: input.productName,
            categorySlug: input.categorySlug,
          }),
          new Promise<ExternalTryOnResult>(r => setTimeout(() => r({ success: false, strategy: 'external-ai', error: 'External AI timed out' }), Math.min(20_000, totalDeadline - Date.now()))),
        ])
        if (result.success && result.imageUrl) {
          const elapsed = Date.now() - totalStart
          return {
            success: true,
            imageUrl: result.imageUrl,
            strategy: result.strategy,
            elapsedMs: elapsed,
            debugInfo: {
              strategiesAttempted,
              strategyErrors,
              healthCheck: { zaiReachable, spaceAwake: false },
            },
          }
        }
        strategyErrors['external-ai'] = result.error || 'External AI failed'
      } catch (err) {
        strategyErrors['external-ai'] = (err as Error).message || String(err)
      }
    }

  } else {
    // ── NON-VERCEL PATH: IDM-VTON first, then ZAI strategies ──────
    const spaceAwake = await isSpaceAwake()
    console.log(`[virtual-tryon] IDM-VTON Space: ${spaceAwake ? 'awake' : 'sleeping'}`)

    // Strategy 1: IDM-VTON (if Space is awake)
    if (spaceAwake && Date.now() < totalDeadline - 15_000) {
      strategiesAttempted.push('idm-vton')
      console.log('[virtual-tryon] Strategy 1: IDM-VTON (Space is awake)')
      try {
        const idmDeadline = Math.min(IDM_VTON_TIMEOUT_MS, totalDeadline - Date.now())
        const result = await Promise.race([
          hfPerformTryOn({
            selfieData: input.selfieData,
            productImageBase64: input.productImageBase64,
            productName: input.productName,
            categorySlug: input.categorySlug,
          }),
          new Promise<TryOnResult>(r => setTimeout(() => r({
            success: false,
            error: 'IDM-VTON timed out',
            errorCode: 'TIMEOUT',
            elapsedMs: Date.now() - totalStart,
          }), idmDeadline)),
        ])

        if (result.success && result.imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ IDM-VTON succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return { ...result, strategy: 'idm-vton', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors, healthCheck: { zaiReachable, spaceAwake } } }
        }
        strategyErrors['idm-vton'] = result.error || 'IDM-VTON failed'
      } catch (err) {
        strategyErrors['idm-vton'] = (err as Error).message || String(err)
      }
    }

    // Strategy 2: ZAI Selfie Edit
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 12_000) {
      strategiesAttempted.push('zai-selfie-edit')
      console.log('[virtual-tryon] Strategy 2: ZAI Selfie Edit')
      const prompt = buildSelfieEditPrompt(config, input.productName)
      const remainingTime = Math.min(30_000, totalDeadline - Date.now() - 5_000)
      const result = await zaiImageEdit(zaiConfig, { prompt, image: input.selfieData, size: config.size }, remainingTime)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        return { success: true, imageUrl: result.imageUrl, strategy: 'zai-selfie-edit', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors, healthCheck: { zaiReachable, spaceAwake } } }
      }
      strategyErrors['zai-selfie-edit'] = result.error || 'No image returned'
    }

    // Strategy 3: ZAI Product Edit
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 12_000) {
      strategiesAttempted.push('zai-product-edit')
      console.log('[virtual-tryon] Strategy 3: ZAI Product Edit')
      const prompt = buildProductEditPrompt(config, input.productName)
      const remainingTime = Math.min(30_000, totalDeadline - Date.now() - 5_000)
      const result = await zaiImageEdit(zaiConfig, { prompt, image: input.productImageBase64, size: config.size }, remainingTime)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        return { success: true, imageUrl: result.imageUrl, strategy: 'zai-product-edit', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors, healthCheck: { zaiReachable, spaceAwake } } }
      }
      strategyErrors['zai-product-edit'] = result.error || 'No image returned'
    }

    // Strategy 4: ZAI Text-to-Image
    if (isZAIConfigured() && zaiConfig && Date.now() < totalDeadline - 10_000) {
      strategiesAttempted.push('zai-generate')
      console.log('[virtual-tryon] Strategy 4: ZAI Text-to-Image')
      const prompt = buildGeneratePrompt(config, input.productName)
      const remainingTime = Math.min(25_000, totalDeadline - Date.now() - 5_000)
      const result = await zaiImageGenerate(zaiConfig, { prompt, size: config.size }, remainingTime)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        return { success: true, imageUrl: result.imageUrl, strategy: 'zai-generate', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors, healthCheck: { zaiReachable, spaceAwake } } }
      }
      strategyErrors['zai-generate'] = result.error || 'No image returned'
    }

    // Strategy 5: External AI
    const extAvail = isExternalAIAvailable()
    if ((extAvail.replicate || extAvail.openai) && Date.now() < totalDeadline - 15_000) {
      strategiesAttempted.push('external-ai')
      console.log('[virtual-tryon] Strategy 5: External AI')
      try {
        const result = await Promise.race<ExternalTryOnResult>([
          externalTryOn({
            selfieData: input.selfieData,
            productImageBase64: input.productImageBase64,
            productName: input.productName,
            categorySlug: input.categorySlug,
          }),
          new Promise<ExternalTryOnResult>(r => setTimeout(() => r({ success: false, strategy: 'external-ai', error: 'External AI timed out' }), Math.min(20_000, totalDeadline - Date.now()))),
        ])
        if (result.success && result.imageUrl) {
          const elapsed = Date.now() - totalStart
          return { success: true, imageUrl: result.imageUrl, strategy: result.strategy, elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors, healthCheck: { zaiReachable, spaceAwake } } }
        }
        strategyErrors['external-ai'] = result.error || 'External AI failed'
      } catch (err) {
        strategyErrors['external-ai'] = (err as Error).message || String(err)
      }
    }
  }

  // ── All strategies failed ──────────────────────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] ❌ All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`[virtual-tryon] Strategies attempted: ${strategiesAttempted.join(', ')}`)
  console.log(`[virtual-tryon] Strategy errors: ${JSON.stringify(strategyErrors)}`)

  // Determine the most useful error message
  let errorMessage = 'AI try-on is currently unavailable. Please try again in a few minutes.'
  let errorCode: TryOnResult['errorCode'] = 'ALL_STRATEGIES_FAILED'

  if (!isZAIConfigured()) {
    errorMessage = 'AI try-on service is not configured. ZAI_BASE_URL and ZAI_API_KEY environment variables are required.'
    errorCode = 'ZAI_NOT_CONFIGURED'
  } else if (Object.values(strategyErrors).some(e => e.includes('timed out') || e.includes('Timeout'))) {
    errorMessage = 'AI service is taking too long. Please try again in a few minutes.'
    errorCode = 'TIMEOUT'
  } else if (Object.values(strategyErrors).some(e => e.includes('content filter'))) {
    errorMessage = 'The image could not be processed due to content restrictions. Please try a different image.'
    errorCode = 'ALL_STRATEGIES_FAILED'
  }

  return {
    success: false,
    error: errorMessage,
    errorCode,
    elapsedMs: elapsed,
    debugInfo: {
      strategiesAttempted,
      strategyErrors,
      healthCheck: { zaiReachable, spaceAwake: false },
    },
  }
}

// Re-export for compatibility
export { checkSpaceStatus as checkIDMVTONSpaceStatus } from './huggingface-tryon'
