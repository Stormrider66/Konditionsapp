/**
 * Cardio Session Single API
 *
 * GET    - Get single cardio session with details
 * PUT    - Update cardio session
 * DELETE - Delete cardio session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'
import {
  cardioSessionAccessWhere,
  ownedCardioSessionWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope';
import { normalizeWorkoutTags } from '@/lib/workouts/business-tags';
import {
  buildWorkoutLibraryMetadataData,
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const { id } = await context.params;

    const session = await prisma.cardioSession.findFirst({
      where: {
        id,
        AND: [cardioSessionAccessWhere(user.id, businessScope.businessId)],
      },
      include: {
        assignments: {
          where: businessScope.businessId
            ? { athlete: { businessId: businessScope.businessId } }
            : undefined,
          take: 10,
          orderBy: { assignedDate: 'desc' },
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: t(locale, 'Session not found', 'Passet hittades inte') },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    logError('Error fetching cardio session:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch cardio session', 'Kunde inte hämta konditionspass') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.cardioSession.findFirst({
      where: ownedCardioSessionWhere(id, user.id, businessScope.businessId),
      select: { tags: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: t(locale, 'Session not found or you do not have permission to edit it', 'Passet hittades inte eller så saknar du behörighet att redigera det') },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      sport,
      segments,
      tags,
      isPublic,
    } = body;
    const metadataData = await buildWorkoutLibraryMetadataData(user.id, request, body);

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

    const session = await prisma.cardioSession.update({
      where: { id },
      data: {
        name,
        description,
        sport,
        segments: segments || [],
        totalDuration: totalDuration > 0 ? totalDuration : null,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        avgZone,
        isPublic,
        ...metadataData,
        tags: normalizeWorkoutTags(tags, businessScope.businessId, existing.tags),
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof WorkoutLibraryMetadataError) {
      return NextResponse.json({ error: workoutLibraryMetadataErrorMessage(locale, error.message) }, { status: error.status });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    logError('Error updating cardio session:', error);
    return NextResponse.json(
      { error: t(locale, 'Failed to update cardio session', 'Kunde inte uppdatera konditionspass') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }
    const { id } = await context.params;

    // Check ownership
    const existing = await prisma.cardioSession.findFirst({
      where: ownedCardioSessionWhere(id, user.id, businessScope.businessId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: t(locale, 'Session not found or you do not have permission to delete it', 'Passet hittades inte eller så saknar du behörighet att radera det') },
        { status: 404 }
      );
    }

    // Clean up calendar events linked to assignments — CardioSessionAssignment
    // cascades on session delete, but its calendarEventId FK doesn't reverse
    // cascade, so the events would orphan on athletes' calendars otherwise.
    const assignments = await prisma.cardioSessionAssignment.findMany({
      where: { sessionId: id },
      select: { calendarEventId: true },
    });
    const calendarEventIds = assignments
      .map((a) => a.calendarEventId)
      .filter((v): v is string => !!v);

    await prisma.$transaction(async (tx) => {
      if (calendarEventIds.length > 0) {
        await tx.calendarEvent.deleteMany({
          where: { id: { in: calendarEventIds } },
        });
      }
      await tx.cardioSession.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      removedAssignments: assignments.length,
      removedCalendarEvents: calendarEventIds.length,
    });
  } catch (error) {
    logError('Error deleting cardio session:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to delete cardio session', 'Kunde inte radera konditionspass') },
      { status: 500 }
    );
  }
}
