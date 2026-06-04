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
  getGarminReadinessData,
  getGarminTrainingLoad,
} from '@/lib/integrations/garmin/sync';
import { requestFullBackfill } from '@/lib/integrations/garmin/client';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

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
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language)

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
        { error: t(locale, 'Invalid parameters', 'Ogiltiga parametrar'), details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, date, loadDays } = validationResult.data;

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
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
        { error: t(locale, 'Garmin not connected for this client', 'Garmin är inte anslutet för den här klienten') },
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get Garmin data', 'Kunde inte hämta Garmin-data') },
      { status: 500 }
    );
  }
}

/**
 * POST - Request a Garmin backfill (replaces pull-based sync).
 *
 * Garmin requires that partners use the push model (webhooks) and the
 * Backfill API for historical data. Direct pull requests are prohibited.
 * Data will arrive asynchronously via webhook push notifications.
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language)
    const body = await request.json();

    // Validate input
    const validationResult = syncRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig indata'), details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, daysBack, includeDailies, includeActivities, includeSleep, includeHRV } =
      validationResult.data;

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    // Check subscription for Garmin sync access
    const access = await checkAthleteFeatureAccess(clientId, 'garmin');
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.reason || t(locale, 'Garmin sync requires a Standard or Pro subscription', 'Garmin-synk kräver en Standard- eller Pro-prenumeration'),
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
        { error: t(locale, 'Garmin not connected for this client', 'Garmin är inte anslutet för den här klienten') },
        { status: 404 }
      );
    }

    if (!token.syncEnabled) {
      return NextResponse.json(
        { error: t(locale, 'Sync is disabled for this client', 'Synk är inaktiverad för den här klienten') },
        { status: 400 }
      );
    }

    // Request backfill — data arrives asynchronously via webhook
    const result = await requestFullBackfill(clientId, {
      daysBack,
      includeDailies,
      includeActivities,
      includeSleep,
      includeHRV,
    });

    // Update last sync timestamp
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        lastSyncAt: new Date(),
        ...(result.errors.length > 0 ? { lastSyncError: result.errors.join('; ') } : { lastSyncError: null }),
      },
    });

    return NextResponse.json({
      success: true,
      message: t(locale, 'Backfill requested. Data will arrive via webhook push notifications.', 'Backfill begärd. Data kommer via webhook-pushnotiser.'),
      requested: result.requested,
      errors: result.errors,
    });
  } catch (error) {
    logError('Sync Garmin data error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to request Garmin backfill', 'Kunde inte begära Garmin-backfill') },
      { status: 500 }
    );
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
