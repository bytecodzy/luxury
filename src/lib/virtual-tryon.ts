/**
 * Virtual Try-On Engine v18 — SELFIE-PRESERVING Pipeline
 *
 * ROOT CAUSE OF PREVIOUS MISMATCH (diagnosed in v18):
 *   v17 passed the PRODUCT image as the Pollinations `?image=` reference and
 *   hardcoded gender in the prompt (e.g. "a graceful Indian woman"). This
 *   caused TWO critical problems:
 *     1. GENDER MISMATCH — the AI generated a person of the prompt's hardcoded
 *        gender, NOT the user's actual gender from their selfie.
 *     2. NOT THE USER — the user's selfie was never used as a reference, so
 *        the generated person looked nothing like the user.
 *
 * v18 SOLUTION — selfie-preserving image-to-image:
 *   1. Upload the user's SELFIE to tmpfiles.org (free, anonymous, no auth).
 *   2. Pass the selfie URL as the Pollinations `?image=` reference.
 *   3. The AI now PRESERVES the user's face, gender, skin tone, body type,
 *      and hair — because it's conditioning on their actual selfie.
 *   4. The text prompt describes the PRODUCT in rich detail (extracted from
 *      the product name, description, tags, and category) and instructs the
 *      AI to add/wear the product on the person in the reference image.
 *   5. The prompt is GENDER-NEUTRAL — it never hardcodes a gender. It says
 *      "the person in the reference image" so the AI uses whatever gender
 *      the user actually is.
 *
 * RELIABILITY:
 *   - tmpfiles.org + Pollinations are both 100% free, no auth, no rate limits.
 *   - Works IDENTICALLY on preview, sandbox, and Vercel (no env vars needed).
 *   - Hard fallbacks: if selfie upload fails → text-to-image with detailed
 *     person+product prompt; if img2img fails → retry with fresh seed.
 *
 * NO ZAI DEPENDENCY:
 *   The Z.AI SDK requires internal-api.z.ai which is unreachable from the
 *   sandbox (private IPs, timeout) and requires env vars on Vercel. v18
 *   removes the ZAI edit strategy entirely — Pollinations is the only engine,
 *   which works everywhere for free.
 */

import sharp from 'sharp'

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string          // base64 data URL of the person's selfie — USED as img2img reference
  productImageBase64: string  // base64 data URL of the product image (used for color extraction, optional)
  productName: string
  categorySlug: string
  productDescription?: string
  productTags?: string[]
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string
  strategy?: string           // 'pollinations-selfie-img2img' | 'pollinations-text'
  error?: string
  errorCode?: 'NO_SELFIE' | 'TIMEOUT' | 'ALL_STRATEGIES_FAILED' | 'NETWORK_ERROR'
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

// ── Category Configuration ─────────────────────────────────────────

interface CategoryTryOnConfig {
  /** How the product is worn / placed on the person's body */
  placement: string
  /** Output image dimensions (portrait for full-body, square for accessories) */
  size: ImageSize
  /** Short label for the product category */
  garmentType: string
  /** Default body framing for the photo */
  framing: string
  /** Rich material/fabric description for this category */
  materialHint: string
}

