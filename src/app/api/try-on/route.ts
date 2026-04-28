import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
}

const jobs = new Map<string, TryOnJob>()

// Clean up old jobs
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

function getProductImageBase64(imagePath: string): string | null {
  try {
    const fullPath = join(process.cwd(), 'public', imagePath)
    if (!existsSync(fullPath)) return null
    const buffer = readFileSync(fullPath)
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error('[try-on] Failed to read product image:', err)
    return null
  }
}

const VLM_PERSON_PROMPT = `Describe this person in precise visual detail. Include: exact skin tone shade, hair color and style, face shape, eye color, key facial features, body build, age range. Be very specific. 2 sentences max.`

const VLM_PRODUCT_PROMPT = `Describe this product in precise visual detail. Include: exact colors, materials, textures, shapes, patterns, embellishments, key distinctive features. Be very specific. 2 sentences max.`

interface EditSettings {
  strength: number
  guidanceScale: number
  imageSize: ImageSize
  promptTemplate: string
}

function getEditSettings(categorySlug: string): EditSettings {
  switch (categorySlug) {
    case 'jewelry':
      return {
        strength: 0.2,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person wearing the exact jewelry from the second image around their neck. CRITICAL: Keep the exact same person - same face, same skin, same hair, same expression. Just add the jewelry. Professional fashion photography, close-up portrait, studio lighting.',
      }
    case 'watches':
      return {
        strength: 0.2,
        guidanceScale: 15,
        imageSize: '1024x1024',
        promptTemplate: 'This person wearing the exact watch from the second image on their wrist. CRITICAL: Keep the exact same person - same face, same skin, same hands. Just add the watch on their wrist. Professional fashion photography, close-up.',
      }
    case 'fragrances':
      return {
        strength: 0.2,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person elegantly holding the exact fragrance bottle from the second image. CRITICAL: Keep the exact same person - same face, same skin, same hair, same expression. Just add the bottle in their hand. Professional beauty photography.',
      }
    case 'leather-goods':
      return {
        strength: 0.25,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person carrying the exact leather bag from the second image. CRITICAL: Keep the exact same person - same face, same skin, same hair. Just add the bag. Professional fashion photography.',
      }
    case 'sarees':
      return {
        strength: 0.4,
        guidanceScale: 20,
        imageSize: '768x1344',
        promptTemplate: 'This person wearing the exact saree from the second image, draped elegantly in traditional Indian style with pleats and pallu. CRITICAL: Keep the same face, same skin tone, same hair as much as possible. Professional fashion photography, full body shot.',
      }
    case 'fashion':
      return {
        strength: 0.4,
        guidanceScale: 20,
        imageSize: '768x1344',
        promptTemplate: 'This person wearing the exact outfit from the second image. CRITICAL: Keep the same face, same skin tone, same hair as much as possible. Professional fashion photography, full body shot.',
      }
    case 'romantic-gifts':
    case 'couple-gifts':
      return {
        strength: 0.25,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person holding the exact gift from the second image. CRITICAL: Keep the exact same person - same face, same skin, same hair, same expression. Just add the gift in their hands. Professional photography, warm lighting.',
      }
    case 'toys':
      return {
        strength: 0.25,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person enjoying the exact product from the second image. CRITICAL: Keep the exact same person - same face, same skin, same hair. Just add the product. Professional photography, lifestyle shot.',
      }
    case 'home-living':
      return {
        strength: 0.3,
        guidanceScale: 15,
        imageSize: '1344x768',
        promptTemplate: 'This person in a home setting with the exact product from the second image displayed. CRITICAL: Keep the same person. Professional interior photography.',
      }
    default:
      return {
        strength: 0.3,
        guidanceScale: 15,
        imageSize: '864x1152',
        promptTemplate: 'This person with the exact product from the second image. CRITICAL: Keep the same face, skin, and hair. Professional photography.',
      }
  }
}

