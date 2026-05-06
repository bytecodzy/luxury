import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionAsync } from '@/lib/sessions'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key'

interface JWTPayload {
  userId: string
  email?: string
  role?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Authenticate a request using either JWT or session token from the Authorization header.
 * Returns the authenticated user or an error response.
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

  // Try JWT verification first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    const dbUser = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    if (!dbUser || !dbUser.isActive) {
      return {
        user: null,
        error: NextResponse.json({ error: 'User not found or inactive' }, { status: 401 }),
      }
    }

    return {
      user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role },
      error: null,
    }
  } catch {
    // JWT verification failed, try session-based auth
  }

  // Fall back to session-based auth
  try {
    const sessionUser = await getSessionAsync(token)
    if (!sessionUser) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
      }
    }

    return {
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
      },
      error: null,
    }
  } catch {
    return {
      user: null,
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    }
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
