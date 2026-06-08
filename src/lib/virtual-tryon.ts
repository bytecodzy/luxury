/**
 * Virtual Try-On Engine v5 — Concrete, Reliable, Fast
 *
 * KEY PRINCIPLES:
 * 1. ALWAYS deliver a result within 55 seconds — never leave the user waiting 200+ seconds
 * 2. Try strategies in order: IDM-VTON → ZAI Image Edit → Canvas mode
 * 3. Aggressive per-strategy timeouts — don't waste time on failing services
 * 4. Synchronous processing — no broken in-memory job storage on Vercel
 * 5. Skip sleeping services immediately — don't wait 30-60s for warm-up
 * 6. Category-aware prompts for accurate product draping
 */

import { performTryOn as hfPerformTryOn, checkSpaceStatus } from './huggingface-tryon'
import { createZAI } from './zai'

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
  strategy?: string           // 'idm-vton' | 'zai-dual-edit' | 'zai-selfie-edit' | 'canvas'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'CANVAS_MODE'
  elapsedMs?: number
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 55_000   // 55s hard limit
const IDM_VTON_TIMEOUT_MS = 35_000  // 35s for IDM-VTON (if space is awake)
const ZAI_EDIT_TIMEOUT_MS = 25_000  // 25s for ZAI image edit
const SPACE_CHECK_TIMEOUT_MS = 3_000 // 3s to check if space is awake

// ── Category Configuration ─────────────────────────────────────────

interface CategoryPromptConfig {
  bodyType: string
  placement: string
  colorFocus: string
  size: ImageSize
}

const CATEGORY_PROMPTS: Record<string, CategoryPromptConfig> = {
  jewelry: {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part — necklace around the neck, earrings on the earlobes, bracelet on the wrist, ring on the finger',
    colorFocus: 'jewelry metal tone (gold/silver/rose-gold) and stone colors',
    size: '864x1152',
  },
  sarees: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
  },
  watches: {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist, with the watch face visible and properly sized relative to the wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
  },
  fashion: {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit with proper fit, natural draping, and realistic fabric behavior — the garment should follow the contours of the body naturally',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
  },
  'mens-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit, natural draping, and realistic fabric behavior',
    colorFocus: 'shirt fabric color, pattern, and collar/cuff details',
    size: '768x1344',
  },
  'mens-shirts-t-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit and natural draping',
    colorFocus: 'shirt fabric color, pattern, and details',
    size: '768x1344',
  },
  'leather-goods': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding or wearing the leather product naturally',
    colorFocus: 'leather color, grain texture, and hardware metal color',
    size: '864x1152',
  },
  fragrances: {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
  },
  'home-living': {
    bodyType: 'Professional lifestyle photograph',
    placement: 'with the home decor product in the scene',
    colorFocus: 'product colors, materials, and finish',
    size: '1344x768',
  },
  'corporate-gifts': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the gift product elegantly',
    colorFocus: 'product colors, materials, and packaging',
    size: '864x1152',
  },
  'women-sarees': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    colorFocus: 'saree fabric color, border color, and zari/work color',
    size: '768x1344',
  },
  'women-jewelry': {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    colorFocus: 'jewelry metal tone and stone colors',
    size: '864x1152',
  },
  'women-fashion': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the outfit elegantly with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
  },
  'women-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
  },
  'women-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
  },
  'kids-fashion': {
    bodyType: 'Full-body professional fashion photograph of a child/teenager',
    placement: 'wearing the outfit with proper fit and natural draping',
    colorFocus: 'outfit fabric color, print pattern, and accent colors',
    size: '768x1344',
  },
  'men-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    colorFocus: 'accessory color, material, and design',
    size: '864x1152',
  },
  'men-watches': {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist',
    colorFocus: 'watch dial color, case metal color, and strap color',
    size: '864x1152',
  },
  'men-tshirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the t-shirt with proper fit and natural draping',
    colorFocus: 't-shirt fabric color, pattern, and details',
    size: '768x1344',
  },
  'men-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle',
    colorFocus: 'bottle shape, cap color, and liquid color',
    size: '864x1152',
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
  }
}

// ── Prompt Builder ─────────────────────────────────────────────────

/**
 * Build the dual-image edit prompt for ZAI.
 * Both selfie AND product are passed as images.
 */
