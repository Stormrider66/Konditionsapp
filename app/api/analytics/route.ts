// app/api/analytics/route.ts
// Analytics API for coach dashboard

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCoach } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30'; // days
    const days = parseInt(range, 10);

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Parallel fetch all analytics data
    const [
      // Client/athlete stats
      totalClients,
      newClientsThisPeriod,

      // Test stats
      totalTests,
      testsThisPeriod,

      // Program stats
      totalPrograms,
      activeProgramsCount,
      programsThisPeriod,

      // Workout activity
      workoutLogsThisPeriod,

      // Daily activity breakdown (for charts)
      dailyWorkoutLogs,

      // Subscription info
      subscription,

      // Referral stats
      referralStats,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({
        where: { userId: user.id },
      }),

      // New clients in period
      prisma.client.count({
        where: {
          userId: user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Total tests
      prisma.test.count({
        where: {
          client: { userId: user.id },
        },
      }),

      // Tests in period
      prisma.test.count({
        where: {
          client: { userId: user.id },
          date: { gte: startDate, lte: endDate },
        },
      }),

      // Total programs
      prisma.trainingProgram.count({
        where: { coachId: user.id },
      }),

      // Active programs
      prisma.trainingProgram.count({
        where: {
          coachId: user.id,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),

      // Programs created in period
      prisma.trainingProgram.count({
        where: {
          coachId: user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Workout logs in period
      prisma.workoutLog.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          workout: {
            day: {
              week: {
                program: { coachId: user.id },
              },
            },
          },
        },
        select: {
          id: true,
          completed: true,
          perceivedEffort: true,
          completedAt: true,
          coachFeedback: true,
        },
      }),

      // Daily workout logs for chart (group by day)
      prisma.workoutLog.groupBy({
        by: ['completedAt'],
        where: {
          completedAt: { gte: startDate, lte: endDate },
          completed: true,
          workout: {
            day: {
              week: {
                program: { coachId: user.id },
              },
            },
          },
        },
        _count: { id: true },
      }),

      // Subscription
      prisma.subscription.findUnique({
        where: { userId: user.id },
        select: {
          tier: true,
          status: true,
          maxAthletes: true,
          stripeCurrentPeriodEnd: true,
        },
      }),

      // Referral stats
      prisma.referralCode.findUnique({
        where: { userId: user.id },
        include: {
          referrals: {
            select: {
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              referrals: true,
            },
          },
        },
      }),
    ]);

    // Process workout logs stats
    const completedWorkouts = workoutLogsThisPeriod.filter(l => l.completed).length;
    const feedbackGiven = workoutLogsThisPeriod.filter(l => l.coachFeedback).length;
    const avgRPE = workoutLogsThisPeriod.filter(l => l.perceivedEffort).length > 0
      ? workoutLogsThisPeriod
          .filter(l => l.perceivedEffort)
          .reduce((sum, l) => sum + (l.perceivedEffort || 0), 0) /
        workoutLogsThisPeriod.filter(l => l.perceivedEffort).length
      : null;

    // Process daily activity for charts (aggregate by date)
    const activityByDay: Record<string, number> = {};

    // Initialize all days in range with 0
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
      activityByDay[date] = 0;
    }

    // Fill in actual counts
    workoutLogsThisPeriod
      .filter(l => l.completedAt)
      .forEach(log => {
        const date = format(new Date(log.completedAt!), 'yyyy-MM-dd');
        activityByDay[date] = (activityByDay[date] || 0) + 1;
      });

    const activityChart = Object.entries(activityByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Process referral stats
    const referralData = referralStats ? {
      totalReferrals: referralStats._count.referrals,
      completedReferrals: referralStats.referrals.filter(r => r.status === 'COMPLETED').length,
      pendingReferrals: referralStats.referrals.filter(r => r.status === 'PENDING').length,
    } : {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },

        // Overview stats
        overview: {
          totalClients,
          newClientsThisPeriod,
          totalTests,
          testsThisPeriod,
          totalPrograms,
          activePrograms: activeProgramsCount,
          programsThisPeriod,
        },

        // Workout activity
        activity: {
          totalWorkouts: workoutLogsThisPeriod.length,
          completedWorkouts,
          feedbackGiven,
          feedbackRate: completedWorkouts > 0
            ? Math.round((feedbackGiven / completedWorkouts) * 100)
            : 0,
          averageRPE: avgRPE ? Number(avgRPE.toFixed(1)) : null,
        },

        // Chart data
        charts: {
          dailyActivity: activityChart,
        },

        // Subscription info
        subscription: subscription ? {
          tier: subscription.tier,
          status: subscription.status,
          maxAthletes: subscription.maxAthletes,
          currentPeriodEnd: subscription.stripeCurrentPeriodEnd?.toISOString() || null,
          athleteUsage: {
            used: totalClients,
            max: subscription.maxAthletes,
            percentage: subscription.maxAthletes > 0
              ? Math.round((totalClients / subscription.maxAthletes) * 100)
              : 0,
          },
        } : null,

        // Referral stats
        referrals: referralData,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
