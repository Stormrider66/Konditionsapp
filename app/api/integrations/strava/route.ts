/**
 * Strava Integration API
 *
 * GET /api/integrations/strava - Get connection status
 * POST /api/integrations/strava - Initiate OAuth flow
 * DELETE /api/integrations/strava - Disconnect Strava
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  getStravaAuthUrl,
  hasStravaConnection,
  disconnectStrava,
} from '@/lib/integrations/strava/client';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'

// Schema for POST request
const initiateAuthSchema = z.object({
  clientId: z.string().uuid(),
});

/**
 * GET - Get Strava connection status for a client
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Access control: ensure the authenticated user can access this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'STRAVA',
        },
      },
      select: {
        id: true,
        externalUserId: true,
        scope: true,
        lastSyncAt: true,
        lastSyncError: true,
        syncEnabled: true,
        createdAt: true,
      },
    });

    if (!token) {
      return NextResponse.json({
        connected: false,
        clientId,
      });
    }

    // Get activity count
    const activityCount = await prisma.stravaActivity.count({
      where: { clientId },
    });

    // Get latest activity
    const latestActivity = await prisma.stravaActivity.findFirst({
      where: { clientId },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        startDate: true,
        distance: true,
        movingTime: true,
      },
    });

    return NextResponse.json({
      connected: true,
      clientId,
      athleteId: token.externalUserId,
      scope: token.scope,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
      syncEnabled: token.syncEnabled,
      connectedAt: token.createdAt,
      activityCount,
      latestActivity,
    });
  } catch (error) {
    logError('Get Strava status error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get Strava status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Initiate Strava OAuth flow
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    // Validate input
    const validationResult = initiateAuthSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId } = validationResult.data;

    // Access control: ensure the authenticated user can access this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if already connected
    const isConnected = await hasStravaConnection(clientId);
    if (isConnected) {
      return NextResponse.json(
        { error: 'Strava is already connected for this client' },
        { status: 400 }
      );
    }

    // Generate auth URL with client ID as state
    const authUrl = getStravaAuthUrl(clientId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    logError('Initiate Strava auth error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to initiate Strava authentication' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect Strava
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Access control: ensure the authenticated user can access this client
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Disconnect from Strava
    await disconnectStrava(clientId);

    // Delete synced activities
    await prisma.stravaActivity.deleteMany({
      where: { clientId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Disconnect Strava error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to disconnect Strava' },
      { status: 500 }
    );
  }
}
