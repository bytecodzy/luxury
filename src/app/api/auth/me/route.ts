import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync, sessionCache, verifyJWTSession } from '@/lib/sessions';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const auth = request.headers.get('authorization');
    const token = auth?.replace('Bearer ', '') ?? '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check in-memory cache first (works even when DB is unavailable)
    const cachedSession = sessionCache.get(token);
    if (cachedSession) {
      if (cachedSession.expiresAt < new Date()) {
        sessionCache.delete(token);
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }

      // If this is the env-var admin user, return from cache without DB lookup
      if (cachedSession.id === 'admin-env') {
        return NextResponse.json({
          user: {
            id: cachedSession.id,
            email: cachedSession.email,
            name: cachedSession.name,
            role: cachedSession.role,
            avatar: null,
            phone: null,
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
            approvalStatus: 'approved',
            socialProvider: null,
          },
          permissions: ['admin:full'],
        });
      }

      // For regular users, try to fetch fresh data from DB
      try {
        const dbUser = await db.user.findUnique({
          where: { id: cachedSession.userId },
          include: {
            permissions: {
              select: {
                id: true,
                permission: true,
              },
            },
          },
        });

        if (dbUser) {
          return NextResponse.json({
            user: {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              avatar: dbUser.avatar,
              phone: dbUser.phone,
              isActive: dbUser.isActive,
              emailVerified: dbUser.emailVerified,
              phoneVerified: dbUser.phoneVerified,
              twoFactorEnabled: dbUser.twoFactorEnabled,
              approvalStatus: dbUser.approvalStatus,
              socialProvider: dbUser.socialProvider,
              createdAt: dbUser.createdAt,
              updatedAt: dbUser.updatedAt,
            },
            permissions: dbUser.permissions.map((p) => p.permission),
          });
        }
      } catch (dbError) {
        console.log('[Auth /me] DB unavailable, returning cached session data');
        // DB unavailable — return what we have from cache
        return NextResponse.json({
          user: {
            id: cachedSession.id,
            email: cachedSession.email,
            name: cachedSession.name,
            role: cachedSession.role,
            avatar: null,
            phone: null,
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
            approvalStatus: 'approved',
            socialProvider: null,
          },
          permissions:
            cachedSession.role === 'admin' ? ['admin:full'] : [],
        });
      }
    }

    // Try JWT verification (works on Vercel where in-memory cache is empty)
    const jwtUser = verifyJWTSession(token);
    if (jwtUser) {
      // Add to in-memory cache for this invocation
      sessionCache.set(token, {
        userId: jwtUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        id: jwtUser.id,
        email: jwtUser.email,
        name: jwtUser.name,
        role: jwtUser.role,
      });

      return NextResponse.json({
        user: {
          id: jwtUser.id,
          email: jwtUser.email,
          name: jwtUser.name,
          role: jwtUser.role,
          avatar: jwtUser.avatar,
          phone: null,
          isActive: jwtUser.isActive,
          emailVerified: jwtUser.emailVerified,
          phoneVerified: jwtUser.phoneVerified,
          twoFactorEnabled: jwtUser.twoFactorEnabled,
          approvalStatus: jwtUser.approvalStatus,
          socialProvider: null,
        },
        permissions: jwtUser.role === 'admin' ? ['admin:full'] : [],
      });
    }

    // Fallback to full async session lookup (checks DB session table)
    const user = await getSessionAsync(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh user data from DB with permissions
    try {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          permissions: {
            select: {
              id: true,
              permission: true,
            },
          },
        },
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          avatar: dbUser.avatar,
          phone: dbUser.phone,
          isActive: dbUser.isActive,
          emailVerified: dbUser.emailVerified,
          phoneVerified: dbUser.phoneVerified,
          twoFactorEnabled: dbUser.twoFactorEnabled,
          approvalStatus: dbUser.approvalStatus,
          socialProvider: dbUser.socialProvider,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        },
        permissions: dbUser.permissions.map((p) => p.permission),
      });
    } catch (dbError) {
      console.log('[Auth /me] DB unavailable for user lookup, returning session data');
      // DB unavailable — return what we have from session
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          phone: null,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          approvalStatus: user.approvalStatus,
          socialProvider: null,
        },
        permissions: user.role === 'admin' ? ['admin:full'] : [],
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching profile' },
      { status: 500 }
    );
  }
}
