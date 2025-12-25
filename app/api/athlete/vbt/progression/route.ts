/**
 * VBT Progression API
 *
 * GET /api/athlete/vbt/progression - Get VBT-enhanced progression data
 * POST /api/athlete/vbt/progression - Update progression after VBT session upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  getVBTProgressionData,
  getVBTProgressionSummary,
  updateProgressionWithVBT,
  compare1RMEstimates,
} from '@/lib/training-engine/progression/vbt-integration';

export const dynamic = 'force-dynamic';

/**
 * GET - Retrieve VBT progression data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const exerciseId = searchParams.get('exerciseId');
    const type = searchParams.get('type') || 'summary'; // 'summary' | 'exercise' | 'compare'

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Verify access to client
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

    // Handle different request types
    if (type === 'exercise' && exerciseId) {
      // Get exercise name
      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { name: true },
      });

      const progressionData = await getVBTProgressionData(
        clientId,
        exerciseId,
        exercise?.name || ''
      );

      return NextResponse.json({
        success: true,
        data: progressionData,
      });
    }

    if (type === 'compare' && exerciseId) {
      const comparison = await compare1RMEstimates(clientId, exerciseId);

      return NextResponse.json({
        success: true,
        data: comparison,
      });
    }

    // Default: return summary
    const summary = await getVBTProgressionSummary(clientId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[VBT Progression] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get VBT progression data' },
      { status: 500 }
    );
  }
}

/**
 * POST - Update progression after VBT session
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, sessionId } = body;

    if (!clientId || !sessionId) {
      return NextResponse.json(
        { error: 'clientId and sessionId are required' },
        { status: 400 }
      );
    }

    // Verify access to client
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

    // Verify session exists and belongs to client
    const session = await prisma.vBTSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true },
    });

    if (!session || session.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Session not found or does not belong to client' },
        { status: 404 }
      );
    }

    // Update progression tracking with VBT data
    await updateProgressionWithVBT(clientId, sessionId);

    return NextResponse.json({
      success: true,
      message: 'Progression updated with VBT data',
    });
  } catch (error) {
    console.error('[VBT Progression] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update progression' },
      { status: 500 }
    );
  }
}
