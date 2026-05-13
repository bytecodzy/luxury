import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionAsync, verifyJWTSession } from '@/lib/sessions'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email?: string
  role?: string
  name?: string
  type?: string
  isActive?: boolean
  approvalStatus?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  adminRole?: string | null
  corporateRole?: string | null
  approvalStatus?: string
  isActive?: boolean
  emailVerified?: boolean
  twoFactorEnabled?: boolean
  twoFactorRequired?: boolean
}

/**
 * Authenticate a request using either JWT or session token from the Authorization header.
 * Returns the authenticated user or an error response.
 *
 * On Vercel: primarily uses JWT session tokens (stateless, no DB needed).
 * Locally: tries JWT, then session cache, then DB session.
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }),
    }
  }

  const token = authHeader.replace('Bearer ', '')

  // 1. Try JWT session token first (our new createJWTSessionToken format)
  const jwtSessionUser = verifyJWTSession(token)
  if (jwtSessionUser) {
    // For the env-var admin user, return directly without DB lookup
    if (jwtSessionUser.id === 'admin-env') {
      return {
        user: {
          id: jwtSessionUser.id,
          email: jwtSessionUser.email,
          name: jwtSessionUser.name,
          role: jwtSessionUser.role,
          adminRole: null,
          corporateRole: null,
          approvalStatus: 'approved',
          isActive: true,
          emailVerified: true,
          twoFactorEnabled: false,
        },
        error: null,
      }
    }

    // For regular users, try to get fresh data from DB
    try {
      const dbUser = await db.user.findUnique({
        where: { id: jwtSessionUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          corporateRole: true,
          isActive: true,
          approvalStatus: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorRequired: true,
        },
      })

      if (dbUser && dbUser.isActive) {
        return {
          user: dbUser as AuthUser,
          error: null,
        }
      }
    } catch {
      // DB unavailable — use JWT data directly
      return {
        user: {
          id: jwtSessionUser.id,
          email: jwtSessionUser.email,
          name: jwtSessionUser.name,
          role: jwtSessionUser.role,
          adminRole: null,
          corporateRole: null,
          approvalStatus: jwtSessionUser.approvalStatus || 'approved',
          isActive: jwtSessionUser.isActive,
          emailVerified: jwtSessionUser.emailVerified,
          twoFactorEnabled: jwtSessionUser.twoFactorEnabled,
        },
        error: null,
      }
    }
  }

  // 2. Try legacy JWT verification (old format with userId/email/role)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    if (decoded.type === 'session') {
      // Already handled above by verifyJWTSession
    } else if (decoded.userId) {
      // Legacy JWT format
      try {
        const dbUser = await db.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            adminRole: true,
            corporateRole: true,
            isActive: true,
            approvalStatus: true,
            emailVerified: true,
            twoFactorEnabled: true,
            twoFactorRequired: true,
          },
        })

        if (dbUser && dbUser.isActive) {
          return {
            user: dbUser as AuthUser,
            error: null,
          }
        }
      } catch {
        // DB unavailable
      }
    }
  } catch {
    // JWT verification failed, try session-based auth
  }

  // 3. Fall back to session-based auth (in-memory cache + DB session)
  try {
    const sessionUser = await getSessionAsync(token)
    if (!sessionUser) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
      }
    }

    // For env-var admin user
    if (sessionUser.id === 'admin-env') {
      return {
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          role: sessionUser.role,
          adminRole: null,
          corporateRole: null,
          approvalStatus: 'approved',
          isActive: true,
          emailVerified: true,
          twoFactorEnabled: false,
        },
        error: null,
      }
    }

    // Fetch extended user data from DB for session-based auth
    try {
      const dbUser = await db.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          corporateRole: true,
          isActive: true,
          approvalStatus: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorRequired: true,
        },
      })

      if (dbUser && dbUser.isActive) {
        return {
          user: dbUser as AuthUser,
          error: null,
        }
      }
    } catch {
      // DB unavailable — use session data directly
      return {
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          role: sessionUser.role,
          adminRole: null,
          corporateRole: null,
          approvalStatus: sessionUser.approvalStatus || 'approved',
          isActive: sessionUser.isActive,
          emailVerified: sessionUser.emailVerified,
          twoFactorEnabled: sessionUser.twoFactorEnabled,
        },
        error: null,
      }
    }
  } catch {
    // All auth methods failed
  }

  return {
    user: null,
    error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
  }
}

/**
 * Get session info from request (lightweight - returns AuthUser from token).
 * Useful for routes that need session data without full user DB lookup.
 * Returns null if not authenticated (no error thrown).
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const result = await authenticate(request)
    if (result.error) return null
    return result.user
  } catch {
    return null
  }
}

/**
 * Require admin role. Authenticates first, then checks role.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(request)
  if (result.error) return result

  if (result.user.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    }
  }

  return result
}

/**
 * Generate a JWT token for a user
 */
export function generateJWT(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Extract client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown'
}

/**
 * Parse device info from user agent string (basic)
 */
export function parseDeviceInfo(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/Windows/i.test(userAgent)) return 'Windows Desktop'
  if (/Macintosh/i.test(userAgent)) return 'Mac Desktop'
  if (/Linux/i.test(userAgent)) return 'Linux Desktop'
  return 'Unknown Device'
}

/**
 * Require a specific permission. Authenticates first, then checks the user's permissions.
 * Admins always pass permission checks.
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(request)
  if (result.error) return result

  // Admins have all permissions
  if (result.user.role === 'admin') {
    return result
  }

  // Look up user permissions from DB
  try {
    const userPerms = await db.userPermission.findMany({
      where: { userId: result.user.id },
      select: { permission: true },
    })
    const permStrings = userPerms.map((p) => p.permission)

    if (!permStrings.includes(permission)) {
      return {
        user: null,
        error: NextResponse.json(
          { error: `Forbidden: '${permission}' permission required` },
          { status: 403 }
        ),
      }
    }
  } catch {
    // DB unavailable — if user is admin, allow; otherwise deny
    return {
      user: null,
      error: NextResponse.json(
        { error: `Forbidden: '${permission}' permission required` },
        { status: 403 }
      ),
    }
  }

  return result
}
