/**
 * Virtual Try-On Engine v17 — IMAGE-MATCHING Pipeline
 *
 * PROBLEM SOLVED (v17):
 *   v16 only sent the product NAME as text to Pollinations text-to-image.
 *   The generated image was a "total mismatch" because the AI never saw the
 *   actual product photo — it just guessed from the name.
 *
 * v17 SOLUTION — true image-conditioned generation:
 *   1. Compress the ACTUAL product photo to a small thumbnail (sharp, 512px).
 *   2. Upload the thumbnail to tmpfiles.org (free, anonymous, no auth) → public URL.
 *   3. Call Pollinations image-to-image with that URL as `?image=` reference.
 *   4. The AI now conditions on the REAL product photo → colors, patterns,
 *      embellishments, and silhouette MATCH the actual product.
 *
 * RELIABILITY:
 *   - tmpfiles.org + Pollinations are both 100% free, no auth, no rate limits.
 *   - Works IDENTICALLY on preview, sandbox, and Vercel (no env vars needed).
 *   - Hard fallbacks: if upload fails → text-to-image; if img2img fails → retry.
 *
 * OPTIONAL ENHANCEMENT:
 *   - If ZAI_BASE_URL + ZAI_API_KEY are set, try Z.AI image-edit first for
 *     face preservation (uses the selfie). Falls back to Pollinations if ZAI
 *     is unreachable.
 */

import sharp from 'sharp'
import { isZAIConfigured, getZAIConfig } from './zai'

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string         // base64 data URL of the person's selfie (used for ZAI edit only)
  productImageBase64: string // base64 data URL of the product image — USED for img2img matching
  productName: string
  categorySlug: string
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string
  strategy?: string           // 'pollinations-img2img' | 'pollinations-text' | 'zai-selfie-edit'
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

const TOTAL_TIMEOUT_MS = 55_000
const UPLOAD_TIMEOUT_MS = 12_000
const POLLINATIONS_TIMEOUT_MS = 45_000
const ZAI_EDIT_TIMEOUT_MS = 30_000

// ── Category Configuration ─────────────────────────────────────────

interface CategoryPromptConfig {
  /** What the generated photo should show (body framing) */
  bodyType: string
  /** How the product is worn / placed on the person */
  placement: string
  /** Output image dimensions */
  size: ImageSize
  /** Who to generate as the model */
  modelType: string
  /** Short label for the product category */
  garmentType: string
}

