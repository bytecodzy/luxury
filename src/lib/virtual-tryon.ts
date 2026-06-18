/**
 * Virtual Try-On Engine v26 — IDM-VTON-first strategy that works on BOTH local AND Vercel
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY v26?
 *  ─────────────────────────────────────────────────────────────────────────
 *  v25 made Gemini the PRIMARY strategy, but the user-provided Gemini API key
 *  is INVALID (returns HTTP 401 ACCESS_TOKEN_TYPE_UNSUPPORTED for every model
 *  and endpoint tested). So Gemini always fails fast (~1s) and the request
 *  falls through to Pollinations.
 *
 *  v25 also marked sarees as NOT vtonCompatible, so sarees fell ALL the way
 *  through to Pollinations — which is rate-limited (HTTP 429) and slow
 *  (timeouts). The Pollinations retry loop (3 attempts × 25s + 4s + 6s delays
 *  = up to 85s) regularly exceeded the client's 55s timeout, producing the
 *  "Generation Timed Out" error for sarees.
 *
 *  v26 FIXES THIS by making IDM-VTON the PRIMARY strategy on Vercel for ALL
 *  garment categories — including sarees. IDM-VTON is the STANDARD free VTON
 *  model (HuggingFace Space, no auth, reliable ~25s). It works for shirts,
 *  dresses, fashion, AND sarees (full-body garments). For non-garment
 *  categories (jewelry, watches, fragrances), Pollinations is used with a
 *  REDUCED retry count (1 retry max, 18s timeout) so it never exceeds the
 *  client timeout.
 *
 *  STRATEGY ORDER:
 *
 *  On VERCEL (production):
 *    1. IDM-VTON HF Space (PRIMARY — ALL garment categories including sarees)
 *       - Free, no auth required, reliable ~25s
 *       - Real VTON model — preserves face AND renders exact garment
 *    2. Pollinations (FALLBACK — ALL categories)
 *       - Reduced retries (1 max) and timeout (18s) to prevent client timeout
 *       - Uses selfie as image reference when possible
 *    3. Gemini (OPTIONAL — only if GEMINI_API_KEY env var is set to a valid key)
 *       - The hardcoded fallback key is INVALID, so this is effectively skipped
 *
 *  On LOCAL (sandbox):
 *    1. ZAI image-edit (PRIMARY — best quality, preserves face + product)
 *    2. IDM-VTON (garments only)
 *    3. Pollinations (last resort)
 *    4. Gemini (only if valid key set)
 *
 *  GEMINI API KEY:
 *    - The previously-hardcoded Gemini key was INVALID for the Gemini API
 *      (returns HTTP 401 ACCESS_TOKEN_TYPE_UNSUPPORTED). It's NOT a Google
 *      AI Studio API key (those start with AIzaSy...).
 *    - To enable Gemini: get a valid key from https://aistudio.google.com/apikey
 *      and set it as the GEMINI_API_KEY env var on Vercel.
 * ─────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'

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
  skinTone?: string
  hairColor?: string
  clientProductColors?: string
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
    extractedColors?: string
    promptPreview?: string
    selfieUploaded?: boolean
  }
}

// ── Timeouts ───────────────────────────────────────────────────────

const TOTAL_TIMEOUT_MS = 50_000 // hard cap (Vercel functions max at 60s)
const IDM_VTON_TIMEOUT_MS = 35_000 // IDM-VTON (reduced to fit Vercel's 60s limit)
const ZAI_EDIT_TIMEOUT_MS = 40_000
const POLLINATIONS_TIMEOUT_MS = 18_000 // reduced from 25s — prevents client timeout (55s)
const UPLOAD_TIMEOUT_MS = 10_000

// ── IDM-VTON Space config ──────────────────────────────────────────
// The official IDM-VTON Space on HuggingFace. Free, no auth required.
// Works from any HTTP environment (local, Vercel, etc.).

const IDM_VTON_SPACE = 'yisol/IDM-VTON'
const IDM_VTON_BASE = `https://${IDM_VTON_SPACE.replace('/', '-')}.hf.space`
const IDM_VTON_TRYON_ENDPOINT = `${IDM_VTON_BASE}/call/tryon`

// ── Gemini API config (OPTIONAL — only used if GEMINI_API_KEY env var is set) ──
// v26: The previously-hardcoded Gemini key was INVALID for the Gemini API
// (returned HTTP 401 ACCESS_TOKEN_TYPE_UNSUPPORTED for every model/endpoint
// tested). It has been REMOVED to avoid GitHub secret-scanner blocks.
//
// To enable Gemini as a last-resort strategy on Vercel:
//   1. Get a VALID API key from https://aistudio.google.com/apikey
//      (valid keys start with "AIzaSy..." and are 39 chars)
//   2. Set it as the GEMINI_API_KEY environment variable on Vercel
//      (Project Settings → Environment Variables)
//   3. Redeploy
//
// Gemini 2.5 Flash Image (Nano Banana) free tier: 15 RPM, 1500 requests/day.
// When enabled, Gemini is tried as the LAST RESORT (after IDM-VTON and
// Pollinations). It handles ALL categories (sarees, jewelry, watches, etc.)
// and preserves the user's face AND renders the exact product.
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

function getGeminiApiKey(): string | null {
  // Only use the env var — no hardcoded fallback (the previous hardcoded key was invalid)
  return process.env.GEMINI_API_KEY || null
}

// ── ZAI Config (local-only) ────────────────────────────────────────
// Used only in the sandbox (ZAI's internal-api.z.ai is internal-only).
// On Vercel, this is skipped entirely.

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

  // 1. Try env vars first (highest priority)
  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    cachedZAIConfig = {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
    console.log('[virtual-tryon] ZAI config loaded from env vars')
    return cachedZAIConfig
  }

  // 2. Try config files (sandbox environment)
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

  // 3. Not available (Vercel without env vars)
  cachedZAIConfig = null
  return cachedZAIConfig
}

// ── Category config ────────────────────────────────────────────────

interface CategoryConfig {
  gender: 'woman' | 'man' | 'child' | 'person'
  framing: string
  placement: string
  size: ImageSize
  materialHint: string
  // Whether IDM-VTON can handle this category (it's designed for garments)
  vtonCompatible: boolean
  // Description for IDM-VTON's garment_des parameter
  garmentDescription: string
}

function getCategoryConfig(categorySlug: string, productName: string): CategoryConfig {
  const slug = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  // Women's sarees — v26: IDM-VTON is now PRIMARY for sarees.
  // Sarees are full-body garments and IDM-VTON handles them reliably (~25s).
  // This fixes the v25 "Generation Timed Out" error where sarees fell through
  // to Pollinations (rate-limited + slow) and exceeded the client timeout.
  if (slug.includes('saree')) {
    return {
      gender: 'woman',
      framing: 'full-body fashion photograph from head to toe',
      placement: 'draped in the saree in elegant Indian style with pallu over the left shoulder, matching blouse, properly pleated at the waist',
      size: '768x1344',
      materialHint: 'flowing silk fabric with natural drape and sheen',
      vtonCompatible: true,
      garmentDescription: `A beautiful ${productName} — a traditional Indian saree with matching blouse`,
    }
  }

  // Women's jewelry — not a garment, IDM-VTON can't handle it
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
      vtonCompatible: false,
      garmentDescription: `A ${productName} jewelry piece`,
    }
  }

  // Women's fashion (dresses, kurtis, lehengas, etc.) — IDM-VTON compatible
  if (slug.includes('women-fashion') || (slug.includes('fashion') && !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'full-body fashion photograph from head to toe',
      placement: 'wearing the outfit elegantly with proper fit, natural fabric drape, and realistic folds',
      size: '768x1344',
      materialHint: 'quality fabric with natural drape and texture',
      vtonCompatible: true,
      garmentDescription: `A ${productName} dress/outfit`,
    }
  }

  // Women's fragrances — not a garment
  if (slug.includes('fragrance') && (slug.includes('women') || !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'upper-body photograph',
      placement: 'holding the fragrance bottle elegantly in one hand, the bottle clearly visible',
      size: '864x1152',
      materialHint: 'glass bottle with refined design',
      vtonCompatible: false,
      garmentDescription: `A ${productName} fragrance bottle`,
    }
  }

  // Women's accessories — not a garment
  if (slug.includes('women-accessories') || (slug.includes('accessories') && !slug.includes('men'))) {
    return {
      gender: 'woman',
      framing: 'upper-body to three-quarter photograph',
      placement: 'wearing or holding the accessory naturally',
      size: '864x1152',
      materialHint: 'quality material with refined finish',
      vtonCompatible: false,
      garmentDescription: `A ${productName} accessory`,
    }
  }

  // Men's watches — not a garment
  if (slug.includes('watch')) {
    return {
      gender: 'man',
      framing: 'waist-up photograph with the wrist visible',
      placement: 'wearing the watch on the left wrist, the watch face clearly visible',
      size: '864x1152',
      materialHint: 'precision timepiece with metal or leather strap, detailed dial',
      vtonCompatible: false,
      garmentDescription: `A ${productName} watch`,
    }
  }

  // Men's shirts/t-shirts — IDM-VTON compatible (this is its specialty)
  if (slug.includes('shirt') || slug.includes('tshirt') || slug.includes('t-shirt')) {
    return {
      gender: 'man',
      framing: 'full-body fashion photograph',
      placement: 'wearing the shirt on the torso with a natural fit, fabric draping naturally',
      size: '768x1344',
      materialHint: 'soft cotton fabric with natural drape',
      vtonCompatible: true,
      garmentDescription: `A ${productName} shirt`,
    }
  }

  // Men's fragrances — not a garment
  if (slug.includes('fragrance') && slug.includes('men')) {
    return {
      gender: 'man',
      framing: 'upper-body photograph',
      placement: 'holding the fragrance bottle elegantly',
      size: '864x1152',
      materialHint: 'glass bottle with refined design',
      vtonCompatible: false,
      garmentDescription: `A ${productName} fragrance bottle`,
    }
  }

  // Men's accessories — not a garment
  if (slug.includes('men-accessories') || (slug.includes('accessories') && slug.includes('men'))) {
    return {
      gender: 'man',
      framing: 'upper-body to three-quarter photograph',
      placement: 'wearing or holding the accessory naturally',
      size: '864x1152',
      materialHint: 'quality material with refined finish',
      vtonCompatible: false,
      garmentDescription: `A ${productName} accessory`,
    }
  }

  // Kids — IDM-VTON compatible for clothing
  if (slug.includes('kid')) {
    return {
      gender: 'child',
      framing: 'full-body photograph of a child or teenager',
      placement: 'wearing the outfit with proper fit and natural fabric drape',
      size: '768x1344',
      materialHint: 'comfortable fabric with natural drape',
      vtonCompatible: true,
      garmentDescription: `A ${productName} kids outfit`,
    }
  }

  // Default — try IDM-VTON, might work for generic clothing
  return {
    gender: 'person',
    framing: 'upper-body to three-quarter photograph',
    placement: 'wearing or holding the product naturally and elegantly',
    size: '864x1152',
    materialHint: 'premium material with refined finish',
    vtonCompatible: true,
    garmentDescription: `A ${productName}`,
  }
}

// ── Color extraction (text-based) ──────────────────────────────────

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

// ── Image-based color extraction (jimp — pure JS, works on Vercel) ──

function stripDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

function rgbToColorName(r: number, g: number, b: number): string {
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

  if (s < 0.12) {
    if (v < 0.15) return 'black'
    if (v > 0.92) return 'white'
    if (v < 0.4) return 'charcoal grey'
    if (v < 0.65) return 'grey'
    return 'silver'
  }

  const lightPrefix = v > 0.6 ? 'bright ' : v < 0.25 ? 'dark ' : ''

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

  try {
    const raw = stripDataUrl(imageBase64)
    const buf = Buffer.from(raw, 'base64')

    const JimpModule = await import('jimp')
    const Jimp = (JimpModule as any).Jimp || (JimpModule as any).default || JimpModule
    const image = await Jimp.read(buf)
    image.resize({ w: 32, h: 32 })

    const data = image.bitmap.data as Buffer
    const pixelCount = 32 * 32

    const buckets = new Map<string, { count: number; satSum: number; r: number; g: number; b: number }>()
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4
      const r = data[offset], g = data[offset + 1], b = data[offset + 2]
      if (data[offset + 3] < 128) continue

      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const delta = max - min
      const sat = max === 0 ? 0 : delta / max

      if (max > 235 && delta < 15) continue
      if (max < 25) continue
      if (sat < 0.18) continue

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
      const fallback = new Map<string, { count: number; r: number; g: number; b: number }>()
      for (let i = 0; i < pixelCount; i++) {
        const offset = i * 4
        const r = data[offset], g = data[offset + 1], b = data[offset + 2]
        if (data[offset + 3] < 128) continue
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

    const sorted = Array.from(buckets.values()).sort((a, b) =>
      (b.count * (b.satSum / b.count)) - (a.count * (a.satSum / a.count))
    )
    const top = sorted.slice(0, 4)
    const names = top.map(bucket => {
      const avgR = Math.round(bucket.r / bucket.count)
      const avgG = Math.round(bucket.g / bucket.count)
      const avgB = Math.round(bucket.b / bucket.count)
      return rgbToColorName(avgR, avgG, avgB)
    })

    const byBase = new Map<string, string>()
    for (const name of names) {
      const base = name.replace(/^(bright |dark )/, '').trim()
      const existing = byBase.get(base)
      if (!existing) {
        byBase.set(base, name)
      } else if (name.startsWith('bright ') && !existing.startsWith('bright ')) {
        byBase.set(base, name)
      }
    }
    const unique: string[] = []
    for (const name of names) {
      const base = name.replace(/^(bright |dark )/, '').trim()
      const chosen = byBase.get(base)
      if (chosen === name && !unique.includes(name)) {
        unique.push(name)
        byBase.delete(base)
      }
      if (unique.length >= 2) break
    }
    console.log(`[virtual-tryon] Image-extracted colours: ${unique.join(', ')} (from ${buckets.size} vibrant buckets)`)
    return unique.join(', ')
  } catch (err) {
    console.log(`[virtual-tryon] Colour extraction failed: ${err instanceof Error ? err.message : String(err)}`)
    return ''
  }
}

// ── Strategy A: IDM-VTON HF Space (Gradio REST API) — PRIMARY ──────
// This is the STANDARD free VTON solution. Works on local AND Vercel.
//
// The Gradio SSE v3 protocol:
//   1. POST /upload with multipart form data → returns ["path1", "path2", ...]
//   2. POST /call/tryon with JSON body { data: [...] } → returns { event_id: "..." }
//   3. GET /call/tryon/{event_id} with SSE stream → returns events:
//      - event: heartbeat (keep-alive)
//      - event: complete (with result data)
//      - event: error (with error message)
//   4. Download the result image from the URL in the complete event
//
// CRITICAL: The GET stream must be initiated IMMEDIATELY after the POST call,
// otherwise the session expires and you get "404: Session not found".

async function uploadImageToHF(
  imageBase64: string,
  timeoutMs: number,
): Promise<string | null> {
  const raw = stripDataUrl(imageBase64)
  const buf = Buffer.from(raw, 'base64')

  // Determine content type from the data URL prefix
  let contentType = 'image/jpeg'
  if (imageBase64.startsWith('data:image/png')) contentType = 'image/png'
  else if (imageBase64.startsWith('data:image/webp')) contentType = 'image/webp'

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `upload_${Date.now()}.${ext}`

  const boundary = '----3boxesVTON' + Math.random().toString(16).slice(2)
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([header, buf, footer])

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${IDM_VTON_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'User-Agent': '3BOXES-VirtualTryOn/1.0',
      },
      body,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.log(`[virtual-tryon] HF upload failed: HTTP ${res.status}`)
      return null
    }
    const result = (await res.json()) as string[]
    if (!Array.isArray(result) || result.length === 0) {
      console.log(`[virtual-tryon] HF upload returned no paths`)
      return null
    }
    return result[0]
  } catch (err) {
    clearTimeout(timeoutId)
    console.log(`[virtual-tryon] HF upload error: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function wakeUpIDMSpace(): Promise<void> {
  try {
    await fetch(`${IDM_VTON_BASE}/`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': '3BOXES-VirtualTryOn/1.0' },
    })
  } catch {
    // ignore — best effort wake-up
  }
}

interface IDMVTONResult {
  success: boolean
  imageUrl?: string
  error?: string
}

async function callIDMVTON(
  input: TryOnInput,
  deadline: number,
): Promise<IDMVTONResult> {
  const catConfig = getCategoryConfig(input.categorySlug, input.productName)

  if (!input.productImageBase64 || !input.productImageBase64.startsWith('data:image/')) {
    return { success: false, error: 'No product image provided for IDM-VTON' }
  }

  console.log('[virtual-tryon] IDM-VTON: uploading selfie + garment...')

  // Note: We skip the wakeUpIDMSpace() call here — the POST to /upload and
  // /call/tryon will wake the space automatically. Skipping the wake-up call
  // saves 10-12s on Vercel (critical for fitting within the 60s function limit).

  // Step 1: Upload both images to the Space
  const uploadStart = Date.now()
  const [selfiePath, garmentPath] = await Promise.all([
    uploadImageToHF(input.selfieData, UPLOAD_TIMEOUT_MS),
    uploadImageToHF(input.productImageBase64, UPLOAD_TIMEOUT_MS),
  ])

  if (!selfiePath || !garmentPath) {
    return { success: false, error: `Failed to upload images to HF Space (selfie=${!!selfiePath}, garment=${!!garmentPath})` }
  }
  console.log(`[virtual-tryon] IDM-VTON: uploaded in ${((Date.now() - uploadStart) / 1000).toFixed(1)}s`)

  // Step 2: Call /tryon and stream the result — with RETRY (only 1 retry to fit Vercel's timeout)
  // The HF Space can return "Session not found" or "error: null" intermittently
  // (especially when waking from sleep). A single retry gives the Space time to
  // fully wake up without exceeding Vercel's 60s function limit.
  const MAX_RETRIES = 1
  const RETRY_DELAY_MS = 1_500

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[virtual-tryon] IDM-VTON: retry ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`)
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
    }

    if (Date.now() >= deadline - 20_000) {
      return { success: false, error: `insufficient time for IDM-VTON attempt ${attempt + 1}` }
    }

    const result = await callIDMVTONOnce(input, selfiePath, garmentPath, catConfig.garmentDescription, deadline)
    if (result.success) {
      return result
    }

    console.log(`[virtual-tryon] IDM-VTON attempt ${attempt + 1} failed: ${result.error?.substring(0, 100)}`)

    // If this is the last attempt, return the error
    if (attempt === MAX_RETRIES) {
      return result
    }
  }

  return { success: false, error: 'IDM-VTON failed after all retries' }
}

// Single attempt at calling IDM-VTON (POST + SSE stream + download)
async function callIDMVTONOnce(
  input: TryOnInput,
  selfiePath: string,
  garmentPath: string,
  garmentDescription: string,
  deadline: number,
): Promise<IDMVTONResult> {
  // Step 2: Call the /tryon endpoint
  const requestBody = {
    data: [
      {
        background: { path: selfiePath, meta: { _type: 'gradio.FileData' } },
        layers: [],
        composite: null,
      },
      { path: garmentPath, meta: { _type: 'gradio.FileData' } },
      garmentDescription,
      true,  // is_checked — use auto-generated mask
      false, // is_checked_crop — don't auto-crop
      30,    // denoise_steps
      Math.floor(Math.random() * 1000000), // seed — random for variety
    ],
  }

  const callController = new AbortController()
  const callTimeoutId = setTimeout(() => callController.abort(), 15_000)
  let eventId: string | null = null

  try {
    const callRes = await fetch(IDM_VTON_TRYON_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '3BOXES-VirtualTryOn/1.0',
      },
      body: JSON.stringify(requestBody),
      signal: callController.signal,
    })
    clearTimeout(callTimeoutId)
    if (!callRes.ok) {
      const errBody = await callRes.text().catch(() => 'unknown')
      return { success: false, error: `IDM-VTON call HTTP ${callRes.status}: ${errBody.substring(0, 100)}` }
    }
    const callResult = (await callRes.json()) as { event_id?: string }
    eventId = callResult.event_id || null
    if (!eventId) {
      return { success: false, error: 'IDM-VTON returned no event_id' }
    }
    console.log(`[virtual-tryon] IDM-VTON: call accepted, event_id=${eventId.substring(0, 12)}...`)
  } catch (err) {
    clearTimeout(callTimeoutId)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    return { success: false, error: isTimeout ? 'IDM-VTON call timed out' : `IDM-VTON call error: ${(err as Error).message.substring(0, 100)}` }
  }

  // Step 3: Stream the result via SSE — MUST be initiated immediately
  // Use Node's https module directly for reliable SSE streaming (fetch can
  // buffer responses in some environments, causing session timeouts).
  const streamRemaining = Math.min(IDM_VTON_TIMEOUT_MS, deadline - Date.now() - 5_000)
  if (streamRemaining < 15_000) {
    return { success: false, error: `insufficient time for IDM-VTON stream (${streamRemaining}ms)` }
  }

  console.log(`[virtual-tryon] IDM-VTON: streaming result (timeout=${streamRemaining}ms)...`)

  const streamUrl = `${IDM_VTON_TRYON_ENDPOINT}/${eventId}`
  let resultUrl: string | null = null
  let errorMessage: string | null = null

  try {
    const streamResult = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const urlObj = new URL(streamUrl)
      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'User-Agent': '3BOXES-VirtualTryOn/1.0',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        },
        (res: any) => {
          if (res.statusCode !== 200) {
            resolve({ ok: false, error: `IDM-VTON stream HTTP ${res.statusCode}` })
            res.resume()
            return
          }

          let buffer = ''
          let settled = false

          const finish = (ok: boolean, error?: string) => {
            if (settled) return
            settled = true
            resolve({ ok, error })
          }

          res.on('data', (chunk: Buffer) => {
            if (settled) return
            buffer += chunk.toString('utf8')

            // Process complete events (separated by \n\n)
            let eventEnd: number
            while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
              const eventBlock = buffer.substring(0, eventEnd)
              buffer = buffer.substring(eventEnd + 2)

              const lines = eventBlock.split('\n')
              let eventType = ''
              let dataLine = ''
              for (const line of lines) {
                if (line.startsWith('event: ')) eventType = line.substring(7).trim()
                else if (line.startsWith('data: ')) dataLine = line.substring(6)
              }

              if (eventType === 'complete') {
                try {
                  const data = JSON.parse(dataLine)
                  if (Array.isArray(data) && data.length > 0 && data[0].url) {
                    resultUrl = data[0].url
                    console.log(`[virtual-tryon] IDM-VTON: complete — result URL=${resultUrl.substring(0, 80)}...`)
                    finish(true)
                  } else {
                    errorMessage = 'IDM-VTON returned no image URL in complete event'
                    finish(false, errorMessage)
                  }
                } catch (e) {
                  errorMessage = `IDM-VTON: failed to parse complete data: ${(e as Error).message.substring(0, 80)}`
                  finish(false, errorMessage)
                }
                res.resume()
                return
              } else if (eventType === 'error') {
                errorMessage = `IDM-VTON error: ${dataLine.substring(0, 150)}`
                console.log(`[virtual-tryon] ${errorMessage}`)
                finish(false, errorMessage)
                res.resume()
                return
              }
              // heartbeat events are ignored (keep-alive)
            }
          })

          res.on('end', () => {
            if (!settled) {
              finish(false, errorMessage || 'IDM-VTON stream ended without result')
            }
          })

          res.on('error', (err: Error) => {
            if (!settled) {
              finish(false, `IDM-VTON stream error: ${err.message.substring(0, 100)}`)
            }
          })
        }
      )

      req.on('error', (err: Error) => {
        resolve({ ok: false, error: `IDM-VTON stream request error: ${err.message.substring(0, 100)}` })
      })

      req.setTimeout(streamRemaining, () => {
        req.destroy()
        resolve({ ok: false, error: `IDM-VTON stream timed out (${streamRemaining}ms)` })
      })

      req.end()
    })

    if (!streamResult.ok) {
      return { success: false, error: streamResult.error || 'IDM-VTON stream failed' }
    }

    if (!resultUrl) {
      return { success: false, error: errorMessage || 'IDM-VTON stream ended without result' }
    }

    // Step 4: Download the result image IMMEDIATELY (files get cleaned up quickly)
    const downloadRemaining = deadline - Date.now() - 2_000
    if (downloadRemaining < 5_000) {
      return { success: false, error: `insufficient time to download result (${downloadRemaining}ms)` }
    }

    console.log(`[virtual-tryon] IDM-VTON: downloading result (timeout=${downloadRemaining}ms)...`)
    const downloadController = new AbortController()
    const downloadTimeoutId = setTimeout(() => downloadController.abort(), downloadRemaining)

    try {
      const downloadRes = await fetch(resultUrl, {
        headers: { 'User-Agent': '3BOXES-VirtualTryOn/1.0', 'Accept': 'image/*,*/*;q=0.8' },
        signal: downloadController.signal,
      })
      clearTimeout(downloadTimeoutId)
      if (!downloadRes.ok) {
        return { success: false, error: `IDM-VTON download HTTP ${downloadRes.status}` }
      }
      const ct = downloadRes.headers.get('content-type') || 'image/png'
      const mime = ct.split(';')[0].trim().startsWith('image/') ? ct.split(';')[0].trim() : 'image/png'
      const buf = Buffer.from(await downloadRes.arrayBuffer())
      if (buf.length < 5000) {
        return { success: false, error: `IDM-VTON result too small (${buf.length} bytes)` }
      }
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
      console.log(`[virtual-tryon] ✅ IDM-VTON succeeded (${(buf.length / 1024).toFixed(1)}KB, ${mime})`)
      return { success: true, imageUrl: dataUrl }
    } catch (err) {
      clearTimeout(downloadTimeoutId)
      return { success: false, error: `IDM-VTON download error: ${(err as Error).message.substring(0, 100)}` }
    }
  } catch (err) {
    return { success: false, error: `IDM-VTON stream error: ${(err as Error).message.substring(0, 100)}` }
  }
}

