import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateTokenPair, generateToken, createSession } from '@/lib/sessions';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { validateInput, loginSchema } from '@/lib/validations/auth';
import { addApiLog, getClientIpFromRequest } from '@/lib/api-logger';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimit = checkRateLimit('login', ip);
    if (!rateLimit.allowed) {
      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 429,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        error: 'Rate limit exceeded',
      });
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    // Zod input validation
    const validation = validateInput(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has a password (social login users may not)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Please log in with your social account' },
        { status: 401 }
      );
    }

    // Check account lock status
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));

      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 423,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        userId: user.id,
        error: 'Account locked',
      });

      return NextResponse.json(
        {
          error: `Account is locked due to too many failed attempts. Please try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`,
          lockedUntil: user.lockedUntil,
          remainingMinutes: remainingMin,
        },
        { status: 423 }
      );
    }

    // If lock has expired, reset the counter
    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, unknown> = {
        failedLoginAttempts: newFailedAttempts,
      };

      // Lock account after MAX_FAILED_ATTEMPTS
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await db.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log failed login attempt
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_failed',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({
            reason: 'wrong_password',
            failedAttempts: newFailedAttempts,
            locked: newFailedAttempts >= MAX_FAILED_ATTEMPTS,
          }),
          ipAddress: ip,
          userAgent,
        },
      });

      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 401,
        responseTime: Date.now() - startTime,
        ip,
        userAgent,
        userId: user.id,
        error: 'Wrong password',
      });

      const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      const lockWarning = remainingAttempts > 0
        ? ` ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before account lock.`
        : ' Account has been locked for 30 minutes.';

      return NextResponse.json(
        { error: `Invalid email or password.${lockWarning}` },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
      return NextResponse.json(
        { error: 'Your account is pending approval', approvalStatus: 'pending' },
        { status: 403 }
      );
    }

    if (user.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Your account has been rejected. Please contact support.', approvalStatus: 'rejected' },
        { status: 403 }
      );
    }

    if (user.approvalStatus === 'suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.', approvalStatus: 'suspended' },
        { status: 403 }
      );
    }

    // If 2FA is enabled or required for this role, return that 2FA verification is needed
    if (user.twoFactorEnabled || user.twoFactorRequired) {
      return NextResponse.json({
        requiresTwoFactor: true,
        requires2FA: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      });
    }

    // Reset failed login attempts on successful login
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginDevice: userAgent.substring(0, 200),
      },
    });

    // Get user permissions
    const userWithPerms = await db.user.findUnique({
      where: { id: user.id },
      include: { permissions: { select: { permission: true } } },
    });
    const permissions = userWithPerms?.permissions.map((p) => p.permission) || [];

    // Generate JWT token pair
    const tokenPair = await generateTokenPair(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      permissions
    );

    // Also create a legacy UUID session for backward compatibility
    const legacyToken = generateToken();
    await createSession(legacyToken, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    });

    // Create audit log for successful login
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'login_success',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ role: user.role, authMethod: 'password' }),
        ipAddress: ip,
        userAgent,
      },
    });

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/login',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      userId: user.id,
    });

    // Get corporate account if applicable
    let corporateAccount = null;
    if (user.role === 'corporate') {
      corporateAccount = await db.corporateAccount.findUnique({
        where: { userId: user.id },
      });
    }

    // Return user data and tokens
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorRequired: user.twoFactorRequired,
        approvalStatus: user.approvalStatus,
        adminRole: user.adminRole,
        corporateRole: user.corporateRole,
        corporateAccount,
        permissions,
        createdAt: user.createdAt,
      },
      // New JWT token pair
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessExpiresAt: tokenPair.accessExpiresAt,
      refreshExpiresAt: tokenPair.refreshExpiresAt,
      // Legacy token for backward compatibility
      token: legacyToken,
    });
  } catch (error) {
    console.error('Login error:', error);

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/login',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
