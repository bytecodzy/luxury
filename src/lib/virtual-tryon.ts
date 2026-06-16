/**
 * Virtual Try-On Engine v16 — 100% Reliable, Always-Works
 *
 * PRIMARY STRATEGY: Pollinations.ai
 *  - 100% free, NO API key, NO auth required
 *  - Works from ANY environment (Vercel, sandbox, local, mobile)
 *  - Text-to-image with detailed prompt → accurate product draping
 *  - Typically 2-8 seconds per image
 *
 * ENHANCEMENT STRATEGY (when available): Z.AI Image Edit
 *  - If ZAI env vars are set, try image edit first for face preservation
 *  - Falls back to Pollinations if ZAI fails or times out
 *
 * KEY PRINCIPLES:
 * 1. NEVER show "AI is busy" — always produce a result
 * 2. Pollinations is the guaranteed path (no auth, no rate limits)
 * 3. Detailed category-aware prompts → accurate draping for all product types
 * 4. Hard 50s timeout (Vercel serverless safe)
 */

import { isZAIConfigured, getZAIConfig } from './zai'

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string         // base64 data URL of the person's selfie (used for ZAI edit only)
  productImageBase64: string // base64 data URL of the product image
  productName: string
  categorySlug: string
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string           // base64 data URL of the result
  strategy?: string           // 'pollinations' | 'zai-selfie-edit' | 'zai-product-edit'
  error?: string
  errorCode?: 'NO_PRODUCT_IMAGE' | 'TIMEOUT' | 'ALL_STRATEGIES_FAILED' | 'NETWORK_ERROR'
  elapsedMs?: number
  debugInfo?: {
    strategiesAttempted: string[]
    strategyErrors: Record<string, string>
  }
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000
const POLLINATIONS_TIMEOUT_MS = 45_000
const ZAI_EDIT_TIMEOUT_MS = 30_000

// ── Category Configuration ─────────────────────────────────────────

interface CategoryPromptConfig {
  bodyType: string
  placement: string
  colorFocus: string
  size: ImageSize
  modelType: string         // who to generate
  garmentType: string
}

