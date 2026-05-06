import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/orders/[id]/tracking - Get all tracking events for an order
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify order exists
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryType: true,
        estimatedDelivery: true,
        trackingNumber: true,
        trackingUrl: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get tracking events sorted by timestamp
    const trackingEvents = await db.orderTrackingEvent.findMany({
      where: { orderId: id },
      orderBy: { timestamp: 'asc' },
    })

    // Determine current status description
    const statusDescriptions: Record<string, string> = {
      pending: 'Order placed, awaiting payment',
      confirmed: 'Payment confirmed, order being processed',
      processing: 'Order is being prepared',
      shipped: 'Order has been shipped',
      out_for_delivery: 'Order is out for delivery',
      delivered: 'Order has been delivered',
      cancelled: 'Order has been cancelled',
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusDescription: statusDescriptions[order.status] || order.status,
        deliveryType: order.deliveryType,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      },
      events: trackingEvents.map((event) => ({
        id: event.id,
        status: event.status,
        description: event.description,
        location: event.location,
        timestamp: event.timestamp,
      })),
    })
  } catch (error) {
    console.error('Error fetching tracking events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking events' },
      { status: 500 }
    )
  }
}
