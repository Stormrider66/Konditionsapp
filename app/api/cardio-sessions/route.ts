/**
 * Cardio Sessions API
 *
 * GET  - List coach's cardio sessions with filtering
 * POST - Create new cardio session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { Prisma, SportType } from '@prisma/client';
import { logger } from '@/lib/logger';
import {
  cardioSessionAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope';
import { normalizeWorkoutTags } from '@/lib/workouts/business-tags';
import {
  buildWorkoutLibraryMetadataData,
  normalizeWorkoutTrainingYear,
  WorkoutLibraryMetadataError,
} from '@/lib/workouts/library-metadata';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

function workoutLibraryMetadataErrorMessage(locale: AppLocale, message: string): string {
  if (message === 'Training year must be between 2000 and 2100') {
    return t(locale, message, 'Träningsåret måste vara mellan 2000 och 2100');
  }
  if (message === 'Team must be a valid team id') {
    return t(locale, message, 'Team måste vara ett giltigt team-id');
  }
  if (message === 'Team not found or unavailable') {
    return t(locale, message, 'Teamet hittades inte eller är inte tillgängligt');
  }
  return message;
}

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') as SportType | null;
    const teamId = searchParams.get('teamId');
    const trainingYear = normalizeWorkoutTrainingYear(searchParams.get('trainingYear') ?? undefined);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const andFilters: Prisma.CardioSessionWhereInput[] = [
      cardioSessionAccessWhere(user.id, businessScope.businessId),
    ];

    if (sport) {
      andFilters.push({ sport });
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

    const where: Prisma.CardioSessionWhereInput = { AND: andFilters };

    const [sessions, total] = await Promise.all([
      prisma.cardioSession.findMany({
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
      prisma.cardioSession.count({ where }),
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
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    logger.error('Error fetching cardio sessions', {}, error);
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch cardio sessions', 'Kunde inte hämta konditionspass') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const body = await request.json();

    const {
      name,
      description,
      sport,
      segments,
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

    // Calculate totals from segments (handles REPEAT_GROUP)
    const segmentList = segments || [];
    let totalDuration = 0;
    let totalDistance = 0;
    let weightedZoneSum = 0;
    let totalZoneDuration = 0;

    for (const s of segmentList as Array<Record<string, unknown>>) {
      if (s.type === 'REPEAT_GROUP' && Array.isArray(s.steps)) {
        const reps = (s.repeats as number) || 1;
        const stepsDur = (s.steps as Array<Record<string, unknown>>).reduce(
          (sum: number, step) => sum + ((step.duration as number) || 0), 0
        );
        const stepsDist = (s.steps as Array<Record<string, unknown>>).reduce(
          (sum: number, step) => sum + ((step.distance as number) || 0), 0
        );
        const restBetween = ((s.restBetweenRounds as number) || 0) * Math.max(reps - 1, 0);
        totalDuration += (stepsDur * reps) + restBetween;
        totalDistance += stepsDist * reps;
        for (const step of s.steps as Array<Record<string, unknown>>) {
          if (step.zone && step.duration) {
            const dur = (step.duration as number) * reps;
            weightedZoneSum += (step.zone as number) * dur;
            totalZoneDuration += dur;
          }
        }
      } else {
        const reps = ((s.repeats as number) && (s.repeats as number) > 1) ? (s.repeats as number) : 1;
        const rest = ((s.restDuration as number) || 0) * Math.max(reps - 1, 0);
        totalDuration += ((s.duration as number) || 0) * reps + rest;
        totalDistance += ((s.distance as number) || 0) * reps;
        if (s.zone && s.duration) {
          const dur = (s.duration as number) * reps;
          weightedZoneSum += (s.zone as number) * dur;
          totalZoneDuration += dur;
        }
      }
    }
    const avgZone = totalZoneDuration > 0 ? weightedZoneSum / totalZoneDuration : null;

    const session = await prisma.cardioSession.create({
      data: {
        name,
        description,
        sport: sport || 'RUNNING',
        segments: segments || [],
        totalDuration: totalDuration > 0 ? totalDuration : null,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        avgZone,
        coachId: user.id,
        isPublic: isPublic || false,
        ...metadataData,
        tags: normalizeWorkoutTags(tags, businessScope.businessId),
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
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    logger.error('Error creating cardio session', {}, error);
    return NextResponse.json(
      { error: t(locale, 'Failed to create cardio session', 'Kunde inte skapa konditionspass') },
      { status: 500 }
    );
  }
}
