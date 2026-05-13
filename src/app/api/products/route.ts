import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchShopifyProducts,
  searchShopifyProducts,
  fetchShopifyProductsByCategory,
  type ShopifyProductTransformed,
} from '@/lib/shopify'

// Category slug to placeholder image mapping
const CATEGORY_PLACEHOLDER_MAP: Record<string, string> = {
  watches: '/images/products/watch-1.jpg',
  jewelry: '/images/products/jewelry-1.jpg',
  'leather-goods': '/images/products/leather-1.jpg',
  fragrances: '/images/products/fragrance-1.jpg',
  fashion: '/images/products/fashion-1.jpg',
  'home-living': '/images/products/home-1.jpg',
  sarees: '/images/products/saree-1.jpg',
  'mens-shirts': '/images/products/mens-shirt-1.jpg',
  'couple-gifts': '/images/products/couple-1.jpg',
  'romantic-gifts': '/images/products/couple-1.jpg',
  toys: '/images/products/toy-1.jpg',
}

function getCategoryPlaceholder(categorySlug?: string): string {
  if (!categorySlug) return '/images/placeholder.jpg'
  // Try exact match first
  if (CATEGORY_PLACEHOLDER_MAP[categorySlug]) return CATEGORY_PLACEHOLDER_MAP[categorySlug]
  // Try partial match
  for (const [key, value] of Object.entries(CATEGORY_PLACEHOLDER_MAP)) {
    if (categorySlug.includes(key) || key.includes(categorySlug)) return value
  }
  return '/images/placeholder.jpg'
}

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

/**
 * Shared Shopify fallback logic used both when DB throws an error
 * and when DB returns 0 results.
 * Returns a NextResponse with Shopify products, or null if Shopify also fails.
 */
async function tryShopifyFallback(params: {
  category: string | null
  search: string | null
  minPrice: string | null
  maxPrice: string | null
  priceMin: string | null
  priceMax: string | null
  sort: string
  page: number
  limit: number
  platform: string | null
  source: string | null
  isExternalParam: string | null
  occasion: string | null
  recipient: string | null
  relationship: string | null
}): Promise<NextResponse | null> {
  try {
    let shopifyProducts: ShopifyProductTransformed[]

    // Use targeted fetch if we have a category or search filter
    if (params.category && !params.search) {
      shopifyProducts = await fetchShopifyProductsByCategory(params.category)
    } else if (params.search && !params.category) {
      shopifyProducts = await searchShopifyProducts(params.search)
    } else if (params.category && params.search) {
      // Both filters: get by category, then search within
      const categoryProducts = await fetchShopifyProductsByCategory(params.category)
      const q = params.search.toLowerCase()
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
    const effectiveMinPriceNum = (params.priceMin || params.minPrice)
      ? parseFloat(params.priceMin || params.minPrice || '0')
      : null
    const effectiveMaxPriceNum = (params.priceMax || params.maxPrice)
      ? parseFloat(params.priceMax || params.maxPrice || '0')
      : null

    const result = filterAndPaginateShopifyProducts(shopifyProducts, {
      category: params.category || null,
      search: params.search || null,
      minPrice: effectiveMinPriceNum,
      maxPrice: effectiveMaxPriceNum,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
      platform: params.platform || null,
      source: params.source || null,
      isExternalParam: params.isExternalParam || null,
      occasion: params.occasion || null,
      recipient: params.recipient || null,
      relationship: params.relationship || null,
    })

    return NextResponse.json({
      ...result,
      source: 'shopify',
    })
  } catch (shopifyError) {
    console.error('[Products API] Shopify fallback also failed:', shopifyError)
    return null
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

  // ─── Try database first ───
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

    // If DB returned 0 results, try Shopify fallback before returning empty
    if (total === 0) {
      console.warn('[Products API] Database returned 0 results, trying Shopify fallback')
      const shopifyResult = await tryShopifyFallback({
        category, search, minPrice, maxPrice, priceMin, priceMax,
        sort, page, limit, platform, source, isExternalParam,
        occasion, recipient, relationship,
      })
      if (shopifyResult) return shopifyResult
    }

    // Transform products for frontend
    // Ensure Shopify CDN images are kept as direct URLs (not routed through image proxy)
    const transformedProducts = products.map((p) => {
      let rawImages = JSON.parse(p.images || '[]') as string[]

      // If product has no images, assign a category-specific placeholder
      if (rawImages.length === 0) {
        rawImages = [getCategoryPlaceholder(p.category?.slug)]
      }

      // Keep Shopify CDN URLs as-is; local paths also kept as-is
      const images = rawImages.map((img) => {
        // If it's a Shopify CDN URL, return it directly (no proxy needed)
        if (img.startsWith('https://cdn.shopify.com') || img.startsWith('https://shopify.com')) {
          return img
        }
        return img
      })

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        images,
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
      }
    })

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
    const shopifyResult = await tryShopifyFallback({
      category, search, minPrice, maxPrice, priceMin, priceMax,
      sort, page, limit, platform, source, isExternalParam,
      occasion, recipient, relationship,
    })
    if (shopifyResult) return shopifyResult

    return NextResponse.json(
      { error: 'Failed to fetch products from both database and Shopify' },
      { status: 500 }
    )
  }
}
