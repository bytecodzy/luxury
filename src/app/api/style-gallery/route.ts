import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/style-gallery — fetch approved gallery items (public) or admin mode
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const categorySlug = searchParams.get('categorySlug')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const mode = searchParams.get('mode') // 'approved' (default), 'pending', 'all'

    // Admin mode: show pending/all items
    if (mode === 'pending' || mode === 'all') {
      // TODO: Verify admin auth token here for production security
      const where: any = { isActive: true }
      if (mode === 'pending') where.status = 'pending'

      const items = await db.styleGallery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      const total = await db.styleGallery.count({ where })

      return NextResponse.json({ items, total })
    }

    // Public mode: only approved items (visible to everyone including mobile app)
    const where: any = { status: 'approved', isActive: true }
    if (productId) where.productId = productId
    if (categorySlug) where.categorySlug = categorySlug

    const items = await db.styleGallery.findMany({
      where,
      orderBy: [
        { likes: 'desc' },  // Most liked first
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    })

    const total = await db.styleGallery.count({ where })

    return NextResponse.json({ items, total })
  } catch (error) {
    console.error('[style-gallery] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch gallery items' }, { status: 500 })
  }
}

// POST /api/style-gallery — submit a new style to gallery (requires consent)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, productName, productImage, userId, userName, aiGeneratedImage, categorySlug, consentGiven } = body

    if (!productId || !productName || !userName || !aiGeneratedImage) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, productName, userName, aiGeneratedImage' },
        { status: 400 }
      )
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Consent is required to share to gallery' },
        { status: 400 }
      )
    }

    // Rate limit: max 5 pending submissions per user
    if (userId) {
      const pendingCount = await db.styleGallery.count({
        where: { userId, status: 'pending' },
      })
      if (pendingCount >= 5) {
        return NextResponse.json(
          { error: 'You have too many pending submissions. Please wait for admin review.' },
          { status: 429 }
        )
      }
    }

    // Rate limit: max 10 total submissions per user
    if (userId) {
      const totalCount = await db.styleGallery.count({
        where: { userId },
      })
      if (totalCount >= 10) {
        return NextResponse.json(
          { error: 'You have reached the maximum number of gallery submissions.' },
          { status: 429 }
        )
      }
    }

    const item = await db.styleGallery.create({
      data: {
        productId,
        productName,
        productImage: productImage || null,
        userId: userId || null,
        userName,
        aiGeneratedImage,
        categorySlug: categorySlug || null,
        consentGiven: true,
        status: 'pending', // All submissions start as pending — admin must approve
      },
    })

    console.log(`[style-gallery] New submission: ${item.id} by ${userName} (status: pending)`)

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        status: item.status,
        createdAt: item.createdAt,
      },
      message: 'Your style has been submitted and is pending admin approval. It will appear in the gallery once approved.',
    }, { status: 201 })
  } catch (error) {
    console.error('[style-gallery] POST error:', error)
    return NextResponse.json({ error: 'Failed to submit to gallery' }, { status: 500 })
  }
}
