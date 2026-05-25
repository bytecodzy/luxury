/**
 * AI Virtual Try-On Pipeline v2 — Concrete & Reliable
 *
 * Key improvements over v1:
 * 1. VERIFIED: API supports `images: [{ url }]` array format (not singular `image`)
 * 2. DUAL-IMAGE: Pass BOTH selfie + product to edit API for accurate color matching
 * 3. SIMPLIFIED: Fewer VLM calls, faster generation
 * 4. STRATEGIC: Try multiple generation strategies and pick best via VLM
 * 5. ROBUST: Better fallback handling and error recovery
 *
 * Pipeline Phases:
 * 1. Quick Analysis — VLM extracts product details
 * 2. Generate — Multiple strategies with dual-image support
 * 3. VLM Pick — Compare results against product, select best
 * 4. Refine (1 pass) — If best result has poor color match
 * 5. Watermark + Deliver
 */

import { createZAI } from './zai'
import { addWatermark } from './watermark'

// ── Types ──────────────────────────────────────────────────────────

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

export interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  progress?: string
  suggestions?: any[]
  pipelinePhase?: string
  colorAccuracy?: number
  faceAccuracy?: number
  strategy?: string
  totalPasses?: number
}

// ── Job Storage ────────────────────────────────────────────────────

const jobs = new Map<string, TryOnJob>()

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 15 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

export function createJob(id: string, data: Partial<TryOnJob>): TryOnJob {
  const job: TryOnJob = {
    status: 'processing',
    createdAt: Date.now(),
    progress: 'Starting AI style preview...',
    ...data,
  }
  jobs.set(id, job)
  return job
}

export function getJob(id: string): TryOnJob | undefined {
  return jobs.get(id)
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id)
}

// ── Rate limiting ──────────────────────────────────────────────────

const API_CALL_DELAY = 1200

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Category Configuration ─────────────────────────────────────────

interface CategoryConfig {
  placement: string
  size: ImageSize
  colorFocus: string
  bodyType: string
  useProductEdit: boolean // Whether product-first edit makes sense for this category
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  jewelry: {
    placement: 'wearing the jewelry piece',
    size: '864x1152',
    colorFocus: 'jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY',
    bodyType: 'Close-up beauty photograph from chest up',
    useProductEdit: true,
  },
  sarees: {
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist',
    size: '768x1344',
    colorFocus: 'saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false, // Sarees are too complex for product-first edit
  },
  watches: {
    placement: 'wearing the watch on the left wrist',
    size: '864x1152',
    colorFocus: 'watch dial color, case metal color, and strap color must match EXACTLY',
    bodyType: 'Close-up photograph from waist up',
    useProductEdit: true,
  },
  fashion: {
    placement: 'wearing the outfit',
    size: '768x1344',
    colorFocus: 'outfit fabric color, print pattern, and accent colors must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'mens-shirts': {
    placement: 'wearing the shirt',
    size: '768x1344',
    colorFocus: 'shirt fabric color, pattern, and collar/cuff details must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'mens-shirts-t-shirts': {
    placement: 'wearing the shirt',
    size: '768x1344',
    colorFocus: 'shirt fabric color, pattern, and details must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'leather-goods': {
    placement: 'holding the leather product',
    size: '864x1152',
    colorFocus: 'leather color, grain texture, and hardware metal color must match EXACTLY',
    bodyType: 'Professional product-in-use photograph',
    useProductEdit: true,
  },
  fragrances: {
    placement: 'holding the fragrance bottle',
    size: '864x1152',
    colorFocus: 'bottle shape, cap color, and liquid color must match EXACTLY',
    bodyType: 'Professional product-in-use photograph',
    useProductEdit: true,
  },
  'home-living': {
    placement: 'with the home decor product',
    size: '1344x768',
    colorFocus: 'product colors, materials, and finish must match EXACTLY',
    bodyType: 'Professional lifestyle photograph',
    useProductEdit: true,
  },
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryConfig {
  const config = CATEGORY_CONFIG[categorySlug]
    ? { ...CATEGORY_CONFIG[categorySlug] }
    : { ...CATEGORY_CONFIG.jewelry }

  // Override placement based on product name for jewelry
  if (categorySlug === 'jewelry') {
    const n = productName.toLowerCase()
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud'))
      config.placement = 'wearing earrings on both earlobes'
    else if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala'))
      config.placement = 'wearing a necklace around the neck'
    else if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada'))
      config.placement = 'wearing a bracelet on the wrist'
    else if (n.includes('ring'))
      config.placement = 'wearing a ring on the finger'
    else if (n.includes('set') || n.includes('bridal'))
      config.placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
  }

  return config
}

// ── VLM Helpers ────────────────────────────────────────────────────

async function vlmAnalyze(prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch (err) {
    console.error('[pipeline] VLM analysis failed:', (err as Error).message?.substring(0, 200))
    return ''
  }
}

async function vlmCompare(prompt: string, image1Url: string, image2Url: string, timeoutMs = 45000): Promise<string> {
  try {
    const zai = await createZAI()
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image1Url } },
          { type: 'image_url', image_url: { url: image2Url } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch (err) {
    console.error('[pipeline] VLM comparison failed:', (err as Error).message?.substring(0, 200))
    return ''
  }
}

// ── Image Generation Helpers ───────────────────────────────────────

/**
 * Image edit with a SINGLE input image.
 * The ZAI API accepts `images: [{ url: string }]` array format.
 */
async function safeImageEdit(prompt: string, imageUrl: string, size: ImageSize): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: imageUrl }],
      size,
    } as any)

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    return null
  } catch (err) {
    console.error('[pipeline] Image edit (single) failed:', (err as Error).message?.substring(0, 300))
    return null
  }
}

