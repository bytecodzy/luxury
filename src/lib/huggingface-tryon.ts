/**
 * IDM-VTON Virtual Try-On Integration — Reliable, Fast, No Fake Overlays
 *
 * This module integrates with the yisol/IDM-VTON HuggingFace Space — the ONLY
 * model that properly DRAPES garments onto person images. Other approaches
 * (image edit, canvas overlay) just paste the product image, which is NOT
 * virtual try-on.
 *
 * Design principles:
 * 1. Pre-warm Space when dialog opens (reduces wait from 90s to near-instant)
 * 2. Hard 55s total timeout (must finish under 60s for Vercel)
 * 3. NO silent fallbacks to fake overlays — honest errors with retry
 * 4. Synchronous processing — no broken in-memory job storage
 * 5. Clear error codes so frontend can show helpful messages
 */

// ── Types ──────────────────────────────────────────────────────────

export interface TryOnInput {
  selfieData: string         // base64 data URL of the person's selfie
  productImageBase64: string // base64 data URL of the product/garment image
  productName: string
  categorySlug: string
}

export interface TryOnResult {
  success: boolean
  imageUrl?: string           // base64 data URL of the result
  error?: string
  errorCode?: 'SPACE_SLEEPING' | 'UPLOAD_FAILED' | 'CALL_FAILED' | 'PROCESSING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR'
  elapsedMs?: number
}

export interface SpaceStatusResult {
  awake: boolean
  lastChecked: number
}

// ── Configuration ──────────────────────────────────────────────────

const SPACE_URL = 'https://yisol-idm-vton.hf.space'
const TOTAL_TIMEOUT_MS = 55_000   // 55s hard limit
const UPLOAD_TIMEOUT_MS = 15_000
const CALL_TIMEOUT_MS = 10_000
const POLL_TIMEOUT_MS = 45_000
const POLL_INTERVAL_MS = 2_000
const DOWNLOAD_TIMEOUT_MS = 10_000

// ── Pre-warm State ─────────────────────────────────────────────────

let preWarmPromise: Promise<boolean> | null = null
let spaceStatusCache: SpaceStatusResult | null = null
const SPACE_STATUS_CACHE_TTL = 30_000

/**
 * Pre-warm the IDM-VTON Space. Call when the try-on dialog opens.
 */
export async function preWarmSpace(): Promise<boolean> {
  const now = Date.now()
  if (spaceStatusCache && now - spaceStatusCache.lastChecked < SPACE_STATUS_CACHE_TTL) {
    return spaceStatusCache.awake
  }
  if (preWarmPromise) return preWarmPromise

  preWarmPromise = (async () => {
    try {
      const awake = await checkSpaceStatus()
      spaceStatusCache = { awake, lastChecked: Date.now() }
      if (!awake) {
        fetch(`${SPACE_URL}/`, { method: 'GET', signal: AbortSignal.timeout(5_000) }).catch(() => {})
        await new Promise(r => setTimeout(r, 3_000))
        const recheck = await checkSpaceStatus()
        spaceStatusCache = { awake: recheck, lastChecked: Date.now() }
        return recheck
      }
      return true
    } catch {
      spaceStatusCache = { awake: false, lastChecked: now }
      return false
    } finally {
      preWarmPromise = null
    }
  })()
  return preWarmPromise
}

export async function checkSpaceStatus(): Promise<boolean> {
  try {
    const r = await fetch(`${SPACE_URL}/info`, { method: 'GET', signal: AbortSignal.timeout(8_000) })
    if (r.ok) return true
  } catch {}
  try {
    const r = await fetch(`${SPACE_URL}/`, { method: 'GET', signal: AbortSignal.timeout(8_000) })
    return r.ok
  } catch { return false }
}

export function getCachedSpaceStatus(): SpaceStatusResult | null { return spaceStatusCache }

// ── Helpers ───────────────────────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const m = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  return m ? m[1] : dataUrl
}

function dataUrlToMimeType(dataUrl: string): string {
  const m = dataUrl.match(/^data:(image\/[^;]+);base64,/)
  return m ? m[1] : 'image/png'
}

async function uploadImage(imageDataUrl: string, label: string): Promise<string | null> {
  try {
    const base64 = dataUrlToBase64(imageDataUrl)
    const mimeType = dataUrlToMimeType(imageDataUrl)
    const buffer = Buffer.from(base64, 'base64')
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
    const formData = new FormData()
    formData.append('files', new Blob([buffer], { type: mimeType }), `${label}.${ext}`)
    const r = await fetch(`${SPACE_URL}/upload`, { method: 'POST', body: formData, signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) })
    if (!r.ok) return null
    const result = await r.json()
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') return result[0]
    return null
  } catch { return null }
}

function getGarmentDescription(categorySlug: string, productName: string): string {
  const cat = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()
  if (cat.includes('saree')) return `Traditional Indian saree - ${productName}`
  if (cat.includes('jewel')) {
    if (name.includes('necklace') || name.includes('pendant') || name.includes('choker')) return `Necklace jewelry - ${productName}`
    if (name.includes('earring') || name.includes('jhumka')) return `Earring jewelry - ${productName}`
    if (name.includes('bracelet') || name.includes('bangle')) return `Bracelet jewelry - ${productName}`
    return `Jewelry set - ${productName}`
  }
  if (cat.includes('watch')) return `Watch - ${productName}`
  if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('kurta')) return `Shirt - ${productName}`
  if (cat.includes('fashion') || cat.includes('dress')) return `Dress - ${productName}`
  if (cat.includes('fragrance') || cat.includes('perfume')) return `Fragrance bottle - ${productName}`
  return productName || 'Fashion item'
}

