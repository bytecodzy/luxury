/**
 * External AI Service Integration for Virtual Try-On
 *
 * Supports:
 * 1. Replicate IDM-VTON — Dedicated virtual try-on model (BEST quality)
 * 2. OpenAI DALL-E / GPT-Image — Image generation/editing (FALLBACK)
 *
 * These services are publicly accessible and work from both sandbox and Vercel.
 *
 * IMPORTANT: Uses dynamic imports so the app doesn't crash if
 * 'replicate' or 'openai' packages are not installed.
 */

// ── Types ──────────────────────────────────────────────────────────

export interface ExternalTryOnInput {
  selfieData: string        // base64 data URL of the person's selfie
  productImageBase64: string // base64 data URL of the product image
  productName: string
  categorySlug: string
}

export interface ExternalTryOnResult {
  success: boolean
  imageUrl?: string          // base64 data URL of the result
  strategy: string
  error?: string
}

type GarmentCategory = 'upper_body' | 'lower_body' | 'dresses' | 'full_body'

// ── Configuration ──────────────────────────────────────────────────

export function isExternalAIAvailable(): { replicate: boolean; openai: boolean } {
  return {
    replicate: !!process.env.REPLICATE_API_TOKEN,
    openai: !!process.env.OPENAI_API_KEY,
  }
}

// ── Category Mapping ───────────────────────────────────────────────

function mapCategoryToGarment(categorySlug: string, productName: string): GarmentCategory {
  const cat = (categorySlug || '').toLowerCase()
  const name = (productName || '').toLowerCase()

  // Full body garments
  if (cat.includes('saree') || cat.includes('women-saree')) return 'full_body'
  if (cat.includes('dress') || cat.includes('gown') || cat.includes('kids-dress')) return 'dresses'
  if (cat.includes('fashion') || cat.includes('women-fashion') || cat.includes('kid')) return 'dresses'

  // Upper body
  if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('t-shirt') || cat.includes('kurta')) return 'upper_body'
  if (cat.includes('men-tshirt') || cat.includes('men-shirt') || cat.includes('kids-shirt')) return 'upper_body'
  if (name.includes('shirt') || name.includes('tshirt') || name.includes('top') || name.includes('jacket') || name.includes('blazer')) return 'upper_body'

  // Lower body
  if (cat.includes('pant') || cat.includes('trouser') || name.includes('pant') || name.includes('jean')) return 'lower_body'

  // Accessories — not really garment categories, but we'll use upper_body as default
  if (cat.includes('jewel') || cat.includes('watch') || cat.includes('accessor')) return 'upper_body'

  // Default
  return 'upper_body'
}

// ── Data URL Helpers ───────────────────────────────────────────────

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  if (match) return match[1]
  return dataUrl
}

// ── Strategy 1: Replicate IDM-VTON ────────────────────────────────

