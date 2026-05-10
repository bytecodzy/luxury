import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/password-validator';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const adminRole = searchParams.get('adminRole') || '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (role) where.role = role;
  if (adminRole) where.adminRole = adminRole;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
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
        phoneVerified: true,
        twoFactorEnabled: true,
        twoFactorRequired: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        permissions: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/admin/users - Admin creates user with specific role and permissions
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { email, name, password, role, adminRole, corporateRole, permissions, isActive, approvalStatus } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: passwordCheck.errors },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password with bcrypt (NOT sha256)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine if 2FA should be required for this admin role
    const twoFactorRequired = adminRole && ['super_admin', 'finance_manager'].includes(adminRole);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        password: hashedPassword,
        role: role || 'user',
        adminRole: adminRole || null,
        corporateRole: corporateRole || null,
        twoFactorRequired,
        isActive: isActive !== undefined ? isActive : true,
        approvalStatus: approvalStatus || 'approved',
        permissions: permissions?.length
          ? {
              create: permissions.map((p: string) => ({ permission: p })),
            }
          : undefined,
      },
      include: { permissions: true },
    });

    // Create audit log
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await db.auditLog.create({
      data: {
        action: 'admin_user_created',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({
          email: user.email,
          role: user.role,
          adminRole: user.adminRole,
        }),
        ipAddress: ip,
        userAgent,
      },
    });

    const { password: _, ...userResponse } = user;
    return NextResponse.json(userResponse, { status: 201 });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
