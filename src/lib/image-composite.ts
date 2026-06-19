/**
 * Image Composition Engine for Virtual Try-On
 *
 * 100% FREE FOREVER — uses sharp (libvips) for all image processing.
 * No external APIs, no rate limits, no auth, works on Vercel serverless.
 *
 * STRATEGY:
 * 1. Take the user's selfie (preserves the EXACT face — 100% identity preservation)
 * 2. Remove the white background from the product image (chroma key)
 * 3. Detect the user's face region using skin-tone analysis
 * 4. Composite the product at the correct anatomical position:
 *    - Necklace → just below the chin
 *    - Earrings → at both ears
 *    - Bracelet → at wrist (lower portion)
 *    - Ring → at finger (lower-center)
 *    - Watch → at wrist (lower-right)
 *    - Fragrance → held in hand (lower-right)
 *    - Bag → held in hand (lower portion)
 *    - Sunglasses → over eyes
 *    - Saree pallu → draped over left shoulder
 * 5. Apply soft shadow and brightness matching for realism
 *
 * This is the FALLBACK/PRIMARY strategy for non-garment categories
 * (jewelry, watches, accessories, fragrances) when AI generation fails
 * or is rate-limited. It ALWAYS produces a result.
 */

import sharp from 'sharp'

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
}

// ── Helpers ────────────────────────────────────────────────────────

function stripDataUrl(dataUrl: string): string {
  // Find the first comma (data URLs always have exactly one comma separating header from data)
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx > 0 && commaIdx < 100 && dataUrl.startsWith('data:')) {
    return dataUrl.substring(commaIdx + 1)
  }
  return dataUrl
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ── Background Removal (Chroma Key for white/near-white backgrounds) ──

async function removeWhiteBackground(buf: Buffer): Promise<Buffer> {
  // Get raw pixel data with alpha channel
  const image = sharp(buf).ensureAlpha()
  const meta = await image.metadata()
  const width = meta.width || 512
  const height = meta.height || 512

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const actualWidth = info.width
  const actualHeight = info.height

  // Sample the 4 corners to detect the background color (usually white)
  const corners = [
    [0, 0],
    [actualWidth - 1, 0],
    [0, actualHeight - 1],
    [actualWidth - 1, actualHeight - 1],
  ]
  let bgR = 0, bgG = 0, bgB = 0
  for (const [cx, cy] of corners) {
    const idx = (cy * actualWidth + cx) * 4
    bgR += data[idx]
    bgG += data[idx + 1]
    bgB += data[idx + 2]
  }
  bgR = Math.round(bgR / 4)
  bgG = Math.round(bgG / 4)
  bgB = Math.round(bgB / 4)

  // Threshold: pixels within 28 units of background color → transparent
  // Also make pure white (>240) transparent (most e-commerce shots are white-bg)
  const THRESHOLD = 32
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Distance from sampled background
    const distBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
    // Distance from pure white
    const distWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)

    if (distBg < THRESHOLD || distWhite < 28) {
      data[i + 3] = 0 // make transparent
    } else if (distBg < THRESHOLD + 18) {
      // Feather the edge for smoother alpha
      const feather = (distBg - THRESHOLD) / 18
      data[i + 3] = Math.round(data[i + 3] * feather)
    }
  }

  // Reconstruct the image from raw data and trim transparent borders
  const result = await sharp(data, {
    raw: { width: actualWidth, height: actualHeight, channels: 4 },
  })
    .png()
    .toBuffer()

  // Trim to bounding box of non-transparent pixels
  const trimmed = await sharp(result)
    .trim({ threshold: 5 })
    .png()
    .toBuffer()

  return trimmed
}

// ── Face Detection via Skin-Tone Analysis ──────────────────────────

function isSkinTone(r: number, g: number, b: number): boolean {
  // Skin-tone detection in RGB (Kovac et al. heuristic, simplified)
  // Works for diverse skin tones from light to dark
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  // Rule 1: Red > Green > Blue (typical for skin)
  const rule1 = r > g && g > b
  // Rule 2: Red - Green >= 15 (skin has warm tint)
  const rule2 = r - g >= 12
  // Rule 3: Not too dark, not pure white
  const rule3 = max > 60 && max < 252
  // Rule 4: Saturation in a reasonable range
  const sat = max === 0 ? 0 : (max - min) / max
  const rule4 = sat > 0.08 && sat < 0.65

  return rule1 && rule2 && rule3 && rule4
}

