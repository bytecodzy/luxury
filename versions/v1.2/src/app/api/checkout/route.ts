import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      items,
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !address || !city || !state || !zipCode || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Verify products and calculate subtotal
    let subtotal = 0
    const orderItemsData: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      image: string | null;
    }> = []

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        )
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for: ${product.name}` },
          { status: 400 }
        )
      }

      const itemTotal = product.price * item.quantity
      subtotal += itemTotal

      const images: string[] = JSON.parse(product.images || '[]')

      orderItemsData.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: images[0] || null,
      })
    }

    // Calculate shipping, tax, and total
    const shipping = subtotal > 500 ? 0 : 15
    const tax = Math.round(subtotal * 0.08 * 100) / 100
    const total = subtotal + shipping + tax

    // Generate order number
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const orderNumber = `3BL-${timestamp}-${random}`

    // Create order with items
    const order = await db.order.create({
      data: {
        orderNumber,
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        country,
        phone: phone || null,
        subtotal,
        shipping,
        tax,
        total,
        status: 'pending',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    })

    // Update product stock
    for (const item of items) {
      await db.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
