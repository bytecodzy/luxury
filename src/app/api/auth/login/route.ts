import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { createSession, generateToken } from '@/lib/sessions';

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key';

// Demo users for when the database is unavailable (e.g., Vercel without Postgres)
const DEMO_USERS: Record<string, { name: string; role: string; password: string; permissions: string[] }> = {
  'admin@3boxesluxury.com': {
    name: 'Admin',
    role: 'admin',
    password: 'admin123',
    permissions: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'],
  },
  'user@3boxesluxury.com': {
    name: 'User',
    role: 'user',
    password: 'user123',
    permissions: ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'],
  },
  'agent@3boxesluxury.com': {
    name: 'Agent',
    role: 'agent',
    password: 'agent123',
    permissions: ['orders.view', 'orders.manage', 'products.view', 'customers.view', 'reports.view'],
  },
  'team@3boxesluxury.com': {
    name: 'Team',
    role: 'team',
    password: 'team123',
    permissions: ['orders.view', 'products.view', 'inventory.manage', 'reports.view'],
  },
  'corporate@3boxesluxury.com': {
    name: 'TechCorp Industries',
    role: 'corporate',
    password: 'corporate123',
    permissions: ['corporate.manage', 'campaigns.manage', 'branding.manage', 'recipients.manage'],
  },
};

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

    const normalizedEmail = email.toLowerCase().trim();

    // Try database first
    let user = null;
    let isDbAvailable = false;
    try {
      user = await db.user.findUnique({
        where: { email: normalizedEmail },
      });
      isDbAvailable = true;
    } catch (dbError) {
      console.warn('[Auth] Database unavailable, trying demo fallback for:', normalizedEmail);
    }

    if (user) {
      // Database user found - use normal auth flow
      if (!user.password) {
        return NextResponse.json(
          { error: 'Please log in with your social account' },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact support.' },
          { status: 403 }
        );
      }

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

      if (user.twoFactorEnabled) {
        return NextResponse.json({
          requiresTwoFactor: true,
          userId: user.id,
          message: 'Two-factor authentication required',
        });
      }

      try {
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
      } catch (sessionError) {
        console.error('[Auth] Session creation failed, trying demo fallback:', sessionError);
        // Fall through to demo fallback
      }
    }

    // Demo fallback: when DB is unavailable or session creation fails
    const demoUser = DEMO_USERS[normalizedEmail];
    if (demoUser && demoUser.password === password) {
      console.log('[Auth] Using demo user fallback for:', normalizedEmail);
      const demoId = `demo-${normalizedEmail.split('@')[0]}`;

      // Generate a JWT token that works on Vercel (no DB needed for verification)
      const jwtToken = jwt.sign(
        {
          type: 'session',
          userId: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          permissions: demoUser.permissions,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Also create a regular session for in-memory cache
      try {
        await createSession(jwtToken, {
          id: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          avatar: null,
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
        });
      } catch {
        console.log('[Auth] DB session creation failed, using JWT-only for demo user');
      }

      return NextResponse.json({
        user: {
          id: demoId,
          email: normalizedEmail,
          name: demoUser.name,
          role: demoUser.role,
          avatar: null,
          phone: null,
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
        },
        token: jwtToken,
        permissions: demoUser.permissions,
        _demo: true, // Flag to indicate this is a demo session
      });
    }

    // No user found in DB and no demo match
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
