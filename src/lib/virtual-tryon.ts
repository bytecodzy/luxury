/**
 * Virtual Try-On Engine v14 — Vercel-Reliable + Always-Try-ZAI
 *
 * CRITICAL FIX from v13:
 * - REMOVED health check gate on ZAI strategies. Previously, if the health check
 *   (fetch /models with 6s timeout) failed, ALL ZAI strategies were skipped entirely.
 *   On Vercel, the health check frequently fails due to network latency/cold starts,
 *   even though the actual ZAI API calls would succeed. Now ZAI strategies are
 *   ALWAYS attempted when isZAIConfigured() is true, with individual timeouts.
 * - Health check is now informational only (used for strategy ordering/priority)
 * - Removed hard block on internal-api.z.ai — let the actual API call fail naturally
 * - VLM analyses always attempted when ZAI is configured
 *
 * STRATEGY ORDER (Vercel-optimized):
 * 1a. If IDM-VTON Space is awake → IDM-VTON (best quality)
 * 1b. If Space is sleeping → ZAI VLM+Edit with PRODUCT image (better accuracy)
 * 2. ZAI VLM+Edit with SELFIE image (face preserved, lower product accuracy)
 * 3. ZAI Text-to-Image (last resort, no face preservation)
 * 4. If time remains → try IDM-VTON even if Space was sleeping (might wake up)
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
  strategy?: string           // 'idm-vton' | 'zai-product-edit' | 'zai-selfie-edit' | 'zai-generate'
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'ALL_STRATEGIES_FAILED' | 'SERVICE_BUSY' | 'NO_PRODUCT_IMAGE' | 'ZAI_NOT_CONFIGURED'
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
const IDM_VTON_TIMEOUT_MS = 40_000     // 40s for IDM-VTON (reduced from 45s to leave time for ZAI)
const VLM_ANALYSIS_TIMEOUT_MS = 15_000 // 15s for VLM product analysis (increased)
const VLM_SELFIE_TIMEOUT_MS = 12_000   // 12s for VLM selfie analysis
const ZAI_EDIT_TIMEOUT_MS = 30_000     // 30s for ZAI image edit (increased from 25s)
const ZAI_GENERATE_TIMEOUT_MS = 25_000 // 25s for ZAI text-to-image
const HEALTH_CHECK_ZAI_TIMEOUT_MS = 10_000   // 10s for ZAI health check (increased for Vercel cold starts)
const HEALTH_CHECK_SPACE_TIMEOUT_MS = 4_000  // 4s for IDM-VTON Space check

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
    // ZAI connectivity check — with increased timeout for Vercel
    (async (): Promise<boolean> => {
      if (!isZAIConfigured()) {
        console.log('[virtual-tryon] ZAI not configured — skipping health check')
        return false
      }
      try {
        const config = getZAIConfig()
        if (!config) return false

        // NOTE: We no longer hard-block internal-api.z.ai — let the actual API
        // call determine if it's reachable. The health check is informational only.
        if (config.baseUrl.includes('internal-api.z.ai') && process.env.VERCEL) {
          console.log('[virtual-tryon] WARNING: ZAI_BASE_URL is internal-api.z.ai — this may be unreachable from Vercel, but we will try anyway')
          // Don't return false — let the actual strategy calls determine reachability
        }

        try {
          const r = await fetch(`${config.baseUrl}/models`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${config.apiKey}` },
            signal: AbortSignal.timeout(HEALTH_CHECK_ZAI_TIMEOUT_MS),
          })
          const reachable = r.status < 500
          console.log(`[virtual-tryon] ZAI health check: status=${r.status}, reachable=${reachable}`)
          return reachable
        } catch (fetchErr) {
          // Health check failed, but ZAI may still work — don't block strategies
          console.log(`[virtual-tryon] ZAI health check fetch failed (API may still work): ${(fetchErr as Error).message?.substring(0, 100)}`)
          // Return true if configured — the actual strategy calls will determine reachability
          // This is the KEY FIX: health check failure no longer blocks ZAI strategies
          return true
        }
      } catch (err) {
        // Outer catch (e.g. getZAIConfig failed) — still don't block strategies
        console.log(`[virtual-tryon] ZAI health check outer error: ${(err as Error).message?.substring(0, 100)}`)
        // Return true if configured — let actual strategy calls determine reachability
        return isZAIConfigured()
      }
    })(),
    // IDM-VTON space check — with increased timeout
    (async (): Promise<boolean> => {
      try {
        return await Promise.race([
          checkSpaceStatus(),
          new Promise<false>(r => setTimeout(() => r(false), HEALTH_CHECK_SPACE_TIMEOUT_MS)),
        ])
      } catch {
        return false
      }
    })(),
  ])

  healthCache = { zaiReachable: zaiResult, spaceAwake: spaceResult, timestamp: now }
  console.log(`[virtual-tryon] Health check result: ZAI=${zaiResult}, Space=${spaceResult}`)
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

// ── VLM Selfie Analysis (NEW) ──────────────────────────────────────

const VLM_SELFIE_PROMPT = `Analyze this person's photo for a virtual try-on. I need their appearance details.

Respond EXACTLY in this format:
GENDER: [male/female/non-binary]
BODY_TYPE: [slim/average/athletic/plus-size]
SKIN_TONE: [specific skin tone, e.g. "warm medium brown"]
HAIR_COLOR: [hair color]
HAIR_STYLE: [hair style and length]
FACE_SHAPE: [face shape]
HEIGHT_ESTIMATE: [petite/average/tall based on proportions]
POSE: [front-facing/three-quarter/side/profile]
VISIBLE_AREA: [full-body/waist-up/chest-up/face-only]

Be specific and accurate. These details will be used to create a virtual try-on.`

interface SelfieAnalysis {
  gender: string
  bodyType: string
  skinTone: string
  hairColor: string
  hairStyle: string
  faceShape: string
  heightEstimate: string
  pose: string
  visibleArea: string
}

function parseVLMSelfieAnalysis(raw: string): SelfieAnalysis {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const result: SelfieAnalysis = {
    gender: 'unknown',
    bodyType: 'average',
    skinTone: 'medium',
    hairColor: 'dark',
    hairStyle: 'unknown',
    faceShape: 'oval',
    heightEstimate: 'average',
    pose: 'front-facing',
    visibleArea: 'waist-up',
  }

  for (const line of lines) {
    if (line.startsWith('GENDER:')) result.gender = line.replace('GENDER:', '').trim()
    else if (line.startsWith('BODY_TYPE:')) result.bodyType = line.replace('BODY_TYPE:', '').trim()
    else if (line.startsWith('SKIN_TONE:')) result.skinTone = line.replace('SKIN_TONE:', '').trim()
    else if (line.startsWith('HAIR_COLOR:')) result.hairColor = line.replace('HAIR_COLOR:', '').trim()
    else if (line.startsWith('HAIR_STYLE:')) result.hairStyle = line.replace('HAIR_STYLE:', '').trim()
    else if (line.startsWith('FACE_SHAPE:')) result.faceShape = line.replace('FACE_SHAPE:', '').trim()
    else if (line.startsWith('HEIGHT_ESTIMATE:')) result.heightEstimate = line.replace('HEIGHT_ESTIMATE:', '').trim()
    else if (line.startsWith('POSE:')) result.pose = line.replace('POSE:', '').trim()
    else if (line.startsWith('VISIBLE_AREA:')) result.visibleArea = line.replace('VISIBLE_AREA:', '').trim()
  }

  return result
}

// ── VLM Analysis Functions ─────────────────────────────────────────

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

    if (!result) {
      console.log('[virtual-tryon] VLM product analysis timed out')
      return null
    }
    const content = result.choices?.[0]?.message?.content || ''
    if (!content) {
      console.log('[virtual-tryon] VLM product analysis returned empty content')
      return null
    }
    const analysis = parseVLMProductAnalysis(content)
    console.log(`[virtual-tryon] VLM product analysis: type=${analysis.type}, mainColor=${analysis.mainColor}`)
    return analysis
  } catch (err) {
    console.log(`[virtual-tryon] VLM product analysis failed: ${(err as Error).message?.substring(0, 150)}`)
    return null
  }
}

async function vlmAnalyzeSelfie(selfieData: string): Promise<SelfieAnalysis | null> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VLM_SELFIE_PROMPT },
            { type: 'image_url', image_url: { url: selfieData } },
          ],
        }],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), VLM_SELFIE_TIMEOUT_MS)),
    ])

    if (!result) {
      console.log('[virtual-tryon] VLM selfie analysis timed out')
      return null
    }
    const content = result.choices?.[0]?.message?.content || ''
    if (!content) {
      console.log('[virtual-tryon] VLM selfie analysis returned empty content')
      return null
    }
    const analysis = parseVLMSelfieAnalysis(content)
    console.log(`[virtual-tryon] VLM selfie analysis: gender=${analysis.gender}, bodyType=${analysis.bodyType}, skinTone=${analysis.skinTone}`)
    return analysis
  } catch (err) {
    console.log(`[virtual-tryon] VLM selfie analysis failed: ${(err as Error).message?.substring(0, 150)}`)
    return null
  }
}

// ── Prompt Builders ────────────────────────────────────────────────

/**
 * Build prompt for ZAI Image Edit with PRODUCT image as base.
 * This gives the AI a VISUAL reference of the product, producing more accurate results.
 */
