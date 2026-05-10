import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items = [],
      deliveryType = 'standard',
      scheduledDate,
      couponCode,
      giftWrapping = false,
      giftWrapStyle,
      hidePrice = false,
    } = body;

    // Calculate subtotal from items
    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => 
      sum + item.price * item.quantity, 0
    );

    // Shipping calculation
    let shipping = 0;
    switch (deliveryType) {
      case 'standard':
        shipping = subtotal > 500 ? 0 : 50;
        break;
      case 'express':
        shipping = 150;
        break;
      case 'same-day':
        shipping = 250;
        break;
      case 'scheduled':
        shipping = 100;
        break;
      default:
        shipping = subtotal > 500 ? 0 : 50;
    }

    // Gift wrapping cost
    let giftWrapCost = 0;
    if (giftWrapping) {
      switch (giftWrapStyle) {
        case 'premium':
          giftWrapCost = 150;
          break;
        case 'luxury':
          giftWrapCost = 300;
          break;
        default:
          giftWrapCost = 75; // classic
      }
    }

    // Tax (8%)
    const tax = Math.round(subtotal * 0.08 * 100) / 100;

    // Discount (coupon validation would go here)
    let discount = 0;
    let couponDetails = null;
    if (couponCode) {
      // Simple coupon validation - in production this would call the offers API
      const { db } = await import('@/lib/db');
      const offer = await db.offer.findUnique({
        where: { code: couponCode },
      });

      if (offer && offer.isActive && new Date() >= offer.validFrom && new Date() <= offer.validTo) {
        if (offer.usageLimit === null || offer.usedCount < offer.usageLimit) {
          if (!offer.minOrder || subtotal >= offer.minOrder) {
            if (offer.type === 'percentage') {
              discount = Math.round(subtotal * (offer.value / 100) * 100) / 100;
              if (offer.maxDiscount) {
                discount = Math.min(discount, offer.maxDiscount);
              }
            } else {
              discount = offer.value;
            }
            couponDetails = {
              code: offer.code,
              type: offer.type,
              value: offer.value,
              discount,
            };
          }
        }
      }
    }

    const total = Math.max(0, subtotal + shipping + giftWrapCost + tax - discount);

    return NextResponse.json({
      subtotal,
      shipping,
      giftWrapCost,
      tax,
      discount,
      total,
      deliveryType,
      scheduledDate,
      couponDetails,
      breakdown: {
        itemsCount: items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
        shippingNote: deliveryType === 'standard' && subtotal > 500 ? 'Free shipping on orders over ₹500' : null,
      },
    });
  } catch (error) {
    console.error('Checkout estimate error:', error);
    return NextResponse.json({ error: 'Failed to calculate estimate' }, { status: 500 });
  }
}