const CATEGORY_PROMPTS: Record<string, CategoryPromptConfig> = {
  jewelry: {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    size: '864x1152',
    modelType: 'an elegant Indian woman with smooth skin, well-groomed hair, subtle makeup',
    garmentType: 'Jewelry',
  },
  sarees: {
    bodyType: 'Full-body professional fashion photograph, head to toe visible',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    size: '768x1344',
    modelType: 'a graceful Indian woman with an elegant posture',
    garmentType: 'Traditional Indian saree',
  },
  watches: {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist, with the watch face clearly visible and properly sized relative to the wrist',
    size: '864x1152',
    modelType: 'a well-dressed person with a natural wrist pose',
    garmentType: 'Watch',
  },
  fashion: {
    bodyType: 'Full-body professional fashion photograph, head to toe visible',
    placement: 'wearing the outfit with proper fit, natural draping, and realistic fabric behavior',
    size: '768x1344',
    modelType: 'a stylish fashion model with confident posture',
    garmentType: 'Fashion outfit',
  },
  'mens-shirts': {
    bodyType: 'Full-body professional fashion photograph, head to toe visible',
    placement: 'wearing the shirt with proper fit, natural draping, and realistic fabric behavior',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'Shirt',
  },
  'mens-shirts-t-shirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the shirt with proper fit and natural draping',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'Shirt',
  },
  'leather-goods': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding or wearing the leather product naturally',
    size: '864x1152',
    modelType: 'an elegant person holding the product',
    garmentType: 'Leather product',
  },
  fragrances: {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    size: '864x1152',
    modelType: 'an elegant person holding the fragrance bottle',
    garmentType: 'Fragrance bottle',
  },
  'home-living': {
    bodyType: 'Professional lifestyle photograph',
    placement: 'with the home decor product in the scene',
    size: '1344x768',
    modelType: 'a beautifully decorated home interior',
    garmentType: 'Home decor product',
  },
  'corporate-gifts': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the gift product elegantly',
    size: '864x1152',
    modelType: 'an elegant person holding the gift',
    garmentType: 'Gift product',
  },
  'women-sarees': {
    bodyType: 'Full-body professional fashion photograph, head to toe visible',
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist, the fabric flowing naturally with realistic folds',
    size: '768x1344',
    modelType: 'a graceful Indian woman with an elegant posture',
    garmentType: 'Traditional Indian saree',
  },
  'women-jewelry': {
    bodyType: 'Close-up beauty photograph from chest up',
    placement: 'wearing the jewelry piece naturally on the correct body part',
    size: '864x1152',
    modelType: 'an elegant Indian woman with smooth skin, well-groomed hair, subtle makeup',
    garmentType: 'Jewelry',
  },
  'women-fashion': {
    bodyType: 'Full-body professional fashion photograph, head to toe visible',
    placement: 'wearing the outfit elegantly with proper fit and natural draping',
    size: '768x1344',
    modelType: 'a stylish female fashion model with confident posture',
    garmentType: 'Fashion outfit',
  },
  'women-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle elegantly',
    size: '864x1152',
    modelType: 'an elegant woman holding the fragrance bottle',
    garmentType: 'Fragrance bottle',
  },
  'women-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    size: '864x1152',
    modelType: 'an elegant woman wearing the accessory',
    garmentType: 'Fashion accessory',
  },
  'kids-fashion': {
    bodyType: 'Full-body professional fashion photograph of a child/teenager',
    placement: 'wearing the outfit with proper fit and natural draping',
    size: '768x1344',
    modelType: 'a happy child/teenager',
    garmentType: 'Kids fashion outfit',
  },
  'men-accessories': {
    bodyType: 'Professional fashion photograph',
    placement: 'wearing the accessory naturally',
    size: '864x1152',
    modelType: 'a stylish man wearing the accessory',
    garmentType: 'Fashion accessory',
  },
  'men-watches': {
    bodyType: 'Close-up photograph from waist up',
    placement: 'wearing the watch on the left wrist',
    size: '864x1152',
    modelType: 'a well-dressed man with a natural wrist pose',
    garmentType: 'Watch',
  },
  'men-tshirts': {
    bodyType: 'Full-body professional fashion photograph',
    placement: 'wearing the t-shirt with proper fit and natural draping',
    size: '768x1344',
    modelType: 'a well-built male fashion model',
    garmentType: 'T-shirt',
  },
  'men-fragrances': {
    bodyType: 'Professional product-in-use photograph',
    placement: 'holding the fragrance bottle',
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
    size: '864x1152',
    modelType: 'a person',
    garmentType: 'Fashion item',
  }
}

// ── Image helpers ──────────────────────────────────────────────────

function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

/**
 * Compress a product image data URL into a small thumbnail suitable for
 * uploading to a free image host. Keeps the longest edge at 512px and
 * encodes as JPEG quality 72 → typically 15-35KB.
 *
 * This is CRITICAL: the smaller the uploaded image, the faster and more
 * reliable the tmpfiles.org upload + Pollinations fetch will be.
 */
async function compressProductImage(productDataUrl: string): Promise<Buffer> {
  const raw = stripDataUrl(productDataUrl)
  const inputBuf = Buffer.from(raw, 'base64')
  return sharp(inputBuf)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer()
}

/**
 * Upload a compressed product image buffer to tmpfiles.org (free, anonymous,
 * no auth). Returns a DIRECT download URL that Pollinations can fetch.
 *
 * Falls back to null if the upload fails — the caller will then skip
 * image-conditioning and use text-to-image instead.
 */
