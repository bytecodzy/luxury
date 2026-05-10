import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionFromRequest(request);
    const body = await request.json();
    const { orderId, provider } = body;

    if (!orderId || !provider) {
      return NextResponse.json({ error: 'Order ID and provider are required' }, { status: 400 });
    }

    if (!['razorpay', 'stripe'].includes(provider)) {
      return NextResponse.json({ error: 'Provider must be razorpay or stripe' }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed for this order' }, { status: 400 });
    }

    // Create payment session
    const crypto = await import('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');

    const paymentSession = await db.paymentSession.create({
      data: {
        orderId: order.id,
        provider,
        providerSessionId: provider === 'razorpay' ? `order_${sessionId}` : `cs_${sessionId}`,
        amount: order.total,
        currency: 'INR',
        status: 'created',
        metadata: JSON.stringify({
          orderNumber: order.orderNumber,
          customerEmail: order.email,
        }),
      },
    });

    // Mock provider response
    if (provider === 'razorpay') {
      return NextResponse.json({
        provider: 'razorpay',
        razorpay_order_id: paymentSession.providerSessionId,
        amount: Math.round(order.total * 100), // paise
        currency: 'INR',
        key_id: 'rzp_test_mock_key', // Mock key
        name: '3 BOXES LUXURY',
        description: `Order ${order.orderNumber}`,
        prefill: {
          name: `${order.firstName} ${order.lastName}`,
          email: order.email,
          contact: order.phone || '',
        },
        paymentSessionId: paymentSession.id,
      });
    }

    // Stripe
    return NextResponse.json({
      provider: 'stripe',
      session_id: paymentSession.providerSessionId,
      payment_url: `/checkout/payment?session_id=${paymentSession.providerSessionId}`,
      amount: Math.round(order.total * 100), // cents
      currency: 'inr',
      paymentSessionId: paymentSession.id,
    });
  } catch (error) {
    console.error('Create payment session error:', error);
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 });
  }
}