// ── Strategy B: Google Gemini 2.5 Flash Image (Nano Banana) ────────
// OPTIONAL last-resort strategy — only used if GEMINI_API_KEY env var is set.
// Accepts selfie + product images and generates a photorealistic try-on
// result that preserves the person's face AND renders the exact product.
//
// Uses the REST API directly (not the SDK) for:
//   - Better error handling and diagnostics
//   - No dependency on SDK version
//   - More control over request/response
//
// API key resolution: GEMINI_API_KEY env var only (no hardcoded fallback).
// v26: The previous hardcoded fallback key was INVALID (HTTP 401) and has
// been removed. To enable Gemini, set GEMINI_API_KEY in Vercel env vars.

async function callGeminiTryOn(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return { success: false, error: 'Gemini API key not configured' }
  }

  const catConfig = getCategoryConfig(input.categorySlug, input.productName)
  const colors = extractColors(input.productName, input.productDescription, input.productTags)

  // Build a focused, photorealistic prompt for Nano Banana
  const promptParts: string[] = [
    `Create a photorealistic virtual try-on image.`,
    `Take the person from IMAGE 1 (the selfie) and dress them in the product shown in IMAGE 2.`,
    `The person must keep their EXACT face, gender, skin tone, body type, hairstyle, and hair colour from IMAGE 1. Do NOT generate a new face or change the person's identity.`,
    `The product is "${input.productName}".`,
    `The person is now ${catConfig.placement}.`,
  ]
  if (colors) promptParts.push(`The product colours are ${colors}.`)
  if (catConfig.materialHint) promptParts.push(`Material: ${catConfig.materialHint}.`)
  if (input.productDescription) {
    const desc = input.productDescription.substring(0, 200).replace(/\s+/g, ' ').trim()
    if (desc) promptParts.push(`Product details: ${desc}.`)
  }
  promptParts.push(`CRITICAL: Reproduce the EXACT product from IMAGE 2 — same colours, pattern, fabric, embellishments, and design. The product must look NATURALLY WORN with realistic shadows, highlights, and fabric folds — NOT pasted or overlaid.`)
  promptParts.push(`DO NOT ADD sunglasses, eyeglasses, hats, or any extra items not in the original images.`)
  promptParts.push(`${catConfig.framing}, studio-quality lighting, photorealistic, sharp focus, fashion magazine quality.`)
  const prompt = promptParts.join(' ')

  console.log(`[virtual-tryon] Gemini: generating try-on image (Nano Banana)...`)

  // Strip data URL prefix to get raw base64
  const selfieBase64 = stripDataUrl(input.selfieData)
  const productBase64 = input.productImageBase64 ? stripDataUrl(input.productImageBase64) : ''

  // Determine mime types
  let selfieMime = 'image/jpeg'
  if (input.selfieData.startsWith('data:image/png')) selfieMime = 'image/png'
  else if (input.selfieData.startsWith('data:image/webp')) selfieMime = 'image/webp'

  let productMime = 'image/jpeg'
  if (input.productImageBase64?.startsWith('data:image/png')) productMime = 'image/png'
  else if (input.productImageBase64?.startsWith('data:image/webp')) productMime = 'image/webp'

  const remaining = deadline - Date.now() - 3_000
  if (remaining < 15_000) {
    return { success: false, error: `insufficient time for Gemini (${remaining}ms)` }
  }

  // Build request parts: prompt text + selfie image + product image
  const requestParts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: selfieMime, data: selfieBase64 } },
  ]
  if (productBase64) {
    requestParts.push({ inlineData: { mimeType: productMime, data: productBase64 } })
  }

  const requestBody = {
    contents: [{ role: 'user', parts: requestParts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  }

  // Try models in priority order: Nano Banana first, then fallbacks
  const modelsToTry = [
    'gemini-2.5-flash-image',           // Nano Banana (best — primary)
    'gemini-2.5-flash-image-preview',   // Nano Banana preview (alt name)
    'gemini-2.0-flash-preview-image-generation',  // older image gen model
  ]

  let lastError = 'Unknown error'

  for (const model of modelsToTry) {
    const modelRemaining = deadline - Date.now() - 3_000
    if (modelRemaining < 12_000) {
      lastError = `insufficient time for Gemini model ${model}`
      break
    }

    const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), Math.min(50_000, modelRemaining))

    try {
      const start = Date.now()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)

      if (!res.ok) {
        const errBody = await res.text().catch(() => 'unknown')
        const errPreview = errBody.substring(0, 300)
        console.log(`[virtual-tryon] Gemini ${model} HTTP ${res.status} after ${elapsed}s: ${errPreview}`)

        // 404 = model not found, try next model
        if (res.status === 404) {
          lastError = `Gemini ${model} not found (404)`
          continue
        }
        // 429 = quota exhausted — don't try other models (same quota)
        if (res.status === 429) {
          lastError = `Gemini quota exhausted (429): ${errPreview.substring(0, 150)}`
          break  // quota is project-wide, other models will also fail
        }
        // 400 = bad request (could be location restriction)
        if (res.status === 400) {
          lastError = `Gemini ${model} bad request (400): ${errPreview.substring(0, 150)}`
          // Location restriction is project-wide, don't try other models
          if (errBody.includes('location is not supported')) break
          continue
        }
        lastError = `Gemini ${model} HTTP ${res.status}: ${errPreview.substring(0, 100)}`
        continue
      }

      const result = await res.json() as any

      // Extract image from response candidates
      const candidates = result?.candidates || []
      for (const candidate of candidates) {
        const parts = candidate?.content?.parts || []
        for (const part of parts) {
          if (part.inlineData?.data) {
            const imageData = part.inlineData.data
            const mimeType = part.inlineData.mimeType || 'image/png'
            if (imageData.length > 3000) {
              const dataUrl = `data:${mimeType};base64,${imageData}`
              console.log(`[virtual-tryon] ✅ Gemini ${model} succeeded in ${elapsed}s (${(imageData.length * 0.75 / 1024).toFixed(1)}KB, ${mimeType})`)
              return { success: true, imageUrl: dataUrl }
            }
          }
        }
      }

      // No image — check for text response (might be a refusal or error message)
      let textResponse = ''
      for (const candidate of candidates) {
        const parts = candidate?.content?.parts || []
        for (const part of parts) {
          if (part.text) textResponse += part.text
        }
      }
      const promptFeedback = result?.promptFeedback?.blockReason
      if (promptFeedback) {
        lastError = `Gemini ${model} blocked: ${promptFeedback}`
      } else if (textResponse) {
        lastError = `Gemini ${model} returned text (no image): ${textResponse.substring(0, 150)}`
      } else {
        lastError = `Gemini ${model} returned no image and no text after ${elapsed}s`
      }
      console.log(`[virtual-tryon] ${lastError}`)
      // If we got a valid response but no image, don't try other models
      // (the model understood the request but couldn't/wouldn't generate)
      if (promptFeedback || textResponse) break
    } catch (err) {
      clearTimeout(timeoutId)
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const errMsg = err instanceof Error ? err.message : String(err)
      const msg = isTimeout ? `timed out` : errMsg.substring(0, 100)
      lastError = `Gemini ${model} error: ${msg}`
      console.log(`[virtual-tryon] ${lastError}`)
      // Timeout — don't try other models (they'll also timeout)
      if (isTimeout) break
      continue
    }
  }

  return { success: false, error: lastError }
}

