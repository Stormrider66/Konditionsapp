/**
 * Hybrid Workout Assignment API
 *
 * Manages workout assignments from coach to athletes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, AssignmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireCoach, getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils';
import { canAccessAthlete } from '@/lib/auth/athlete-access';
import { logError } from '@/lib/logger-console'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import {
  hybridWorkoutAccessWhere,
  resolveWorkoutBusinessScope,
} from '@/lib/workouts/business-scope';
import { checkWorkoutAssignmentRestrictions } from '@/lib/training-restrictions/assignment-enforcement';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

// GET /api/hybrid-assignments - Get assignments
// Query params: athleteId, workoutId, status, dateFrom, dateTo
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get('athleteId');
    const workoutId = searchParams.get('workoutId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    // Build where clause based on user role
    const where: Prisma.HybridWorkoutAssignmentWhereInput = {};

    // Try resolving as athlete (or coach-in-athlete-mode)
    if (!athleteId) {
      const resolved = await resolveAthleteClientId();
      const hasCoachAccess = user.role === 'ADMIN' || user.role === 'COACH' || await canAccessCoachPlatform(user.id);
      if (resolved) {
        where.athleteId = resolved.clientId;
      } else if (hasCoachAccess) {
        // Default coach scope: only assignments for their own athletes.
        where.athlete = businessScope.businessId
          ? { businessId: businessScope.businessId }
          : { userId: user.id };
      } else if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 });
      }
    } else {
      // athleteId provided via query param - enforce coach-athlete authorization
      const access = await canAccessAthlete(user.id, athleteId);
      if (!access.allowed) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 });
      }
      where.athleteId = athleteId;
    }

    if (workoutId) {
      where.workoutId = workoutId;
    }

    if (status) {
      where.status = status as AssignmentStatus;
    }

    if (dateFrom || dateTo) {
      where.assignedDate = {};
      if (dateFrom) {
        where.assignedDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.assignedDate.lte = new Date(dateTo);
      }
    }

    const assignments = await prisma.hybridWorkoutAssignment.findMany({
      where,
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
            isBenchmark: true,
            scalingLevel: true,
          },
        },
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { assignedDate: 'asc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    logError('Error fetching assignments:', error);
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch assignments', 'Kunde inte hämta tilldelningar') },
      { status: 500 }
    );
  }
}

// POST /api/hybrid-assignments - Create assignment(s)
// Body: { workoutId, athleteIds, assignedDate, notes?, customScaling?, scalingNotes?, startTime?, endTime?, locationId?, locationName?, createCalendarEvent? }
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await requireCoach();
    locale = resolveRequestLocale(request, user.language);
    const businessScope = await resolveWorkoutBusinessScope(user.id, request);

    if (!businessScope) {
      return NextResponse.json({ error: t(locale, 'Business not found', 'Verksamheten hittades inte') }, { status: 403 });
    }

    const body = await request.json();
    const {
      workoutId,
      athleteIds,
      assignedDate,
      notes,
      customScaling,
      scalingNotes,
      // Scheduling fields
      startTime,
      endTime,
      locationId,
      locationName,
      responsibleCoachId,
      createCalendarEvent = true,
    } = body;

    if (!workoutId || !athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'workoutId and athleteIds are required', 'workoutId och athleteIds krävs') },
        { status: 400 }
      );
    }

    if (!assignedDate) {
      return NextResponse.json(
        { error: t(locale, 'assignedDate is required', 'assignedDate krävs') },
        { status: 400 }
      );
    }

    // Verify workout exists and is assignable by this coach
    const workout = await prisma.hybridWorkout.findFirst({
      where: {
        id: workoutId,
        AND: [hybridWorkoutAccessWhere(user.id, businessScope.businessId)],
      },
    });

    if (!workout) {
      return NextResponse.json(
        { error: t(locale, 'Workout not found or access denied', 'Passet hittades inte eller åtkomst nekades') },
        { status: 403 }
      );
    }

    // Verify coach can assign to all requested athletes
    const accessChecks = await Promise.all(
      athleteIds.map((athleteId: string) => canAccessAthlete(user.id, athleteId))
    );
    const hasForbiddenAthlete = accessChecks.some((access) => !access.allowed);
    if (hasForbiddenAthlete) {
      return NextResponse.json(
        { error: t(locale, 'Forbidden: one or more athletes are not accessible', 'Förbjudet: en eller flera atleter är inte tillgängliga') },
        { status: 403 }
      );
    }

    if (businessScope.businessId) {
      const athletesInBusiness = await prisma.client.count({
        where: {
          id: { in: athleteIds },
          businessId: businessScope.businessId,
        },
      });

      if (athletesInBusiness !== athleteIds.length) {
        return NextResponse.json(
          { error: t(locale, 'Forbidden: one or more athletes are outside this business', 'Förbjudet: en eller flera atleter ligger utanför den här verksamheten') },
          { status: 403 }
        );
      }
    }

    // Physio restriction enforcement: skip athletes blocked for this workout.
    const { blockedByAthlete } = await checkWorkoutAssignmentRestrictions({
      workoutType: 'hybrid',
      workoutId,
      athleteIds,
    });
    const assignableIds = athleteIds.filter((aid: string) => !blockedByAthlete.has(aid));
    const skipped = athleteIds
      .filter((aid: string) => blockedByAthlete.has(aid))
      .map((aid: string) => ({ athleteId: aid, reasons: blockedByAthlete.get(aid)?.reasons ?? [] }));
    if (assignableIds.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'All selected athletes are blocked by an active restriction for this workout', 'Alla valda atleter blockeras av en aktiv begränsning för det här passet'), skipped },
        { status: 400 }
      );
    }

    // Resolve location name if locationId is provided
    let resolvedLocationName = locationName;
    if (locationId && !locationName) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { name: true },
      });
      resolvedLocationName = location?.name || undefined;
    }

    // Create assignments for all athletes
    const assignments = await prisma.$transaction(
      assignableIds.map((athleteId: string) =>
        prisma.hybridWorkoutAssignment.upsert({
          where: {
            workoutId_athleteId_assignedDate: {
              workoutId,
              athleteId,
              assignedDate: new Date(assignedDate),
            },
          },
          update: {
            notes,
            customScaling,
            scalingNotes,
            assignedBy: user.id,
            status: 'PENDING',
            // Scheduling fields
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: resolvedLocationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
          },
          create: {
            workoutId,
            athleteId,
            assignedDate: new Date(assignedDate),
            assignedBy: user.id,
            notes,
            customScaling,
            scalingNotes,
            // Scheduling fields
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: resolvedLocationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
          },
        })
      )
    );

    // Create calendar events so the assignment shows up on the coach/athlete calendar.
    // When startTime is absent, create an all-day event on the assigned date.
    if (createCalendarEvent) {
      const assignedDateObj = new Date(assignedDate);
      for (const assignment of assignments) {
        // Get athlete info for calendar event
        const athlete = await prisma.client.findUnique({
          where: { id: assignment.athleteId },
          select: { id: true, name: true },
        });

        if (athlete) {
          // Create calendar event
          const calendarEvent = await prisma.calendarEvent.create({
            data: {
              clientId: athlete.id,
              title: workout.name,
              description: notes || `Hybrid workout: ${workout.name}`,
              type: 'SCHEDULED_WORKOUT',
              startDate: assignedDateObj,
              endDate: assignedDateObj,
              allDay: !startTime,
              startTime: startTime || undefined,
              endTime: endTime || undefined,
              trainingImpact: 'NORMAL',
              createdById: user.id,
            },
          });

          // Link calendar event to assignment
          await prisma.hybridWorkoutAssignment.update({
            where: { id: assignment.id },
            data: { calendarEventId: calendarEvent.id },
          });
        }
      }
    }

    return NextResponse.json({
      message: t(locale, `Assigned workout to ${assignments.length} athlete(s)`, `Tilldelade passet till ${assignments.length} atlet(er)`),
      assignments,
      skipped,
    });
  } catch (error) {
    logError('Error creating assignments:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to create assignments', 'Kunde inte skapa tilldelningar') },
      { status: 500 }
    );
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}
