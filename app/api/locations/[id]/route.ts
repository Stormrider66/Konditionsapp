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
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
    where: { userId, isActive: true },
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

function locationAccessError(locale: AppLocale, reason: string | null): string {
  if (reason === 'Location not found') return t(locale, 'Location not found', 'Platsen hittades inte')
  if (reason === 'Access denied') return t(locale, 'Access denied', 'Åtkomst nekad')
  return t(locale, 'Access denied', 'Åtkomst nekad')
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params;

    const { canAccess, reason } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: locationAccessError(locale, reason) },
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
    logError('Get location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to fetch location', 'Kunde inte hämta platsen') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params;
    const body = await request.json();

    const { canAccess, reason, location: existingLocation } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: locationAccessError(locale, reason) },
        { status: reason === 'Location not found' ? 404 : 403 }
      );
    }

    // Validate input
    const validationResult = updateLocationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: validationResult.error.flatten() },
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
          { error: t(locale, 'A location with this name already exists', 'Det finns redan en plats med det här namnet') },
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
    logError('Update location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update location', 'Kunde inte uppdatera platsen') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)
  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params;

    const { canAccess, reason } = await canAccessLocation(user.id, id);

    if (!canAccess) {
      return NextResponse.json(
        { error: locationAccessError(locale, reason) },
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
    logError('Delete location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to delete location', 'Kunde inte ta bort platsen') },
      { status: 500 }
    );
  }
}
