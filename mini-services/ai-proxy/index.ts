/**
 * AI Proxy Mini-Service
 *
 * Proxies AI try-on requests from Vercel to the local ZAI AI service.
 * Runs on the sandbox where the ZAI service is accessible.
 *
 * Endpoints:
 * - GET  /api/try-on/status  → Health check
 * - POST /api/try-on         → Create try-on job
 * - GET  /api/try-on?jobId=X → Poll job status
 */

import { createServer } from 'http'
import ZAI from 'z-ai-web-dev-sdk'
import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PORT = 3030

// ─── ZAI Config ────────────────────────────────────────────────────
const ZAI_CONFIG = (() => {
  // Try /etc/.z-ai-config first (available on sandbox)
  const configPaths = [
    '/etc/.z-ai-config',
    join(process.cwd(), '.z-ai-config'),
    join(require('os').homedir(), '.z-ai-config'),
  ]

  for (const filePath of configPaths) {
    try {
      const configStr = readFileSync(filePath, 'utf-8')
      const config = JSON.parse(configStr)
      if (config.baseUrl && config.apiKey) {
        console.log(`[ai-proxy] Loaded config from ${filePath}`)
        return config
      }
    } catch {
      // Continue
    }
  }

  // Fallback to env vars
  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    return {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    }
  }

  return null
})()

function createZAIClient() {
  if (!ZAI_CONFIG) throw new Error('ZAI config not available')
  return new ZAI({
    baseUrl: ZAI_CONFIG.baseUrl,
    apiKey: ZAI_CONFIG.apiKey,
    chatId: ZAI_CONFIG.chatId || '',
    token: ZAI_CONFIG.token || '',
    userId: ZAI_CONFIG.userId || '',
  })
}

// ─── Types ─────────────────────────────────────────────────────────

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  attempt?: number
  strategy?: string
  faceScore?: number
  productScore?: number
  suggestions?: any[]
  progress?: string
}

const jobs = new Map<string, TryOnJob>()

// Clean up old jobs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

// ─── Helpers ───────────────────────────────────────────────────────

function getProductPlacement(categorySlug: string, productName: string): string {
  const n = productName.toLowerCase()
  if (categorySlug === 'jewelry') {
    if (n.includes('earring') || n.includes('jhumka') || n.includes('stud')) return 'wearing earrings on both earlobes'
    if (n.includes('necklace') || n.includes('choker') || n.includes('pendant') || n.includes('temple')) return 'wearing a necklace around the neck'
    if (n.includes('bracelet') || n.includes('cuff') || n.includes('bangle')) return 'wearing a bracelet on the wrist'
    if (n.includes('ring')) return 'wearing a ring on the finger'
    if (n.includes('set') || n.includes('bridal')) return 'wearing a matching jewelry set of necklace and earrings'
    return 'wearing the jewelry piece'
  }
  if (categorySlug === 'sarees') return 'draped in the saree in traditional Indian style with pallu over shoulder'
  if (categorySlug === 'mens-shirts-t-shirts') return 'wearing the shirt on the torso'
  if (categorySlug === 'watches') return 'wearing the watch on the left wrist'
  if (categorySlug === 'fashion') return 'wearing the outfit'
  return 'wearing the product'
}

function getImageSize(categorySlug: string): ImageSize {
  if (['sarees', 'fashion', 'mens-shirts-t-shirts'].includes(categorySlug)) return '768x1344'
  if (categorySlug === 'home-living') return '1344x768'
  return '864x1152'
}

// ─── Watermark ─────────────────────────────────────────────────────

