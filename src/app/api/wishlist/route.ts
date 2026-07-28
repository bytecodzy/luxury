import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate } from '@/lib/auth-helper'

// GET /api/wishlist - List wishlist items for authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const wishlistItems = await db.wishlistItem.findMany({
      where: { userId: user!.id },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ wishlist: wishlistItems })
  } catch (err) {
    console.error('Error fetching wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

// POST /api/wishlist - Add item to wishlist
// Accepts an optional product snapshot in the body so external / Shopify / static
// products (which don't have a row in the local Product table) can still be wishlisted.
// If the product isn't in the DB, we upsert it under an 'Uncategorized' fallback category.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const body = await request.json()
    const {
      productId,
      // Optional product snapshot (used when the product isn't in the local DB)
      name,
      slug,
      description,
      price,
      image,
      images,
      category,
      categorySlug,
      platform,
      sourceUrl,
      affiliateUrl,
    } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    // ── Resolve product: try by id, then by shopifyId, then upsert using snapshot ──
    let product = await db.product.findUnique({ where: { id: productId } })

    if (!product) {
      // Maybe productId is a Shopify GID stored in shopifyId field
      try {
        product = await db.product.findFirst({ where: { shopifyId: productId } })
      } catch {
        // shopifyId column may not exist on all schemas — ignore
      }
    }

    if (!product) {
      // Maybe productId is a slug
      try {
        product = await db.product.findFirst({ where: { slug: productId } })
      } catch {
        // ignore
      }
    }

    if (!product) {
      // Product not in DB — upsert using the snapshot from the client
      // (Required for Shopify / external / static products)
      if (!name || typeof price !== 'number') {
        return NextResponse.json(
          { error: 'Product not found in DB and no snapshot provided' },
          { status: 404 }
        )
      }

      // Find or create an 'Uncategorized' fallback category
      let fallbackCategoryId: string
      try {
        const existingCat = await db.category.findFirst({ where: { slug: categorySlug || 'uncategorized' } })
        if (existingCat) {
          fallbackCategoryId = existingCat.id
        } else {
          const newCat = await db.category.create({
            data: {
              name: category || 'Uncategorized',
              slug: categorySlug || 'uncategorized',
              description: 'Products imported from external platforms',
            },
          })
          fallbackCategoryId = newCat.id
        }
      } catch (catErr) {
        console.error('Wishlist upsert: failed to resolve fallback category:', catErr)
        return NextResponse.json(
          { error: 'Unable to resolve product category' },
          { status: 500 }
        )
      }

      // Build images array (JSON-stringified for Prisma)
      const imageList = Array.isArray(images) && images.length > 0
        ? images
        : (image ? [image] : [])
      const imagesJson = JSON.stringify(imageList)

      const productSlug = slug || `${productId}-${Date.now()}`

      try {
        product = await db.product.create({
          data: {
            productNumber: `WISH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            slug: productSlug,
            description: description || '',
            price,
            images: imagesJson,
            categoryId: fallbackCategoryId,
            stock: 999, // External products always considered in-stock
            featured: false,
            tags: JSON.stringify([]),
            platform: platform || null,
            sourceUrl: sourceUrl || null,
            isExternal: true,
            affiliateUrl: affiliateUrl || null,
          },
          include: { category: { select: { id: true, name: true, slug: true } } },
        })
      } catch (createErr) {
        console.error('Wishlist upsert: failed to create product:', createErr)
        return NextResponse.json(
          { error: 'Failed to create product record for wishlist' },
          { status: 500 }
        )
      }
    }

    // Use the resolved product.id (may differ from the original productId for external products)
    const resolvedProductId = product!.id

    // Check if already in wishlist (by resolved id)
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user!.id,
          productId: resolvedProductId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Product already in wishlist', wishlistItem: existing },
        { status: 409 }
      )
    }

    const wishlistItem = await db.wishlistItem.create({
      data: {
        userId: user!.id,
        productId: resolvedProductId,
      },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ wishlistItem }, { status: 201 })
  } catch (err) {
    console.error('Error adding to wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    const wishlistItem = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user!.id,
          productId,
        },
      },
    })

    if (!wishlistItem) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      )
    }

    await db.wishlistItem.delete({
      where: { id: wishlistItem.id },
    })

    return NextResponse.json({ message: 'Item removed from wishlist' })
  } catch (err) {
    console.error('Error removing from wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}
