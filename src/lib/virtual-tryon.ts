/**
 * Virtual Try-On Engine v22 — Direct ZAI + Pollinations (Selfie Reference + Image Colours)
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY v22?
 *  ─────────────────────────────────────────────────────────────────────────
 *  v21 used the PRODUCT image as the Pollinations `?image=` reference on
 *  Vercel. This caused TWO problems:
 *    1. The user's SELFIE was never sent to Pollinations → the generated
 *       person didn't match the uploaded selfie (wrong face, wrong gender
 *       features, wrong hair).
 *    2. The product colours came from the product NAME/DESCRIPTION text,
 *       not the actual product IMAGE → the generated product had the wrong
 *       colours (e.g. "maroon" from the name when the actual photo was
 *       bright red).
 *
 *  v22 fixes BOTH issues:
 *    1. Uploads the user's SELFIE as the Pollinations `?image=` reference
 *       so the generated person preserves the user's face, gender, skin
 *       tone, hairstyle, and features.
 *    2. Extracts the REAL dominant colours from the actual product IMAGE
 *       using sharp (lazy-loaded) and includes them in the prompt → the
 *       generated product matches the actual product's colours.
 *
 *  ARCHITECTURE:
 *    Client (browser) POST /api/try-on
 *      └─► performVirtualTryOn()  (THIS FILE)
 *            ├─► Strategy A: Direct ZAI image-edit (LOCAL / SANDBOX only)
 *            │     • Explicit config from /etc/.z-ai-config
 *            │     • edit-both: selfie + product image → preserves face + product
 *            │     • 20-27s, high quality
 *            └─► Strategy B: Pollinations selfie-img2img (VERCEL + fallback)
 *                  • Extract REAL colours from product image via sharp
 *                  • Upload SELFIE → use as ?image= reference
 *                  • Hyper-detailed prompt with image-extracted colours
 *                  • Preserves user's face/gender/features
 *                  • 5-15s, always works
 *
 *  ENVIRONMENT BEHAVIOUR:
 *    • LOCAL / SANDBOX: Direct ZAI edit-both (best quality, preserves face
 *      AND product). Falls back to Pollinations selfie-img2img if ZAI down.
 *    • VERCEL: Pollinations selfie-img2img (ZAI auth fails on public API).
 *      The user's selfie is the reference → person matches. The product
 *      colours are extracted from the actual product image → product matches.
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

// ── Image-based color extraction (sharp) ───────────────────────────
// Extracts the REAL dominant colours from the product photo so the
// Pollinations prompt describes the ACTUAL product, not just the name.

let sharpModuleCache: any = null
async function getSharp(): Promise<any | null> {
  if (sharpModuleCache) return sharpModuleCache
  try {
    const mod = await import('sharp')
    sharpModuleCache = (mod as any).default || mod
    return sharpModuleCache
  } catch {
    return null
  }
}

function rgbToColorName(r: number, g: number, b: number): string {
  // Convert RGB to HSV for better color naming
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const v = max
  const s = max === 0 ? 0 : delta / max
  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  // Achromatic (grey/black/white)
  if (s < 0.12) {
    if (v < 0.15) return 'black'
    if (v > 0.92) return 'white'
    if (v < 0.4) return 'charcoal grey'
    if (v < 0.65) return 'grey'
    return 'silver'
  }

  // Bright/light/dark prefix — generous with "bright" for saturated colours
  // so FLUX generates vibrant results (product photos are usually well-lit)
  const lightPrefix = v > 0.6 ? 'bright ' : v < 0.25 ? 'dark ' : ''

  // Hue-based naming
  if (h < 15 || h >= 345) return `${lightPrefix}red`
  if (h < 30) return v < 0.4 ? 'maroon' : 'red'
  if (h < 45) return v < 0.4 ? 'burgundy' : 'orange-red'
  if (h < 60) return `${lightPrefix}orange`
  if (h < 70) return 'mustard yellow'
  if (h < 85) return `${lightPrefix}yellow`
  if (h < 100) return v > 0.6 ? 'lime' : 'olive'
  if (h < 150) return `${lightPrefix}green`
  if (h < 175) return 'emerald green'
  if (h < 195) return 'teal'
  if (h < 215) return 'turquoise'
  if (h < 240) return `${lightPrefix}blue`
  if (h < 260) return 'navy blue'
  if (h < 285) return 'violet'
  if (h < 310) return v > 0.6 ? 'pink' : 'purple'
  if (h < 335) return v > 0.7 ? 'rose pink' : 'magenta'
  return `${lightPrefix}red`
}

export async function extractColorsFromProductImage(imageBase64: string): Promise<string> {
  if (!imageBase64 || !imageBase64.startsWith('data:image/')) return ''
  const sharp = await getSharp()
  if (!sharp) return ''

  try {
    const raw = stripDataUrl(imageBase64)
    const buf = Buffer.from(raw, 'base64')

    // Resize to a tiny thumbnail and get raw RGB pixels
    const { data } = await sharp(buf)
      .resize(32, 32, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Quantize pixels into colour buckets, weighting by SATURATION
    // (vibrant product colours get higher priority than grey backgrounds)
    const buckets = new Map<string, { count: number; satSum: number; r: number; g: number; b: number }>()
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const delta = max - min
      const sat = max === 0 ? 0 : delta / max // 0..1

      // Skip near-white backgrounds (common in e-commerce product photos)
      if (max > 235 && delta < 15) continue
      // Skip near-black
      if (max < 25) continue
      // Skip low-saturation greys (background, shadows, mannequin)
      // Only keep pixels with saturation > 0.18 (vibrant enough to be product colour)
      if (sat < 0.18) continue

      // Quantize to 3 bits per channel
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`
      const existing = buckets.get(key)
      if (existing) {
        existing.count++
        existing.satSum += sat
        existing.r += r
        existing.g += g
        existing.b += b
      } else {
        buckets.set(key, { count: 1, satSum: sat, r, g, b })
      }
    }

    if (buckets.size === 0) {
      // Fallback: if no vibrant colours found (e.g. black/white product),
      // re-run without the saturation filter
      const fallback = new Map<string, { count: number; r: number; g: number; b: number }>()
      for (let i = 0; i < data.length; i += 3) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        if (max > 235 && max - min < 15) continue
        if (max < 25) continue
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`
        const existing = fallback.get(key)
        if (existing) { existing.count++; existing.r += r; existing.g += g; existing.b += b }
        else fallback.set(key, { count: 1, r, g, b })
      }
      if (fallback.size === 0) return ''
      const sorted = Array.from(fallback.values()).sort((a, b) => b.count - a.count)
      const names = sorted.slice(0, 2).map(bk => rgbToColorName(Math.round(bk.r / bk.count), Math.round(bk.g / bk.count), Math.round(bk.b / bk.count)))
      const unique = Array.from(new Set(names))
      console.log(`[virtual-tryon] Image-extracted colours (fallback): ${unique.join(', ')}`)
      return unique.join(', ')
    }

    // Sort by (count × avg saturation) — vibrant + frequent colours win
    const sorted = Array.from(buckets.values()).sort((a, b) =>
      (b.count * (b.satSum / b.count)) - (a.count * (a.satSum / a.count))
    )
    const top = sorted.slice(0, 3)
    const names = top.map(bucket => {
      const avgR = Math.round(bucket.r / bucket.count)
      const avgG = Math.round(bucket.g / bucket.count)
      const avgB = Math.round(bucket.b / bucket.count)
      return rgbToColorName(avgR, avgG, avgB)
    })

    // Deduplicate (e.g. "bright red" and "red" → keep both, they reinforce)
    const unique = Array.from(new Set(names))
    console.log(`[virtual-tryon] Image-extracted colours: ${unique.join(', ')} (from ${buckets.size} vibrant buckets)`)
    return unique.join(', ')
  } catch (err) {
    console.log(`[virtual-tryon] Colour extraction failed: ${err instanceof Error ? err.message : String(err)}`)
    return ''
  }
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

function buildPollinationsPrompt(config: CategoryConfig, input: TryOnInput, imageColors: string): string {
  // Prefer image-extracted colours (accurate) over text-extracted (from name/desc)
  const textColors = extractColors(input.productName, input.productDescription, input.productTags)
  const colors = imageColors || textColors
  const genderWord = config.gender === 'woman' ? 'woman' : config.gender === 'man' ? 'man' : config.gender === 'child' ? 'child' : 'person'

  // SHORT, FOCUSED prompt — tests confirmed that Pollinations FLUX responds
  // best to concise prompts with explicit colour names. Long prompts dilute
  // the colour signal and produce mismatched results.
  const parts: string[] = []
  parts.push(`Virtual try-on photo of a ${genderWord} ${config.placement}.`)
  parts.push(`Wearing "${input.productName}".`)
  if (colors) parts.push(`The product colour is ${colors}.`)
  if (config.materialHint) parts.push(`Material: ${config.materialHint}.`)
  if (input.productDescription) {
    // Keep description very short — just key details
    const desc = input.productDescription.substring(0, 120).replace(/\s+/g, ' ').trim()
    if (desc) parts.push(`${desc}.`)
  }
  parts.push(`${config.framing}, studio lighting, photorealistic, sharp focus, fashion magazine quality.`)
  parts.push(`Naturally worn with realistic folds and fit.`)
  parts.push(`No sunglasses, no glasses, no hats, no extra props.`)
  return parts.join(' ')
}

// Compress the selfie before upload (resize to max 768px, JPEG quality 82)
// so tmpfiles.org upload is fast and Pollinations receives a reasonable size.
async function compressSelfieForUpload(selfieData: string): Promise<Buffer> {
  const sharp = await getSharp()
  if (!sharp) {
    // Fallback: raw buffer
    const raw = stripDataUrl(selfieData)
    return Buffer.from(raw, 'base64')
  }
  try {
    const raw = stripDataUrl(selfieData)
    const buf = Buffer.from(raw, 'base64')
    const compressed = await sharp(buf)
      .resize(768, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer()
    console.log(`[virtual-tryon] Selfie compressed: ${(buf.length / 1024).toFixed(1)}KB → ${(compressed.length / 1024).toFixed(1)}KB`)
    return compressed
  } catch {
    const raw = stripDataUrl(selfieData)
    return Buffer.from(raw, 'base64')
  }
}

async function callPollinationsWithSelfieReference(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; strategy?: string }> {
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const { width, height } = parseImageSize(config.size)

  // Step 1: Extract REAL colours from the product image (not just text)
  const imageColors = await extractColorsFromProductImage(input.productImageBase64)

  // Step 2: Build the prompt with accurate, image-derived colours
  const prompt = buildPollinationsPrompt(config, input, imageColors)

  console.log(`[virtual-tryon] Pollinations v22: gender=${config.gender}, ${width}x${height}, imageColours="${imageColors}"`)
  console.log(`[virtual-tryon] Prompt (first 250): ${prompt.substring(0, 250)}...`)

  // Step 3: Upload the SELFIE (not the product) as the ?image= reference
  // This preserves the user's face/gender/features in the generated image.
  let selfieUrl: string | null = null
  if (Date.now() < deadline - 22_000) {
    try {
      const selfieBuf = await compressSelfieForUpload(input.selfieData)
      selfieUrl = await uploadToTmpfiles(selfieBuf, UPLOAD_TIMEOUT_MS)
      console.log(`[virtual-tryon] Selfie uploaded: ${selfieUrl ? 'yes' : 'no'}`)
    } catch (err) {
      console.log(`[virtual-tryon] Selfie upload failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 1_000_000)
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`
  if (selfieUrl) {
    url += `&image=${encodeURIComponent(selfieUrl)}`
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
      return { success: true, imageUrl: dataUrl, strategy: selfieUrl ? 'pollinations-selfie-img2img' : 'pollinations-text' }
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
      engine: 'pollinations-selfie-img2img',
      reason: 'Using Pollinations with your selfie as reference + real product colours extracted from the product image (free, no auth needed on Vercel)',
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
    engine: 'pollinations-selfie-img2img',
    reason: 'ZAI not configured — using Pollinations selfie-img2img fallback',
  }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = {}
  const isVercel = !!process.env.VERCEL

  console.log(`[virtual-tryon] v22 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasSelfie=${!!input.selfieData}, hasProductImg=${!!input.productImageBase64}`)

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

  // ── STRATEGY B: Pollinations with SELFIE reference (VERCEL + FALLBACK)
  // Used on Vercel (always) and on local when ZAI fails. Uploads the
  // user's SELFIE as the Pollinations `?image=` reference so the
  // generated person preserves the user's face/gender/features. The
  // product is described in the prompt using colours EXTRACTED FROM
  // THE ACTUAL PRODUCT IMAGE (via sharp) — not just the product name.
  if (Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('pollinations-selfie-img2img')
    console.log('[virtual-tryon] Strategy B: Pollinations (selfie reference + image-extracted colours)')
    const result = await callPollinationsWithSelfieReference(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy || 'pollinations-selfie-img2img',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['pollinations-selfie-img2img'] = result.error || 'No image returned'
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
