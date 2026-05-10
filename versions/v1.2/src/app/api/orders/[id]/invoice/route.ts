import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true, invoice: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If invoice doesn't exist, create one
    if (!order.invoice) {
      const invoiceCount = await db.orderInvoice.count();
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}-${Date.now().toString(36).toUpperCase()}`;

      const invoice = await db.orderInvoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          amount: order.subtotal,
          tax: order.tax,
          total: order.total,
          status: 'generated',
        },
      });

      return NextResponse.json({ invoice });
    }

    return NextResponse.json({ invoice: order.invoice });
  } catch (error) {
    console.error('Order invoice error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
