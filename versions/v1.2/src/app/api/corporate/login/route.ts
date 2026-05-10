import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { work_email, password } = body;

    if (!work_email || !password) {
      return NextResponse.json(
        { error: 'Work email and password are required' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find user by email with corporate role
    const user = await db.user.findUnique({
      where: { email: work_email.toLowerCase().trim() },
      include: { corporateAccount: true },
    });

    if (!user || user.role !== 'corporate') {
      return NextResponse.json(
        { error: 'Invalid work email or password' },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: 'Please reset your password to continue' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'corporate_login_failed',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ reason: 'wrong_password' }),
          ipAddress: ip,
          userAgent,
        },
      });
      return NextResponse.json({ error: 'Invalid work email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    if (user.approvalStatus === 'suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    if (user.approvalStatus === 'pending') {
      return NextResponse.json(
        { error: 'Your corporate account is pending approval.' },
        { status: 403 }
      );
    }

    if (user.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Your corporate account application has been rejected.' },
        { status: 403 }
      );
    }

    // Check corporate account status
    if (user.corporateAccount && user.corporateAccount.approvalStatus !== 'approved') {
      return NextResponse.json(
        { error: `Corporate account is ${user.corporateAccount.approvalStatus}.` },
        { status: 403 }
      );
    }

    // If 2FA enabled/required
    if (user.twoFactorEnabled || user.twoFactorRequired) {
      return NextResponse.json({
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: userAgent.substring(0, 200),
      },
    });

    // Create session
    const token = generateToken();
    await db.session.create({
      data: {
        token,
        userId: user.id,
        ipAddress: ip,
        userAgent,
        deviceInfo: userAgent.substring(0, 200),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'corporate_login_success',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({
          corporateAccount: user.corporateAccount?.companyName,
          corporateRole: user.corporateRole,
        }),
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        corporateRole: user.corporateRole,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        approvalStatus: user.approvalStatus,
        corporateAccount: user.corporateAccount,
      },
      token,
    });
  } catch (error) {
    console.error('Corporate login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
