/**
 * Athlete Hybrid Results API
 *
 * GET /api/athletes/[clientId]/hybrid-results - Get all results and PRs for an athlete
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { canAccessAthlete } from '@/lib/auth/athlete-access';
import { logger } from '@/lib/logger';
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale';

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

interface RouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale = resolveRequestLocale(request);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language);

    const { clientId } = await context.params;

    // Verify the client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 });
    }

    // SECURITY: Use proper authorization check that verifies coach-athlete relationship
    const accessResult = await canAccessAthlete(user.id, clientId);

    if (!accessResult.allowed) {
      logger.warn('Unauthorized athlete data access attempt', {
        userId: user.id,
        clientId,
        reason: accessResult.reason,
      });
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 });
    }

    // Fetch all results for this athlete
    const results = await prisma.hybridWorkoutResult.findMany({
      where: { athleteId: clientId },
      orderBy: { completedAt: 'desc' },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
            isBenchmark: true,
            benchmarkSource: true,
          },
        },
      },
      take: 100, // Limit to last 100 results
    });

    // Fetch PRs separately
    const prs = await prisma.hybridWorkoutResult.findMany({
      where: {
        athleteId: clientId,
        isPR: true,
      },
      orderBy: { completedAt: 'desc' },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            format: true,
            isBenchmark: true,
            benchmarkSource: true,
          },
        },
      },
    });

    // Get statistics
    const stats = {
      totalWorkouts: results.length,
      totalPRs: prs.length,
      workoutsThisWeek: results.filter((r) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(r.completedAt) > weekAgo;
      }).length,
      workoutsThisMonth: results.filter((r) => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(r.completedAt) > monthAgo;
      }).length,
    };

    return NextResponse.json({
      results,
      prs,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch athlete hybrid results', {}, error);
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch results', 'Kunde inte hämta resultat') },
      { status: 500 }
    );
  }
}
