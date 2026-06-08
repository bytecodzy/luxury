/**
 * Virtual Try-On Engine v6 — Reliable, Fast, Honest
 *
 * KEY PRINCIPLES:
 * 1. ZAI Image Generation is PRIMARY — most reliable, works everywhere
 * 2. IDM-VTON is SECONDARY — best quality but often sleeping/unreliable
 * 3. 50-second hard server timeout — never exceed Vercel's 60s limit
 * 4. NO canvas overlay fallback — either real AI result or honest error
 * 5. If AI is slow, tell user to try later — never make them wait 200s
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
  strategy?: string           // 'zai-edit' | 'zai-generate' | 'idm-vton'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'SERVICE_BUSY'
  elapsedMs?: number
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000   // 50s hard limit (leaves 10s buffer for Vercel 60s)
const ZAI_EDIT_TIMEOUT_MS = 30_000  // 30s for ZAI image edit
const ZAI_GENERATE_TIMEOUT_MS = 25_000  // 25s for ZAI text-to-image
const IDM_VTON_TIMEOUT_MS = 35_000  // 35s for IDM-VTON (if space is awake)
const SPACE_CHECK_TIMEOUT_MS = 3_000 // 3s to check if space is awake
const VLM_TIMEOUT_MS = 8_000  // 8s for VLM product description

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
 * Build the image edit prompt for ZAI.
 * Selfie is passed as image, product described in prompt via VLM analysis.
 */
function buildEditPrompt(config: CategoryPromptConfig, productName: string, productDesc: string): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}".

PRODUCT DESCRIPTION: ${productDesc}