async function replicateTryOn(input: ExternalTryOnInput): Promise<ExternalTryOnResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { success: false, strategy: 'replicate-idm-vton', error: 'REPLICATE_API_TOKEN not configured' }
  }

  // Dynamic import — won't crash if 'replicate' package is not installed
  let Replicate: any
  try {
    const mod = await import('replicate')
    Replicate = mod.default || mod
  } catch {
    return { success: false, strategy: 'replicate', error: 'replicate package not installed. Run: bun add replicate' }
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
    const garmentCategory = mapCategoryToGarment(input.categorySlug, input.productName)
    const humanImgBase64 = dataUrlToBase64(input.selfieData)
    const garmentImgBase64 = dataUrlToBase64(input.productImageBase64)

    console.log(`[external-ai] Replicate IDM-VTON: category=${garmentCategory}, product=${input.productName}`)

    // Strategy 1a: Try IDM-VTON (best virtual try-on model)
    try {
      const output = await replicate.run(
        'cuuupid/idm-vton',
        {
          input: {
            human_img: `data:image/png;base64,${humanImgBase64}`,
            garment_img: `data:image/png;base64,${garmentImgBase64}`,
            category: garmentCategory,
            garment_des: input.productName,
            is_checked: true,
            is_crop: false,
            denoise_steps: 30,
            seed: 42,
          },
        }
      ) as any

      if (output) {
        let resultUrl: string | null = null
        if (Array.isArray(output) && output.length > 0) {
          resultUrl = output[0]
        } else if (typeof output === 'string') {
          resultUrl = output
        } else if (output?.url) {
          resultUrl = output.url
        }

        if (resultUrl) {
          console.log('[external-ai] Replicate IDM-VTON success, fetching result image')
          const imageResponse = await fetch(resultUrl, {
            headers: { 'User-Agent': '3BOXES-Internal/1.0' },
            signal: AbortSignal.timeout(30000),
          })
          if (imageResponse.ok) {
            const buffer = Buffer.from(await imageResponse.arrayBuffer())
            const base64 = buffer.toString('base64')
            return {
              success: true,
              imageUrl: `data:image/png;base64,${base64}`,
              strategy: 'replicate-idm-vton',
            }
          }
        }
      }
    } catch (idmErr) {
      console.error('[external-ai] IDM-VTON failed:', (idmErr as Error).message?.substring(0, 300))
    }

    // Strategy 1b: Try OOTDiffusion as alternative
    try {
      console.log('[external-ai] Trying OOTDiffusion as fallback')
      const output = await replicate.run(
        'tencentarc/ootdiffusion',
        {
          input: {
            image: `data:image/png;base64,${humanImgBase64}`,
            garment: `data:image/png;base64,${garmentImgBase64}`,
            category: garmentCategory === 'dresses' ? 'dress' : garmentCategory === 'lower_body' ? 'lower' : 'upper',
            guidance_scale: 2.0,
            seed: 42,
          },
        }
      ) as any

      if (output) {
        let resultUrl: string | null = null
        if (Array.isArray(output) && output.length > 0) {
          resultUrl = output[0]
        } else if (typeof output === 'string') {
          resultUrl = output
        }

        if (resultUrl) {
          const imageResponse = await fetch(resultUrl, {
            headers: { 'User-Agent': '3BOXES-Internal/1.0' },
            signal: AbortSignal.timeout(30000),
          })
          if (imageResponse.ok) {
            const buffer = Buffer.from(await imageResponse.arrayBuffer())
            const base64 = buffer.toString('base64')
            return {
              success: true,
              imageUrl: `data:image/png;base64,${base64}`,
              strategy: 'replicate-ootdiffusion',
            }
          }
        }
      }
    } catch (ootErr) {
      console.error('[external-ai] OOTDiffusion failed:', (ootErr as Error).message?.substring(0, 300))
    }

    return { success: false, strategy: 'replicate', error: 'All Replicate strategies failed' }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[external-ai] Replicate error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'replicate', error: errMsg }
  }
}

// ── Strategy 2: OpenAI DALL-E / GPT-Image ─────────────────────────

async function openAITryOn(input: ExternalTryOnInput): Promise<ExternalTryOnResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, strategy: 'openai', error: 'OPENAI_API_KEY not configured' }
  }

  // Dynamic import — won't crash if 'openai' package is not installed
  let OpenAI: any
  try {
    const mod = await import('openai')
    OpenAI = mod.default || mod
  } catch {
    return { success: false, strategy: 'openai', error: 'openai package not installed. Run: bun add openai' }
  }

  try {
    const prompt = buildTryOnPrompt(input)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Strategy 2a: GPT-Image-1 edit
    try {
      console.log('[external-ai] OpenAI GPT-Image-1: generating try-on')

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1536',
      })

      if (response.data?.[0]) {
        const img = response.data[0]
        if (img.b64_json) {
          return {
            success: true,
            imageUrl: `data:image/png;base64,${img.b64_json}`,
            strategy: 'openai-gpt-image',
          }
        }
        if (img.url) {
          const imgResp = await fetch(img.url, { signal: AbortSignal.timeout(15000) })
          if (imgResp.ok) {
            const buffer = Buffer.from(await imgResp.arrayBuffer())
            const base64 = buffer.toString('base64')
            return {
              success: true,
              imageUrl: `data:image/png;base64,${base64}`,
              strategy: 'openai-gpt-image',
            }
          }
        }
      }
    } catch (gptImgErr) {
      console.error('[external-ai] GPT-Image-1 failed:', (gptImgErr as Error).message?.substring(0, 300))
    }

    // Strategy 2b: DALL-E 3 generation
    try {
      console.log('[external-ai] OpenAI DALL-E 3: generating try-on')

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1792',
        quality: 'hd',
      })

      if (response.data?.[0]) {
        const img = response.data[0]
        if (img.url) {
          const imgResp = await fetch(img.url, { signal: AbortSignal.timeout(15000) })
          if (imgResp.ok) {
            const buffer = Buffer.from(await imgResp.arrayBuffer())
            const base64 = buffer.toString('base64')
            return {
              success: true,
              imageUrl: `data:image/png;base64,${base64}`,
              strategy: 'openai-dall-e-3',
            }
          }
        }
      }
    } catch (dallEErr) {
      console.error('[external-ai] DALL-E 3 failed:', (dallEErr as Error).message?.substring(0, 300))
    }

    return { success: false, strategy: 'openai', error: 'All OpenAI strategies failed' }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[external-ai] OpenAI error:', errMsg.substring(0, 300))
    return { success: false, strategy: 'openai', error: errMsg }
  }
}

