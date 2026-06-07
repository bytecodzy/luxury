/**
 * HuggingFace IDM-VTON Virtual Try-On Integration v5
 *
 * Uses the yisol/IDM-VTON HuggingFace Space for REAL virtual try-on.
 * This is a dedicated virtual try-on model that AI-applies garments to person images.
 *
 * Strategy Priority:
 * 1. Manual Gradio REST API (PRIMARY — most reliable, no session issues)
 * 2. @gradio/client (FALLBACK — has session issues, but handles wake-up)
 * 3. HuggingFace Inference API (LAST RESORT — always available, lower quality)
 *
 * The Manual Gradio REST API directly uploads images to the Space's upload endpoint
 * and then submits the tryon job via the /call/tryon endpoint. This avoids the
 * "404: Session not found" errors that @gradio/client sometimes produces.
 *
 * IMPORTANT: Set HF_API_TOKEN environment variable for better queue priority.
 * Get your free token at: https://huggingface.co/settings/tokens
 */

// ── Types ──────────────────────────────────────────────────────────

export interface HFTryOnInput {
  selfieData: string        // base64 data URL of the person's selfie
  productImageBase64: string // base64 data URL of the product image
  productName: string
  categorySlug: string
}

export interface HFTryOnResult {
  success: boolean
  imageUrl?: string          // base64 data URL of the result
  strategy: string
  error?: string
}

type ProgressCallback = (message: string) => void

// ── Configuration ──────────────────────────────────────────────────

const IDM_VTON_SPACE = 'yisol/IDM-VTON'
const IDM_VTON_URL = `https://yisol-idm-vton.hf.space`

export function isHFAvailable(): boolean {
  // Always available — the Space is public and doesn't require a token
  return true
}

/**
 * Check the status of the IDM-VTON Space via HuggingFace API.
 */
export async function checkIDMVTONSpaceStatus(): Promise<{
  running: boolean
  status: string
  stage?: string
}> {
  const token = process.env.HF_API_TOKEN
  try {
    const headers: Record<string, string> = {
      'User-Agent': '3BOXES-IDM-VTON/1.0',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(
      `https://huggingface.co/api/spaces/${IDM_VTON_SPACE}`,
      {
        headers,
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) {
      return { running: false, status: `api_error_${response.status}` }
    }

    const data = await response.json()
    const runtime = data?.runtime
    const stage = runtime?.stage || 'Unknown'

    return {
      running: runtime?.stage === 'RUNNING',
      status: stage,
      stage,
    }
  } catch {
    return { running: false, status: 'unreachable' }
  }
}

// ── Data URL Helpers ───────────────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  if (match) return match[1]
  return dataUrl
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrlToBase64(dataUrl)
  return Buffer.from(base64, 'base64')
}

function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/)
  return match ? match[1] : 'image/png'
}

// ── Category-specific garment descriptions ──────────────────────────

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

// ── Strategy 1: Manual Gradio REST API (PRIMARY) ──────────────────
//
// This is the most reliable strategy. It directly:
// 1. Uploads the person image to the Space
// 2. Uploads the garment image to the Space
// 3. Calls /call/tryon with the uploaded file references
// 4. Polls /call/tryon/{event_id} for the result
//
// No session management needed — avoids "404: Session not found" errors.

