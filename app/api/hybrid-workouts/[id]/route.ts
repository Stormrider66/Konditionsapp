/**
 * Hybrid Workout Single API
 *
 * GET    - Get single hybrid workout with details
 * PUT    - Update hybrid workout
 * DELETE - Delete hybrid workout
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { HybridFormat, ScalingLevel } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    const workout = await prisma.hybridWorkout.findFirst({
      where: {
        id,
        OR: [
          { coachId: user.id },
          { isPublic: true },
          { coachId: null }, // System/benchmark workouts
        ],
      },
      include: {
        movements: {
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                nameSv: true,
                nameEn: true,
                standardAbbreviation: true,
                equipmentTypes: true,
                defaultWeightMale: true,
                defaultWeightFemale: true,
                scaledWeightMale: true,
                scaledWeightFemale: true,
                foundationMovement: true,
                movementCategory: true,
                description: true,
                videoUrl: true,
                iconUrl: true,
                iconCategory: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        scaledVersions: {
          select: {
            id: true,
            name: true,
            scalingLevel: true,
          },
        },
        rxVersion: {
          select: {
            id: true,
            name: true,
          },
        },
        results: {
          take: 10,
          orderBy: { completedAt: 'desc' },
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
          select: { results: true },
        },
      },
    });

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error fetching hybrid workout:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hybrid workout' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.hybridWorkout.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workout not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    const {
      name,
      description,
      format,
      timeCap,
      workTime,
      restTime,
      totalRounds,
      totalMinutes,
      repScheme,
      scalingLevel,
      movements,
      tags,
      isPublic,
      // Section data
      warmupData,
      strengthData,
      cooldownData,
    } = body;

    // Update workout - delete and recreate movements
    const workout = await prisma.$transaction(async (tx) => {
      // Delete existing movements
      await tx.hybridMovement.deleteMany({
        where: { workoutId: id },
      });

      // Update workout with new movements
      return tx.hybridWorkout.update({
        where: { id },
        data: {
          name,
          description,
          format: format as HybridFormat,
          timeCap,
          workTime,
          restTime,
          totalRounds,
          totalMinutes,
          repScheme,
          scalingLevel: scalingLevel as ScalingLevel,
          isPublic,
          tags: tags || [],
          // Section data
          warmupData: warmupData ?? undefined,
          strengthData: strengthData ?? undefined,
          cooldownData: cooldownData ?? undefined,
          movements: {
            create: movements?.map(
              (
                m: {
                  exerciseId: string;
                  order: number;
                  roundNumber?: number;
                  setNumber?: number;
                  reps?: number;
                  calories?: number;
                  distance?: number;
                  duration?: number;
                  weightMale?: number;
                  weightFemale?: number;
                  percentOfMax?: number;
                  isUnbroken?: boolean;
                  alternateSides?: boolean;
                  notes?: string;
                },
                index: number
              ) => ({
                exerciseId: m.exerciseId,
                order: m.order ?? index + 1,
                roundNumber: m.roundNumber,
                setNumber: m.setNumber,
                reps: m.reps,
                calories: m.calories,
                distance: m.distance,
                duration: m.duration,
                weightMale: m.weightMale,
                weightFemale: m.weightFemale,
                percentOfMax: m.percentOfMax,
                isUnbroken: m.isUnbroken || false,
                alternateSides: m.alternateSides || false,
                notes: m.notes,
              })
            ),
          },
        },
        include: {
          movements: {
            include: {
              exercise: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error updating hybrid workout:', error);
    return NextResponse.json(
      { error: 'Failed to update hybrid workout' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Check ownership
    const existing = await prisma.hybridWorkout.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workout not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    await prisma.hybridWorkout.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hybrid workout:', error);
    return NextResponse.json(
      { error: 'Failed to delete hybrid workout' },
      { status: 500 }
    );
  }
}