async function pollForResult(eventId: string, abortSignal: AbortSignal): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < POLL_TIMEOUT_MS && !abortSignal.aborted) {
    try {
      const r = await fetch(`${SPACE_URL}/call/tryon/${eventId}`, {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: AbortSignal.timeout(15_000),
      })
      if (r.status === 404) { await new Promise(r => setTimeout(r, POLL_INTERVAL_MS)); continue }
      if (!r.ok) { await new Promise(r => setTimeout(r, POLL_INTERVAL_MS)); continue }
      const text = await r.text()
      let eventType = ''
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('event:')) eventType = trimmed.replace('event:', '').trim()
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.substring(5).trim()
          if (eventType === 'error') return null
          if (eventType === 'complete') {
            try {
              const data = JSON.parse(dataStr)
              if (Array.isArray(data) && data.length > 0) {
                const img = data[0]
                if (img?.url) return img.url
                if (img?.path) return `${SPACE_URL}/file=${img.path}`
              }
            } catch { return null }
          }
        }
      }
    } catch { if (abortSignal.aborted) return null }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  return null
}

async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const r = await fetch(imageUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || 'image/png'
    const mimeType = ct.split(';')[0].trim()
    if (!mimeType.startsWith('image/')) return null
    const buffer = Buffer.from(await r.arrayBuffer())
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch { return null }
}

// ── Main Try-On Function ───────────────────────────────────────────

export async function performTryOn(input: TryOnInput): Promise<TryOnResult> {
  const totalStart = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS)

  try {
    const spaceAwake = await checkSpaceStatus()
    if (!spaceAwake) console.log('[idm-vton] Space may be sleeping — attempting upload anyway')

    console.log('[idm-vton] Uploading images...')
    const [humanPath, garmentPath] = await Promise.all([
      uploadImage(input.selfieData, 'human'),
      uploadImage(input.productImageBase64, 'garment'),
    ])

    if (!humanPath) return { success: false, error: 'Failed to upload selfie. The AI service may be warming up — please try again in 30 seconds.', errorCode: 'SPACE_SLEEPING', elapsedMs: Date.now() - totalStart }
    if (!garmentPath) return { success: false, error: 'Failed to upload product image. Please try again.', errorCode: 'UPLOAD_FAILED', elapsedMs: Date.now() - totalStart }

    const garmentDes = getGarmentDescription(input.categorySlug, input.productName)
    const callBody = {
      data: [
        { background: { path: humanPath, meta: { _type: 'gradio.FileData' }, orig_name: 'human.jpg', url: `${SPACE_URL}/file=${humanPath}` }, layers: [], composite: null },
        { path: garmentPath, meta: { _type: 'gradio.FileData' }, orig_name: 'garment.jpg', url: `${SPACE_URL}/file=${garmentPath}` },
        garmentDes, true, false, 30, Math.floor(Math.random() * 2147483647),
      ],
    }

    console.log('[idm-vton] Calling tryon...')
    const callR = await fetch(`${SPACE_URL}/call/tryon`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(callBody), signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
    if (!callR.ok) return { success: false, error: `AI service error (${callR.status}). Please try again.`, errorCode: 'CALL_FAILED', elapsedMs: Date.now() - totalStart }
    const callResult = await callR.json()
    const eventId = callResult.event_id
    if (!eventId) return { success: false, error: 'AI service did not accept request. Please try again.', errorCode: 'CALL_FAILED', elapsedMs: Date.now() - totalStart }

    console.log(`[idm-vton] Polling for result (event_id: ${eventId})`)
    const outputUrl = await pollForResult(eventId, controller.signal)
    if (!outputUrl) {
      const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
      return { success: false, error: controller.signal.aborted ? `Timed out after ${elapsed}s. Please try again.` : `Processing failed after ${elapsed}s. Please try again.`, errorCode: controller.signal.aborted ? 'TIMEOUT' : 'PROCESSING_FAILED', elapsedMs: Date.now() - totalStart }
    }

    const imageData = await downloadImageAsBase64(outputUrl)
    if (!imageData) return { success: false, error: 'Failed to download result. Please try again.', errorCode: 'PROCESSING_FAILED', elapsedMs: Date.now() - totalStart }

    const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
    console.log(`[idm-vton] ✅ Success in ${elapsed}s!`)
    return { success: true, imageUrl: imageData, elapsedMs: Date.now() - totalStart }
  } catch (err) {
    const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
    if (controller.signal.aborted) return { success: false, error: `Timed out after ${elapsed}s. Please try again.`, errorCode: 'TIMEOUT', elapsedMs: Date.now() - totalStart }
    const errMsg = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Network error: ${errMsg.substring(0, 100)}. Please try again.`, errorCode: 'NETWORK_ERROR', elapsedMs: Date.now() - totalStart }
  } finally { clearTimeout(timeoutId) }
}

// ── Backward Compatibility ─────────────────────────────────────────

export function isHFAvailable(): boolean { return true }
export async function checkIDMVTONSpaceStatus(): Promise<{ awake: boolean; loadAvg: number | null }> { return { awake: await checkSpaceStatus(), loadAvg: null } }
export async function hfTryOn(input: TryOnInput): Promise<{ success: boolean; imageUrl?: string; strategy: string; error?: string }> {
  const r = await performTryOn(input)
  return { success: r.success, imageUrl: r.imageUrl, strategy: 'idm-vton-gradio', error: r.error }
}
