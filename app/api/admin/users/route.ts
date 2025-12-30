// app/api/admin/users/route.ts
// Admin API for user management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['COACH', 'ATHLETE', 'ADMIN']).optional(),
  tier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    const where = {
      ...(search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(role ? { role: role as 'COACH' | 'ATHLETE' | 'ADMIN' } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          language: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              maxAthletes: true,
              stripeCurrentPeriodEnd: true,
            },
          },
          _count: {
            select: {
              clients: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user) => ({
          ...user,
          clientsCount: user._count.clients,
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching users', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, role, tier } = validation.data;

    // Update user role if provided
    if (role) {
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    // Update subscription tier if provided
    if (tier) {
      const maxAthletes = {
        FREE: 1,
        BASIC: 20,
        PRO: 100,
        ENTERPRISE: -1,
      }[tier];

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          tier,
          maxAthletes,
        },
        create: {
          userId,
          tier,
          maxAthletes,
          status: 'ACTIVE',
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscription: {
          select: {
            tier: true,
            status: true,
            maxAthletes: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
