/**
 * AI Virtual Try-On Pipeline with VLM Verification
 *
 * 6-Phase Pipeline:
 * 1. Product Analysis — VLM extracts structured colors with hex codes
 * 2. First Pass — Edit selfie with category-specific prompt + colorSchema
 * 3. VLM Verification — Compare generated image vs product, score match
 * 4. Refinement Pass — If color accuracy < 7, edit with targeted corrections
 * 5. Final Selection — Pick best between first-pass and refinement
 * 6. Watermark + Deliver
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
  // Pipeline metadata
  pipelinePhase?: string
  colorAccuracy?: number
  faceAccuracy?: number
  strategy?: string
  totalPasses?: number
}

interface ColorEntry {
  role: string       // 'primary' | 'accent' | 'metal' | 'secondary'
  color: string      // e.g. 'deep maroon red'
  hex: string        // e.g. '#8B1A1A'
  surface: string    // e.g. 'main fabric' | 'chain' | 'stones'
}

interface ProductAnalysis {
  type: string           // e.g. 'diamond bib necklace'
  category: string       // e.g. 'jewelry'
  colors: ColorEntry[]
  materials: string[]    // e.g. ['18k white gold', 'diamond']
  designElements: string[]
  colorSchema: string    // compact token for prompts
  rawDescription: string
}

interface VerificationResult {
  colorAccuracy: number     // 0-10
  materialAccuracy: number  // 0-10
  shapeAccuracy: number     // 0-10
  facePreservation: number  // 0-10
  overallScore: number      // weighted
  correctionPrompt?: string // specific fix instructions
  passed: boolean
}

interface GenResult {
  imageUrl: string
  strategy: string
  phase: string
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

const API_CALL_DELAY = 1500

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Category Configuration ─────────────────────────────────────────

interface CategoryConfig {
  placement: string
  size: ImageSize
  colorConstraints: string
  editStrategy: 'selfie-first' | 'product-first' | 'selfie-only'
  bodyType: string
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  jewelry: {
    placement: 'wearing the jewelry piece',
    size: '864x1152',
    colorConstraints: 'The jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY — even slight color shifts make the piece look wrong. The metal must be the same shade and finish (polished/matte/antique).',
    editStrategy: 'selfie-first',
    bodyType: 'Close-up professional beauty photograph from chest up',
  },
  sarees: {
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist',
    size: '768x1344',
    colorConstraints: 'The saree fabric color, border color, and zari/work color must match EXACTLY. Saree colors are very specific — a maroon saree must stay maroon, not become red or burgundy. The pallu design must match.',
    editStrategy: 'selfie-only',
    bodyType: 'Full-body professional fashion photograph',
  },
  watches: {
    placement: 'wearing the watch on the left wrist',
    size: '864x1152',
    colorConstraints: 'The watch dial color, case metal color, and strap color must match EXACTLY. Watch details like sub-dials, bezel color, and hand colors are critical.',
    editStrategy: 'selfie-first',
    bodyType: 'Close-up professional photograph from waist up',
  },
  fashion: {
    placement: 'wearing the outfit',
    size: '768x1344',
    colorConstraints: 'The outfit fabric color, print pattern, and accent colors must match EXACTLY. Fabric texture and drape must be preserved.',
    editStrategy: 'selfie-only',
    bodyType: 'Full-body professional fashion photograph',
  },
  'mens-shirts': {
    placement: 'wearing the shirt on the torso',
    size: '768x1344',
    colorConstraints: 'The shirt fabric color, pattern, and collar/cuff details must match EXACTLY. Button color and fabric texture must be preserved.',
    editStrategy: 'selfie-only',
    bodyType: 'Full-body professional fashion photograph',
  },
  'mens-shirts-t-shirts': {
    placement: 'wearing the shirt on the torso',
    size: '768x1344',
    colorConstraints: 'The shirt fabric color, pattern, and collar/cuff details must match EXACTLY. Button color and fabric texture must be preserved.',
    editStrategy: 'selfie-only',
    bodyType: 'Full-body professional fashion photograph',
  },
  'leather-goods': {
    placement: 'holding the leather product',
    size: '864x1152',
    colorConstraints: 'The leather color, grain texture, and hardware metal color must match EXACTLY. Leather shades are very specific — cognac is not tan.',
    editStrategy: 'selfie-first',
    bodyType: 'Professional product-in-use photograph',
  },
  fragrances: {
    placement: 'holding the fragrance bottle',
    size: '864x1152',
    colorConstraints: 'The bottle shape, cap color, and liquid color must match EXACTLY. The brand label must be visible.',
    editStrategy: 'selfie-first',
    bodyType: 'Professional product-in-use photograph',
  },
  'home-living': {
    placement: 'with the home decor product displayed',
    size: '1344x768',
    colorConstraints: 'The product colors, materials, and finish must match EXACTLY.',
    editStrategy: 'selfie-first',
    bodyType: 'Professional lifestyle photograph',
  },
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryConfig {
  const config = { ...CATEGORY_CONFIG[categorySlug] } || { ...CATEGORY_CONFIG.jewelry }

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

// ── VLM Prompts ────────────────────────────────────────────────────

const PRODUCT_ANALYSIS_PROMPT = `Analyze this luxury product image for a virtual try-on system. Extract PRECISE color information.

Respond in this EXACT format:
TYPE: [product type, e.g. "diamond bib necklace", "maroon kanjeevaram silk saree"]
CATEGORY: [jewelry/sarees/watches/fashion/etc]
COLORS:
- PRIMARY: [exact color name] | [hex code] | [surface, e.g. "main fabric", "chain"]
- ACCENT: [exact color name] | [hex code] | [surface]
- METAL: [exact metal color] | [hex code] | [surface, e.g. "setting", "buckle"]
(add more lines as needed)
MATERIALS: [comma-separated list, e.g. "18k white gold, round brilliant-cut diamonds"]
DESIGN: [2-3 key design elements]

CRITICAL: Color accuracy is the #1 priority. Use specific color names like "deep maroon red" not just "red". Include hex codes when possible.`

const VERIFICATION_PROMPT = `Compare these two images for a virtual try-on system:

IMAGE 1: An AI-generated virtual try-on result
IMAGE 2: The original product image

Score the match on these criteria (0-10 each):

1. COLOR_ACCURACY: How well do the product colors in IMAGE 1 match IMAGE 2? (0=completely wrong colors, 10=perfect color match)
2. MATERIAL_ACCURACY: How well do the materials/textures match? (0=completely different, 10=identical)
3. SHAPE_ACCURACY: How well does the product shape/design match? (0=completely different product, 10=exact same design)
4. FACE_PRESERVATION: How well is the person's face preserved? (0=unrecognizable, 10=perfect preservation)

Respond in this EXACT format:
COLOR: [score] | [brief note on any color mismatch, e.g. "necklace too silver, should be gold"]
MATERIAL: [score] | [brief note]
SHAPE: [score] | [brief note]
FACE: [score] | [brief note]
CORRECTION: [if COLOR < 7, provide specific correction instruction, e.g. "Change the necklace metal from silver to warm yellow gold #CFB53B"]
VERDICT: PASS or FAIL

Be strict — a score of 7+ means the product is clearly recognizable as the same item.`

const REFINEMENT_VERIFICATION_PROMPT = `Compare these two images after a refinement pass:

IMAGE 1: A refined virtual try-on result
IMAGE 2: The original product image

Score ONLY the product match:
1. COLOR_ACCURACY: 0-10
2. MATERIAL_ACCURACY: 0-10
3. SHAPE_ACCURACY: 0-10
4. FACE_PRESERVATION: 0-10

Respond in EXACT format:
COLOR: [score] | [note]
MATERIAL: [score] | [note]
SHAPE: [score] | [note]
FACE: [score] | [note]
VERDICT: PASS or FAIL`

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

// ── Parsing Helpers ────────────────────────────────────────────────

function parseProductAnalysis(raw: string, categorySlug: string): ProductAnalysis {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let type = 'luxury item'
  const colors: ColorEntry[] = []
  const materials: string[] = []
  const designElements: string[] = []

  for (const line of lines) {
    // Parse type
    if (line.startsWith('TYPE:')) {
      type = line.replace('TYPE:', '').trim()
    }
    // Parse colors
    else if (line.startsWith('- PRIMARY:') || line.startsWith('- ACCENT:') || line.startsWith('- METAL:') || line.startsWith('- SECONDARY:')) {
      const role = line.split(':')[0].replace('- ', '').toLowerCase().trim()
      const rest = line.substring(line.indexOf(':') + 1).trim()
      const parts = rest.split('|').map(p => p.trim())
      colors.push({
        role,
        color: parts[0] || 'unknown',
        hex: parts[1]?.startsWith('#') ? parts[1] : '',
        surface: parts[2] || 'main',
      })
    }
    // Parse materials
    else if (line.startsWith('MATERIALS:')) {
      const matStr = line.replace('MATERIALS:', '').trim()
      materials.push(...matStr.split(',').map(m => m.trim()).filter(Boolean))
    }
    // Parse design
    else if (line.startsWith('DESIGN:')) {
      const desStr = line.replace('DESIGN:', '').trim()
      designElements.push(...desStr.split(',').map(d => d.trim()).filter(Boolean))
    }
  }

  // Build colorSchema token for prompts
  const colorParts = colors.map(c => {
    const hexPart = c.hex ? ` (${c.hex})` : ''
    return `${c.role.toUpperCase()}: ${c.color}${hexPart}`
  })
  const colorSchema = colorParts.join(' | ') || 'standard colors'

  return {
    type,
    category: categorySlug,
    colors,
    materials,
    designElements,
    colorSchema,
    rawDescription: raw,
  }
}

function parseVerification(raw: string): VerificationResult {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let colorAccuracy = 5
  let materialAccuracy = 5
  let shapeAccuracy = 5
  let facePreservation = 5
  let correctionPrompt = ''
  let passed = false

  for (const line of lines) {
    if (line.startsWith('COLOR:')) {
      const parts = line.replace('COLOR:', '').split('|').map(p => p.trim())
      colorAccuracy = Math.min(10, Math.max(0, parseInt(parts[0]) || 5))
    }
    else if (line.startsWith('MATERIAL:')) {
      const parts = line.replace('MATERIAL:', '').split('|').map(p => p.trim())
      materialAccuracy = Math.min(10, Math.max(0, parseInt(parts[0]) || 5))
    }
    else if (line.startsWith('SHAPE:')) {
      const parts = line.replace('SHAPE:', '').split('|').map(p => p.trim())
      shapeAccuracy = Math.min(10, Math.max(0, parseInt(parts[0]) || 5))
    }
    else if (line.startsWith('FACE:')) {
      const parts = line.replace('FACE:', '').split('|').map(p => p.trim())
      facePreservation = Math.min(10, Math.max(0, parseInt(parts[0]) || 5))
    }
    else if (line.startsWith('CORRECTION:')) {
      correctionPrompt = line.replace('CORRECTION:', '').trim()
    }
    else if (line.startsWith('VERDICT:')) {
      passed = line.replace('VERDICT:', '').trim().toUpperCase() === 'PASS'
    }
  }

  const overallScore = colorAccuracy * 0.4 + facePreservation * 0.3 + materialAccuracy * 0.15 + shapeAccuracy * 0.15

  return {
    colorAccuracy,
    materialAccuracy,
    shapeAccuracy,
    facePreservation,
    overallScore,
    correctionPrompt: correctionPrompt || undefined,
    passed: passed || (colorAccuracy >= 7 && overallScore >= 6),
  }
}

// ── Image Generation Helpers ───────────────────────────────────────

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
    console.error('[pipeline] Image edit failed:', (err as Error).message?.substring(0, 200))
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
    console.error('[pipeline] Image create failed:', (err as Error).message?.substring(0, 200))
    return null
  }
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

    // ── Phase 0: Fetch suggestions ───────────────────────────────
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

    // ── Phase 1: Product Analysis ────────────────────────────────
    if (job) { job.progress = 'AI is analyzing the product...'; job.pipelinePhase = 'product-analysis' }
    console.log(`[pipeline:${jobId}] Phase 1: Analyzing product "${productName}"`)

    const analysisRaw = await vlmAnalyze(PRODUCT_ANALYSIS_PROMPT, productImageBase64)
    const analysis = parseProductAnalysis(analysisRaw, categorySlug)
    console.log(`[pipeline:${jobId}] Product: ${analysis.type}, Colors: ${analysis.colorSchema}`)

    await delay(API_CALL_DELAY)

    // Also get person description
    const personDesc = await vlmAnalyze(
      'Describe this person briefly for a virtual try-on: face shape, skin tone, hair color/style, body build. 1-2 sentences.',
      selfieData
    )
    console.log(`[pipeline:${jobId}] Person: ${personDesc.substring(0, 100)}`)

    await delay(API_CALL_DELAY)

    // ── Phase 2: First Pass Generation ───────────────────────────
    if (job) { job.progress = 'Creating your virtual try-on...'; job.pipelinePhase = 'first-pass' }
    console.log(`[pipeline:${jobId}] Phase 2: First pass generation (strategy: ${config.editStrategy})`)

    const results: GenResult[] = []

    // Build the main edit prompt with colorSchema
    const editPrompt = `Professional fashion photograph. ${config.bodyType} of this EXACT person ${config.placement}. The product is "${productName}" — a ${analysis.type}. COLOR SCHEMA: ${analysis.colorSchema}. MATERIALS: ${analysis.materials.join(', ')}. DESIGN: ${analysis.designElements.join(', ')}. ${config.colorConstraints} CRITICAL INSTRUCTIONS: 1) Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them. 2) Apply the product with its EXACT colors as specified in the COLOR SCHEMA — match every color precisely. 3) The product must look realistic, natural, and properly fitted. Studio lighting, photorealistic, 8K quality.`

    // Strategy A: Edit selfie (preserves face, applies product from description)
    const s1 = await safeImageEdit(editPrompt, selfieData, config.size)
    if (s1) {
      results.push({ imageUrl: s1, strategy: 'edit-selfie', phase: 'first-pass' })
      console.log(`[pipeline:${jobId}] Strategy A (edit-selfie) succeeded`)
    }

    // Strategy B: Edit product image (if strategy allows) - preserves product visuals
    if (config.editStrategy !== 'selfie-only') {
      await delay(API_CALL_DELAY)
      const productEditPrompt = `Professional fashion photograph. ${config.bodyType} showing this EXACT product "${productName}" being worn by a person who is ${config.placement}. Person: ${personDesc}. ${config.colorConstraints} CRITICAL: 1) The product's colors, materials, and design MUST match EXACTLY as shown in this image — do NOT change any color or detail. 2) The person should look natural wearing it. Studio lighting, photorealistic, 8K quality.`

      const s2 = await safeImageEdit(productEditPrompt, productImageBase64, config.size)
      if (s2) {
        results.push({ imageUrl: s2, strategy: 'edit-product', phase: 'first-pass' })
        console.log(`[pipeline:${jobId}] Strategy B (edit-product) succeeded`)
      }
    }

    // Fallback: text-to-image
    if (results.length === 0) {
      await delay(API_CALL_DELAY)
      const createPrompt = `${config.bodyType} of a person ${config.placement}. The product is "${productName}" — a ${analysis.type}. COLOR SCHEMA: ${analysis.colorSchema}. MATERIALS: ${analysis.materials.join(', ')}. Person: ${personDesc}. Show the product being worn with EXACT colors, materials, and details. Photorealistic, studio lighting, 8K, high detail.`

      const s3 = await safeImageCreate(createPrompt, config.size)
      if (s3) {
        results.push({ imageUrl: s3, strategy: 'create-text', phase: 'first-pass' })
        console.log(`[pipeline:${jobId}] Strategy C (text-to-image) succeeded`)
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

    // ── Phase 3: VLM Verification ────────────────────────────────
    // Verify each result against the original product
    if (job) { job.progress = 'Verifying product match...'; job.pipelinePhase = 'verification' }
    console.log(`[pipeline:${jobId}] Phase 3: Verifying ${results.length} results`)

    let bestResult: GenResult | null = null
    let bestVerification: VerificationResult | null = null

    for (const result of results) {
      await delay(API_CALL_DELAY)
      const verifyRaw = await vlmCompare(VERIFICATION_PROMPT, result.imageUrl, productImageBase64)
      const verification = parseVerification(verifyRaw)
      console.log(`[pipeline:${jobId}] ${result.strategy}: color=${verification.colorAccuracy} material=${verification.materialAccuracy} shape=${verification.shapeAccuracy} face=${verification.facePreservation} overall=${verification.overallScore.toFixed(1)} ${verification.passed ? 'PASS' : 'FAIL'}`)

      if (!bestVerification || verification.overallScore > bestVerification.overallScore) {
        bestResult = result
        bestVerification = verification
      }

      // If we found a passing result, use it
      if (verification.passed) break
    }

    // ── Phase 4: Refinement Pass (if needed) ─────────────────────
    let finalResult = bestResult
    let finalVerification = bestVerification
    let totalPasses = 1

    if (bestVerification && bestVerification.colorAccuracy < 7 && bestResult) {
      if (job) { job.progress = 'Refining product colors...'; job.pipelinePhase = 'refinement' }
      console.log(`[pipeline:${jobId}] Phase 4: Refinement needed (colorAccuracy=${bestVerification.colorAccuracy})`)

      const correction = bestVerification.correctionPrompt || `The product colors don't match well enough. Ensure the product matches these exact colors: ${analysis.colorSchema}. Materials: ${analysis.materials.join(', ')}.`

      const refinementPrompt = `Professional fashion photograph refinement. ${correction}. ${config.colorConstraints} Keep the person's face and body EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality.`

      await delay(API_CALL_DELAY)
      const refined = await safeImageEdit(refinementPrompt, bestResult.imageUrl, config.size)

      if (refined) {
        totalPasses = 2
        // Verify the refinement
        await delay(API_CALL_DELAY)
        const refineVerifyRaw = await vlmCompare(REFINEMENT_VERIFICATION_PROMPT, refined, productImageBase64)
        const refineVerification = parseVerification(refineVerifyRaw)
        console.log(`[pipeline:${jobId}] Refined: color=${refineVerification.colorAccuracy} face=${refineVerification.facePreservation} overall=${refineVerification.overallScore.toFixed(1)} ${refineVerification.passed ? 'PASS' : 'FAIL'}`)

        // Use refinement if it's better
        if (refineVerification.overallScore > bestVerification.overallScore) {
          finalResult = { imageUrl: refined, strategy: `${bestResult!.strategy}-refined`, phase: 'refinement' }
          finalVerification = refineVerification
        }
      }
    }

    if (!finalResult || !finalVerification) {
      if (job) {
        job.status = 'completed'
        job.imageUrl = bestResult?.imageUrl || ''
        job.strategy = bestResult?.strategy || 'unknown'
        job.progress = 'Complete (unverified)'
      }
      return
    }

    // ── Phase 5: Record scores ───────────────────────────────────
    console.log(`[pipeline:${jobId}] Final: ${finalResult.strategy}, color=${finalVerification.colorAccuracy}/10, face=${finalVerification.facePreservation}/10, overall=${finalVerification.overallScore.toFixed(1)}`)

    // ── Phase 6: Watermark + Deliver ─────────────────────────────
    if (job) { job.progress = 'Adding finishing touches...'; job.pipelinePhase = 'watermark' }

    let finalImageUrl = finalResult.imageUrl
    try {
      finalImageUrl = await addWatermark(finalResult.imageUrl)
      console.log(`[pipeline:${jobId}] Watermark applied`)
    } catch (wmErr) {
      console.error('[pipeline] Watermark failed:', wmErr)
    }

    // ── Update job ───────────────────────────────────────────────
    if (job) {
      job.status = 'completed'
      job.imageUrl = finalImageUrl
      job.productName = productName
      job.strategy = finalResult.strategy
      job.colorAccuracy = finalVerification.colorAccuracy
      job.faceAccuracy = finalVerification.facePreservation
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