async function manualGradioTryOn(
  input: HFTryOnInput,
  onProgress?: ProgressCallback,
): Promise<HFTryOnResult> {
  const token = process.env.HF_API_TOKEN

  try {
    onProgress?.('Uploading your photo to AI...')

    const headers: Record<string, string> = {
      'User-Agent': '3BOXES-IDM-VTON/1.0',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Step 1: Upload person image
    const personBuffer = dataUrlToBuffer(input.selfieData)
    const personMime = getMimeType(input.selfieData)
    const personExt = personMime.split('/')[1] || 'png'

    const personFormData = new FormData()
    personFormData.append('files', new Blob([new Uint8Array(personBuffer)], { type: personMime }), `person.${personExt}`)

    const uploadPersonRes = await fetch(`${IDM_VTON_URL}/upload`, {
      method: 'POST',
      headers,
      body: personFormData,
      signal: AbortSignal.timeout(30000),
    })

    if (!uploadPersonRes.ok) {
      const errText = await uploadPersonRes.text().catch(() => 'unknown')
      console.error(`[hf-tryon] Manual: Person upload failed ${uploadPersonRes.status}: ${errText.substring(0, 200)}`)
      return { success: false, strategy: 'manual-gradio', error: `Person upload failed: ${uploadPersonRes.status}` }
    }

    const personPath = await uploadPersonRes.text()
    console.log(`[hf-tryon] Manual: Person uploaded to: ${personPath}`)

    // Step 2: Upload garment image
    onProgress?.('Uploading product image to AI...')
    const garmentBuffer = dataUrlToBuffer(input.productImageBase64)
    const garmentMime = getMimeType(input.productImageBase64)
    const garmentExt = garmentMime.split('/')[1] || 'png'

    const garmentFormData = new FormData()
    garmentFormData.append('files', new Blob([new Uint8Array(garmentBuffer)], { type: garmentMime }), `garment.${garmentExt}`)

    const uploadGarmentRes = await fetch(`${IDM_VTON_URL}/upload`, {
      method: 'POST',
      headers,
      body: garmentFormData,
      signal: AbortSignal.timeout(30000),
    })

    if (!uploadGarmentRes.ok) {
      const errText = await uploadGarmentRes.text().catch(() => 'unknown')
      console.error(`[hf-tryon] Manual: Garment upload failed ${uploadGarmentRes.status}: ${errText.substring(0, 200)}`)
      return { success: false, strategy: 'manual-gradio', error: `Garment upload failed: ${uploadGarmentRes.status}` }
    }

    const garmentPath = await uploadGarmentRes.text()
    console.log(`[hf-tryon] Manual: Garment uploaded to: ${garmentPath}`)

    // Step 3: Call the tryon endpoint
    onProgress?.('AI is generating your try-on...')
    const garmentDes = getGarmentDescription(input.categorySlug, input.productName)

    const callBody = {
      data: [
        { path: personPath, meta: { _type: 'gradio.FileData' } },
        { path: garmentPath, meta: { _type: 'gradio.FileData' } },
        garmentDes,
        true,   // is_checked (auto-masking)
        false,  // is_checked_crop
        30,     // denoise_steps
        42,     // seed
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
      console.error(`[hf-tryon] Manual: Call tryon failed ${callRes.status}: ${errText.substring(0, 300)}`)

      // If "No person detected" or similar error, fail quickly
      if (errText.includes('No person') || errText.includes('no person') || errText.includes('event: error')) {
        return { success: false, strategy: 'manual-gradio', error: 'No person detected in the image. Please use a clear selfie with a visible person.' }
      }

      return { success: false, strategy: 'manual-gradio', error: `Tryon call failed: ${callRes.status}` }
    }

    // Parse the event_id from the response
    const callResponseText = await callRes.text()
    let eventId: string | null = null

    // The response can be either JSON {"event_id": "..."} or SSE format "event: complete\ndata: ..."
    try {
      const callJson = JSON.parse(callResponseText)
      eventId = callJson.event_id
    } catch {
      // Try SSE format
      const eventIdMatch = callResponseText.match(/event_id["\s:]+([a-f0-9-]+)/i)
      if (eventIdMatch) {
        eventId = eventIdMatch[1]
      }
    }

    if (!eventId) {
      // The response might contain the result directly (SSE format)
      if (callResponseText.includes('event: complete') || callResponseText.includes('event:complete')) {
        // Try to extract the image URL from the SSE data
        const urlMatch = callResponseText.match(/"url":\s*"([^"]+)"/)
        if (urlMatch) {
          const imageUrl = urlMatch[1]
          console.log('[hf-tryon] Manual: Got result directly from call response')
          return await downloadResultImage(imageUrl, 'manual-gradio')
        }
      }

      console.error(`[hf-tryon] Manual: Could not parse event_id from response: ${callResponseText.substring(0, 300)}`)
      return { success: false, strategy: 'manual-gradio', error: 'Could not parse tryon response' }
    }

    console.log(`[hf-tryon] Manual: Event ID: ${eventId}`)

    // Step 4: Poll for the result
    const maxPolls = 90  // 90 × 2s = 180s max wait
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 2000))

      if (i % 5 === 0) {
        onProgress?.(`AI is processing your try-on... (${Math.floor(i * 2)}s)`)
      }

      try {
        const pollRes = await fetch(`${IDM_VTON_URL}/call/tryon/${eventId}`, {
          headers,
          signal: AbortSignal.timeout(15000),
        })

        if (!pollRes.ok) {
          if (pollRes.status === 404) {
            // Event not found yet, keep polling
            continue
          }
          console.error(`[hf-tryon] Manual: Poll failed ${pollRes.status}`)
          continue
        }

        const pollText = await pollRes.text()

        // Check for error event
        if (pollText.includes('event: error') || pollText.includes('event:error')) {
          const errorMsg = pollText.substring(0, 500)
          console.error(`[hf-tryon] Manual: Error event: ${errorMsg}`)

          if (errorMsg.includes('No person') || errorMsg.includes('no person')) {
            return { success: false, strategy: 'manual-gradio', error: 'No person detected in the image. Please use a clear selfie.' }
          }
          return { success: false, strategy: 'manual-gradio', error: `IDM-VTON error: ${errorMsg.substring(0, 200)}` }
        }

        // Check for complete event with result
        if (pollText.includes('event: complete') || pollText.includes('event:complete')) {
          // Extract image URL from the response
          // Format: event: complete\ndata: [{"path": "...", "url": "..."}, ...]
          const urlMatch = pollText.match(/"url":\s*"([^"]+)"/g)
          if (urlMatch && urlMatch.length > 0) {
            // First URL is the try-on result, second is the masked image
            const firstUrlMatch = urlMatch[0].match(/"url":\s*"([^"]+)"/)
            if (firstUrlMatch) {
              const imageUrl = firstUrlMatch[1]
              console.log(`[hf-tryon] Manual: Got result image URL: ${imageUrl.substring(0, 100)}...`)
              return await downloadResultImage(imageUrl, 'manual-gradio')
            }
          }

          // Try path-based URL
          const pathMatch = pollText.match(/"path":\s*"([^"]+)"/g)
          if (pathMatch && pathMatch.length > 0) {
            const firstPathMatch = pathMatch[0].match(/"path":\s*"([^"]+)"/)
            if (firstPathMatch) {
              const imagePath = firstPathMatch[1]
              const fullUrl = `${IDM_VTON_URL}/file=${imagePath}`
              console.log(`[hf-tryon] Manual: Got result image path: ${imagePath}`)
              return await downloadResultImage(fullUrl, 'manual-gradio')
            }
          }

          console.error(`[hf-tryon] Manual: Could not extract image from complete event: ${pollText.substring(0, 500)}`)
          return { success: false, strategy: 'manual-gradio', error: 'Could not extract result image from tryon response' }
        }

        // Still processing — heartbeat or generating event
        // Continue polling
      } catch (pollErr) {
        const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr)
        // ECONNRESET or socket errors are common during long polls — retry
        if (errMsg.includes('ECONNRESET') || errMsg.includes('socket') || errMsg.includes('aborted')) {
          console.log(`[hf-tryon] Manual: Connection reset during poll ${i}, retrying...`)
          continue
        }
        console.error(`[hf-tryon] Manual: Poll error: ${errMsg.substring(0, 200)}`)
      }
    }

    return { success: false, strategy: 'manual-gradio', error: 'IDM-VTON timed out after 180s' }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[hf-tryon] Manual Gradio error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'manual-gradio', error: errMsg }
  }
}

