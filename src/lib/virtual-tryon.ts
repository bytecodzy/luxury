/**
 * Virtual Try-On Engine v12 — Fixed API Calls + VLM-Enhanced Prompts
 *
 * CRITICAL FIXES from v11:
 * 1. ZAI Image Edit: Use `image` (string) instead of `images` (array) — matches SDK types
 * 2. Pass product image via VLM analysis → detailed prompt description
 * 3. IDM-VTON as PRIMARY strategy (only one that does proper garment draping)
 * 4. ZAI Image Edit as secondary (with VLM-enhanced prompt for accuracy)
 * 5. ZAI Text-to-Image as last resort
 * 6. Proper error handling for Vercel (internal-api.z.ai unreachable)
 *
 * STRATEGY ORDER:
 * 1. IDM-VTON (best quality, proper garment draping with both images)
 * 2. ZAI VLM + Image Edit (VLM analyzes product → detailed prompt → edit selfie)
 * 3. ZAI Text-to-Image (last resort, no face preservation)
 */

import { performTryOn as hfPerformTryOn, checkSpaceStatus } from './huggingface-tryon'
import { createZAI, isZAIConfigured, getZAIConfig } from './zai'

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
  strategy?: string           // 'idm-vton' | 'zai-vlm-edit' | 'zai-generate'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'SERVICE_BUSY' | 'NO_PRODUCT_IMAGE' | 'ZAI_NOT_CONFIGURED'
  elapsedMs?: number
}

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864'

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000       // 50s hard limit (10s buffer for Vercel 60s)
const IDM_VTON_TIMEOUT_MS = 45_000    // 45s for IDM-VTON (needs more time)
const VLM_ANALYSIS_TIMEOUT_MS = 12_000 // 12s for VLM product analysis
const ZAI_EDIT_TIMEOUT_MS = 25_000    // 25s for ZAI image edit
const ZAI_GENERATE_TIMEOUT_MS = 20_000 // 20s for ZAI text-to-image
const HEALTH_CHECK_TIMEOUT_MS = 2_000  // 2s for each health check probe

// ── Health Check ───────────────────────────────────────────────────

interface HealthStatus {
  zaiReachable: boolean
  spaceAwake: boolean
  timestamp: number
}

let healthCache: HealthStatus | null = null
const HEALTH_CACHE_TTL = 15_000 // 15 seconds

async function quickHealthCheck(): Promise<Pick<HealthStatus, 'zaiReachable' | 'spaceAwake'>> {
  const now = Date.now()
  if (healthCache && now - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return { zaiReachable: healthCache.zaiReachable, spaceAwake: healthCache.spaceAwake }
  }

  const [zaiResult, spaceResult] = await Promise.all([
    // ZAI connectivity check
    (async (): Promise<boolean> => {
      if (!isZAIConfigured()) return false
      try {
        const config = getZAIConfig()
        if (!config) return false
        const r = await fetch(`${config.baseUrl}/models`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        })
        return r.status < 500
      } catch {
        return false
      }
    })(),
    // IDM-VTON space check
    (async (): Promise<boolean> => {
      try {
        return await Promise.race([
          checkSpaceStatus(),
          new Promise<false>(r => setTimeout(() => r(false), HEALTH_CHECK_TIMEOUT_MS)),
        ])
      } catch {
        return false
      }
    })(),
  ])

  healthCache = { zaiReachable: zaiResult, spaceAwake: spaceResult, timestamp: now }
  return { zaiReachable: zaiResult, spaceAwake: spaceResult }
}

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

// ── VLM Product Analysis ───────────────────────────────────────────
// Uses VLM to analyze the product image and extract detailed visual info
// for better prompts in ZAI Image Edit strategy.