function buildDualImagePrompt(config: CategoryPromptConfig, productName: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person (FIRST IMAGE) ${config.placement}. The product is "${productName}" — it is shown in the SECOND IMAGE.

CRITICAL RULES:
1. FACE & PERSON: Keep this person's EXACT face — same eyes, nose, lips, jawline, expression. Preserve their skin tone, hair color, and body proportions EXACTLY.
2. PRODUCT COLOR ACCURACY (#1 PRIORITY): The product's ${config.colorFocus} MUST match the SECOND IMAGE exactly — same hue, saturation, and brightness. A gold product must stay gold, a maroon product must stay maroon.
3. NATURAL DRAPING: The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body.
4. PRODUCT INTEGRITY: Do NOT invent or hallucinate product details — only show what is visible in the SECOND IMAGE. Do NOT remove or simplify details that ARE visible.

${config.bodyType}. Photorealistic, studio-quality, 8K. The result should look like a REAL PHOTOGRAPH of this exact person wearing this exact product.`
}

/**
 * Build the selfie-edit prompt for ZAI (when only selfie is available as image).
 * Product colors described in text from VLM analysis.
 */
function buildSelfieEditPrompt(config: CategoryPromptConfig, productName: string, productDesc: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}".

PRODUCT DESCRIPTION: ${productDesc}

CRITICAL RULES:
1. FACE & PERSON: Keep this person's EXACT face — same eyes, nose, lips, jawline, expression. Preserve their skin tone, hair color, and body proportions EXACTLY.
2. PRODUCT ACCURACY: The product must match the description above — exact colors, materials, and design. ${config.colorFocus}
3. NATURAL DRAPING: The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, folds, and fit.
4. Do NOT invent or hallucinate product details beyond what is described above.

${config.bodyType}. Photorealistic, studio-quality, 8K. The result should look like a REAL PHOTOGRAPH of this exact person wearing this exact product.`
}

// ── ZAI Image Edit Helpers ─────────────────────────────────────────

/**
 * Quick VLM analysis of the product image — returns a compact description.
 * 10s timeout. Returns empty string on failure.
 */
async function vlmDescribeProduct(productImageUrl: string): Promise<string> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this product for a virtual try-on in 2-3 sentences. Include: main color with shade (e.g. deep maroon, warm gold, navy blue), material/texture, key design elements, and size relative to a person. Be extremely specific about colors — distinguish between similar shades like maroon vs burgundy vs wine.' },
            { type: 'image_url', image_url: { url: productImageUrl } },
          ],
        }],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), 10_000)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch {
    return ''
  }
}

/**
 * Dual-image edit: both selfie and product passed as images.
 * This is the BEST ZAI strategy — the model can SEE both images.
 */
async function zaiDualImageEdit(
  selfieDataUrl: string,
  productDataUrl: string,
  prompt: string,
  size: ImageSize,
): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [
          { url: selfieDataUrl },
          { url: productDataUrl },
        ],
        size,
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), ZAI_EDIT_TIMEOUT_MS)),
    ])

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    return null
  } catch (err) {
    console.error('[virtual-tryon] ZAI dual-image edit failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

/**
 * Selfie-edit: only the selfie is passed as image, product described in text.
 * Less accurate colors but preserves the person's face better.
 */
async function zaiSelfieEdit(
  selfieDataUrl: string,
  prompt: string,
  size: ImageSize,
): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [{ url: selfieDataUrl }],
        size,
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), ZAI_EDIT_TIMEOUT_MS)),
    ])

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    return null
  } catch (err) {
    console.error('[virtual-tryon] ZAI selfie edit failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

// ── Space Status Check ─────────────────────────────────────────────

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000 // 20 seconds

/**
 * Quick check if IDM-VTON space is awake.
 * 3s timeout. Returns false if unsure.
 */
async function isSpaceAwake(): Promise<boolean> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return spaceAwakeCache.awake
  }

  try {
    const awake = await Promise.race([
      checkSpaceStatus(),
      new Promise<false>(r => setTimeout(() => r(false), SPACE_CHECK_TIMEOUT_MS)),
    ])
    spaceAwakeCache = { awake, timestamp: Date.now() }
    return awake
  } catch {
    spaceAwakeCache = { awake: false, timestamp: now }
    return false
  }
}

/**
 * Pre-warm the IDM-VTON space. Call when the try-on dialog opens.
 */