function buildProductEditPrompt(config: CategoryPromptConfig, productName: string, analysis: ProductAnalysis, selfieAnalysis: SelfieAnalysis | null): string {
  const personDesc = selfieAnalysis
    ? `a ${selfieAnalysis.gender} person with ${selfieAnalysis.skinTone} skin, ${selfieAnalysis.hairColor} ${selfieAnalysis.hairStyle} hair, ${selfieAnalysis.bodyType} build`
    : 'a person'

  return `VIRTUAL TRY-ON: Transform this product image into a photo of ${personDesc} ${config.placement}.

PRODUCT (this is the reference image): "${productName}" — a ${analysis.type}.
PRODUCT COLORS: ${analysis.colorSummary}. ${analysis.materials ? `Materials: ${analysis.materials}.` : ''} ${analysis.keyDetails ? `Key details: ${analysis.keyDetails}.` : ''} ${analysis.pattern ? `Pattern: ${analysis.pattern}.` : ''}

INSTRUCTIONS:
1. Show a REAL PERSON wearing this EXACT product — the colors, materials, and design MUST match the original product image exactly.
2. The product should look NATURALLY WORN on the person — proper fit, realistic fabric behavior, natural shadows and highlights where the product meets the body.
3. The person's skin tone should be ${selfieAnalysis?.skinTone || 'natural and realistic'}.
4. ${selfieAnalysis ? `The person should have ${selfieAnalysis.hairColor} ${selfieAnalysis.hairStyle} hair.` : 'The person should have natural-looking hair.'}

${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

/**
 * Build prompt for ZAI Image Edit with SELFIE image as base.
 * Face is preserved but product accuracy depends on text description.
 */
function buildSelfieEditPrompt(config: CategoryPromptConfig, productName: string, analysis: ProductAnalysis, selfieAnalysis: SelfieAnalysis | null): string {
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

function buildGeneratePrompt(config: CategoryPromptConfig, productName: string, analysis: ProductAnalysis | null, selfieAnalysis: SelfieAnalysis | null): string {
  const colorInfo = analysis
    ? `Colors: ${analysis.colorSummary}. Materials: ${analysis.materials}. Details: ${analysis.keyDetails}.`
    : `The ${config.colorFocus} of "${productName}" MUST be rendered accurately.`

  const personInfo = selfieAnalysis
    ? `The model should be a ${selfieAnalysis.gender} with ${selfieAnalysis.skinTone} skin, ${selfieAnalysis.hairColor} ${selfieAnalysis.hairStyle} hair, ${selfieAnalysis.bodyType} build.`
    : ''

  return `VIRTUAL TRY-ON: A professional model ${config.placement}. The product is "${productName}".
${colorInfo}
${personInfo}
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
      new Promise<false>(r => setTimeout(() => r(false), HEALTH_CHECK_SPACE_TIMEOUT_MS)),
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
 * Perform virtual try-on using Vercel-optimized strategy selection.
 *
 * FLOW (v13 — Vercel-Reliable):
 * 1. Health check (3-6s) with increased timeouts for Vercel
 * 2. Start VLM analyses in parallel (product + selfie)
 * 3. If Space is awake → IDM-VTON first (best quality, both images)
 * 4. If Space is sleeping → ZAI Product Edit first (product image as base, better accuracy)
 * 5. ZAI Selfie Edit (face preserved, text-based product description)
 * 6. ZAI Text-to-Image (last resort, no face preservation)
 * 7. If time remains → try IDM-VTON even if Space was sleeping
 */
export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = []

  console.log(`[virtual-tryon] Starting try-on for "${input.productName}" (${input.categorySlug})`)
  console.log(`[virtual-tryon] Environment: VERCEL=${!!process.env.VERCEL}, ZAI_CONFIGURED=${isZAIConfigured()}`)

  // ── Step 1: Health check with increased timeouts ──────────────
  const health = await quickHealthCheck()
  console.log(
    `[virtual-tryon] Health: ZAI=${health.zaiReachable ? 'reachable' : 'unreachable'}, IDM-VTON=${health.spaceAwake ? 'awake' : 'sleeping'}`,
  )

  // ── Step 2: Start VLM analyses in parallel ────────────────────
  let vlmProductAnalysis: ProductAnalysis | null = null
  let vlmSelfieAnalysis: SelfieAnalysis | null = null

  // Always try VLM analyses when ZAI is configured — health check is informational only
  if (isZAIConfigured()) {
    console.log('[virtual-tryon] Starting parallel VLM analyses (product + selfie)')
    try {
      const [productResult, selfieResult] = await Promise.all([
        vlmAnalyzeProduct(input.productImageBase64),
        vlmAnalyzeSelfie(input.selfieData),
      ])
      vlmProductAnalysis = productResult
      vlmSelfieAnalysis = selfieResult
      console.log(`[virtual-tryon] VLM analyses complete: product=${vlmProductAnalysis ? 'ok' : 'failed'}, selfie=${vlmSelfieAnalysis ? 'ok' : 'failed'}`)
    } catch (vlmErr) {
      console.log(`[virtual-tryon] VLM analyses failed: ${(vlmErr as Error).message?.substring(0, 150)}`)
      // Continue without VLM — strategies will use fallback prompts
    }
  }

  // ── Strategy Decision Tree ────────────────────────────────────
  // If Space is awake, try IDM-VTON first (best quality)
  // If Space is sleeping, try ZAI strategies first (faster, more likely to succeed on Vercel)

  // ── Strategy 1a: IDM-VTON (if Space is awake — best quality) ──
  if (health.spaceAwake && Date.now() < totalDeadline - 15_000) {
    strategiesAttempted.push('idm-vton')
    console.log('[virtual-tryon] Strategy 1a: IDM-VTON (Space is awake)')
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
      const errMsg = result.error || 'IDM-VTON failed'
      strategyErrors['idm-vton'] = errMsg
      console.log(`[virtual-tryon] IDM-VTON failed: ${errMsg}`)
    } catch (err) {
      const errMsg = (err as Error).message || String(err)
      strategyErrors['idm-vton'] = errMsg
      console.log(`[virtual-tryon] IDM-VTON error: ${errMsg.substring(0, 100)}`)
    }

    // Pre-warm space in background for next attempt
    preWarmSpace().catch(() => {})
  }

  // ── Strategy 1b: ZAI Product Edit (if Space is sleeping — best alternative) ──
  // Uses the PRODUCT image as the base for editing → AI has visual reference
  // KEY FIX: Use isZAIConfigured() instead of health.zaiReachable — health check is unreliable on Vercel
  if (isZAIConfigured() && !health.spaceAwake && Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('zai-product-edit')
    console.log('[virtual-tryon] Strategy 1b: ZAI Product Edit (Space sleeping, using product image)')
    try {
      const zai = await createZAI()
      const analysis = vlmProductAnalysis || {
        type: config.garmentType,
        mainColor: config.colorFocus,
        secondaryColor: '',
        metalColor: 'none',
        materials: '',
        keyDetails: '',
        pattern: '',
        sizeScale: '',
        colorSummary: config.colorFocus,
      }

      const prompt = buildProductEditPrompt(config, input.productName, analysis, vlmSelfieAnalysis)
      const remainingTime = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now())

      console.log(`[virtual-tryon] ZAI Product Edit: calling images.generations.edit with product image (timeout: ${remainingTime}ms)`)
      const result = await Promise.race([
        zai.images.generations.edit({
          prompt,
          image: input.productImageBase64,  // PRODUCT image as base — AI sees the product
          size: config.size,
        }),
        new Promise<null>(r => setTimeout(() => r(null), remainingTime)),
      ])

      if (result) {
        const imageUrl = await processZAIImageResponse(result as any)
        if (imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI Product Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl,
            strategy: 'zai-product-edit',
            elapsedMs: elapsed,
          }
        }
      }
      const errMsg = 'ZAI Product Edit returned no usable image'
      strategyErrors['zai-product-edit'] = errMsg
      console.log(`[virtual-tryon] ${errMsg}`)
    } catch (err) {
      const msg = (err as Error).message || String(err)
      strategyErrors['zai-product-edit'] = msg
      console.log(`[virtual-tryon] ZAI Product Edit failed: ${msg.substring(0, 150)}`)
    }
  }

  // ── Strategy 2: ZAI Selfie Edit (face preserved, text-based product) ──
  // KEY FIX: Use isZAIConfigured() instead of health.zaiReachable
  if (isZAIConfigured() && Date.now() < totalDeadline - 10_000) {
    strategiesAttempted.push('zai-selfie-edit')
    console.log('[virtual-tryon] Strategy 2: ZAI Selfie Edit')
    try {
      const zai = await createZAI()
      const analysis = vlmProductAnalysis || {
        type: config.garmentType,
        mainColor: config.colorFocus,
        secondaryColor: '',
        metalColor: 'none',
        materials: '',
        keyDetails: '',
        pattern: '',
        sizeScale: '',
        colorSummary: config.colorFocus,
      }

      // Build detailed prompt from VLM analysis
      const prompt = vlmProductAnalysis
        ? buildSelfieEditPrompt(config, input.productName, analysis, vlmSelfieAnalysis)
        : `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${input.productName}". Keep the person's EXACT face, skin tone, and body proportions. The ${config.colorFocus} must be accurate. The product must look NATURALLY WORN — NOT pasted or overlaid. ${config.bodyType}. Photorealistic, 8K detail.`

      const remainingTime = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now())

      console.log(`[virtual-tryon] ZAI Selfie Edit: calling images.generations.edit with selfie (timeout: ${remainingTime}ms)`)
      const result = await Promise.race([
        zai.images.generations.edit({
          prompt,
          image: input.selfieData,  // SELFIE as base — face is preserved
          size: config.size,
        }),
        new Promise<null>(r => setTimeout(() => r(null), remainingTime)),
      ])

      if (result) {
        const imageUrl = await processZAIImageResponse(result as any)
        if (imageUrl) {
          const elapsed = Date.now() - totalStart
          console.log(`[virtual-tryon] ✅ ZAI Selfie+Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return {
            success: true,
            imageUrl,
            strategy: 'zai-selfie-edit',
            elapsedMs: elapsed,
          }
        }
      }
      const errMsg = 'ZAI Selfie Edit returned no usable image'
      strategyErrors['zai-selfie-edit'] = errMsg
      console.log(`[virtual-tryon] ${errMsg}`)
    } catch (err) {
      const msg = (err as Error).message || String(err)
      strategyErrors['zai-selfie-edit'] = msg
      console.log(`[virtual-tryon] ZAI Selfie+Edit failed: ${msg.substring(0, 150)}`)
    }
  }

  // ── Strategy 3: ZAI Text-to-Image (last resort) ──────────────
  // KEY FIX: Use isZAIConfigured() instead of health.zaiReachable
  if (isZAIConfigured() && Date.now() < totalDeadline - 8_000) {
    strategiesAttempted.push('zai-generate')
    console.log('[virtual-tryon] Strategy 3: ZAI Text-to-Image')
    try {
      const zai = await createZAI()
      const prompt = buildGeneratePrompt(config, input.productName, vlmProductAnalysis, vlmSelfieAnalysis)
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
      strategyErrors['zai-generate'] = 'ZAI Text-to-Image returned no usable image'
    } catch (err) {
      const msg = (err as Error).message || String(err)
      strategyErrors['zai-generate'] = msg
      console.log(`[virtual-tryon] ZAI Text-to-Image error: ${msg.substring(0, 100)}`)
    }
  }

  // ── Strategy 4: Late IDM-VTON attempt (if Space might have woken up) ──
  if (!health.spaceAwake && Date.now() < totalDeadline - 20_000 && !strategiesAttempted.includes('idm-vton')) {
    strategiesAttempted.push('idm-vton-late')
    console.log('[virtual-tryon] Strategy 4: Late IDM-VTON attempt (Space may have woken up)')
    try {
      // Quick re-check if Space is awake now
      const isAwakeNow = await isSpaceAwake()
      if (isAwakeNow) {
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
          console.log(`[virtual-tryon] ✅ Late IDM-VTON succeeded in ${(elapsed / 1000).toFixed(1)}s`)
          return { ...result, strategy: 'idm-vton', elapsedMs: elapsed }
        }
        strategyErrors['idm-vton-late'] = result.error || 'Late IDM-VTON failed'
      } else {
        strategyErrors['idm-vton-late'] = 'Space still sleeping'
      }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      strategyErrors['idm-vton-late'] = msg
      console.log(`[virtual-tryon] Late IDM-VTON error: ${msg.substring(0, 100)}`)
    }
  }

  // ── All strategies failed ────────────────────────────────────────
  const elapsed = Date.now() - totalStart
  const isVercel = !!process.env.VERCEL
  console.log(`[virtual-tryon] All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`[virtual-tryon] Strategies attempted: ${strategiesAttempted.join(', ')}`)
  console.log(`[virtual-tryon] Strategy errors: ${JSON.stringify(strategyErrors)}`)

  // Build helpful error message
  let errorMessage: string
  let errorCode: TryOnResult['errorCode']

  if (!isZAIConfigured() && !health.spaceAwake) {
    errorCode = 'ZAI_NOT_CONFIGURED'
    if (isVercel) {
      errorMessage = 'AI try-on requires ZAI_BASE_URL and ZAI_API_KEY environment variables on Vercel. Please set both in your Vercel project settings under Environment Variables.'
    } else {
      errorMessage = 'AI services are currently unavailable. Please try again in a few minutes.'
    }
  } else if (health.zaiReachable && Object.keys(strategyErrors).length > 0) {
    errorCode = 'ALL_STRATEGIES_FAILED'
    errorMessage = 'AI try-on services processed the request but could not generate a usable result. Please try again in a few minutes.'
  } else {
    errorCode = 'ALL_STRATEGIES_FAILED'
    errorMessage = 'AI try-on services are currently busy. Please try again in a few minutes.'
  }

  return {
    success: false,
    error: errorMessage,
    errorCode,
    elapsedMs: elapsed,
    debugInfo: {
      strategiesAttempted,
      strategyErrors,
      healthCheck: { zaiReachable: health.zaiReachable, spaceAwake: health.spaceAwake },
    },
  }
}

// ── Backward Compatibility ─────────────────────────────────────────

export function isHFAvailable(): boolean { return true }

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean; loadAvg: number | null }> {
  return { awake: await isSpaceAwake(), loadAvg: null }
}
