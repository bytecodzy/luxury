import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchShopifyProducts,
  searchShopifyProducts,
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
  if (CATEGORY_PLACEHOLDER_MAP[categorySlug]) return CATEGORY_PLACEHOLDER_MAP[categorySlug]
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
 * Try to find a matching Shopify product by ID or by name/slug.
 */
async function findShopifyProduct(id: string): Promise<ShopifyProductTransformed | null> {
  try {
    const shopifyProducts = await fetchShopifyProducts()

    // First try exact ID match (e.g., "shopify-12345")
    const exactMatch = shopifyProducts.find((p) => p.id === id)
    if (exactMatch) return exactMatch

    // If the ID is a non-Shopify ID (e.g., a DB UUID), try matching by slug
    // Extract potential slug from the ID (some IDs are slug-based)
    const sp = shopifyProducts.find((p) => p.id === id)
    if (sp) return sp

    return null
  } catch (error) {
    console.error('[Product API] Shopify fallback failed:', error)
    return null
  }
}

/**
 * Find a Shopify product that matches a DB product by name similarity.
 * Used to get better images when DB product has no/invalid images.
 */
async function findShopifyProductByName(
  name: string,
  categorySlug?: string
): Promise<ShopifyProductTransformed | null> {
  try {
    let shopifyProducts: ShopifyProductTransformed[]

    if (categorySlug) {
      // Narrow search by fetching category-specific products
      shopifyProducts = await searchShopifyProducts(name)
      // Also filter by category if provided
      const categoryMatches = shopifyProducts.filter(
        (p) => p.categorySlug === categorySlug
      )
      if (categoryMatches.length > 0) return categoryMatches[0]
    } else {
      shopifyProducts = await searchShopifyProducts(name)
    }

    // Try exact name match
    const exactMatch = shopifyProducts.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    )
    if (exactMatch) return exactMatch

    // Try partial name match
    const partialMatch = shopifyProducts.find((p) =>
      p.name.toLowerCase().includes(name.toLowerCase())
    )
    if (partialMatch) return partialMatch

    // Return first result if any
    return shopifyProducts[0] || null
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try database first
    let product = null
    let usedShopify = false
    let usedShopifyImages = false

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
      const sp = await findShopifyProduct(id)
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
          occasions: JSON.stringify(sp.occasions || []),
          recipientTypes: JSON.stringify(sp.recipientTypes || []),
          relationships: JSON.stringify(sp.relationships || []),
          deliveryEstimate: sp.deliveryEstimate || '3-5 business days',
          platform: sp.platform,
          isExternal: sp.isExternal,
          sourceUrl: sp.sourceUrl,
          affiliateUrl: sp.affiliateUrl,
          commission: sp.commission,
          syncStatus: sp.syncStatus,
        }
        usedShopify = true
      }
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if DB product has no valid images — try to supplement from Shopify
    const parsedImages = JSON.parse(product.images || '[]') as string[]
    const hasValidImages = parsedImages.length > 0 && parsedImages.some(
      (img: string) => img && img.trim() !== ''
    )

    if (!hasValidImages && !usedShopify) {
      console.warn('[Product API] DB product has no valid images, trying Shopify for images:', id)
      const sp = await findShopifyProductByName(
        product.name,
        product.category?.slug
      )
      if (sp && sp.images.length > 0) {
        // Replace images with Shopify images
        product = {
          ...product,
          images: JSON.stringify(sp.images),
        }
        usedShopifyImages = true
      }
    }

    // Transform for frontend
    // Ensure Shopify CDN images are kept as direct URLs (not routed through image proxy)
    let rawImages = JSON.parse(product.images || '[]') as string[]

    // If still no images after all fallbacks, use category placeholder
    if (rawImages.length === 0) {
      rawImages = [getCategoryPlaceholder(product.category?.slug)]
    }

    const images = rawImages.map((img: string) => {
      // If it's a Shopify CDN URL, return it directly (no proxy needed)
      if (img.startsWith('https://cdn.shopify.com') || img.startsWith('https://shopify.com')) {
        return img
      }
      return img
    })

    const transformed = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images,
      category: product.category.name,
      categorySlug: product.category.slug,
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      featured: product.featured,
      tags: JSON.parse(product.tags || '[]') as string[],
      occasions: JSON.parse(product.occasions || '[]') as string[],
      recipientTypes: JSON.parse(product.recipientTypes || '[]') as string[],
      relationships: JSON.parse(product.relationships || '[]') as string[],
      deliveryEstimate: product.deliveryEstimate || '3-5 business days',
      // Platform fields
      platform: product.platform,
      isExternal: product.isExternal,
      sourceUrl: product.sourceUrl,
      affiliateUrl: product.affiliateUrl,
      platformLogo: product.platform ? (PLATFORM_LOGO_MAP[product.platform] || null) : null,
      commission: product.commission,
      syncStatus: product.syncStatus,
    }

    return NextResponse.json({
      product: transformed,
      source: usedShopify ? 'shopify' : (usedShopifyImages ? 'database+shopify-images' : 'database'),
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