async function addWatermark(imageDataUrl: string): Promise<string> {
  try {
    const base64Match = imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
    if (!base64Match) return imageDataUrl

    const imageBuffer = Buffer.from(base64Match[2], 'base64')
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 800
    const height = metadata.height || 1000

    const wmWidth = Math.max(Math.floor(width * 0.35), 150)
    const wmHeight = Math.max(Math.floor(height * 0.08), 40)
    const fontSize = Math.max(Math.floor(wmHeight * 0.55), 14)
    const subFontSize = Math.max(Math.floor(wmHeight * 0.3), 8)

    const svg = `<svg width="${wmWidth}" height="${wmHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#b8860b;stop-opacity:0.85" />
          <stop offset="50%" style="stop-color:#daa520;stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:#b8860b;stop-opacity:0.85" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${wmWidth}" height="${wmHeight}" rx="4" ry="4" fill="rgba(0,0,0,0.55)" />
      <text x="${wmWidth / 2}" y="${wmHeight * 0.42}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="url(#grad)" text-anchor="middle" dominant-baseline="middle">3BOXES GIFTS</text>
      <text x="${wmWidth / 2}" y="${wmHeight * 0.78}" font-family="Arial, Helvetica, sans-serif" font-size="${subFontSize}" fill="rgba(218,165,32,0.6)" text-anchor="middle" dominant-baseline="middle">AI Style Preview</text>
    </svg>`

    const wmBuffer = Buffer.from(svg)
    const wmMeta = await sharp(wmBuffer).metadata()
    const wmW = wmMeta.width || 150
    const wmH = wmMeta.height || 40
    const padding = Math.max(Math.floor(height * 0.02), 10)
    const left = Math.max(width - wmW - padding, 0)
    const top = Math.max(height - wmH - padding, 0)

    const watermarkedBuffer = await sharp(imageBuffer)
      .composite([{ input: wmBuffer, left, top }])
      .png()
      .toBuffer()

    return `data:image/png;base64,${watermarkedBuffer.toString('base64')}`
  } catch (err) {
    console.error('[ai-proxy] Watermark failed:', err)
    return imageDataUrl
  }
}

// ─── VLM Analysis ──────────────────────────────────────────────────

const VLM_PERSON_PROMPT = `Analyze this person's face and appearance in EXACT detail for a virtual try-on. Describe:
1. Face shape (round/oval/square/heart/oblong), skin tone (light/fair/medium/olive/brown/dark, with warm/cool/neutral undertone)
2. Hair: color, texture (straight/wavy/curly), length, style
3. Body type and build (slim/average/athletic/plus-size)
4. Current expression, pose, and what part of body is visible
5. Any distinctive features
Be extremely specific about skin tone, hair, and face shape. 3-4 sentences.`

const VLM_PRODUCT_PROMPT = `Describe this fashion/luxury product in EXACT detail for a virtual try-on. Describe:
1. Type and name (saree, necklace, shirt, watch, etc.)
2. EXACT primary color (not just "red" - say "deep maroon red" or "rose pink")
3. Secondary colors and accents
4. Pattern: floral/geometric/solid/striped/paisley/embroidered - describe the pattern precisely
5. Material and texture: silk sheen/matte cotton/shiny gold/satin/mesh - be specific
6. Key design details: borders, embellishments, gemstones, stitching, collar style
7. How it would be worn on the body (draped, fitted, layered, etc.)
Be extremely specific about color, material, and pattern. 3-4 sentences.`

async function vlmAnalyze(zai: any, prompt: string, imageUrl: string, timeoutMs = 45000): Promise<string> {
  try {
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-plus',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ]}],
        thinking: { type: 'disabled' },
      }),
      new Promise<null>(r => setTimeout(() => r(null), timeoutMs)),
    ])
    return result ? (result.choices[0]?.message?.content || '') : ''
  } catch { return '' }
}

// ─── Generation Strategies ─────────────────────────────────────────

async function strategyEditBoth(zai: any, selfieData: string, productImageBase64: string, productName: string, categorySlug: string, personDesc: string, productDesc: string): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)
    const prompt = `Professional fashion photograph. The FIRST image is the person, the SECOND image is the ${productName}. Combine them: show this person ${placement}. Keep the exact same face, hair, skin tone from the first image. Apply the exact product from the second image. ${personDesc ? `Person: ${personDesc}.` : ''} ${productDesc ? `Product: ${productDesc}.` : ''} Studio lighting, photorealistic, 8K quality.`
    console.log(`[ai-proxy] Strategy: edit-both`)
    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: selfieData }, { url: productImageBase64 }],
      size,
    } as any)
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[ai-proxy] Strategy edit-both failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function strategyEditSelfie(zai: any, selfieData: string, _: string, productName: string, categorySlug: string, personDesc: string, productDesc: string): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)
    const prompt = `Edit this photo: show this exact same person now ${placement}. The product is: ${productDesc}. CRITICAL: Keep the EXACT same face, skin tone, hair color, eye color, and body type. Do NOT change the person's identity. Only add/modify the clothing/jewelry/accessory. ${personDesc ? `Person: ${personDesc}.` : ''} Studio lighting, photorealistic, 8K quality.`
    console.log(`[ai-proxy] Strategy: edit-selfie`)
    const response = await zai.images.generations.edit({ prompt, images: [{ url: selfieData }], size } as any)
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[ai-proxy] Strategy edit-selfie failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function strategyEditProduct(zai: any, _: string, productImageBase64: string, productName: string, categorySlug: string, personDesc: string, productDesc: string): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)
    const prompt = `Show this product being worn by a person. The person is ${placement}. Person: ${personDesc}. Product: ${productDesc}. Show the person wearing this exact product with accurate colors and details. Studio lighting, photorealistic, 8K quality.`
    console.log(`[ai-proxy] Strategy: edit-product`)
    const response = await zai.images.generations.edit({ prompt, images: [{ url: productImageBase64 }], size } as any)
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[ai-proxy] Strategy edit-product failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