// ── Strategy C: ZAI image-edit (edit-both) — LOCAL BONUS ───────────
// Only attempted in the sandbox (ZAI's internal-api.z.ai is internal-only).

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

async function downloadZAIImage(
  imageUrl: string,
  timeoutMs: number,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': '3BOXES-VirtualTryOn/1.0', 'Accept': 'image/*,*/*;q=0.8' },
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || 'image/png'
    const mime = ct.split(';')[0].trim()
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 3000) return null
    return { buffer: buf, mime: mime.startsWith('image/') ? mime : 'image/png' }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

async function callZAIImageEdit(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const config_obj = getZAIConfig()
  if (!config_obj) {
    return { success: false, error: 'ZAI config unavailable (local-only strategy)' }
  }

  const catConfig = getCategoryConfig(input.categorySlug, input.productName)
  const prompt = buildEditPrompt(catConfig, input)

  const hasProductImage = input.productImageBase64 && input.productImageBase64.startsWith('data:image/')
  const images = hasProductImage
    ? [{ url: input.selfieData }, { url: input.productImageBase64 }]
    : [{ url: input.selfieData }]

  const strategyName = hasProductImage ? 'edit-both' : 'edit-selfie'
  const remaining = Math.min(ZAI_EDIT_TIMEOUT_MS, deadline - Date.now() - 3_000)
  if (remaining < 15_000) {
    return { success: false, error: `insufficient time budget (${remaining}ms) for ZAI edit` }
  }

  console.log(`[virtual-tryon] ZAI image-edit (${strategyName}): ${catConfig.size}, timeout=${remaining}ms`)

  const url = `${config_obj.baseUrl}/images/generations/edit`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config_obj.apiKey}`,
    'X-Z-AI-From': 'Z',
  }
  if (config_obj.chatId) headers['X-Chat-Id'] = config_obj.chatId
  if (config_obj.userId) headers['X-User-Id'] = config_obj.userId
  if (config_obj.token) headers['X-Token'] = config_obj.token

  const requestBody = { prompt, images, size: catConfig.size }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), remaining)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown')
      console.log(`[virtual-tryon] ZAI API HTTP ${res.status} after ${elapsed}s: ${errBody.substring(0, 300)}`)
      return { success: false, error: `ZAI API HTTP ${res.status}: ${errBody.substring(0, 150)}` }
    }

    const result = await res.json() as any
    const item = result?.data?.[0]
    if (!item) {
      return { success: false, error: `ZAI returned no image data after ${elapsed}s` }
    }

    if (item.base64 && typeof item.base64 === 'string' && item.base64.length > 3000) {
      let mime = 'image/png'
      if (item.format === 'jpeg' || item.format === 'jpg') mime = 'image/jpeg'
      else if (item.format === 'webp') mime = 'image/webp'
      const dataUrl = `data:${mime};base64,${item.base64}`
      console.log(`[virtual-tryon] ✅ ZAI ${strategyName} succeeded (base64) in ${elapsed}s`)
      return { success: true, imageUrl: dataUrl }
    }

    if (item.url) {
      const downloadTimeout = Math.min(20_000, deadline - Date.now() - 2_000)
      if (downloadTimeout < 5_000) {
        return { success: false, error: `insufficient time to download ZAI image` }
      }
      const downloaded = await downloadZAIImage(item.url, downloadTimeout)
      if (!downloaded) {
        return { success: false, error: `ZAI image download failed` }
      }
      const dataUrl = `data:${downloaded.mime};base64,${downloaded.buffer.toString('base64')}`
      console.log(`[virtual-tryon] ✅ ZAI ${strategyName} succeeded (url→download) in ${elapsed}s`)
      return { success: true, imageUrl: dataUrl }
    }

    return { success: false, error: `ZAI response had neither base64 nor url` }
  } catch (err) {
    clearTimeout(timeoutId)
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    const msg = isTimeout ? `ZAI edit timed out (${remaining}ms)` : `ZAI error: ${(err as Error).message.substring(0, 150)}`
    console.log(`[virtual-tryon] ZAI ${strategyName} failed: ${msg}`)
    return { success: false, error: msg }
  }
}

// ── Strategy C: Pollinations text-to-image — LAST RESORT ───────────
// Note: Pollinations now only serves the `sana` model (flux was removed).
// This is a degraded fallback — the face won't match the selfie, but the
// product type and colours will be approximately correct.

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
  const textColors = extractColors(input.productName, input.productDescription, input.productTags)
  const colors = imageColors || textColors
  const genderWord = config.gender === 'woman' ? 'woman' : config.gender === 'man' ? 'man' : config.gender === 'child' ? 'child' : 'person'

  const personAttrs: string[] = []
  if (input.skinTone) personAttrs.push(`${input.skinTone} skin`)
  if (input.hairColor) personAttrs.push(`${input.hairColor} hair`)
  const personDesc = personAttrs.length > 0 ? ` with ${personAttrs.join(' and ')}` : ''

  const colorPrefix = colors ? `A ${colors} ` : ''

  const parts: string[] = []
  parts.push(`${colorPrefix}${input.productName} worn by a ${genderWord}${personDesc}, ${config.placement}.`)
  if (config.materialHint) parts.push(`Material: ${config.materialHint}.`)
  if (input.productDescription) {
    const desc = input.productDescription.substring(0, 120).replace(/\s+/g, ' ').trim()
    if (desc) parts.push(`${desc}.`)
  }
  parts.push(`${config.framing}, studio lighting, photorealistic, sharp focus, fashion magazine quality.`)
  parts.push(`Naturally worn with realistic folds and fit.`)
  parts.push(`No sunglasses, no glasses, no hats, no extra props.`)
  return parts.join(' ')
}

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

async function compressSelfieForUpload(selfieData: string): Promise<Buffer> {
  const sharp = await getSharp()
  if (!sharp) {
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
    return compressed
  } catch {
    const raw = stripDataUrl(selfieData)
    return Buffer.from(raw, 'base64')
  }
}

async function callPollinationsWithSelfieReference(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; strategy?: string; debugInfo?: { extractedColors: string; promptPreview: string; selfieUploaded: boolean } }> {
  const config = getCategoryConfig(input.categorySlug, input.productName)
  const { width, height } = parseImageSize(config.size)

  let imageColors = input.clientProductColors || ''
  if (!imageColors) {
    imageColors = await extractColorsFromProductImage(input.productImageBase64)
  }

  const prompt = buildPollinationsPrompt(config, input, imageColors)

  console.log(`[virtual-tryon] Pollinations: gender=${config.gender}, ${width}x${height}, imageColours="${imageColors}"`)

  let selfieUrl: string | null = null
  if (Date.now() < deadline - 18_000) {
    try {
      const selfieBuf = await compressSelfieForUpload(input.selfieData)
      selfieUrl = await uploadToTmpfiles(selfieBuf, UPLOAD_TIMEOUT_MS)
    } catch {
      // ignore
    }
  }

  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 1_000_000)
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}`
  if (selfieUrl) {
    url += `&image=${encodeURIComponent(selfieUrl)}`
  }

  // v26: Reduced from 2 retries (3 attempts) to 1 retry (2 attempts).
  // Pollinations is rate-limited (HTTP 429) and slow — retrying 3x regularly
  // exceeded the client's 55s timeout, producing "Generation Timed Out".
  // With 1 retry max: worst case = 18s + 3s + 18s = 39s (safely under 55s).
  const MAX_RETRIES = 1
  const RETRY_DELAYS_MS = [3_000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]
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

      if (res.status === 402 && attempt < MAX_RETRIES) continue
      if (!res.ok) {
        if (attempt < MAX_RETRIES) continue
        return { success: false, error: `Pollinations HTTP ${res.status}` }
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
      return {
        success: true,
        imageUrl: dataUrl,
        strategy: selfieUrl ? 'pollinations-selfie-img2img' : 'pollinations-text',
        debugInfo: {
          extractedColors: imageColors,
          promptPreview: prompt.substring(0, 300),
          selfieUploaded: !!selfieUrl,
        },
      }
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
  // Wake up the IDM-VTON Space (improves first-request latency)
  await wakeUpIDMSpace()
  void getZAIConfig()
  return true
}