const VLM_PRODUCT_PROMPT = `Analyze this product for a virtual try-on. I need EXACT visual details.

Respond EXACTLY in this format:
TYPE: [specific product type]
MAIN_COLOR: [dominant color with shade, e.g. "deep maroon with warm undertone"]
SECONDARY_COLOR: [accent/border color]
METAL_COLOR: [metal tone if applicable, or "none"]
MATERIALS: [comma-separated materials with texture]
KEY_DETAILS: [2-3 most visible design elements]
PATTERN: [any visible patterns, prints, or textures]
SIZE_SCALE: [size relative to person, e.g. "full-body drape" or "wrist-sized"]

CRITICAL: Color accuracy is #1 priority. Be specific about shades (maroon ≠ red ≠ burgundy).`

interface ProductAnalysis {
  type: string
  mainColor: string
  secondaryColor: string
  metalColor: string
  materials: string
  keyDetails: string
  pattern: string
  sizeScale: string
  colorSummary: string
}

function parseVLMProductAnalysis(raw: string): ProductAnalysis {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  let type = 'luxury item'
  let mainColor = ''
  let secondaryColor = ''
  let metalColor = ''
  let materials = ''
  let keyDetails = ''
  let pattern = ''
  let sizeScale = ''

  for (const line of lines) {
    if (line.startsWith('TYPE:')) type = line.replace('TYPE:', '').trim()
    else if (line.startsWith('MAIN_COLOR:')) mainColor = line.replace('MAIN_COLOR:', '').trim()
    else if (line.startsWith('SECONDARY_COLOR:')) secondaryColor = line.replace('SECONDARY_COLOR:', '').trim()
    else if (line.startsWith('METAL_COLOR:')) metalColor = line.replace('METAL_COLOR:', '').trim()
    else if (line.startsWith('MATERIALS:')) materials = line.replace('MATERIALS:', '').trim()
    else if (line.startsWith('KEY_DETAILS:')) keyDetails = line.replace('KEY_DETAILS:', '').trim()
    else if (line.startsWith('PATTERN:')) pattern = line.replace('PATTERN:', '').trim()
    else if (line.startsWith('SIZE_SCALE:')) sizeScale = line.replace('SIZE_SCALE:', '').trim()
  }

  const parts: string[] = []
  if (mainColor) parts.push(`MAIN: ${mainColor}`)
  if (secondaryColor) parts.push(`ACCENT: ${secondaryColor}`)
  if (metalColor && metalColor !== 'none') parts.push(`METAL: ${metalColor}`)
  const colorSummary = parts.join('. ') || 'standard colors'

  return { type, mainColor, secondaryColor, metalColor, materials, keyDetails, pattern, sizeScale, colorSummary }
}

async function vlmAnalyzeProduct(productImageBase64: string): Promise<ProductAnalysis | null> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VLM_PRODUCT_PROMPT },
            { type: 'image_url', image_url: { url: productImageBase64 } },
          ],
        }],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), VLM_ANALYSIS_TIMEOUT_MS)),
    ])

    if (!result) return null
    const content = result.choices?.[0]?.message?.content || ''
    if (!content) return null
    return parseVLMProductAnalysis(content)
  } catch (err) {
    console.log(`[virtual-tryon] VLM product analysis failed: ${(err as Error).message?.substring(0, 100)}`)
    return null
  }
}

// ── Prompt Builders ────────────────────────────────────────────────

function buildVLMEditPrompt(config: CategoryPromptConfig, productName: string, analysis: ProductAnalysis): string {
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}" — a ${analysis.type}.

PRODUCT VISUAL DETAILS (MUST match exactly):
- COLOR SCHEMA: ${analysis.colorSummary}
- MAIN COLOR: ${analysis.mainColor} — this MUST be the dominant color. Do NOT shift to a similar but different shade.
${analysis.metalColor && analysis.metalColor !== 'none' ? `- METAL COLOR: ${analysis.metalColor} — match the warmth/coolness precisely` : ''}
- MATERIALS: ${analysis.materials}
- KEY DETAILS: ${analysis.keyDetails}
${analysis.pattern ? `- PATTERN/TEXTURE: ${analysis.pattern}` : ''}

