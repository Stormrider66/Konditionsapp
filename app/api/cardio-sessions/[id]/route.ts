/**
 * Cardio Session Single API
 *
 * GET    - Get single cardio session with details
 * PUT    - Update cardio session
 * DELETE - Delete cardio session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    const session = await prisma.cardioSession.findFirst({
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
    logError('Error fetching cardio session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cardio session' },
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
    const existing = await prisma.cardioSession.findFirst({
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
      sport,
      segments,
      tags,
      isPublic,
    } = body;

    // Calculate totals from segments (handles REPEAT_GROUP)
    const segmentList = segments || [];
    let totalDuration = 0;
    let totalDistance = 0;
    let weightedZoneSum = 0;
    let totalZoneDuration = 0;

    for (const s of segmentList as Array<Record<string, unknown>>) {
      if (s.type === 'REPEAT_GROUP' && Array.isArray(s.steps)) {
        const reps = (s.repeats as number) || 1;
        const stepsDur = (s.steps as Array<Record<string, unknown>>).reduce(
          (sum: number, step) => sum + ((step.duration as number) || 0), 0
        );
        const stepsDist = (s.steps as Array<Record<string, unknown>>).reduce(
          (sum: number, step) => sum + ((step.distance as number) || 0), 0
        );
        const restBetween = ((s.restBetweenRounds as number) || 0) * Math.max(reps - 1, 0);
        totalDuration += (stepsDur * reps) + restBetween;
        totalDistance += stepsDist * reps;
        for (const step of s.steps as Array<Record<string, unknown>>) {
          if (step.zone && step.duration) {
            const dur = (step.duration as number) * reps;
            weightedZoneSum += (step.zone as number) * dur;
            totalZoneDuration += dur;
          }
        }
      } else {
        const reps = ((s.repeats as number) && (s.repeats as number) > 1) ? (s.repeats as number) : 1;
        const rest = ((s.restDuration as number) || 0) * Math.max(reps - 1, 0);
        totalDuration += ((s.duration as number) || 0) * reps + rest;
        totalDistance += ((s.distance as number) || 0) * reps;
        if (s.zone && s.duration) {
          const dur = (s.duration as number) * reps;
          weightedZoneSum += (s.zone as number) * dur;
          totalZoneDuration += dur;
        }
      }
    }
    const avgZone = totalZoneDuration > 0 ? weightedZoneSum / totalZoneDuration : null;

    const session = await prisma.cardioSession.update({
      where: { id },
      data: {
        name,
        description,
        sport,
        segments: segments || [],
        totalDuration: totalDuration > 0 ? totalDuration : null,
        totalDistance: totalDistance > 0 ? totalDistance : null,
        avgZone,
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
    logError('Error updating cardio session:', error);
    return NextResponse.json(
      { error: 'Failed to update cardio session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach();
    const { id } = await context.params;

    // Check ownership
    const existing = await prisma.cardioSession.findFirst({
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

    await prisma.cardioSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error deleting cardio session:', error);
    return NextResponse.json(
      { error: 'Failed to delete cardio session' },
      { status: 500 }
    );
  }
}
