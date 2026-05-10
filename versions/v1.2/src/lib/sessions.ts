import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// In-memory session cache for fast lookups
const sessionCache = new Map<string, { userId: string; expiresAt: Date }>();

// Clean expired sessions from cache every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [token, session] of sessionCache.entries()) {
    if (session.expiresAt < now) {
      sessionCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

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

// JWT Configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || '3boxesluxury_access_secret_key_dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '3boxesluxury_refresh_secret_key_dev';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: SessionUser, permissions?: string[]): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token (UUID-based, stored in DB)
 */
export function generateRefreshToken(): string {
  return uuidv4();
}

/**
 * Generate a token pair (access + refresh)
 */
export async function generateTokenPair(user: SessionUser, permissions?: string[]): Promise<TokenPair> {
  const accessToken = generateAccessToken(user, permissions);
  const refreshToken = generateRefreshToken();

  const accessDecoded = jwt.decode(accessToken) as { exp: number };
  const accessExpiresAt = accessDecoded?.exp || Date.now() / 1000 + 15 * 60;
  const refreshExpiresAt = Date.now() / 1000 + 7 * 24 * 60 * 60;

  // Store refresh token in DB as a session
  await db.session.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(refreshExpiresAt * 1000),
    },
  });

  // Cache the refresh token
  sessionCache.set(refreshToken, {
    userId: user.id,
    expiresAt: new Date(refreshExpiresAt * 1000),
  });

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token and get session
 */
export async function verifyRefreshToken(token: string): Promise<SessionUser | null> {
  return getSessionAsync(token);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  const user = await getSessionAsync(refreshToken);
  if (!user) return null;

  // Get user permissions
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    include: { permissions: { select: { permission: true } } },
  });

  if (!dbUser || !dbUser.isActive) return null;

  const permissions = dbUser.permissions.map((p) => p.permission);

  // Generate new access token
  const accessToken = generateAccessToken(user, permissions);
  const accessDecoded = jwt.decode(accessToken) as { exp: number };
  const accessExpiresAt = accessDecoded?.exp || Date.now() / 1000 + 15 * 60;
  const refreshExpiresAt = Date.now() / 1000 + 7 * 24 * 60 * 60;

  // Rotate refresh token: delete old, create new
  await db.session.deleteMany({ where: { token: refreshToken } });
  sessionCache.delete(refreshToken);

  const newRefreshToken = generateRefreshToken();
  await db.session.create({
    data: {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(refreshExpiresAt * 1000),
    },
  });

  sessionCache.set(newRefreshToken, {
    userId: user.id,
    expiresAt: new Date(refreshExpiresAt * 1000),
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Create a new session for a user.
 * Persists to DB and in-memory cache.
 * @deprecated Use generateTokenPair for JWT-based auth
 */
export async function createSession(
  token: string,
  user: SessionUser
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  sessionCache.set(token, { userId: user.id, expiresAt });
}

/**
 * Get a session by token.
 * Checks in-memory cache first, falls back to DB.
 * Works with both UUID session tokens and JWT access tokens.
 * Returns the user data or null if session not found or expired.
 */
export async function getSessionAsync(
  token: string
): Promise<SessionUser | null> {
  if (!token) return null;

  // First, try to verify as JWT access token
  const jwtPayload = verifyAccessToken(token);
  if (jwtPayload) {
    // JWT token is valid, fetch user from DB
    const user = await db.user.findUnique({
      where: { id: jwtPayload.userId },
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
  }

  // Fallback: try as UUID session/refresh token
  // Check cache first
  const cached = sessionCache.get(token);
  if (cached) {
    if (cached.expiresAt < new Date()) {
      sessionCache.delete(token);
      return null;
    }

    // Fetch user from DB to get fresh data
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
  }

  // Fallback to DB
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
}

/**
 * Destroy a session by token.
 * Removes from both DB and in-memory cache.
 * Also handles JWT tokens by finding sessions by userId.
 */
export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token);

  try {
    await db.session.deleteMany({ where: { token } });
  } catch {
    // Session may not exist, that's fine
  }

  // If it's a JWT token, we can't delete it from DB since it's not stored there.
  // The JWT will expire naturally after 15 minutes.
  // For full logout, the client should discard both tokens.
}

/**
 * Destroy all sessions for a user
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  // Remove from cache
  for (const [token, session] of sessionCache.entries()) {
    if (session.userId === userId) {
      sessionCache.delete(token);
    }
  }

  await db.session.deleteMany({ where: { userId } });
}

/**
 * Generate a new session token (UUID-based, legacy support).
 * @deprecated Use generateTokenPair for JWT-based auth
 */
export function generateToken(): string {
  return uuidv4();
}

/**
 * Get JWT payload from access token without verification
 * Useful for extracting userId from expired tokens
 */
export function decodeAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