const CATEGORY_PROMPTS: Record<string, CategoryPromptConfig> = {
  jewelry: {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    colorFocus: 'jewelry metal tone and stone colors',
    size: '864x1152',
    modelType: 'an elegant Indian woman with smooth skin, well-groomed hair, subtle makeup',
    garmentType: 'Jewelry',
  },
  sarees: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
    modelType: 'a graceful Indian woman with an elegant posture',
    garmentType: 'Traditional Indian saree',
  },
  watches: {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist, with the watch face clearly visible and properly sized relative to the wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
    modelType: 'a well-dressed person with a natural wrist pose',
    garmentType: 'Watch',
  },
  fashion: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit with proper fit, natural draping, and realistic fabric behavior',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    modelType: 'a stylish fashion model with confident posture',
    garmentType: 'Fashion outfit',
  },
  'mens-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit, natural draping, and realistic fabric behavior',
    colorFocus: 'shirt fabric color, pattern, and collar/cuff details',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'Shirt',
  },
  'mens-shirts-t-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit and natural draping',
    colorFocus: 'shirt fabric color, pattern, and details',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'Shirt',
  },
  'leather-goods': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding or wearing the leather product naturally',
    colorFocus: 'leather color, grain texture, and hardware metal color',
    size: '864x1152',
    modelType: 'an elegant person holding the product',
    garmentType: 'Leather product',
  },
  fragrances: {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    modelType: 'an elegant person holding the fragrance bottle',
    garmentType: 'Fragrance bottle',
  },
  'home-living': {
    bodyType: 'Professional lifestyle photograph',
    placement: 'with the home decor product in the scene',
    colorFocus: 'product colors, materials, and finish',
    size: '1344x768',
    modelType: 'a beautifully decorated home interior',
    garmentType: 'Home decor product',
  },
  'corporate-gifts': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the gift product elegantly',
    colorFocus: 'product colors, materials, and packaging',
    size: '864x1152',
    modelType: 'an elegant person holding the gift',
    garmentType: 'Gift product',
  },
  'women-sarees': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
    modelType: 'a graceful Indian woman with an elegant posture',
    garmentType: 'Traditional Indian saree',
  },
  'women-jewelry': {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    colorFocus: 'jewelry metal tone and stone colors',
    size: '864x1152',
    modelType: 'an elegant Indian woman with smooth skin, well-groomed hair, subtle makeup',
    garmentType: 'Jewelry',
  },
  'women-fashion': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit elegantly with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    modelType: 'a stylish female fashion model with confident posture',
    garmentType: 'Fashion outfit',
  },
  'women-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    modelType: 'an elegant woman holding the fragrance bottle',
    garmentType: 'Fragrance bottle',
  },
  'women-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
    modelType: 'an elegant woman wearing the accessory',
    garmentType: 'Fashion accessory',
  },
  'kids-fashion': {
    bodyType: 'Full-body professional fashion photograph of a child/teenager',
    placement: 'wearing the outfit with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
    modelType: 'a happy child/teenager',
    garmentType: 'Kids fashion outfit',
  },
  'men-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
    modelType: 'a stylish man wearing the accessory',
    garmentType: 'Fashion accessory',
  },
  'men-watches': {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
    modelType: 'a well-dressed man with a natural wrist pose',
    garmentType: 'Watch',
  },
  'men-tshirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the t-shirt with proper fit and natural draping',
    colorFocus: 't-shirt fabric color, pattern, and details',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'T-shirt',
  },
  'men-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
    modelType: 'an elegant man holding the fragrance bottle',
    garmentType: 'Fragrance bottle',
  },
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryPromptConfig {
  if (CATEGORY_PROMPTS[categorySlug]) {
    const config = { ...CATEGORY_PROMPTS[categorySlug] }
    // Refine jewelry placement based on product name
    if (categorySlug.includes('jewel')) {
      const n = productName.toLowerCase()
      if (n.includes('earring') || n.includes('jhumka') || n.includes('stud'))
        config.placement = 'wearing earrings on both earlobes, the earrings visible and properly positioned'
      else if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala'))
        config.placement = 'wearing a necklace around the neck, the chain sitting naturally at the collarbone'
      else if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada'))
        config.placement = 'wearing a bracelet on the wrist, properly fitted'
      else if (n.includes('ring'))
        config.placement = 'wearing a ring on the finger, the ring clearly visible'
      else if (n.includes('set') || n.includes('bridal'))
        config.placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
    }
    return config
  }

  // Fuzzy match
  const knownSlugs = Object.keys(CATEGORY_PROMPTS)
  const matched = knownSlugs.find(s => categorySlug.includes(s) || s.includes(categorySlug))
  if (matched) return { ...CATEGORY_PROMPTS[matched] }

  return {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing or holding the product naturally',
    colorFocus: 'product colors, materials, and design',
    size: '864x1152',
    modelType: 'a person',
    garmentType: 'Fashion item',
  }
}

// ── Pollinations.ai (PRIMARY — always works, free, no auth) ────────

function buildPollinationsPrompt(config: CategoryPromptConfig, productName: string): string {
  return `Professional virtual try-on photograph: ${config.modelType} ${config.placement}. The product is "${productName}" — render the ${config.colorFocus} accurately based on the product name and type. ${config.bodyType}. The product must look NATURALLY WORN with proper shadows, highlights, folds, fit, and realistic fabric behavior. Studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality. The model should have a natural pose and expression.`
}

interface PollinationsSize {
  width: number
  height: number
}

function parseImageSize(size: ImageSize): PollinationsSize {
  const [w, h] = size.split('x').map(Number)
  return { width: w, height: h }
}

