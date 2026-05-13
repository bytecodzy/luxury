import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, generateToken, sessionCache } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Try to find user by email in database first
    let user = null;
    try {
      user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    } catch (dbError) {
      console.log('[Auth] Database unavailable for login, trying env var fallback');
    }

    // If DB unavailable or user not found, try env var admin credentials
    if (!user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (
        adminEmail &&
        adminPassword &&
        email.toLowerCase().trim() === adminEmail.toLowerCase() &&
        password === adminPassword
      ) {
        // Create a virtual admin session from env vars
        const token = generateToken();
        const virtualAdminUser = {
          id: 'admin-env',
          email: adminEmail,
          name: 'Admin',
          role: 'admin',
          avatar: null,
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
        };

        // Try to create session in DB, but don't fail if DB is unavailable
        try {
          await createSession(token, virtualAdminUser);
        } catch {
          // DB unavailable — session will be in-memory only
          console.log(
            '[Auth] DB unavailable for session creation, using in-memory session'
          );
          // Store in the in-memory cache directly so getSessionAsync can find it
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          sessionCache.set(token, {
            userId: virtualAdminUser.id,
            expiresAt,
            id: virtualAdminUser.id,
            email: virtualAdminUser.email,
            name: virtualAdminUser.name,
            role: virtualAdminUser.role,
          });
        }

        return NextResponse.json({
          user: virtualAdminUser,
          token,
        });
      }

      // Original error response — no user found and env var didn't match
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

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
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
        {
          error: 'Your account has been rejected. Please contact support.',
          approvalStatus: 'rejected',
        },
        { status: 403 }
      );
    }

    // If 2FA is enabled, return that 2FA verification is needed
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      });
    }

    // Create session
    const token = generateToken();
    await createSession(token, {
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

    // Return user data and token
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
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
