/**
 * Menstrual Cycle API
 *
 * GET /api/menstrual-cycle?clientId=xxx - Get current cycle and phase
 * POST /api/menstrual-cycle - Start new cycle or update existing
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId, requireCoach, canAccessClient } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

// Phase duration defaults (in days)
const PHASE_DURATIONS = {
  MENSTRUAL: { start: 1, end: 5 },
  FOLLICULAR: { start: 6, end: 13 },
  OVULATORY: { start: 14, end: 16 },
  LUTEAL: { start: 17, end: 28 },
} as const;

type Phase = keyof typeof PHASE_DURATIONS;

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

/**
 * Calculate current phase based on cycle day
 */
function calculatePhase(cycleDay: number): Phase {
  if (cycleDay <= PHASE_DURATIONS.MENSTRUAL.end) return 'MENSTRUAL';
  if (cycleDay <= PHASE_DURATIONS.FOLLICULAR.end) return 'FOLLICULAR';
  if (cycleDay <= PHASE_DURATIONS.OVULATORY.end) return 'OVULATORY';
  return 'LUTEAL';
}

/**
 * Calculate days until next phase
 */
function daysUntilNextPhase(cycleDay: number): number {
  const phase = calculatePhase(cycleDay);
  return PHASE_DURATIONS[phase].end - cycleDay + 1;
}

/**
 * GET: Get current cycle and phase for a client
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    let clientId: string;

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      clientId = resolved.clientId;
      locale = resolveRequestLocale(request, resolved.user.language);
    } else {
      // Try as coach viewing a specific client
      const user = await requireCoach();
      locale = resolveRequestLocale(request, user.language);
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') || '';

      if (!clientId) {
        return NextResponse.json({ error: t(locale, 'clientId required', 'clientId krävs') }, { status: 400 });
      }

      const hasAccess = await canAccessClient(user.id, clientId);
      if (!hasAccess) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 });
      }
    }

    // Get current active cycle
    const currentCycle = await prisma.menstrualCycle.findFirst({
      where: {
        clientId,
        endDate: null, // Active cycle has no end date
      },
      orderBy: { startDate: 'desc' },
      include: {
        dailyLogs: {
          orderBy: { date: 'desc' },
          take: 7, // Last 7 days of logs
        },
      },
    });

    if (!currentCycle) {
      return NextResponse.json({
        hasCycle: false,
        message: t(
          locale,
          'No active cycle found. Start a new cycle to begin tracking.',
          'Ingen aktiv cykel hittades. Starta en ny cykel för att börja spåra.'
        ),
      });
    }

    // Calculate current cycle day and phase
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(currentCycle.startDate);
    startDate.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const cycleDay = daysSinceStart + 1; // Day 1 is start date
    const phase = calculatePhase(cycleDay);

    // Get phase-specific training recommendations
    const recommendations = getPhaseRecommendations(phase, locale);

    return NextResponse.json({
      hasCycle: true,
      cycle: {
        id: currentCycle.id,
        cycleNumber: currentCycle.cycleNumber,
        startDate: currentCycle.startDate,
        cycleDay,
        phase,
        daysUntilNextPhase: daysUntilNextPhase(cycleDay),
      },
      recommendations,
      recentLogs: currentCycle.dailyLogs,
    });
  } catch (error) {
    logError('Menstrual cycle GET error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to fetch cycle data', 'Kunde inte hämta cykeldata') },
      { status: 500 }
    );
  }
}

/**
 * POST: Start a new cycle or end current cycle
 */
