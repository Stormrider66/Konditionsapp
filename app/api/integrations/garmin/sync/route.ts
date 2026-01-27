/**
 * Garmin Sync API
 *
 * POST /api/integrations/garmin/sync - Trigger data sync
 * GET /api/integrations/garmin/sync - Get readiness and training load data
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  syncGarminData,
  getGarminReadinessData,
  getGarminTrainingLoad,
} from '@/lib/integrations/garmin/sync';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'

// Schema for POST request
const syncRequestSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(90).optional().default(7),
  includeDailies: z.boolean().optional().default(true),
  includeActivities: z.boolean().optional().default(true),
  includeSleep: z.boolean().optional().default(true),
  includeHRV: z.boolean().optional().default(true),
});

// Schema for GET request query params
const getDataSchema = z.object({
  clientId: z.string().uuid(),
  date: z.string().datetime().optional(),
  loadDays: z.coerce.number().min(1).max(90).optional().default(7),
});

/**
 * GET - Get readiness and training load data
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
      date: searchParams.get('date'),
      loadDays: searchParams.get('loadDays'),
    };

    // Validate
    const validationResult = getDataSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, date, loadDays } = validationResult.data;

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
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Garmin not connected for this client' },
        { status: 404 }
      );
    }

    // Get readiness data for specified date or today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const readinessData = await getGarminReadinessData(clientId, targetDate);

    // Get training load
    const trainingLoad = await getGarminTrainingLoad(clientId, loadDays);

    return NextResponse.json({
      readiness: readinessData,
      trainingLoad,
      syncStatus: {
        lastSyncAt: token.lastSyncAt,
        lastSyncError: token.lastSyncError,
        syncEnabled: token.syncEnabled,
      },
    });
  } catch (error) {
    logError('Get Garmin data error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get Garmin data' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger data sync
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

    const { clientId, daysBack, includeDailies, includeActivities, includeSleep, includeHRV } =
      validationResult.data;

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check subscription for Garmin sync access
    const access = await checkAthleteFeatureAccess(clientId, 'garmin');
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.reason || 'Garmin sync requires a Standard or Pro subscription',
          code: access.code || 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: access.upgradeUrl || '/athlete/subscription',
        },
        { status: 403 }
      );
    }

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'GARMIN',
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Garmin not connected for this client' },
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
    const result = await syncGarminData(clientId, {
      daysBack,
      includeDailies,
      includeActivities,
      includeSleep,
      includeHRV,
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
      synced: {
        dailySummaries: result.dailySummaries,
        activities: result.activities,
        sleepRecords: result.sleepRecords,
        hrvRecords: result.hrvRecords,
      },
      errors: result.errors,
    });
  } catch (error) {
    logError('Sync Garmin data error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to sync Garmin data' },
      { status: 500 }
    );
  }
}