CRITICAL RULES:
1. FACE & PERSON: Keep this person's EXACT face — same eyes, nose, lips, jawline, expression. Preserve their skin tone, hair color, and body proportions EXACTLY.
2. PRODUCT COLOR ACCURACY (#1 PRIORITY): The product's ${config.colorFocus} MUST match the description above exactly — same hue, saturation, and brightness.
3. NATURAL DRAPING: The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body.
4. PRODUCT INTEGRITY: Do NOT invent or hallucinate product details — only show what is described above.

${config.bodyType}. Photorealistic, studio-quality, 8K. The result should look like a REAL PHOTOGRAPH of this exact person wearing this exact product.`
}

/**
 * Build text-to-image prompt for ZAI (no reference selfie — generate from description).
 */
function buildGeneratePrompt(config: CategoryPromptConfig, productName: string, productDesc: string, personDesc: string): string {
  return `VIRTUAL TRY-ON: A person ${personDesc}, ${config.placement}. The product is "${productName}".

PRODUCT DESCRIPTION: ${productDesc}

CRITICAL RULES:
1. PRODUCT COLOR ACCURACY (#1 PRIORITY): The product's ${config.colorFocus} MUST match the description exactly.
2. NATURAL DRAPING: The product must look NATURALLY WORN — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit.
3. REALISTIC: Photorealistic appearance with proper lighting and shadows.

${config.bodyType}. Studio-quality, 8K.`
}

// ── ZAI Image Generation Helpers ─────────────────────────────────────

/**
 * Quick VLM analysis of the product image — returns a compact description.
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
            { type: 'text', text: 'Describe this product for a virtual try-on in 2-3 sentences. Include: main color with shade (e.g. deep maroon, warm gold, navy blue), material/texture, key design elements, and size relative to a person. Be extremely specific about colors.' },
            { type: 'image_url', image_url: { url: productImageUrl } },
          ],
        }],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), VLM_TIMEOUT_MS)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch {
    return ''
  }
}

/**
 * Quick VLM description of the person in the selfie.
 */
async function vlmDescribePerson(selfieDataUrl: string): Promise<string> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this person briefly for a fashion photo: gender, approximate age range, skin tone, hair color and style, body type, and what they are currently wearing. Keep it to 1-2 sentences.' },
            { type: 'image_url', image_url: { url: selfieDataUrl } },
          ],
        }],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), VLM_TIMEOUT_MS)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch {
    return ''
  }
}

/**
 * Image edit: selfie passed as image, product described in prompt.
 * This is the MOST RELIABLE ZAI strategy.
 */
async function zaiImageEdit(
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
    if (response?.data?.[0]?.url) {
      return response.data[0].url
    }
    return null
  } catch (err) {
    console.error('[virtual-tryon] ZAI image edit failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

/**
 * Text-to-image generation: no reference image, just prompt.
 * Fallback when image edit fails.
 */
async function zaiImageGenerate(
  prompt: string,
  size: ImageSize,
): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await Promise.race([
      zai.images.generations.create({
        model: 'cogview-4-plus',
        prompt,
        size,
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), ZAI_GENERATE_TIMEOUT_MS)),
    ])

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    if (response?.data?.[0]?.url) {
      return response.data[0].url
    }
    return null
  } catch (err) {
    console.error('[virtual-tryon] ZAI image generate failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

// ── Space Status Check ─────────────────────────────────────────────

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000 // 20 seconds

/**
 * Quick check if IDM-VTON space is awake.
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
 * Pre-warm the IDM-VTON space.
 */
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

/**
 * Get cached space status.
 */
export function getCachedSpaceStatus(): { awake: boolean; timestamp: number } | null {
  return spaceAwakeCache
}

// ── Main Try-On Function ───────────────────────────────────────────

/**
 * Perform virtual try-on using multiple strategies with aggressive timeouts.
 *
 * Strategy order:
 * 1. ZAI Image Edit (selfie + VLM-described product) — most reliable
 * 2. IDM-VTON (if space is awake) — best quality, proper garment draping
 * 3. ZAI Image Generate (text-to-image) — fallback, no face preservation
 *
 * Total time: max 50 seconds
 * NO canvas overlay fallback — either real AI or honest error
 */
export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS

  const config = getCategoryConfig(input.categorySlug, input.productName)

  // ── Step 0: Get VLM description of product (needed for all ZAI strategies) ──
  console.log('[virtual-tryon] Getting VLM description of product...')
  const productDesc = await Promise.race([
    vlmDescribeProduct(input.productImageBase64),
    new Promise<string>(r => setTimeout(() => r('a luxury product with elegant design'), VLM_TIMEOUT_MS)),
  ])
  console.log(`[virtual-tryon] Product desc: ${productDesc.substring(0, 100)}...`)

  // Check if we still have time
  if (Date.now() >= totalDeadline - 5_000) {
    const elapsed = Date.now() - totalStart
    return {
      success: false,
      error: 'AI service is busy right now. Please try again in a few minutes.',
      errorCode: 'SERVICE_BUSY',
      strategy: undefined,
      elapsedMs: elapsed,
    }
  }

  // ── Strategy 1: ZAI Image Edit (selfie + VLM-described product) ──
  if (Date.now() < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Strategy 1: ZAI image edit (selfie + product description)')
    try {
      const prompt = buildEditPrompt(config, input.productName, productDesc)
      const result = await zaiImageEdit(
        input.selfieData,
        prompt,
        config.size,
      )

      if (result) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI image edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return {
          success: true,
          imageUrl: result,
          strategy: 'zai-edit',
          elapsedMs: elapsed,
        }
      }

      console.log('[virtual-tryon] ZAI image edit returned null')
    } catch (err) {
      console.log(`[virtual-tryon] ZAI image edit error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // Check if we still have time
  if (Date.now() >= totalDeadline - 5_000) {
    const elapsed = Date.now() - totalStart
    return {
      success: false,
      error: 'AI service is busy right now. Please try again in a few minutes.',
      errorCode: 'SERVICE_BUSY',
      strategy: undefined,
      elapsedMs: elapsed,
    }
  }

  // ── Strategy 2: IDM-VTON (if space is awake) ──────────────────
  const spaceAwake = await isSpaceAwake()

  if (spaceAwake && Date.now() < totalDeadline - 20_000) {
    console.log('[virtual-tryon] Strategy 2: IDM-VTON (space is awake)')
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
    console.log('[virtual-tryon] Skipping IDM-VTON — space is sleeping or not enough time')
  }

  // Check if we still have time
  if (Date.now() >= totalDeadline - 5_000) {
    const elapsed = Date.now() - totalStart
    return {
      success: false,
      error: 'AI service is busy right now. Please try again in a few minutes.',
      errorCode: 'SERVICE_BUSY',
      strategy: undefined,
      elapsedMs: elapsed,
    }
  }

  // ── Strategy 3: ZAI Text-to-Image Generate ──────────────────────
  if (Date.now() < totalDeadline - 10_000) {
    console.log('[virtual-tryon] Strategy 3: ZAI text-to-image generate')
    try {
      // Get person description from VLM
      const personDesc = await Promise.race([
        vlmDescribePerson(input.selfieData),
        new Promise<string>(r => setTimeout(() => r('a person'), VLM_TIMEOUT_MS)),
      ])

      if (Date.now() < totalDeadline - 10_000) {
        const prompt = buildGeneratePrompt(config, input.productName, productDesc, personDesc)
        const result = await zaiImageGenerate(prompt, config.size)

        if (result) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI text-to-image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl: result,
            strategy: 'zai-generate',
            elapsedMs: elapsed,
          }
        }
      }
    } catch (err) {
      console.log(`[virtual-tryon] ZAI text-to-image error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // ── All strategies failed — honest error ─────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] All AI strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  return {
    success: false,
    error: 'AI try-on service is currently busy. Please try again in a few minutes.',
    errorCode: 'ALL_STRATEGIES_FAILED',
    strategy: undefined,
    elapsedMs: elapsed,
  }
}

// ── Backward Compatibility ─────────────────────────────────────────

export function isHFAvailable(): boolean { return true }
export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean; loadAvg: number | null }> {
  return { awake: await isSpaceAwake(), loadAvg: null }
}
