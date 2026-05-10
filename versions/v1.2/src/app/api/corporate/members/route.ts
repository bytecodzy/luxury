import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSessionFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      include: { corporateAccount: true },
    });

    if (!user?.corporateAccount) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    const members = await db.corporateMember.findMany({
      where: { corporateId: user.corporateAccount.id },
      orderBy: { invitedAt: 'desc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Corporate members error:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSessionFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { email, name, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const validRoles = ['corporate_admin', 'finance_user', 'campaign_manager'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be: corporate_admin, finance_user, or campaign_manager' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      include: { corporateAccount: true },
    });

    if (!user?.corporateAccount) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    // Only corporate_admin can invite
    if (user.corporateRole !== 'corporate_admin') {
      return NextResponse.json({ error: 'Only corporate admins can invite members' }, { status: 403 });
    }

    // Create or find the invited user
    let invitedUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!invitedUser) {
      // Create a placeholder user
      const bcrypt = await import('bcryptjs');
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 12);
      invitedUser = await db.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name || email.split('@')[0],
          password: tempPassword,
          role: 'corporate',
          corporateRole: role,
          approvalStatus: 'approved',
          isActive: true,
        },
      });
    } else {
      // Update existing user's corporate role
      await db.user.update({
        where: { id: invitedUser.id },
        data: { corporateRole: role },
      });
    }

    // Create corporate member
    const member = await db.corporateMember.create({
      data: {
        corporateId: user.corporateAccount.id,
        userId: invitedUser.id,
        email: email.toLowerCase().trim(),
        name: name || invitedUser.name,
        role,
        status: 'pending',
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Corporate member invite error:', error);
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}
