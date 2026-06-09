/**
 * Virtual Try-On Engine v10 — Direct API, Zero-VLM, Vercel-Ready
 *
 * DESIGN PRINCIPLES:
 * 1. ZAI Image Edit is PRIMARY — most reliable, preserves face
 * 2. IDM-VTON is SECONDARY — best quality garment draping, but space sleeps
 * 3. ZAI Text-to-Image is TERTIARY — no face preservation, last resort
 * 4. NO VLM calls — eliminates 6-12s latency and multiple failure points
 * 5. Direct API calls — bypasses ZAI SDK for maximum Vercel compatibility
 * 6. Category-aware prompts built from product name + category config
 * 7. 50-second hard server timeout — never exceed Vercel's 60s limit
 * 8. Works on sandbox (via .z-ai-config) and Vercel (via env vars)
 */

import { performTryOn as hfPerformTryOn, checkSpaceStatus } from './huggingface-tryon'
import { getZAIConfig, isZAIConfigured } from './zai'

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
  strategy?: string           // 'zai-edit' | 'idm-vton' | 'zai-generate'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'SERVICE_BUSY' | 'NO_PRODUCT_IMAGE' | 'ZAI_NOT_CONFIGURED'
  elapsedMs?: number
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000      // 50s hard limit (10s buffer for Vercel 60s)
const ZAI_EDIT_TIMEOUT_MS = 30_000   // 30s for ZAI image edit
const IDM_VTON_TIMEOUT_MS = 35_000   // 35s for IDM-VTON
const ZAI_GENERATE_TIMEOUT_MS = 25_000  // 25s for ZAI text-to-image

// ── Direct AI API Calls ────────────────────────────────────────────
// Bypasses the ZAI SDK entirely for maximum Vercel compatibility.
// Uses the same credentials from getZAIConfig() (env vars or .z-ai-config).

function buildAuthHeaders(): Record<string, string> {
  const config = getZAIConfig()
  if (!config) return {}
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': config.chatId || '',
    'X-User-Id': config.userId || '',
    'X-Token': config.token || '',
  }
}

async function directAIImageEdit(
  selfieDataUrl: string,
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
): Promise<string | null> {
  const config = getZAIConfig()
  if (!config) return null

  try {
    const url = `${config.baseUrl}/images/generations/edit`
    const headers = buildAuthHeaders()
    const body = JSON.stringify({
      prompt,
      images: [{ url: selfieDataUrl }],
      size,
    })

    console.log(`[virtual-tryon] Direct API call: POST ${url} (timeout: ${timeoutMs}ms)`)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`[virtual-tryon] Image edit API returned ${response.status}: ${errorText.substring(0, 200)}`)
      return null
    }

    const result = await response.json()

    // Handle base64 response
    if (result.data?.[0]?.base64) {
      return `data:image/png;base64,${result.data[0].base64}`
    }

    // Handle URL response — download and convert to base64
    if (result.data?.[0]?.url) {
      try {
        const imgRes = await fetch(result.data[0].url, { signal: AbortSignal.timeout(10_000) })
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ct = imgRes.headers.get('content-type') || 'image/png'
          return `data:${ct.split(';')[0]};base64,${buf.toString('base64')}`
        }
      } catch {}
      return result.data[0].url
    }

    console.error('[virtual-tryon] Image edit API returned unexpected format:', JSON.stringify(result).substring(0, 200))
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[virtual-tryon] Direct image edit failed:', msg.substring(0, 200))
    return null
  }
}

async function directAIImageGenerate(
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
): Promise<string | null> {
  const config = getZAIConfig()
  if (!config) return null

  try {
    const url = `${config.baseUrl}/images/generations`
    const headers = buildAuthHeaders()
    const body = JSON.stringify({
      model: 'cogview-4-plus',
      prompt,
      size,
    })

    console.log(`[virtual-tryon] Direct API call: POST ${url} (timeout: ${timeoutMs}ms)`)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`[virtual-tryon] Image generate API returned ${response.status}: ${errorText.substring(0, 200)}`)
      return null
    }

    const result = await response.json()

    // Handle base64 response
    if (result.data?.[0]?.base64) {
      return `data:image/png;base64,${result.data[0].base64}`
    }

    // Handle URL response
    if (result.data?.[0]?.url) {
      try {
        const imgRes = await fetch(result.data[0].url, { signal: AbortSignal.timeout(10_000) })
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const ct = imgRes.headers.get('content-type') || 'image/png'
          return `data:${ct.split(';')[0]};base64,${buf.toString('base64')}`
        }
      } catch {}
      return result.data[0].url
    }

    console.error('[virtual-tryon] Image generate API returned unexpected format:', JSON.stringify(result).substring(0, 200))
    return null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[virtual-tryon] Direct image generate failed:', msg.substring(0, 200))
    return null
  }
}

// ── Category Configuration ─────────────────────────────────────────

interface CategoryPromptConfig {
  bodyType: string
  placement: string
  colorFocus: string
  size: ImageSize
  garmentType: string  // for IDM-VTON garment description
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
  // Try exact match first
  if (CATEGORY_PROMPTS[categorySlug]) {
    const config = { ...CATEGORY_PROMPTS[categorySlug] }
    // Override placement for specific jewelry types
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

  // Try partial match
  const knownSlugs = Object.keys(CATEGORY_PROMPTS)
  const matched = knownSlugs.find(s => categorySlug.includes(s) || s.includes(categorySlug))
  if (matched) return { ...CATEGORY_PROMPTS[matched] }

  // Default
  return {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing or holding the product naturally',
    colorFocus: 'product colors, materials, and design',
    size: '864x1152',
    garmentType: 'Fashion item',
  }
}

// ── Prompt Builder (NO VLM — uses product name + category config) ──

function buildEditPrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}".

