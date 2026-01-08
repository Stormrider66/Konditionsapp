/**
 * Menstrual Cycle API
 *
 * GET /api/menstrual-cycle?clientId=xxx - Get current cycle and phase
 * POST /api/menstrual-cycle - Start new cycle or update existing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAthlete, requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'

// Phase duration defaults (in days)
const PHASE_DURATIONS = {
  MENSTRUAL: { start: 1, end: 5 },
  FOLLICULAR: { start: 6, end: 13 },
  OVULATORY: { start: 14, end: 16 },
  LUTEAL: { start: 17, end: 28 },
} as const;

type Phase = keyof typeof PHASE_DURATIONS;

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
  try {
    let clientId: string;

    try {
      // Try as athlete first
      const user = await requireAthlete();
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (!athleteAccount) {
        return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
      }
      clientId = athleteAccount.clientId;
    } catch {
      // Try as coach
      const user = await requireCoach();
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') || '';

      if (!clientId) {
        return NextResponse.json({ error: 'clientId required' }, { status: 400 });
      }

      // Verify coach has access to this client
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
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
        message: 'No active cycle found. Start a new cycle to begin tracking.',
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
    const recommendations = getPhaseRecommendations(phase);

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch cycle data' },
      { status: 500 }
    );
  }
}

/**
 * POST: Start a new cycle or end current cycle
 */
export async function POST(request: NextRequest) {
  try {
    let clientId: string;
    let isCoach = false;

    try {
      const user = await requireAthlete();
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (!athleteAccount) {
        return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
      }
      clientId = athleteAccount.clientId;
    } catch {
      const user = await requireCoach();
      isCoach = true;
      const body = await request.json();
      clientId = body.clientId;

      if (!clientId) {
        return NextResponse.json({ error: 'clientId required' }, { status: 400 });
      }

      // Verify coach has access
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { action, startDate } = body;

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
        message: 'New cycle started successfully',
      });
    }

    if (action === 'end') {
      const { cycleId, endDate } = body;

      if (!cycleId) {
        return NextResponse.json({ error: 'cycleId required' }, { status: 400 });
      }

      const cycle = await prisma.menstrualCycle.findFirst({
        where: { id: cycleId, clientId },
      });

      if (!cycle) {
        return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
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
        message: 'Cycle ended successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logError('Menstrual cycle POST error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update cycle' },
      { status: 500 }
    );
  }
}

/**
 * Get phase-specific training recommendations
 */
function getPhaseRecommendations(phase: Phase) {
  const recommendations = {
    MENSTRUAL: {
      intensityModifier: 0.85,
      volumeModifier: 0.80,
      focusAreas: ['Återhämtning', 'Lätt aerob träning', 'Mobilitet', 'Yoga'],
      description: 'Menstruationsfasen - Fokusera på återhämtning och lätt rörelse. Kroppen arbetar hårt, minska belastningen.',
      tips: [
        'Lyssna på din kropp - vila vid behov',
        'Undvik höga intensiteter och tunga lyft',
        'Prioritera järn- och proteinrik kost',
        'Håll dig hydrerad',
      ],
    },
    FOLLICULAR: {
      intensityModifier: 1.0,
      volumeModifier: 1.0,
      focusAreas: ['Styrketräning', 'Höga intensiteter', 'Intervalldagar', 'Teknisk träning'],
      description: 'Follikelfasen - Energin ökar! Bra tid för intensiv träning och styrkebyggande.',
      tips: [
        'Utnyttja ökad energi för hårdare pass',
        'Bra tid för personbästa-försök',
        'Fokusera på progressiv styrketräning',
        'Öka proteinintaget för muskelbyggande',
      ],
    },
    OVULATORY: {
      intensityModifier: 1.1,
      volumeModifier: 1.05,
      focusAreas: ['Maximal intensitet', 'Tävling', 'Personbästa', 'Explosiv träning'],
      description: 'Ovulationsfasen - Toppform! Optimal tid för prestationsförsök och tävling.',
      tips: [
        'Planera tävlingar under denna fas om möjligt',
        'Ökad skaderisk i knäled - fokusera på korrekt teknik',
        'Energin är som högst - utnyttja det!',
        'Var medveten om eventuell överdrift',
      ],
    },
    LUTEAL: {
      intensityModifier: 0.90,
      volumeModifier: 0.85,
      focusAreas: ['Uthållighetsträning', 'Teknikfokus', 'Måttlig intensitet', 'Steady-state'],
      description: 'Lutealfasen - Kroppen förbereder sig. Fokusera på uthållighet och undvik extrema intensiteter.',
      tips: [
        'Förvänta dig ökad upplevd ansträngning (RPE)',
        'Kolhydrater kan hjälpa mot energidipp',
        'Undvik höga intensiteter nära menstruation',
        'Fokusera på sömnkvalitet',
      ],
    },
  };

  return recommendations[phase];
}
