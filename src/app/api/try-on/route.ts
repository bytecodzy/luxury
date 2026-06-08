import { NextRequest, NextResponse } from 'next/server'

// Maximum duration for Vercel serverless function (Pro plan = 60s)
export const maxDuration = 60

// ── Hard timeout constants ──────────────────────────────────────────
const TOTAL_HARD_TIMEOUT_MS = 55_000 // 55 seconds — hard server timeout (leaves 5s buffer for Vercel)
const IDM_VTON_TIMEOUT_MS = 35_000  // 35 seconds for IDM-VTON (most of the time it takes 15-25s)
const ZAI_EDIT_TIMEOUT_MS = 25_000  // 25 seconds for ZAI image edit

// ── Product image helpers ──────────────────────────────────────────

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (!imagePath) return null

  // Handle external URLs (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.error('[try-on] Failed to fetch external product image:', err)
      return null
    }
  }
  // Handle protocol-relative URLs
  if (imagePath.startsWith('//')) {
    return getProductImageBase64(`https:${imagePath}`)
  }
  // Handle image-proxy URLs — extract the original URL and fetch directly
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const proxyUrlObj = new URL(imagePath, 'http://localhost')
      const originalUrl = proxyUrlObj.searchParams.get('url')
      if (originalUrl) {
        const directResult = await getProductImageBase64(originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl)
        if (directResult) return directResult
      }
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const response = await fetch(`${baseUrl}${imagePath}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  }
  // Local path — fetch via HTTP
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  try {
    const response = await fetch(`${baseUrl}${imagePath}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': '3BOXES-Internal/1.0' },
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const mimeType = contentType.split(';')[0].trim()
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    // Try filesystem as fallback (local dev only)
    if (!process.env.VERCEL) {
      try {
        const { existsSync, readFileSync } = await import('fs')
        const { join } = await import('path')
        const fullPath = join(process.cwd(), 'public', imagePath)
        if (!existsSync(fullPath)) return null
        const buffer = readFileSync(fullPath)
        const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
        return `data:${mimeType};base64,${buffer.toString('base64')}`
      } catch {
        return null
      }
    }
    return null
  }
}

// ── Data URL Helpers ────────────────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/)
  return match ? match[1] : 'image/png'
}

// ── Strategy 1: IDM-VTON HuggingFace Space ─────────────────────────

const IDM_VTON_URL = 'https://yisol-idm-vton.hf.space'

function getGarmentDescription(categorySlug: string, productName: string): string {
  const cat = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  if (cat.includes('saree') || cat.includes('women-saree'))
    return `A beautiful saree - ${productName}. Traditional Indian garment with elegant drape.`
  if (cat.includes('jewel') || cat.includes('women-jewel')) {
    if (name.includes('earring') || name.includes('jhumka')) return `Elegant earrings - ${productName}`
    if (name.includes('necklace') || name.includes('pendant') || name.includes('choker')) return `Beautiful necklace - ${productName}`
    if (name.includes('bracelet') || name.includes('bangle') || name.includes('kada')) return `Elegant bracelet - ${productName}`
    if (name.includes('ring')) return `Beautiful ring - ${productName}`
    return `Jewelry piece - ${productName}`
  }
  if (cat.includes('watch')) return `Luxury watch - ${productName}`
  if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('t-shirt'))
    return `A shirt - ${productName}. Well-fitted casual wear.`
  if (cat.includes('fashion') || cat.includes('dress') || cat.includes('women-fashion'))
    return `A fashion outfit - ${productName}. Stylish and well-fitted.`
  return `A garment - ${productName}`
}