export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request);

  try {
    let clientId: string;
    const body = await request.json();
    const { action, startDate } = body;

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      clientId = resolved.clientId;
      locale = resolveRequestLocale(request, resolved.user.language);
    } else {
      // Try as coach managing a specific client
      const user = await requireCoach();
      locale = resolveRequestLocale(request, user.language);
      clientId = body.clientId;

      if (!clientId) {
        return NextResponse.json({ error: t(locale, 'clientId required', 'clientId krävs') }, { status: 400 });
      }

      const hasAccess = await canAccessClient(user.id, clientId);
      if (!hasAccess) {
        return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 });
      }
    }

    if (action === 'start' || !action) {
      // End any existing active cycle
      const existingCycle = await prisma.menstrualCycle.findFirst({
        where: { clientId, endDate: null },
        orderBy: { startDate: 'desc' },
      });

      const cycleStartDate = startDate ? new Date(startDate) : new Date();
      cycleStartDate.setHours(0, 0, 0, 0);

      if (existingCycle) {
        // End the previous cycle
        const previousEndDate = new Date(cycleStartDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);

        await prisma.menstrualCycle.update({
          where: { id: existingCycle.id },
          data: {
            endDate: previousEndDate,
            cycleLength: Math.floor(
              (previousEndDate.getTime() - new Date(existingCycle.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1,
          },
        });
      }

      // Count previous cycles for cycle number
      const cycleCount = await prisma.menstrualCycle.count({
        where: { clientId },
      });

      // Create new cycle
      const newCycle = await prisma.menstrualCycle.create({
        data: {
          clientId,
          cycleNumber: cycleCount + 1,
          startDate: cycleStartDate,
          currentPhase: 'MENSTRUAL',
        },
      });

      // Create first daily log (menstruation start)
      await prisma.menstrualDailyLog.create({
        data: {
          clientId,
          cycleId: newCycle.id,
          date: cycleStartDate,
          cycleDay: 1,
          phase: 'MENSTRUAL',
          flowIntensity: 3, // Default medium flow
        },
      });

      return NextResponse.json({
        success: true,
        cycle: newCycle,
        message: t(locale, 'New cycle started successfully', 'Ny cykel startades'),
      });
    }

    if (action === 'end') {
      const { cycleId, endDate } = body;

      if (!cycleId) {
        return NextResponse.json({ error: t(locale, 'cycleId required', 'cycleId krävs') }, { status: 400 });
      }

      const cycle = await prisma.menstrualCycle.findFirst({
        where: { id: cycleId, clientId },
      });

      if (!cycle) {
        return NextResponse.json({ error: t(locale, 'Cycle not found', 'Cykeln hittades inte') }, { status: 404 });
      }

      const cycleEndDate = endDate ? new Date(endDate) : new Date();
      cycleEndDate.setHours(0, 0, 0, 0);

      const updatedCycle = await prisma.menstrualCycle.update({
        where: { id: cycleId },
        data: {
          endDate: cycleEndDate,
          cycleLength: Math.floor(
            (cycleEndDate.getTime() - new Date(cycle.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1,
        },
      });

      return NextResponse.json({
        success: true,
        cycle: updatedCycle,
        message: t(locale, 'Cycle ended successfully', 'Cykeln avslutades'),
      });
    }

    return NextResponse.json({ error: t(locale, 'Invalid action', 'Ogiltig åtgärd') }, { status: 400 });
  } catch (error) {
    logError('Menstrual cycle POST error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 });
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update cycle', 'Kunde inte uppdatera cykeln') },
      { status: 500 }
    );
  }
}

/**
 * Get phase-specific training recommendations
 */
function getPhaseRecommendations(phase: Phase, locale: AppLocale) {
  const recommendations = {
    MENSTRUAL: {
      intensityModifier: 0.85,
      volumeModifier: 0.80,
      focusAreas: [
        t(locale, 'Recovery', 'Återhämtning'),
        t(locale, 'Easy aerobic training', 'Lätt aerob träning'),
        t(locale, 'Mobility', 'Mobilitet'),
        'Yoga',
      ],
      description: t(
        locale,
        'Menstrual phase - focus on recovery and easy movement. The body is working hard, so reduce load.',
        'Menstruationsfasen - Fokusera på återhämtning och lätt rörelse. Kroppen arbetar hårt, minska belastningen.'
      ),
      tips: [
        t(locale, 'Listen to your body - rest when needed', 'Lyssna på din kropp - vila vid behov'),
        t(locale, 'Avoid high intensities and heavy lifting', 'Undvik höga intensiteter och tunga lyft'),
        t(locale, 'Prioritize iron- and protein-rich foods', 'Prioritera järn- och proteinrik kost'),
        t(locale, 'Stay hydrated', 'Håll dig hydrerad'),
      ],
    },
    FOLLICULAR: {
      intensityModifier: 1.0,
      volumeModifier: 1.0,
      focusAreas: [
        t(locale, 'Strength training', 'Styrketräning'),
        t(locale, 'High intensities', 'Höga intensiteter'),
        t(locale, 'Interval days', 'Intervalldagar'),
        t(locale, 'Technical training', 'Teknisk träning'),
      ],
      description: t(
        locale,
        'Follicular phase - energy is rising. A good time for intensive training and strength building.',
        'Follikelfasen - Energin ökar! Bra tid för intensiv träning och styrkebyggande.'
      ),
      tips: [
        t(locale, 'Use the increased energy for harder sessions', 'Utnyttja ökad energi för hårdare pass'),
        t(locale, 'A good time for personal-best attempts', 'Bra tid för personbästa-försök'),
        t(locale, 'Focus on progressive strength training', 'Fokusera på progressiv styrketräning'),
        t(locale, 'Increase protein intake to support muscle building', 'Öka proteinintaget för muskelbyggande'),
      ],
    },
    OVULATORY: {
      intensityModifier: 1.1,
      volumeModifier: 1.05,
      focusAreas: [
        t(locale, 'Maximum intensity', 'Maximal intensitet'),
        t(locale, 'Competition', 'Tävling'),
        t(locale, 'Personal bests', 'Personbästa'),
        t(locale, 'Explosive training', 'Explosiv träning'),
      ],
      description: t(
        locale,
        'Ovulatory phase - peak form. An optimal time for performance attempts and competition.',
        'Ovulationsfasen - Toppform! Optimal tid för prestationsförsök och tävling.'
      ),
      tips: [
        t(locale, 'Plan competitions during this phase when possible', 'Planera tävlingar under denna fas om möjligt'),
        t(locale, 'Knee injury risk may be higher - focus on correct technique', 'Ökad skaderisk i knäled - fokusera på korrekt teknik'),
        t(locale, 'Energy is at its highest - use it', 'Energin är som högst - utnyttja det!'),
        t(locale, 'Be mindful of overreaching', 'Var medveten om eventuell överdrift'),
      ],
    },
    LUTEAL: {
      intensityModifier: 0.90,
      volumeModifier: 0.85,
      focusAreas: [
        t(locale, 'Endurance training', 'Uthållighetsträning'),
        t(locale, 'Technique focus', 'Teknikfokus'),
        t(locale, 'Moderate intensity', 'Måttlig intensitet'),
        'Steady-state',
      ],
      description: t(
        locale,
        'Luteal phase - the body is preparing. Focus on endurance and avoid extreme intensities.',
        'Lutealfasen - Kroppen förbereder sig. Fokusera på uthållighet och undvik extrema intensiteter.'
      ),
      tips: [
        t(locale, 'Expect higher perceived exertion (RPE)', 'Förvänta dig ökad upplevd ansträngning (RPE)'),
        t(locale, 'Carbohydrates can help with energy dips', 'Kolhydrater kan hjälpa mot energidipp'),
        t(locale, 'Avoid high intensities close to menstruation', 'Undvik höga intensiteter nära menstruation'),
        t(locale, 'Focus on sleep quality', 'Fokusera på sömnkvalitet'),
      ],
    },
  };

  return recommendations[phase];
}