/**
 * KEY IMPROVEMENT: Image edit with TWO input images (selfie + product).
 * The ZAI API supports multiple images in the `images` array.
 * This allows the model to SEE both the person AND the product,
 * dramatically improving color accuracy — the model doesn't need to
 * guess colors from a text description, it can see the actual product.
 */
async function safeImageEditDual(
  prompt: string,
  selfieUrl: string,
  productUrl: string,
  size: ImageSize,
): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await zai.images.generations.edit({
      prompt,
      images: [
        { url: selfieUrl },
        { url: productUrl },
      ],
      size,
    } as any)

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    return null
  } catch (err) {
    console.error('[pipeline] Image edit (dual) failed:', (err as Error).message?.substring(0, 300))
    return null
  }
}

async function safeImageCreate(prompt: string, size: ImageSize): Promise<string | null> {
  try {
    const zai = await createZAI()
    const response = await zai.images.generations.create({
      prompt,
      size,
    })

    if (response?.data?.[0]?.base64) {
      return `data:image/png;base64,${response.data[0].base64}`
    }
    return null
  } catch (err) {
    console.error('[pipeline] Image create failed:', (err as Error).message?.substring(0, 300))
    return null
  }
}

// ── VLM Prompts ────────────────────────────────────────────────────

const PRODUCT_ANALYSIS_PROMPT = `Analyze this luxury product for a virtual try-on system. I need EXACT visual details.

Respond EXACTLY in this format:
TYPE: [specific product type, e.g. "diamond bib necklace", "maroon kanjeevaram silk saree"]
MAIN_COLOR: [the dominant color with hex code, e.g. "deep maroon red #8B1A1A"]
SECONDARY_COLOR: [secondary/accent color with hex, e.g. "gold zari #CFB53B"]
METAL_COLOR: [metal tone if applicable, e.g. "warm yellow gold #DAA520", or "none"]
MATERIALS: [comma-separated, e.g. "18k white gold, round brilliant-cut diamonds"]
KEY_DETAILS: [2-3 most visible design elements that must be preserved]

CRITICAL: Color accuracy is #1 priority. Use specific color names with hex codes. "Red" is not enough — say "deep maroon red #8B1A1A".`

const VERIFICATION_PROMPT = `Compare these two images for a virtual try-on:

IMAGE 1: AI-generated try-on result
IMAGE 2: Original product image

Rate on 0-10 scale:
1. COLOR: How well do the product colors match? (0=wrong colors, 10=perfect match)
2. SHAPE: How well does the product shape/design match? (0=different product, 10=exact same)
3. FACE: How well is the person's face preserved? (0=unrecognizable, 10=perfect)
4. OVERALL: Overall product accuracy (0=total mismatch, 10=perfect match)

Respond EXACTLY:
COLOR: [score]
SHAPE: [score]
FACE: [score]
OVERALL: [score]
ISSUE: [if COLOR<7, describe the specific color mismatch, e.g. "necklace is silver but should be gold #DAA520"]
VERDICT: PASS or FAIL

A score of 7+ means clearly recognizable as the same item. Be strict.`

