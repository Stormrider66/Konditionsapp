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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    const session = await prisma.strengthSession.findFirst({
      where: {
        id,
        OR: [
          { coachId: user.id },
          { isPublic: true },
        ],
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
    console.error('Error fetching strength session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strength session' },
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
    const existing = await prisma.strengthSession.findFirst({
      where: {
        id,
        coachId: user.id,
      },
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
      tags,
      isPublic,
    } = body;

    // Calculate totals from exercises
    const exerciseList = exercises || [];
    const totalExercises = exerciseList.length;
    const totalSets = exerciseList.reduce((sum: number, e: { sets?: number }) => sum + (e.sets || 0), 0);
    const volumeLoad = exerciseList.reduce(
      (sum: number, e: { sets?: number; reps?: number; weight?: number }) =>
        sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 0),
      0
    );

    const session = await prisma.strengthSession.update({
      where: { id },
      data: {
        name,
        description,
        phase,
        timingRelativeToRun,
        estimatedDuration,
        exercises: exercises || [],
        totalSets,
        totalExercises,
        volumeLoad: volumeLoad > 0 ? volumeLoad : null,
        isPublic,
        tags: tags || [],
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating strength session:', error);
    return NextResponse.json(
      { error: 'Failed to update strength session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Check ownership
    const existing = await prisma.strengthSession.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Session not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    await prisma.strengthSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strength session:', error);
    return NextResponse.json(
      { error: 'Failed to delete strength session' },
      { status: 500 }
    );
  }
}