async function detectFaceRegion(
  buf: Buffer,
  width: number,
  height: number,
): Promise<BBox> {
  try {
    // Downscale for faster analysis
    const smallW = Math.min(200, width)
    const smallH = Math.round((smallW / width) * height)
    const { data } = await sharp(buf)
      .resize(smallW, smallH, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Only look in the upper 65% of the image (face is usually there)
    const maxY = Math.floor(smallH * 0.65)

    let minX = smallW, minY = smallH, maxX = 0, maxYFound = 0
    let skinPixelCount = 0

    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < smallW; x++) {
        const idx = (y * smallW + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const a = data[idx + 3]

        if (a < 128) continue
        if (isSkinTone(r, g, b)) {
          skinPixelCount++
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxYFound) maxYFound = y
        }
      }
    }

    // If we found enough skin pixels, return the bounding box (scaled back)
    if (skinPixelCount > (smallW * smallH * 0.005)) {
      const scaleX = width / smallW
      const scaleY = height / smallH
      return {
        x: Math.floor(minX * scaleX),
        y: Math.floor(minY * scaleY),
        w: Math.floor((maxX - minX) * scaleX),
        h: Math.floor((maxYFound - minY) * scaleY),
      }
    }
  } catch (err) {
    console.log(`[image-composite] Face detection failed: ${(err as Error).message}`)
  }

  // Fallback: assume face is in upper-center (typical selfie composition)
  const faceW = Math.round(width * 0.45)
  const faceH = Math.round(height * 0.35)
  return {
    x: Math.round((width - faceW) / 2),
    y: Math.round(height * 0.08),
    w: faceW,
    h: faceH,
  }
}

// ── Placement Calculation ──────────────────────────────────────────

