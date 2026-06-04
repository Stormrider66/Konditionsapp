/**
 * VBT Progression API
 *
 * GET /api/athlete/vbt/progression - Get VBT-enhanced progression data
 * POST /api/athlete/vbt/progression - Update progression after VBT session upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  getVBTProgressionData,
  getVBTProgressionSummary,
  updateProgressionWithVBT,
  compare1RMEstimates,
} from '@/lib/training-engine/progression/vbt-integration';

export const dynamic = 'force-dynamic';

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

/**
 * GET - Retrieve VBT progression data
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language);

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const exerciseId = searchParams.get('exerciseId');
    const type = searchParams.get('type') || 'summary'; // 'summary' | 'exercise' | 'compare'

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId is required', 'clientId krävs') },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 });
    }

    // Handle different request types
    if (type === 'exercise' && exerciseId) {
      // Get exercise name
      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { name: true },
      });

      const progressionData = await getVBTProgressionData(
        clientId,
        exerciseId,
        exercise?.name || ''
      );

      return NextResponse.json({
        success: true,
        data: progressionData,
      });
    }

    if (type === 'compare' && exerciseId) {
      const comparison = await compare1RMEstimates(clientId, exerciseId);

      return NextResponse.json({
        success: true,
        data: comparison,
      });
    }

    // Default: return summary
    const summary = await getVBTProgressionSummary(clientId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logError('[VBT Progression] Error:', error);
    return NextResponse.json(
      { error: t(locale, 'Failed to get VBT progression data', 'Kunde inte hämta VBT-progressionsdata') },
      { status: 500 }
    );
  }
}

/**
 * POST - Update progression after VBT session
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }
    locale = resolveRequestLocale(request, user.language);

    const body = await request.json();
    const { clientId, sessionId } = body;

    if (!clientId || !sessionId) {
      return NextResponse.json(
        { error: t(locale, 'clientId and sessionId are required', 'clientId och sessionId krävs') },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessClient(user.id, clientId);
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 });
    }

    // Verify session exists and belongs to client
    const session = await prisma.vBTSession.findUnique({
      where: { id: sessionId },
      select: { clientId: true },
    });

    if (!session || session.clientId !== clientId) {
      return NextResponse.json(
        { error: t(locale, 'Session not found or does not belong to client', 'Passet hittades inte eller tillhör inte klienten') },
        { status: 404 }
      );
    }

    // Update progression tracking with VBT data
    await updateProgressionWithVBT(clientId, sessionId);

    return NextResponse.json({
      success: true,
      message: t(locale, 'Progression updated with VBT data', 'Progressionen uppdaterades med VBT-data'),
    });
  } catch (error) {
    logError('[VBT Progression] Error:', error);
    return NextResponse.json(
      { error: t(locale, 'Failed to update progression', 'Kunde inte uppdatera progressionen') },
      { status: 500 }
    );
  }
}