export async function preWarmSpace(): Promise<boolean> {
  try {
    // Trigger a GET request to wake the space
    const awake = await isSpaceAwake()
    if (!awake) {
      // Space is sleeping — send a wake-up request
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

/**
 * Get cached space status (no network call).
 */
export function getCachedSpaceStatus(): { awake: boolean; timestamp: number } | null {
  return spaceAwakeCache
}

// ── Main Try-On Function ───────────────────────────────────────────

/**
 * Perform virtual try-on using multiple strategies with aggressive timeouts.
 *
 * Strategy order:
 * 1. IDM-VTON (if space is awake) — best quality, proper garment draping
 * 2. ZAI dual-image edit — good quality, AI-generated approximation
 * 3. ZAI selfie-edit — decent quality with product described in text
 * 4. Canvas mode — client-side fallback (returned as indicator)
 *
 * Total time: max 55 seconds
 */
export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS

  const config = getCategoryConfig(input.categorySlug, input.productName)

  // ── Strategy 1: IDM-VTON (if space is awake) ──────────────────
  const spaceAwake = await isSpaceAwake()

  if (spaceAwake && Date.now() < totalDeadline - 30_000) {
    console.log('[virtual-tryon] Strategy 1: IDM-VTON (space is awake)')
    try {
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
        }), Math.min(IDM_VTON_TIMEOUT_MS, totalDeadline - Date.now()))),
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
  } else {
    if (!spaceAwake) {
      console.log('[virtual-tryon] Skipping IDM-VTON — space is sleeping')
    } else {
      console.log('[virtual-tryon] Skipping IDM-VTON — not enough time remaining')
    }
  }

  // Check if we still have time
  if (Date.now() >= totalDeadline - 10_000) {
    console.log('[virtual-tryon] Out of time — returning canvas mode')
    return {
      success: false,
      error: 'AI services are busy. Using style preview mode.',
      errorCode: 'CANVAS_MODE',
      strategy: 'canvas',
      elapsedMs: Date.now() - totalStart,
    }
  }

  // ── Strategy 2: ZAI Dual-Image Edit ────────────────────────────
  if (Date.now() < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Strategy 2: ZAI dual-image edit')
    try {
      const prompt = buildDualImagePrompt(config, input.productName)
      const result = await zaiDualImageEdit(
        input.selfieData,
        input.productImageBase64,
        prompt,
        config.size,
      )

      if (result) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI dual-image edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result,
          strategy: 'zai-dual-edit',
          elapsedMs: elapsed,
        }
      }

      console.log('[virtual-tryon] ZAI dual-image edit returned null')
    } catch (err) {
      console.log(`[virtual-tryon] ZAI dual-image edit error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // Check if we still have time
  if (Date.now() >= totalDeadline - 5_000) {
    console.log('[virtual-tryon] Out of time — returning canvas mode')
    return {
      success: false,
      error: 'AI services timed out. Using style preview mode.',
      errorCode: 'CANVAS_MODE',
      strategy: 'canvas',
      elapsedMs: Date.now() - totalStart,
    }
  }

  // ── Strategy 3: ZAI Selfie-Edit (with VLM product description) ──
  if (Date.now() < totalDeadline - 10_000) {
    console.log('[virtual-tryon] Strategy 3: ZAI selfie-edit with VLM description')
    try {
      // Quick VLM analysis of the product (5s timeout)
      const productDesc = await Promise.race([
        vlmDescribeProduct(input.productImageBase64),
        new Promise<string>(r => setTimeout(() => r('a luxury product'), 5_000)),
      ])

      if (productDesc && Date.now() < totalDeadline - 10_000) {
        const prompt = buildSelfieEditPrompt(config, input.productName, productDesc)
        const result = await zaiSelfieEdit(input.selfieData, prompt, config.size)

        if (result) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI selfie-edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl: result,
            strategy: 'zai-selfie-edit',
            elapsedMs: elapsed,
          }
        }
      }
    } catch (err) {
      console.log(`[virtual-tryon] ZAI selfie-edit error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // ── All strategies failed — return canvas mode ─────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] All AI strategies failed in ${(elapsed / 1000).toFixed(1)}s — returning canvas mode`)
  return {
    success: false,
    error: 'AI generation unavailable. Creating style preview instead.',
    errorCode: 'CANVAS_MODE',
    strategy: 'canvas',
    elapsedMs: elapsed,
  }
}

// ── Backward Compatibility ─────────────────────────────────────────

export function isHFAvailable(): boolean { return true }
export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean; loadAvg: number | null }> {
  return { awake: await isSpaceAwake(), loadAvg: null }
}
