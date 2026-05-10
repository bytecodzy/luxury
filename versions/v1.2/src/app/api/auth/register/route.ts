import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateTokenPair, generateToken, createSession } from '@/lib/sessions';
import { validatePassword } from '@/lib/password-validator';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { validateInput, registerSchema } from '@/lib/validations/auth';
import { encrypt } from '@/lib/encryption';
import { addApiLog, getClientIpFromRequest } from '@/lib/api-logger';

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'products.manage',
    'orders.manage',
    'users.approve',
    'users.manage',
    'reports.view',
    'settings.manage',
    'inventory.manage',
    'audit.view',
    'corporate.manage',
    'campaigns.manage',
    'offers.manage',
    'categories.manage',
    'accounting.view',
    'invoices.manage',
    'payments.manage',
    'refunds.manage',
    'tickets.manage',
    'role_permissions.manage',
  ],
  user: [
    'orders.own',
    'cart.manage',
    'wishlist.manage',
    'profile.own',
    'reviews.create',
    'tickets.create',
  ],
  agent: [
    'orders.view',
    'orders.manage',
    'products.view',
    'customers.view',
    'reports.view',
    'tickets.manage',
  ],
  team: [
    'orders.view',
    'products.view',
    'inventory.manage',
    'reports.view',
  ],
  corporate: [
    'corporate.profile',
    'campaigns.own',
    'corporate.branding',
    'corporate.members',
    'orders.own',
    'cart.manage',
  ],
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Rate limiting
    const rateLimit = checkRateLimit('register', ip);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    // Zod input validation
    const validation = validateInput(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { email, name, phone, password, role, companyName, workEmail, gstNumber, billingAddress } = validation.data;

    // Validate password strength (double-check with our custom validator)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordCheck.errors },
        { status: 400 }
      );
    }

    // Validate corporate fields
    if (role === 'corporate') {
      if (!companyName || companyName.trim().length < 2) {
        return NextResponse.json(
          { error: 'Company name is required for corporate accounts' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine approval status based on role
    const approvalStatus = ['admin', 'user', 'corporate'].includes(role) ? 'approved' : 'pending';

    // Generate email verification token
    const crypto = await import('crypto');
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Encrypt sensitive fields
    const encryptedPhone = phone ? encrypt(phone.trim()) : null;
    const encryptedGstNumber = gstNumber ? encrypt(gstNumber.trim()) : null;
    const encryptedBillingAddress = billingAddress ? encrypt(billingAddress.trim()) : null;

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        phone: encryptedPhone,
        role,
        approvalStatus,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        twoFactorRequired: false,
        emailVerifyToken,
        emailVerifyExpiry,
      },
    });

    // Create CorporateAccount record if role is corporate
    if (role === 'corporate' && companyName) {
      await db.corporateAccount.create({
        data: {
          userId: user.id,
          companyName: companyName.trim(),
          workEmail: workEmail || null,
          gstNumber: encryptedGstNumber,
          billingAddress: encryptedBillingAddress,
          authorizedPerson: name.trim(),
          approvalStatus: 'pending', // Corporate accounts need approval
        },
      });

      // Update user approval status to pending for corporate
      if (approvalStatus === 'approved') {
        await db.user.update({
          where: { id: user.id },
          data: { approvalStatus: 'pending' },
        });
      }
    }

    // Create default permissions for the user
    const permissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
    if (permissions.length > 0) {
      for (const perm of permissions) {
        await db.userPermission.create({
          data: {
            userId: user.id,
            permission: perm,
          },
        }).catch(() => {}); // Ignore duplicate errors
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'register',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ role, email: user.email, isCorporate: role === 'corporate' }),
        ipAddress: ip,
        userAgent,
      },
    });

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/register',
      statusCode: 201,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      userId: user.id,
    });

    // If corporate, always require approval
    if (role === 'corporate') {
      return NextResponse.json(
        {
          message: 'Registration successful. Your corporate account is pending admin approval.',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            approvalStatus: 'pending',
            createdAt: user.createdAt,
          },
          approvalStatus: 'pending',
        },
        { status: 201 }
      );
    }

    // If auto-approved (admin/user), create session and return token
    if (approvalStatus === 'approved') {
      const userPermissions = permissions;

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
        userPermissions
      );

      // Legacy token for backward compatibility
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

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: encryptedPhone, // Return encrypted
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          approvalStatus: user.approvalStatus,
          emailVerifyToken, // For MVP testing
          permissions: userPermissions,
          createdAt: user.createdAt,
        },
        // New JWT token pair
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessExpiresAt: tokenPair.accessExpiresAt,
        refreshExpiresAt: tokenPair.refreshExpiresAt,
        // Legacy token
        token: legacyToken,
      });
    }

    // If pending approval, return 201 with approval status
    return NextResponse.json(
      {
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus,
          createdAt: user.createdAt,
        },
        approvalStatus: 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/register',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
