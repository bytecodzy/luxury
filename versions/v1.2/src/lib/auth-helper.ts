import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync, verifyAccessToken, decodeAccessToken } from '@/lib/sessions';
import { db } from '@/lib/db';

/**
 * Get session from request (Authorization header or cookie)
 * Supports both JWT access tokens and UUID session tokens
 */
export async function getSessionFromRequest(request: NextRequest) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=');
          return [key, v.join('=')];
        })
      );
      token = cookies['3boxes_token'] || cookies['3boxes_access_token'] || null;
    }
  }

  if (!token) return null;

  const session = await getSessionAsync(token);
  return session;
}

/**
 * Get the full user with permissions from request
 */
export async function getUserWithPermissions(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: {
      permissions: { select: { permission: true } },
    },
  });

  if (!user) return null;

  return {
    ...session,
    permissions: user.permissions.map((p) => p.permission),
    adminRole: user.adminRole,
    corporateRole: user.corporateRole,
  };
}

/**
 * Require admin session - returns user or error response
 */
export async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      user: null,
    };
  }

  if (session.role !== 'admin' && session.role !== 'team') {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      user: null,
    };
  }

  return {
    error: null,
    user: session,
  };
}

/**
 * Require authenticated session - returns user or error response
 */
export async function requireAuth(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      user: null,
    };
  }

  return {
    error: null,
    user: session,
  };
}

/**
 * Require specific role(s) - returns user or error response
 * Usage: const { error, user } = await requireRole(request, 'admin', 'team');
 */
export async function requireRole(request: NextRequest, ...roles: string[]) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      user: null,
    };
  }

  if (!roles.includes(session.role)) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required role: ${roles.join(' or ')}` },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    user: session,
  };
}

/**
 * Require specific permission - checks UserPermission table
 * Usage: const { error, user } = await requirePermission(request, 'products.manage');
 */
export async function requirePermission(request: NextRequest, permission: string) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      user: null,
      hasPermission: false,
    };
  }

  // Admin role always has all permissions
  if (session.role === 'admin') {
    return {
      error: null,
      user: session,
      hasPermission: true,
    };
  }

  // Check permission in DB
  const permRecord = await db.userPermission.findUnique({
    where: {
      userId_permission: {
        userId: session.id,
        permission,
      },
    },
  });

  if (!permRecord) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required permission: ${permission}` },
        { status: 403 }
      ),
      user: null,
      hasPermission: false,
    };
  }

  return {
    error: null,
    user: session,
    hasPermission: true,
  };
}

/**
 * Require any of the specified permissions
 * Usage: const { error, user } = await requireAnyPermission(request, 'products.manage', 'products.view');
 */
export async function requireAnyPermission(request: NextRequest, ...permissions: string[]) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
      user: null,
      hasPermission: false,
    };
  }

  // Admin role always has all permissions
  if (session.role === 'admin') {
    return {
      error: null,
      user: session,
      hasPermission: true,
    };
  }

  // Check any permission in DB
  const permRecords = await db.userPermission.findMany({
    where: {
      userId: session.id,
      permission: { in: permissions },
    },
  });

  if (permRecords.length === 0) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required permission: ${permissions.join(' or ')}` },
        { status: 403 }
      ),
      user: null,
      hasPermission: false,
    };
  }

  return {
    error: null,
    user: session,
    hasPermission: true,
  };
}

/**
 * Map of admin API endpoints to required permissions
 */
export const ADMIN_PERMISSIONS: Record<string, string> = {
  '/api/admin/products': 'products.manage',
  '/api/admin/users': 'users.manage',
  '/api/admin/audit-logs': 'audit.view',
  '/api/admin/sessions': 'users.manage',
  '/api/admin/role-permissions': 'role_permissions.manage',
  '/api/admin/permissions': 'role_permissions.manage',
  '/api/admin/corporate': 'corporate.manage',
  '/api/admin/api-logs': 'audit.view',
};

/**
 * Check permission for admin API routes based on path
 */
export async function requireAdminPermission(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Find matching permission
  const requiredPermission = Object.entries(ADMIN_PERMISSIONS).find(
    ([prefix]) => path.startsWith(prefix)
  )?.[1];

  if (!requiredPermission) {
    // No specific permission required, just require admin
    return requireAdmin(request);
  }

  return requirePermission(request, requiredPermission);
}
