/**
 * FLUX.1-Kontext-dev Virtual Try-On via HuggingFace Space — FREE FOREVER, SOTA identity preservation
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY FLUX KONTEXT?
 *  ─────────────────────────────────────────────────────────────────────────
 *  - SOTA model for image EDITING with IDENTITY PRESERVATION (RefTon CVPR 2026
 *    uses it as backbone — confirmed best for virtual try-on)
 *  - FREE on HuggingFace Space (ZeroGPU) — just needs HF_TOKEN (free signup)
 *  - Takes input image + edit prompt → returns edited image
 *  - Works for ALL categories (text-driven, no training bias)
 *  - Latency: 10-30s (under Vercel's 60s timeout)
 *
 *  SETUP (one-time, free):
 *    1. Sign up at https://huggingface.co/join
 *    2. Create a free access token at https://huggingface.co/settings/tokens
 *       (Token type: Read — sufficient for calling Spaces)
 *    3. Set HF_TOKEN env var on Vercel
 *    4. Redeploy
 *
 *  HF Space: https://black-forest-labs-flux-1-kontext-dev.hf.space
 *  Gradio API spec:
 *    Inputs: input_image (ImageData), prompt (string), seed, randomize_seed,
 *            guidance_scale (1-10), steps (1-30)
 *    Output: edited image (ImageData) + seed
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { TryOnInput } from '@/lib/virtual-tryon'

const FLUX_KONTEXT_SPACE = 'https://black-forest-labs-flux-1-kontext-dev.hf.space'
const FLUX_KONTEXT_ENDPOINT = `${FLUX_KONTEXT_SPACE}/gradio_api/call/infer`

function getHFToken(): string | null {
  return process.env.HF_TOKEN || null
}

export function isFluxKontextReady(): boolean {
  return getHFToken() !== null
}

function stripDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}

// ── Precise dominant-color extraction (jimp — pure JS, works on Vercel) ──
// FLUX Kontext only receives the SELFIE (it cannot see the product image),
// so to reproduce the saree's EXACT colour we extract the dominant fabric
// colour from the product image as RGB + hex + a vivid name, then inject it
// emphatically into the edit prompt. This is what makes the generated saree
// match the product's real colour.

function rgbToColorName(r: number, g: number, b: number): string {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
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
  const depth = v < 0.3 ? 'dark ' : v > 0.65 ? 'bright ' : ''
  const rich = v < 0.45 ? 'deep ' : ''
  if (h < 15 || h >= 345) return `${rich}${depth}red`
  if (h < 30) return v < 0.4 ? 'maroon' : `${depth}red`
  if (h < 45) return v < 0.4 ? 'burgundy' : 'orange-red'
  if (h < 60) return `${depth}orange`
  if (h < 70) return 'mustard yellow'
  if (h < 85) return `${depth}yellow`
  if (h < 100) return v > 0.6 ? 'lime' : 'olive'
  if (h < 150) return `${depth}green`
  if (h < 175) return 'emerald green'
  if (h < 195) return 'teal'
  if (h < 215) return 'turquoise'
  if (h < 240) return `${depth}blue`
  if (h < 260) return 'navy blue'
  if (h < 285) return 'violet'
  if (h < 310) return v > 0.6 ? 'pink' : 'purple'
  if (h < 335) return v > 0.7 ? 'rose pink' : 'magenta'
  return `${rich}${depth}red`
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

interface PreciseColor {
  name: string
  hex: string
  rgb: [number, number, number]
  secondaryName?: string
}

async function extractDominantColor(imageBase64: string): Promise<PreciseColor | null> {
  if (!imageBase64?.startsWith('data:image/')) return null
  try {
    const raw = imageBase64.includes(',') ? imageBase64.split(',').slice(1).join(',') : imageBase64
    const buf = Buffer.from(raw, 'base64')
    const JimpModule = await import('jimp')
    const Jimp = (JimpModule as any).Jimp || (JimpModule as any).default || JimpModule
    const image = await Jimp.read(buf)
    image.resize({ w: 48, h: 48 })
    const data = image.bitmap.data as Buffer

    const buckets = new Map<string, { count: number; satSum: number; r: number; g: number; b: number }>()
    for (let i = 0; i < 48 * 48; i++) {
      const offset = i * 4
      const r = data[offset], g = data[offset + 1], b = data[offset + 2]
      if (data[offset + 3] < 128) continue
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const delta = max - min
      const sat = max === 0 ? 0 : delta / max
      // Skip near-white (background) and near-black
      if (max > 235 && delta < 15) continue
      if (max < 25) continue
      if (sat < 0.18) continue
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`
      const existing = buckets.get(key)
      if (existing) {
        existing.count++
        existing.satSum += sat
        existing.r += r; existing.g += g; existing.b += b
      } else {
        buckets.set(key, { count: 1, satSum: sat, r, g, b })
      }
    }

    if (buckets.size === 0) {
      // Fallback: include low-saturation pixels (gold/silver metals)
      for (let i = 0; i < 48 * 48; i++) {
        const offset = i * 4
        const r = data[offset], g = data[offset + 1], b = data[offset + 2]
        if (data[offset + 3] < 128) continue
        const max = Math.max(r, g, b)
        if (max > 235 && max - Math.min(r, g, b) < 15) continue
        if (max < 25) continue
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`
        const existing = buckets.get(key)
        if (existing) { existing.count++; existing.r += r; existing.g += g; existing.b += b }
        else buckets.set(key, { count: 1, satSum: 0.3, r, g, b })
      }
      if (buckets.size === 0) return null
    }

    const sorted = Array.from(buckets.values()).sort((a, b) =>
      (b.count * (b.satSum / b.count)) - (a.count * (a.satSum / a.count))
    )
    const top1 = sorted[0]
    const r1 = Math.round(top1.r / top1.count)
    const g1 = Math.round(top1.g / top1.count)
    const b1 = Math.round(top1.b / top1.count)
    const name1 = rgbToColorName(r1, g1, b1)
    const hex1 = `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`

    let secondaryName: string | undefined
    if (sorted.length > 1) {
      const top2 = sorted[1]
      const r2 = Math.round(top2.r / top2.count)
      const g2 = Math.round(top2.g / top2.count)
      const b2 = Math.round(top2.b / top2.count)
      const name2 = rgbToColorName(r2, g2, b2)
      const base1 = name1.replace(/^(deep |dark |bright )/, '').trim()
      const base2 = name2.replace(/^(deep |dark |bright )/, '').trim()
      if (base1 !== base2) secondaryName = name2
    }

    console.log(`[flux-kontext] Extracted product colour: ${name1} ${hex1} rgb(${r1},${g1},${b1})${secondaryName ? ` + ${secondaryName}` : ''}`)
    return { name: name1, hex: hex1, rgb: [r1, g1, b1], secondaryName }
  } catch (err) {
    console.log(`[flux-kontext] Colour extraction failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

// ── v39: Saree Colour Transfer ──────────────────────────────────────
// FLUX Kontext generates a good drape but rarely matches the product's
// exact colour (it can't see the product image). This function post-
// processes the FLUX output: for each pixel in the lower body region
// (below the face), if it's fabric (not skin, not background), it
// recolours it to match the product's dominant hue+saturation while
// preserving the original luminance (drape/shadow detail).

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
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
  return [h, s, v]
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function isSkinToneFast(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return r > g && g > b * 0.85 && r - g >= 8 && max > 55 && max < 252 &&
    (max - min) / max > 0.06 && (max - min) / max < 0.7 && b > 0 && r / b > 1.05 && r / b < 2.8
}

async function applySareeColorTransfer(
  fluxOutputDataUrl: string,
  productColor: PreciseColor,
  hardDeadline: number,
): Promise<string | null> {
  try {
    // v39.1: Time-bounded — if less than 6s remains before the hard deadline,
    // skip colour transfer entirely and let the caller return the original
    // FLUX output. This prevents Vercel 60s timeouts (500 errors).
    const remaining = hardDeadline - Date.now()
    if (remaining < 6000) {
      console.log(`[flux-kontext] v39.1: Skipping colour transfer (only ${remaining}ms left)`)
      return null
    }

    const sharpMod = await import('sharp')
    const sharp = (sharpMod as any).default || sharpMod
    const raw = fluxOutputDataUrl.includes(',') ? fluxOutputDataUrl.split(',').slice(1).join(',') : fluxOutputDataUrl
    const buf = Buffer.from(raw, 'base64')

    // v39.1: Process at LOW resolution (max 384px wide) for speed.
    // 384x512 = 197K pixels (4x fewer than 768x1024). Processing takes ~2-3s
    // instead of 15-30s. The preview quality is perfectly acceptable for a
    // try-on style preview.
    const meta = await sharp(buf).metadata()
    const origW = meta.width || 768
    const origH = meta.height || 1024
    const procW = Math.min(origW, 384)
    const procH = Math.round((procW / origW) * origH)

    const { data, info } = await sharp(buf)
      .resize(procW, procH, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const w = info.width
    const h = info.height
    const [ph, ps] = rgbToHsv(productColor.rgb[0], productColor.rgb[1], productColor.rgb[2])

    // v39.1: Optimized single-pass loop — compute HSV once per pixel,
    // reuse for skin/fabric classification and recolouring.
    let recoloredCount = 0
    const faceCutoffY = Math.floor(h * 0.22)
    for (let y = faceCutoffY; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const a = data[idx + 3]
        if (a < 100) continue
        const r = data[idx], g = data[idx + 1], b = data[idx + 2]
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        // Skip near-white (background) and near-black (very dark shadows)
        if (lum > 235 || lum < 18) continue
        const sat = max === 0 ? 0 : (max - min) / max
        // Skip very low-saturation pixels (grey/neutral — likely background)
        if (sat < 0.08) continue
        // Skip skin-toned pixels (preserve arms, hands, chest skin)
        if (r > g && g > b * 0.85 && r - g >= 8 && max > 55 && max < 252 && sat > 0.06 && sat < 0.7 && b > 0 && r / b > 1.05 && r / b < 2.8) continue

        // This pixel is likely fabric — recolour it to match product colour.
        // Preserve original value (luminance/shadows), apply product hue+sat.
        const ov = max / 255
        const blendS = ps * 0.78 + sat * 0.22
        const c = ov * blendS
        const hh = ph / 60
        const xx = c * (1 - Math.abs((hh % 2) - 1))
        const m = ov - c
        let nr = 0, ng = 0, nb = 0
        if (hh < 1) { nr = c; ng = xx; nb = 0 }
        else if (hh < 2) { nr = xx; ng = c; nb = 0 }
        else if (hh < 3) { nr = 0; ng = c; nb = xx }
        else if (hh < 4) { nr = 0; ng = xx; nb = c }
        else if (hh < 5) { nr = xx; ng = 0; nb = c }
        else { nr = c; ng = 0; nb = xx }
        data[idx] = Math.round((nr + m) * 255)
        data[idx + 1] = Math.round((ng + m) * 255)
        data[idx + 2] = Math.round((nb + m) * 255)
        recoloredCount++
      }
    }

    console.log(`[flux-kontext] v39.1 colour transfer: recoloured ${recoloredCount} fabric pixels to ${productColor.name} ${productColor.hex} (${w}x${h}, ${Date.now() - (hardDeadline - remaining)}ms start)`)

    const resultBuf = await sharp(data, {
      raw: { width: w, height: h, channels: 4 },
    })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer()

    return `data:image/jpeg;base64,${resultBuf.toString('base64')}`
  } catch (err) {
    console.log(`[flux-kontext] v39.1 colour transfer failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function buildEditPrompt(input: TryOnInput): Promise<string> {
  const name = input.productName || 'the product'
  const colors = input.clientProductColors || ''
  const slug = (input.categorySlug || '').toLowerCase()
  const n = name.toLowerCase()
  const desc = (input.productDescription || '').toLowerCase()

  const identityRule =
    'IMPORTANT: Keep the EXACT same person, face, hair, and identity as in the input image. ' +
    'Do not generate a new person. Only change the clothing/accessory. '

  if (
    slug.includes('saree') || n.includes('saree') || n.includes('sari') ||
    desc.includes('saree') || desc.includes('sari') ||
    n.includes('banarasi') || n.includes('kanjivaram') || n.includes('lehenga')
  ) {
    // v33: Extract the EXACT dominant colour from the product image (hex + RGB
    // + vivid name) and inject it emphatically. FLUX cannot see the product,
    // so the only way to reproduce the saree's real colour is an explicit,
    // precise colour directive in the prompt.
    const precise = await extractDominantColor(input.productImageBase64)
    const colorClause = precise
      ? `CRITICAL COLOUR REQUIREMENT — match exactly: the saree fabric, pallu, and blouse MUST be ${precise.name} (RGB ${precise.rgb.join(',')}, hex ${precise.hex})${precise.secondaryName ? ` with ${precise.secondaryName} accents` : ''}. Use this EXACT colour across the entire garment. Do NOT use any other colour.`
      : (colors ? `The saree colour must be ${colors}.` : '')
    const descHint = input.productDescription
      ? ` ${input.productDescription.substring(0, 160).replace(/\s+/g, ' ').trim()}.`
      : ''
    return (
      `${identityRule} ` +
      `Drape this person in a beautiful ${name}.${descHint} ` +
      `${colorClause} ` +
      `The saree is worn in traditional Indian style with the pallu flowing over the left shoulder, ` +
      `matching blouse, neatly pleated at the waist, natural fabric drape and sheen. ` +
      `Full-body fashion photograph from head to toe, studio lighting, photorealistic, accurate garment colour.`
    )
  }

  if (
    slug.includes('jewel') ||
    n.includes('necklace') || n.includes('earring') || n.includes('bracelet') ||
    n.includes('ring') || n.includes('pendant') || n.includes('jhumka')
  ) {
    let placement = 'wearing this jewelry piece elegantly, clearly visible'
    if (n.includes('earring') || n.includes('jhumka')) placement = 'wearing these earrings on both earlobes'
    else if (n.includes('necklace') || n.includes('pendant') || n.includes('choker')) placement = 'wearing this necklace around the neck at the collarbone'
    else if (n.includes('bracelet') || n.includes('bangle')) placement = 'wearing this bracelet on the wrist'
    else if (n.includes('ring')) placement = 'wearing this ring on the finger'
    return `${identityRule} Show this person ${placement}. Photorealistic, upper-body view.`
  }

  if (slug.includes('watch') || n.includes('watch')) {
    // v39: Extract dominant colour and describe the watch in detail so FLUX
    // generates a close match (dial colour + strap type from product metadata).
    const precise = await extractDominantColor(input.productImageBase64)
    const desc2 = (input.productDescription || '').toLowerCase()
    let strapType = 'strap'
    if (desc2.includes('leather') || n.includes('leather')) strapType = 'leather strap'
    else if (desc2.includes('steel') || desc2.includes('metal') || desc2.includes('bracelet')) strapType = 'metal bracelet'
    else if (desc2.includes('rubber') || desc2.includes('silicone')) strapType = 'rubber strap'
    let dialDesc = 'classic'
    if (desc2.includes('chronograph')) dialDesc = 'chronograph'
    else if (desc2.includes('diver') || desc2.includes('dive')) dialDesc = 'diver'
    else if (desc2.includes('minimalist') || desc2.includes('minimal')) dialDesc = 'minimalist'
    const colorDesc = precise ? `${precise.name} (${precise.hex})` : (colors || 'silver')
    return `${identityRule} Show this person wearing a ${colorDesc} watch with a ${dialDesc} dial and ${strapType} on their left wrist. The watch face is clearly visible, properly sized to the wrist, natural angle. Photorealistic, studio lighting, accurate watch colour.`
  }

  if (slug.includes('fragrance') || n.includes('parfum') || n.includes('cologne')) {
    return `${identityRule} Show this person holding the ${name} bottle elegantly in one hand. Photorealistic.`
  }

  // Default — garments
  return (
    `${identityRule} ` +
    `Show this person wearing this ${colors ? colors + ' ' : ''}${name}, ` +
    `fitted naturally with proper fabric drape. Photorealistic, full-body view.`
  )
}

/**
 * Call FLUX.1-Kontext-dev via the HuggingFace Space Gradio API.
 * Uses the SSE v3 protocol (POST → event_id → GET SSE stream).
 */
