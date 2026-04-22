import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    })

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
