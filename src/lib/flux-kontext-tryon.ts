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

function buildEditPrompt(input: TryOnInput): string {
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
    desc.includes('saree') || desc.includes('sari')
  ) {
    return (
      `${identityRule} ` +
      `Drape this person in a beautiful ${colors ? colors + ' ' : ''}${name}. ` +
      `The saree should be worn in traditional Indian style with pallu over the left shoulder, ` +
      `matching blouse, neatly pleated at the waist. Full-body view, photorealistic.`
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
    return `${identityRule} Show this person wearing the ${name} on their left wrist, watch face clearly visible. Photorealistic.`
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

  const prompt = buildEditPrompt(input)
  console.log(`[virtual-tryon] FLUX Kontext try-on: prompt="${prompt.substring(0, 100)}..."`)

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
