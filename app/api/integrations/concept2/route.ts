/**
 * Concept2 Integration API
 *
 * GET /api/integrations/concept2 - Get connection status
 * POST /api/integrations/concept2 - Initiate OAuth flow
 * DELETE /api/integrations/concept2 - Disconnect (keeps results)
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  getConcept2AuthUrl,
  hasConcept2Connection,
  disconnectConcept2,
} from '@/lib/integrations/concept2';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'

// Schema for POST request
const initiateAuthSchema = z.object({
  clientId: z.string().uuid(),
  businessSlug: z.string().optional(),
});

/**
 * GET - Get Concept2 connection status for a client
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
          type: 'CONCEPT2',
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

    // Get result counts
    const resultCount = await prisma.concept2Result.count({
      where: { clientId },
    });

    // Get counts by equipment type
    const resultsByType = await prisma.concept2Result.groupBy({
      by: ['type'],
      where: { clientId },
      _count: { id: true },
    });

    const typeBreakdown: Record<string, number> = {};
    for (const item of resultsByType) {
      typeBreakdown[item.type] = item._count.id;
    }

    // Get latest result
    const latestResult = await prisma.concept2Result.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        type: true,
        date: true,
        distance: true,
        time: true,
        pace: true,
      },
    });

    return NextResponse.json({
      connected: true,
      clientId,
      userId: token.externalUserId,
      scope: token.scope,
      lastSyncAt: token.lastSyncAt,
      lastSyncError: token.lastSyncError,
      syncEnabled: token.syncEnabled,
      connectedAt: token.createdAt,
      resultCount,
      resultsByType: typeBreakdown,
      latestResult,
    });
  } catch (error) {
    logError('Get Concept2 status error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get Concept2 status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Initiate Concept2 OAuth flow
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

    const { clientId, businessSlug } = validationResult.data;

    // Access control (also verifies client existence for this user)
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'concept2')
    if (denied) return denied

    // Check if already connected
    const isConnected = await hasConcept2Connection(clientId);
    if (isConnected) {
      return NextResponse.json(
        { error: 'Concept2 is already connected for this client' },
        { status: 400 }
      );
    }

    // Generate auth URL with client ID as state, encoding businessSlug
    const origin = request.nextUrl.origin;
    const state = businessSlug ? `${clientId}:${businessSlug}` : clientId;
    const authUrl = getConcept2AuthUrl(clientId, { state, origin });

    return NextResponse.json({ authUrl });
  } catch (error) {
    logError('Initiate Concept2 auth error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to initiate Concept2 authentication' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect Concept2 (keeps historical results)
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

    // Disconnect from Concept2 (token only - keeps results)
    await disconnectConcept2(clientId);

    // Note: We intentionally do NOT delete concept2Results here
    // Historical data is preserved per user requirement

    return NextResponse.json({
      success: true,
      message: 'Concept2 disconnected. Historical results have been preserved.',
    });
  } catch (error) {
    logError('Disconnect Concept2 error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to disconnect Concept2' },
      { status: 500 }
    );
  }
}
