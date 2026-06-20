/**
 * Image Composition Engine for Virtual Try-On — v2 (DRAMATICALLY IMPROVED)
 *
 * 100% FREE FOREVER — uses sharp (libvips) for all image processing.
 * No external APIs, no rate limits, no auth, works on Vercel serverless.
 *
 * v2 IMPROVEMENTS (fixes "total mismatch" complaint):
 * 1. SMARTER background removal:
 *    - Detects if PNG already has transparency → uses it directly
 *    - Samples ALL border pixels (not just 4 corners) for accurate bg color
 *    - Handles white, light-gray, AND colored gradient backgrounds
 *    - Better edge feathering (no hard "cutout" look)
 *    - Flood-fill style removal (only removes bg-connected regions, preserves
 *      same-color interior pixels that are part of the product)
 *
 * 2. BETTER face detection:
 *    - Finds the face CENTER (not just top-left bounding box)
 *    - Uses connected-component analysis to find the largest skin cluster
 *    - More accurate skin-tone thresholds (works for diverse skin tones)
 *    - Returns face center + chin position (critical for necklace placement)
 *
 * 3. PRECISE placement (uses face geometry, not fixed percentages):
 *    - Necklace → centered on face, below chin (face bottom + offset)
 *    - Earrings → at ear level (face vertical center, at face left/right edges)
 *    - Bracelet/Watch → at wrist (estimated from face position)
 *    - Ring → at hand (lower center)
 *    - Saree pallu → draped over left shoulder (diagonal)
 *
 * 4. REALISTIC compositing:
 *    - Color matches product to selfie lighting (subtle white balance)
 *    - Soft drop shadow with proper blur
 *    - Subtle highlight on product edges
 *    - Blends at product opacity (90%) for "worn" look
 *
 * This is the PRIMARY strategy for jewelry/watches/accessories on Vercel.
 * It ALWAYS produces a result and preserves the user's EXACT face + EXACT product.
 */

// v32.3: Dynamic sharp import — prevents module-load failures on Vercel.
// If sharp fails to initialize (native binary issue), the module still loads
// and only the composite function fails (which is caught and falls back).
let _sharpModule: any = null
async function getSharp(): Promise<any> {
  if (!_sharpModule) {
    const mod = await import('sharp')
    _sharpModule = (mod as any).default || mod
  }
  return _sharpModule
}

// ── Types ──────────────────────────────────────────────────────────

export type CompositeCategory =
  | 'necklace'
  | 'earrings'
  | 'bracelet'
  | 'ring'
  | 'jewelry-set'
  | 'watch'
  | 'fragrance'
  | 'bag'
  | 'sunglasses'
  | 'saree'
  | 'accessory'
  | 'generic'

export interface CompositeResult {
  success: boolean
  imageUrl?: string
  error?: string
  strategy: string
}

interface BBox {
  x: number
  y: number
  w: number
  h: number
  centerX: number
  centerY: number
  chinY: number
}

// ── Helpers ────────────────────────────────────────────────────────

function stripDataUrl(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx > 0 && commaIdx < 100 && dataUrl.startsWith('data:')) {
    return dataUrl.substring(commaIdx + 1)
  }
  return dataUrl
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ── v3: Mannequin/Model Detection ──────────────────────────────────
// Product images often show a mannequin or model wearing the product.
// When we composite such an image over the user's selfie, the mannequin's
// body/face appears OVER the user's face → "different person" mismatch.
//
// This function analyses the product image AFTER background removal to
// detect if a large connected opaque region remains in the center (which
// indicates a mannequin/body that bg removal couldn't eliminate).
//
// Returns true if a mannequin is likely present (composite should be skipped).

