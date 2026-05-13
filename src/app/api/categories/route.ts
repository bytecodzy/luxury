import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchShopifyCategories } from '@/lib/shopify'

export async function GET() {
  // ─── On Vercel: skip DB entirely and use Shopify directly ───
  // This prevents duplications from DB + Shopify categories
  const isVercel = !!process.env.VERCEL

  if (isVercel) {
    console.log('[Categories API] Vercel detected, using Shopify directly')
    try {
      const shopifyCategories = await fetchShopifyCategories()
      return NextResponse.json({
        categories: shopifyCategories,
        source: 'shopify',
      })
    } catch (shopifyError) {
      console.error('[Categories API] Shopify fetch failed on Vercel:', shopifyError)
      return NextResponse.json(
        { error: 'Failed to fetch categories from Shopify' },
        { status: 500 }
      )
    }
  }

  // ─── Local development: Try database first ───
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
