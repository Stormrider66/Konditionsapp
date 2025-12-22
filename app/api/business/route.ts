/**
 * Business API
 *
 * GET /api/business - Get current user's business
 * POST /api/business - Create a new business
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating a business
const createBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    ),
  description: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().default('SE'),
  primaryColor: z.string().optional().default('#3b82f6'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
      include: {
        business: {
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
              select: {
                id: true,
                name: true,
              },
            },
            locations: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
            _count: {
              select: {
                members: true,
                testers: true,
                locations: true,
              },
            },
          },
        },
      },
    });

    if (!businessMember) {
      return NextResponse.json({
        business: null,
        membership: null,
        message: 'No business membership found',
      });
    }

    return NextResponse.json({
      business: {
        ...businessMember.business,
        memberCount: businessMember.business._count.members,
        testerCount: businessMember.business._count.testers,
        locationCount: businessMember.business._count.locations,
        _count: undefined,
      },
      membership: {
        role: businessMember.role,
        joinedAt: businessMember.createdAt,
      },
    });
  } catch (error) {
    console.error('Get business error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

    // Check if user already has a business
    const existingMembership = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of a business' },
        { status: 400 }
      );
    }

    // Validate input
    const validationResult = createBusinessSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if slug is already taken
    const existingBusiness = await prisma.business.findUnique({
      where: { slug: data.slug },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: 'This business URL slug is already taken' },
        { status: 400 }
      );
    }

    // Create business and add user as owner
    const business = await prisma.business.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        primaryColor: data.primaryColor,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
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
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('Create business error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
