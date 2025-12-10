/**
 * Hybrid Movements API
 *
 * GET - List hybrid movements with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { MovementCategory, EquipmentType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as MovementCategory | null;
    const equipment = searchParams.get('equipment') as EquipmentType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isHybridMovement: true,
    };

    if (category) {
      where.movementCategory = category;
    }

    if (equipment) {
      where.equipmentTypes = {
        has: equipment,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameSv: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { standardAbbreviation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [movements, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameSv: true,
          nameEn: true,
          category: true,
          movementCategory: true,
          muscleGroup: true,
          description: true,
          equipmentTypes: true,
          defaultReps: true,
          defaultWeightMale: true,
          defaultWeightFemale: true,
          scaledWeightMale: true,
          scaledWeightFemale: true,
          foundationMovement: true,
          standardAbbreviation: true,
          difficulty: true,
          videoUrl: true,
        },
        orderBy: [{ movementCategory: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    // Get movement counts by category
    const categoryCounts = await prisma.exercise.groupBy({
      by: ['movementCategory'],
      where: { isHybridMovement: true },
      _count: true,
    });

    return NextResponse.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      categoryCounts: categoryCounts.reduce(
        (acc, item) => {
          if (item.movementCategory) {
            acc[item.movementCategory] = item._count;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Error fetching hybrid movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hybrid movements' },
      { status: 500 }
    );
  }
}
