/**
 * Cloudflare Workers AI Virtual Try-On — FREE FOREVER, identity-preserving
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHY CLOUDFLARE WORKERS AI?
 *  ─────────────────────────────────────────────────────────────────────────
 *  - FREE during beta + 10,000 Neurons/day free FOREVER (no credit card)
 *  - SD 1.5 img2img with `strength` parameter = IDENTITY PRESERVATION
 *    (strength=0.45 keeps the user's face close to the original selfie)
 *  - Text-instruction editing = works for ALL categories
 *    (sarees, jewelry, garments, watches, accessories, fragrances)
 *  - Latency: 5-15s (well under Vercel's 60s timeout)
 *  - No Gradio/SSE complexity — simple REST POST returning image bytes
 *
 *  SETUP (one-time, free):
 *    1. Sign up at https://dash.cloudflare.com/sign-up
 *    2. Create an API token with "Workers AI:Read" permission
 *       (https://dash.cloudflare.com/profile/api-tokens → Create Token)
 *    3. Find your Account ID on the Cloudflare dashboard sidebar
 *    4. Set on Vercel: CF_ACCOUNT_ID + CF_API_TOKEN env vars
 *    5. Redeploy
 *
 *  Models used (free tier):
 *    - @cf/runwayml/stable-diffusion-v1-5-img2img (PRIMARY — has strength)
 *    - @cf/black-forest-labs/flux-1-schnell       (FALLBACK — fast, no strength)
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { TryOnInput, TryOnResult } from '@/lib/virtual-tryon'

interface CFConfig {
  accountId: string
  apiToken: string
}

function getCFConfig(): CFConfig | null {
  const accountId = process.env.CF_ACCOUNT_ID
  const apiToken = process.env.CF_API_TOKEN
  if (!accountId || !apiToken) return null
  return { accountId, apiToken }
}

export function isCloudflareReady(): boolean {
  return getCFConfig() !== null
}

function stripDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}

function detectMimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);/)
  return m ? m[1] : 'image/jpeg'
}

/**
 * Build a category-aware prompt that DESCRIBES how the product should be worn.
 * The prompt explicitly says "preserve the same person, same face, same identity"
 * to reinforce identity preservation on top of the strength parameter.
 */
function buildCategoryPrompt(input: TryOnInput): string {
  const name = input.productName || 'the product'
  const colors = input.clientProductColors || ''
  const skinTone = input.skinTone || ''
  const hairColor = input.hairColor || ''
  const slug = (input.categorySlug || '').toLowerCase()
  const n = name.toLowerCase()
  const desc = (input.productDescription || '').toLowerCase()
  const tags = (input.productTags || []).join(' ').toLowerCase()

  const identityHint =
    'CRITICAL: keep the SAME person, SAME face, SAME hair, SAME identity as the input photo. ' +
    'Do NOT generate a new person. Do NOT change facial features. ' +
    (skinTone ? `Skin tone: ${skinTone}. ` : '') +
    (hairColor ? `Hair color: ${hairColor}. ` : '')

  // Sarees — full-body Indian garment
  if (
    slug.includes('saree') ||
    n.includes('saree') || n.includes('sari') ||
    desc.includes('saree') || desc.includes('sari') ||
    tags.includes('saree') || tags.includes('sari')
  ) {
    return (
      `${identityHint}` +
      `A woman wearing a beautiful ${colors ? colors + ' ' : ''}${name}. ` +
      `The saree is draped elegantly in traditional Indian style with the pallu over the left shoulder, ` +
      `matching blouse, neatly pleated at the waist. Full-body fashion photograph, head to toe, ` +
      `natural fabric drape, soft studio lighting, photorealistic, high detail.`
    )
  }

  // Jewelry
  if (
    slug.includes('jewel') ||
    n.includes('necklace') || n.includes('earring') || n.includes('jhumka') ||
    n.includes('bracelet') || n.includes('bangle') || n.includes('ring') ||
    n.includes('pendant') || n.includes('choker') || n.includes('temple') ||
    n.includes('haar') || n.includes('mala') || n.includes('kada') ||
    desc.includes('jewel') || desc.includes('necklace') || desc.includes('earring')
  ) {
    let placement = 'wearing the jewelry piece elegantly, clearly visible'
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud'))
      placement = 'wearing the earrings on both earlobes, clearly visible'
    else if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple') || n.includes('haar'))
      placement = 'wearing the necklace around the neck, sitting naturally at the collarbone'
    else if (n.includes('bracelet') || n.includes('bangle') || n.includes('kada'))
      placement = 'wearing the bracelet/bangle on the wrist'
    else if (n.includes('ring'))
      placement = 'wearing the ring on the finger, clearly visible'
    else if (n.includes('set') || n.includes('bridal'))
      placement = 'wearing a matching jewelry set — necklace around the neck and earrings on both earlobes'
    return (
      `${identityHint}` +
      `A woman ${placement}. The ${name} is the EXACT piece shown — same design, same color, same material. ` +
      `Upper-body beauty photograph, chest up. Polished metal with gemstones, sparkling highlights, photorealistic.`
    )
  }

  // Watches
  if (slug.includes('watch') || n.includes('watch') || n.includes('chronograph') || n.includes('tourbillon')) {
    return (
      `${identityHint}` +
      `A person wearing the ${name} on the left wrist, the watch face clearly visible. ` +
      `Waist-up photograph with the wrist visible. Precision timepiece, detailed dial, photorealistic.`
    )
  }

  // Fragrances
  if (slug.includes('fragrance') || slug.includes('perfume') || n.includes('parfum') || n.includes('cologne') || n.includes('eau de')) {
    return (
      `${identityHint}` +
      `A person holding the ${name} bottle elegantly in one hand, the bottle clearly visible. ` +
      `Upper-body photograph. Glass bottle with refined design, photorealistic.`
    )
  }

  // Accessories (sunglasses, bags, belts, etc.)
  if (slug.includes('accessor') || n.includes('sunglass') || n.includes('bag') || n.includes('clutch') || n.includes('belt') || n.includes('scarf') || n.includes('wallet')) {
    let placement = 'wearing or holding the accessory naturally'
    if (n.includes('sunglass')) placement = 'wearing the sunglasses over the eyes, clearly visible'
    else if (n.includes('bag') || n.includes('clutch') || n.includes('tote')) placement = 'holding the bag in one hand, clearly visible'
    else if (n.includes('belt')) placement = 'wearing the belt around the waist'
    else if (n.includes('scarf')) placement = 'wearing the scarf draped elegantly around the neck'
    return (
      `${identityHint}` +
      `A person ${placement}. The ${name} is the EXACT item shown. Upper-body photograph, photorealistic.`
    )
  }

  // Garments (shirts, dresses, fashion)
  return (
    `${identityHint}` +
    `A person wearing the ${colors ? colors + ' ' : ''}${name}, fitted naturally with proper fabric drape and folds. ` +
    `Full-body fashion photograph from head to toe, soft studio lighting, photorealistic, high detail.`
  )
}