/**
 * Download a result image from the Space and convert to base64 data URL.
 */
async function downloadResultImage(url: string, strategy: string): Promise<HFTryOnResult> {
  try {
    const downloadHeaders: Record<string, string> = {
      'User-Agent': '3BOXES-IDM-VTON/1.0',
    }
    const token = process.env.HF_API_TOKEN
    if (token) downloadHeaders['Authorization'] = `Bearer ${token}`

    const downloadRes = await fetch(url, {
      headers: downloadHeaders,
      signal: AbortSignal.timeout(30000),
    })

    if (!downloadRes.ok) {
      return { success: false, strategy, error: `Failed to download result image: ${downloadRes.status}` }
    }

    const contentType = downloadRes.headers.get('content-type') || 'image/png'
    const mimeType = contentType.split(';')[0].trim()

    if (mimeType.startsWith('image/')) {
      const buffer = Buffer.from(await downloadRes.arrayBuffer())
      const base64 = buffer.toString('base64')
      return {
        success: true,
        imageUrl: `data:${mimeType};base64,${base64}`,
        strategy,
      }
    }

    return { success: false, strategy, error: `Unexpected content type: ${mimeType}` }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[hf-tryon] Download result error:', errMsg.substring(0, 200))
    return { success: false, strategy, error: `Failed to download result: ${errMsg.substring(0, 100)}` }
  }
}