export async function callFluxKontextTryOn(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; strategy?: string }> {
  const token = getHFToken()
  if (!token) {
    return { success: false, error: 'HF_TOKEN not set' }
  }
  if (!input.selfieData?.startsWith('data:image/')) {
    return { success: false, error: 'Selfie required for FLUX Kontext' }
  }
  if (!input.productImageBase64?.startsWith('data:image/')) {
    return { success: false, error: 'Product image required for FLUX Kontext' }
  }

  const timeRemaining = deadline - Date.now()
  if (timeRemaining < 20_000) {
    return { success: false, error: `Insufficient time (${timeRemaining}ms) for FLUX Kontext` }
  }

  const prompt = await buildEditPrompt(input)
  console.log(`[virtual-tryon] FLUX Kontext try-on: prompt="${prompt.substring(0, 120)}..."`)

  // Step 1: Upload selfie image to HF Space
  let selfiePath: string | null = null
  try {
    const selfieBuf = Buffer.from(stripDataUrl(input.selfieData), 'base64')
    const selfieForm = new FormData()
    selfieForm.append('files', new Blob([selfieBuf], { type: 'image/png' }), 'selfie.png')

    const uploadRes = await fetch(`${FLUX_KONTEXT_SPACE}/gradio_api/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: selfieForm,
      signal: AbortSignal.timeout(12_000),
    })
    if (!uploadRes.ok) {
      return { success: false, error: `FLUX upload HTTP ${uploadRes.status}` }
    }
    const uploadJson = await uploadRes.json()
    if (!Array.isArray(uploadJson) || uploadJson.length === 0) {
      return { success: false, error: 'FLUX upload returned no paths' }
    }
    selfiePath = uploadJson[0]
    console.log(`[virtual-tryon] FLUX selfie uploaded: ${selfiePath}`)
  } catch (err) {
    return { success: false, error: `FLUX upload error: ${(err as Error).message.substring(0, 100)}` }
  }

  // Step 2: POST /call/infer with event payload
  let eventId: string | null = null
  try {
    const callRes = await fetch(FLUX_KONTEXT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: [
          { path: selfiePath, url: `${FLUX_KONTEXT_SPACE}/gradio_api/file=${selfiePath}`, orig_name: 'selfie.png' },
          prompt,
          42,             // seed
          true,           // randomize_seed
          2.5,            // guidance_scale (1-10, FLUX Kontext prefers low)
          20,             // steps (1-30)
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!callRes.ok) {
      const errText = await callRes.text().catch(() => '')
      return { success: false, error: `FLUX call HTTP ${callRes.status}: ${errText.substring(0, 100)}` }
    }
    const callJson = await callRes.json()
    eventId = callJson.event_id
    if (!eventId) {
      return { success: false, error: 'FLUX returned no event_id' }
    }
    console.log(`[virtual-tryon] FLUX event_id: ${eventId}`)
  } catch (err) {
    return { success: false, error: `FLUX call error: ${(err as Error).message.substring(0, 100)}` }
  }

  // Step 3: GET /call/infer/{event_id} (SSE stream)
  const remainingAfterCall = deadline - Date.now()
  const sseTimeout = Math.min(remainingAfterCall - 3_000, 35_000)
  try {
    const sseRes = await fetch(`${FLUX_KONTEXT_ENDPOINT}/${eventId}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'text/event-stream' },
      signal: AbortSignal.timeout(sseTimeout),
    })
    if (!sseRes.ok || !sseRes.body) {
      return { success: false, error: `FLUX SSE HTTP ${sseRes.status}` }
    }

    // Parse SSE stream
    const reader = sseRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const startTime = Date.now()

    while (true) {
      if (Date.now() - startTime > sseTimeout) {
        return { success: false, error: 'FLUX SSE timeout' }
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events separated by blank lines
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const evt of events) {
        const lines = evt.split('\n')
        let eventType = ''
        let dataStr = ''
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim()
          else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
        }
        if (eventType === 'complete' && dataStr) {
          try {
            const data = JSON.parse(dataStr)
            // FLUX Kontext returns [{path, url, ...}, seed]
            if (Array.isArray(data) && data.length > 0) {
              const imgMeta = data[0]
              const imgUrl = imgMeta.url || (imgMeta.path ? `${FLUX_KONTEXT_SPACE}/gradio_api/file=${imgMeta.path}` : null)
              if (!imgUrl) {
                return { success: false, error: 'FLUX returned no image URL' }
              }
              // Download the image
              const dlRes = await fetch(imgUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: AbortSignal.timeout(10_000),
              })
              if (!dlRes.ok) {
                return { success: false, error: `FLUX download HTTP ${dlRes.status}` }
              }
              const buf = Buffer.from(await dlRes.arrayBuffer())
              if (buf.length < 3000) {
                return { success: false, error: `FLUX returned tiny image (${buf.length} bytes)` }
              }
              const mime = dlRes.headers.get('content-type')?.split(';')[0] || 'image/png'
              const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
              console.log(`[virtual-tryon] ✅ FLUX Kontext succeeded (${(buf.length / 1024).toFixed(1)}KB)`)

              // v39: For sarees, apply post-FLUX colour transfer so the saree
              // matches the product's actual colour (FLUX can't see the product
              // image, so it rarely reproduces the exact colour from the prompt).
              // v39.1: Hard deadline = aiDeadline + 15s (up to 55s from start,
              // leaving 5s buffer under Vercel's 60s limit).
              const isSareeRequest = (() => {
                const s = (input.categorySlug || '').toLowerCase()
                const nn = (input.productName || '').toLowerCase()
                const dd = (input.productDescription || '').toLowerCase()
                return s.includes('saree') || nn.includes('saree') || nn.includes('sari') ||
                  dd.includes('saree') || dd.includes('sari') ||
                  nn.includes('banarasi') || nn.includes('kanjivaram') || nn.includes('lehenga')
              })()
              if (isSareeRequest && input.productImageBase64) {
                console.log('[virtual-tryon] v39.1: Saree detected — applying colour transfer')
                const precise = await extractDominantColor(input.productImageBase64)
                if (precise) {
                  const colorTransferDeadline = deadline + 15000
                  const transferred = await applySareeColorTransfer(dataUrl, precise, colorTransferDeadline)
                  if (transferred) {
                    return { success: true, imageUrl: transferred, strategy: 'flux-kontext-color-transfer' }
                  }
                  console.log('[virtual-tryon] v39.1: Colour transfer skipped/failed — returning original FLUX output')
                }
              }

              return { success: true, imageUrl: dataUrl, strategy: 'flux-kontext' }
            }
          } catch (parseErr) {
            console.log(`[virtual-tryon] FLUX SSE parse error: ${parseErr}`)
          }
        }
        if (eventType === 'error') {
          return { success: false, error: `FLUX error event: ${dataStr.substring(0, 200)}` }
        }
      }
    }
    return { success: false, error: 'FLUX SSE ended without complete event' }
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError'
    return { success: false, error: isTimeout ? 'FLUX SSE timeout' : `FLUX SSE error: ${(err as Error).message.substring(0, 100)}` }
  }
}
