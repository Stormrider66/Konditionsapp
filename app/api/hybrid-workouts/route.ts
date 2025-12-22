/**
 * Hybrid Workouts API
 *
 * GET  - List hybrid workouts with filtering
 * POST - Create new hybrid workout
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { HybridFormat, ScalingLevel } from '@prisma/client';
import { handleApiError, ApiError, validateRequired, parseJsonBody } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as HybridFormat | null;
    const scalingLevel = searchParams.get('scalingLevel') as ScalingLevel | null;
    const benchmarkOnly = searchParams.get('benchmarkOnly') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      OR: [
        { coachId: user.id },
        { isPublic: true },
        { coachId: null }, // System/benchmark workouts
      ],
    };

    if (format) {
      where.format = format;
    }

    if (scalingLevel) {
      where.scalingLevel = scalingLevel;
    }

    if (benchmarkOnly) {
      where.isBenchmark = true;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { benchmarkSource: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [workouts, total] = await Promise.all([
      prisma.hybridWorkout.findMany({
        where,
        include: {
          movements: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  nameSv: true,
                  standardAbbreviation: true,
                  equipmentTypes: true,
                  iconUrl: true,
                  iconCategory: true,
                  movementCategory: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { results: true },
          },
        },
        orderBy: [{ isBenchmark: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.hybridWorkout.count({ where }),
    ]);

    return NextResponse.json({
      workouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/hybrid-workouts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await parseJsonBody<{
      name: string;
      description?: string;
      format: HybridFormat;
      timeCap?: number;
      workTime?: number;
      restTime?: number;
      totalRounds?: number;
      totalMinutes?: number;
      repScheme?: string;
      scalingLevel?: ScalingLevel;
      movements?: Array<{
        exerciseId: string;
        order: number;
        roundNumber?: number;
        setNumber?: number;
        reps?: number;
        calories?: number;
        distance?: number;
        duration?: number;
        weightMale?: number;
        weightFemale?: number;
        percentOfMax?: number;
        isUnbroken?: boolean;
        alternateSides?: boolean;
        notes?: string;
      }>;
      tags?: string[];
      isPublic?: boolean;
      warmupData?: unknown;
      strengthData?: unknown;
      cooldownData?: unknown;
    }>(request);

    // Validate required fields
    validateRequired(body, ['name', 'format']);

    const {
      name,
      description,
      format,
      timeCap,
      workTime,
      restTime,
      totalRounds,
      totalMinutes,
      repScheme,
      scalingLevel,
      movements,
      tags,
      isPublic,
      warmupData,
      strengthData,
      cooldownData,
    } = body;

    // Create workout with movements
    const workout = await prisma.hybridWorkout.create({
      data: {
        name,
        description,
        format: format as HybridFormat,
        timeCap,
        workTime,
        restTime,
        totalRounds,
        totalMinutes,
        repScheme,
        scalingLevel: scalingLevel || 'RX',
        coachId: user.id,
        isPublic: isPublic || false,
        tags: tags || [],
        // Section data
        warmupData: warmupData ?? undefined,
        strengthData: strengthData ?? undefined,
        cooldownData: cooldownData ?? undefined,
        movements: {
          create: movements?.map((m, index) => ({
            exerciseId: m.exerciseId,
            order: m.order ?? index + 1,
            roundNumber: m.roundNumber,
            setNumber: m.setNumber,
            reps: m.reps,
            calories: m.calories,
            distance: m.distance,
            duration: m.duration,
            weightMale: m.weightMale,
            weightFemale: m.weightFemale,
            percentOfMax: m.percentOfMax,
            isUnbroken: m.isUnbroken || false,
            alternateSides: m.alternateSides || false,
            notes: m.notes,
          })),
        },
      },
      include: {
        movements: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/hybrid-workouts');
  }
}
