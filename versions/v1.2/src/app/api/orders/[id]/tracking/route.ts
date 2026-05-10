import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const events = await db.orderTrackingEvent.findMany({
      where: { orderId: id },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Order tracking error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking events' }, { status: 500 });
  }
}
