// app/api/admin/stats/route.ts
// Admin API for system-wide statistics

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30';
    const days = parseInt(range, 10);

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Parallel fetch all admin stats
    const [
      // User stats
      totalUsers,
      newUsersThisPeriod,
      usersByRole,

      // Subscription stats
      subscriptionsByTier,
      subscriptionsByStatus,

      // Client/athlete stats
      totalClients,
      newClientsThisPeriod,

      // Content stats
      totalTests,
      testsThisPeriod,
      totalPrograms,
      programsThisPeriod,

      // Activity stats
      totalWorkoutLogs,
      workoutLogsThisPeriod,

      // Referral stats
      totalReferralCodes,
      totalReferrals,
      completedReferrals,

      // Daily user registrations for chart
      dailyRegistrations,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // New users in period
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),

      // Subscriptions by tier
      prisma.subscription.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),

      // Subscriptions by status
      prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Total clients
      prisma.client.count(),

      // New clients in period
      prisma.client.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Total tests
      prisma.test.count(),

      // Tests in period
      prisma.test.count({
        where: {
          testDate: { gte: startDate, lte: endDate },
        },
      }),

      // Total programs
      prisma.trainingProgram.count(),

      // Programs in period
      prisma.trainingProgram.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Total workout logs
      prisma.workoutLog.count(),

      // Workout logs in period
      prisma.workoutLog.count({
        where: {
          completedAt: { gte: startDate, lte: endDate },
        },
      }),

      // Referral codes
      prisma.referralCode.count(),

      // Total referrals
      prisma.referral.count(),

      // Completed referrals
      prisma.referral.count({
        where: { status: 'COMPLETED' },
      }),

      // Daily registrations (capped to prevent unbounded results)
      prisma.user.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 10000,
      }),
    ]);

    // Process users by role
    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Process subscriptions by tier
    const tierStats = subscriptionsByTier.reduce((acc, item) => {
      acc[item.tier] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Process subscriptions by status
    const statusStats = subscriptionsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Process daily registrations for chart
    const registrationsByDay: Record<string, number> = {};

    // Initialize all days with 0
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
      registrationsByDay[date] = 0;
    }

    // Fill in actual counts
    dailyRegistrations.forEach((user) => {
      const date = format(new Date(user.createdAt), 'yyyy-MM-dd');
      registrationsByDay[date] = (registrationsByDay[date] || 0) + 1;
    });

    const registrationsChart = Object.entries(registrationsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days,
        },

        // User statistics
        users: {
          total: totalUsers,
          newThisPeriod: newUsersThisPeriod,
          byRole: roleStats,
        },

        // Subscription statistics
        subscriptions: {
          byTier: tierStats,
          byStatus: statusStats,
        },

        // Client/athlete statistics
        clients: {
          total: totalClients,
          newThisPeriod: newClientsThisPeriod,
        },

        // Content statistics
        content: {
          totalTests,
          testsThisPeriod,
          totalPrograms,
          programsThisPeriod,
        },

        // Activity statistics
        activity: {
          totalWorkoutLogs,
          workoutLogsThisPeriod,
        },

        // Referral statistics
        referrals: {
          totalCodes: totalReferralCodes,
          totalReferrals,
          completedReferrals,
          conversionRate: totalReferrals > 0
            ? Math.round((completedReferrals / totalReferrals) * 100)
            : 0,
        },

        // Chart data
        charts: {
          dailyRegistrations: registrationsChart,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching admin stats', {}, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
