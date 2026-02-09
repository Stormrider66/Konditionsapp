/**
 * Menstrual Cycle Daily Log API
 *
 * GET /api/menstrual-cycle/daily-log?clientId=xxx&from=date&to=date - Get logs for date range
 * POST /api/menstrual-cycle/daily-log - Create or update daily log
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAthleteClientId, requireCoach, canAccessClient } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'

/**
 * Calculate phase based on cycle day
 */
function calculatePhase(cycleDay: number): string {
  if (cycleDay <= 5) return 'MENSTRUAL';
  if (cycleDay <= 13) return 'FOLLICULAR';
  if (cycleDay <= 16) return 'OVULATORY';
  return 'LUTEAL';
}

/**
 * GET: Get daily logs for a date range
 */
export async function GET(request: NextRequest) {
  try {
    let clientId: string;

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      clientId = resolved.clientId;
    } else {
      // Try as coach viewing a specific client
      const user = await requireCoach();
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('clientId') || '';

      if (!clientId) {
        return NextResponse.json({ error: 'clientId required' }, { status: 400 });
      }

      const hasAccess = await canAccessClient(user.id, clientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Default to last 30 days if no range specified
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      dateFilter.gte = new Date(fromDate);
    } else {
      dateFilter.gte = defaultFrom;
    }
    if (toDate) {
      dateFilter.lte = new Date(toDate);
    }

    const logs = await prisma.menstrualDailyLog.findMany({
      where: {
        clientId,
        date: dateFilter,
      },
      orderBy: { date: 'desc' },
      include: {
        cycle: {
          select: {
            id: true,
            cycleNumber: true,
            startDate: true,
          },
        },
      },
    });

    // Get symptom averages per phase for this client
    const phaseAverages = await getPhaseAverages(clientId);

    return NextResponse.json({
      logs,
      phaseAverages,
      period: {
        from: dateFilter.gte,
        to: dateFilter.lte || now,
      },
    });
  } catch (error) {
    logError('Daily log GET error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch daily logs' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create or update daily log
 */
export async function POST(request: NextRequest) {
  try {
    let clientId: string;

    // Try as athlete (or coach in athlete mode) first
    const resolved = await resolveAthleteClientId();
    if (resolved) {
      clientId = resolved.clientId;
    } else {
      // Try as coach managing a specific client
      const user = await requireCoach();
      const body = await request.json();
      clientId = body.clientId;

      if (!clientId) {
        return NextResponse.json({ error: 'clientId required' }, { status: 400 });
      }

      const hasAccess = await canAccessClient(user.id, clientId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      date,
      flowIntensity,
      cramps,
      bloating,
      breastTenderness,
      headache,
      fatigue,
      moodScore,
      cravings,
      perceivedEffort,
      actualVsPlanned,
      notes,
    } = body;

    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    // Find the active cycle for this date
    const activeCycle = await prisma.menstrualCycle.findFirst({
      where: {
        clientId,
        startDate: { lte: logDate },
        OR: [
          { endDate: null },
          { endDate: { gte: logDate } },
        ],
      },
      orderBy: { startDate: 'desc' },
    });

    // Calculate cycle day and phase
    let cycleDay: number | null = null;
    let phase: string | null = null;

    if (activeCycle) {
      const startDate = new Date(activeCycle.startDate);
      startDate.setHours(0, 0, 0, 0);
      cycleDay = Math.floor(
        (logDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      phase = calculatePhase(cycleDay);
    }

    // Check for existing log on this date
    const existingLog = await prisma.menstrualDailyLog.findUnique({
      where: {
        clientId_date: {
          clientId,
          date: logDate,
        },
      },
    });

    // Prepare data
    const logData = {
      flowIntensity: flowIntensity ?? null,
      cramps: cramps ?? null,
      bloating: bloating ?? null,
      breastTenderness: breastTenderness ?? null,
      headache: headache ?? null,
      fatigue: fatigue ?? null,
      moodScore: moodScore ?? null,
      cravings: cravings ?? null,
      perceivedEffort: perceivedEffort ?? null,
      actualVsPlanned: actualVsPlanned ?? null,
      notes: notes ?? null,
      cycleDay,
      phase,
      cycleId: activeCycle?.id ?? null,
    };

    let log;
    if (existingLog) {
      // Update existing log
      log = await prisma.menstrualDailyLog.update({
        where: { id: existingLog.id },
        data: logData,
      });
    } else {
      // Create new log
      log = await prisma.menstrualDailyLog.create({
        data: {
          clientId,
          date: logDate,
          ...logData,
        },
      });
    }

    // Check for AI warnings based on patterns
    const warnings = await detectPatterns(clientId, logDate);
    if (warnings.length > 0) {
      await prisma.menstrualDailyLog.update({
        where: { id: log.id },
        data: { aiWarnings: warnings },
      });
    }

    return NextResponse.json({
      success: true,
      log,
      warnings,
      cycleInfo: activeCycle
        ? {
            cycleNumber: activeCycle.cycleNumber,
            cycleDay,
            phase,
          }
        : null,
    });
  } catch (error) {
    logError('Daily log POST error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to save daily log' },
      { status: 500 }
    );
  }
}

/**
 * Get average symptom scores per phase for a client
 */
async function getPhaseAverages(clientId: string) {
  const logs = await prisma.menstrualDailyLog.findMany({
    where: {
      clientId,
      phase: { not: null },
    },
    select: {
      phase: true,
      fatigue: true,
      moodScore: true,
      cramps: true,
      perceivedEffort: true,
    },
  });

  const phases = ['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL'];
  const averages: Record<string, {
    count: number;
    avgFatigue: number | null;
    avgMood: number | null;
    avgCramps: number | null;
    avgEffort: number | null;
  }> = {};

  for (const phase of phases) {
    const phaseLogs = logs.filter((l) => l.phase === phase);
    if (phaseLogs.length === 0) {
      averages[phase] = { count: 0, avgFatigue: null, avgMood: null, avgCramps: null, avgEffort: null };
      continue;
    }

    const fatigueLogs = phaseLogs.filter((l) => l.fatigue !== null);
    const moodLogs = phaseLogs.filter((l) => l.moodScore !== null);
    const crampLogs = phaseLogs.filter((l) => l.cramps !== null);
    const effortLogs = phaseLogs.filter((l) => l.perceivedEffort !== null);

    averages[phase] = {
      count: phaseLogs.length,
      avgFatigue: fatigueLogs.length > 0
        ? fatigueLogs.reduce((sum, l) => sum + (l.fatigue || 0), 0) / fatigueLogs.length
        : null,
      avgMood: moodLogs.length > 0
        ? moodLogs.reduce((sum, l) => sum + (l.moodScore || 0), 0) / moodLogs.length
        : null,
      avgCramps: crampLogs.length > 0
        ? crampLogs.reduce((sum, l) => sum + (l.cramps || 0), 0) / crampLogs.length
        : null,
      avgEffort: effortLogs.length > 0
        ? effortLogs.reduce((sum, l) => sum + (l.perceivedEffort || 0), 0) / effortLogs.length
        : null,
    };
  }

  return averages;
}

/**
 * Detect concerning patterns in recent logs
 */
async function detectPatterns(clientId: string, currentDate: Date): Promise<string[]> {
  const warnings: string[] = [];

  // Get last 7 days of logs
  const weekAgo = new Date(currentDate);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentLogs = await prisma.menstrualDailyLog.findMany({
    where: {
      clientId,
      date: { gte: weekAgo, lte: currentDate },
    },
    orderBy: { date: 'asc' },
  });

  if (recentLogs.length < 3) return warnings;

  // Check for consistently high fatigue
  const highFatigueDays = recentLogs.filter((l) => (l.fatigue || 0) >= 4).length;
  if (highFatigueDays >= 3) {
    warnings.push('Hög trötthet de senaste dagarna - överväg extra vila');
  }

  // Check for severe cramps
  const severeCrampsDays = recentLogs.filter((l) => (l.cramps || 0) >= 4).length;
  if (severeCrampsDays >= 2) {
    warnings.push('Intensiva kramper - överväg att kontakta vårdgivare om besvären fortsätter');
  }

  // Check for consistently low mood
  const lowMoodDays = recentLogs.filter((l) => (l.moodScore || 5) <= 2).length;
  if (lowMoodDays >= 3) {
    warnings.push('Lågt humör under flera dagar - prioritera återhämtning och sök stöd vid behov');
  }

  // Check for high perceived effort vs actual training
  const highEffortLogs = recentLogs.filter((l) => (l.perceivedEffort || 0) >= 8);
  if (highEffortLogs.length >= 3) {
    warnings.push('Hög upplevd ansträngning - överväg att minska träningsbelastningen');
  }

  return warnings;
}