async function uploadToTmpfiles(buf: Buffer, timeoutMs: number): Promise<string | null> {
  // tmpfiles.org expects multipart form upload with field name "file"
  const boundary = '----3boxesTryon' + Math.random().toString(16).slice(2)
  const filename = 'product.jpg'
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([header, buf, footer])

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const start = Date.now()
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'User-Agent': '3BOXES-TryOn/1.0',
      },
      body,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    if (!res.ok) {
      console.log(`[virtual-tryon] tmpfiles upload HTTP ${res.status} after ${elapsed}s`)
      return null
    }

    const json = (await res.json()) as { status?: string; data?: { url?: string } }
    const viewerUrl = json?.data?.url
    if (!viewerUrl || typeof viewerUrl !== 'string') {
      console.log(`[virtual-tryon] tmpfiles returned no url after ${elapsed}s: ${JSON.stringify(json).substring(0, 200)}`)
      return null
    }

    // Convert viewer URL → direct download URL
    //   https://tmpfiles.org/abc123/file.jpg  →  https://tmpfiles.org/dl/abc123/file.jpg
    const directUrl = viewerUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    console.log(`[virtual-tryon] tmpfiles uploaded in ${elapsed}s → ${directUrl}`)
    return directUrl
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    console.log(`[virtual-tryon] tmpfiles upload failed: ${isTimeout ? 'timeout' : (err as Error).message}`)
    return null
  }
}

// ── Pollinations.ai ────────────────────────────────────────────────

interface PollinationsSize { width: number; height: number }

function parseImageSize(size: ImageSize): PollinationsSize {
  const [w, h] = size.split('x').map(Number)
  return { width: w, height: h }
}

/**
 * Build the prompt for Pollinations image-to-image.
 *
 * KEY: when we have a reference product image, the prompt must describe the
 * PERSON and PLACEMENT but must NOT over-specify product colors/patterns —
 * the reference image drives those. We explicitly tell the model to match
 * the reference image exactly.
 */
function buildImg2ImgPrompt(config: CategoryPromptConfig, productName: string): string {
  return [
    `Professional virtual try-on photograph of ${config.modelType}`,
    config.placement,
    `. The product is "${productName}" — use the provided reference image to reproduce the EXACT same colors, fabric, pattern, embellishments, design, and silhouette of the product. `,
    `The model is ${config.bodyType.toLowerCase()}. `,
    `The product must look NATURALLY WORN with proper shadows, highlights, folds, fit, and realistic fabric behavior — NOT pasted, floating, or overlaid. `,
    `Studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality. Natural pose and expression. Full image, no cropping, no border.`,
  ].join('')
}

/** Prompt for the text-to-image fallback (no reference image available). */
function buildTextPrompt(config: CategoryPromptConfig, productName: string): string {
  return [
    `Professional virtual try-on photograph of ${config.modelType} ${config.placement}. `,
    `The product is "${productName}" — render the colors, fabric, pattern, and design accurately based on the product name and type. `,
    `${config.bodyType}. `,
    `The product must look NATURALLY WORN with proper shadows, highlights, folds, fit, and realistic fabric behavior. `,
    `Studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality. Full image, no cropping.`,
  ].join('')
}

/**
 * Call Pollinations. If `referenceImageUrl` is provided, use image-to-image
 * conditioning (the AI matches the reference product). Otherwise fall back
 * to plain text-to-image.
 */
