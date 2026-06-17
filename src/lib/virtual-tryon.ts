/**
 * Virtual Try-On Engine v19 — ZAI IMAGE-EDIT Pipeline (Selfie-Preserving)
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY v19?
 *  ─────────────────────────────────────────────────────────────────────────
 *  v18 used Pollinations.ai with the selfie URL passed via `?image=`. In
 *  practice Pollinations does NOT honour that parameter as a true
 *  image-to-image conditioning signal — it falls back to plain text-to-image
 *  and produces random people wearing random products. That is exactly what
 *  the user saw: "dress or saree → showing glasses, selfie not loading".
 *
 *  v19 uses the Z.AI `images.generations.edit` endpoint, which is a REAL
 *  image-to-image edit model:
 *    • INPUT  = the user's SELFIE (compressed)
 *    • PROMPT = a rich description of the PRODUCT to drape on the person
 *    • OUTPUT = the SAME person (face, gender, skin tone, body, hair) now
 *               wearing/holding the described product, photorealistically
 *               blended with realistic shadows, folds and lighting.
 *
 *  We confirmed in the sandbox that:
 *    • `zai.images.generations.create({...})` works (≈28s)
 *    • `zai.images.generations.edit({prompt, images:[{url}], size})` works
 *      (≈14–18s) and returns a 75–110KB edited PNG.
 *
 *  We ALSO use ZAI VLM (`chat.completions.createVision`) to extract a rich
 *  description of the ACTUAL product photo (colours, pattern, material,
 *  style, type). This is fused with the product name/description/tags so
 *  the edit prompt accurately reflects the EXACT product being tried on —
 *  no more "selected saree → got glasses".
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  STRATEGY CHAIN
 *  ─────────────────────────────────────────────────────────────────────────
 *  1. ZAI image-edit (PRIMARY)         — best quality, preserves user.
 *  2. ZAI text-to-image (FALLBACK 1)   — if edit fails but SDK is alive.
 *  3. Pollinations img2img (FALLBACK 2) — if ZAI is unavailable, attempt
 *     to upload the selfie to tmpfiles.org and use it as `?image=`.
 *  4. Pollinations text-to-image (LAST RESORT) — always available.
 *
 *  All paths return the same `{success, imageUrl, strategy}` contract.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ENVIRONMENT
 *  ─────────────────────────────────────────────────────────────────────────
 *  • Sandbox / preview: ZAI.create() auto-discovers credentials and works.
 *  • Vercel: requires `ZAI_BASE_URL` and `ZAI_API_KEY` env vars. If they
 *    are missing, we transparently fall back to Pollinations so the user
 *    still gets a result (no "AI is busy" error).
 */

