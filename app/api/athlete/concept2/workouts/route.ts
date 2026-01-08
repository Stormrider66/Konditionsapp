/**
 * Athlete Concept2 Workouts API
 *
 * GET - List synced Concept2 workouts for athlete
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAthlete, canAccessClient } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAthlete();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    // Verify athlete has access to this client
    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build query
    const where: Record<string, unknown> = { clientId };
    if (type && type !== 'all') {
      where.type = type;
    }

    // Fetch workouts
    const workouts = await prisma.concept2Result.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.concept2Result.count({ where });

    return NextResponse.json({
      workouts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logError('Error fetching Concept2 workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}