// POST /api/try-on - Start a try-on job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, selfieData, productImageUrl } = body

    if (!productId || !selfieData) {
      return NextResponse.json({ error: 'Product ID and selfie image are required' }, { status: 400 })
    }

    if (!selfieData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Please upload a valid image.' }, { status: 400 })
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productImages: string[] = JSON.parse(product.images || '[]')
    const productImageToUse = productImageUrl || (productImages.length > 0 ? productImages[0] : null)
    let productImageBase64: string | null = null
    if (productImageToUse) {
      productImageBase64 = getProductImageBase64(productImageToUse)
    }

    if (!productImageBase64) {
      return NextResponse.json({ error: 'Product image not available for try-on' }, { status: 400 })
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    jobs.set(jobId, {
      status: 'processing',
      createdAt: Date.now(),
      categorySlug: product.category.slug,
    })

    processTryOnJob(jobId, product.name, product.category.slug, selfieData, productImageBase64)
      .catch((err) => console.error('[try-on] Background job failed:', err))

    return NextResponse.json({
      jobId,
      status: 'processing',
      productName: product.name,
      categorySlug: product.category.slug,
    })
  } catch (error) {
    console.error('[try-on] API error:', error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}

// GET /api/try-on?jobId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  const job = jobs.get(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found. It may have expired.' }, { status: 404 })
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    imageUrl: job.imageUrl,
    productName: job.productName,
    categorySlug: job.categorySlug,
    error: job.error,
  })
}

// Background processing
async function processTryOnJob(
  jobId: string,
  productName: string,
  categorySlug: string,
  selfieData: string,
  productImageBase64: string
) {
  try {
    const zai = await ZAI.create()
    const settings = getEditSettings(categorySlug)

    // Step 1: VLM describes the person from selfie
    let personDescription = ''
    try {
      const vlmPromise = zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VLM_PERSON_PROMPT },
            { type: 'image_url', image_url: { url: selfieData } },
          ],
        }],
        thinking: { type: 'disabled' },
      })
      const vlmTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000))
      const vlmResponse = await Promise.race([vlmPromise, vlmTimeout])
      if (vlmResponse) {
        personDescription = vlmResponse.choices[0]?.message?.content || ''
      }
      console.log(`[try-on] Person desc for ${jobId}: ${personDescription.substring(0, 100)}...`)
    } catch (err) {
      console.error('[try-on] VLM person analysis failed:', err)
    }

    // Step 2: VLM describes the product
    let productDescription = ''
    try {
      const vlmPromise = zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VLM_PRODUCT_PROMPT },
            { type: 'image_url', image_url: { url: productImageBase64 } },
          ],
        }],
        thinking: { type: 'disabled' },
      })
      const vlmTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000))
      const vlmResponse = await Promise.race([vlmPromise, vlmTimeout])
      if (vlmResponse) {
        productDescription = vlmResponse.choices[0]?.message?.content || ''
      }
      console.log(`[try-on] Product desc for ${jobId}: ${productDescription.substring(0, 100)}...`)
    } catch (err) {
      console.error('[try-on] VLM product analysis failed:', err)
    }

    // Step 3: Build the prompt combining template with VLM descriptions
    let editPrompt = settings.promptTemplate
    if (personDescription && productDescription) {
      editPrompt = `A ${personDescription} wearing ${productDescription}. ${editPrompt}`
    }

    console.log(`[try-on] Generating for ${jobId}, cat: ${categorySlug}, str: ${settings.strength}, gs: ${settings.guidanceScale}`)

    // Step 4: Image EDIT API with both reference images
    const editResponse = await zai.images.generations.edit(({
      prompt: editPrompt,
      size: settings.imageSize,
      images: [
        { url: selfieData },
        { url: productImageBase64 },
      ],
      strength: settings.strength,
      guidance_scale: settings.guidanceScale,
    }) as any)

    const imageBase64 = editResponse.data[0]?.base64
    if (!imageBase64) throw new Error('No image generated')

    const imageUrl = `data:image/png;base64,${imageBase64}`
    console.log(`[try-on] Job ${jobId} completed, size: ${imageBase64.length}`)

    const job = jobs.get(jobId)
    if (job) {
      job.status = 'completed'
      job.imageUrl = imageUrl
      job.productName = productName
    }
  } catch (error) {
    console.error('[try-on] Processing failed for job:', jobId, error)

    // Fallback: create API
    try {
      console.log(`[try-on] Attempting fallback for job ${jobId}`)
      const zai = await ZAI.create()
      const settings = getEditSettings(categorySlug)
      const imageResponse = await zai.images.generations.create({
        prompt: `Professional fashion photography of a person wearing ${productName}. Studio lighting, 8k quality.`,
        size: settings.imageSize,
      })
      const imageBase64 = imageResponse.data[0]?.base64
      if (!imageBase64) throw new Error('No fallback image')

      const job = jobs.get(jobId)
      if (job) {
        job.status = 'completed'
        job.imageUrl = `data:image/png;base64,${imageBase64}`
        job.productName = productName
      }
    } catch (fallbackError) {
      console.error('[try-on] Fallback also failed:', fallbackError)
      const job = jobs.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Failed to generate try-on image'
      }
    }
  }
}