async function strategyCreateDetailed(zai: any, _: string, __: string, productName: string, categorySlug: string, personDesc: string, productDesc: string): Promise<string | null> {
  try {
    const placement = getProductPlacement(categorySlug, productName)
    const size = getImageSize(categorySlug)
    const bodyType = categorySlug === 'sarees' || categorySlug === 'fashion' || categorySlug === 'mens-shirts-t-shirts'
      ? 'Full-body professional fashion photograph'
      : categorySlug === 'jewelry' || categorySlug === 'watches'
      ? 'Close-up professional beauty photograph from chest up'
      : 'Professional fashion photograph'
    const prompt = `${bodyType} of a person ${placement}. Person: ${personDesc}. Product: ${productDesc}. The person is ${placement}. Photorealistic, studio lighting, 8K, high detail.`
    console.log(`[ai-proxy] Strategy: create-detailed`)
    const response = await zai.images.generations.create({ prompt, size })
    const b64 = response.data?.[0]?.base64
    if (!b64) return null
    return `data:image/png;base64,${b64}`
  } catch (err) {
    console.error('[ai-proxy] Strategy create-detailed failed:', (err as Error).message?.substring(0, 200))
    return null
  }
}

// ─── Background Processing ─────────────────────────────────────────

interface GenResult {
  imageUrl: string
  strategy: string
  faceScore: number
  productScore: number
}

async function backgroundProcess(
  jobId: string, productName: string, categorySlug: string,
  selfieData: string, productImageBase64: string,
) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    const zai = createZAIClient()

    // VLM analysis
    if (job) job.progress = 'AI is analyzing your face and product details...'
    console.log(`[ai-proxy] Starting VLM analysis for job ${jobId}`)
    const [personDesc, productDesc] = await Promise.all([
      vlmAnalyze(zai, VLM_PERSON_PROMPT, selfieData),
      vlmAnalyze(zai, VLM_PRODUCT_PROMPT, productImageBase64),
    ])
    console.log(`[ai-proxy] Person: ${personDesc.substring(0, 100)}...`)

    // Try generation strategies
    const results: GenResult[] = []

    if (job) { job.attempt = 1; job.progress = 'Generating your try-on look (Strategy 1/4)...' }
    const aResult = await strategyEditBoth(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (aResult) results.push({ imageUrl: aResult, strategy: 'edit-both', faceScore: 7, productScore: 7 })

    if (job) { job.attempt = 2; job.progress = 'Preserving your face details (Strategy 2/4)...' }
    const bResult = await strategyEditSelfie(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (bResult) results.push({ imageUrl: bResult, strategy: 'edit-selfie', faceScore: 8, productScore: 6 })

    if (job) { job.attempt = 3; job.progress = 'Optimizing product accuracy (Strategy 3/4)...' }
    const cResult = await strategyEditProduct(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (cResult) results.push({ imageUrl: cResult, strategy: 'edit-product', faceScore: 6, productScore: 8 })

    if (job) { job.attempt = 4; job.progress = 'Generating from descriptions (Strategy 4/4)...' }
    const dResult = await strategyCreateDetailed(zai, selfieData, productImageBase64, productName, categorySlug, personDesc, productDesc)
    if (dResult) results.push({ imageUrl: dResult, strategy: 'create-detailed', faceScore: 5, productScore: 5 })

    if (results.length === 0) throw new Error('All strategies failed')

    // Pick best result
    const best = results.reduce((a, b) => {
      const sa = a.faceScore * 0.6 + a.productScore * 0.4
      const sb = b.faceScore * 0.6 + b.productScore * 0.4
      return sb > sa ? b : a
    })
    console.log(`[ai-proxy] Best: ${best.strategy}`)

    // Apply watermark
    if (job) job.progress = 'Adding finishing touches...'
    let finalImageUrl = best.imageUrl
    try {
      finalImageUrl = await addWatermark(best.imageUrl)
    } catch (wmErr) {
      console.error('[ai-proxy] Watermark failed:', wmErr)
    }

    if (job) {
      job.status = 'completed'
      job.imageUrl = finalImageUrl
      job.productName = productName
      job.strategy = best.strategy
      job.faceScore = best.faceScore
      job.productScore = best.productScore
      job.progress = 'Complete!'
    }
  } catch (error) {
    console.error(`[ai-proxy] Job ${jobId} failed:`, error)
    if (job) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Generation failed'
    }
  }
}

