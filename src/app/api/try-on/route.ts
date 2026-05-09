import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── Types ─────────────────────────────────────────────────────────────

interface FaceAnalysis {
  faceCenterX: number // 0-1 ratio
  faceCenterY: number // 0-1 ratio
  photoType: 'closeup' | 'waist-up' | 'full-body'
  hasVisibleWrists: boolean
  hasVisibleNeck: boolean
  confidence: number
}

// ── Product image helper ──────────────────────────────────────────────

function getProductImageBufferLocal(imagePath: string): Buffer | null {
  try {
    const fullPath = join(process.cwd(), 'public', imagePath)
    if (!existsSync(fullPath)) return null
    return readFileSync(fullPath)
  } catch (err) {
    console.error('[try-on] Failed to read local product image:', err)
    return null
  }
}

async function getProductImageBuffer(imagePath: string): Promise<Buffer | null> {
  // Handle external URLs (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        console.error('[try-on] Failed to fetch external image:', response.status)
        return null
      }
      return Buffer.from(await response.arrayBuffer())
    } catch (err) {
      console.error('[try-on] Failed to fetch external product image:', err)
      return null
    }
  }
  // Handle protocol-relative URLs
  if (imagePath.startsWith('//')) {
    return getProductImageBuffer(`https:${imagePath}`)
  }
  // Handle image-proxy URLs: /api/image-proxy?url=...
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}${imagePath}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      return Buffer.from(await response.arrayBuffer())
    } catch (err) {
      console.error('[try-on] Failed to fetch proxied product image:', err)
      return null
    }
  }
  // Local path
  return getProductImageBufferLocal(imagePath)
}

// ── Category pairing for suggestions ──────────────────────────────────

function getPairingCategory(categorySlug: string): string[] {
  const pairs: Record<string, string[]> = {
    'sarees': ['jewelry'],
    'jewelry': ['sarees', 'fashion'],
    'watches': ['mens-shirts', 'leather-goods'],
    'mens-shirts': ['watches', 'leather-goods'],
    'fashion': ['jewelry', 'watches'],
    'fragrances': ['jewelry', 'fashion'],
    'leather-goods': ['watches', 'fashion'],
  }
  return pairs[categorySlug] || ['jewelry']
}

// ── Default face analysis based on category ───────────────────────────

function getDefaultAnalysis(categorySlug: string): FaceAnalysis {
  switch (categorySlug) {
    case 'jewelry':
      return { faceCenterX: 0.45, faceCenterY: 0.3, photoType: 'closeup', hasVisibleWrists: false, hasVisibleNeck: true, confidence: 0.5 }
    case 'watches':
      return { faceCenterX: 0.45, faceCenterY: 0.25, photoType: 'waist-up', hasVisibleWrists: true, hasVisibleNeck: true, confidence: 0.5 }
    case 'sarees':
    case 'fashion':
    case 'mens-shirts':
      return { faceCenterX: 0.4, faceCenterY: 0.15, photoType: 'waist-up', hasVisibleWrists: true, hasVisibleNeck: true, confidence: 0.5 }
    default:
      return { faceCenterX: 0.4, faceCenterY: 0.25, photoType: 'waist-up', hasVisibleWrists: true, hasVisibleNeck: true, confidence: 0.5 }
  }
}

// ── VLM-based selfie analysis ────────────────────────────────────────

