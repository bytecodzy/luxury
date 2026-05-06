import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// PUT /api/admin/users/[id] - Update user (role, isActive, approvalStatus)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.approvalStatus !== undefined) updateData.approvalStatus = body.approvalStatus;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { permissions: true },
    });

    const { password: _, ...userResponse } = user;
    return NextResponse.json(userResponse);
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
