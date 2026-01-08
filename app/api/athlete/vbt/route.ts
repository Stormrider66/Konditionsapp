/**
 * VBT Sessions API
 *
 * GET /api/athlete/vbt - List VBT sessions for a client
 * DELETE /api/athlete/vbt?sessionId=xxx - Delete a VBT session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'

// Query schema for GET
const getQuerySchema = z.object({
  clientId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Query schema for DELETE
const deleteQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      clientId: searchParams.get('clientId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validationResult = getQuerySchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, limit, offset, startDate, endDate } = validationResult.data;

    // Verify access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const isCoach = client.userId === user.id;
    const isAthlete = client.athleteAccount?.userId === user.id;

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Fetch sessions
    const [sessions, total] = await Promise.all([
      prisma.vBTSession.findMany({
        where: {
          clientId,
          ...(Object.keys(dateFilter).length > 0 && { sessionDate: dateFilter }),
        },
        include: {
          _count: {
            select: { measurements: true },
          },
        },
        orderBy: { sessionDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.vBTSession.count({
        where: {
          clientId,
          ...(Object.keys(dateFilter).length > 0 && { sessionDate: dateFilter }),
        },
      }),
    ]);

    // Get exercise breakdown for each session
    const sessionsWithExercises = await Promise.all(
      sessions.map(async (session) => {
        const exercises = await prisma.vBTMeasurement.groupBy({
          by: ['exerciseName'],
          where: { sessionId: session.id },
          _count: { repNumber: true },
          _avg: { meanVelocity: true, load: true },
          _max: { setNumber: true },
        });

        return {
          id: session.id,
          sessionDate: session.sessionDate,
          deviceType: session.deviceType,
          deviceName: session.deviceName,
          fileName: session.fileName,
          totalSets: session.totalSets,
          totalReps: session.totalReps,
          exerciseCount: session.exerciseCount,
          notes: session.notes,
          sessionRPE: session.sessionRPE,
          bodyWeight: session.bodyWeight,
          createdAt: session.createdAt,
          exercises: exercises.map((e) => ({
            name: e.exerciseName,
            sets: e._max.setNumber || 0,
            reps: e._count.repNumber,
            avgVelocity: e._avg.meanVelocity
              ? Math.round(e._avg.meanVelocity * 100) / 100
              : null,
            avgLoad: e._avg.load ? Math.round(e._avg.load * 10) / 10 : null,
          })),
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithExercises,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logError('[VBT Sessions] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch VBT sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = { sessionId: searchParams.get('sessionId') };

    const validationResult = deleteQuerySchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId } = validationResult.data;

    // Fetch session with client info
    const session = await prisma.vBTSession.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          select: { userId: true, athleteAccount: { select: { userId: true } } },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify access (only coach or uploading athlete can delete)
    const isCoach = session.client.userId === user.id;
    const isAthlete = session.client.athleteAccount?.userId === user.id;
    const isUploader = session.coachId === user.id;

    if (!isCoach && !(isAthlete && !session.coachId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete session (cascades to measurements)
    await prisma.vBTSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true, deleted: sessionId });
  } catch (error) {
    logError('[VBT Delete] Error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete VBT session' },
      { status: 500 }
    );
  }
}