const CATEGORY_CONFIG: Record<string, CategoryTryOnConfig> = {
  jewelry: {
    placement: 'wearing the jewelry piece naturally on the correct body part (necklace around the neck, earrings on both earlobes, bracelet on the wrist, ring on the finger — choose based on the product type)',
    size: '864x1152',
    garmentType: 'jewelry piece',
    framing: 'upper-body to head-and-shoulders beauty photograph',
    materialHint: 'polished metal with gemstones, intricate craftsmanship, sparkling highlights',
  },
  sarees: {
    placement: 'draped in the saree in traditional Indian style — pallu elegantly flowing over the left shoulder, matching blouse, neatly pleated at the waist, fabric flowing to the ankles with realistic folds',
    size: '768x1344',
    garmentType: 'traditional Indian saree',
    framing: 'full-body fashion photograph from head to toe',
    materialHint: 'flowing fabric with rich drape, intricate borders, traditional Indian textile work',
  },
  watches: {
    placement: 'wearing the watch on the left wrist, the watch face clearly visible and properly sized, natural wrist pose',
    size: '864x1152',
    garmentType: 'wristwatch',
    framing: 'waist-up photograph with the wrist visible',
    materialHint: 'precision timepiece with metal/leather strap, detailed dial, polished case',
  },
  fashion: {
    placement: 'wearing the outfit with proper fit, natural fabric drape, and realistic folds where the fabric meets the body',
    size: '768x1344',
    garmentType: 'fashion outfit',
    framing: 'full-body fashion photograph from head to toe',
    materialHint: 'quality fabric with natural drape and texture',
  },
  'mens-shirts': {
    placement: 'wearing the shirt buttoned properly with a natural fit, the collar sitting neatly, sleeves at the correct length, fabric draping naturally on the torso',
    size: '768x1344',
    garmentType: 'shirt',
    framing: 'full-body fashion photograph from head to toe',
    materialHint: 'cotton or blended fabric with a crisp finish, natural folds',
  },
  'mens-shirts-t-shirts': {
    placement: 'wearing the shirt with a natural fit, fabric draping naturally on the torso',
    size: '768x1344',
    garmentType: 'shirt',
    framing: 'full-body fashion photograph',
    materialHint: 'quality fabric with natural drape',
  },
  'leather-goods': {
    placement: 'holding or wearing the leather product naturally — a bag on the shoulder or in the hand, a wallet held elegantly',
    size: '864x1152',
    garmentType: 'leather product',
    framing: 'upper-body to three-quarter photograph',
    materialHint: 'genuine leather with rich grain, polished hardware, fine stitching',
  },
  fragrances: {
    placement: 'holding the fragrance bottle elegantly in one hand, the bottle clearly visible with its label and design',
    size: '864x1152',
    garmentType: 'fragrance bottle',
    framing: 'upper-body photograph',
    materialHint: 'glass bottle with refined design, liquid visible through the glass',
  },
  'home-living': {
    placement: 'with the home decor product naturally placed in the scene beside the person',
    size: '1344x768',
    garmentType: 'home decor product',
    framing: 'lifestyle photograph in a beautifully decorated interior',
    materialHint: 'premium home decor with refined finish',
  },
  'corporate-gifts': {
    placement: 'holding the gift product elegantly',
    size: '864x1152',
    garmentType: 'gift product',
    framing: 'upper-body photograph',
    materialHint: 'premium gift product with elegant packaging',
  },
  'women-sarees': {
    placement: 'draped in the saree in traditional Indian style — pallu elegantly flowing over the left shoulder, matching blouse, neatly pleated at the waist, fabric flowing to the ankles with realistic folds',
    size: '768x1344',
    garmentType: 'traditional Indian saree',
    framing: 'full-body fashion photograph from head to toe',
    materialHint: 'flowing fabric with rich drape, intricate borders, traditional Indian textile work',
  },
  'women-jewelry': {
    placement: 'wearing the jewelry piece naturally on the correct body part (necklace around the neck, earrings on both earlobes, bracelet on the wrist, ring on the finger — choose based on the product type)',
    size: '864x1152',
    garmentType: 'jewelry piece',
    framing: 'upper-body to head-and-shoulders beauty photograph',
    materialHint: 'polished metal with gemstones, intricate craftsmanship, sparkling highlights',
  },
  'women-fashion': {
    placement: 'wearing the outfit elegantly with proper fit, natural fabric drape, and realistic folds',
    size: '768x1344',
    garmentType: 'fashion outfit',
    framing: 'full-body fashion photograph from head to toe',
    materialHint: 'quality fabric with natural drape and texture',
  },
  'women-fragrances': {
    placement: 'holding the fragrance bottle elegantly in one hand, the bottle clearly visible',
    size: '864x1152',
    garmentType: 'fragrance bottle',
    framing: 'upper-body photograph',
    materialHint: 'glass bottle with refined design',
  },
  'women-accessories': {
    placement: 'wearing or holding the accessory naturally',
    size: '864x1152',
    garmentType: 'fashion accessory',
    framing: 'upper-body to three-quarter photograph',
    materialHint: 'quality material with refined finish',
  },
  'kids-fashion': {
    placement: 'wearing the outfit with proper fit and natural fabric drape',
    size: '768x1344',
    garmentType: 'kids fashion outfit',
    framing: 'full-body photograph of a child/teenager',
    materialHint: 'comfortable fabric with natural drape',
  },
  'men-accessories': {
    placement: 'wearing or holding the accessory naturally',
    size: '864x1152',
    garmentType: 'fashion accessory',
    framing: 'upper-body to three-quarter photograph',
    materialHint: 'quality material with refined finish',
  },
  'men-watches': {
    placement: 'wearing the watch on the left wrist, the watch face clearly visible',
    size: '864x1152',
    garmentType: 'wristwatch',
    framing: 'waist-up photograph with the wrist visible',
    materialHint: 'precision timepiece with metal/leather strap, detailed dial',
  },
  'men-tshirts': {
    placement: 'wearing the t-shirt with a natural fit, fabric draping naturally on the torso',
    size: '768x1344',
    garmentType: 't-shirt',
    framing: 'full-body fashion photograph',
    materialHint: 'soft cotton fabric with natural drape',
  },
  'men-fragrances': {
    placement: 'holding the fragrance bottle elegantly',
    size: '864x1152',
    garmentType: 'fragrance bottle',
    framing: 'upper-body photograph',
    materialHint: 'glass bottle with refined design',
  },
  'new-arrivals': {
    placement: 'holding or wearing the product naturally and elegantly',
    size: '864x1152',
    garmentType: 'premium product',
    framing: 'upper-body to three-quarter photograph',
    materialHint: 'premium material with refined finish',
  },
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryTryOnConfig {
  if (CATEGORY_CONFIG[categorySlug]) {
    const config = { ...CATEGORY_CONFIG[categorySlug] }
    // Refine jewelry placement based on product name
    if (categorySlug.includes('jewel')) {
      const n = productName.toLowerCase()
      if (n.includes('earring') || n.includes('jhumka') || n.includes('stud'))
        config.placement = 'wearing the earrings on both earlobes, the earrings clearly visible and properly positioned'
      else if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar') || n.includes('mala'))
        config.placement = 'wearing the necklace around the neck, the chain sitting naturally at the collarbone'
      else if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle') || n.includes('kada'))
        config.placement = 'wearing the bracelet on the wrist, properly fitted'
      else if (n.includes('ring'))
        config.placement = 'wearing the ring on the finger, the ring clearly visible'
      else if (n.includes('set') || n.includes('bridal'))
        config.placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
    }
    return config
  }

  // Fuzzy match
  const knownSlugs = Object.keys(CATEGORY_CONFIG)
  const matched = knownSlugs.find(s => categorySlug.includes(s) || s.includes(categorySlug))
  if (matched) return { ...CATEGORY_CONFIG[matched] }

  return {
    placement: 'wearing or holding the product naturally and elegantly',
    size: '864x1152',
    garmentType: 'product',
    framing: 'upper-body to three-quarter photograph',
    materialHint: 'premium material with refined finish',
  }
}

// ── Product Description Extractor ──────────────────────────────────

/**
 * Extract color words from a product name + description + tags.
 * Returns a deduplicated comma-separated string of colors, or empty string.
 */
const COLOR_WORDS = [
  'red', 'crimson', 'maroon', 'burgundy', 'wine',
  'blue', 'navy', 'royal blue', 'teal', 'turquoise', 'sky blue', 'cobalt',
  'green', 'emerald', 'olive', 'mint', 'sage', 'forest green',
  'yellow', 'mustard', 'golden', 'gold', 'amber',
  'orange', 'coral', 'peach', 'rust',
  'pink', 'rose', 'magenta', 'fuchsia', 'blush',
  'purple', 'violet', 'lavender', 'plum', 'mauve',
  'brown', 'tan', 'beige', 'camel', 'chocolate', 'coffee',
  'black', 'white', 'ivory', 'cream', 'off-white', 'pearl',
  'grey', 'gray', 'silver', 'charcoal',
  'multi', 'multicolor', 'printed', 'floral',
]

function extractColors(name: string, description?: string, tags?: string[]): string {
  const text = `${name} ${description || ''} ${(tags || []).join(' ')}`.toLowerCase()
  const found = new Set<string>()
  for (const color of COLOR_WORDS) {
    if (text.includes(color)) found.add(color)
  }
  return Array.from(found).slice(0, 3).join(', ')
}

/**
 * Build a rich, detailed description of the PRODUCT for the prompt.
 * This is what tells the AI WHAT to drape on the person.
 */
function buildProductDescription(
  config: CategoryTryOnConfig,
  input: TryOnInput,
): string {
  const colors = extractColors(input.productName, input.productDescription, input.productTags)
  const parts: string[] = []

  parts.push(`a ${config.garmentType}`)

  if (colors) {
    parts.push(`in ${colors}`)
  }

  // Add the product name for specificity
  parts.push(`specifically "${input.productName}"`)

  // Add material hint
  if (config.materialHint) {
    parts.push(`made of ${config.materialHint}`)
  }

  // Add description keywords if available (first 120 chars)
  if (input.productDescription) {
    const desc = input.productDescription.substring(0, 160).replace(/\s+/g, ' ').trim()
    if (desc) {
      parts.push(`(product details: ${desc})`)
    }
  }

  // Add tags if available
  if (input.productTags && input.productTags.length > 0) {
    const relevantTags = input.productTags
      .filter(t => !['new-arrival', 'featured', 'bestseller'].includes(t))
      .slice(0, 5)
    if (relevantTags.length > 0) {
      parts.push(`with ${relevantTags.join(', ')} characteristics`)
    }
  }

  return parts.join(' ')
}

// ── Image helpers ──────────────────────────────────────────────────

function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

/**
 * Compress a selfie data URL into a thumbnail suitable for uploading to a
 * free image host. Keeps the longest edge at 768px (enough for the AI to
 * preserve face/body, small enough for fast upload + fetch).
 */
async function compressSelfie(selfieDataUrl: string): Promise<Buffer> {
  const raw = stripDataUrl(selfieDataUrl)
  const inputBuf = Buffer.from(raw, 'base64')
  return sharp(inputBuf)
    .resize(768, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
}

/**
 * Upload a compressed selfie buffer to tmpfiles.org (free, anonymous, no auth).
 * Returns a DIRECT download URL that Pollinations can fetch.
 *
 * Falls back to null if the upload fails — the caller will then use
 * text-to-image instead of img2img.
 */
async function uploadToTmpfiles(buf: Buffer, timeoutMs: number): Promise<string | null> {
  const boundary = '----3boxesTryon' + Math.random().toString(16).slice(2)
  const filename = 'selfie.jpg'
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
      console.log(`[virtual-tryon] tmpfiles returned no url after ${elapsed}s`)
      return null
    }

    // Convert viewer URL → direct download URL
    const directUrl = viewerUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
    console.log(`[virtual-tryon] tmpfiles uploaded in ${elapsed}s → ${directUrl.substring(0, 60)}...`)
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
 * Build the prompt for Pollinations img2img with the SELFIE as reference.
 *
 * KEY DESIGN PRINCIPLES:
 * 1. GENDER-NEUTRAL — never hardcode a gender. Always say "the person in the
 *    reference image" so the AI uses the user's actual gender.
 * 2. PRESERVE THE PERSON — explicitly instruct the AI to keep the EXACT same
 *    face, skin tone, body type, hair, and gender as the reference selfie.
 * 3. DESCRIBE THE PRODUCT — rich detail about what to wear/hold, extracted
 *    from the product name, description, tags, and category.
 * 4. NATURAL PLACEMENT — the product must look naturally worn, not pasted.
 */
function buildSelfieImg2ImgPrompt(config: CategoryTryOnConfig, productDesc: string): string {
  return [
    `Virtual try-on photograph. The person in the reference image is now ${config.placement}.`,
    `The product being worn is ${productDesc}.`,
    `CRITICAL: Keep the EXACT same face, gender, skin tone, body type, body proportions, hair, and age as the person in the reference image. Do NOT change the person's identity or gender.`,
    `The product must look NATURALLY WORN with realistic shadows, highlights, fabric folds, and fit where it meets the body — NOT pasted, floating, or overlaid.`,
    `${config.framing}, studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality.`,
    `Natural pose and expression. Full image, no cropping, no border, no text.`,
  ].join(' ')
}

/** Prompt for the text-to-image fallback (no selfie reference available). */
function buildTextPrompt(config: CategoryTryOnConfig, productDesc: string): string {
  return [
    `Virtual try-on photograph of a person ${config.placement}.`,
    `The product being worn is ${productDesc}.`,
    `${config.framing}, studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality.`,
    `The product must look NATURALLY WORN with realistic shadows, highlights, fabric folds, and fit.`,
    `Natural pose and expression. Full image, no cropping, no border, no text.`,
  ].join(' ')
}

/**
 * Call Pollinations. If `referenceImageUrl` is provided (the selfie URL),
 * use image-to-image so the AI preserves the person's appearance.
 * Otherwise fall back to plain text-to-image.
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

  const mode = referenceImageUrl ? 'selfie-img2img' : 'text'
  console.log(`[virtual-tryon] Pollinations ${mode}: ${width}x${height} (timeout ${timeoutMs}ms)`)
  console.log(`[virtual-tryon] Prompt (first 220): ${prompt.substring(0, 220)}...`)

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

  console.log(`[virtual-tryon] v18 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasSelfie=${!!input.selfieData}`)

  // Validate selfie
  if (!input.selfieData?.startsWith('data:image/')) {
    return {
      success: false,
      error: 'A valid selfie image is required.',
      errorCode: 'NO_SELFIE',
      elapsedMs: Date.now() - totalStart,
      debugInfo: { strategiesAttempted, strategyErrors },
    }
  }

  // Build the rich product description ONCE — used by all strategies
  const productDesc = buildProductDescription(config, input)
  console.log(`[virtual-tryon] Product description: ${productDesc.substring(0, 200)}...`)

  // ── STRATEGY 1: Pollinations SELFIE img2img (PRIMARY) ────────────
  // Upload the user's selfie to tmpfiles.org, then use it as the `?image=`
  // reference for Pollinations. The AI will PRESERVE the user's face,
  // gender, skin tone, and body type from the selfie, and ADD the product
  // described in the text prompt.
  if (Date.now() < totalDeadline - 20_000) {
    strategiesAttempted.push('pollinations-selfie-img2img')
    console.log('[virtual-tryon] Strategy 1: Pollinations selfie img2img (person-preserving)')

    // Step A: compress the selfie
    let selfieBuf: Buffer | null = null
    try {
      selfieBuf = await compressSelfie(input.selfieData)
      console.log(`[virtual-tryon] Compressed selfie → ${selfieBuf.length} bytes`)
    } catch (err) {
      strategyErrors['pollinations-selfie-img2img'] = `compress failed: ${(err as Error).message}`
      console.log(`[virtual-tryon] Selfie compress failed: ${(err as Error).message}`)
    }

    // Step B: upload selfie to tmpfiles.org for a public URL
    let selfieUrl: string | null = null
    if (selfieBuf) {
      const uploadTimeout = Math.min(UPLOAD_TIMEOUT_MS, totalDeadline - Date.now() - 15_000)
      if (uploadTimeout > 3000) {
        selfieUrl = await uploadToTmpfiles(selfieBuf, uploadTimeout)
      }
    }

    // Step C: call Pollinations with the selfie as reference
    if (selfieUrl) {
      const prompt = buildSelfieImg2ImgPrompt(config, productDesc)
      const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
      const result = await callPollinations(prompt, config.size, remaining, selfieUrl)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ Selfie img2img succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-selfie-img2img', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['pollinations-selfie-img2img'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] Selfie img2img failed: ${result.error?.substring(0, 120)}`)
    } else if (!strategyErrors['pollinations-selfie-img2img']) {
      strategyErrors['pollinations-selfie-img2img'] = 'tmpfiles selfie upload failed — no reference URL'
      console.log('[virtual-tryon] No selfie URL available, falling back to text-to-image')
    }
  }

  // ── STRATEGY 2: Pollinations TEXT-TO-IMAGE (fallback) ───────────
  // Used when the selfie upload failed. Uses a detailed text prompt that
  // describes both the product AND a generic person. This won't preserve
  // the user's exact appearance, but it will at least show the product.
  if (Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('pollinations-text')
    console.log('[virtual-tryon] Strategy 2: Pollinations text-to-image (fallback)')
    const prompt = buildTextPrompt(config, productDesc)
    const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
    const result = await callPollinations(prompt, config.size, remaining)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Text-to-image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-text', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
    }
    strategyErrors['pollinations-text'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Text-to-image failed: ${result.error?.substring(0, 120)}`)
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
    const prompt = buildTextPrompt(config, productDesc)
    const retryTime = Math.min(30_000, totalDeadline - Date.now() - 3_000)
    const retryResult = await callPollinations(prompt, config.size, retryTime)
    if (retryResult.success && retryResult.imageUrl) {
      const elapsedRetry = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Text retry succeeded in ${(elapsedRetry / 1000).toFixed(1)}s`)
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
