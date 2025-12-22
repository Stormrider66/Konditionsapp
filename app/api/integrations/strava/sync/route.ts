/**
 * Strava Sync API
 *
 * POST /api/integrations/strava/sync - Trigger activity sync
 * GET /api/integrations/strava/sync - Get sync status and activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  syncStravaActivities,
  getSyncedActivities,
  getTrainingLoadFromStrava,
} from '@/lib/integrations/strava/sync';
import { z } from 'zod';

// Schema for POST request
const syncRequestSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(365).optional().default(30),
  forceResync: z.boolean().optional().default(false),
});

// Schema for GET request query params
const getActivitiesSchema = z.object({
  clientId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  loadDays: z.coerce.number().min(1).max(90).optional(),
});

/**
 * GET - Get synced activities and training load
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = {
      clientId: searchParams.get('clientId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      loadDays: searchParams.get('loadDays'),
    };

    // Validate
    const validationResult = getActivitiesSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, startDate, endDate, type, limit, loadDays } = validationResult.data;

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'STRAVA',
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Strava not connected for this client' },
        { status: 404 }
      );
    }

    // Get activities
    const activities = await getSyncedActivities(clientId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      limit,
    });

    // Get training load if requested
    let trainingLoad = null;
    if (loadDays) {
      trainingLoad = await getTrainingLoadFromStrava(clientId, loadDays);
    }

    return NextResponse.json({
      activities,
      trainingLoad,
      syncStatus: {
        lastSyncAt: token.lastSyncAt,
        lastSyncError: token.lastSyncError,
        syncEnabled: token.syncEnabled,
      },
    });
  } catch (error) {
    console.error('Get Strava activities error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get activities' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger activity sync
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    // Validate input
    const validationResult = syncRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, daysBack, forceResync } = validationResult.data;

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'STRAVA',
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Strava not connected for this client' },
        { status: 404 }
      );
    }

    if (!token.syncEnabled) {
      return NextResponse.json(
        { error: 'Sync is disabled for this client' },
        { status: 400 }
      );
    }

    // Perform sync
    const result = await syncStravaActivities(clientId, {
      daysBack,
      forceResync,
    });

    // Update sync status if there were errors
    if (result.errors.length > 0) {
      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          lastSyncError: result.errors.join('; '),
        },
      });
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sync Strava activities error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to sync activities' },
      { status: 500 }
    );
  }
}