CRITICAL RULES:
1. FACE & PERSON: Keep this person's EXACT face — same eyes, nose, lips, jawline, expression. Preserve their skin tone, hair color, and body proportions EXACTLY.
2. PRODUCT ACCURACY: The product must have IDENTICAL colors to the description above. A maroon product must stay maroon, NOT become red or burgundy. Gold must stay the same gold tone.
3. NATURAL DRAPING: The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body.
4. REALISTIC: The result should look like a REAL PHOTOGRAPH of this exact person wearing this exact product.

${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

function buildGeneratePrompt(config: CategoryPromptConfig, productName: string, analysis: ProductAnalysis | null): string {
  const colorInfo = analysis
    ? `Colors: ${analysis.colorSummary}. Materials: ${analysis.materials}. Details: ${analysis.keyDetails}.`
    : `The ${config.colorFocus} of "${productName}" MUST be rendered accurately.`

  return `VIRTUAL TRY-ON: A professional model ${config.placement}. The product is "${productName}".
${colorInfo}
CRITICAL RULES:
1. PRODUCT ACCURACY: Product colors, materials, and design MUST be rendered accurately.
2. NATURAL DRAPING: The product must look NATURALLY WORN — proper shadows, highlights, folds, and fit.
3. REALISTIC: Photorealistic appearance with proper lighting and shadows.

${config.bodyType}. Studio-quality, 8K detail.`
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

// ── ZAI Image Result Helper ────────────────────────────────────────

async function processZAIImageResponse(
  result: { data?: Array<{ base64?: string; url?: string }> } | null,
): Promise<string | null> {
  if (!result?.data?.[0]) return null

  const item = result.data[0]

  if (item.base64) {
    return `data:image/png;base64,${item.base64}`
  }

  if (item.url) {
    try {
      const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(5_000) })
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        const ct = imgRes.headers.get('content-type') || 'image/png'
        return `data:${ct.split(';')[0]};base64,${buf.toString('base64')}`
      }
    } catch {
      // Download failed
    }
    return item.url
  }

  return null
}

// ── Main Try-On Function ───────────────────────────────────────────

/**
 * Perform virtual try-on using availability-aware strategy selection.
 *
 * FLOW (v12 — IDM-VTON first):
 * 1. Quick health check (2-3s) determines what's reachable
 * 2. Strategy 1: IDM-VTON (best quality, proper garment draping with BOTH images)
 * 3. Strategy 2: ZAI VLM + Image Edit (VLM analyzes product → detailed prompt → edit selfie)
 * 4. Strategy 3: ZAI Text-to-Image (last resort, no face preservation)
 * 5. Total time: max 50 seconds
 */
