/**
 * Hybrid Workouts API
 *
 * GET  - List hybrid workouts with filtering
 * POST - Create new hybrid workout
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { HybridFormat, Prisma, ScalingLevel } from '@prisma/client';
import { handleApiError, ApiError, validateRequired, parseJsonBody } from '@/lib/api-error';
import {
  hybridWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope';
import { normalizeWorkoutTags } from '@/lib/workouts/business-tags';
import {
  buildWorkoutLibraryMetadataData,
  normalizeWorkoutTrainingYear,
  WorkoutLibraryMetadataError,
} from '@/lib/workouts/library-metadata';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') as HybridFormat | null;
    const scalingLevel = searchParams.get('scalingLevel') as ScalingLevel | null;
    const teamId = searchParams.get('teamId');
    const trainingYear = normalizeWorkoutTrainingYear(searchParams.get('trainingYear') ?? undefined);
    const benchmarkOnly = searchParams.get('benchmarkOnly') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const andFilters: Prisma.HybridWorkoutWhereInput[] = [
      hybridWorkoutAccessWhere(user.id, businessScope.businessId),
    ];

    if (format) {
      andFilters.push({ format });
    }

    if (scalingLevel) {
      andFilters.push({ scalingLevel });
    }

    if (teamId && teamId !== 'all') {
      andFilters.push({ teamId });
    }

    if (typeof trainingYear === 'number') {
      andFilters.push({ trainingYear });
    }

    if (benchmarkOnly) {
      andFilters.push({ isBenchmark: true });
    }

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { benchmarkSource: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const tagFilters = searchParams.getAll('tag').filter(Boolean);
    if (tagFilters.length > 0) {
      andFilters.push({ tags: { hasSome: tagFilters } });
    }

    const where: Prisma.HybridWorkoutWhereInput = { AND: andFilters };

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
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error, 'GET /api/hybrid-workouts');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 });
    }
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
      teamId?: string | null;
      trainingYear?: number | null;
      isPublic?: boolean;
      warmupData?: unknown;
      strengthData?: unknown;
      metconData?: unknown;
      cooldownData?: unknown;
    }>(request);
    const metadataData = await buildWorkoutLibraryMetadataData(user.id, request, body, {
      defaultTrainingYear: true,
    });

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
      metconData,
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
        ...metadataData,
        tags: normalizeWorkoutTags(tags, businessScope.businessId),
        // Section data
        warmupData: warmupData ?? undefined,
        strengthData: strengthData ?? undefined,
        metconData: metconData ?? undefined,
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
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error, 'POST /api/hybrid-workouts');
  }
}
