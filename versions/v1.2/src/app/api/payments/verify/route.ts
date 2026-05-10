import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Webhook secret for HMAC-SHA256 verification
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '3boxesluxury_webhook_secret_dev';

// Processed payment IDs for idempotency check
const processedPayments = new Set<string>();
const MAX_PROCESSED_CACHE = 10000;

/**
 * Verify HMAC-SHA256 webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Add to processed payments cache (idempotency)
 */
function markPaymentProcessed(paymentId: string): void {
  processedPayments.add(paymentId);
  // Keep cache size in check
  if (processedPayments.size > MAX_PROCESSED_CACHE) {
    const iterator = processedPayments.values();
    const first = iterator.next();
    if (!first.done) {
      processedPayments.delete(first.value);
    }
  }
}

/**
 * Check if payment was already processed (idempotency)
 */
function isPaymentProcessed(paymentId: string): boolean {
  return processedPayments.has(paymentId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, provider, paymentId, signature, amount } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verify webhook signature (if signature provided)
    if (signature) {
      const rawBody = JSON.stringify(body);
      const isValidSignature = verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET);

      if (!isValidSignature) {
        // Log invalid signature attempt
        await db.auditLog.create({
          data: {
            action: 'payment_signature_invalid',
            entity: 'order',
            entityId: orderId,
            details: JSON.stringify({
              provider: provider || 'unknown',
              paymentId: paymentId || 'unknown',
              reason: 'invalid_signature',
            }),
            ipAddress: ip,
            userAgent,
          },
        });

        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    // Find the order
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check idempotency - don't process same payment twice
    if (paymentId && isPaymentProcessed(paymentId)) {
      return NextResponse.json({
        message: 'Payment already processed (idempotent)',
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      });
    }

    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Payment already verified' },
        { status: 400 }
      );
    }

    // Validate payment amount matches order amount
    if (amount !== undefined && provider !== 'test') {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || Math.abs(paymentAmount - order.total) > 0.01) {
        // Log amount mismatch
        await db.auditLog.create({
          data: {
            action: 'payment_amount_mismatch',
            entity: 'order',
            entityId: order.id,
            details: JSON.stringify({
              orderNumber: order.orderNumber,
              expectedAmount: order.total,
              receivedAmount: paymentAmount,
              provider: provider || 'unknown',
            }),
            ipAddress: ip,
            userAgent,
          },
        });

        return NextResponse.json(
          { error: 'Payment amount does not match order total', expected: order.total, received: paymentAmount },
          { status: 400 }
        );
      }
    }

    // Mark payment as verified
    const verifiedPaymentId = paymentId || `pay_${Date.now()}`;

    // Update order payment status
    await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid' },
    });

    // Mark payment as processed (idempotency)
    markPaymentProcessed(verifiedPaymentId);

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'payment_verified',
        entity: 'order',
        entityId: order.id,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          amount: order.total,
          provider: provider || 'unknown',
          paymentId: verifiedPaymentId,
          signatureVerified: !!signature,
        }),
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({
      message: 'Payment verified successfully',
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: 'paid',
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
