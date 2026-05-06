import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helper'

// GET /api/orders/[id] - Get single order detail with items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        reviews: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Update order (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { status, trackingNumber, trackingUrl, estimatedDelivery } = body

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: pending, processing, shipped, delivered, cancelled' },
          { status: 400 }
        )
      }
      updateData.status = status
    }
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl
    if (estimatedDelivery !== undefined) updateData.estimatedDelivery = new Date(estimatedDelivery)

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('Error updating order:', err)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Cancel order (admin or order owner with email verification)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason, email } = body

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check authorization: either admin or the order owner (verified by email)
    let isAuthorized = false

    // Try admin auth first
    try {
      const { error } = await requireAdmin(request)
      if (!error) isAuthorized = true
    } catch {
      // Not admin
    }

    // If not admin, check if email matches the order
    if (!isAuthorized) {
      if (email && order.email === email) {
        isAuthorized = true
      } else {
        return NextResponse.json(
          { error: 'Unauthorized: You can only cancel your own orders' },
          { status: 403 }
        )
      }
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      )
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered order. Use refund instead.' },
        { status: 400 }
      )
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || undefined,
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('Error cancelling order:', err)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
