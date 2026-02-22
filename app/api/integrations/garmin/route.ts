/**
 * Garmin Integration API
 *
 * GET /api/integrations/garmin - Get connection status
 * POST /api/integrations/garmin - Initiate OAuth flow
 * DELETE /api/integrations/garmin - Disconnect Garmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  isGarminConfigured,
  getGarminAuthUrl,
  hasGarminConnection,
  disconnectGarmin,
} from '@/lib/integrations/garmin/client';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'

// Schema for POST request
const initiateAuthSchema = z.object({
  clientId: z.string().uuid(),
});

/**
 * GET - Get Garmin connection status for a client
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Garmin API is configured
    if (!isGarminConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Garmin API is not configured. Contact support to enable Garmin integration.',
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
      select: {
        id: true,
        externalUserId: true,
        lastSyncAt: true,
        lastSyncError: true,
        syncEnabled: true,
        createdAt: true,
      },
    });

    if (!token) {
      return NextResponse.json({
        configured: true,
        connected: false,
        clientId,
      });
    }

    // Get latest daily metrics count
    const metricsCount = await prisma.dailyMetrics.count({
      where: { clientId },
    });

    return NextResponse.json({
      configured: true,
      connected: true,
      clientId,
      externalUserId: token.externalUserId,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
      syncEnabled: token.syncEnabled,
      connectedAt: token.createdAt,
      metricsCount,
    });
  } catch (error) {
    logError('Get Garmin status error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get Garmin status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Initiate Garmin OAuth flow
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Garmin API is configured
    if (!isGarminConfigured()) {
      return NextResponse.json(
        { error: 'Garmin API is not configured' },
        { status: 503 }
      );
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

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'garmin')
    if (denied) return denied

    // Check if already connected
    const isConnected = await hasGarminConnection(clientId);
    if (isConnected) {
      return NextResponse.json(
        { error: 'Garmin is already connected for this client' },
        { status: 400 }
      );
    }

    // Build OAuth 2.0 PKCE authorization URL
    const { authUrl } = await getGarminAuthUrl(clientId);

    return NextResponse.json({ authUrl });
  } catch (error) {
    logError('Initiate Garmin auth error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to initiate Garmin authentication' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect Garmin
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

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Disconnect from Garmin
    await disconnectGarmin(clientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Disconnect Garmin error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to disconnect Garmin' },
      { status: 500 }
    );
  }
}