// ── Parsing Helpers ────────────────────────────────────────────────

interface ProductInfo {
  type: string
  mainColor: string
  secondaryColor: string
  metalColor: string
  materials: string[]
  keyDetails: string[]
  colorSummary: string  // Compact summary for prompts
}

function parseProductAnalysis(raw: string): ProductInfo {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let type = 'luxury item'
  let mainColor = ''
  let secondaryColor = ''
  let metalColor = ''
  const materials: string[] = []
  const keyDetails: string[] = []

  for (const line of lines) {
    if (line.startsWith('TYPE:')) type = line.replace('TYPE:', '').trim()
    else if (line.startsWith('MAIN_COLOR:')) mainColor = line.replace('MAIN_COLOR:', '').trim()
    else if (line.startsWith('SECONDARY_COLOR:')) secondaryColor = line.replace('SECONDARY_COLOR:', '').trim()
    else if (line.startsWith('METAL_COLOR:')) metalColor = line.replace('METAL_COLOR:', '').trim()
    else if (line.startsWith('MATERIALS:')) {
      materials.push(...line.replace('MATERIALS:', '').trim().split(',').map(m => m.trim()).filter(Boolean))
    }
    else if (line.startsWith('KEY_DETAILS:')) {
      keyDetails.push(...line.replace('KEY_DETAILS:', '').trim().split(',').map(d => d.trim()).filter(Boolean))
    }
  }

  // Build compact color summary for prompts
  const parts: string[] = []
  if (mainColor) parts.push(`MAIN: ${mainColor}`)
  if (secondaryColor) parts.push(`ACCENT: ${secondaryColor}`)
  if (metalColor && metalColor !== 'none') parts.push(`METAL: ${metalColor}`)
  const colorSummary = parts.join('. ') || 'standard colors'

  return { type, mainColor, secondaryColor, metalColor, materials, keyDetails, colorSummary }
}

interface VerificationResult {
  colorScore: number
  shapeScore: number
  faceScore: number
  overallScore: number
  issue: string
  passed: boolean
}

function parseVerification(raw: string): VerificationResult {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let colorScore = 5
  let shapeScore = 5
  let faceScore = 5
  let overallScore = 5
  let issue = ''
  let passed = false

  for (const line of lines) {
    if (line.startsWith('COLOR:')) {
      colorScore = Math.min(10, Math.max(0, parseInt(line.replace('COLOR:', '').trim()) || 5))
    }
    else if (line.startsWith('SHAPE:')) {
      shapeScore = Math.min(10, Math.max(0, parseInt(line.replace('SHAPE:', '').trim()) || 5))
    }
    else if (line.startsWith('FACE:')) {
      faceScore = Math.min(10, Math.max(0, parseInt(line.replace('FACE:', '').trim()) || 5))
    }
    else if (line.startsWith('OVERALL:')) {
      overallScore = Math.min(10, Math.max(0, parseInt(line.replace('OVERALL:', '').trim()) || 5))
    }
    else if (line.startsWith('ISSUE:')) {
      issue = line.replace('ISSUE:', '').trim()
    }
    else if (line.startsWith('VERDICT:')) {
      passed = line.replace('VERDICT:', '').trim().toUpperCase() === 'PASS'
    }
  }

  return {
    colorScore,
    shapeScore,
    faceScore,
    overallScore,
    issue,
    passed: passed || (colorScore >= 7 && overallScore >= 6),
  }
}

// ── Generation Result ──────────────────────────────────────────────

interface GenResult {
  imageUrl: string
  strategy: string
  verification?: VerificationResult
}

// ── Build Prompts ──────────────────────────────────────────────────

/**
 * DUAL-IMAGE prompt: Both selfie and product are passed as images.
 * The model can SEE both, so we don't need to describe colors in text.
 * Focus on placement instructions and strict color-matching rules.
 */
