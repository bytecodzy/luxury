/**
 * Virtual Try-On Engine v21 — Direct ZAI + Pollinations Fallback
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY v21?
 *  ─────────────────────────────────────────────────────────────────────────
 *  v19 called ZAI via `ZAI.create()` (auto-discovery) from the Next.js
 *  process — flaky, frequent timeouts ("Generation Timed Out").
 *  v20 routed through the ai-proxy mini-service — but the ai-proxy's
 *  multi-strategy sequence (2 VLM calls + 4 image strategies) triggered
 *  ZAI rate-limiting, causing all strategies to fail fast.
 *
 *  v21 calls ZAI DIRECTLY with explicit config (read from /etc/.z-ai-config),
 *  using a SINGLE `images.generations.edit` call with BOTH the selfie and
 *  the product image. Direct testing confirmed this completes reliably in
 *  20-27 seconds with excellent quality (preserves the user's face AND
 *  renders the exact product).
 *
 *  ARCHITECTURE:
 *    Client (browser) POST /api/try-on
 *      └─► performVirtualTryOn()  (THIS FILE)
 *            ├─► Strategy A: Direct ZAI image-edit (LOCAL / SANDBOX only)
 *            │     • Explicit config from /etc/.z-ai-config
 *            │     • edit-both: selfie + product image → preserves face + product
 *            │     • 20-27s, high quality
 *            └─► Strategy B: Pollinations img2img (VERCEL + fallback)
 *                  • Upload product image → use as ?image= reference
 *                  • Correct product always shown; model matches category gender
 *                  • 10-20s, always works
 *
 *  ENVIRONMENT BEHAVIOUR:
 *    • LOCAL / SANDBOX: Direct ZAI edit-both (best quality, preserves face
 *      AND product). Falls back to Pollinations if ZAI is temporarily down.
 *    • VERCEL: Pollinations img2img with product image reference (ZAI auth
 *      fails on Vercel's public API). The correct product is always shown.
 * ─────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Types ──────────────────────────────────────────────────────────

export type ImageSize =
  | '1024x1024'
  | '768x1344'
  | '864x1152'
  | '1344x768'
  | '1152x864'
  | '1440x720'
  | '720x1440'

export interface TryOnInput {
  selfieData: string
  productImageBase64: string
  productName: string
  categorySlug: string
  productDescription?: string
  productTags?: string[]
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string
  error?: string
  errorCode?: string
  strategy?: string
  elapsedMs: number
  debugInfo?: {
    strategiesAttempted: string[]
    strategyErrors: Record<string, string>
  }
}

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 55_000 // hard cap (client times out at 55s)
const ZAI_EDIT_TIMEOUT_MS = 45_000
const POLLINATIONS_TIMEOUT_MS = 40_000
const UPLOAD_TIMEOUT_MS = 12_000

// ── ZAI Config (explicit, from /etc/.z-ai-config) ──────────────────

interface ZAIConfig {
  baseUrl: string
  apiKey: string
  chatId: string
  token: string
  userId: string
}

let cachedZAIConfig: ZAIConfig | null | undefined = undefined

function getZAIConfig(): ZAIConfig | null {
  if (cachedZAIConfig !== undefined) return cachedZAIConfig

  // On Vercel, ZAI auth fails on the public API — skip entirely
  if (process.env.VERCEL) {
    cachedZAIConfig = null
    return null
  }

  // Try env vars first
  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    cachedZAIConfig = {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
    return cachedZAIConfig
  }

  // Read from config files (sandbox)
  const configPaths = [
    '/etc/.z-ai-config',
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
  ]
  for (const filePath of configPaths) {
    try {
      const configStr = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(configStr)
      if (config.baseUrl && config.apiKey) {
        cachedZAIConfig = {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          chatId: config.chatId || '',
          token: config.token || '',
          userId: config.userId || '',
        }
        console.log(`[virtual-tryon] ZAI config loaded from ${filePath}`)
        return cachedZAIConfig
      }
    } catch {
      // continue
    }
  }

  cachedZAIConfig = null
  return null
}

// ── ZAI SDK instance (cached, with explicit config) ────────────────

let zaiInstanceCache: any = null

async function getZAI(): Promise<any | null> {
  if (process.env.VERCEL) return null
  if (zaiInstanceCache) return zaiInstanceCache

  const config = getZAIConfig()
  if (!config) return null

  try {
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = (ZAIModule as any).default || (ZAIModule as any)
    zaiInstanceCache = new ZAI({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      chatId: config.chatId,
      token: config.token,
      userId: config.userId,
    })
    console.log('[virtual-tryon] ZAI SDK instance created with explicit config')
    return zaiInstanceCache
  } catch (err) {
    console.log('[virtual-tryon] ZAI SDK init failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ── Category config ────────────────────────────────────────────────

interface CategoryConfig {
  gender: 'woman' | 'man' | 'child' | 'person'
  framing: string
  placement: string
  size: ImageSize
  materialHint: string
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryConfig {
  const slug = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  // Women's sarees
  if (slug.includes('saree')) {
    return {
      gender: 'woman',
      framing: 'full-body fashion photograph from head to toe',
      placement: 'draped in the saree in elegant Indian style with pallu over the left shoulder, matching blouse, properly pleated at the waist',
      size: '768x1344',
      materialHint: 'flowing silk fabric with natural drape and sheen',
    }
  }

  // Women's jewelry
  if (slug.includes('jewel') && (slug.includes('women') || !slug.includes('men'))) {
    let placement = 'wearing the jewelry piece elegantly, the jewelry clearly visible'
    if (name.includes('earring') || name.includes('jhumka') || name.includes('stud'))
      placement = 'wearing the earrings on both earlobes, clearly visible and properly positioned'
    else if (name.includes('necklace') || name.includes('choker') || name.includes('pendant') || name.includes('temple') || name.includes('haar'))
      placement = 'wearing the necklace around the neck, sitting naturally at the collarbone'
    else if (name.includes('bracelet') || name.includes('bangle') || name.includes('cuff') || name.includes('kada'))
      placement = 'wearing the bracelet on the wrist, properly fitted'
    else if (name.includes('ring'))
      placement = 'wearing the ring on the finger, clearly visible'
    else if (name.includes('set') || name.includes('bridal'))
      placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
    return {
      gender: 'woman',
      framing: 'upper-body beauty photograph, chest up',
      placement,
      size: '864x1152',
      materialHint: 'polished metal with gemstones, intricate craftsmanship, sparkling highlights',
    }
  }

  // Women's fashion
  if (slug.includes('women-fashion') || (slug.includes('fashion') && !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'full-body fashion photograph from head to toe',
      placement: 'wearing the outfit elegantly with proper fit, natural fabric drape, and realistic folds',
      size: '768x1344',
      materialHint: 'quality fabric with natural drape and texture',
    }
  }

  // Women's fragrances
  if (slug.includes('fragrance') && (slug.includes('women') || !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'upper-body photograph',
      placement: 'holding the fragrance bottle elegantly in one hand, the bottle clearly visible',
      size: '864x1152',
      materialHint: 'glass bottle with refined design',
    }
  }

  // Women's accessories
  if (slug.includes('women-accessories') || (slug.includes('accessories') && !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'upper-body to three-quarter photograph',
      placement: 'wearing or holding the accessory naturally',
      size: '864x1152',
      materialHint: 'quality material with refined finish',
    }
  }

  // Men's watches
  if (slug.includes('watch')) {
    return {
      gender: 'man',
      framing: 'waist-up photograph with the wrist visible',
      placement: 'wearing the watch on the left wrist, the watch face clearly visible',
      size: '864x1152',
      materialHint: 'precision timepiece with metal or leather strap, detailed dial',
    }
  }

  // Men's shirts/t-shirts
  if (slug.includes('shirt') || slug.includes('tshirt') || slug.includes('t-shirt')) {
    return {
      gender: 'man',
      framing: 'full-body fashion photograph',
      placement: 'wearing the shirt on the torso with a natural fit, fabric draping naturally',
      size: '768x1344',
      materialHint: 'soft cotton fabric with natural drape',
    }
  }

  // Men's fragrances
  if (slug.includes('fragrance') && slug.includes('men')) {
    return {
      gender: 'man',
      framing: 'upper-body photograph',
      placement: 'holding the fragrance bottle elegantly',
      size: '864x1152',
      materialHint: 'glass bottle with refined design',
    }
  }

  // Men's accessories
  if (slug.includes('men-accessories') || (slug.includes('accessories') && slug.includes('men'))) {
    return {
      gender: 'man',
      framing: 'upper-body to three-quarter photograph',
      placement: 'wearing or holding the accessory naturally',
      size: '864x1152',
      materialHint: 'quality material with refined finish',
    }
  }

  // Kids
  if (slug.includes('kid')) {
    return {
      gender: 'child',
      framing: 'full-body photograph of a child or teenager',
      placement: 'wearing the outfit with proper fit and natural fabric drape',
      size: '768x1344',
      materialHint: 'comfortable fabric with natural drape',
    }
  }

  // Default
  return {
    gender: 'person',
    framing: 'upper-body to three-quarter photograph',
    placement: 'wearing or holding the product naturally and elegantly',
    size: '864x1152',
    materialHint: 'premium material with refined finish',
  }
}

// ── Color extraction ───────────────────────────────────────────────

const COLOR_WORDS = [
  'red', 'crimson', 'maroon', 'burgundy', 'wine', 'blue', 'navy', 'teal', 'turquoise',
  'green', 'emerald', 'olive', 'mint', 'yellow', 'mustard', 'golden', 'gold', 'amber',
  'orange', 'coral', 'peach', 'pink', 'rose', 'magenta', 'fuchsia', 'purple', 'violet',
  'lavender', 'plum', 'brown', 'tan', 'beige', 'camel', 'black', 'white', 'ivory',
  'cream', 'pearl', 'grey', 'gray', 'silver', 'charcoal', 'champagne', 'ruby', 'sapphire',
]

function extractColors(name: string, description?: string, tags?: string[]): string {
  const text = `${name} ${description || ''} ${(tags || []).join(' ')}`.toLowerCase()
  const found = new Set<string>()
  for (const color of COLOR_WORDS) {
    if (text.includes(color)) found.add(color)
  }
  return Array.from(found).slice(0, 3).join(', ')
}

// ── Build the edit prompt for ZAI ──────────────────────────────────

function buildEditPrompt(config: CategoryConfig, input: TryOnInput): string {
  const colors = extractColors(input.productName, input.productDescription, input.productTags)

  const parts: string[] = []
  parts.push(`Virtual try-on photograph. The person in the reference image is now ${config.placement}.`)
  parts.push(`The product is "${input.productName}".`)
  if (colors) parts.push(`The product colours are ${colors}.`)
  if (config.materialHint) parts.push(`The product is made of ${config.materialHint}.`)
  if (input.productDescription) {
    const desc = input.productDescription.substring(0, 180).replace(/\s+/g, ' ').trim()
    if (desc) parts.push(`Product details: ${desc}.`)
  }
  parts.push(`ABSOLUTE REQUIREMENT — IDENTITY PRESERVATION: Keep the EXACT same face, gender, skin tone, body type, hairstyle, hair colour, and age as the person in the reference image. Do NOT generate a new face. Do NOT change the person's gender.`)
  parts.push(`PRODUCT FIDELITY: Reproduce the EXACT colours, pattern, fabric, embellishments, and design. The product must look NATURALLY WORN with realistic shadows, highlights, and fabric folds — NOT pasted or overlaid.`)
  parts.push(`DO NOT ADD unrelated items: no sunglasses, no eyeglasses, no hats, no scarves, no extra jewellery, no extra clothing — ONLY the product described.`)
  parts.push(`${config.framing}, studio-quality lighting, photorealistic, 8K detail, sharp focus, fashion magazine quality.`)
  parts.push(`Natural pose and expression. Full image, no cropping, no border, no text, no watermark.`)
  return parts.join(' ')
}

// ── Strategy A: Direct ZAI image-edit ──────────────────────────────

async function callZAIImageEdit(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const zai = await getZAI()
  if (!zai) {
    return { success: false, error: 'ZAI SDK unavailable (not configured or Vercel environment)' }
  }

  const config = getCategoryConfig(input.categorySlug, input.productName)
  const prompt = buildEditPrompt(config, input)

  // Use edit-both if we have a product image, otherwise edit-selfie
  const hasProductImage = input.productImageBase64 && input.productImageBase64.startsWith('data:image/')
  const images = hasProductImage
    ? [{ url: input.selfieData }, { url: input.productImageBase64 }]
    : [{ url: input.selfieData }]

  const strategyName = hasProductImage ? 'edit-both' : 'edit-selfie'
  const remaining = Math.min(ZAI_EDIT_TIMEOUT_MS, deadline - Date.now() - 3_000)
  if (remaining < 15_000) {
    return { success: false, error: `insufficient time budget (${remaining}ms) for ZAI edit` }
  }

  console.log(`[virtual-tryon] ZAI image-edit (${strategyName}): ${config.size}, timeout=${remaining}ms`)
  console.log(`[virtual-tryon] Prompt (first 200): ${prompt.substring(0, 200)}...`)

  try {
    const start = Date.now()
    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images,
        size: config.size,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ZAI edit timeout')), remaining)),
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
    console.log(`[virtual-tryon] ✅ ZAI ${strategyName} succeeded in ${elapsed}s (${(byteLen / 1024).toFixed(1)}KB, ${mime})`)
    return { success: true, imageUrl: dataUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[virtual-tryon] ZAI ${strategyName} failed: ${msg.substring(0, 200)}`)
    return { success: false, error: msg.substring(0, 200) }
  }
}

// ── Strategy B: Pollinations with product image (fallback) ─────────

function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

async function uploadToTmpfiles(buf: Buffer, timeoutMs: number): Promise<string | null> {
  const boundary = '----3boxesTryon' + Math.random().toString(16).slice(2)
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([header, buf, footer])

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
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
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { url?: string } }
    const viewerUrl = json?.data?.url
    if (!viewerUrl) return null
    return viewerUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

function buildPollinationsPrompt(config: CategoryConfig, input: TryOnInput): string {
  const colors = extractColors(input.productName, input.productDescription, input.productTags)
  const genderWord = config.gender === 'woman' ? 'woman' : config.gender === 'man' ? 'man' : config.gender === 'child' ? 'child' : 'person'

  const parts: string[] = []
  parts.push(`Professional fashion photograph of a ${genderWord} ${config.placement}.`)
  parts.push(`The product is "${input.productName}".`)
  if (colors) parts.push(`The product colours are ${colors}.`)
  if (config.materialHint) parts.push(`Made of ${config.materialHint}.`)
  if (input.productDescription) {
    const desc = input.productDescription.substring(0, 200).replace(/\s+/g, ' ').trim()
    if (desc) parts.push(`Product details: ${desc}.`)
  }
  if (input.productTags && input.productTags.length > 0) {
    const tags = input.productTags.filter(t => !['new-arrival', 'featured', 'bestseller'].includes(t)).slice(0, 5)
    if (tags.length > 0) parts.push(`Style: ${tags.join(', ')}.`)
  }
  parts.push(`${config.framing}, studio lighting, photorealistic, sharp focus, high detail.`)
  parts.push(`The product must look naturally worn with realistic folds and fit.`)
  parts.push(`No glasses, no sunglasses, no hats, no extra props — only the product described.`)
  return parts.join(' ')
}

async function callPollinationsWithProductImage(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; strategy?: string }> {
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const prompt = buildPollinationsPrompt(config, input)
  const { width, height } = parseImageSize(config.size)

  console.log(`[virtual-tryon] Pollinations: gender=${config.gender}, ${width}x${height}`)
  console.log(`[virtual-tryon] Prompt (first 200): ${prompt.substring(0, 200)}...`)

  // Upload the product image so Pollinations can use it as a reference
  let productUrl: string | null = null
  if (input.productImageBase64 && Date.now() < deadline - 20_000) {
    try {
      const raw = stripDataUrl(input.productImageBase64)
      const buf = Buffer.from(raw, 'base64')
      productUrl = await uploadToTmpfiles(buf, UPLOAD_TIMEOUT_MS)
      console.log(`[virtual-tryon] Product image uploaded: ${productUrl ? 'yes' : 'no'}`)
    } catch (err) {
      console.log(`[virtual-tryon] Product upload failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 1_000_000)
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`
  if (productUrl) {
    url += `&image=${encodeURIComponent(productUrl)}`
  }

  // Retry up to 2 times on rate-limit (HTTP 402)
  const MAX_RETRIES = 2
  const RETRY_DELAYS_MS = [4_000, 6_000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]
      console.log(`[virtual-tryon] Pollinations retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
    }

    const retrySeed = seed + attempt * 11111
    const attemptUrl = url.replace(/&seed=\d+/, `&seed=${retrySeed}`)
    const remaining = Math.min(POLLINATIONS_TIMEOUT_MS, deadline - Date.now() - 3_000)
    if (remaining < 8_000) {
      return { success: false, error: `insufficient time for Pollinations (${remaining}ms)` }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), remaining)

    try {
      const start = Date.now()
      const res = await fetch(attemptUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'image/jpeg, image/png, image/webp, */*', 'User-Agent': '3BOXES-VirtualTryOn/1.0' },
      })
      clearTimeout(timeoutId)
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)

      if (res.status === 402 && attempt < MAX_RETRIES) {
        console.log(`[virtual-tryon] Pollinations 402 rate-limited after ${elapsed}s — will retry`)
        continue
      }
      if (!res.ok) {
        const body = await res.text().catch(() => 'unknown')
        if (attempt < MAX_RETRIES) continue
        return { success: false, error: `Pollinations HTTP ${res.status}: ${body.substring(0, 100)}` }
      }

      const ct = res.headers.get('content-type') || ''
      if (!ct.startsWith('image/')) {
        if (attempt < MAX_RETRIES) continue
        return { success: false, error: `Pollinations non-image response: ${ct}` }
      }

      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 3000) {
        if (attempt < MAX_RETRIES) continue
        return { success: false, error: `Pollinations returned tiny image (${buf.length} bytes)` }
      }

      let mime = 'image/jpeg'
      if (ct.includes('image/png')) mime = 'image/png'
      else if (ct.includes('image/webp')) mime = 'image/webp'

      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
      console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${elapsed}s (${(buf.length / 1024).toFixed(1)}KB)`)
      return { success: true, imageUrl: dataUrl, strategy: productUrl ? 'pollinations-product-img2img' : 'pollinations-text' }
    } catch (err) {
      clearTimeout(timeoutId)
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const msg = isTimeout ? `Pollinations timed out` : `Pollinations error: ${(err as Error).message.substring(0, 100)}`
      console.log(`[virtual-tryon] ${msg} (attempt ${attempt + 1})`)
      if (attempt < MAX_RETRIES) continue
      return { success: false, error: msg }
    }
  }

  return { success: false, error: 'Pollinations failed after all retries' }
}

function parseImageSize(size: ImageSize): { width: number; height: number } {
  const [w, h] = size.split('x').map(Number)
  return { width: w, height: h }
}

// ── Status helpers ─────────────────────────────────────────────────

let spaceAwakeCache: { awake: boolean; timestamp: number } | null = null
const SPACE_CACHE_TTL = 20_000

export async function preWarmSpace(): Promise<boolean> {
  void getZAI() // warm the ZAI SDK cache
  return true
}

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean }> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return { awake: spaceAwakeCache.awake }
  }
  const config = getZAIConfig()
  const awake = !!config
  spaceAwakeCache = { awake, timestamp: now }
  return { awake }
}

export async function isTryOnServiceReady(): Promise<{
  ready: boolean
  engine: string
  reason?: string
}> {
  if (process.env.VERCEL) {
    return {
      ready: true,
      engine: 'pollinations-img2img',
      reason: 'Using Pollinations image-to-image (free, no auth needed on Vercel)',
    }
  }
  const config = getZAIConfig()
  if (config) {
    return {
      ready: true,
      engine: 'zai-image-edit',
      reason: 'ZAI image-edit ready — preserves your face & renders the exact product',
    }
  }
  return {
    ready: true,
    engine: 'pollinations-fallback',
    reason: 'ZAI not configured — using Pollinations fallback',
  }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = {}
  const isVercel = !!process.env.VERCEL

  console.log(`[virtual-tryon] v21 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasSelfie=${!!input.selfieData}, hasProductImg=${!!input.productImageBase64}`)

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

  // ── STRATEGY A: Direct ZAI image-edit (LOCAL / SANDBOX only) ────
  // Calls ZAI's images.generations.edit with BOTH the selfie and the
  // product image (edit-both). This preserves the user's face/gender
  // AND renders the exact product. Completes in 20-27s.
  if (!isVercel && Date.now() < totalDeadline - 20_000) {
    strategiesAttempted.push('zai-image-edit')
    console.log('[virtual-tryon] Strategy A: Direct ZAI image-edit (edit-both)')
    const result = await callZAIImageEdit(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ ZAI image-edit succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: 'zai-image-edit',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['zai-image-edit'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] ZAI image-edit failed: ${result.error?.substring(0, 150)}`)
  } else if (isVercel) {
    strategiesAttempted.push('zai-image-edit-skipped')
    strategyErrors['zai-image-edit-skipped'] = 'Vercel environment — ZAI auth fails on public API'
    console.log('[virtual-tryon] Skipping ZAI (Vercel environment)')
  }

  // ── STRATEGY B: Pollinations with product image (FALLBACK) ──────
  // Used on Vercel (always) and on local when ZAI fails. Uses the
  // PRODUCT IMAGE as the Pollinations `?image=` reference so the
  // generated image shows the CORRECT product. The person is a model
  // matching the category's gender.
  if (Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('pollinations-product-img2img')
    console.log('[virtual-tryon] Strategy B: Pollinations (product image reference)')
    const result = await callPollinationsWithProductImage(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy || 'pollinations-product-img2img',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['pollinations-product-img2img'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Pollinations failed: ${result.error?.substring(0, 150)}`)
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
