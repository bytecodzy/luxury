/**
 * Shopify Admin API Client
 * 
 * Provides fallback data fetching when the database is unavailable.
 * Uses the Shopify Admin REST API to fetch products and collections.
 */

// ─── Configuration ───

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com'
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || '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'
const SHOPIFY_API_VERSION = '2024-10'
const SHOPIFY_API_BASE = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`

// ─── Shopify Raw Types ───

interface ShopifyImage {
  id: number
  product_id: number
  position: number
  created_at: string
  updated_at: string
  alt: string | null
  width: number
  height: number
  src: string
  variant_ids: number[]
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku: string | null
  position: number
  inventory_policy: string
  compare_at_price: string | null
  fulfillment_service: string
  inventory_management: string | null
  option1: string | null
  option2: string | null
  option3: string | null
  created_at: string
  updated_at: string
  taxable: boolean
  barcode: string | null
  grams: number
  image_id: number | null
  weight: number
  weight_unit: string
  inventory_quantity: number
  requires_shipping: boolean
}

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at: string | null
  template_suffix: string | null
  published_scope: string
  tags: string
  status: string
  variants: ShopifyVariant[]
  options: Array<{
    id: number
    name: string
    position: number
    values: string[]
  }>
  images: ShopifyImage[]
  image: ShopifyImage | null
}

interface ShopifyCollection {
  id: number
  handle: string
  title: string
  updated_at: string
  body_html: string
  published_at: string | null
  sort_order: string
  template_suffix: string | null
  published_scope: string
  image?: {
    created_at: string
    alt: string | null
    width: number
    height: number
    src: string
  } | null
}

interface ShopifyCollect {
  id: number
  collection_id: number
  product_id: number
  created_at: string
  updated_at: string
  position: number
  sort_value: string
}

// ─── Transformed Types (matching Prisma API output) ───

export interface ShopifyProductTransformed {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAtPrice: number | null
  images: string[]
  category: string
  categorySlug: string
  stock: number
  rating: number
  reviewCount: number
  featured: boolean
  tags: string[]
  occasions: string[]
  recipientTypes: string[]
  relationships: string[]
  deliveryEstimate: string | null
  platform: string | null
  isExternal: boolean
  sourceUrl: string | null
  affiliateUrl: string | null
  platformLogo: string | null
  commission: number | null
  syncStatus: string
}

export interface ShopifyCategoryTransformed {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productCount: number
}

// ─── In-memory cache ───

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let productsCache: CacheEntry<ShopifyProductTransformed[]> | null = null
let categoriesCache: CacheEntry<ShopifyCategoryTransformed[]> | null = null

function isCacheValid<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL
}

// ─── API Fetch Helper ───

async function shopifyFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SHOPIFY_API_BASE}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes at Next.js level
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

// ─── Category placeholder images ───

const CATEGORY_PLACEHOLDER_MAP: Record<string, string> = {
  watches: '/images/products/watch-1.jpg',
  jewelry: '/images/products/jewelry-1.jpg',
  jewellery: '/images/products/jewelry-1.jpg',
  rings: '/images/products/jewelry-1.jpg',
  necklaces: '/images/products/jewelry-1.jpg',
  earrings: '/images/products/jewelry-1.jpg',
  bracelets: '/images/products/jewelry-1.jpg',
  bangles: '/images/products/jewelry-1.jpg',
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

function getCategoryPlaceholder(categorySlug: string): string {
  if (CATEGORY_PLACEHOLDER_MAP[categorySlug]) return CATEGORY_PLACEHOLDER_MAP[categorySlug]
  for (const [key, value] of Object.entries(CATEGORY_PLACEHOLDER_MAP)) {
    if (categorySlug.includes(key) || key.includes(categorySlug)) return value
  }
  return '/images/placeholder.jpg'
}

// ─── Slug Helper ───

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Category Mapping ───

const PRODUCT_TYPE_TO_CATEGORY: Record<string, { name: string; slug: string }> = {
  // Jewellery categories
  'rings': { name: 'Rings', slug: 'rings' },
  'ring': { name: 'Rings', slug: 'rings' },
  'necklaces': { name: 'Necklaces', slug: 'necklaces' },
  'necklace': { name: 'Necklaces', slug: 'necklaces' },
  'pendants': { name: 'Pendants', slug: 'pendants' },
  'pendant': { name: 'Pendants', slug: 'pendants' },
  'earrings': { name: 'Earrings', slug: 'earrings' },
  'earring': { name: 'Earrings', slug: 'earrings' },
  'bracelets': { name: 'Bracelets', slug: 'bracelets' },
  'bracelet': { name: 'Bracelets', slug: 'bracelets' },
  'bangles': { name: 'Bangles', slug: 'bangles' },
  'bangle': { name: 'Bangles', slug: 'bangles' },
  'chains': { name: 'Chains', slug: 'chains' },
  'chain': { name: 'Chains', slug: 'chains' },
  'anklets': { name: 'Anklets', slug: 'anklets' },
  'anklet': { name: 'Anklets', slug: 'anklets' },
  'brooches': { name: 'Brooches', slug: 'brooches' },
  'brooch': { name: 'Brooches', slug: 'brooches' },
  // Watch categories
  'watches': { name: 'Watches', slug: 'watches' },
  'watch': { name: 'Watches', slug: 'watches' },
  // Gift categories
  'gift sets': { name: 'Gift Sets', slug: 'gift-sets' },
  'gift set': { name: 'Gift Sets', slug: 'gift-sets' },
  'gift box': { name: 'Gift Boxes', slug: 'gift-boxes' },
  'gift boxes': { name: 'Gift Boxes', slug: 'gift-boxes' },
  // Accessory categories
  'accessories': { name: 'Accessories', slug: 'accessories' },
  'accessory': { name: 'Accessories', slug: 'accessories' },
  // General
  'jewellery': { name: 'Jewellery', slug: 'jewellery' },
  'jewelry': { name: 'Jewellery', slug: 'jewellery' },
  'fine jewellery': { name: 'Fine Jewellery', slug: 'fine-jewellery' },
  'fashion jewellery': { name: 'Fashion Jewellery', slug: 'fashion-jewellery' },
  'costume jewellery': { name: 'Fashion Jewellery', slug: 'fashion-jewellery' },
}

function getCategoryForProductType(productType: string): { name: string; slug: string } {
  if (!productType) {
    return { name: 'Uncategorized', slug: 'uncategorized' }
  }

  const lower = productType.toLowerCase().trim()

  // Direct match
  if (PRODUCT_TYPE_TO_CATEGORY[lower]) {
    return PRODUCT_TYPE_TO_CATEGORY[lower]
  }

  // Partial match
  for (const [key, value] of Object.entries(PRODUCT_TYPE_TO_CATEGORY)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value
    }
  }

  // Create category from product type
  return { name: productType, slug: toSlug(productType) }
}

// ─── Public API ───

/**
 * Fetch all products from Shopify Admin API and transform to match the Prisma API format.
 * Results are cached for 5 minutes.
 */
export async function fetchShopifyProducts(): Promise<ShopifyProductTransformed[]> {
  if (isCacheValid(productsCache)) {
    return productsCache.data
  }

  try {
    // Fetch products with up to 250 per page
    const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
      '/products.json',
      { limit: '250', status: 'active' }
    )

    const products = data.products || []

    const transformed: ShopifyProductTransformed[] = products.map((p) => {
      const firstVariant = p.variants?.[0]
      const category = getCategoryForProductType(p.product_type)
      const tags = p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

      return {
        id: `shopify-${p.id}`,
        name: p.title,
        slug: p.handle || toSlug(p.title),
        description: p.body_html?.replace(/<[^>]*>/g, '').trim() || '',
        price: firstVariant ? parseFloat(firstVariant.price) || 0 : 0,
        compareAtPrice: firstVariant?.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null,
        images: p.images?.map((img) => img.src).length > 0
          ? p.images.map((img) => img.src)
          : [getCategoryPlaceholder(category.slug)],
        category: category.name,
        categorySlug: category.slug,
        stock: firstVariant?.inventory_quantity ?? 0,
        rating: 0,
        reviewCount: 0,
        featured: false,
        tags,
        occasions: [],
        recipientTypes: [],
        relationships: [],
        deliveryEstimate: '3-5 business days',
        platform: null,
        isExternal: false,
        sourceUrl: null,
        affiliateUrl: null,
        platformLogo: null,
        commission: null,
        syncStatus: 'active',
      }
    })

    productsCache = { data: transformed, timestamp: Date.now() }
    return transformed
  } catch (error) {
    console.error('[Shopify] Failed to fetch products:', error)
    throw error
  }
}

/**
 * Normalize a category name for deduplication.
 * Handles singular/plural, case differences, and common variations.
 */
function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/s$/, '') // Remove trailing 's' for plural→singular normalization
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Fetch categories derived from Shopify collections and product types.
 * Results are cached for 5 minutes.
 * Deduplicates by normalizing names (e.g., "Rings" and "ring" → same category).
 */
export async function fetchShopifyCategories(): Promise<ShopifyCategoryTransformed[]> {
  if (isCacheValid(categoriesCache)) {
    return categoriesCache.data
  }

  try {
    // Fetch both custom and smart collections
    const [customData, smartData, products] = await Promise.all([
      shopifyFetch<{ custom_collections: ShopifyCollection[] }>(
        '/custom_collections.json',
        { limit: '250' }
      ).catch(() => ({ custom_collections: [] })),
      shopifyFetch<{ smart_collections: ShopifyCollection[] }>(
        '/smart_collections.json',
        { limit: '250' }
      ).catch(() => ({ smart_collections: [] })),
      fetchShopifyProducts().catch(() => [] as ShopifyProductTransformed[]),
    ])

    const customCollections = customData.custom_collections || []
    const smartCollections = smartData.smart_collections || []

    // Build category map from collections — key by normalized name for dedup
    const categoryMap = new Map<string, ShopifyCategoryTransformed>()
    const normalizedToSlug = new Map<string, string>() // normalized name → canonical slug

    // Add categories from collections (these take priority — they have images/descriptions)
    for (const col of [...customCollections, ...smartCollections]) {
      const slug = col.handle || toSlug(col.title)
      const normalizedName = normalizeCategoryName(col.title)

      // Skip if we already have a category with this normalized name
      if (normalizedToSlug.has(normalizedName)) continue

      normalizedToSlug.set(normalizedName, slug)
      categoryMap.set(slug, {
        id: `shopify-col-${col.id}`,
        name: col.title,
        slug,
        description: col.body_html?.replace(/<[^>]*>/g, '').trim() || null,
        image: col.image?.src || null,
        productCount: 0,
      })
    }

    // Count products per category (from product_type)
    const productCountMap = new Map<string, number>()
    for (const product of products) {
      const count = productCountMap.get(product.categorySlug) || 0
      productCountMap.set(product.categorySlug, count + 1)
    }

    // Also derive categories from product types if not already in collections
    // Use normalized name for deduplication
    for (const product of products) {
      const normalizedName = normalizeCategoryName(product.category)
      const existingSlug = normalizedToSlug.get(normalizedName)

      if (existingSlug) {
        // Category already exists (from collection) — just accumulate product count
        // Also update product's categorySlug to match the existing canonical slug
        product.categorySlug = existingSlug
        product.category = categoryMap.get(existingSlug)?.name || product.category
      } else if (!categoryMap.has(product.categorySlug)) {
        // New category from product type
        normalizedToSlug.set(normalizedName, product.categorySlug)
        categoryMap.set(product.categorySlug, {
          id: `shopify-cat-${product.categorySlug}`,
          name: product.category,
          slug: product.categorySlug,
          description: null,
          image: null,
          productCount: 0,
        })
      }
    }

    // Update product counts
    for (const [slug, cat] of categoryMap) {
      cat.productCount = productCountMap.get(slug) || 0
    }

    // Filter out categories with 0 products (empty collections with no matching products)
    const categories = Array.from(categoryMap.values())
      .filter(cat => cat.productCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    categoriesCache = { data: categories, timestamp: Date.now() }
    return categories
  } catch (error) {
    console.error('[Shopify] Failed to fetch categories:', error)
    throw error
  }
}

/**
 * Fetch products filtered by category slug from Shopify.
 */
export async function fetchShopifyProductsByCategory(
  categorySlug: string
): Promise<ShopifyProductTransformed[]> {
  const allProducts = await fetchShopifyProducts()
  return allProducts.filter((p) => p.categorySlug === categorySlug)
}

/**
 * Search Shopify products by name or description.
 */
export async function searchShopifyProducts(
  query: string
): Promise<ShopifyProductTransformed[]> {
  const allProducts = await fetchShopifyProducts()
  const lowerQuery = query.toLowerCase()
  return allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Check if Shopify API is available by making a lightweight request.
 */
export async function isShopifyAvailable(): Promise<boolean> {
  try {
    await shopifyFetch('/products/count.json')
    return true
  } catch {
    return false
  }
}

/**
 * Invalidate the Shopify cache to force fresh data on next request.
 */
export function invalidateShopifyCache(): void {
  productsCache = null
  categoriesCache = null
}