// ── Strategy 2: @gradio/client (FALLBACK) ─────────────────────────
//
// Uses the official @gradio/client library to connect to the Space.
// This handles Space wake-up (sleeping → running) automatically.
// However, it can produce "404: Session not found" errors.

async function gradioClientTryOn(
  input: HFTryOnInput,
  onProgress?: ProgressCallback,
): Promise<HFTryOnResult> {
  try {
    // Dynamic import to avoid issues if package is not available
    const { Client } = await import('@gradio/client')

    onProgress?.('Connecting to AI try-on service...')

    const token = process.env.HF_API_TOKEN || undefined

    // Connect to the Space — this also wakes it up if sleeping
    const connectOptions: any = token ? { hf_token: token } : undefined
    const client = await Client.connect(IDM_VTON_SPACE, connectOptions)

    onProgress?.('Uploading images and starting try-on...')

    // Convert data URLs to Blobs
    const personBuffer = dataUrlToBuffer(input.selfieData)
    const personBlob = new Blob([new Uint8Array(personBuffer)], { type: getMimeType(input.selfieData) })

    const garmentBuffer = dataUrlToBuffer(input.productImageBase64)
    const garmentBlob = new Blob([new Uint8Array(garmentBuffer)], { type: getMimeType(input.productImageBase64) })

    const garmentDes = getGarmentDescription(input.categorySlug, input.productName)

    // Call the tryon endpoint
    const result = await client.predict('/tryon', [
      { data: personBlob, path: 'person.png', meta: { _type: 'gradio.FileData' } },
      { data: garmentBlob, path: 'garment.png', meta: { _type: 'gradio.FileData' } },
      garmentDes,
      true,   // is_checked (auto-masking)
      false,  // is_checked_crop
      30,     // denoise_steps
      42,     // seed
    ])

    // Extract the result image
    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
      const firstResult = result.data[0]
      if (firstResult?.url) {
        return await downloadResultImage(firstResult.url, 'gradio-client')
      }
      if (firstResult?.path) {
        const fullUrl = `${IDM_VTON_URL}/file=${firstResult.path}`
        return await downloadResultImage(fullUrl, 'gradio-client')
      }
    }

    return { success: false, strategy: 'gradio-client', error: 'No result image in response' }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)

    // Handle common Gradio errors
    if (errMsg.includes('404') || errMsg.includes('Session not found')) {
      console.error('[hf-tryon] Gradio client session error (falling back):', errMsg.substring(0, 200))
      return { success: false, strategy: 'gradio-client', error: 'Session not found — use manual API instead' }
    }
    if (errMsg.includes('No person') || errMsg.includes('no person')) {
      return { success: false, strategy: 'gradio-client', error: 'No person detected in the image' }
    }
    if (errMsg.includes('terminated') || errMsg.includes('CANCELLED')) {
      return { success: false, strategy: 'gradio-client', error: 'Try-on was cancelled or space is restarting' }
    }

    console.error('[hf-tryon] Gradio client error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'gradio-client', error: errMsg }
  }
}

// ── Strategy 3: HuggingFace Inference API (LAST RESORT) ────────────
//
// Uses HuggingFace's free Inference API with FLUX.1-schnell for text-to-image.
// This is NOT a dedicated try-on model — it generates an image from a prompt.
// Quality is lower but it's always available.