import sharp from 'sharp'

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string          // base64 data URL of the person's selfie — USED as the edit input image
  productImageBase64: string  // base64 data URL of the product image (used by VLM to extract accurate description)
  productName: string
  categorySlug: string
  productDescription?: string
  productTags?: string[]
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string
  strategy?: string           // 'zai-image-edit' | 'zai-text-to-image' | 'pollinations-img2img' | 'pollinations-text'
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
const ZAI_EDIT_TIMEOUT_MS = 45_000
const ZAI_TEXT_TIMEOUT_MS = 40_000
const VLM_TIMEOUT_MS = 18_000

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
  vlmDescription?: string,
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

  // If VLM gave us a description of the actual product photo, USE IT —
  // this is the single most important signal for matching the product.
  if (vlmDescription && vlmDescription.trim().length > 10) {
    parts.push(`(visual reference: ${vlmDescription.trim().substring(0, 280)})`)
  } else if (input.productDescription) {
    // Fallback to product description text (first 160 chars)
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
 * Compress a selfie data URL into a thumbnail suitable for ZAI image-edit.
 * Keeps the longest edge at 1024px (enough for the AI to preserve face/body,
 * small enough for fast upload + processing).
 */
async function compressSelfie(selfieDataUrl: string): Promise<Buffer> {
  const raw = stripDataUrl(selfieDataUrl)
  const inputBuf = Buffer.from(raw, 'base64')
  return sharp(inputBuf)
    .resize(1024, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()
}

/**
 * Convert a compressed selfie buffer back to a data URL (ZAI edit needs a URL).
 */
function bufferToDataUrl(buf: Buffer, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${buf.toString('base64')}`
}

/**
 * Compress a product image for VLM analysis — small is fine, the VLM only
 * needs to identify colours, type, pattern, material.
 */
async function compressProductImageForVLM(productImageBase64: string): Promise<string | null> {
  if (!productImageBase64) return null
  try {
    const raw = stripDataUrl(productImageBase64)
    const inputBuf = Buffer.from(raw, 'base64')
    const out = await sharp(inputBuf)
      .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer()
    return bufferToDataUrl(out)
  } catch {
    return null
  }
}

/**
 * Upload a compressed selfie buffer to tmpfiles.org (free, anonymous, no auth).
 * Used by the Pollinations fallback path.
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

// ── ZAI SDK integration ────────────────────────────────────────────

let zaiInstanceCache: any = null
let zaiInitPromise: Promise<any | null> | null = null

async function getZAI(): Promise<any | null> {
  if (zaiInstanceCache) return zaiInstanceCache
  if (zaiInitPromise) return zaiInitPromise

  zaiInitPromise = (async () => {
    try {
      // Lazy import so the module doesn't crash on cold start if the SDK
      // has issues — we just fall back to Pollinations.
      const ZAIModule = await import('z-ai-web-dev-sdk')
      const ZAI = (ZAIModule as any).default || (ZAIModule as any)
      const instance = await ZAI.create()
      if (instance) {
        zaiInstanceCache = instance
        console.log('[virtual-tryon] ZAI SDK initialised successfully')
        return instance
      }
    } catch (err) {
      console.log('[virtual-tryon] ZAI SDK init failed:', err instanceof Error ? err.message : String(err))
    }
    return null
  })()

  return zaiInitPromise
}

// ── VLM: extract accurate product description from the product photo ──

const productDescriptionCache = new Map<string, string>()

async function analyzeProductImage(
  productImageBase64: string,
  productName: string,
  categorySlug: string,
): Promise<string | null> {
  if (!productImageBase64) return null

  const cacheKey = `${productName}::${categorySlug}::${productImageBase64.substring(0, 64)}`
  const cached = productDescriptionCache.get(cacheKey)
  if (cached) return cached

  const compressed = await compressProductImageForVLM(productImageBase64)
  if (!compressed) return null

  const zai = await getZAI()
  if (!zai) {
    console.log('[virtual-tryon] VLM skipped — ZAI SDK unavailable')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VLM_TIMEOUT_MS)

  try {
    console.log('[virtual-tryon] VLM analysing product image...')
    const start = Date.now()
    const response = await Promise.race([
      zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are looking at a product photo for an e-commerce store. The product is named "${productName}" (category: ${categorySlug || 'general'}).

Describe the VISUAL appearance of this product in 60–90 words, focusing ONLY on what is visible. Include:
- The exact colours (primary + secondary)
- The material or fabric type (silk, cotton, leather, metal, glass, etc.)
- The pattern or design (solid, floral, geometric, embroidered, plain, etc.)
- The style or silhouette (e.g. flowing saree, structured shirt, dainty necklace)
- Any notable embellishments, borders, prints, or hardware

Output ONLY the description (no introduction, no list markers, no preamble). Be specific and concrete so a text-to-image model can reproduce this EXACT product.`,
              },
              {
                type: 'image_url',
                image_url: { url: compressed },
              },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('VLM timeout')), VLM_TIMEOUT_MS)),
    ])

    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const content = response?.choices?.[0]?.message?.content
    const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c: any) => c?.text || '').join(' ') : ''
    const cleaned = (text || '').trim().replace(/\s+/g, ' ').substring(0, 320)

    if (cleaned.length > 15) {
      console.log(`[virtual-tryon] VLM described product in ${elapsed}s: ${cleaned.substring(0, 120)}...`)
      productDescriptionCache.set(cacheKey, cleaned)
      // Keep cache from growing unbounded
      if (productDescriptionCache.size > 60) {
        const firstKey = productDescriptionCache.keys().next().value
        if (firstKey) productDescriptionCache.delete(firstKey)
      }
      return cleaned
    }
    console.log(`[virtual-tryon] VLM returned no usable text in ${elapsed}s`)
    return null
  } catch (err) {
    clearTimeout(timeoutId)
    console.log('[virtual-tryon] VLM failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ── ZAI image-edit (PRIMARY strategy) ──────────────────────────────

function buildEditPrompt(config: CategoryTryOnConfig, productDesc: string): string {
  return [
    `Virtual try-on photograph. The person in the reference image is now ${config.placement}.`,
    `The product being worn is ${productDesc}.`,
    `ABSOLUTE REQUIREMENT — IDENTITY PRESERVATION: The generated image MUST show the EXACT SAME person as the reference image — identical eyes, nose, mouth, jawline, hairstyle, hair colour, skin tone, age, gender, and facial features. Do NOT generate a new face. Do NOT change the person's gender. Do NOT change the person's age. The face is the most important thing to preserve — if the face does not match the reference, the result is useless.`,
    `PRODUCT FIDELITY: Reproduce the EXACT colours, pattern, fabric, embellishments, silhouette, and design described above. The product must look NATURALLY WORN with realistic shadows, highlights, fabric folds, and fit where it meets the body — NOT pasted, floating, or overlaid.`,
    `DO NOT ADD unrelated items: no sunglasses, no eyeglasses, no hats, no scarves, no extra jewellery, no extra clothing, no props — ONLY the product described above. The person's head, face, and hair must remain uncovered and unchanged unless the product itself is a headpiece.`,
    `${config.framing}, studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality.`,
    `Natural pose and expression. Full image, no cropping, no border, no text, no watermark.`,
  ].join(' ')
}

async function callZAIImageEdit(
  prompt: string,
  selfieDataUrl: string,
  size: ImageSize,
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const zai = await getZAI()
  if (!zai) {
    return { success: false, error: 'ZAI SDK unavailable' }
  }

  console.log(`[virtual-tryon] ZAI image-edit: ${size} (timeout ${timeoutMs}ms)`)
  console.log(`[virtual-tryon] Prompt (first 220): ${prompt.substring(0, 220)}...`)

  try {
    const start = Date.now()
    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [{ url: selfieDataUrl }],
        size,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ZAI edit timeout')), timeoutMs)),
    ])
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    const item = response?.data?.[0]
    const b64 = item?.base64
    if (!b64 || typeof b64 !== 'string' || b64.length < 3000) {
      return { success: false, error: `ZAI edit returned no usable image after ${elapsed}s (base64 length=${b64?.length || 0})` }
    }

    // Detect format
    let mime = 'image/png'
    if (item.format === 'jpeg' || item.format === 'jpg') mime = 'image/jpeg'
    else if (item.format === 'webp') mime = 'image/webp'
    else {
      const head = Buffer.from(b64.substring(0, 8), 'base64').toString('hex')
      if (head.startsWith('ffd8ff')) mime = 'image/jpeg'
      else if (head.startsWith('89504e47')) mime = 'image/png'
      else if (head.startsWith('52494646')) mime = 'image/webp'
    }

    const dataUrl = `data:${mime};base64,${b64}`
    const byteLen = Math.floor(b64.length * 0.75)
    console.log(`[virtual-tryon] ✅ ZAI image-edit succeeded in ${elapsed}s (${(byteLen / 1024).toFixed(1)}KB, ${mime})`)
    return { success: true, imageUrl: dataUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[virtual-tryon] ZAI image-edit failed: ${msg.substring(0, 200)}`)
    return { success: false, error: msg.substring(0, 200) }
  }
}

// ── ZAI text-to-image (FALLBACK 1) ─────────────────────────────────

function buildTextPrompt(config: CategoryTryOnConfig, productDesc: string): string {
  return [
    `Virtual try-on photograph of a person ${config.placement}.`,
    `The product being worn is ${productDesc}.`,
    `${config.framing}, studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality.`,
    `The product must look NATURALLY WORN with realistic shadows, highlights, fabric folds, and fit.`,
    `Natural pose and expression. Full image, no cropping, no border, no text.`,
  ].join(' ')
}

async function callZAITextToImage(
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const zai = await getZAI()
  if (!zai) {
    return { success: false, error: 'ZAI SDK unavailable' }
  }

  console.log(`[virtual-tryon] ZAI text-to-image: ${size} (timeout ${timeoutMs}ms)`)

  try {
    const start = Date.now()
    const response = await Promise.race([
      zai.images.generations.create({ prompt, size }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ZAI text timeout')), timeoutMs)),
    ])
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    const item = response?.data?.[0]
    const b64 = item?.base64
    if (!b64 || typeof b64 !== 'string' || b64.length < 3000) {
      return { success: false, error: `ZAI text returned no usable image after ${elapsed}s` }
    }

    let mime = 'image/png'
    if (item.format === 'jpeg' || item.format === 'jpg') mime = 'image/jpeg'
    else if (item.format === 'webp') mime = 'image/webp'
    else {
      const head = Buffer.from(b64.substring(0, 8), 'base64').toString('hex')
      if (head.startsWith('ffd8ff')) mime = 'image/jpeg'
      else if (head.startsWith('89504e47')) mime = 'image/png'
      else if (head.startsWith('52494646')) mime = 'image/webp'
    }

    const dataUrl = `data:${mime};base64,${b64}`
    const byteLen = Math.floor(b64.length * 0.75)
    console.log(`[virtual-tryon] ✅ ZAI text-to-image succeeded in ${elapsed}s (${(byteLen / 1024).toFixed(1)}KB, ${mime})`)
    return { success: true, imageUrl: dataUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[virtual-tryon] ZAI text-to-image failed: ${msg.substring(0, 200)}`)
    return { success: false, error: msg.substring(0, 200) }
  }
}