async function uploadImageToSpace(
  imageDataUrl: string,
  filename: string,
  headers: Record<string, string>,
): Promise<string> {
  const base64 = dataUrlToBase64(imageDataUrl)
  const mime = getMimeType(imageDataUrl)
  const ext = mime.split('/')[1] || 'png'
  const buffer = Buffer.from(base64, 'base64')

  const formData = new FormData()
  formData.append('files', new Blob([new Uint8Array(buffer)], { type: mime }), `${filename}.${ext}`)

  const uploadRes = await fetch(`${IDM_VTON_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
    signal: AbortSignal.timeout(30000),
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => 'unknown')
    throw new Error(`Upload failed (${uploadRes.status}): ${errText.substring(0, 200)}`)
  }

  const contentType = uploadRes.headers.get('content-type') || ''
  let paths: string[]

  if (contentType.includes('json')) {
    paths = await uploadRes.json()
  } else {
    const responseText = await uploadRes.text()
    try {
      paths = JSON.parse(responseText)
    } catch {
      if (responseText.startsWith('/tmp/') || responseText.startsWith('/')) {
        return responseText
      }
      throw new Error(`Unexpected upload response: ${responseText.substring(0, 200)}`)
    }
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('Upload returned empty paths array')
  }

  return paths[0]
}

async function downloadResultImage(url: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': '3BOXES-IDM-VTON/1.0',
    }
    const token = process.env.HF_API_TOKEN
    if (token) headers['Authorization'] = `Bearer ${token}`

    const downloadRes = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000),
    })

    if (!downloadRes.ok) return null

    const contentType = downloadRes.headers.get('content-type') || 'image/png'
    const mimeType = contentType.split(';')[0].trim()

    if (mimeType.startsWith('image/')) {
      const buffer = Buffer.from(await downloadRes.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    }
    return null
  } catch {
    return null
  }
}

/**
 * Strategy 1: IDM-VTON virtual try-on with HARD timeout.
 * Returns the result image as base64 data URL, or null if it fails/times out.
 */
async function tryIDMVTON(
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  hardTimeoutMs: number,
): Promise<{ imageUrl: string; strategy: string } | null> {
  const startTime = Date.now()

  const token = process.env.HF_API_TOKEN
  const headers: Record<string, string> = {
    'User-Agent': '3BOXES-IDM-VTON/1.0',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    // Step 1: Upload person image
    let personPath: string
    try {
      personPath = await uploadImageToSpace(selfieData, 'person', headers)
      console.log(`[try-on] IDM-VTON: Person uploaded to: ${personPath}`)
    } catch (uploadErr) {
      console.error(`[try-on] IDM-VTON: Person upload failed:`, uploadErr instanceof Error ? uploadErr.message : String(uploadErr))
      return null
    }

    if (Date.now() - startTime > hardTimeoutMs) {
      console.log('[try-on] IDM-VTON: Timed out after person upload')
      return null
    }

    // Step 2: Upload garment image
    let garmentPath: string
    try {
      garmentPath = await uploadImageToSpace(productImageBase64, 'garment', headers)
      console.log(`[try-on] IDM-VTON: Garment uploaded to: ${garmentPath}`)
    } catch (uploadErr) {
      console.error(`[try-on] IDM-VTON: Garment upload failed:`, uploadErr instanceof Error ? uploadErr.message : String(uploadErr))
      return null
    }

    if (Date.now() - startTime > hardTimeoutMs) {
      console.log('[try-on] IDM-VTON: Timed out after garment upload')
      return null
    }

    // Step 3: Call the tryon endpoint
    const garmentDes = getGarmentDescription(categorySlug, productName)

    const callBody = {
      data: [
        // Human (ImageEditor format) — background is the person image
        {
          background: { path: personPath, meta: { _type: 'gradio.FileData' } },
          layers: [],
          composite: null,
        },
        // Garment (simple Image component)
        { path: garmentPath, meta: { _type: 'gradio.FileData' } },
        // garment description
        garmentDes,
        // is_checked (auto-masking)
        true,
        // is_checked_crop — FALSE to preserve full body
        false,
        // denoise_steps
        30,
        // seed
        42,
      ],
    }

    console.log(`[try-on] IDM-VTON: Calling /call/tryon`)

    const callRes = await fetch(`${IDM_VTON_URL}/call/tryon`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callBody),
      signal: AbortSignal.timeout(30000),
    })

    if (!callRes.ok) {
      const errText = await callRes.text().catch(() => 'unknown')
      console.error(`[try-on] IDM-VTON: Call tryon failed ${callRes.status}: ${errText.substring(0, 300)}`)
      return null
    }

    // Parse event_id
    const callResponseText = await callRes.text()
    let eventId: string | null = null

    try {
      const callJson = JSON.parse(callResponseText)
      eventId = callJson.event_id
    } catch {
      const eventIdMatch = callResponseText.match(/event_id["\s:]+([a-f0-9-]+)/i)
      if (eventIdMatch) {
        eventId = eventIdMatch[1]
      }
    }

    if (!eventId) {
      console.error(`[try-on] IDM-VTON: Could not parse event_id: ${callResponseText.substring(0, 300)}`)
      return null
    }

    console.log(`[try-on] IDM-VTON: Event ID: ${eventId}`)

    // Step 4: Poll for the result with remaining time
    const maxPollTime = hardTimeoutMs - (Date.now() - startTime) - 3000 // Leave 3s buffer
    const pollStart = Date.now()

    while (Date.now() - pollStart < maxPollTime) {
      await new Promise(r => setTimeout(r, 2000))

      try {
        const pollRes = await fetch(`${IDM_VTON_URL}/call/tryon/${eventId}`, {
          headers,
          signal: AbortSignal.timeout(15000),
        })

        if (!pollRes.ok) {
          if (pollRes.status === 404) continue
          continue
        }

        const pollText = await pollRes.text()

        // Check for error event
        if (pollText.includes('event: error') || pollText.includes('event:error')) {
          console.error(`[try-on] IDM-VTON: Error event: ${pollText.substring(0, 500)}`)
          return null
        }

        // Check for complete event
        if (pollText.includes('event: complete') || pollText.includes('event:complete')) {
          console.log(`[try-on] IDM-VTON: Got complete event!`)

          // Extract image URL
          const urlMatches = [...pollText.matchAll(/"url":\s*"([^"]+)"/g)]
          if (urlMatches.length > 0) {
            const imageUrl = urlMatches[0][1]
            console.log(`[try-on] IDM-VTON: Got result image URL: ${imageUrl.substring(0, 100)}`)
            const result = await downloadResultImage(imageUrl)
            if (result) {
              return { imageUrl: result, strategy: 'idm-vton' }
            }
          }

          // Try path-based URL
          const pathMatches = [...pollText.matchAll(/"path":\s*"([^"]+)"/g)]
          if (pathMatches.length > 0) {
            const imagePath = pathMatches[0][1]
            const fullUrl = `${IDM_VTON_URL}/file=${imagePath}`
            const result = await downloadResultImage(fullUrl)
            if (result) {
              return { imageUrl: result, strategy: 'idm-vton' }
            }
          }

          console.error(`[try-on] IDM-VTON: Could not extract image from complete event`)
          return null
        }

        // Still processing
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        console.log(`[try-on] IDM-VTON: Still processing... (${elapsed}s)`)
      } catch (pollErr) {
        const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr)
        if (errMsg.includes('ECONNRESET') || errMsg.includes('socket')) {
          continue
        }
        console.error(`[try-on] IDM-VTON: Poll error: ${errMsg.substring(0, 200)}`)
      }
    }

    console.log(`[try-on] IDM-VTON: Timed out after ${Math.floor((Date.now() - startTime) / 1000)}s`)
    return null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[try-on] IDM-VTON error:', errMsg.substring(0, 300))
    return null
  }
}

// ── Strategy 2: ZAI Dual-Image Edit ────────────────────────────────

async function tryZAIImageEdit(
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  hardTimeoutMs: number,
): Promise<{ imageUrl: string; strategy: string } | null> {
  try {
    const { createZAI } = await import('@/lib/zai')
    const zai = await createZAI()

    // Build a prompt for the image edit
    const cat = (categorySlug || '').toLowerCase()
    let bodyType = 'Professional fashion photograph, upper body'
    let placement = 'wearing the product'

    if (cat.includes('saree')) {
      bodyType = 'Full-body professional fashion photograph'
      placement = 'draped in the saree in traditional Indian style with pallu over the left shoulder'
    } else if (cat.includes('fashion') || cat.includes('dress')) {
      bodyType = 'Full-body professional fashion photograph'
      placement = 'wearing the outfit'
    } else if (cat.includes('jewel') || cat.includes('women-jewel')) {
      bodyType = 'Close-up beauty photograph from chest up'
      const name = productName.toLowerCase()
      if (name.includes('earring') || name.includes('jhumka')) placement = 'wearing the earrings'
      else if (name.includes('necklace') || name.includes('pendant')) placement = 'wearing the necklace'
      else if (name.includes('bracelet') || name.includes('bangle')) placement = 'wearing the bracelet'
      else if (name.includes('ring')) placement = 'wearing the ring'
      else placement = 'wearing the jewelry'
    } else if (cat.includes('watch')) {
      bodyType = 'Close-up photograph from waist up'
      placement = 'wearing the watch on the wrist'
    } else if (cat.includes('shirt') || cat.includes('tshirt')) {
      bodyType = 'Full-body professional fashion photograph'
      placement = 'wearing the shirt'
    }

    const prompt = `${bodyType}. Show this EXACT person ${placement}. The product is "${productName}". Preserve the person's face exactly - same eyes, nose, lips, jawline. Do NOT change skin tone or hair. The product must look naturally worn with proper shadows and fit. Studio-quality photorealistic result.`

    console.log(`[try-on] ZAI: Attempting dual-image edit for "${productName}"`)

    const response = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [
          { url: selfieData },
          { url: productImageBase64 },
        ],
        size: '1024x1536',
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), hardTimeoutMs)),
    ])

    if (response?.data?.[0]?.base64) {
      console.log(`[try-on] ZAI: Dual-image edit succeeded!`)
      return {
        imageUrl: `data:image/png;base64,${response.data[0].base64}`,
        strategy: 'zai-dual-edit',
      }
    }

    // If dual-image edit failed, try single-image edit with just the selfie
    console.log(`[try-on] ZAI: Dual-image edit returned no result, trying single-image edit`)

    const singleResponse = await Promise.race([
      zai.images.generations.edit({
        prompt,
        images: [{ url: selfieData }],
        size: '1024x1536',
      } as any),
      new Promise<null>(r => setTimeout(() => r(null), 15000)),
    ])

    if (singleResponse?.data?.[0]?.base64) {
      console.log(`[try-on] ZAI: Single-image edit succeeded!`)
      return {
        imageUrl: `data:image/png;base64,${singleResponse.data[0].base64}`,
        strategy: 'zai-selfie-edit',
      }
    }

    console.log(`[try-on] ZAI: Both edit strategies returned no result`)
    return null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[try-on] ZAI error:', errMsg.substring(0, 300))
    return null
  }
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const pipelineStart = Date.now()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { productId, selfieData, productImageUrl, productName, categorySlug } = body

  if (!productId || !selfieData) {
    return NextResponse.json({ error: 'Product ID and selfie are required' }, { status: 400 })
  }

  console.log(`[try-on] POST request for product: ${productName} (${productId})`)

  // Resolve product image base64
  const clientProvidedBase64 = body.productImageBase64 as string | undefined
  let resolvedBase64: string | null = null

  if (!clientProvidedBase64 && productImageUrl) {
    resolvedBase64 = await getProductImageBase64(productImageUrl)
  }

  const finalProductImageBase64 = clientProvidedBase64 || resolvedBase64

  if (!finalProductImageBase64) {
    console.log('[try-on] No product image available, returning canvas mode')
    return NextResponse.json({
      mode: 'canvas',
      code: 'AI_CANVAS_MODE',
      message: 'Product image not available for AI processing.',
      productImageBase64: null,
      productImageUrl: productImageUrl || null,
      productName: productName || null,
      categorySlug: categorySlug || null,
    })
  }

  // Check if we still have time left
  const elapsedSoFar = Date.now() - pipelineStart
  if (elapsedSoFar > TOTAL_HARD_TIMEOUT_MS - 10000) {
    console.log(`[try-on] Already used ${elapsedSoFar}ms, not enough time for AI. Returning canvas mode.`)
    return NextResponse.json({
      mode: 'canvas',
      code: 'AI_CANVAS_MODE',
      message: 'Image preparation took too long. A style overlay preview will be shown instead.',
      productImageBase64: finalProductImageBase64,
      productImageUrl: productImageUrl || null,
      productName: productName || null,
      categorySlug: categorySlug || null,
    })
  }

  // ── Strategy 1: IDM-VTON HuggingFace Space ──────────────────────
  const idmVtonTimeout = Math.min(IDM_VTON_TIMEOUT_MS, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 5000)
  if (idmVtonTimeout > 10000) {
    console.log(`[try-on] Strategy 1: IDM-VTON (timeout: ${idmVtonTimeout}ms)`)

    const idmResult = await tryIDMVTON(
      selfieData,
      finalProductImageBase64,
      productName || 'Product',
      categorySlug || '',
      idmVtonTimeout,
    )

    if (idmResult) {
      console.log(`[try-on] IDM-VTON success! Strategy: ${idmResult.strategy} (${Date.now() - pipelineStart}ms)`)
      return NextResponse.json({
        success: true,
        imageUrl: idmResult.imageUrl,
        strategy: idmResult.strategy,
        productName,
        categorySlug,
      })
    }

    console.log(`[try-on] IDM-VTON failed (${Date.now() - pipelineStart}ms elapsed)`)
  }

  // ── Strategy 2: ZAI Image Edit ──────────────────────────────────
  const zaiTimeout = Math.min(ZAI_EDIT_TIMEOUT_MS, TOTAL_HARD_TIMEOUT_MS - (Date.now() - pipelineStart) - 3000)
  if (zaiTimeout > 5000) {
    console.log(`[try-on] Strategy 2: ZAI Image Edit (timeout: ${zaiTimeout}ms)`)

    const zaiResult = await tryZAIImageEdit(
      selfieData,
      finalProductImageBase64,
      productName || 'Product',
      categorySlug || '',
      zaiTimeout,
    )

    if (zaiResult) {
      console.log(`[try-on] ZAI success! Strategy: ${zaiResult.strategy} (${Date.now() - pipelineStart}ms)`)
      return NextResponse.json({
        success: true,
        imageUrl: zaiResult.imageUrl,
        strategy: zaiResult.strategy,
        productName,
        categorySlug,
      })
    }

    console.log(`[try-on] ZAI failed (${Date.now() - pipelineStart}ms elapsed)`)
  }

  // ── All AI strategies failed — return canvas mode ────────────────
  const totalTime = Date.now() - pipelineStart
  console.log(`[try-on] All AI strategies failed after ${totalTime}ms, returning canvas mode`)

  return NextResponse.json({
    mode: 'canvas',
    code: 'AI_CANVAS_MODE',
    message: totalTime > TOTAL_HARD_TIMEOUT_MS - 5000
      ? 'AI virtual try-on timed out. Please try again — it usually works on the second attempt!'
      : 'AI virtual try-on is currently busy. A style overlay preview will be shown instead.',
    productImageBase64: finalProductImageBase64,
    productImageUrl: productImageUrl || null,
    productName: productName || null,
    categorySlug: categorySlug || null,
  })
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────
// Kept for backward compatibility — no longer uses job polling

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  return NextResponse.json({
    status: 'failed',
    error: 'Job polling is no longer supported. Please use the synchronous API.',
    jobId,
  })
}
