/**
 * Concept2 Sync API
 *
 * POST /api/integrations/concept2/sync - Trigger result sync
 * GET /api/integrations/concept2/sync - Get sync status and results
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import {
  syncConcept2Results,
  getSyncedConcept2Results,
  getTrainingLoadFromConcept2,
} from '@/lib/integrations/concept2';
import type { Concept2EquipmentType } from '@/lib/integrations/concept2';
import { z } from 'zod';
import { logError } from '@/lib/logger-console'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'

// Valid equipment types
const equipmentTypes = [
  'rower', 'skierg', 'bike', 'dynamic', 'slides', 'multierg',
  'water', 'snow', 'rollerski', 'paddle',
] as const;

// Schema for POST request
const syncRequestSchema = z.object({
  clientId: z.string().uuid(),
  daysBack: z.number().min(1).max(365).optional().default(30),
  forceResync: z.boolean().optional().default(false),
  type: z.enum(equipmentTypes).optional(),
});

// Schema for GET request query params
const getResultsSchema = z.object({
  clientId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(equipmentTypes).optional(),
  mappedType: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  loadDays: z.coerce.number().min(1).max(90).optional(),
});

/**
 * GET - Get synced results and training load
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    // Filter out null values so Zod optional() works correctly (searchParams.get returns null, not undefined)
    const params = Object.fromEntries(
      Object.entries({
        clientId: searchParams.get('clientId'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        type: searchParams.get('type'),
        mappedType: searchParams.get('mappedType'),
        limit: searchParams.get('limit'),
        loadDays: searchParams.get('loadDays'),
      }).filter(([, v]) => v !== null)
    );

    // Validate
    const validationResult = getResultsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, startDate, endDate, type, mappedType, limit, loadDays } = validationResult.data;

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'concept2')
    if (denied) return denied

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'CONCEPT2',
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Concept2 not connected for this client' },
        { status: 404 }
      );
    }

    // Get results
    const results = await getSyncedConcept2Results(clientId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type as Concept2EquipmentType | undefined,
      mappedType,
      limit,
    });

    // Get training load if requested
    let trainingLoad = null;
    if (loadDays) {
      trainingLoad = await getTrainingLoadFromConcept2(clientId, loadDays);
    }

    return NextResponse.json({
      results,
      trainingLoad,
      syncStatus: {
        lastSyncAt: token.lastSyncAt,
        lastSyncError: token.lastSyncError,
        syncEnabled: token.syncEnabled,
      },
    });
  } catch (error) {
    logError('Get Concept2 results error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get results' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger result sync
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

    const { clientId, daysBack, forceResync, type } = validationResult.data;

    // Access control
    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Subscription gate
    const deniedSync = await requireFeatureAccess(clientId, 'concept2')
    if (deniedSync) return deniedSync

    // Check if connected
    const token = await prisma.integrationToken.findUnique({
      where: {
        clientId_type: {
          clientId,
          type: 'CONCEPT2',
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Concept2 not connected for this client' },
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
    const result = await syncConcept2Results(clientId, {
      daysBack,
      forceResync,
      type: type as Concept2EquipmentType | undefined,
    });

    return NextResponse.json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    logError('Sync Concept2 results error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to sync results' },
      { status: 500 }
    );
  }
}
