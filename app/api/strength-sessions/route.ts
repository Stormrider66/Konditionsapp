/**
 * Strength Sessions API
 *
 * GET  - List coach's strength sessions with filtering
 * POST - Create new strength session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { Prisma, StrengthPhase } from '@prisma/client';
import { logger } from '@/lib/logger';
import {
  calculateStrengthSessionVolumeLoad,
  countStrengthSessionExercises,
  countStrengthSessionSets,
} from '@/lib/strength/session-sections';
import {
  resolveStrengthBusinessScope,
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope';
import { normalizeStrengthSessionTags } from '@/lib/strength/session-business-tags';
import {
  buildWorkoutLibraryMetadataData,
  normalizeWorkoutTrainingYear,
  WorkoutLibraryMetadataError,
} from '@/lib/workouts/library-metadata';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase') as StrengthPhase | null;
    const teamId = searchParams.get('teamId');
    const trainingYear = normalizeWorkoutTrainingYear(searchParams.get('trainingYear') ?? undefined);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const andFilters: Prisma.StrengthSessionWhereInput[] = [
      strengthSessionAccessWhere(user.id, businessScope.businessId),
    ];

    if (phase) {
      andFilters.push({ phase });
    }

    if (teamId && teamId !== 'all') {
      andFilters.push({ teamId });
    }

    if (typeof trainingYear === 'number') {
      andFilters.push({ trainingYear });
    }

    if (search) {
      andFilters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const tagFilters = searchParams.getAll('tag').filter(Boolean);
    if (tagFilters.length > 0) {
      andFilters.push({ tags: { hasSome: tagFilters } });
    }

    const where: Prisma.StrengthSessionWhereInput = { AND: andFilters };

    const [sessions, total] = await Promise.all([
      prisma.strengthSession.findMany({
        where,
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.strengthSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
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
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    logger.error('Error fetching strength sessions', {}, error);
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch strength sessions', 'Kunde inte hämta styrkepass') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      phase,
      timingRelativeToRun,
      estimatedDuration,
      exercises,
      warmupData,
      prehabData,
      coreData,
      cooldownData,
      tags,
      isPublic,
    } = body;
    const metadataData = await buildWorkoutLibraryMetadataData(user.id, request, body, {
      defaultTrainingYear: true,
    });

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: t(locale, 'Name is required', 'Namn krävs') },
        { status: 400 }
      );
    }

    const sectionInput = {
      exercises: exercises || [],
      warmupData,
      prehabData,
      coreData,
      cooldownData,
    };
    const totalExercises = countStrengthSessionExercises(sectionInput);
    const totalSets = countStrengthSessionSets(sectionInput);
    const volumeLoad = calculateStrengthSessionVolumeLoad(sectionInput);

    const session = await prisma.strengthSession.create({
      data: {
        name,
        description,
        phase: phase || 'ANATOMICAL_ADAPTATION',
        timingRelativeToRun,
        estimatedDuration,
        exercises: exercises || [],
        warmupData: warmupData || undefined,
        prehabData: prehabData || undefined,
        coreData: coreData || undefined,
        cooldownData: cooldownData || undefined,
        totalSets,
        totalExercises,
        volumeLoad: volumeLoad > 0 ? volumeLoad : null,
        coachId: user.id,
        isPublic: isPublic || false,
        ...metadataData,
        tags: normalizeStrengthSessionTags(tags, businessScope.businessId),
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    logger.error('Error creating strength session', {}, error);
    return NextResponse.json(
      { error: t(locale, 'Failed to create strength session', 'Kunde inte skapa styrkepass') },
      { status: 500 }
    );
  }
}