function buildDualImagePrompt(
  config: CategoryConfig,
  productName: string,
  productInfo: ProductInfo,
): string {
  return `Professional fashion photograph. ${config.bodyType}.

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "${productName}" (${productInfo.type}).

Show this EXACT person ${config.placement}. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's ${config.colorFocus} — refer to the SECOND image for exact colors
3. Match the MAIN color especially: ${productInfo.mainColor}
${productInfo.metalColor && productInfo.metalColor !== 'none' ? `4. Match the METAL color: ${productInfo.metalColor}` : ''}
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.`
}

/**
 * Selfie-edit prompt: Only the selfie is passed as an image.
 * Product colors are described in text (less accurate but preserves face).
 */
function buildSelfieEditPrompt(
  config: CategoryConfig,
  productName: string,
  productInfo: ProductInfo,
): string {
  return `Professional fashion photograph. ${config.bodyType} of this EXACT person ${config.placement}. The product is "${productName}" — a ${productInfo.type}.

PRODUCT COLOR SCHEMA: ${productInfo.colorSummary}
MATERIALS: ${productInfo.materials.join(', ')}
KEY DETAILS: ${productInfo.keyDetails.join(', ')}

CRITICAL RULES:
1. Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them at all
2. The product's ${config.colorFocus}
3. Match the MAIN color especially: ${productInfo.mainColor}
${productInfo.metalColor && productInfo.metalColor !== 'none' ? `4. Match the METAL color: ${productInfo.metalColor}` : ''}
5. The product must look realistic, natural, and properly fitted on the person

Studio lighting, photorealistic, 8K quality.`
}

/**
 * Product-edit prompt: Only the product is passed as an image.
 * Person is described in text (preserves product colors but face won't match).
 */
function buildProductEditPrompt(
  config: CategoryConfig,
  productName: string,
  productInfo: ProductInfo,
  personDesc: string,
): string {
  return `Professional fashion photograph. ${config.bodyType} showing this EXACT product "${productName}" being worn by a person who is ${config.placement}.

PERSON: ${personDesc}

CRITICAL RULES:
1. The product's colors, materials, and design MUST match EXACTLY as shown in this image — do NOT change any color or detail
2. ${config.colorFocus}
3. The person should look natural and realistic wearing the product
4. The product must be the focal point and clearly visible

Studio lighting, photorealistic, 8K quality.`
}

/**
 * Text-to-image prompt: Generate entirely from text description.
 * Used as last resort when image edit fails.
 */
function buildTextToImagePrompt(
  config: CategoryConfig,
  productName: string,
  productInfo: ProductInfo,
  personDesc: string,
): string {
  return `${config.bodyType} of a person ${config.placement}. The product is "${productName}" — a ${productInfo.type}.

PRODUCT: ${productInfo.colorSummary}. Materials: ${productInfo.materials.join(', ')}. Key details: ${productInfo.keyDetails.join(', ')}
PERSON: ${personDesc}

Show the product being worn with EXACT colors, materials, and details as described. The ${config.colorFocus}.

Photorealistic, studio lighting, 8K, high detail.`
}

// ── Main Pipeline ──────────────────────────────────────────────────

export interface PipelineInput {
  jobId: string
  productName: string
  categorySlug: string
  selfieData: string
  productImageBase64: string
  suggestionsPromise: Promise<any>
}

