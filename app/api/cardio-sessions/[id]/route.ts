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

    // Calculate totals from segments
    const segmentList = segments || [];
    const totalDuration = segmentList.reduce(
      (sum: number, s: { duration?: number }) => sum + (s.duration || 0),
      0
    );
    const totalDistance = segmentList.reduce(
      (sum: number, s: { distance?: number }) => sum + (s.distance || 0),
      0
    );

    // Calculate average zone
    let avgZone: number | null = null;
    const zonesWithDuration = segmentList.filter(
      (s: { zone?: number; duration?: number }) => s.zone && s.duration
    );
    if (zonesWithDuration.length > 0) {
      const totalZoneDuration = zonesWithDuration.reduce(
        (sum: number, s: { duration?: number }) => sum + (s.duration || 0),
        0
      );
      const weightedZoneSum = zonesWithDuration.reduce(
        (sum: number, s: { zone?: number; duration?: number }) =>
          sum + (s.zone || 0) * (s.duration || 0),
        0
      );
      avgZone = totalZoneDuration > 0 ? weightedZoneSum / totalZoneDuration : null;
    }

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
