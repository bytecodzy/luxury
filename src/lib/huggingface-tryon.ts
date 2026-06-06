/**
 * HuggingFace Free Inference API Integration for Virtual Try-On
 *
 * Uses HuggingFace's free Inference API as a fallback when ZAI is unavailable.
 * - FREE with HuggingFace account (https://huggingface.co/settings/tokens)
 * - No GPU needed on your server
 * - Rate limited but usable for moderate traffic
 * - Supports image generation models like FLUX.1-schnell, SDXL
 *
 * This is NOT a dedicated virtual try-on model. Instead, it uses
 * general-purpose image generation with carefully crafted prompts
 * to produce try-on style results.
 *
 * IMPORTANT: Set HF_API_TOKEN environment variable to enable this.
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

// ── Configuration ──────────────────────────────────────────────────

export function isHFAvailable(): boolean {
  return !!process.env.HF_API_TOKEN
}

// ── Data URL Helpers ───────────────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  if (match) return match[1]
  return dataUrl
}

function dataUrlToBlob(dataUrl: string): Buffer {
  const base64 = dataUrlToBase64(dataUrl)
  return Buffer.from(base64, 'base64')
}

// ── Category-specific prompt builders ──────────────────────────────

function getBodyType(categorySlug: string): string {
  const cat = (categorySlug || '').toLowerCase()
  if (cat.includes('saree') || cat.includes('women-saree')) return 'Full-body professional fashion photograph'
  if (cat.includes('fashion') || cat.includes('women-fashion') || cat.includes('dress')) return 'Full-body professional fashion photograph'
  if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('t-shirt') || cat.includes('kurta')) return 'Upper-body professional fashion photograph'
  if (cat.includes('jewel')) return 'Close-up professional beauty photograph from chest up'
  if (cat.includes('watch')) return 'Close-up photograph from waist up'
  return 'Professional fashion photograph'
}

function getPlacement(categorySlug: string, productName: string): string {
  const cat = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  if (cat.includes('saree') || cat.includes('women-saree'))
    return 'draped in a beautiful saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist'
  if (cat.includes('jewel') || cat.includes('women-jewel')) {
    if (name.includes('earring') || name.includes('jhumka')) return 'wearing elegant earrings on both earlobes'
    if (name.includes('necklace') || name.includes('pendant') || name.includes('choker')) return 'wearing a beautiful necklace around the neck'
    if (name.includes('bracelet') || name.includes('bangle') || name.includes('kada')) return 'wearing a bracelet on the wrist'
    if (name.includes('ring')) return 'wearing a ring on the finger'
    if (name.includes('set') || name.includes('bridal')) return 'wearing a matching jewelry set — necklace and earrings'
    return 'wearing the jewelry piece'
  }
  if (cat.includes('watch')) return 'wearing the watch on the left wrist'
  if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('t-shirt'))
    return 'wearing the shirt, which fits naturally on the torso'
  if (cat.includes('fashion') || cat.includes('dress'))
    return 'wearing the outfit, which fits naturally and looks realistic'
  return 'wearing the product'
}

// ── Strategy 1: FLUX.1-schnell (fast, free, good quality) ──────────

async function fluxSchnellTryOn(input: HFTryOnInput): Promise<HFTryOnResult> {
  const token = process.env.HF_API_TOKEN
  if (!token) {
    return { success: false, strategy: 'hf-flux', error: 'HF_API_TOKEN not configured' }
  }

  try {
    const bodyType = getBodyType(input.categorySlug)
    const placement = getPlacement(input.categorySlug, input.productName)

    // FLUX.1-schnell doesn't support image inputs natively via the free API
    // So we generate a high-quality text-to-image result with detailed prompts
    const prompt = `${bodyType} of a person ${placement}. The product is "${input.productName}".
Show the person realistically wearing this product — it should look like a REAL PHOTOGRAPH, not a composite or overlay.
The product must appear naturally fitted on the person with proper shadows, draping, and fit.
Studio-quality lighting, photorealistic, high detail, 8K quality.`

    console.log(`[hf-tryon] FLUX.1-schnell: generating try-on for ${input.productName}`)

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
        signal: AbortSignal.timeout(60000), // 60s timeout for generation
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      console.error(`[hf-tryon] FLUX.1-schnell returned ${response.status}: ${errorText.substring(0, 300)}`)
      return {
        success: false,
        strategy: 'hf-flux',
        error: `HF API returned ${response.status}: ${errorText.substring(0, 200)}`,
      }
    }

    // HF returns raw image bytes
    const contentType = response.headers.get('content-type') || 'image/png'
    if (contentType.includes('image')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mimeType = contentType.split(';')[0].trim()
      return {
        success: true,
        imageUrl: `data:${mimeType};base64,${base64}`,
        strategy: 'hf-flux-schnell',
      }
    }

    // Some models return JSON
    const jsonResult = await response.json().catch(() => null)
    if (jsonResult?.[0]?.image) {
      return {
        success: true,
        imageUrl: jsonResult[0].image, // Usually base64 or URL
        strategy: 'hf-flux-schnell',
      }
    }

    return { success: false, strategy: 'hf-flux', error: 'Unexpected response format from HF API' }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[hf-tryon] FLUX.1-schnell error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'hf-flux', error: errMsg }
  }
}

// ── Strategy 2: SDXL (image-to-image with selfie) ──────────────────

async function sdxlImageToImage(input: HFTryOnInput): Promise<HFTryOnResult> {
  const token = process.env.HF_API_TOKEN
  if (!token) {
    return { success: false, strategy: 'hf-sdxl', error: 'HF_API_TOKEN not configured' }
  }

  try {
    const bodyType = getBodyType(input.categorySlug)
    const placement = getPlacement(input.categorySlug, input.productName)

    const prompt = `${bodyType}. The person is ${placement}. Product: "${input.productName}".
Photorealistic, studio lighting, the product fits naturally on the person. 8K quality.`

    console.log(`[hf-tryon] SDXL img2img: generating try-on for ${input.productName}`)

    // Send selfie as image input for img2img
    const selfieBlob = dataUrlToBlob(input.selfieData)

    const formData = new FormData()
    formData.append('inputs', new Blob([selfieBlob], { type: 'image/png' }))
    formData.append('parameters', JSON.stringify({
      prompt: prompt,
      num_inference_steps: 20,
      guidance_scale: 7.5,
      strength: 0.75, // How much to transform the original
    }))

    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-refiner-1.0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: AbortSignal.timeout(60000),
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      console.error(`[hf-tryon] SDXL returned ${response.status}: ${errorText.substring(0, 300)}`)
      return {
        success: false,
        strategy: 'hf-sdxl',
        error: `HF SDXL API returned ${response.status}: ${errorText.substring(0, 200)}`,
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
        strategy: 'hf-sdxl-img2img',
      }
    }

    return { success: false, strategy: 'hf-sdxl', error: 'Unexpected response format' }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[hf-tryon] SDXL error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'hf-sdxl', error: errMsg }
  }
}

// ── Unified HuggingFace Try-On Function ─────────────────────────────

/**
 * Try HuggingFace free inference for virtual try-on.
 * Priority: FLUX.1-schnell (fast text-to-image) → SDXL img2img (selfie-based)
 */
export async function hfTryOn(input: HFTryOnInput): Promise<HFTryOnResult> {
  if (!isHFAvailable()) {
    return {
      success: false,
      strategy: 'none',
      error: 'HF_API_TOKEN not configured. Get free token at https://huggingface.co/settings/tokens',
    }
  }

  console.log('[hf-tryon] Starting HuggingFace try-on pipeline')

  // Strategy 1: FLUX.1-schnell (fast, free, good quality text-to-image)
  console.log('[hf-tryon] Trying FLUX.1-schnell...')
  const fluxResult = await fluxSchnellTryOn(input)
  if (fluxResult.success) return fluxResult
  console.log('[hf-tryon] FLUX.1-schnell failed:', fluxResult.error)

  // Strategy 2: SDXL image-to-image (uses selfie as reference)
  console.log('[hf-tryon] Trying SDXL img2img...')
  const sdxlResult = await sdxlImageToImage(input)
  if (sdxlResult.success) return sdxlResult
  console.log('[hf-tryon] SDXL img2img failed:', sdxlResult.error)

  return {
    success: false,
    strategy: 'none',
    error: 'All HuggingFace strategies failed. Check HF_API_TOKEN and model availability.',
  }
}
