import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchShopifyProducts } from '@/lib/shopify'

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try database first
    let product = null
    try {
      product = await db.product.findUnique({
        where: { id },
        include: { category: true },
      })
    } catch (dbError) {
      console.warn('[Product API] Database unavailable, trying Shopify fallback for id:', id)
    }

    // If not in DB, try Shopify fallback (critical for Vercel where DB is unavailable)
    if (!product) {
      try {
        // Shopify IDs are prefixed like "shopify-12345"
        const shopifyProducts = await fetchShopifyProducts()
        const sp = shopifyProducts.find(p => p.id === id)
        if (sp) {
          product = {
            id: sp.id,
            name: sp.name,
            slug: sp.slug,
            description: sp.description,
            price: sp.price,
            compareAtPrice: sp.compareAtPrice,
            images: JSON.stringify(sp.images),
            category: { name: sp.category, slug: sp.categorySlug },
            stock: sp.stock,
            rating: sp.rating,
            reviewCount: sp.reviewCount,
            featured: sp.featured,
            tags: JSON.stringify(sp.tags),
            deliveryEstimate: sp.deliveryEstimate || '3-5 business days',
            platform: sp.platform,
            isExternal: sp.isExternal,
            sourceUrl: sp.sourceUrl,
            affiliateUrl: sp.affiliateUrl,
          }
        }
      } catch (shopifyError) {
        console.error('[Product API] Shopify fallback also failed:', shopifyError)
      }
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform for frontend
    const transformed = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images: JSON.parse(product.images || '[]') as string[],
      category: product.category.name,
      categorySlug: product.category.slug,
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      featured: product.featured,
      tags: JSON.parse(product.tags || '[]') as string[],
      deliveryEstimate: product.deliveryEstimate || '3-5 business days',
      // Platform fields
      platform: product.platform,
      isExternal: product.isExternal,
      sourceUrl: product.sourceUrl,
      affiliateUrl: product.affiliateUrl,
      platformLogo: product.platform ? (PLATFORM_LOGO_MAP[product.platform] || null) : null,
    }

    return NextResponse.json({ product: transformed })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
