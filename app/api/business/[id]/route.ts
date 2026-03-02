/**
 * Individual Business API
 *
 * GET /api/business/[id] - Get a business by ID
 * PUT /api/business/[id] - Update a business
 * DELETE /api/business/[id] - Deactivate a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, requireBusinessMembership } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'

// Validation schema for updating a business
const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().optional(),
  defaultRevenueShare: z.number().min(0).max(100).optional(),
  settings: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { role: memberRole } = await requireBusinessMembership(user.id, id)

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        testers: {
          where: { isActive: true },
        },
        locations: {
          where: { isActive: true },
        },
        _count: {
          select: {
            members: true,
            testers: true,
            locations: true,
            athleteSubscriptions: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({
      business: {
        ...business,
        memberCount: business._count.members,
        testerCount: business._count.testers,
        locationCount: business._count.locations,
        athleteCount: business._count.athleteSubscriptions,
        _count: undefined,
      },
      userRole: memberRole,
    });
  } catch (error) {
    logError('Get business error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    await requireBusinessMembership(user.id, id, { roles: ['OWNER', 'ADMIN'] })

    // Validate input
    const validationResult = updateBusinessSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { settings, ...otherUpdates } = validationResult.data;

    // Build update data, handling settings separately for Prisma JSON type
    const updateData: Prisma.BusinessUpdateInput = {
      ...otherUpdates,
    };

    // Only include settings if it was provided in the request
    if (settings !== undefined) {
      updateData.settings = settings === null
        ? Prisma.JsonNull
        : settings as Prisma.InputJsonValue;
    }

    // Update the business
    const business = await prisma.business.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ business });
  } catch (error) {
    logError('Update business error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    await requireBusinessMembership(user.id, id, { roles: ['OWNER'] })

    // Soft delete - mark as inactive
    await prisma.business.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete business error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
