import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchShopifyCategories } from '@/lib/shopify'

export async function GET() {
  // ─── Try database first ───
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    const transformed = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      productCount: cat._count.products,
    }))

    return NextResponse.json({
      categories: transformed,
      source: 'database',
    })
  } catch (dbError) {
    console.warn('[Categories API] Database query failed, falling back to Shopify:', dbError)

    // ─── Fallback to Shopify Admin API ───
    try {
      const shopifyCategories = await fetchShopifyCategories()

      return NextResponse.json({
        categories: shopifyCategories,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Categories API] Shopify fallback also failed:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch categories from both database and Shopify' },
        { status: 500 }
      )
    }
  }
}
