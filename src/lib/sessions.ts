import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// ─── JWT-based stateless sessions ────────────────────────────────
// On Vercel (serverless), in-memory session cache doesn't persist across
// invocations. JWT tokens encode the session data themselves, so no
// server-side storage is needed.

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key-change-in-production';
const SESSION_EXPIRY = '7d';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  approvalStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface SessionMetadata {
  ipAddress?: string;
  deviceInfo?: string;
}

// In-memory session cache for local development (fast lookups)
const sessionCache = new Map<string, { userId: string; expiresAt: Date; id: string; email: string; name: string; role: string }>();

/**
 * Export the session cache for synchronous lookups (used by auth.ts verifyAuth).
 */
export { sessionCache as sessions, sessionCache };

// Clean expired sessions from cache every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [token, session] of sessionCache.entries()) {
    if (session.expiresAt < now) {
      sessionCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a new session for a user.
 * On Vercel: creates a JWT token with user data encoded inside.
 * Locally: also persists to DB and in-memory cache.
 */
export async function createSession(
  token: string,
  user: SessionUser,
  metadata?: SessionMetadata
): Promise<void> {
  const isVercel = !!process.env.VERCEL;

  // Always update in-memory cache (works for local dev and current invocation)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  sessionCache.set(token, { userId: user.id, expiresAt, id: user.id, email: user.email, name: user.name, role: user.role });

  // On Vercel, we rely on JWT — no DB session storage needed
  if (isVercel) {
    console.log('[Sessions] Vercel detected, using JWT-only session');
    return;
  }

  // Locally: persist to DB as well
  try {
    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.deviceInfo || null,
        deviceInfo: metadata?.deviceInfo || null,
      },
    });
  } catch (dbError) {
    console.log('[Sessions] DB session creation failed (non-critical):', dbError);
  }
}

/**
 * Get a session by token.
 * On Vercel: decodes the JWT token to get user data.
 * Locally: checks in-memory cache first, falls back to DB.
 */
export async function getSessionAsync(
  token: string
): Promise<SessionUser | null> {
  if (!token) return null;

  // Check in-memory cache first (fast)
  const cached = sessionCache.get(token);
  if (cached) {
    if (cached.expiresAt < new Date()) {
      sessionCache.delete(token);
      return null;
    }

    // For env-var admin users (id === 'admin-env'), skip DB lookup
    if (cached.id === 'admin-env') {
      return {
        id: cached.id,
        email: cached.email,
        name: cached.name,
        role: cached.role,
        avatar: null,
        isActive: true,
        approvalStatus: 'approved',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
      };
    }

    // Try to fetch user from DB to get fresh data
    try {
      const user = await db.user.findUnique({
        where: { id: cached.userId },
      });

      if (!user || !user.isActive) return null;

      return {
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
      };
    } catch {
      // DB unavailable — return data from cache
      return {
        id: cached.id,
        email: cached.email,
        name: cached.name,
        role: cached.role,
        avatar: null,
        isActive: true,
        approvalStatus: 'approved',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
      };
    }
  }

  // Not in cache — try JWT verification first (works on Vercel)
  const jwtUser = verifyJWTSession(token);
  if (jwtUser) {
    // Add to in-memory cache for faster subsequent lookups in this invocation
    sessionCache.set(token, {
      userId: jwtUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      id: jwtUser.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role: jwtUser.role,
    });
    return jwtUser;
  }

  // Fallback to DB session lookup (local dev only)
  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { token } });
      return null;
    }

    // Check user is still active
    if (!session.user.isActive) return null;

    // Add to cache
    sessionCache.set(token, {
      userId: session.userId,
      expiresAt: session.expiresAt,
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    });

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      avatar: session.user.avatar,
      isActive: session.user.isActive,
      approvalStatus: session.user.approvalStatus,
      emailVerified: session.user.emailVerified,
      phoneVerified: session.user.phoneVerified,
      twoFactorEnabled: session.user.twoFactorEnabled,
    };
  } catch {
    // DB unavailable — no session found in cache, JWT, or DB
    return null;
  }
}

/**
 * Destroy a session by token.
 * Removes from in-memory cache. On Vercel, JWT tokens can't be revoked
 * server-side, but they have a short enough expiry.
 */
export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token);

  try {
    await db.session.delete({ where: { token } });
  } catch {
    // Session may not exist, that's fine
  }
}

/**
 * Generate a new session token.
 * On Vercel: creates a JWT with user data encoded.
 * Locally: creates a simple UUID token (data stored in DB/cache).
 */
export function generateToken(): string {
  return uuidv4();
}

/**
 * Create a JWT session token with user data encoded inside.
 * This is used on Vercel where in-memory cache doesn't persist.
 */
export function createJWTSessionToken(user: SessionUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      type: 'session',
    },
    JWT_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );
}

/**
 * Verify a JWT session token and return the user data.
 * Returns null if the token is invalid or expired.
 */
export function verifyJWTSession(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
      approvalStatus: string;
      emailVerified: boolean;
      phoneVerified: boolean;
      twoFactorEnabled: boolean;
      type: string;
    };

    if (decoded.type !== 'session') return null;
    if (!decoded.isActive) return null;

    return {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      avatar: null,
      isActive: decoded.isActive,
      approvalStatus: decoded.approvalStatus || 'approved',
      emailVerified: decoded.emailVerified,
      phoneVerified: decoded.phoneVerified || false,
      twoFactorEnabled: decoded.twoFactorEnabled || false,
    };
  } catch {
    return null;
  }
}

// ─── JWT Token Pair (for refresh flow) ───────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Generate a JWT access/refresh token pair for a user.
 */
export async function generateTokenPair(
  user: SessionUser,
  permissions: string[] = []
): Promise<TokenPair> {
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPair | null> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Get user permissions
    const userWithPerms = await db.user.findUnique({
      where: { id: user.id },
      include: { permissions: { select: { permission: true } } },
    });
    const permissions = userWithPerms?.permissions.map((p) => p.permission) || [];

    const sessionUser: SessionUser = {
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
    };

    return generateTokenPair(sessionUser, permissions);
  } catch {
    return null;
  }
}
