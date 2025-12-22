/**
 * Individual Tester API
 *
 * GET /api/testers/[id] - Get a single tester
 * PUT /api/testers/[id] - Update a tester
 * DELETE /api/testers/[id] - Deactivate a tester (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating a tester
const updateTesterSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
  isActive: z.boolean().optional(),
  userId: z.string().uuid().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canAccessTester(userId: string, testerId: string) {
  // Get user's business membership
  const businessMember = await prisma.businessMember.findFirst({
    where: { userId },
  });

  const tester = await prisma.tester.findUnique({
    where: { id: testerId },
  });

  if (!tester) {
    return { canAccess: false, tester: null, reason: 'Tester not found' };
  }

  // Check if tester belongs to user's business or is the user's own tester
  if (businessMember && tester.businessId === businessMember.businessId) {
    return { canAccess: true, tester, reason: null };
  }

  if (tester.userId === userId) {
    return { canAccess: true, tester, reason: null };
  }

  return { canAccess: false, tester: null, reason: 'Access denied' };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { canAccess, tester, reason } = await canAccessTester(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Tester not found' ? 404 : 403 }
      );
    }

    // Get full tester details with stats
    const testerWithStats = await prisma.tester.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        tests: {
          select: {
            id: true,
            testDate: true,
            testType: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { testDate: 'desc' },
          take: 10,
        },
        _count: {
          select: { tests: true },
        },
      },
    });

    return NextResponse.json({
      tester: {
        ...testerWithStats,
        testCount: testerWithStats?._count.tests,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Get tester error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch tester' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    const { canAccess, reason } = await canAccessTester(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Tester not found' ? 404 : 403 }
      );
    }

    // Validate input
    const validationResult = updateTesterSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // If updating userId, check it's not already in use
    if (updates.userId) {
      const existingTester = await prisma.tester.findFirst({
        where: {
          userId: updates.userId,
          id: { not: id },
        },
      });

      if (existingTester) {
        return NextResponse.json(
          { error: 'This user is already linked to another tester profile' },
          { status: 400 }
        );
      }
    }

    // Update the tester
    const tester = await prisma.tester.update({
      where: { id },
      data: updates,
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

    return NextResponse.json({ tester });
  } catch (error) {
    console.error('Update tester error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update tester' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { canAccess, reason } = await canAccessTester(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Tester not found' ? 404 : 403 }
      );
    }

    // Soft delete - just mark as inactive
    // This preserves historical test data
    await prisma.tester.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tester error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete tester' },
      { status: 500 }
    );
  }
}
