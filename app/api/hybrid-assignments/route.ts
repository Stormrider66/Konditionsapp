/**
 * Hybrid Workout Assignment API
 *
 * Manages workout assignments from coach to athletes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach, getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils';
import { canAccessAthlete } from '@/lib/auth/athlete-access';
import { logError } from '@/lib/logger-console'

// GET /api/hybrid-assignments - Get assignments
// Query params: athleteId, workoutId, status, dateFrom, dateTo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get('athleteId');
    const workoutId = searchParams.get('workoutId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build where clause based on user role
    const where: any = {};

    // Try resolving as athlete (or coach-in-athlete-mode)
    if (!athleteId) {
      const resolved = await resolveAthleteClientId();
      if (resolved) {
        where.athleteId = resolved.clientId;
      } else if (user.role === 'COACH') {
        // Default coach scope: only assignments for their own athletes.
        where.athlete = { userId: user.id };
      } else if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // athleteId provided via query param - enforce coach-athlete authorization
      const access = await canAccessAthlete(user.id, athleteId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      where.athleteId = athleteId;
    }

    if (workoutId) {
      where.workoutId = workoutId;
    }

    if (status) {
      where.status = status;
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
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/hybrid-assignments - Create assignment(s)
// Body: { workoutId, athleteIds, assignedDate, notes?, customScaling?, scalingNotes?, startTime?, endTime?, locationId?, locationName?, createCalendarEvent? }
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

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
      createCalendarEvent = true,
    } = body;

    if (!workoutId || !athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: 'workoutId and athleteIds are required' },
        { status: 400 }
      );
    }

    if (!assignedDate) {
      return NextResponse.json(
        { error: 'assignedDate is required' },
        { status: 400 }
      );
    }

    // Verify workout exists and is assignable by this coach
    const workout = await prisma.hybridWorkout.findFirst({
      where: {
        id: workoutId,
        OR: [
          { coachId: user.id },
          { isPublic: true },
          { coachId: null }, // system workouts
        ],
      },
    });

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found or access denied' },
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
        { error: 'Forbidden: one or more athletes are not accessible' },
        { status: 403 }
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
      athleteIds.map((athleteId: string) =>
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
          },
        })
      )
    );

    // Create calendar events if startTime is provided and createCalendarEvent is true
    if (startTime && createCalendarEvent) {
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
              startTime: startTime,
              endTime: endTime || undefined,
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
      message: `Assigned workout to ${assignments.length} athlete(s)`,
      assignments,
    });
  } catch (error) {
    logError('Error creating assignments:', error);
    return NextResponse.json(
      { error: 'Failed to create assignments' },
      { status: 500 }
    );
  }
}
