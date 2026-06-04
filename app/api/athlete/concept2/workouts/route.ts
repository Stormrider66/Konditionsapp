/**
 * Athlete Concept2 Workouts API
 *
 * GET - List synced Concept2 workouts for athlete
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAthleteClientId } from '@/lib/auth-utils';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const resolved = await resolveAthleteClientId();
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, resolved.user.language);
    const { clientId } = resolved;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
      { error: t(locale, 'Failed to fetch workouts', 'Kunde inte hämta pass') },
      { status: 500 }
    );
  }
}