async function inferenceApiTryOn(
  input: HFTryOnInput,
  onProgress?: ProgressCallback,
): Promise<HFTryOnResult> {
  const token = process.env.HF_API_TOKEN
  if (!token) {
    return { success: false, strategy: 'hf-inference', error: 'HF_API_TOKEN not configured for inference API' }
  }

  try {
    onProgress?.('Generating style preview with AI...')

    const cat = (input.categorySlug || '').toLowerCase()
    let bodyType = 'Professional fashion photograph'
    if (cat.includes('saree')) bodyType = 'Full-body professional fashion photograph'
    else if (cat.includes('fashion') || cat.includes('dress')) bodyType = 'Full-body professional fashion photograph'
    else if (cat.includes('shirt')) bodyType = 'Upper-body professional fashion photograph'

    const prompt = `${bodyType} of a person wearing "${input.productName}". Photorealistic, studio lighting, the product fits naturally on the person. 8K quality.`

    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 4,
            guidance_scale: 0,
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      console.error(`[hf-tryon] Inference API returned ${response.status}: ${errorText.substring(0, 300)}`)
      return {
        success: false,
        strategy: 'hf-inference',
        error: `Inference API returned ${response.status}`,
      }
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    if (contentType.includes('image')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = contentType.split(';')[0].trim()
      return {
        success: true,
        imageUrl: `data:${mimeType};base64,${base64}`,
        strategy: 'hf-inference',
      }
    }

    return { success: false, strategy: 'hf-inference', error: 'Unexpected response format from Inference API' }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[hf-tryon] Inference API error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'hf-inference', error: errMsg }
  }
}

// ── Unified HuggingFace Try-On Function ─────────────────────────────

/**
 * Try HuggingFace virtual try-on with multiple strategies.
 * Priority: Manual Gradio REST API → @gradio/client → Inference API
 */
export async function hfTryOn(
  input: HFTryOnInput,
  onProgress?: ProgressCallback,
): Promise<HFTryOnResult> {
  console.log('[hf-tryon] Starting IDM-VTON try-on pipeline')

  // Check Space status first
  const spaceStatus = await checkIDMVTONSpaceStatus()
  console.log(`[hf-tryon] IDM-VTON Space status: ${spaceStatus.status} (running: ${spaceStatus.running})`)

  // If Space is building, wait a bit and inform user
  if (spaceStatus.stage === 'BUILDING') {
    onProgress?.('AI model is updating, please wait...')
    // Wait up to 60s for build to complete
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const newStatus = await checkIDMVTONSpaceStatus()
      if (newStatus.running) break
      if (i % 5 === 0) {
        onProgress?.(`AI model is updating... (${(i + 1) * 2}s)`)
      }
    }
  }

  // If Space is sleeping, we need to wake it up
  if (spaceStatus.stage === 'SLEEPING' || spaceStatus.stage === 'STOPPED') {
    onProgress?.('Waking up AI model (this may take 30-60s)...')

    // @gradio/client can wake up a sleeping space, so try it first in this case
    console.log('[hf-tryon] Space is sleeping, using @gradio/client to wake it up')
    const clientResult = await gradioClientTryOn(input, onProgress)
    if (clientResult.success) return clientResult

    // If client failed, try manual API (may also wake the space via the upload)
    console.log('[hf-tryon] @gradio/client failed on sleeping space, trying manual API')
    const manualResult = await manualGradioTryOn(input, onProgress)
    if (manualResult.success) return manualResult

    // Both failed, try inference API as last resort
    console.log('[hf-tryon] Both Gradio strategies failed, trying inference API')
    return await inferenceApiTryOn(input, onProgress)
  }

  // Space is running (or unknown status) — try Manual API first (most reliable)
  // Strategy 1: Manual Gradio REST API
  console.log('[hf-tryon] Strategy 1: Manual Gradio REST API')
  const manualResult = await manualGradioTryOn(input, onProgress)
  if (manualResult.success) return manualResult
  console.log('[hf-tryon] Manual API failed:', manualResult.error)

  // Strategy 2: @gradio/client
  console.log('[hf-tryon] Strategy 2: @gradio/client')
  const clientResult = await gradioClientTryOn(input, onProgress)
  if (clientResult.success) return clientResult
  console.log('[hf-tryon] @gradio/client failed:', clientResult.error)

  // Strategy 3: HuggingFace Inference API
  console.log('[hf-tryon] Strategy 3: HuggingFace Inference API')
  const inferenceResult = await inferenceApiTryOn(input, onProgress)
  if (inferenceResult.success) return inferenceResult
  console.log('[hf-tryon] Inference API failed:', inferenceResult.error)

  return {
    success: false,
    strategy: 'none',
    error: 'All HuggingFace strategies failed. The IDM-VTON Space may be temporarily unavailable.',
  }
}