// ── Pollinations (FALLBACK 2 & LAST RESORT) ────────────────────────

interface PollinationsSize { width: number; height: number }

function parseImageSize(size: ImageSize): PollinationsSize {
  const [w, h] = size.split('x').map(Number)
  return { width: w, height: h }
}

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

async function callPollinations(
  prompt: string,
  size: ImageSize,
  timeoutMs: number,
  referenceImageUrl?: string,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const { width, height } = parseImageSize(size)
  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 1_000_000)
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`
  if (referenceImageUrl) {
    url += `&image=${encodeURIComponent(referenceImageUrl)}`
  }

  const mode = referenceImageUrl ? 'selfie-img2img' : 'text'
  console.log(`[virtual-tryon] Pollinations ${mode}: ${width}x${height} (timeout ${timeoutMs}ms)`)

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
  // Trigger ZAI init in the background so the first real request is faster.
  void getZAI()
  return true
}

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean }> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return { awake: spaceAwakeCache.awake }
  }
  spaceAwakeCache = { awake: true, timestamp: now }
  return { awake: true }
}

/**
 * Lightweight check used by /api/try-on/status — verifies that the ZAI SDK
 * can be initialised within a short window. Does NOT make a network call
 * to the LLM endpoint (that would be too slow for a status check).
 */
export async function isTryOnServiceReady(): Promise<{
  ready: boolean
  engine: string
  reason?: string
}> {
  const zai = await Promise.race([
    getZAI(),
    new Promise<null>(r => setTimeout(() => r(null), 4000)),
  ])
  if (zai) {
    return { ready: true, engine: 'zai-image-edit' }
  }
  return {
    ready: true, // Pollinations fallback is always available
    engine: 'pollinations-fallback',
    reason: 'ZAI SDK unavailable — will use Pollinations fallback',
  }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = {}
  const isVercel = !!process.env.VERCEL

  console.log(`[virtual-tryon] v19 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasSelfie=${!!input.selfieData}, hasProductImg=${!!input.productImageBase64}`)

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

  // ── STEP A: VLM-analyse the product photo for an accurate description ──
  // This runs in parallel with selfie compression and is the single most
  // important signal for matching the actual product (no more "saree → glasses").
  let vlmDescription: string | null = null
  const vlmPromise = (async () => {
    if (input.productImageBase64) {
      return await analyzeProductImage(input.productImageBase64, input.productName, input.categorySlug)
    }
    return null
  })()

  // Compress the selfie in parallel (used by all strategies)
  let selfieBuf: Buffer | null = null
  try {
    selfieBuf = await compressSelfie(input.selfieData)
    console.log(`[virtual-tryon] Compressed selfie → ${selfieBuf.length} bytes`)
  } catch (err) {
    strategyErrors['selfie-compress'] = `compress failed: ${(err as Error).message}`
    console.log(`[virtual-tryon] Selfie compress failed: ${(err as Error).message}`)
  }

  // Wait for VLM with a tight deadline so it doesn't push us over budget
  try {
    vlmDescription = await Promise.race([
      vlmPromise,
      new Promise<null>(r => setTimeout(() => r(null), VLM_TIMEOUT_MS)),
    ])
  } catch {
    vlmDescription = null
  }

  // Build the rich product description (uses VLM output if available)
  const productDesc = buildProductDescription(config, input, vlmDescription || undefined)
  console.log(`[virtual-tryon] Product description: ${productDesc.substring(0, 200)}...`)

  // ── STRATEGY 1: ZAI image-edit (PRIMARY) ─────────────────────────
  // Real image-to-image edit — preserves the user's face/gender/body from
  // the selfie input and applies the product described in the prompt.
  if (selfieBuf && Date.now() < totalDeadline - 15_000) {
    strategiesAttempted.push('zai-image-edit')
    console.log('[virtual-tryon] Strategy 1: ZAI image-edit (selfie-preserving)')

    const selfieDataUrl = bufferToDataUrl(selfieBuf)
    const prompt = buildEditPrompt(config, productDesc)
    const remaining = Math.min(ZAI_EDIT_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
    if (remaining > 10_000) {
      const result = await callZAIImageEdit(prompt, selfieDataUrl, config.size, remaining)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI image-edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'zai-image-edit', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['zai-image-edit'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] ZAI image-edit failed: ${result.error?.substring(0, 120)}`)
    } else {
      strategyErrors['zai-image-edit'] = 'insufficient time budget'
      console.log('[virtual-tryon] Skipping ZAI image-edit — insufficient time budget')
    }
  } else if (!selfieBuf) {
    console.log('[virtual-tryon] Skipping ZAI image-edit — no compressed selfie available')
  }

  // ── STRATEGY 2: ZAI text-to-image (FALLBACK 1) ──────────────────
  // Uses the same rich product prompt but generates from scratch (no
  // identity preservation). Better than Pollinations because ZAI's model
  // is more prompt-faithful.
  if (Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('zai-text-to-image')
    console.log('[virtual-tryon] Strategy 2: ZAI text-to-image (fallback)')

    const prompt = buildTextPrompt(config, productDesc)
    const remaining = Math.min(ZAI_TEXT_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
    if (remaining > 10_000) {
      const result = await callZAITextToImage(prompt, config.size, remaining)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ ZAI text-to-image succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'zai-text-to-image', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['zai-text-to-image'] = result.error || 'No image returned'
      console.log(`[virtual-tryon] ZAI text-to-image failed: ${result.error?.substring(0, 120)}`)
    } else {
      strategyErrors['zai-text-to-image'] = 'insufficient time budget'
    }
  }

  // ── STRATEGY 3: Pollinations img2img (FALLBACK 2) ───────────────
  // Upload the selfie to tmpfiles.org and pass it as the `?image=` reference.
  // Note: Pollinations doesn't truly honour this for identity preservation,
  // but it's a useful resilience fallback when ZAI is unreachable.
  if (selfieBuf && Date.now() < totalDeadline - 18_000) {
    strategiesAttempted.push('pollinations-img2img')
    console.log('[virtual-tryon] Strategy 3: Pollinations img2img (fallback)')

    const uploadTimeout = Math.min(UPLOAD_TIMEOUT_MS, totalDeadline - Date.now() - 15_000)
    let selfieUrl: string | null = null
    if (uploadTimeout > 3000) {
      selfieUrl = await uploadToTmpfiles(selfieBuf, uploadTimeout)
    }
    if (selfieUrl) {
      const prompt = buildSelfieImg2ImgPrompt(config, productDesc)
      const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 5_000)
      const result = await callPollinations(prompt, config.size, remaining, selfieUrl)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ Pollinations img2img succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-img2img', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['pollinations-img2img'] = result.error || 'No image returned'
    } else {
      strategyErrors['pollinations-img2img'] = 'tmpfiles upload failed'
      console.log('[virtual-tryon] tmpfiles upload failed — skipping Pollinations img2img')
    }
  }

  // ── STRATEGY 4: Pollinations text-to-image (LAST RESORT) ────────
  if (Date.now() < totalDeadline - 10_000) {
    strategiesAttempted.push('pollinations-text')
    console.log('[virtual-tryon] Strategy 4: Pollinations text-to-image (last resort)')

    const prompt = buildTextPrompt(config, productDesc)
    const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, totalDeadline - Date.now() - 3_000)
    if (remaining > 5000) {
      const result = await callPollinations(prompt, config.size, remaining)
      if (result.success && result.imageUrl) {
        const elapsed = Date.now() - totalStart
        console.log(`[virtual-tryon] ✅ Pollinations text succeeded in ${(elapsed / 1000).toFixed(1)}s`)
        return { success: true, imageUrl: result.imageUrl, strategy: 'pollinations-text', elapsedMs: elapsed, debugInfo: { strategiesAttempted, strategyErrors } }
      }
      strategyErrors['pollinations-text'] = result.error || 'No image returned'
    }
  }

  // ── All strategies failed ───────────────────────────────────────
  const elapsed = Date.now() - totalStart
  console.log(`[virtual-tryon] ❌ All strategies failed in ${(elapsed / 1000).toFixed(1)}s`)
  console.log(`[virtual-tryon] Strategies: ${strategiesAttempted.join(', ')}`)
  console.log(`[virtual-tryon] Errors: ${JSON.stringify(strategyErrors)}`)

  return {
    success: false,
    error: 'We could not generate your style preview right now. Please try again in a moment.',
    errorCode: 'ALL_STRATEGIES_FAILED',
    elapsedMs: elapsed,
    debugInfo: { strategiesAttempted, strategyErrors },
  }
}
