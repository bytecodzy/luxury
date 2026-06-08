import { NextRequest, NextResponse } from 'next/server'

// Maximum duration for Vercel serverless function (Pro plan = 60s)
export const maxDuration = 60

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

// ── IDM-VTON Integration ─────────────────────────────────────────

const IDM_VTON_URL = 'https://yisol-idm-vton.hf.space'

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : dataUrl
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/)
  return match ? match[1] : 'image/png'
}

function getGarmentDescription(categorySlug: string, productName: string): string {
  const cat = (categorySlug || '').toLowerCase()
  if (cat.includes('saree')) return `A beautiful saree - ${productName}. Traditional Indian garment with elegant drape.`
  if (cat.includes('jewel')) return `Elegant jewelry - ${productName}`
  if (cat.includes('watch')) return `Luxury watch - ${productName}`
  if (cat.includes('shirt') || cat.includes('tshirt')) return `A shirt - ${productName}. Well-fitted casual wear.`
  if (cat.includes('fashion') || cat.includes('dress')) return `A fashion outfit - ${productName}. Stylish and well-fitted.`
  return `A garment - ${productName}`
}

/**
 * Upload an image to the IDM-VTON Space.
 */
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

/**
 * Download a result image and convert to base64 data URL.
 */
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
 * Try IDM-VTON virtual try-on with a HARD 50-second timeout.
 * Returns the result image as a base64 data URL, or null if it fails/times out.
 */
async function tryIDMVTON(
  selfieData: string,
  productImageBase64: string,
  productName: string,
  categorySlug: string,
  onProgress?: (msg: string) => void,
): Promise<{ imageUrl: string; strategy: string } | null> {
  const HARD_TIMEOUT_MS = 50_000 // 50 seconds — hard server timeout
  const startTime = Date.now()

  const token = process.env.HF_API_TOKEN
  const headers: Record<string, string> = {
    'User-Agent': '3BOXES-IDM-VTON/1.0',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    // Step 1: Upload person image
    onProgress?.('Uploading your photo to AI...')
    let personPath: string
    try {
      personPath = await uploadImageToSpace(selfieData, 'person', headers)
      console.log(`[try-on] Person uploaded to: ${personPath}`)
    } catch (uploadErr) {
      console.error(`[try-on] Person upload failed:`, uploadErr instanceof Error ? uploadErr.message : String(uploadErr))
      return null
    }

    if (Date.now() - startTime > HARD_TIMEOUT_MS) return null

    // Step 2: Upload garment image
    onProgress?.('Uploading product image to AI...')
    let garmentPath: string
    try {
      garmentPath = await uploadImageToSpace(productImageBase64, 'garment', headers)
      console.log(`[try-on] Garment uploaded to: ${garmentPath}`)
    } catch (uploadErr) {
      console.error(`[try-on] Garment upload failed:`, uploadErr instanceof Error ? uploadErr.message : String(uploadErr))
      return null
    }

    if (Date.now() - startTime > HARD_TIMEOUT_MS) return null

    // Step 3: Call the tryon endpoint
    onProgress?.('AI is generating your try-on...')
    const garmentDes = getGarmentDescription(categorySlug, productName)

    const callBody = {
      data: [
        // Human (ImageEditor format)
        {
          background: { path: personPath, meta: { _type: 'gradio.FileData' } },
          layers: [],
          composite: null,
        },
        // Garment
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
      console.error(`[try-on] Call tryon failed ${callRes.status}: ${errText.substring(0, 300)}`)
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
      console.error(`[try-on] Could not parse event_id: ${callResponseText.substring(0, 300)}`)
      return null
    }

    console.log(`[try-on] Event ID: ${eventId}`)

    // Step 4: Poll for the result with remaining time
    const maxPollTime = HARD_TIMEOUT_MS - (Date.now() - startTime) - 5000 // Leave 5s buffer
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
          console.error(`[try-on] Error event: ${pollText.substring(0, 500)}`)
          return null
        }

        // Check for complete event
        if (pollText.includes('event: complete') || pollText.includes('event:complete')) {
          console.log(`[try-on] Got complete event!`)

          // Extract image URL
          const urlMatches = [...pollText.matchAll(/"url":\s*"([^"]+)"/g)]
          if (urlMatches.length > 0) {
            const imageUrl = urlMatches[0][1]
            console.log(`[try-on] Got result image URL: ${imageUrl.substring(0, 100)}`)
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

          console.error(`[try-on] Could not extract image from complete event`)
          return null
        }

        // Still processing — update progress
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        onProgress?.(`AI is processing... (${elapsed}s)`)
      } catch (pollErr) {
        const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr)
        if (errMsg.includes('ECONNRESET') || errMsg.includes('socket')) {
          continue
        }
        console.error(`[try-on] Poll error: ${errMsg.substring(0, 200)}`)
      }
    }

    console.log(`[try-on] IDM-VTON timed out after ${Math.floor((Date.now() - startTime) / 1000)}s`)
    return null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[try-on] IDM-VTON error:', errMsg.substring(0, 300))
    return null
  }
}

// ── POST /api/try-on ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
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

  // ── PRIMARY STRATEGY: IDM-VTON HuggingFace Space ──
  // This is the ONLY strategy — a dedicated virtual try-on model.
  // Hard 50-second timeout ensures we never exceed Vercel's 60s limit.
  console.log('[try-on] Attempting IDM-VTON virtual try-on...')

  const result = await tryIDMVTON(
    selfieData,
    finalProductImageBase64,
    productName || 'Product',
    categorySlug || '',
  )

  if (result) {
    console.log(`[try-on] IDM-VTON success! Strategy: ${result.strategy}`)
    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      strategy: result.strategy,
      productName,
      categorySlug,
    })
  }

  // ── IDM-VTON failed — return canvas mode ──
  console.log('[try-on] IDM-VTON failed, returning canvas mode')
  return NextResponse.json({
    mode: 'canvas',
    code: 'AI_CANVAS_MODE',
    message: 'AI virtual try-on is currently busy. A style overlay preview will be shown instead.',
    productImageBase64: finalProductImageBase64,
    productImageUrl: productImageUrl || null,
    productName: productName || null,
    categorySlug: categorySlug || null,
  })
}

// ── GET /api/try-on?jobId=xxx ──────────────────────────────────────
// Kept for backward compatibility with polling clients

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  // No job storage in the simplified route — return not found
  // The client should use the synchronous POST approach instead
  return NextResponse.json({
    status: 'failed',
    error: 'Job polling is no longer supported. Please use the synchronous API.',
    jobId,
  })
}