async function analyzeSelfie(selfieBase64: string, categorySlug: string): Promise<FaceAnalysis> {
  const defaultAnalysis = getDefaultAnalysis(categorySlug)
  try {
    const zai = await ZAI.create()
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this selfie photo for virtual try-on positioning. Return ONLY a JSON object with these fields:
- faceCenterX: horizontal center of face as ratio 0-1 (left=0, right=1)
- faceCenterY: vertical center of face as ratio 0-1 (top=0, bottom=1)
- photoType: "closeup" | "waist-up" | "full-body"
- hasVisibleWrists: true if wrists are visible in the photo
- hasVisibleNeck: true if neck is clearly visible
- confidence: your confidence 0-1 in this analysis

Example: {"faceCenterX":0.45,"faceCenterY":0.28,"photoType":"waist-up","hasVisibleWrists":true,"hasVisibleNeck":true,"confidence":0.9}

Return ONLY the JSON, no other text.`
            },
            {
              type: 'image_url',
              image_url: { url: selfieBase64 }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    })

    const content = response.choices?.[0]?.message?.content || ''
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        faceCenterX: Math.min(1, Math.max(0, parsed.faceCenterX || 0.45)),
        faceCenterY: Math.min(1, Math.max(0, parsed.faceCenterY || 0.28)),
        photoType: ['closeup', 'waist-up', 'full-body'].includes(parsed.photoType) ? parsed.photoType : 'waist-up',
        hasVisibleWrists: !!parsed.hasVisibleWrists,
        hasVisibleNeck: !!parsed.hasVisibleNeck,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      }
    }
  } catch (err) {
    console.warn('[try-on] VLM analysis failed, using defaults:', err instanceof Error ? err.message : err)
  }
  return defaultAnalysis
}

// ── Product placement position based on analysis + category ───────────

interface PlacementPosition {
  // Product card position (top-left corner, as ratio of canvas)
  cardX: number
  cardY: number
  cardWidth: number
  cardHeight: number
  // Where the product "points to" on the selfie (for a subtle indicator line)
  indicatorX: number
  indicatorY: number
}

function getProductPlacement(
  analysis: FaceAnalysis,
  categorySlug: string,
  productName: string,
): PlacementPosition {
  const n = productName.toLowerCase()

  // Default: right side card
  const rightCard: PlacementPosition = {
    cardX: 0.62,
    cardY: 0.06,
    cardWidth: 0.35,
    cardHeight: 0.55,
    indicatorX: analysis.faceCenterX + 0.1,
    indicatorY: analysis.faceCenterY + 0.15,
  }

  // For jewelry: position near the face/neck area
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) {
      // Earrings: card near the ear area
      return {
        cardX: 0.62,
        cardY: 0.04,
        cardWidth: 0.34,
        cardHeight: 0.38,
        indicatorX: analysis.faceCenterX + 0.12,
        indicatorY: analysis.faceCenterY - 0.02,
      }
    }
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple')) {
      // Necklace: card near the neck area
      return {
        cardX: 0.62,
        cardY: 0.12,
        cardWidth: 0.34,
        cardHeight: 0.42,
        indicatorX: analysis.faceCenterX + 0.05,
        indicatorY: analysis.faceCenterY + 0.12,
      }
    }
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle')) {
      // Bracelet: card near the wrist area
      return {
        cardX: 0.62,
        cardY: analysis.hasVisibleWrists ? 0.35 : 0.15,
        cardWidth: 0.34,
        cardHeight: 0.35,
        indicatorX: analysis.faceCenterX + 0.18,
        indicatorY: analysis.faceCenterY + 0.28,
      }
    }
    if (n.includes('ring')) {
      return {
        cardX: 0.62,
        cardY: 0.3,
        cardWidth: 0.34,
        cardHeight: 0.32,
        indicatorX: analysis.faceCenterX + 0.2,
        indicatorY: analysis.faceCenterY + 0.25,
      }
    }
    // Generic jewelry
    return {
      cardX: 0.62,
      cardY: 0.06,
      cardWidth: 0.34,
      cardHeight: 0.40,
      indicatorX: analysis.faceCenterX + 0.08,
      indicatorY: analysis.faceCenterY + 0.05,
    }
  }

  if (categorySlug === 'watches') {
    return {
      cardX: 0.62,
      cardY: analysis.hasVisibleWrists ? 0.3 : 0.12,
      cardWidth: 0.34,
      cardHeight: 0.38,
      indicatorX: analysis.faceCenterX + 0.2,
      indicatorY: analysis.faceCenterY + 0.22,
    }
  }

  // Sarees, fashion, shirts: show product on the right side, larger card
  if (['sarees', 'fashion', 'mens-shirts'].includes(categorySlug)) {
    return {
      cardX: 0.58,
      cardY: 0.04,
      cardWidth: 0.39,
      cardHeight: 0.58,
      indicatorX: analysis.faceCenterX + 0.05,
      indicatorY: analysis.faceCenterY + 0.2,
    }
  }

  return rightCard
}

// ── Create composite with Sharp ───────────────────────────────────────

async function createComposite(
  selfieBuffer: Buffer,
  productBuffer: Buffer,
  productName: string,
  categorySlug: string,
  analysis: FaceAnalysis,
): Promise<Buffer> {
  const W = 864
  const H = 1152

  // 1. Resize selfie to fill the canvas (cover mode, position top to keep face visible)
  const resizedSelfie = await sharp(selfieBuffer)
    .resize(W, H, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 92 })
    .toBuffer()

  // 2. Create dark gradient overlay for the right side
  const gradientOverlay = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }
  })
    .composite([
      // Right side dark gradient
      {
        input: await createGradientBuffer(W, H),
        left: 0,
        top: 0,
      }
    ])
    .png()
    .toBuffer()

  // 3. Prepare product image with rounded corners and gold border
  const placement = getProductPlacement(analysis, categorySlug, productName)
  const cardW = Math.round(W * placement.cardWidth)
  const cardH = Math.round(H * placement.cardHeight)
  const cardX = Math.round(W * placement.cardX)
  const cardY = Math.round(H * placement.cardY)

  // Inner padding for the product card
  const padding = 12
  const borderW = 2

  // Create gold border frame
  const goldBorder = await sharp({
    create: {
      width: cardW + borderW * 2,
      height: cardH + borderW * 2,
      channels: 4,
      background: { r: 212, g: 168, b: 67, alpha: 1 }, // #D4A843
    }
  })
    .ensureAlpha()
    .png()
    .toBuffer()

  // Create card background with rounded corners
  const cardBg = await sharp({
    create: {
      width: cardW,
      height: cardH,
      channels: 4,
      background: { r: 20, g: 18, b: 16, alpha: 0.88 }, // Dark with transparency
    }
  })
    .ensureAlpha()
    .png()
    .toBuffer()

  // Resize product image to fit inside the card
  const innerW = Math.max(50, cardW - padding * 2)
  const innerH = Math.max(50, cardH - padding * 2 - 60) // Reserve 60px for text at bottom
  const productResized = await sharp(productBuffer)
    .resize(innerW, innerH, { fit: 'inside' })
    .png()
    .toBuffer()

  const productMeta = await sharp(productResized).metadata()
  const pW = productMeta.width || innerW
  const pH = productMeta.height || innerH

  // Center product in the card area
  const prodOffsetX = Math.round((innerW - pW) / 2)
  const prodOffsetY = Math.round((innerH - pH) / 2)

  // Compose product onto card background
  const cardWithProduct = await sharp(cardBg)
    .composite([
      {
        input: productResized,
        left: padding + prodOffsetX,
        top: padding + prodOffsetY,
      }
    ])
    .png()
    .toBuffer()

  // 4. Create text overlays using SVG
  const catLabels: Record<string, string> = {
    'jewelry': 'JEWELRY',
    'sarees': 'SAREE',
    'watches': 'WATCH',
    'mens-shirts': 'SHIRT',
    'fashion': 'FASHION',
    'fragrances': 'FRAGRANCE',
    'leather-goods': 'LEATHER',
    'home-living': 'HOME',
  }
  const catLabel = catLabels[categorySlug] || 'STYLE'
  const displayName = productName.length > 28 ? productName.substring(0, 25) + '...' : productName

  // Product name text
  const nameSvg = Buffer.from(`<svg width="${cardW}" height="50">
    <text x="${cardW / 2}" y="18" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-weight="bold" fill="#D4A843">${escapeXml(displayName)}</text>
    <text x="${cardW / 2}" y="34" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" fill="rgba(212,168,67,0.6)" letter-spacing="2">${catLabel} PREVIEW</text>
  </svg>`)

  // 3 BOXES LUXURY branding
  const brandSvg = Buffer.from(`<svg width="${cardW}" height="30">
    <text x="${cardW / 2}" y="14" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#D4A843">3 BOXES</text>
    <text x="${cardW / 2}" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="rgba(212,168,67,0.7)">LUXURY</text>
  </svg>`)

  // Bottom branding bar
  const bottomBarSvg = Buffer.from(`<svg width="${W}" height="48">
    <rect x="0" y="0" width="${W}" height="48" fill="rgba(10,8,6,0.8)"/>
    <line x1="0" y1="0" x2="${W}" y2="0" stroke="rgba(212,168,67,0.3)" stroke-width="1"/>
    <text x="${W / 2}" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="14" font-weight="bold" fill="#D4A843">3 BOXES LUXURY</text>
    <text x="${W / 2}" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" fill="rgba(212,168,67,0.5)" letter-spacing="3">STYLE PREVIEW</text>
  </svg>`)

  // Subtle indicator dot (gold circle near where the product would be worn)
  const indicatorSize = 16
  const indicatorX = Math.round(W * placement.indicatorX) - indicatorSize / 2
  const indicatorY = Math.round(H * placement.indicatorY) - indicatorSize / 2
  const indicatorSvg = Buffer.from(`<svg width="${indicatorSize}" height="${indicatorSize}">
    <circle cx="${indicatorSize / 2}" cy="${indicatorSize / 2}" r="${indicatorSize / 2 - 1}" fill="none" stroke="rgba(212,168,67,0.6)" stroke-width="1.5" stroke-dasharray="3,2"/>
    <circle cx="${indicatorSize / 2}" cy="${indicatorSize / 2}" r="2" fill="rgba(212,168,67,0.8)"/>
  </svg>`)

  // 5. Compose everything together
  const composite = await sharp(resizedSelfie)
    .composite([
      // Dark gradient overlay
      { input: gradientOverlay, left: 0, top: 0 },
      // Indicator dot on selfie
      { input: indicatorSvg, left: indicatorX, top: indicatorY },
      // Gold border frame
      { input: goldBorder, left: cardX - borderW, top: cardY - borderW },
      // Card with product
      { input: cardWithProduct, left: cardX, top: cardY },
      // Product name text
      { input: nameSvg, left: cardX, top: cardY + cardH - 55 },
      // Brand text in card
      { input: brandSvg, left: cardX, top: cardY + cardH - 20 },
      // Bottom branding bar
      { input: bottomBarSvg, left: 0, top: H - 48 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer()

  return composite
}

// ── Helper: Create gradient overlay ───────────────────────────────────

async function createGradientBuffer(W: number, H: number): Promise<Buffer> {
  // Create a gradient that's transparent on the left and dark on the right
  // Using a simple approach with sharp
  const svgGradient = `<svg width="${W}" height="${H}">
    <defs>
      <linearGradient id="grad" x1="0.4" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="40%" stop-color="black" stop-opacity="0.1"/>
        <stop offset="70%" stop-color="black" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#grad)"/>
  </svg>`

  return Buffer.from(svgGradient)
}

// ── Helper: XML escape ────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── POST /api/try-on ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, selfieData, productImageUrl } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
    }
    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get product image buffer
    const productImages: string[] = JSON.parse(product.images || '[]')
    const productImagePath = productImageUrl || (productImages.length > 0 ? productImages[0] : null)
    const productImageBuffer = productImagePath ? await getProductImageBuffer(productImagePath) : null

    if (!productImageBuffer) {
      return NextResponse.json({ error: 'Product image not available' }, { status: 400 })
    }

    // Decode selfie base64 to buffer
    const selfieBase64Match = selfieData.match(/^data:image\/([\w+]+);base64,(.+)$/)
    if (!selfieBase64Match) {
      return NextResponse.json({ error: 'Invalid selfie image data - must be a data URI with base64 encoding' }, { status: 400 })
    }
    const selfieBuffer = Buffer.from(selfieBase64Match[2], 'base64')

    // Validate selfie image is processable by sharp
    try {
      const selfieMeta = await sharp(selfieBuffer).metadata()
      if (!selfieMeta.width || !selfieMeta.height || selfieMeta.width < 10 || selfieMeta.height < 10) {
        return NextResponse.json({ error: 'Selfie image is too small or corrupted. Please upload a clearer photo.' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Could not process selfie image. Please try a different photo format (JPG or PNG).' }, { status: 400 })
    }

    // Run VLM analysis and suggestion fetching in parallel
    // VLM analysis has a 15s timeout to avoid long waits
    const vlmTimeout = new Promise<FaceAnalysis>((resolve) => {
      setTimeout(() => resolve(getDefaultAnalysis(product.category.slug)), 15000)
    })

    const [analysis, suggestionsResult] = await Promise.allSettled([
      Promise.race([analyzeSelfie(selfieData, product.category.slug), vlmTimeout]),
      db.product.findMany({
        where: {
          category: { slug: { in: getPairingCategory(product.category.slug) } },
          id: { not: productId },
          stock: { gt: 0 },
        },
        include: { category: true },
        take: 4,
        orderBy: { rating: 'desc' },
      }),
    ])

    const faceAnalysis: FaceAnalysis = analysis.status === 'fulfilled'
      ? analysis.value
      : getDefaultAnalysis(product.category.slug)

    const suggestions = suggestionsResult.status === 'fulfilled'
      ? suggestionsResult.value.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          image: JSON.parse(s.images || '[]')[0] || '/images/placeholder.jpg',
          category: s.category?.name || '',
          categorySlug: s.category?.slug || '',
        }))
      : []

    console.log(`[try-on] Face analysis: type=${faceAnalysis.photoType}, face=(${faceAnalysis.faceCenterX.toFixed(2)},${faceAnalysis.faceCenterY.toFixed(2)}), confidence=${faceAnalysis.confidence.toFixed(2)}`)

    // Generate the composite image
    const compositeBuffer = await createComposite(
      selfieBuffer,
      productImageBuffer,
      product.name,
      product.category.slug,
      faceAnalysis,
    )

    // Convert to base64 data URI
    const compositeBase64 = `data:image/jpeg;base64,${compositeBuffer.toString('base64')}`

    return NextResponse.json({
      status: 'completed',
      imageUrl: compositeBase64,
      productName: product.name,
      categorySlug: product.category.slug,
      strategy: 'smart-composite',
      faceAnalysis: {
        photoType: faceAnalysis.photoType,
        confidence: faceAnalysis.confidence,
      },
      suggestions,
    })
  } catch (error) {
    console.error('[try-on] API error:', error)
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    return NextResponse.json({ error: `Failed to generate preview: ${message}` }, { status: 500 })
  }
}

// ── GET /api/try-on — kept for compatibility, not used anymore ────────

export async function GET() {
  return NextResponse.json({ error: 'This endpoint no longer uses polling. Use POST instead.' }, { status: 400 })
}
