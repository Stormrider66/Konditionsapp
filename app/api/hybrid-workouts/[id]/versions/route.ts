/**
 * Hybrid Workout Versions API
 *
 * Manages version history for workout changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach, getCurrentUser } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/hybrid-workouts/[id]/versions - Get version history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workout = await prisma.hybridWorkout.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        version: true,
        versionNotes: true,
        parentId: true,
        coachId: true,
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Get version history
    const versions = await prisma.hybridWorkoutVersion.findMany({
      where: { workoutId: id },
      orderBy: { versionNumber: 'desc' },
    });

    // Get other versions of this workout (parent and siblings)
    let relatedVersions: any[] = [];
    if (workout.parentId) {
      relatedVersions = await prisma.hybridWorkout.findMany({
        where: {
          OR: [
            { id: workout.parentId },
            { parentId: workout.parentId },
          ],
        },
        select: {
          id: true,
          name: true,
          version: true,
          versionNotes: true,
          createdAt: true,
        },
        orderBy: { version: 'desc' },
      });
    } else {
      // This is the parent, find children
      relatedVersions = await prisma.hybridWorkout.findMany({
        where: { parentId: id },
        select: {
          id: true,
          name: true,
          version: true,
          versionNotes: true,
          createdAt: true,
        },
        orderBy: { version: 'desc' },
      });
    }

    return NextResponse.json({
      currentVersion: workout.version,
      versionHistory: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changeType: v.changeType,
        changeNotes: v.changeNotes,
        changedBy: v.changedBy,
        createdAt: v.createdAt,
      })),
      relatedVersions,
    });
  } catch (error) {
    logError('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/hybrid-workouts/[id]/versions - Create a new version
// Body: { changeType, changeNotes?, createCopy? }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await requireCoach();

    const body = await request.json();
    const { changeType, changeNotes, createCopy = false } = body;

    const workout = await prisma.hybridWorkout.findUnique({
      where: { id },
      include: {
        movements: {
          include: { exercise: true },
          orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Create snapshot of current state
    const snapshot = {
      name: workout.name,
      description: workout.description,
      format: workout.format,
      timeCap: workout.timeCap,
      workTime: workout.workTime,
      restTime: workout.restTime,
      totalRounds: workout.totalRounds,
      totalMinutes: workout.totalMinutes,
      repScheme: workout.repScheme,
      scalingLevel: workout.scalingLevel,
      movements: workout.movements.map((m) => ({
        exerciseId: m.exerciseId,
        exerciseName: m.exercise.name,
        order: m.order,
        setNumber: m.setNumber,
        roundNumber: m.roundNumber,
        reps: m.reps,
        duration: m.duration,
        distance: m.distance,
        calories: m.calories,
        weightMale: m.weightMale,
        weightFemale: m.weightFemale,
        notes: m.notes,
      })),
      tags: workout.tags,
    };

    if (createCopy) {
      // Create a new workout as a copy/fork
      const newWorkout = await prisma.hybridWorkout.create({
        data: {
          name: `${workout.name} (v${workout.version + 1})`,
          description: workout.description,
          format: workout.format,
          timeCap: workout.timeCap,
          workTime: workout.workTime,
          restTime: workout.restTime,
          totalRounds: workout.totalRounds,
          totalMinutes: workout.totalMinutes,
          repScheme: workout.repScheme,
          scalingLevel: workout.scalingLevel,
          isBenchmark: false, // Copies are not benchmarks
          coachId: user.id,
          isPublic: false,
          tags: workout.tags,
          version: workout.version + 1,
          versionNotes: changeNotes,
          parentId: workout.parentId || workout.id, // Link to original or parent
          movements: {
            create: workout.movements.map((m) => ({
              exerciseId: m.exerciseId,
              order: m.order,
              setNumber: m.setNumber,
              roundNumber: m.roundNumber,
              reps: m.reps,
              duration: m.duration,
              distance: m.distance,
              calories: m.calories,
              weightMale: m.weightMale,
              weightFemale: m.weightFemale,
              notes: m.notes,
            })),
          },
          versionHistory: {
            create: {
              versionNumber: workout.version + 1,
              changeType: changeType || 'FORKED',
              changeNotes: changeNotes || `Forked from ${workout.name}`,
              changedBy: user.id,
              snapshot,
            },
          },
        },
        include: {
          movements: {
            include: { exercise: true },
            orderBy: [{ setNumber: 'asc' }, { order: 'asc' }],
          },
        },
      });

      return NextResponse.json({
        message: 'Workout version created',
        workout: newWorkout,
      });
    } else {
      // Just record the version in history (for tracking changes)
      const newVersion = workout.version + 1;

      await prisma.$transaction([
        // Update workout version
        prisma.hybridWorkout.update({
          where: { id },
          data: {
            version: newVersion,
            versionNotes: changeNotes,
          },
        }),
        // Create version history entry
        prisma.hybridWorkoutVersion.create({
          data: {
            workoutId: id,
            versionNumber: newVersion,
            changeType: changeType || 'MODIFIED',
            changeNotes,
            changedBy: user.id,
            snapshot,
          },
        }),
      ]);

      return NextResponse.json({
        message: 'Version recorded',
        version: newVersion,
      });
    }
  } catch (error) {
    logError('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
