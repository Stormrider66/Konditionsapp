/**
 * Locations API
 *
 * GET /api/locations - List locations for the current user's business
 * POST /api/locations - Create a new location
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Validation schema for creating a location
const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  settings: z.record(z.unknown()).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
      include: { business: true },
    });

    if (!businessMember) {
      return NextResponse.json({
        locations: [],
        businessId: null,
        message: 'No business membership found. Create or join a business first.',
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const locations = await prisma.location.findMany({
      where: {
        businessId: businessMember.businessId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { tests: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      locations: locations.map((l) => ({
        ...l,
        testCount: l._count.tests,
        _count: undefined,
      })),
      businessId: businessMember.businessId,
    });
  } catch (error) {
    console.error('Get locations error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

    // Validate input
    const validationResult = createLocationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, city, address, postalCode, latitude, longitude, settings } =
      validationResult.data;

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    if (!businessMember) {
      return NextResponse.json(
        { error: 'You must be part of a business to create locations' },
        { status: 403 }
      );
    }

    // Check for duplicate name in same business
    const existingLocation = await prisma.location.findFirst({
      where: {
        businessId: businessMember.businessId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 400 }
      );
    }

    // Create the location
    const location = await prisma.location.create({
      data: {
        businessId: businessMember.businessId,
        name,
        city,
        address,
        postalCode,
        latitude,
        longitude,
        settings: settings
          ? (settings as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error('Create location error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}