export async function runPipeline(input: PipelineInput): Promise<void> {
  const { jobId, productName, categorySlug, selfieData, productImageBase64, suggestionsPromise } = input
  const job = jobs.get(jobId)
  if (!job) return

  try {
    const config = getCategoryConfig(categorySlug, productName)

    // ── Phase 0: Fetch suggestions in background ──────────────────
    if (job) job.progress = 'Preparing your style preview...'
    const suggestions = await suggestionsPromise
    const formattedSuggestions = suggestions.map((s: any) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      image: JSON.parse(s.images || '[]')[0] || '/images/placeholder.jpg',
      category: s.category?.name || '',
      categorySlug: s.category?.slug || '',
    }))
    if (job) job.suggestions = formattedSuggestions

    // ── Phase 1: Product Analysis ─────────────────────────────────
    if (job) { job.progress = 'AI is analyzing the product...'; job.pipelinePhase = 'product-analysis' }
    console.log(`[pipeline:${jobId}] Phase 1: Analyzing product "${productName}"`)

    // Run product analysis and person description in parallel
    const [analysisRaw, personDesc] = await Promise.all([
      vlmAnalyze(PRODUCT_ANALYSIS_PROMPT, productImageBase64),
      vlmAnalyze(
        'Describe this person briefly for a virtual try-on: face shape, skin tone, hair color/style, body build. 1-2 sentences only.',
        selfieData
      ),
    ])

    const productInfo = parseProductAnalysis(analysisRaw)
    console.log(`[pipeline:${jobId}] Product: ${productInfo.type}, Colors: ${productInfo.colorSummary}`)
    console.log(`[pipeline:${jobId}] Person: ${personDesc.substring(0, 100)}`)

    await delay(API_CALL_DELAY)

    // ── Phase 2: Generate Multiple Strategies ─────────────────────
    if (job) { job.progress = 'Creating your virtual try-on...'; job.pipelinePhase = 'generation' }
    console.log(`[pipeline:${jobId}] Phase 2: Generating try-on images`)

    const results: GenResult[] = []

    // Strategy A (PRIMARY): Dual-image edit — pass BOTH selfie + product
    // This is the MOST ACCURATE strategy because the model can see the actual product
    console.log(`[pipeline:${jobId}] Strategy A: Dual-image edit (selfie + product)`)
    const dualPrompt = buildDualImagePrompt(config, productName, productInfo)
    const sA = await safeImageEditDual(dualPrompt, selfieData, productImageBase64, config.size)
    if (sA) {
      results.push({ imageUrl: sA, strategy: 'dual-image-edit' })
      console.log(`[pipeline:${jobId}] Strategy A succeeded`)
    } else {
      console.log(`[pipeline:${jobId}] Strategy A failed, trying fallback...`)
    }

    // Strategy B: Edit selfie with product description (preserves face, text-described colors)
    await delay(API_CALL_DELAY)
    console.log(`[pipeline:${jobId}] Strategy B: Selfie-edit with text description`)
    const selfiePrompt = buildSelfieEditPrompt(config, productName, productInfo)
    const sB = await safeImageEdit(selfiePrompt, selfieData, config.size)
    if (sB) {
      results.push({ imageUrl: sB, strategy: 'edit-selfie' })
      console.log(`[pipeline:${jobId}] Strategy B succeeded`)
    } else {
      console.log(`[pipeline:${jobId}] Strategy B failed`)
    }

    // Strategy C: Edit product image with person description (preserves product, text-described person)
    if (config.useProductEdit) {
      await delay(API_CALL_DELAY)
      console.log(`[pipeline:${jobId}] Strategy C: Product-edit with person description`)
      const productPrompt = buildProductEditPrompt(config, productName, productInfo, personDesc)
      const sC = await safeImageEdit(productPrompt, productImageBase64, config.size)
      if (sC) {
        results.push({ imageUrl: sC, strategy: 'edit-product' })
        console.log(`[pipeline:${jobId}] Strategy C succeeded`)
      } else {
        console.log(`[pipeline:${jobId}] Strategy C failed`)
      }
    }

    // Strategy D: Text-to-image fallback
    if (results.length === 0) {
      await delay(API_CALL_DELAY)
      console.log(`[pipeline:${jobId}] Strategy D: Text-to-image fallback`)
      const createPrompt = buildTextToImagePrompt(config, productName, productInfo, personDesc)
      const sD = await safeImageCreate(createPrompt, config.size)
      if (sD) {
        results.push({ imageUrl: sD, strategy: 'create-text' })
        console.log(`[pipeline:${jobId}] Strategy D succeeded`)
      }
    }

    if (results.length === 0) {
      if (job) {
        job.status = 'completed'
        job.imageUrl = ''
        job.strategy = 'canvas-fallback'
        job.progress = 'AI generation unavailable — using style preview'
      }
      return
    }

    // ── Phase 3: VLM Verification & Selection ─────────────────────
    if (job) { job.progress = 'Verifying product match...'; job.pipelinePhase = 'verification' }
    console.log(`[pipeline:${jobId}] Phase 3: Verifying ${results.length} results`)

    let bestResult: GenResult | null = null
    let bestVerification: VerificationResult | null = null

    for (const result of results) {
      await delay(API_CALL_DELAY)
      const verifyRaw = await vlmCompare(VERIFICATION_PROMPT, result.imageUrl, productImageBase64)
      const verification = parseVerification(verifyRaw)
      result.verification = verification
      console.log(`[pipeline:${jobId}] ${result.strategy}: color=${verification.colorScore} shape=${verification.shapeScore} face=${verification.faceScore} overall=${verification.overallScore} ${verification.passed ? 'PASS' : 'FAIL'}`)

      if (!bestVerification || verification.overallScore > bestVerification.overallScore) {
        bestResult = result
        bestVerification = verification
      }

      // If we found a clearly passing result (color >= 8), stop checking others
      if (verification.colorScore >= 8 && verification.passed) break
    }

    if (!bestResult || !bestVerification) {
      // Should not happen since we have results, but handle gracefully
      bestResult = results[0]
      bestVerification = {
        colorScore: 5, shapeScore: 5, faceScore: 5, overallScore: 5,
        issue: 'Verification unavailable', passed: false,
      }
    }

    // ── Phase 4: Refinement Pass (only if color accuracy < 7) ──────
    let finalResult = bestResult
    let totalPasses = 1

    if (bestVerification.colorScore < 7 && bestResult) {
      if (job) { job.progress = 'Refining product colors...'; job.pipelinePhase = 'refinement' }
      console.log(`[pipeline:${jobId}] Phase 4: Refinement needed (colorScore=${bestVerification.colorScore})`)

      // Build specific correction instruction
      let correction = bestVerification.issue
      if (!correction || correction.length < 10) {
        // Generic correction based on product analysis
        correction = `The product colors don't match. It should be: ${productInfo.colorSummary}. Fix the product to match these exact colors.`
      }

      const refinementPrompt = `Professional fashion photograph refinement. ${correction}. The ${config.colorFocus}. Keep the person's face, body, and pose EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality.`

      await delay(API_CALL_DELAY)
      const refined = await safeImageEdit(refinementPrompt, bestResult.imageUrl, config.size)

      if (refined) {
        totalPasses = 2
        // Quick verify the refinement
        await delay(API_CALL_DELAY)
        const refineVerifyRaw = await vlmCompare(VERIFICATION_PROMPT, refined, productImageBase64)
        const refineVerification = parseVerification(refineVerifyRaw)
        console.log(`[pipeline:${jobId}] Refined: color=${refineVerification.colorScore} overall=${refineVerification.overallScore} ${refineVerification.passed ? 'PASS' : 'FAIL'}`)

        // Use refinement if it's better
        if (refineVerification.overallScore > bestVerification.overallScore) {
          finalResult = { imageUrl: refined, strategy: `${bestResult.strategy}-refined`, verification: refineVerification }
          bestVerification = refineVerification
        }
      }
    }

    // ── Phase 5: Record Final Scores ──────────────────────────────
    console.log(`[pipeline:${jobId}] Final: ${finalResult.strategy}, color=${bestVerification.colorScore}/10, face=${bestVerification.faceScore}/10, overall=${bestVerification.overallScore}/10`)

    // ── Phase 6: Watermark + Deliver ──────────────────────────────
    if (job) { job.progress = 'Adding finishing touches...'; job.pipelinePhase = 'watermark' }

    let finalImageUrl = finalResult.imageUrl
    try {
      finalImageUrl = await addWatermark(finalResult.imageUrl)
      console.log(`[pipeline:${jobId}] Watermark applied`)
    } catch (wmErr) {
      console.error('[pipeline] Watermark failed:', wmErr)
    }

    // ── Update job ────────────────────────────────────────────────
    if (job) {
      job.status = 'completed'
      job.imageUrl = finalImageUrl
      job.productName = productName
      job.strategy = finalResult.strategy
      job.colorAccuracy = bestVerification.colorScore
      job.faceAccuracy = bestVerification.faceScore
      job.totalPasses = totalPasses
      job.pipelinePhase = 'complete'
      job.progress = 'Complete!'
    }
  } catch (error) {
    console.error(`[pipeline:${jobId}] Failed:`, error)
    if (job) {
      job.status = 'failed'
      const msg = error instanceof Error ? error.message : 'Generation failed'
      if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
        job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached.'
      } else {
        job.error = msg
      }
    }
  }
}
