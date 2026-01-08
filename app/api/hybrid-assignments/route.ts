/**
 * Hybrid Workout Assignment API
 *
 * Manages workout assignments from coach to athletes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach, requireAthlete, getCurrentUser } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

// GET /api/hybrid-assignments - Get assignments
// Query params: athleteId, workoutId, status, dateFrom, dateTo
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get('athleteId');
    const workoutId = searchParams.get('workoutId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where clause based on user role
    const where: any = {};

    // If athlete, only show their assignments
    if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (!athleteAccount) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
      }
      where.athleteId = athleteAccount.clientId;
    } else if (athleteId) {
      // Coach can filter by athlete
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
// Body: { workoutId, athleteIds, assignedDate, notes?, customScaling?, scalingNotes? }
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body = await request.json();
    const { workoutId, athleteIds, assignedDate, notes, customScaling, scalingNotes } = body;

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

    // Verify workout exists
    const workout = await prisma.hybridWorkout.findUnique({
      where: { id: workoutId },
    });

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
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
          },
          create: {
            workoutId,
            athleteId,
            assignedDate: new Date(assignedDate),
            assignedBy: user.id,
            notes,
            customScaling,
            scalingNotes,
          },
        })
      )
    );

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