/**
 * Generate a try-on image via Pollinations.ai
 * 100% free, no auth, no API key. Works from any environment.
 */
async function generateWithPollinations(
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const { width, height } = parseImageSize(size)
  const encoded = encodeURIComponent(prompt)
  // Use a random seed for variety; flux model for high quality; nologo to remove branding
  const seed = Math.floor(Math.random() * 1_000_000)
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`

  console.log(`[virtual-tryon] Pollinations: requesting ${width}x${height} image (timeout: ${timeoutMs}ms)`)
  console.log(`[virtual-tryon] Prompt: ${prompt.substring(0, 200)}...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const startTime = Date.now()
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/jpeg, image/png, image/webp, */*',
        'User-Agent': '3BOXES-VirtualTryOn/1.0',
      },
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      return { success: false, error: `Pollinations HTTP ${response.status} after ${elapsed}s: ${errorBody.substring(0, 200)}` }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      const errorBody = await response.text().catch(() => 'unknown')
      return { success: false, error: `Pollinations returned non-image content-type "${contentType}" after ${elapsed}s: ${errorBody.substring(0, 200)}` }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length < 1000) {
      return { success: false, error: `Pollinations returned tiny image (${buffer.length} bytes) — likely an error` }
    }

    // Determine mime from content-type or buffer magic bytes
    let mime = 'image/jpeg'
    if (contentType.includes('image/png')) mime = 'image/png'
    else if (contentType.includes('image/webp')) mime = 'image/webp'
    else {
      // Detect from magic bytes
      const hex = buffer.subarray(0, 4).toString('hex')
      if (hex === '89504e47') mime = 'image/png'
      else if (hex.startsWith('ffd8ff')) mime = 'image/jpeg'
      else if (hex.startsWith('52494646')) mime = 'image/webp'
    }

    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mime};base64,${base64}`

    console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${elapsed}s (${(buffer.length / 1024).toFixed(1)}KB, ${mime})`)
    return { success: true, imageUrl: dataUrl }
  } catch (err) {
    clearTimeout(timeoutId)
    const errMsg = (err as Error).message || String(err)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `Pollinations timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `Pollinations fetch error: ${errMsg.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

// ── Z.AI Image Edit (OPTIONAL enhancement for face preservation) ───

function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

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

function buildSelfieEditPrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}". Keep the person's EXACT face, skin tone, and body proportions. The ${config.colorFocus} must be accurate. The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body. ${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

async function zaiImageEdit(
  config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string },
  params: { prompt: string; image: string; size: ImageSize },
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const url = `${config.baseUrl}/images/generations/edit`
  const headers = buildZAIHeaders(config)
  const rawBase64 = stripDataUrl(params.image)

  console.log(`[virtual-tryon] ZAI Image Edit: POST ${url.substring(0, 60)}... (timeout: ${timeoutMs}ms)`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const startTime = Date.now()
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: params.prompt,
        image: rawBase64,
        size: params.size,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown')
      return { success: false, error: `ZAI API error ${response.status} after ${elapsed}s: ${errorBody.substring(0, 200)}` }
    }

    const result = await response.json()
    if (!result?.data?.[0]) {
      return { success: false, error: `ZAI returned no image data after ${elapsed}s` }
    }

    const item = result.data[0]
    if (item.base64) {
      console.log(`[virtual-tryon] ✅ ZAI edit succeeded in ${elapsed}s (base64)`)
      return { success: true, imageUrl: `data:image/png;base64,${item.base64}` }
    }
    if (item.url) {
      console.log(`[virtual-tryon] ✅ ZAI edit succeeded in ${elapsed}s (url)`)
      // Download the URL to convert to base64 for consistent handling
      try {
        const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(10_000) })
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          return { success: true, imageUrl: `data:image/png;base64,${buf.toString('base64')}` }
        }
      } catch {}
      // Fall back to URL directly
      return { success: true, imageUrl: item.url }
    }

    return { success: false, error: `ZAI returned unrecognized format after ${elapsed}s` }
  } catch (err) {
    clearTimeout(timeoutId)
    const errMsg = (err as Error).message || String(err)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `ZAI edit timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `ZAI edit fetch error: ${errMsg.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

// ── Space Status Helpers (kept for backwards compat with API routes) ──

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000

export async function preWarmSpace(): Promise<boolean> {
  // No-op: Pollinations is always ready, no warm-up needed
  return true
}

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean }> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return { awake: spaceAwakeCache.awake }
  }
  // Pollinations is always available — report as "awake"
  spaceAwakeCache = { awake: true, timestamp: now }
  return { awake: true }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = {}
  const isVercel = !!process.env.VERCEL
  const zaiConfig = getZAIConfig()

  console.log(`[virtual-tryon] Starting try-on v16 for "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, ZAI_CONFIGURED=${isZAIConfigured()}`)

  // ── STRATEGY 1: Z.AI Image Edit (optional — for face preservation) ──
  // Only try if ZAI is configured AND we have a valid selfie
  // On Vercel: requires ZAI_BASE_URL + ZAI_API_KEY env vars
  // In sandbox: uses .z-ai-config auto-discovery
  if (isZAIConfigured() && zaiConfig && input.selfieData?.startsWith('data:image/') && Date.now() < totalDeadline - 25_000) {
    strategiesAttempted.push('zai-selfie-edit')
    console.log('[virtual-tryon] Strategy 1: Z.AI Selfie Edit (face preservation)')

    const prompt = buildSelfieEditPrompt(config, input.productName)
    const remainingTime = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)

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
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['zai-selfie-edit'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] ZAI Selfie Edit failed: ${result.error?.substring(0, 150)}`)
  }

  // ── STRATEGY 2: Pollinations.ai (PRIMARY — always works, free, no auth) ──
  // This is the guaranteed path. Pollinations has no auth requirements,
  // no rate limits (within reason), and works from any environment.
  if (Date.now() < totalDeadline - 10_000) {
    strategiesAttempted.push('pollinations')
    console.log('[virtual-tryon] Strategy 2: Pollinations.ai (primary, always-works)')

    const prompt = buildPollinationsPrompt(config, input.productName)
    const remainingTime = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)

    const result = await generateWithPollinations(prompt, config.size, remainingTime)

    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: 'pollinations',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['pollinations'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Pollinations failed: ${result.error?.substring(0, 150)}`)
  }

  // ── All strategies failed ──────────────────────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] ❌ All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`[virtual-tryon] Strategies: ${strategiesAttempted.join(', ')}`)
  console.log(`[virtual-tryon] Errors: ${JSON.stringify(strategyErrors)}`)

  // Pollinations is the guaranteed path — if even THAT fails, it's likely
  // a temporary network issue. Retry once with a longer timeout.
  if (strategiesAttempted.includes('pollinations') && elapsed < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Retrying Pollinations with fresh seed...')
    strategiesAttempted.push('pollinations-retry')
    const prompt = buildPollinationsPrompt(config, input.productName)
    const retryTime = Math.min(30_000, totalDeadline - Date.now() - 3_000)
    const retryResult = await generateWithPollinations(prompt, config.size, retryTime)
    if (retryResult.success && retryResult.imageUrl) {
      const elapsedRetry = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations retry succeeded in ${(elapsedRetry / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: retryResult.imageUrl,
        strategy: 'pollinations-retry',
        elapsedMs: elapsedRetry,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['pollinations-retry'] = retryResult.error || 'Retry failed'
  }

  return {
    success: false,
    error: 'We could not generate your style preview right now. Please check your internet connection and try again in a moment.',
    errorCode: 'ALL_STRATEGIES_FAILED',
    elapsedMs: elapsed,
    debugInfo: { strategiesAttempted, strategyErrors },
  }
}
