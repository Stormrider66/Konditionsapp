/**
 * Strength Session Single API
 *
 * GET    - Get single strength session with details
 * PUT    - Update strength session
 * DELETE - Delete strength session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { Prisma } from '@prisma/client';
import { logError } from '@/lib/logger-console'
import {
  calculateStrengthSessionVolumeLoad,
  countStrengthSessionExercises,
  countStrengthSessionSets,
} from '@/lib/strength/session-sections';
import {
  ownedStrengthSessionWhere,
  resolveStrengthBusinessScope,
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope';
import { normalizeStrengthSessionTags } from '@/lib/strength/session-business-tags';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 });
    }

    const { id } = await context.params;

    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        AND: [strengthSessionAccessWhere(user.id, businessScope.businessId)],
      },
      include: {
        assignments: {
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
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error fetching strength session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strength session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.strengthSession.findFirst({
      where: ownedStrengthSessionWhere(id, user.id, businessScope.businessId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

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

    const nextExercises = exercises ?? existing.exercises ?? [];
    const sectionInput = {
      exercises: nextExercises,
      warmupData: warmupData === undefined ? existing.warmupData : warmupData,
      prehabData: prehabData === undefined ? existing.prehabData : prehabData,
      coreData: coreData === undefined ? existing.coreData : coreData,
      cooldownData: cooldownData === undefined ? existing.cooldownData : cooldownData,
    };
    const totalExercises = countStrengthSessionExercises(sectionInput);
    const totalSets = countStrengthSessionSets(sectionInput);
    const volumeLoad = calculateStrengthSessionVolumeLoad(sectionInput);

    const sectionJson = (value: unknown) =>
      value === null ? Prisma.DbNull : value || undefined

    const session = await prisma.strengthSession.update({
      where: { id },
      data: {
        name,
        description,
        phase,
        timingRelativeToRun,
        estimatedDuration,
        exercises: nextExercises,
        warmupData: sectionJson(warmupData),
        prehabData: sectionJson(prehabData),
        coreData: sectionJson(coreData),
        cooldownData: sectionJson(cooldownData),
        totalSets,
        totalExercises,
        volumeLoad: volumeLoad > 0 ? volumeLoad : null,
        isPublic,
        tags: normalizeStrengthSessionTags(tags, businessScope.businessId, existing.tags),
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error updating strength session:', error);
    return NextResponse.json(
      { error: 'Failed to update strength session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const businessScope = await resolveStrengthBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: 'Business not found' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check ownership
    const existing = await prisma.strengthSession.findFirst({
      where: ownedStrengthSessionWhere(id, user.id, businessScope.businessId),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Collect calendar-event ids from any assignments so we can clean them up
    // too — StrengthSessionAssignment cascades on session delete, but its FK
    // to CalendarEvent doesn't, so the events would otherwise orphan on the
    // athlete's calendar.
    const assignments = await prisma.strengthSessionAssignment.findMany({
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
      await tx.strengthSession.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      removedAssignments: assignments.length,
      removedCalendarEvents: calendarEventIds.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error deleting strength session:', error);
    return NextResponse.json(
      { error: 'Failed to delete strength session' },
      { status: 500 }
    );
  }
}
