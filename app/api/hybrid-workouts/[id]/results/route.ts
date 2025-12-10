/**
 * Hybrid Workout Results API
 *
 * GET  - List results for a workout
 * POST - Log a new result
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { HybridScoreType, ScalingLevel } from '@prisma/client';

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

    const where: Record<string, unknown> = { workoutId: id };

    if (athleteId) {
      where.athleteId = athleteId;
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
    console.error('Error fetching results:', error);
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
      athleteId,
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating result:', error);
    return NextResponse.json(
      { error: 'Failed to create result' },
      { status: 500 }
    );
  }
}
