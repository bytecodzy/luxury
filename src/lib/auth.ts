import { NextRequest } from 'next/server'
import { sessions, verifyJWTSession, getSessionAsync } from './sessions'

/**
 * Extracts and validates the Bearer token from the request Authorization header.
 * Returns the session user if valid, or null if invalid/missing.
 *
 * Checks in order:
 * 1. In-memory session cache (fast, works locally)
 * 2. JWT verification (works on Vercel serverless)
 * 3. Full async session lookup (DB fallback)
 */
export async function verifyAuth(
  request: NextRequest
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix
  if (!token) {
    return null
  }

  // 1. Check in-memory cache first (fast)
  const session = sessions.get(token)
  if (session) {
    if (session.expiresAt < new Date()) {
      sessions.delete(token)
      return null
    }
    return {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
    }
  }

  // 2. Try JWT verification (works on Vercel where in-memory cache is empty)
  const jwtUser = verifyJWTSession(token)
  if (jwtUser) {
    // Add to in-memory cache for faster subsequent lookups
    sessions.set(token, {
      userId: jwtUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      id: jwtUser.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role: jwtUser.role,
    })
    return {
      id: jwtUser.id,
      email: jwtUser.email,
      name: jwtUser.name,
      role: jwtUser.role,
    }
  }

  // 3. Full async session lookup (DB fallback)
  const user = await getSessionAsync(token)
  if (user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  }

  return null
}