export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)

  console.log(`[virtual-tryon] Starting try-on for "${input.productName}" (${input.categorySlug})`)

  // ── Step 1: Quick health check ──────────────────────────────────
  const health = await quickHealthCheck()
  console.log(
    `[virtual-tryon] Health: ZAI=${health.zaiReachable ? 'reachable' : 'unreachable'}, IDM-VTON=${health.spaceAwake ? 'awake' : 'sleeping'}`,
  )

  // ── Step 2: Pre-analyze product with VLM (in parallel with strategies) ──
  // Start VLM analysis early so it's ready when ZAI Image Edit needs it
  let vlmAnalysis: ProductAnalysis | null = null
  const vlmPromise = health.zaiReachable
    ? vlmAnalyzeProduct(input.productImageBase64).then(a => { vlmAnalysis = a; return a })
    : Promise.resolve(null)

  // ── Strategy 1: IDM-VTON (PRIMARY — proper garment draping) ────
  // This is the ONLY strategy that takes BOTH images and does proper virtual try-on.
  // It should always be tried first for best results.
  if (Date.now() < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Strategy 1: IDM-VTON (HuggingFace Space)')
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

    // Pre-warm space in background for next attempt
    preWarmSpace().catch(() => {})
  }

  // ── Strategy 2: ZAI VLM + Image Edit ──────────────────────────
  // Uses VLM to analyze product image → detailed prompt → ZAI Image Edit with selfie
  // The key fix: pass `image` (string) instead of `images` (array)
  if (health.zaiReachable && Date.now() < totalDeadline - 10_000) {
    console.log('[virtual-tryon] Strategy 2: ZAI VLM + Image Edit')
    try {
      // Wait for VLM analysis to complete (it started in parallel)
      const analysis = await vlmPromise || vlmAnalysis
      const zai = await createZAI()

      // Build detailed prompt from VLM analysis
      const prompt = analysis
        ? buildVLMEditPrompt(config, input.productName, analysis)
        : `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${input.productName}". Keep the person's EXACT face, skin tone, and body proportions. The ${config.colorFocus} must be accurate. The product must look NATURALLY WORN — NOT pasted or overlaid. ${config.bodyType}. Photorealistic, 8K detail.`

      const remainingTime = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now())

      // FIX: Use `image` (string) instead of `images` (array) — matches SDK CreateImageEditBody
      const result = await Promise.race([
        zai.images.generations.edit({
          prompt,
          image: input.selfieData,  // CORRECT: single string, not array
          size: config.size,
        }),
        new Promise<null>(r => setTimeout(() => r(null), remainingTime)),
      ])

      if (result) {
        const imageUrl = await processZAIImageResponse(result as any)
        if (imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI VLM+Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl,
            strategy: 'zai-vlm-edit',
            elapsedMs: elapsed,
          }
        }
      }
      console.log('[virtual-tryon] ZAI VLM+Edit returned no usable image')
    } catch (err) {
      const msg = (err as Error).message || String(err)
      console.log(`[virtual-tryon] ZAI VLM+Edit failed: ${msg.substring(0, 100)}`)
    }
  }

  // ── Strategy 3: ZAI Text-to-Image (last resort) ───────────────
  // No face preservation — generates from text description only
  if (health.zaiReachable && Date.now() < totalDeadline - 8_000) {
    console.log('[virtual-tryon] Strategy 3: ZAI Text-to-Image')
    try {
      const analysis = vlmAnalysis
      const zai = await createZAI()
      const prompt = buildGeneratePrompt(config, input.productName, analysis)
      const remainingTime = Math.min(ZAI_GENERATE_TIMEOUT_MS, totalDeadline - Date.now())

      const result = await Promise.race([
        zai.images.generations.create({
          model: 'cogview-4-plus',
          prompt,
          size: config.size,
        }),
        new Promise<null>(r => setTimeout(() => r(null), remainingTime)),
      ])

      if (result) {
        const imageUrl = await processZAIImageResponse(result as any)
        if (imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI Text-to-Image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl,
            strategy: 'zai-generate',
            elapsedMs: elapsed,
          }
        }
      }
    } catch (err) {
      console.log(`[virtual-tryon] ZAI Text-to-Image error: ${(err as Error).message?.substring(0, 100)}`)
    }
  }

  // ── All strategies failed ────────────────────────────────────────
  const elapsed = Date.now() - totalStart
  const isVercel = !!process.env.VERCEL
  console.log(`[virtual-tryon] All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)

  if (!health.zaiReachable && !health.spaceAwake) {
    return {
      success: false,
      error: isVercel
        ? 'AI services are currently unavailable. On Vercel, ensure ZAI_BASE_URL and ZAI_API_KEY point to a publicly reachable API endpoint (internal-api.z.ai is not reachable from Vercel servers). The HuggingFace IDM-VTON service may also be sleeping — try again in 30-60 seconds.'
        : 'AI services are currently unavailable. Please try again in a few minutes.',
      errorCode: 'ALL_STRATEGIES_FAILED',
      elapsedMs: elapsed,
    }
  }

  if (health.zaiReachable && !isZAIConfigured()) {
    return {
      success: false,
      error: isVercel
        ? 'AI try-on requires ZAI_BASE_URL and ZAI_API_KEY environment variables. Note: internal-api.z.ai is not reachable from Vercel — use a public API endpoint instead.'
        : 'AI try-on service is not configured.',
      errorCode: 'ZAI_NOT_CONFIGURED',
      elapsedMs: elapsed,
    }
  }

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