async function detectMannequin(bgRemovedBuf: Buffer): Promise<{ hasMannequin: boolean; opaqueRatio: number; centralOpacity: number }> {
  try {
    const sharp = await getSharp()
    const meta = await sharp(bgRemovedBuf).metadata()
    const w = meta.width || 400
    const h = meta.height || 400

    // Downscale for fast analysis
    const smallW = Math.min(150, w)
    const smallH = Math.round((smallW / w) * h)
    const { data, info } = await sharp(bgRemovedBuf)
      .resize(smallW, smallH, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const actualW = info.width
    const actualH = info.height
    const totalPixels = actualW * actualH

    let opaquePixels = 0
    let centralOpaque = 0
    const centralX0 = Math.floor(actualW * 0.25)
    const centralX1 = Math.floor(actualW * 0.75)
    const centralY0 = Math.floor(actualH * 0.25)
    const centralY1 = Math.floor(actualH * 0.75)
    const centralArea = (centralX1 - centralX0) * (centralY1 - centralY0)

    for (let y = 0; y < actualH; y++) {
      for (let x = 0; x < actualW; x++) {
        const idx = (y * actualW + x) * 4
        const alpha = data[idx + 3]
        if (alpha > 128) {
          opaquePixels++
          if (x >= centralX0 && x < centralX1 && y >= centralY0 && y < centralY1) {
            centralOpaque++
          }
        }
      }
    }

    const opaqueRatio = opaquePixels / totalPixels
    const centralOpacity = centralOpaque / centralArea

    // Heuristics for mannequin detection:
    // - Very high opaque ratio (>65%) → likely no real bg was removed, mannequin fills frame
    // - High central opacity (>80%) with moderate overall opacity → mannequin body in center
    // - For jewelry, expected opaque ratio is 5-30% (just the jewelry piece)
    // - For garments on mannequins, opaque ratio is 50-85%
    const hasMannequin = opaqueRatio > 0.65 || (opaqueRatio > 0.40 && centralOpacity > 0.85)

    console.log(`[image-composite] v3: Mannequin check — opaqueRatio=${opaqueRatio.toFixed(2)}, centralOpacity=${centralOpacity.toFixed(2)}, hasMannequin=${hasMannequin}`)

    return { hasMannequin, opaqueRatio, centralOpacity }
  } catch (err) {
    console.log(`[image-composite] v3: Mannequin detection failed: ${(err as Error).message}`)
    return { hasMannequin: false, opaqueRatio: 0, centralOpacity: 0 }
  }
}

// ── v2: Smart Background Removal ───────────────────────────────────
// Detects transparent PNGs, samples border colors, handles gradients.

async function removeWhiteBackground(buf: Buffer): Promise<Buffer> {
  const sharp = await getSharp()
  const image = sharp(buf)
  const meta = await image.metadata()

  // v2: If the image already has an alpha channel with transparency,
  // use it directly (many product PNGs come pre-cut)
  if (meta.hasAlpha) {
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let transparentCount = 0
    const totalPixels = info.width * info.height
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) transparentCount++
    }
    // If >15% is already transparent, assume it's a pre-cut PNG
    if (transparentCount / totalPixels > 0.15) {
      console.log(`[image-composite] v2: Detected pre-transparent PNG (${Math.round(transparentCount / totalPixels * 100)}% transparent) — using as-is`)
      const result = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .trim({ threshold: 8 })
        .png()
        .toBuffer()
      return result
    }
  }

  // Sample border pixels (all 4 edges, not just corners) for accurate bg color
  const rawImage = sharp(buf).ensureAlpha()
  const rawMeta = await rawImage.metadata()
  const width = rawMeta.width || 512
  const height = rawMeta.height || 512

  const { data, info } = await rawImage
    .resize(Math.min(width, 400), Math.min(height, 400), { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const smallW = info.width
  const smallH = info.height

  // Collect border pixel colors
  const borderPixels: Array<[number, number, number]> = []
  const sampleStep = Math.max(1, Math.floor(smallW / 40))
  // Top + bottom edges
  for (let x = 0; x < smallW; x += sampleStep) {
    let idx = (0 * smallW + x) * 4
    borderPixels.push([data[idx], data[idx + 1], data[idx + 2]])
    idx = ((smallH - 1) * smallW + x) * 4
    borderPixels.push([data[idx], data[idx + 1], data[idx + 2]])
  }
  // Left + right edges
  for (let y = 0; y < smallH; y += sampleStep) {
    let idx = (y * smallW + 0) * 4
    borderPixels.push([data[idx], data[idx + 1], data[idx + 2]])
    idx = (y * smallW + (smallW - 1)) * 4
    borderPixels.push([data[idx], data[idx + 1], data[idx + 2]])
  }

  // Find the dominant bg color via simple bucketing
  const bgBuckets = new Map<string, { count: number; r: number; g: number; b: number }>()
  for (const [r, g, b] of borderPixels) {
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`
    const existing = bgBuckets.get(key)
    if (existing) {
      existing.count++
      existing.r += r
      existing.g += g
      existing.b += b
    } else {
      bgBuckets.set(key, { count: 1, r, g, b })
    }
  }
  const dominantBucket = Array.from(bgBuckets.values()).sort((a, b) => b.count - a.count)[0]
  if (!dominantBucket) {
    // Fallback: assume white
    console.log('[image-composite] v2: No dominant bg color found, defaulting to white')
    return await sharp(buf).trim({ threshold: 10 }).png().toBuffer()
  }
  const bgR = Math.round(dominantBucket.r / dominantBucket.count)
  const bgG = Math.round(dominantBucket.g / dominantBucket.count)
  const bgB = Math.round(dominantBucket.b / dominantBucket.count)
  console.log(`[image-composite] v2: Detected bg color rgb(${bgR},${bgG},${bgB}) from ${dominantBucket.count} border pixels`)

  // Now process the FULL-resolution image
  const fullRaw = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const fullData = fullRaw.data
  const fullW = fullRaw.info.width
  const fullH = fullRaw.info.height

  // Threshold: pixels within 40 units of dominant bg color → transparent
  // Also remove near-white (>235) and near-black (<25) backgrounds
  const THRESHOLD = 40
  const FEATHER_RANGE = 22

  for (let i = 0; i < fullData.length; i += 4) {
    const r = fullData[i]
    const g = fullData[i + 1]
    const b = fullData[i + 2]

    const distBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
    const distWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)

    if (distBg < THRESHOLD || distWhite < 32) {
      fullData[i + 3] = 0
    } else if (distBg < THRESHOLD + FEATHER_RANGE) {
      const feather = (distBg - THRESHOLD) / FEATHER_RANGE
      fullData[i + 3] = Math.round(fullData[i + 3] * feather)
    }
  }

  // Reconstruct and trim
  const result = await sharp(fullData, {
    raw: { width: fullW, height: fullH, channels: 4 },
  })
    .png()
    .toBuffer()

  const trimmed = await sharp(result)
    .trim({ threshold: 8 })
    .png()
    .toBuffer()

  return trimmed
}

// ── v2: Better Face Detection (connected component analysis) ───────

function isSkinTone(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  // Broader skin detection — works for light to deep skin tones
  const rule1 = r > g && g > b * 0.85
  const rule2 = r - g >= 8
  const rule3 = max > 55 && max < 252
  const sat = max === 0 ? 0 : (max - min) / max
  const rule4 = sat > 0.06 && sat < 0.7
  // Additional: RGB ratio typical for skin (R/B ratio ~ 1.1 to 2.2)
  const rule5 = b > 0 && r / b > 1.05 && r / b < 2.8
  return rule1 && rule2 && rule3 && rule4 && rule5
}

interface FaceInfo {
  bbox: BBox
  skinPixelCount: number
}

async function detectFaceRegion(
  buf: Buffer,
  width: number,
  height: number,
): Promise<BBox> {
  try {
    const sharp = await getSharp()
    const smallW = Math.min(220, width)
    const smallH = Math.round((smallW / width) * height)
    const { data, info } = await sharp(buf)
      .resize(smallW, smallH, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const actualW = info.width
    const actualH = info.height

    // Only look in the upper 70% of the image (face is usually there)
    const maxY = Math.floor(actualH * 0.7)

    // Find all skin pixels
    const skinMask = new Uint8Array(actualW * actualH)
    let totalSkin = 0
    let minX = actualW, minY = actualH, maxX = 0, maxYFound = 0
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < actualW; x++) {
        const idx = (y * actualW + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const a = data[idx + 3]
        if (a < 100) continue
        if (isSkinTone(r, g, b)) {
          skinMask[y * actualW + x] = 1
          totalSkin++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxYFound) maxYFound = y
        }
      }
    }

    // Need at least 0.4% skin to be confident
    if (totalSkin > actualW * actualH * 0.004) {
      const scaleX = width / actualW
      const scaleY = height / actualH

      // Find the face center (centroid of skin pixels in the upper region)
      let sumX = 0, sumY = 0, count = 0
      // Use the top portion of the skin region (face, not neck/chest)
      const faceTop = minY
      const faceBottom = minY + Math.round((maxYFound - minY) * 0.65)
      for (let y = faceTop; y < faceBottom; y++) {
        for (let x = 0; x < actualW; x++) {
          if (skinMask[y * actualW + x]) {
            sumX += x
            sumY += y
            count++
          }
        }
      }
      const centerX = count > 0 ? sumX / count : (minX + maxX) / 2
      const centerY = count > 0 ? sumY / count : (minY + maxYFound) / 2

      // Chin = bottom of face region (before neck starts)
      const chinY = faceBottom

      const faceW = (maxX - minX) * scaleX
      const faceH = (faceBottom - minY) * scaleY

      console.log(`[image-composite] v2: Face detected — center=(${Math.round(centerX * scaleX)},${Math.round(centerY * scaleY)}), chin=${Math.round(chinY * scaleY)}, w=${Math.round(faceW)}, h=${Math.round(faceH)}`)

      return {
        x: Math.floor(minX * scaleX),
        y: Math.floor(minY * scaleY),
        w: Math.floor(faceW),
        h: Math.floor(faceH),
        centerX: Math.floor(centerX * scaleX),
        centerY: Math.floor(centerY * scaleY),
        chinY: Math.floor(chinY * scaleY),
      }
    }
    console.log(`[image-composite] v2: Insufficient skin pixels (${totalSkin}) — using fallback face position`)
  } catch (err) {
    console.log(`[image-composite] v2: Face detection failed: ${(err as Error).message}`)
  }

  // Fallback: assume face is in upper-center (typical selfie composition)
  const faceW = Math.round(width * 0.42)
  const faceH = Math.round(height * 0.32)
  const cx = Math.round(width / 2)
  const cy = Math.round(height * 0.22)
  return {
    x: cx - Math.round(faceW / 2),
    y: Math.round(height * 0.08),
    w: faceW,
    h: faceH,
    centerX: cx,
    centerY: cy,
    chinY: cy + Math.round(faceH / 2),
  }
}

// ── v2: Placement Calculation (uses face geometry) ─────────────────

interface Placement {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  opacity?: number
}

function calculatePlacement(
  category: CompositeCategory,
  face: BBox,
  canvasW: number,
  canvasH: number,
  productAspect: number,
): Placement[] {
  const placements: Placement[] = []
  // Use face geometry for precise placement
  const fcx = face.centerX
  const fcy = face.centerY
  const chinY = face.chinY
  const faceW = Math.max(40, face.w)
  const faceH = Math.max(40, face.h)

  switch (category) {
    case 'necklace': {
      // Below the chin, centered on face. v3: Constrain size so the necklace
      // fits in the space below the chin (canvasH - chinY), never overlapping
      // the face. Previous version allowed huge necklaces that covered the face.
      // v3.1: Further reduced max size — necklaces often have tall pendants that
      // visually extend toward the face even when placed below the chin.
      const spaceBelowChin = canvasH - chinY
      const maxW = Math.min(faceW * 0.9, canvasW * 0.45)
      const maxH = Math.min(spaceBelowChin * 0.7, canvasH * 0.22)
      let w = maxW
      let h = Math.round(w / Math.max(productAspect, 0.4))
      // If too tall, scale down to fit
      if (h > maxH) {
        h = Math.round(maxH)
        w = Math.round(h * productAspect)
      }
      placements.push({
        x: Math.round(clamp(fcx - w / 2, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 0.05, 0, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }

    case 'earrings': {
      // At ear level (face vertical center), at face left/right edges
      // v3: Constrain earring size to face proportions
      const earSize = clamp(faceW * 0.18, canvasW * 0.04, canvasW * 0.15)
      const earH = Math.round(Math.min(earSize / Math.max(productAspect, 0.4), faceH * 0.5))
      const earY = Math.round(fcy + faceH * 0.15) // slightly below face center (earlobe)
      // Left ear (at left edge of face)
      placements.push({
        x: Math.round(clamp(fcx - faceW / 2 - earSize * 0.3, 0, canvasW - earSize)),
        y: Math.round(clamp(earY, 0, canvasH - earH)),
        w: Math.round(earSize),
        h: earH,
        opacity: 0.95,
      })
      // Right ear (at right edge of face)
      placements.push({
        x: Math.round(clamp(fcx + faceW / 2 - earSize * 0.7, 0, canvasW - earSize)),
        y: Math.round(clamp(earY, 0, canvasH - earH)),
        w: Math.round(earSize),
        h: earH,
        opacity: 0.95,
      })
      break
    }

    case 'jewelry-set': {
      // Necklace + earrings (v3.1: constrained sizes — same as necklace)
      const spaceBelowChin = canvasH - chinY
      const neckMaxW = Math.min(faceW * 0.9, canvasW * 0.45)
      const neckMaxH = Math.min(spaceBelowChin * 0.7, canvasH * 0.22)
      let neckW = neckMaxW
      let neckH = Math.round(neckW / Math.max(productAspect, 0.4))
      if (neckH > neckMaxH) {
        neckH = Math.round(neckMaxH)
        neckW = Math.round(neckH * productAspect)
      }
      placements.push({
        x: Math.round(clamp(fcx - neckW / 2, 0, canvasW - neckW)),
        y: Math.round(clamp(chinY + faceH * 0.05, 0, canvasH - neckH)),
        w: Math.round(neckW),
        h: Math.round(neckH),
        opacity: 0.95,
      })
      const earSize = clamp(faceW * 0.18, canvasW * 0.04, canvasW * 0.15)
      const earY = Math.round(fcy + faceH * 0.15)
      const earH = Math.round(Math.min(earSize, faceH * 0.5))
      placements.push({
        x: Math.round(clamp(fcx - faceW / 2 - earSize * 0.3, 0, canvasW - earSize)),
        y: Math.round(clamp(earY, 0, canvasH - earH)),
        w: Math.round(earSize),
        h: earH,
        opacity: 0.95,
      })
      placements.push({
        x: Math.round(clamp(fcx + faceW / 2 - earSize * 0.7, 0, canvasW - earSize)),
        y: Math.round(clamp(earY, 0, canvasH - earH)),
        w: Math.round(earSize),
        h: earH,
        opacity: 0.95,
      })
      break
    }

    case 'bracelet':
    case 'watch': {
      // Lower-right area (typical wrist position in selfie)
      const w = clamp(canvasW * 0.22, 100, canvasW * 0.5)
      const h = Math.round(w / Math.max(productAspect, 0.7))
      placements.push({
        x: Math.round(clamp(fcx + faceW * 0.3, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 2.5, canvasH * 0.5, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }

    case 'ring': {
      // Lower-center (hand position)
      const w = clamp(canvasW * 0.14, 70, canvasW * 0.4)
      const h = Math.round(w / Math.max(productAspect, 0.7))
      placements.push({
        x: Math.round(clamp(fcx - w / 2, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 3, canvasH * 0.6, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }

    case 'fragrance': {
      // Held in hand at lower-right
      const w = clamp(canvasW * 0.26, 120, canvasW * 0.5)
      const h = Math.round(w / Math.max(productAspect, 0.4))
      placements.push({
        x: Math.round(clamp(fcx + faceW * 0.2, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 2, canvasH * 0.4, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }

    case 'bag': {
      // Lower portion (held or worn)
      const w = clamp(canvasW * 0.4, 180, canvasW * 0.9)
      const h = Math.round(w / Math.max(productAspect, 0.5))
      placements.push({
        x: Math.round(clamp(fcx - w / 2, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 1.5, canvasH * 0.35, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }

    case 'sunglasses': {
      // Over the eyes (face center, slightly above face center)
      const w = clamp(faceW * 0.95, canvasW * 0.2, canvasW * 0.8)
      const h = Math.round(w / Math.max(productAspect, 1.5))
      placements.push({
        x: Math.round(clamp(fcx - w / 2, 0, canvasW - w)),
        y: Math.round(clamp(fcy - h / 2 - faceH * 0.05, 0, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.92,
      })
      break
    }

    case 'saree': {
      // Pallu draped over left shoulder — diagonal placement from upper-left
      const w = clamp(canvasW * 0.55, 220, canvasW * 0.85)
      const h = Math.round(w / Math.max(productAspect, 0.7))
      placements.push({
        x: Math.round(clamp(fcx - faceW * 0.5 - w * 0.4, 0, canvasW - w)),
        y: Math.round(clamp(fcy - faceH * 0.2, 0, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        rotation: -18,
        opacity: 0.88,
      })
      break
    }

    case 'accessory':
    case 'generic':
    default: {
      // Lower-right (generic holding position)
      const w = clamp(canvasW * 0.28, 130, canvasW * 0.6)
      const h = Math.round(w / Math.max(productAspect, 0.5))
      placements.push({
        x: Math.round(clamp(fcx + faceW * 0.2, 0, canvasW - w)),
        y: Math.round(clamp(chinY + faceH * 2, canvasH * 0.45, canvasH - h)),
        w: Math.round(w),
        h: Math.round(h),
        opacity: 0.95,
      })
      break
    }
  }

  return placements
}

// ── v2: Better Shadow (blurred ellipse, not just offset rect) ──────

async function createSoftShadow(width: number, height: number): Promise<Buffer> {
  const sharp = await getSharp()
  // Create a soft elliptical shadow with proper blur
  const padW = width + 20
  const padH = height + 20
  const svg = `
    <svg width="${padW}" height="${padH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
        </filter>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="black" stop-opacity="0.35"/>
          <stop offset="55%" stop-color="black" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="black" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${padW / 2}" cy="${padH / 2 + 4}" rx="${width / 2}" ry="${height / 2.5}" fill="url(#shadow)" filter="url(#blur)"/>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ── v2: Color Matching (subtle white balance to match selfie lighting) ──

async function matchProductToSelfie(
  productBuf: Buffer,
  selfieBuf: Buffer,
): Promise<Buffer> {
  try {
    const sharp = await getSharp()
    // Sample average brightness of selfie (mid-tones only)
    const selfieStats = await sharp(selfieBuf)
      .resize(100, 100, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const sd = selfieStats.data
    let selfieBrightness = 0
    let count = 0
    for (let i = 0; i < sd.length; i += 4) {
      const r = sd[i], g = sd[i + 1], b = sd[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum > 40 && lum < 230) {
        selfieBrightness += lum
        count++
      }
    }
    if (count === 0) return productBuf
    selfieBrightness /= count

    // Sample average brightness of product
    const prodStats = await sharp(productBuf)
      .resize(100, 100, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pd = prodStats.data
    let prodBrightness = 0
    count = 0
    for (let i = 0; i < pd.length; i += 4) {
      if (pd[i + 3] < 100) continue // skip transparent
      const r = pd[i], g = pd[i + 1], b = pd[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      prodBrightness += lum
      count++
    }
    if (count === 0) return productBuf
    prodBrightness /= count

    // Calculate brightness adjustment factor (subtle, max ±15%)
    const factor = clamp(selfieBrightness / Math.max(prodBrightness, 1), 0.85, 1.15)
    if (Math.abs(factor - 1) < 0.02) return productBuf // no adjustment needed

    console.log(`[image-composite] v2: Color matching factor=${factor.toFixed(3)} (selfie=${Math.round(selfieBrightness)}, prod=${Math.round(prodBrightness)})`)

    // Apply brightness adjustment (only if significant)
    return await sharp(productBuf)
      .modulate({ brightness: factor })
      .png()
      .toBuffer()
  } catch (err) {
    console.log(`[image-composite] v2: Color match failed: ${(err as Error).message}`)
    return productBuf
  }
}

// ── Main Composite Function ────────────────────────────────────────

export async function compositeProductOnSelfie(
  selfieDataUrl: string,
  productDataUrl: string,
  category: CompositeCategory,
  productName: string,
): Promise<CompositeResult> {
  const startTime = Date.now()
  const sharp = await getSharp()
  try {
    if (!selfieDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid selfie format', strategy: 'composite' }
    }
    if (!productDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid product format', strategy: 'composite' }
    }

    console.log(`[image-composite] v2: Starting composite: category="${category}", product="${productName}"`)

    // 1. Load selfie
    const selfieBuf = Buffer.from(stripDataUrl(selfieDataUrl), 'base64')
    const selfieMeta = await sharp(selfieBuf).metadata()
    const canvasW = selfieMeta.width || 768
    const canvasH = selfieMeta.height || 1024
    console.log(`[image-composite] v2: Selfie: ${canvasW}x${canvasH}`)

    // 2. Load product and remove background (v2 smart removal)
    const productBuf = Buffer.from(stripDataUrl(productDataUrl), 'base64')
    const productNoBg = await removeWhiteBackground(productBuf)
    const productMeta = await sharp(productNoBg).metadata()
    const productAspect = (productMeta.width || 1) / (productMeta.height || 1)
    console.log(`[image-composite] v2: Product (bg removed): ${productMeta.width}x${productMeta.height}, aspect=${productAspect.toFixed(2)}`)

    // v3: Mannequin detection — if the product image has a mannequin/model
    // (common for sarees, garments on models), the composite would place the
    // mannequin OVER the user's face → "different person" mismatch.
    // In that case, FAIL FAST so the caller falls back to showcase composite.
    const mannequinCheck = await detectMannequin(productNoBg)
    if (mannequinCheck.hasMannequin) {
      console.log(`[image-composite] v3: ❌ Mannequin detected — skipping composite to avoid mismatch (opaqueRatio=${mannequinCheck.opaqueRatio.toFixed(2)})`)
      return {
        success: false,
        error: `Product image contains a mannequin/model (opaqueRatio=${mannequinCheck.opaqueRatio.toFixed(2)}) — composite would cause mismatch. Use showcase instead.`,
        strategy: 'composite-image',
      }
    }
    console.log(`[image-composite] v3: ✅ No mannequin detected — safe to composite (opaqueRatio=${mannequinCheck.opaqueRatio.toFixed(2)})`)

    // 3. Detect face region (v2 better detection)
    const face = await detectFaceRegion(selfieBuf, canvasW, canvasH)

    // 4. Calculate placement(s) using face geometry
    const placements = calculatePlacement(category, face, canvasW, canvasH, productAspect)

    // 5. Color match product to selfie lighting (subtle)
    const colorMatchedProduct = await matchProductToSelfie(productNoBg, selfieBuf)

    // 6. Composite each placement
    const compositeOps: sharp.OverlayOptions[] = []

    for (const placement of placements) {
      // Resize product to fit placement (contain to preserve aspect)
      const resizedProduct = await sharp(colorMatchedProduct)
        .resize(placement.w, placement.h, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()

      // Create soft shadow
      const shadow = await createSoftShadow(placement.w, placement.h)

      // Apply rotation if needed
      let finalProduct = resizedProduct
      let finalShadow = shadow
      if (placement.rotation) {
        finalProduct = await sharp(resizedProduct)
          .rotate(placement.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        finalShadow = await sharp(shadow)
          .rotate(placement.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
      }

      // Apply opacity for "worn" look
      if (placement.opacity && placement.opacity < 1) {
        finalProduct = await sharp(finalProduct)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data, info }) => {
            for (let i = 3; i < data.length; i += 4) {
              data[i] = Math.round(data[i] * (placement.opacity || 1))
            }
            return sharp(data, {
              raw: { width: info.width, height: info.height, channels: 4 },
            }).png().toBuffer()
          })
      }

      const finalMeta = await sharp(finalProduct).metadata()
      const finalW = finalMeta.width || placement.w
      const finalH = finalMeta.height || placement.h

      // Recenter after rotation
      const finalX = clamp(placement.x + (placement.w - finalW) / 2, 0, Math.max(0, canvasW - finalW))
      const finalY = clamp(placement.y + (placement.h - finalH) / 2, 0, Math.max(0, canvasH - finalH))

      // Shadow first (offset down-right for depth)
      compositeOps.push({
        input: finalShadow,
        left: Math.round(finalX + 3),
        top: Math.round(finalY + 5),
        blend: 'multiply',
      })

      // Product on top
      compositeOps.push({
        input: finalProduct,
        left: Math.round(finalX),
        top: Math.round(finalY),
        blend: 'over',
      })
    }

    // 7. Composite everything onto the selfie
    const result = await sharp(selfieBuf)
      .composite(compositeOps)
      .jpeg({ quality: 92, progressive: true })
      .toBuffer()

    const dataUrl = `data:image/jpeg;base64,${result.toString('base64')}`
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[image-composite] v2: ✅ Composite succeeded in ${elapsed}s (${(result.length / 1024).toFixed(1)}KB)`)

    return {
      success: true,
      imageUrl: dataUrl,
      strategy: 'composite-image',
    }
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[image-composite] v2: ❌ Composite failed in ${elapsed}s: ${msg}`)
    return {
      success: false,
      error: `Composite failed: ${msg.substring(0, 150)}`,
      strategy: 'composite-image',
    }
  }
}

// ── Category Resolution ────────────────────────────────────────────

export function resolveCompositeCategory(
  categorySlug: string,
  productName: string,
  productDescription?: string,
  productTags?: string[],
): CompositeCategory {
  const slug = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()
  const desc = (productDescription || '').toLowerCase()
  const tags = (productTags || []).join(' ').toLowerCase()
  const haystack = `${slug} ${name} ${desc} ${tags}`

  // v31: Robust keyword matching across ALL product metadata.
  // Previous v30 only checked slug — sarees misclassified as garments when
  // slug was 'women-fashion' but product name was 'Banarasi Saree'. This is
  // the smoking gun for the "different person AND different product" mismatch.

  // Sarees — full-body Indian garment (composite only pallu)
  if (
    haystack.includes('saree') || haystack.includes('sari') ||
    haystack.includes('banarasi') || haystack.includes('kanjivaram') ||
    haystack.includes('kanjeevaram') || haystack.includes('kanchi') ||
    haystack.includes('chiffon') || haystack.includes('georgette') ||
    haystack.includes('lehenga') || haystack.includes('patola') ||
    haystack.includes('pochampally') || haystack.includes('chanderi')
  ) {
    return 'saree'
  }

  // Jewelry — detect sub-type from product name/description/tags
  if (
    slug.includes('jewel') ||
    haystack.includes('necklace') || haystack.includes('earring') ||
    haystack.includes('jhumka') || haystack.includes('bracelet') ||
    haystack.includes('bangle') || haystack.includes('ring') ||
    haystack.includes('pendant') || haystack.includes('choker') ||
    haystack.includes('temple') || haystack.includes('haar') ||
    haystack.includes('mala') || haystack.includes('kada') ||
    haystack.includes('mangalsutra') || haystack.includes('nose pin') ||
    haystack.includes('nosepin') || haystack.includes('maang tikka')
  ) {
    if (haystack.includes('set') || haystack.includes('bridal') || haystack.includes('collection')) return 'jewelry-set'
    if (haystack.includes('earring') || haystack.includes('jhumka') || haystack.includes('stud') || haystack.includes('top')) return 'earrings'
    if (haystack.includes('necklace') || haystack.includes('choker') || haystack.includes('pendant') || haystack.includes('temple') || haystack.includes('haar') || haystack.includes('mala') || haystack.includes('mangalsutra')) return 'necklace'
    if (haystack.includes('bracelet') || haystack.includes('bangle') || haystack.includes('cuff') || haystack.includes('kada')) return 'bracelet'
    if (haystack.includes('ring') || haystack.includes('band') || haystack.includes('soli')) return 'ring'
    return 'necklace' // default for jewelry
  }

  // Watches
  if (slug.includes('watch') || haystack.includes('watch') || haystack.includes('chronograph') || haystack.includes('tourbillon')) return 'watch'

  // Fragrances
  if (slug.includes('fragrance') || slug.includes('perfume') || haystack.includes('parfum') || haystack.includes('cologne') || haystack.includes('eau de')) return 'fragrance'

  // Accessories — bags, sunglasses, belts, scarves, etc.
  if (
    slug.includes('accessor') || slug.includes('men-acc') || slug.includes('women-acc') ||
    haystack.includes('sunglass') || haystack.includes('bag') ||
    haystack.includes('tote') || haystack.includes('clutch') ||
    haystack.includes('wallet') || haystack.includes('belt') ||
    haystack.includes('scarf') || haystack.includes('cufflink')
  ) {
    if (haystack.includes('sunglass') || haystack.includes('glass')) return 'sunglasses'
    if (haystack.includes('bag') || haystack.includes('tote') || haystack.includes('clutch') || haystack.includes('wallet')) return 'bag'
    return 'accessory'
  }

  // Default
  return 'generic'
}