interface Placement {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

function calculatePlacement(
  category: CompositeCategory,
  face: BBox,
  canvasW: number,
  canvasH: number,
  productAspect: number, // width / height of the product
): Placement[] {
  // Multiple placements (e.g., earrings need left + right)
  const placements: Placement[] = []
  // Clamp face region to canvas (skin detection can be over-eager)
  const faceW = Math.min(face.w, canvasW * 0.7)
  const faceH = Math.min(face.h, canvasH * 0.5)
  const faceX = Math.max(0, Math.min(face.x, canvasW - faceW))
  const faceY = Math.max(0, Math.min(face.y, canvasH - faceH))

  switch (category) {
    case 'necklace': {
      // Below the chin, centered horizontally with face
      // Clamp width to 90% of canvas to avoid overflow
      const w = Math.min(Math.max(faceW * 1.4, canvasW * 0.32), canvasW * 0.9)
      const h = Math.round(w / Math.max(productAspect, 0.5))
      placements.push({
        x: clamp(faceX + faceW / 2 - w / 2, 0, canvasW - w),
        y: clamp(faceY + faceH * 0.85, 0, canvasH - h),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'earrings': {
      // Two placements: left ear and right ear
      const earSize = Math.max(faceW * 0.18, canvasW * 0.06)
      const earH = Math.round(earSize / Math.max(productAspect, 0.5))
      // Left ear
      placements.push({
        x: Math.round(faceX + faceW * 0.05),
        y: Math.round(faceY + faceH * 0.55),
        w: Math.round(earSize),
        h: earH,
      })
      // Right ear (mirror)
      placements.push({
        x: Math.round(faceX + faceW * 0.95 - earSize),
        y: Math.round(faceY + faceH * 0.55),
        w: Math.round(earSize),
        h: earH,
      })
      break
    }

    case 'jewelry-set': {
      // Necklace + earrings
      const neckW = Math.min(Math.max(faceW * 1.4, canvasW * 0.32), canvasW * 0.9)
      const neckH = Math.round(neckW / Math.max(productAspect, 0.5))
      placements.push({
        x: clamp(faceX + faceW / 2 - neckW / 2, 0, canvasW - neckW),
        y: clamp(faceY + faceH * 0.85, 0, canvasH - neckH),
        w: Math.round(neckW),
        h: Math.round(neckH),
      })
      // Also add earrings
      const earSize = Math.max(faceW * 0.18, canvasW * 0.06)
      placements.push({
        x: Math.round(faceX + faceW * 0.05),
        y: Math.round(faceY + faceH * 0.55),
        w: Math.round(earSize),
        h: Math.round(earSize),
      })
      placements.push({
        x: Math.round(faceX + faceW * 0.95 - earSize),
        y: Math.round(faceY + faceH * 0.55),
        w: Math.round(earSize),
        h: Math.round(earSize),
      })
      break
    }

    case 'bracelet':
    case 'watch': {
      // Lower-right area (typical wrist-shot selfie)
      const w = Math.min(Math.max(canvasW * 0.22, 120), canvasW * 0.5)
      const h = Math.round(w / Math.max(productAspect, 0.7))
      placements.push({
        x: Math.round(canvasW * 0.55),
        y: Math.round(canvasH * 0.65),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'ring': {
      // Lower-center (hand position)
      const w = Math.min(Math.max(canvasW * 0.15, 80), canvasW * 0.4)
      const h = Math.round(w / Math.max(productAspect, 0.7))
      placements.push({
        x: Math.round(canvasW * 0.4),
        y: Math.round(canvasH * 0.72),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'fragrance': {
      // Held in hand at lower-right
      const w = Math.min(Math.max(canvasW * 0.28, 140), canvasW * 0.5)
      const h = Math.round(w / Math.max(productAspect, 0.5))
      placements.push({
        x: Math.round(canvasW * 0.55),
        y: Math.round(canvasH * 0.55),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'bag': {
      // Lower portion (held or worn)
      const w = Math.min(Math.max(canvasW * 0.4, 200), canvasW * 0.9)
      const h = Math.round(w / Math.max(productAspect, 0.6))
      placements.push({
        x: Math.round((canvasW - w) / 2),
        y: Math.round(canvasH * 0.5),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'sunglasses': {
      // Over the eyes
      const w = Math.min(Math.max(faceW * 0.95, canvasW * 0.25), canvasW * 0.8)
      const h = Math.round(w / Math.max(productAspect, 1.5))
      placements.push({
        x: Math.round(faceX + (faceW - w) / 2),
        y: Math.round(faceY + faceH * 0.35),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }

    case 'saree': {
      // Pallu over left shoulder — diagonal placement
      const w = Math.min(Math.max(canvasW * 0.5, 250), canvasW * 0.85)
      const h = Math.round(w / Math.max(productAspect, 0.8))
      placements.push({
        x: Math.round(canvasW * 0.05),
        y: Math.round(faceY + faceH * 0.5),
        w: Math.round(w),
        h: Math.round(h),
        rotation: -15,
      })
      break
    }

    case 'accessory':
    case 'generic':
    default: {
      // Lower-right (generic holding position)
      const w = Math.min(Math.max(canvasW * 0.3, 150), canvasW * 0.6)
      const h = Math.round(w / Math.max(productAspect, 0.6))
      placements.push({
        x: Math.round(canvasW * 0.55),
        y: Math.round(canvasH * 0.6),
        w: Math.round(w),
        h: Math.round(h),
      })
      break
    }
  }

  return placements
}

// ── Shadow Generation ──────────────────────────────────────────────

async function createSoftShadow(width: number, height: number): Promise<Buffer> {
  // Create a soft elliptical shadow under the product
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="black" stop-opacity="0.35"/>
          <stop offset="60%" stop-color="black" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="black" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="url(#shadow)"/>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ── Main Composite Function ────────────────────────────────────────

export async function compositeProductOnSelfie(
  selfieDataUrl: string,
  productDataUrl: string,
  category: CompositeCategory,
  productName: string,
): Promise<CompositeResult> {
  const startTime = Date.now()
  try {
    if (!selfieDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid selfie format', strategy: 'composite' }
    }
    if (!productDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid product format', strategy: 'composite' }
    }

    console.log(`[image-composite] Starting composite: category="${category}", product="${productName}"`)

    // 1. Load selfie
    const selfieBuf = Buffer.from(stripDataUrl(selfieDataUrl), 'base64')
    console.log(`[image-composite] selfieBuf: ${selfieBuf.length} bytes, first4=${selfieBuf.slice(0, 4).toString('hex')}`)
    const selfieMeta = await sharp(selfieBuf).metadata()
    const canvasW = selfieMeta.width || 768
    const canvasH = selfieMeta.height || 1024

    console.log(`[image-composite] Selfie: ${canvasW}x${canvasH}`)

    // 2. Load product and remove white background
    const productBuf = Buffer.from(stripDataUrl(productDataUrl), 'base64')
    console.log(`[image-composite] productBuf: ${productBuf.length} bytes, first4=${productBuf.slice(0, 4).toString('hex')}`)
    const productNoBg = await removeWhiteBackground(productBuf)
    const productMeta = await sharp(productNoBg).metadata()
    const productAspect = (productMeta.width || 1) / (productMeta.height || 1)
    console.log(`[image-composite] Product (bg removed): ${productMeta.width}x${productMeta.height}, aspect=${productAspect.toFixed(2)}`)

    // 3. Detect face region in selfie
    const face = await detectFaceRegion(selfieBuf, canvasW, canvasH)
    console.log(`[image-composite] Face region: x=${face.x}, y=${face.y}, w=${face.w}, h=${face.h}`)

    // 4. Calculate placement(s)
    const placements = calculatePlacement(category, face, canvasW, canvasH, productAspect)

    // 5. Composite each placement
    const compositeOps: sharp.OverlayOptions[] = []

    for (const placement of placements) {
      // Resize product to fit placement (contain to preserve aspect)
      const resizedProduct = await sharp(productNoBg)
        .resize(placement.w, placement.h, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()

      // Create soft shadow (same size)
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

      // Get final dimensions after rotation
      const finalMeta = await sharp(finalProduct).metadata()
      const finalW = finalMeta.width || placement.w
      const finalH = finalMeta.height || placement.h

      // Recenter after rotation
      const finalX = clamp(placement.x + (placement.w - finalW) / 2, 0, Math.max(0, canvasW - finalW))
      const finalY = clamp(placement.y + (placement.h - finalH) / 2, 0, Math.max(0, canvasH - finalH))

      // Add shadow first (slightly offset)
      compositeOps.push({
        input: finalShadow,
        left: Math.round(finalX + 4),
        top: Math.round(finalY + 6),
        blend: 'multiply',
      })

      // Add product on top
      compositeOps.push({
        input: finalProduct,
        left: Math.round(finalX),
        top: Math.round(finalY),
        blend: 'over',
      })
    }

    // 6. Composite everything onto the selfie
    const result = await sharp(selfieBuf)
      .composite(compositeOps)
      .jpeg({ quality: 90, progressive: true })
      .toBuffer()

    const dataUrl = `data:image/jpeg;base64,${result.toString('base64')}`
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[image-composite] ✅ Composite succeeded in ${elapsed}s (${(result.length / 1024).toFixed(1)}KB)`)

    return {
      success: true,
      imageUrl: dataUrl,
      strategy: 'composite-image',
    }
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[image-composite] ❌ Composite failed in ${elapsed}s: ${msg}`)
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
): CompositeCategory {
  const slug = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  // Sarees — special handling (full-body garment, composite only pallu)
  if (slug.includes('saree')) return 'saree'

  // Jewelry — detect sub-type from product name
  if (slug.includes('jewel')) {
    if (name.includes('set') || name.includes('bridal') || name.includes('collection')) return 'jewelry-set'
    if (name.includes('earring') || name.includes('jhumka') || name.includes('stud') || name.includes('top')) return 'earrings'
    if (name.includes('necklace') || name.includes('choker') || name.includes('pendant') || name.includes('temple') || name.includes('haar') || name.includes('mala')) return 'necklace'
    if (name.includes('bracelet') || name.includes('bangle') || name.includes('cuff') || name.includes('kada')) return 'bracelet'
    if (name.includes('ring') || name.includes('band') || name.includes('soli')) return 'ring'
    return 'necklace' // default for jewelry
  }

  // Watches
  if (slug.includes('watch')) return 'watch'

  // Fragrances
  if (slug.includes('fragrance') || slug.includes('perfume')) return 'fragrance'

  // Accessories — bags, sunglasses, etc.
  if (slug.includes('accessor') || slug.includes('men-acc') || slug.includes('women-acc')) {
    if (name.includes('sunglass') || name.includes('glass')) return 'sunglasses'
    if (name.includes('bag') || name.includes('tote') || name.includes('clutch') || name.includes('wallet')) return 'bag'
    return 'accessory'
  }

  // Default
  return 'generic'
}