// ── Unified Try-On Function ────────────────────────────────────────

/**
 * Try external AI services for virtual try-on.
 * Priority: Replicate IDM-VTON → OpenAI GPT-Image → OpenAI DALL-E 3
 */
export async function externalTryOn(input: ExternalTryOnInput): Promise<ExternalTryOnResult> {
  const available = isExternalAIAvailable()
  console.log('[external-ai] Available services:', available)

  // Strategy 1: Replicate (best for virtual try-on)
  if (available.replicate) {
    console.log('[external-ai] Trying Replicate...')
    const result = await replicateTryOn(input)
    if (result.success) return result
    console.log('[external-ai] Replicate failed:', result.error)
  }

  // Strategy 2: OpenAI (good fallback)
  if (available.openai) {
    console.log('[external-ai] Trying OpenAI...')
    const result = await openAITryOn(input)
    if (result.success) return result
    console.log('[external-ai] OpenAI failed:', result.error)
  }

  return {
    success: false,
    strategy: 'none',
    error: 'No external AI service available. Configure REPLICATE_API_TOKEN or OPENAI_API_KEY.',
  }
}

// ── Prompt Builder ─────────────────────────────────────────────────

function buildTryOnPrompt(input: ExternalTryOnInput): string {
  const { productName, categorySlug } = input
  const cat = (categorySlug || '').toLowerCase()

  let bodyType = 'Professional fashion photograph'
  let placement = 'wearing the product'

  if (cat.includes('saree') || cat.includes('women-saree')) {
    bodyType = 'Full-body professional fashion photograph'
    placement = 'draped in a beautiful saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist'
  } else if (cat.includes('shirt') || cat.includes('tshirt') || cat.includes('t-shirt')) {
    bodyType = 'Upper-body professional fashion photograph'
    placement = 'wearing the shirt/top, which fits naturally on their torso'
  } else if (cat.includes('jewel')) {
    bodyType = 'Close-up professional beauty photograph from chest up'
    const name = productName.toLowerCase()
    if (name.includes('earring') || name.includes('jhumka')) placement = 'wearing elegant earrings on both earlobes'
    else if (name.includes('necklace') || name.includes('pendant') || name.includes('choker')) placement = 'wearing a beautiful necklace around the neck'
    else if (name.includes('bracelet') || name.includes('bangle') || name.includes('kada')) placement = 'wearing a bracelet on the wrist'
    else if (name.includes('ring')) placement = 'wearing a ring on the finger'
    else if (name.includes('set') || name.includes('bridal')) placement = 'wearing a matching jewelry set — necklace and earrings'
    else placement = 'wearing the jewelry piece'
  } else if (cat.includes('watch')) {
    bodyType = 'Close-up photograph from waist up'
    placement = 'wearing the watch on the left wrist'
  } else if (cat.includes('fashion') || cat.includes('dress')) {
    bodyType = 'Full-body professional fashion photograph'
    placement = 'wearing the outfit, which fits naturally and looks realistic'
  }

  return `${bodyType} of a person ${placement}. The product is "${productName}".
Show the person realistically wearing this product — it should look like a REAL PHOTOGRAPH, not a composite or overlay.
The product must appear naturally fitted on the person with proper shadows, draping, and fit.
Preserve the person's facial features, skin tone, and body proportions exactly.
Studio-quality lighting, photorealistic, high detail, 8K quality.`
}
