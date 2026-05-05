import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, generateToken, getSessionAsync } from '@/lib/sessions';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (await db.corporateAccount.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      companyName,
      industry,
      website,
      contactName,
      contactPhone,
      gstNumber,
    } = body;

    // Validate required fields
    if (!email || !password || !name || !companyName || !contactName) {
      return NextResponse.json(
        { error: 'Email, password, name, companyName, and contactName are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Generate unique slug from companyName
    const baseSlug = slugify(companyName);
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Company name must contain alphanumeric characters' },
        { status: 400 }
      );
    }
    const slug = await ensureUniqueSlug(baseSlug);

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User with role "corporate" and CorporateAccount in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password: hashedPassword,
          role: 'corporate',
          approvalStatus: 'pending',
          isActive: true,
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
        },
      });

      const corporateAccount = await tx.corporateAccount.create({
        data: {
          companyName: companyName.trim(),
          slug,
          industry: industry?.trim() || null,
          website: website?.trim() || null,
          gstNumber: gstNumber?.trim() || null,
          contactName: contactName.trim(),
          contactEmail: email.toLowerCase().trim(),
          contactPhone: contactPhone?.trim() || null,
          userId: user.id,
          approvalStatus: 'pending',
          isActive: true,
        },
      });

      return { user, corporateAccount };
    });

    const { user, corporateAccount } = result;

    // Since corporate accounts need approval, return pending message
    return NextResponse.json(
      {
        message: 'Registration successful. Your corporate account is pending admin approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus,
          createdAt: user.createdAt,
        },
        corporateAccount: {
          id: corporateAccount.id,
          companyName: corporateAccount.companyName,
          slug: corporateAccount.slug,
          approvalStatus: corporateAccount.approvalStatus,
        },
        approvalStatus: 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Corporate registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