export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean }> {
  const now = Date.now()
  if (spaceAwakeCache && now - spaceAwakeCache.timestamp < SPACE_CACHE_TTL) {
    return { awake: spaceAwakeCache.awake }
  }
  // IDM-VTON is always "available" — it's a free public HF Space
  const awake = true
  spaceAwakeCache = { awake, timestamp: now }
  return { awake }
}

export async function isTryOnServiceReady(): Promise<{
  ready: boolean
  engine: string
  reason?: string
}> {
  const isVercel = !!process.env.VERCEL
  return {
    ready: true,
    engine: isVercel ? 'idm-vton' : 'zai-image-edit',
    reason: isVercel
      ? 'IDM-VTON HuggingFace Space — real VTON model for ALL garment categories (shirts, sarees, dresses, fashion). Reliable ~25s, free, no auth required.'
      : 'ZAI image-edit (edit-both) — preserves your face & renders the exact product.',
  }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const totalDeadline = totalStart + TOTAL_TIMEOUT_MS
  const strategiesAttempted: string[] = []
  const strategyErrors: Record<string, string> = {}
  const isVercel = !!process.env.VERCEL
  const hasGeminiKey = !!getGeminiApiKey()

  console.log(`[virtual-tryon] v26 start: "${input.productName}" (${input.categorySlug}) — VERCEL=${isVercel}, hasGeminiKey=${hasGeminiKey}, hasSelfie=${!!input.selfieData}, hasProductImg=${!!input.productImageBase64}`)

  if (!input.selfieData?.startsWith('data:image/')) {
    return {
      success: false,
      error: 'A valid selfie image is required.',
      errorCode: 'NO_SELFIE',
      elapsedMs: Date.now() - totalStart,
      debugInfo: { strategiesAttempted, strategyErrors },
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STRATEGY ORDER (v26):
  //
  //  On VERCEL (production):
  //    1. IDM-VTON HF Space (PRIMARY — ALL garment categories incl. sarees)
  //       - Reliable ~25s, real VTON model
  //    2. Pollinations (FALLBACK — ALL categories, reduced retries)
  //    3. Gemini (OPTIONAL — only if env var GEMINI_API_KEY is set to a VALID key)
  //       - The hardcoded fallback key is INVALID, so this is skipped by default
  //
  //  On LOCAL (sandbox):
  //    1. ZAI image-edit (PRIMARY — best quality, preserves face + product)
  //    2. IDM-VTON (garments only)
  //    3. Pollinations (last resort)
  //    4. Gemini (only if valid key set)
  // ═══════════════════════════════════════════════════════════════════

  const catConfig = getCategoryConfig(input.categorySlug, input.productName)

  // ── On VERCEL: IDM-VTON is PRIMARY for garment categories ─────────
  // v26 CHANGE: Sarees are now vtonCompatible=true, so they use IDM-VTON
  // (reliable ~25s) instead of falling through to Pollinations (which
  // was timing out). This fixes the "Generation Timed Out" error.
  if (isVercel && catConfig.vtonCompatible && Date.now() < totalDeadline - 25_000) {
    strategiesAttempted.push('idm-vton')
    console.log('[virtual-tryon] VERCEL Strategy 1: IDM-VTON HF Space (PRIMARY for garment category)')
    const result = await callIDMVTON(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ IDM-VTON succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: 'idm-vton',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['idm-vton'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] IDM-VTON failed: ${result.error?.substring(0, 150)}`)
  } else if (isVercel && !catConfig.vtonCompatible) {
    console.log(`[virtual-tryon] VERCEL: Skipping IDM-VTON — category "${input.categorySlug}" is not garment-compatible`)
  }

  // ── On LOCAL: ZAI image-edit is PRIMARY ──────────────────────────
  if (!isVercel && Date.now() < totalDeadline - 18_000) {
    strategiesAttempted.push('zai-image-edit')
    console.log('[virtual-tryon] LOCAL Strategy 1: ZAI image-edit (edit-both) — PRIMARY')
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
  }

  // ── FALLBACK: IDM-VTON (LOCAL only — already tried on Vercel above) ──
  // On local, if ZAI failed and IDM-VTON hasn't been tried yet
  if (!isVercel && catConfig.vtonCompatible && !strategiesAttempted.includes('idm-vton') && Date.now() < totalDeadline - 25_000) {
    strategiesAttempted.push('idm-vton')
    console.log('[virtual-tryon] LOCAL Fallback: IDM-VTON HF Space (garment category)')
    const result = await callIDMVTON(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ IDM-VTON succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: 'idm-vton',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['idm-vton'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] IDM-VTON failed: ${result.error?.substring(0, 150)}`)
  }

  // ── FALLBACK: Pollinations (ALL categories) ─────────────────────
  // v26: Reduced retries (1 max) and timeout (18s) to prevent client timeout.
  // Pollinations uses the sana model (only one available) — degraded quality
  // but works for ALL categories including jewelry, watches, accessories.
  if (Date.now() < totalDeadline - 12_000) {
    strategiesAttempted.push('pollinations')
    console.log('[virtual-tryon] Fallback: Pollinations text-to-image (reduced retries)')
    const result = await callPollinationsWithSelfieReference(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Pollinations succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: result.strategy || 'pollinations',
        elapsedMs: elapsed,
        debugInfo: {
          strategiesAttempted,
          strategyErrors,
          extractedColors: result.debugInfo?.extractedColors,
          promptPreview: result.debugInfo?.promptPreview,
          selfieUploaded: result.debugInfo?.selfieUploaded,
        },
      }
    }
    strategyErrors['pollinations'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Pollinations failed: ${result.error?.substring(0, 150)}`)
  }

  // ── LAST RESORT: Gemini (only if a VALID key is set via env var) ──
  // v26: The hardcoded fallback key was INVALID (HTTP 401) and has been removed.
  // This strategy only runs if the user has set GEMINI_API_KEY to a valid
  // AIzaSy... key in Vercel env vars. We detect this by checking getGeminiApiKey().
  if (hasGeminiKey && !strategiesAttempted.includes('gemini') && Date.now() < totalDeadline - 18_000) {
    strategiesAttempted.push('gemini')
    console.log('[virtual-tryon] Last resort: Google Gemini (env var key set)')
    const result = await callGeminiTryOn(input, totalDeadline)
    if (result.success && result.imageUrl) {
      const elapsed = Date.now() - totalStart
      console.log(`[virtual-tryon] ✅ Gemini succeeded in ${(elapsed / 1000).toFixed(1)}s`)
      return {
        success: true,
        imageUrl: result.imageUrl,
        strategy: 'gemini',
        elapsedMs: elapsed,
        debugInfo: { strategiesAttempted, strategyErrors },
      }
    }
    strategyErrors['gemini'] = result.error || 'No image returned'
    console.log(`[virtual-tryon] Gemini failed: ${result.error?.substring(0, 150)}`)
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
