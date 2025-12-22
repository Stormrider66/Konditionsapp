/**
 * Individual Location API
 *
 * GET /api/locations/[id] - Get a single location
 * PUT /api/locations/[id] - Update a location
 * DELETE /api/locations/[id] - Deactivate a location (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Validation schema for updating a location
const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canAccessLocation(userId: string, locationId: string) {
  // Get user's business membership
  const businessMember = await prisma.businessMember.findFirst({
    where: { userId },
  });

  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });

  if (!location) {
    return { canAccess: false, location: null, reason: 'Location not found' };
  }

  // Check if location belongs to user's business
  if (businessMember && location.businessId === businessMember.businessId) {
    return { canAccess: true, location, reason: null };
  }

  return { canAccess: false, location: null, reason: 'Access denied' };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { canAccess, location, reason } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Location not found' ? 404 : 403 }
      );
    }

    // Get full location details with stats
    const locationWithStats = await prisma.location.findUnique({
      where: { id },
      include: {
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
            tester: {
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
      location: {
        ...locationWithStats,
        testCount: locationWithStats?._count.tests,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Get location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;
    const body = await request.json();

    const { canAccess, reason, location: existingLocation } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Location not found' ? 404 : 403 }
      );
    }

    // Validate input
    const validationResult = updateLocationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { settings, ...otherUpdates } = validationResult.data;

    // If updating name, check for duplicates
    if (otherUpdates.name && existingLocation) {
      const duplicate = await prisma.location.findFirst({
        where: {
          businessId: existingLocation.businessId,
          name: { equals: otherUpdates.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data, handling settings separately for Prisma JSON type
    const updateData: Prisma.LocationUpdateInput = {
      ...otherUpdates,
    };

    // Only include settings if it was provided in the request
    if (settings !== undefined) {
      updateData.settings = settings === null
        ? Prisma.JsonNull
        : settings as Prisma.InputJsonValue;
    }

    // Update the location
    const location = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Update location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const { canAccess, reason } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: reason },
        { status: reason === 'Location not found' ? 404 : 403 }
      );
    }

    // Soft delete - just mark as inactive
    // This preserves historical test data
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}