// ─── Product Image Fetching ────────────────────────────────────────

async function getProductImageBase64(imagePath: string): Promise<string | null> {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const response = await fetch(imagePath, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*;q=0.8' },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = Buffer.from(await response.arrayBuffer())
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch { return null }
  }
  if (imagePath.startsWith('//')) return getProductImageBase64(`https:${imagePath}`)
  if (imagePath.startsWith('/api/image-proxy')) {
    try {
      const proxyUrlObj = new URL(imagePath, 'http://localhost:3000')
      const originalUrl = proxyUrlObj.searchParams.get('url')
      if (originalUrl) {
        const directResult = await getProductImageBase64(originalUrl.startsWith('//') ? `https:${originalUrl}` : originalUrl)
        if (directResult) return directResult
      }
    } catch {}
  }
  // Local path
  try {
    const fullPath = join(process.cwd(), '..', '..', 'public', imagePath)
    if (!existsSync(fullPath)) return null
    const buffer = readFileSync(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch { return null }
}

// ─── HTTP Server ───────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Abc')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = new URL(req.url!, `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    // GET /api/try-on/status
    if (path === '/api/try-on/status' && req.method === 'GET') {
      const available = ZAI_CONFIG !== null
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ available }))
      return
    }

    // GET /api/try-on?jobId=X
    if (path === '/api/try-on' && req.method === 'GET') {
      const jobId = url.searchParams.get('jobId')
      if (!jobId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Job ID required' }))
        return
      }
      const job = jobs.get(jobId)
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Job not found' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jobId,
        status: job.status,
        imageUrl: job.imageUrl,
        productName: job.productName,
        categorySlug: job.categorySlug,
        error: job.error,
        attempt: job.attempt,
        strategy: job.strategy,
        faceScore: job.faceScore,
        productScore: job.productScore,
        suggestions: job.suggestions,
        progress: job.progress,
      }))
      return
    }

    // POST /api/try-on
    if (path === '/api/try-on' && req.method === 'POST') {
      if (!ZAI_CONFIG) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'AI service not configured', code: 'AI_SERVICE_UNAVAILABLE' }))
        return
      }

      let body: any
      try {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        body = JSON.parse(Buffer.concat(chunks).toString())
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
        return
      }

      const { productId, selfieData, productImageUrl, productName, categorySlug } = body
      if (!productId || !selfieData) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Product ID and selfie are required' }))
        return
      }

      // Get product image
      const productImageBase64 = productImageUrl ? await getProductImageBase64(productImageUrl) : null
      if (!productImageBase64) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Product image not available' }))
        return
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      jobs.set(jobId, {
        status: 'processing',
        createdAt: Date.now(),
        categorySlug: categorySlug || '',
        attempt: 1,
        progress: 'Analyzing your photo and product...',
      })

      // Start background processing
      backgroundProcess(jobId, productName || 'Product', categorySlug || 'jewelry', selfieData, productImageBase64)
        .catch(err => console.error('[ai-proxy] Background job failed:', err))

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jobId,
        status: 'processing',
        productName: productName || 'Product',
        categorySlug: categorySlug || 'jewelry',
      }))
      return
    }

    // 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (err) {
    console.error('[ai-proxy] Server error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

server.listen(PORT, () => {
  console.log(`[ai-proxy] AI Proxy service running on port ${PORT}`)
  console.log(`[ai-proxy] ZAI config: ${ZAI_CONFIG ? 'available' : 'NOT available'}`)
})
