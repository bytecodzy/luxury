import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Platform slug to logo URL mapping
const PLATFORM_LOGO_MAP: Record<string, string> = {
  myntra: '/logos/myntra.png',
  nykaa: '/logos/nykaa.png',
  amazon: '/logos/amazon.png',
  flipkart: '/logos/flipkart.png',
  caratlane: '/logos/caratlane.png',
  tanishq: '/logos/tanishq.png',
  bluestone: '/logos/bluestone.png',
  voylla: '/logos/voylla.png',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '12', 10)

    // New filters for platform aggregation
    const platform = searchParams.get('platform')
    const source = searchParams.get('source') // 'own' or 'external'
    const isExternalParam = searchParams.get('isExternal') // 'true', 'false', or 'all'

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (category) {
      where.category = { slug: category }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice)
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice)
    }

    // Platform filter: filter by platform slug
    if (platform) {
      where.platform = platform
    }

    // Source filter: 'own' = isExternal false, 'external' = isExternal true
    if (source === 'own') {
      where.isExternal = false
    } else if (source === 'external') {
      where.isExternal = true
    }

    // isExternal filter: explicit true/false/all
    if (isExternalParam === 'true') {
      where.isExternal = true
    } else if (isExternalParam === 'false') {
      where.isExternal = false
    }
    // 'all' or undefined = no filter (show both)

    // Build orderBy
    let orderBy: Record<string, unknown> | Array<Record<string, unknown>> = { createdAt: 'desc' }
    switch (sort) {
      case 'price-asc':
        orderBy = { price: 'asc' }
        break
      case 'price-desc':
        orderBy = { price: 'desc' }
        break
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'featured':
        orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }]
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Transform products for frontend
    const transformedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: JSON.parse(p.images || '[]') as string[],
      category: p.category.name,
      categorySlug: p.category.slug,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      tags: JSON.parse(p.tags || '[]') as string[],
      // Platform aggregation fields
      platform: p.platform,
      isExternal: p.isExternal,
      sourceUrl: p.sourceUrl,
      affiliateUrl: p.affiliateUrl,
      platformLogo: p.platform ? (PLATFORM_LOGO_MAP[p.platform] || null) : null,
      commission: p.commission,
      syncStatus: p.syncStatus,
    }))

    return NextResponse.json({
      products: transformedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
