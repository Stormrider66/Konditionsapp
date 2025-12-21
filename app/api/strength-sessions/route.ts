/**
 * Strength Sessions API
 *
 * GET  - List coach's strength sessions with filtering
 * POST - Create new strength session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { StrengthPhase } from '@prisma/client';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase') as StrengthPhase | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      OR: [
        { coachId: user.id },
        { isPublic: true },
      ],
    };

    if (phase) {
      where.phase = phase;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.strengthSession.findMany({
        where,
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.strengthSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching strength sessions', {}, error);
    return NextResponse.json(
      { error: 'Failed to fetch strength sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();
    const body = await request.json();

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

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Calculate totals from exercises
    const exerciseList = exercises || [];
    const totalExercises = exerciseList.length;
    const totalSets = exerciseList.reduce((sum: number, e: { sets?: number }) => sum + (e.sets || 0), 0);
    const volumeLoad = exerciseList.reduce(
      (sum: number, e: { sets?: number; reps?: number; weight?: number }) =>
        sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 0),
      0
    );

    const session = await prisma.strengthSession.create({
      data: {
        name,
        description,
        phase: phase || 'ANATOMICAL_ADAPTATION',
        timingRelativeToRun,
        estimatedDuration,
        exercises: exercises || [],
        totalSets,
        totalExercises,
        volumeLoad: volumeLoad > 0 ? volumeLoad : null,
        coachId: user.id,
        isPublic: isPublic || false,
        tags: tags || [],
      },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    logger.error('Error creating strength session', {}, error);
    return NextResponse.json(
      { error: 'Failed to create strength session' },
      { status: 500 }
    );
  }
}