async function callPollinations(
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
  referenceImageUrl?: string,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const { width, height } = parseImageSize(size)
  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 1_000_000)
  // flux model gives the best photorealistic results; nologo removes branding
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`
  if (referenceImageUrl) {
    url += `&image=${encodeURIComponent(referenceImageUrl)}`
  }

  const mode = referenceImageUrl ? 'img2img' : 'text'
  console.log(`[virtual-tryon] Pollinations ${mode}: ${width}x${height} (timeout ${timeoutMs}ms)`)
  console.log(`[virtual-tryon] Prompt: ${prompt.substring(0, 180)}...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/jpeg, image/png, image/webp, */*',
        'User-Agent': '3BOXES-VirtualTryOn/1.0',
      },
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown')
      return { success: false, error: `Pollinations HTTP ${res.status} after ${elapsed}s: ${body.substring(0, 150)}` }
    }

    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) {
      const body = await res.text().catch(() => 'unknown')
      return { success: false, error: `Pollinations non-image "${ct}" after ${elapsed}s: ${body.substring(0, 150)}` }
    }

    const buf = Buffer.from(await res.arrayBuffer())
    // Tiny images (<3KB) are almost always error placeholders from Pollinations
    if (buf.length < 3000) {
      return { success: false, error: `Pollinations returned tiny image (${buf.length} bytes) — likely an error` }
    }

    let mime = 'image/jpeg'
    if (ct.includes('image/png')) mime = 'image/png'
    else if (ct.includes('image/webp')) mime = 'image/webp'
    else {
      const hex = buf.subarray(0, 4).toString('hex')
      if (hex === '89504e47') mime = 'image/png'
      else if (hex.startsWith('ffd8ff')) mime = 'image/jpeg'
      else if (hex.startsWith('52494646')) mime = 'image/webp'
    }

    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
    console.log(`[virtual-tryon] ✅ Pollinations ${mode} succeeded in ${elapsed}s (${(buf.length / 1024).toFixed(1)}KB, ${mime})`)
    return { success: true, imageUrl: dataUrl }
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `Pollinations timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `Pollinations fetch error: ${(err as Error).message.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

// ── Z.AI Image Edit (OPTIONAL enhancement for face preservation) ───

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
  return `VIRTUAL TRY-ON: Show this EXACT person ${config.placement}. The product is "${productName}". Keep the person's EXACT face, skin tone, and body proportions. The product must look NATURALLY WORN on the person — NOT pasted, floating, or overlaid. Proper shadows, highlights, folds, and fit where the product meets the body. ${config.bodyType}. Photorealistic, studio-quality lighting, 8K detail.`
}

async function zaiImageEdit(
  config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string },
  params: { prompt: string; image: string; size: ImageSize },
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const url = `${config.baseUrl}/images/generations/edit`
  const headers = buildZAIHeaders(config)
  const rawBase64 = stripDataUrl(params.image)

  console.log(`[virtual-tryon] ZAI Image Edit: POST ${url.substring(0, 60)}... (timeout ${timeoutMs}ms)`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: params.prompt, image: rawBase64, size: params.size }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown')
      return { success: false, error: `ZAI API ${res.status} after ${elapsed}s: ${body.substring(0, 150)}` }
    }

    const result = await res.json() as { data?: Array<{ base64?: string; url?: string }> }
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
      try {
        const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(10_000) })
        if (imgRes.ok) {
          const b = Buffer.from(await imgRes.arrayBuffer())
          return { success: true, imageUrl: `data:image/png;base64,${b.toString('base64')}` }
        }
      } catch {}
      return { success: true, imageUrl: item.url }
    }
    return { success: false, error: `ZAI returned unrecognized format after ${elapsed}s` }
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout
      ? `ZAI edit timed out after ${(timeoutMs / 1000).toFixed(0)}s`
      : `ZAI edit fetch error: ${(err as Error).message.substring(0, 200)}`
    console.log(`[virtual-tryon] ${msg}`)
    return { success: false, error: msg }
  }
}

// ── Space Status Helpers (kept for backwards compat with API routes) ──

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000

export async function preWarmSpace(): Promise<boolean> {
  return true // Pollinations + tmpfiles are always ready
}

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean }> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return { awake: spaceAwakeCache.awake }
  }
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

  console.log(`[virtual-tryon] v17 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasProductImage=${!!input.productImageBase64}, ZAI=${isZAIConfigured()}`)

  // ── STRATEGY 1: Z.AI Image Edit (OPTIONAL — face preservation) ──
  // Only attempt if ZAI is configured AND we have a valid selfie.
  // On Vercel requires ZAI_BASE_URL + ZAI_API_KEY env vars.
  if (isZAIConfigured() && zaiConfig && input.selfieData?.startsWith('data:image/') && Date.now() < totalDeadline - 25_000) {
    strategiesAttempted.push('zai-selfie-edit')
    console.log('[virtual-tryon] Strategy 1: Z.AI Selfie Edit (face preservation)')
    const prompt = buildSelfieEditPrompt(config, input.productName)
    const remaining = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
    const result = await zaiImageEdit(zaiConfig, { prompt, image: input.selfieData, size: config.size }, remaining)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ ZAI Selfie Edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return { success: true, imageUrl: result.imageUrl, strategy: 'zai-selfie-edit', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
    }
    strategyErrors['zai-selfie-edit'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] ZAI Selfie Edit failed: ${result.error?.substring(0, 120)}`)
  }

  // ── STRATEGY 2: Pollinations IMAGE-TO-IMAGE (PRIMARY — matches product) ──
  // This is the v17 fix: upload the REAL product photo to tmpfiles.org, then
  // ask Pollinations to condition the generation on it. The result will
  // actually MATCH the product's colors, patterns, and design.
  if (input.productImageBase64?.startsWith('data:image/') && Date.now() < totalDeadline - 15_000) {
    strategiesAttempted.push('pollinations-img2img')
    console.log('[virtual-tryon] Strategy 2: Pollinations img2img (product-matching)')

    // Step A: compress the product image
    let productBuf: Buffer | null = null
    try {
      productBuf = await compressProductImage(input.productImageBase64)
      console.log(`[virtual-tryon] Compressed product image → ${productBuf.length} bytes`)
    } catch (err) {
      strategyErrors['pollinations-img2img'] = `compress failed: ${(err as Error).message}`
      console.log(`[virtual-tryon] Product image compress failed: ${(err as Error).message}`)
    }

    // Step B: upload to tmpfiles.org for a public URL
    let referenceUrl: string | null = null
    if (productBuf) {
      const uploadTimeout = Math.min(UPLOAD_TIMEOUT_MS, totalDeadline - Date.now() - 10_000)
      if (uploadTimeout > 3000) {
        referenceUrl = await uploadToTmpfiles(productBuf, uploadTimeout)
      }
    }

    // Step C: call Pollinations with the reference image
    if (referenceUrl) {
      const prompt = buildImg2ImgPrompt(config, input.productName)
      const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
      const result = await callPollinations(prompt, config.size, remaining, referenceUrl)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ Pollinations img2img succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-img2img', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['pollinations-img2img'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] Pollinations img2img failed: ${result.error?.substring(0, 120)}`)
    } else if (!strategyErrors['pollinations-img2img']) {
      strategyErrors['pollinations-img2img'] = 'tmpfiles upload failed — no reference URL'
      console.log('[virtual-tryon] No reference URL available, skipping img2img')
    }
  }

  // ── STRATEGY 3: Pollinations TEXT-TO-IMAGE (fallback) ──
  // Used when there's no product image OR img2img failed. Uses the product
  // name + category to build the best possible text prompt.
  if (Date.now() < totalDeadline - 10_000) {
    strategiesAttempted.push('pollinations-text')
    console.log('[virtual-tryon] Strategy 3: Pollinations text-to-image (fallback)')
    const prompt = buildTextPrompt(config, input.productName)
    const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
    const result = await callPollinations(prompt, config.size, remaining)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations text succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-text', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
    }
    strategyErrors['pollinations-text'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Pollinations text failed: ${result.error?.substring(0, 120)}`)
  }

  // ── All strategies failed ───────────────────────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] ❌ All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`[virtual-tryon] Strategies: ${strategiesAttempted.join(', ')}`)
  console.log(`[virtual-tryon] Errors: ${JSON.stringify(strategyErrors)}`)

  // Final retry: text-to-image with a fresh seed
  if (elapsed < totalDeadline - 15_000) {
    console.log('[virtual-tryon] Final retry: text-to-image with fresh seed')
    strategiesAttempted.push('pollinations-text-retry')
    const prompt = buildTextPrompt(config, input.productName)
    const retryTime = Math.min(30_000, totalDeadline - Date.now() - 3_000)
    const retryResult = await callPollinations(prompt, config.size, retryTime)
    if (retryResult.success && retryResult.imageUrl) {
      const elapsedRetry = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations text retry succeeded in ${(elapsedRetry / 1000).toFixed(1)}s`)
      return { success: true, imageUrl: retryResult.imageUrl, strategy: 'pollinations-text-retry', elapsedMs: elapsedRetry, debugInfo: { strategiesAttempted, strategyErrors } }
    }
    strategyErrors['pollinations-text-retry'] = retryResult.error || 'Retry failed'
  }

  return {
    success: false,
    error: 'We could not generate your style preview right now. Please check your internet connection and try again in a moment.',
    errorCode: 'ALL_STRATEGIES_FAILED',
    elapsedMs: elapsed,
    debugInfo: { strategiesAttempted, strategyErrors },
  }
}
