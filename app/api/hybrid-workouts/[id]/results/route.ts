/**
 * Hybrid Workout Results API
 *
 * GET  - List results for a workout
 * POST - Log a new result
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils';
import { canAccessAthlete } from '@/lib/auth/athlete-access';
import { HybridScoreType, ScalingLevel } from '@prisma/client';
import { logError } from '@/lib/logger-console'

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get('athleteId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { workoutId: id }

    // Access control:
    // - Athletes (or coach-in-athlete-mode): only their own results
    // - Coaches: only results for their own athletes
    const resolved = await resolveAthleteClientId()
    if (resolved) {
      where.athleteId = resolved.clientId
    } else if (user.role === 'COACH' || user.role === 'ADMIN') {
      if (athleteId) {
        const hasAccess = await canAccessAthlete(user.id, athleteId)
        if (!hasAccess.allowed) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      where.athlete = { userId: user.id }
      if (athleteId) {
        where.athleteId = athleteId
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [results, total] = await Promise.all([
      prisma.hybridWorkoutResult.findMany({
        where,
        include: {
          athlete: {
            select: {
              id: true,
              name: true,
            },
          },
          workout: {
            select: {
              id: true,
              name: true,
              format: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.hybridWorkoutResult.count({ where }),
    ]);

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logError('Error fetching results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const {
      scoreType,
      timeScore,
      roundsCompleted,
      repsCompleted,
      loadUsed,
      caloriesScore,
      scalingLevel,
      scalingNotes,
      workoutDate,
      notes,
      perceivedEffort,
      difficulty,
      movementSplits,
      videoUrl,
    } = body;

    // Determine which athlete this result is for
    let athleteId: string | undefined

    // First try resolving as athlete (or coach-in-athlete-mode)
    const resolved = await resolveAthleteClientId()
    if (resolved) {
      athleteId = resolved.clientId
    } else if (user.role === 'COACH' || user.role === 'ADMIN') {
      athleteId = body?.athleteId
      if (typeof athleteId !== 'string' || !athleteId) {
        return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })
      }
      // Verify coach can write results for this athlete
      const hasAccess = await canAccessAthlete(user.id, athleteId)
      if (!hasAccess.allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!athleteId) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    // Validate workout exists
    const workout = await prisma.hybridWorkout.findUnique({
      where: { id },
    });

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Check if this is a PR
    let isPR = false;
    const previousBest = await prisma.hybridWorkoutResult.findFirst({
      where: {
        workoutId: id,
        athleteId,
        scalingLevel: scalingLevel as ScalingLevel,
      },
      orderBy: [
        // Order depends on score type - lower time is better, higher reps is better
        { timeScore: 'asc' },
        { roundsCompleted: 'desc' },
        { repsCompleted: 'desc' },
      ],
    });

    if (previousBest) {
      // Determine if new score is better based on score type
      switch (scoreType) {
        case 'TIME':
          isPR = timeScore && previousBest.timeScore ? timeScore < previousBest.timeScore : false;
          break;
        case 'ROUNDS_REPS':
          if (roundsCompleted && previousBest.roundsCompleted) {
            isPR =
              roundsCompleted > previousBest.roundsCompleted ||
              (roundsCompleted === previousBest.roundsCompleted &&
                (repsCompleted || 0) > (previousBest.repsCompleted || 0));
          }
          break;
        case 'LOAD':
          isPR = loadUsed && previousBest.loadUsed ? loadUsed > previousBest.loadUsed : false;
          break;
        case 'REPS':
        case 'CALORIES':
          isPR =
            (repsCompleted || caloriesScore || 0) >
            (previousBest.repsCompleted || previousBest.caloriesScore || 0);
          break;
      }
    } else {
      // First result is always a PR
      isPR = true;
    }

    const result = await prisma.hybridWorkoutResult.create({
      data: {
        workoutId: id,
        athleteId,
        scoreType: scoreType as HybridScoreType,
        timeScore,
        roundsCompleted,
        repsCompleted,
        loadUsed,
        caloriesScore,
        scalingLevel: (scalingLevel as ScalingLevel) || 'RX',
        scalingNotes,
        workoutDate: workoutDate ? new Date(workoutDate) : undefined,
        notes,
        perceivedEffort,
        difficulty,
        movementSplits,
        videoUrl,
        isPR,
        previousBestId: previousBest?.id,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
      },
    });

    return NextResponse.json(
      { result, previousBest: previousBest || null },
      { status: 201 }
    );
  } catch (error) {
    logError('Error creating result:', error);
    return NextResponse.json(
      { error: 'Failed to create result' },
      { status: 500 }
    );
  }
}
