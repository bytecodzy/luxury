import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchShopifyProducts,
  searchShopifyProducts,
  fetchShopifyProductsByCategory,
  type ShopifyProductTransformed,
} from '@/lib/shopify'

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

/**
 * Apply filters, sorting, and pagination to Shopify fallback products
 * to match the same query semantics as the Prisma-based route.
 */
function filterAndPaginateShopifyProducts(
  products: ShopifyProductTransformed[],
  params: {
    category?: string | null
    search?: string | null
    minPrice?: number | null
    maxPrice?: number | null
    sort: string
    page: number
    limit: number
    platform?: string | null
    source?: string | null
    isExternalParam?: string | null
    occasion?: string | null
    recipient?: string | null
    relationship?: string | null
  }
) {
  let filtered = [...products]

  // Category filter
  if (params.category) {
    filtered = filtered.filter((p) => p.categorySlug === params.category)
  }

  // Search filter
  if (params.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  // Price range filter
  if (params.minPrice != null) {
    filtered = filtered.filter((p) => p.price >= (params.minPrice ?? 0))
  }
  if (params.maxPrice != null) {
    filtered = filtered.filter((p) => p.price <= (params.maxPrice ?? Infinity))
  }

  // Platform filter
  if (params.platform) {
    filtered = filtered.filter((p) => p.platform === params.platform)
  }

  // Source filter
  if (params.source === 'own') {
    filtered = filtered.filter((p) => !p.isExternal)
  } else if (params.source === 'external') {
    filtered = filtered.filter((p) => p.isExternal)
  }

  // isExternal filter
  if (params.isExternalParam === 'true') {
    filtered = filtered.filter((p) => p.isExternal)
  } else if (params.isExternalParam === 'false') {
    filtered = filtered.filter((p) => !p.isExternal)
  }

  // Occasion filter
  if (params.occasion) {
    filtered = filtered.filter((p) => p.occasions.includes(params.occasion!))
  }

  // Recipient filter
  if (params.recipient) {
    filtered = filtered.filter((p) => p.recipientTypes.includes(params.recipient!))
  }

  // Relationship filter
  if (params.relationship) {
    filtered = filtered.filter((p) => p.relationships.includes(params.relationship!))
  }

  // Sorting
  switch (params.sort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating)
      break
    case 'featured':
      filtered.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return 0
      })
      break
    case 'newest':
    default:
      // Shopify products don't have createdAt in our transformed format,
      // so we keep original order (which is Shopify's default: created_at desc)
      break
  }

  // Pagination
  const total = filtered.length
  const skip = (params.page - 1) * params.limit
  const paginated = filtered.slice(skip, skip + params.limit)

  return {
    products: paginated,
    total,
    page: params.page,
    totalPages: Math.ceil(total / params.limit),
  }
}

