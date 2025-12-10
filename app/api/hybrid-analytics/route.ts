/**
 * Hybrid Workout Analytics API
 *
 * Fetches workout results and statistics for athletes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';

// GET /api/hybrid-analytics - Get workout analytics
// Query params: athleteId (optional for coaches), dateFrom, dateTo, workoutId
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let athleteId = searchParams.get('athleteId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const workoutId = searchParams.get('workoutId');

    // If athlete, can only see own data
    if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      });
      if (!athleteAccount) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
      }
      athleteId = athleteAccount.clientId;
    }

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required for coaches' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = { athleteId };

    if (workoutId) {
      where.workoutId = workoutId;
    }

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo);
      }
    }

    // Fetch results with workout info
    const results = await prisma.hybridWorkoutResult.findMany({
      where,
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
      orderBy: { completedAt: 'desc' },
    });

    // Calculate statistics
    const stats = calculateStats(results);

    // Get PRs
    const prs = results.filter((r) => r.isPR);

    // Get benchmark progress (same workout multiple times)
    const benchmarkProgress = calculateBenchmarkProgress(results);

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        workoutId: r.workoutId,
        workoutName: r.workout.name,
        workoutFormat: r.workout.format,
        isBenchmark: r.workout.isBenchmark,
        scoreType: r.scoreType,
        timeScore: r.timeScore,
        roundsCompleted: r.roundsCompleted,
        repsCompleted: r.repsCompleted,
        loadUsed: r.loadUsed,
        caloriesScore: r.caloriesScore,
        scalingLevel: r.scalingLevel,
        scalingNotes: r.scalingNotes,
        completedAt: r.completedAt,
        workoutDate: r.workoutDate,
        isPR: r.isPR,
        perceivedEffort: r.perceivedEffort,
        notes: r.notes,
      })),
      stats,
      prs: prs.map((r) => ({
        id: r.id,
        workoutName: r.workout.name,
        scoreType: r.scoreType,
        score: formatScore(r),
        completedAt: r.completedAt,
      })),
      benchmarkProgress,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateStats(results: any[]) {
  const total = results.length;
  const prs = results.filter((r) => r.isPR).length;
  const rxWorkouts = results.filter((r) => r.scalingLevel === 'RX').length;
  const scaledWorkouts = results.filter((r) => r.scalingLevel === 'SCALED').length;
  const foundationsWorkouts = results.filter((r) => r.scalingLevel === 'FOUNDATIONS').length;

  const effortResults = results.filter((r) => r.perceivedEffort);
  const avgEffort =
    effortResults.length > 0
      ? effortResults.reduce((sum, r) => sum + r.perceivedEffort, 0) / effortResults.length
      : null;

  // Group by week for volume tracking
  const weeklyVolume = new Map<string, number>();
  results.forEach((r) => {
    const date = new Date(r.workoutDate || r.completedAt);
    const weekKey = getWeekKey(date);
    weeklyVolume.set(weekKey, (weeklyVolume.get(weekKey) || 0) + 1);
  });

  const weeklyVolumes = Array.from(weeklyVolume.values());
  const avgWeeklyVolume =
    weeklyVolumes.length > 0
      ? weeklyVolumes.reduce((sum, v) => sum + v, 0) / weeklyVolumes.length
      : 0;

  // Recent trend (last 4 weeks vs previous 4 weeks)
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

  const recentWorkouts = results.filter(
    (r) => new Date(r.completedAt) >= fourWeeksAgo
  ).length;
  const previousWorkouts = results.filter(
    (r) =>
      new Date(r.completedAt) >= eightWeeksAgo &&
      new Date(r.completedAt) < fourWeeksAgo
  ).length;

  const trend =
    previousWorkouts > 0
      ? ((recentWorkouts - previousWorkouts) / previousWorkouts) * 100
      : recentWorkouts > 0
      ? 100
      : 0;

  return {
    totalWorkouts: total,
    totalPRs: prs,
    rxCount: rxWorkouts,
    rxPercentage: total > 0 ? Math.round((rxWorkouts / total) * 100) : 0,
    scaledCount: scaledWorkouts,
    foundationsCount: foundationsWorkouts,
    averageEffort: avgEffort ? parseFloat(avgEffort.toFixed(1)) : null,
    averageWeeklyVolume: parseFloat(avgWeeklyVolume.toFixed(1)),
    recentTrend: Math.round(trend),
    recentWorkoutsCount: recentWorkouts,
  };
}

function calculateBenchmarkProgress(results: any[]) {
  // Group by workout
  const workoutGroups = new Map<string, any[]>();

  results.forEach((r) => {
    if (!workoutGroups.has(r.workoutId)) {
      workoutGroups.set(r.workoutId, []);
    }
    workoutGroups.get(r.workoutId)!.push(r);
  });

  const progress: any[] = [];

  workoutGroups.forEach((workoutResults, workoutId) => {
    if (workoutResults.length < 2) return;

    // Sort by date
    workoutResults.sort(
      (a, b) =>
        new Date(a.workoutDate || a.completedAt).getTime() -
        new Date(b.workoutDate || b.completedAt).getTime()
    );

    const first = workoutResults[0];
    const latest = workoutResults[workoutResults.length - 1];
    const improvement = calculateImprovement(first, latest);

    progress.push({
      workoutId,
      workoutName: first.workout.name,
      isBenchmark: first.workout.isBenchmark,
      attempts: workoutResults.length,
      firstAttempt: {
        date: first.completedAt,
        score: formatScore(first),
        scalingLevel: first.scalingLevel,
      },
      latestAttempt: {
        date: latest.completedAt,
        score: formatScore(latest),
        scalingLevel: latest.scalingLevel,
      },
      improvementPercent: parseFloat(improvement.toFixed(1)),
      trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
    });
  });

  // Sort by improvement (best improvements first)
  return progress.sort((a, b) => b.improvementPercent - a.improvementPercent);
}

function formatScore(result: any): string {
  switch (result.scoreType) {
    case 'TIME':
      if (!result.timeScore) return '-';
      const mins = Math.floor(result.timeScore / 60);
      const secs = result.timeScore % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    case 'ROUNDS_REPS':
      const rounds = result.roundsCompleted || 0;
      const reps = result.repsCompleted || 0;
      return reps > 0 ? `${rounds} + ${reps}` : `${rounds} rnd`;
    case 'LOAD':
      return result.loadUsed ? `${result.loadUsed} kg` : '-';
    case 'CALORIES':
      return result.caloriesScore ? `${result.caloriesScore} cal` : '-';
    default:
      return '-';
  }
}

function calculateImprovement(first: any, latest: any): number {
  const firstScore = getNumericScore(first);
  const latestScore = getNumericScore(latest);

  if (firstScore === 0) return 0;

  // For TIME, lower is better
  if (first.scoreType === 'TIME') {
    return ((firstScore - latestScore) / firstScore) * 100;
  }

  // For other types, higher is better
  return ((latestScore - firstScore) / firstScore) * 100;
}

function getNumericScore(result: any): number {
  switch (result.scoreType) {
    case 'TIME':
      return result.timeScore || 0;
    case 'ROUNDS_REPS':
      return (result.roundsCompleted || 0) * 100 + (result.repsCompleted || 0);
    case 'LOAD':
      return result.loadUsed || 0;
    case 'CALORIES':
      return result.caloriesScore || 0;
    default:
      return 0;
  }
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}
