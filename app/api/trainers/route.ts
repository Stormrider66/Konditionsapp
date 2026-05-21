/**
 * Trainers API
 *
 * GET /api/trainers - List coaches/trainers for the current user's business
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const scope = getRequestedBusinessScope(request);

    const businessMember = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        ...(scope.businessId ? { businessId: scope.businessId } : {}),
        business: {
          isActive: true,
          ...(scope.businessSlug ? { slug: scope.businessSlug } : {}),
        },
      },
    });

    if (!businessMember) {
      return NextResponse.json({ trainers: [] });
    }

    const members = await prisma.businessMember.findMany({
      where: {
        businessId: businessMember.businessId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH'] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json({
      trainers: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    });
  } catch (error) {
    logError('Get trainers error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}