export async function GET(request: NextRequest) {
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

  // Gift-centric filters
  const occasion = searchParams.get('occasion')
  const recipient = searchParams.get('recipient')
  const relationship = searchParams.get('relationship')
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')

  // ─── Check data source preference ───
  // On Vercel serverless, SQLite DB is not accessible, so always use Shopify
  const dataSource = process.env.DATA_SOURCE // 'shopify' to skip DB, 'database' for DB-first (default)
  const preferShopify = dataSource === 'shopify' || !!process.env.VERCEL

  // ─── Shopify-only path (no DB, no duplication) ───
  if (preferShopify) {
    try {
      let shopifyProducts: ShopifyProductTransformed[]

      if (category && !search) {
        shopifyProducts = await fetchShopifyProductsByCategory(category)
      } else if (search && !category) {
        shopifyProducts = await searchShopifyProducts(search)
      } else if (category && search) {
        const categoryProducts = await fetchShopifyProductsByCategory(category)
        const q = search.toLowerCase()
        shopifyProducts = categoryProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
      } else {
        shopifyProducts = await fetchShopifyProducts()
      }

      const effectiveMinPriceNum = (priceMin || minPrice)
        ? parseFloat(priceMin || minPrice || '0')
        : null
      const effectiveMaxPriceNum = (priceMax || maxPrice)
        ? parseFloat(priceMax || maxPrice || '0')
        : null

      const result = filterAndPaginateShopifyProducts(shopifyProducts, {
        category: category || null,
        search: search || null,
        minPrice: effectiveMinPriceNum,
        maxPrice: effectiveMaxPriceNum,
        sort,
        page,
        limit,
        platform: platform || null,
        source: source || null,
        isExternalParam: isExternalParam || null,
        occasion: occasion || null,
        recipient: recipient || null,
        relationship: relationship || null,
      })

      return NextResponse.json({
        ...result,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Products API] Shopify fetch failed:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch products from Shopify' },
        { status: 500 }
      )
    }
  }

  // ─── DB-first path (default, with Shopify fallback) ───
  try {
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

    // Price range (legacy + new params)
    const effectiveMinPrice = priceMin || minPrice
    const effectiveMaxPrice = priceMax || maxPrice
    if (effectiveMinPrice || effectiveMaxPrice) {
      where.price = {}
      if (effectiveMinPrice) (where.price as Record<string, unknown>).gte = parseFloat(effectiveMinPrice)
      if (effectiveMaxPrice) (where.price as Record<string, unknown>).lte = parseFloat(effectiveMaxPrice)
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

    // Occasion filter: products whose occasions JSON array contains the value
    if (occasion) {
      where.occasions = { contains: occasion }
    }

    // Recipient filter: products whose recipientTypes JSON array contains the value
    if (recipient) {
      where.recipientTypes = { contains: recipient }
    }

    // Relationship filter: products whose relationships JSON array contains the value
    if (relationship) {
      where.relationships = { contains: relationship }
    }

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
      occasions: JSON.parse(p.occasions || '[]') as string[],
      recipientTypes: JSON.parse(p.recipientTypes || '[]') as string[],
      relationships: JSON.parse(p.relationships || '[]') as string[],
      deliveryEstimate: p.deliveryEstimate || null,
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
      source: 'database',
    })
  } catch (dbError) {
    console.warn('[Products API] Database query failed, falling back to Shopify:', dbError)

    // ─── Fallback to Shopify Admin API ───
    try {
      let shopifyProducts: ShopifyProductTransformed[]

      // Use targeted fetch if we have a category or search filter
      if (category && !search) {
        shopifyProducts = await fetchShopifyProductsByCategory(category)
      } else if (search && !category) {
        shopifyProducts = await searchShopifyProducts(search)
      } else if (category && search) {
        // Both filters: get by category, then search within
        const categoryProducts = await fetchShopifyProductsByCategory(category)
        const q = search.toLowerCase()
        shopifyProducts = categoryProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
      } else {
        shopifyProducts = await fetchShopifyProducts()
      }

      // Apply all the same filters, sorting, and pagination
      const effectiveMinPriceNum = (priceMin || minPrice)
        ? parseFloat(priceMin || minPrice || '0')
        : null
      const effectiveMaxPriceNum = (priceMax || maxPrice)
        ? parseFloat(priceMax || maxPrice || '0')
        : null

      const result = filterAndPaginateShopifyProducts(shopifyProducts, {
        category: category || null,
        search: search || null,
        minPrice: effectiveMinPriceNum,
        maxPrice: effectiveMaxPriceNum,
        sort,
        page,
        limit,
        platform: platform || null,
        source: source || null,
        isExternalParam: isExternalParam || null,
        occasion: occasion || null,
        recipient: recipient || null,
        relationship: relationship || null,
      })

      return NextResponse.json({
        ...result,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Products API] Shopify fallback also failed:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch products from both database and Shopify' },
        { status: 500 }
      )
    }
  }
}