/**
 * Cloudflare Workers AI call — uses SD 1.5 img2img with strength=0.45.
 * Returns a TryOnResult with a base64 data URL.
 */
export async function callCloudflareTryOn(
  input: TryOnInput,
  deadline: number,
): Promise<{ success: boolean; imageUrl?: string; error?: string; strategy?: string }> {
  const cfg = getCFConfig()
  if (!cfg) {
    return { success: false, error: 'Cloudflare not configured (CF_ACCOUNT_ID/CF_API_TOKEN missing)' }
  }
  if (!input.selfieData?.startsWith('data:image/')) {
    return { success: false, error: 'Selfie required for Cloudflare try-on' }
  }

  const timeRemaining = deadline - Date.now()
  if (timeRemaining < 10_000) {
    return { success: false, error: `Insufficient time (${timeRemaining}ms) for Cloudflare` }
  }

  const prompt = buildCategoryPrompt(input)
  const negativePrompt =
    'different person, different face, mannequin, multiple people, child, cartoon, ' +
    'low quality, blurry, distorted, deformed, extra limbs, watermark, text'

  // SD 1.5 img2img is PRIMARY — has the `strength` parameter for identity preservation
  const models = [
    '@cf/runwayml/stable-diffusion-v1-5-img2img',
    '@cf/stabilityai/stable-diffusion-xl-base-1.0', // XL has img2img via init_image
  ]

  const perModelTimeout = Math.min(timeRemaining - 4_000, 25_000)
  console.log(`[virtual-tryon] Cloudflare try-on: prompt="${prompt.substring(0, 100)}..." timeout=${perModelTimeout}ms`)

  for (const model of models) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/ai/run/${model}`
    const body: Record<string, unknown> = {
      prompt,
      negative_prompt: negativePrompt,
      image: stripDataUrl(input.selfieData), // base64 input image
      strength: 0.45, // LOW strength = preserve identity (0=identical, 1=ignore input)
      num_steps: 25,
      guidance: 7.5,
      width: 768,
      height: 1024,
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), perModelTimeout)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.log(`[virtual-tryon] Cloudflare ${model} HTTP ${res.status}: ${errText.substring(0, 200)}`)
        if (res.status === 429) {
          return { success: false, error: `Cloudflare rate limit (HTTP 429) — try again later` }
        }
        continue // try next model
      }

      const ct = res.headers.get('content-type') || ''
      // Cloudflare returns either image/png bytes directly OR JSON with {result:{image}}
      if (ct.startsWith('image/')) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 3000) {
          console.log(`[virtual-tryon] Cloudflare ${model} returned tiny image (${buf.length} bytes)`)
          continue
        }
        const dataUrl = `data:${ct};base64,${buf.toString('base64')}`
        console.log(`[virtual-tryon] ✅ Cloudflare ${model} succeeded (${(buf.length / 1024).toFixed(1)}KB)`)
        return { success: true, imageUrl: dataUrl, strategy: 'cloudflare-sd15-img2img' }
      }

      // JSON response — extract image
      const json = await res.json().catch(() => null)
      if (json?.result?.image) {
        const imgData = json.result.image
        const buf = typeof imgData === 'string' ? Buffer.from(imgData, 'base64') : Buffer.from(imgData)
        if (buf.length < 3000) {
          console.log(`[virtual-tryon] Cloudflare ${model} returned tiny image (${buf.length} bytes)`)
          continue
        }
        const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
        console.log(`[virtual-tryon] ✅ Cloudflare ${model} succeeded via JSON (${(buf.length / 1024).toFixed(1)}KB)`)
        return { success: true, imageUrl: dataUrl, strategy: 'cloudflare-sd15-img2img' }
      }

      console.log(`[virtual-tryon] Cloudflare ${model} unexpected response: ${JSON.stringify(json).substring(0, 200)}`)
      continue
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const msg = isTimeout ? `Cloudflare ${model} timed out` : `Cloudflare ${model} error: ${(err as Error).message.substring(0, 100)}`
      console.log(`[virtual-tryon] ${msg}`)
      continue
    }
  }

  return { success: false, error: 'All Cloudflare models failed' }
}
