/**
 * Testers API
 *
 * GET /api/testers - List testers for the current user's business
 * POST /api/testers - Create a new tester
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'

// Validation schema for creating a tester
const createTesterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrivate: z.boolean().optional().default(false),
  userId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
      include: { business: true },
    });

    // Build query - if user is in a business, get business testers
    // Otherwise, get testers created by this user
    const whereClause = businessMember
      ? { businessId: businessMember.businessId }
      : { userId: user.id };

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const testers = await prisma.tester.findMany({
      where: {
        ...whereClause,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { tests: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      testers: testers.map((t) => ({
        ...t,
        testCount: t._count.tests,
        _count: undefined,
      })),
      businessId: businessMember?.businessId || null,
    });
  } catch (error) {
    logError('Get testers error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch testers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

    // Validate input
    const validationResult = createTesterSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, title, isPrivate, userId } = validationResult.data;

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    // Check if email is already in use by another tester
    if (email) {
      const existingTester = await prisma.tester.findFirst({
        where: {
          email,
          businessId: businessMember?.businessId,
        },
      });

      if (existingTester) {
        return NextResponse.json(
          { error: 'A tester with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Check if userId is already linked to another tester
    if (userId) {
      const existingTester = await prisma.tester.findFirst({
        where: { userId },
      });

      if (existingTester) {
        return NextResponse.json(
          { error: 'This user is already linked to a tester profile' },
          { status: 400 }
        );
      }
    }

    // Create the tester
    const tester = await prisma.tester.create({
      data: {
        name,
        email,
        phone,
        title,
        isPrivate,
        userId,
        businessId: businessMember?.businessId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ tester }, { status: 201 });
  } catch (error) {
    logError('Create tester error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create tester' },
      { status: 500 }
    );
  }
}