CRITICAL RULES:
1. FACE & PERSON: Keep this person's EXACT face — same eyes, nose, lips, jawline, expression. Preserve their skin tone, hair color, and body proportions EXACTLY.
2. PRODUCT ACCURACY: The ${config.colorFocus} of "${productName}" MUST be rendered accurately in the result.
3. NATURAL DRAPING: The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body.
4. REALISTIC: The result should look like a REAL PHOTOGRAPH of this exact person wearing this exact product.

${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

function buildGeneratePrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: A professional model ${config.placement}. The product is "${productName}".

CRITICAL RULES:
1. PRODUCT ACCURACY: The ${config.colorFocus} of "${productName}" MUST be rendered accurately.
2. NATURAL DRAPING: The product must look NATURALLY WORN — proper shadows, highlights, folds, and fit.
3. REALISTIC: Photorealistic appearance with proper lighting and shadows.

${config.bodyType}. Studio-quality, 8K detail.`
}

// ── Space Status Check (lightweight) ────────────────────────────────

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000 // 20 seconds

async function isSpaceAwake(): Promise<boolean> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return spaceAwakeCache.awake
  }
  try {
    const awake = await Promise.race([
      checkSpaceStatus(),
      new Promise<false>(r => setTimeout(() => r(false), 3_000)),
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

/**
 * Perform virtual try-on using multiple strategies with direct API calls.
 *
 * Strategy order (optimized for RELIABILITY):
 * 1. ZAI Image Edit — most reliable, preserves face, direct API call
 * 2. IDM-VTON — best quality garment draping, but space may sleep
 * 3. ZAI Text-to-Image — last resort, no face preservation
 *
 * Total time: max 50 seconds
 * NO VLM calls — eliminates 6-12s latency and failure points
 * Direct API calls — bypasses ZAI SDK for maximum Vercel compatibility
 */
export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const zaiConfigured = isZAIConfigured()

  console.log(`[virtual-tryon] Starting try-on for "${input.productName}" (${input.categorySlug}), ZAI=${zaiConfigured ? 'configured' : 'NOT configured'}`)

  // ── Strategy 1: ZAI Image Edit (MOST RELIABLE — preserves face) ──
  if (zaiConfigured && Date.now() < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Strategy 1: ZAI Image Edit (direct API call)')
    try {
      const prompt = buildEditPrompt(config, input.productName)
      const remainingTime = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now())
      const result = await directAIImageEdit(input.selfieData, prompt, config.size, remainingTime)

      if (result) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI Image Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result,
          strategy: 'zai-edit',
          elapsedMs: elapsed,
        }
      }
      console.log('[virtual-tryon] ZAI Image Edit returned null')
    } catch (err) {
      console.log(`[virtual-tryon] ZAI Image Edit error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // ── Strategy 2: IDM-VTON (best quality garment draping) ──────────
  if (Date.now() < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Strategy 2: IDM-VTON (HuggingFace Space)')
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
        return { ...result, strategy: 'idm-vton', elapsedMs: elapsed }
      }
      console.log(`[virtual-tryon] IDM-VTON failed: ${result.error}`)
    } catch (err) {
      console.log(`[virtual-tryon] IDM-VTON error: ${(err as Error).message?.substring(0, 100)}`)
    }

    // Pre-warm in background for next attempt
    preWarmSpace().catch(() => {})
  }

  // If ZAI is not configured, we can't try ZAI strategies
  if (!zaiConfigured) {
    const elapsed = Date.now() - totalStart
    const isVercel = !!process.env.VERCEL
    console.log(`[virtual-tryon] ZAI not configured — cannot try ZAI text-to-image`)

    return {
      success: false,
      error: isVercel
        ? 'AI try-on requires ZAI_BASE_URL and ZAI_API_KEY environment variables to be set on Vercel. Please configure these in your Vercel project settings under Environment Variables.'
        : 'AI try-on service is not configured. Create a .z-ai-config file or set ZAI_BASE_URL and ZAI_API_KEY environment variables.',
      errorCode: 'ZAI_NOT_CONFIGURED',
      elapsedMs: elapsed,
    }
  }

  // Check if we still have time
  if (Date.now() >= totalDeadline - 8_000) {
    const elapsed = Date.now() - totalStart
    return {
      success: false,
      error: 'AI service is busy right now. Please try again in a few minutes.',
      errorCode: 'SERVICE_BUSY',
      elapsedMs: elapsed,
    }
  }

  // ── Strategy 3: ZAI Text-to-Image Generate (last resort) ────────
  console.log('[virtual-tryon] Strategy 3: ZAI Text-to-Image (direct API call)')
  try {
    const prompt = buildGeneratePrompt(config, input.productName)
    const remainingTime = Math.min(ZAI_GENERATE_TIMEOUT_MS, totalDeadline - Date.now())
    const result = await directAIImageGenerate(prompt, config.size, remainingTime)

    if (result) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ ZAI Text-to-Image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result,
        strategy: 'zai-generate',
        elapsedMs: elapsed,
      }
    }
  } catch (err) {
    console.log(`[virtual-tryon] ZAI Text-to-Image error: ${(err as Error).message?.substring(0, 100)}`)
  }

  // ── All strategies failed ────────────────────────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)

  return {
    success: false,
    error: 'AI try-on services are currently busy. Please try again in a few minutes.',
    errorCode: 'ALL_STRATEGIES_FAILED',
    elapsedMs: elapsed,
  }
}

// ── Backward Compatibility ─────────────────────────────────────────

export function isHFAvailable(): boolean { return true }
export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean; loadAvg: number | null }> {
  return { awake: await isSpaceAwake(), loadAvg: null }
}
