import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, consentsGiven } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Bundle must contain at least 1 item' },
        { status: 400 }
      );
    }

    // Validate at least 1 3Box item
    const hasOwnProduct = items.some((item: { isOwnProduct?: boolean }) => item.isOwnProduct);
    if (!hasOwnProduct) {
      return NextResponse.json(
        { error: 'Bundle must include at least 1 item from 3Box' },
        { status: 400 }
      );
    }

    // Validate consents
    if (!consentsGiven?.authorize || !consentsGiven?.delivery || !consentsGiven?.terms) {
      return NextResponse.json(
        { error: 'All consents must be given to proceed' },
        { status: 400 }
      );
    }

    // Calculate pricing
    const subtotal = items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
    const discountRate = items.length >= 5 ? 0.10 : items.length >= 3 ? 0.05 : 0;
    const discount = Math.floor(subtotal * discountRate);
    const total = subtotal - discount;

    // Generate bundle ID
    const bundleId = `3BX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Simulate AI validation
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = {
      bundleId,
      status: 'confirmed',
      itemCount: items.length,
      platforms: [...new Set(items.map((item: { platform: string }) => item.platform))],
      subtotal,
      discount,
      discountRate: discountRate * 100,
      total,
      estimatedDelivery: '5-7 business days',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, bundle: result });
  } catch (error) {
    console.error('SmartBundle create error:', error);
    return NextResponse.json(
      { error: 'Failed to create smart bundle' },
      { status: 500 }
    );
  }
}
