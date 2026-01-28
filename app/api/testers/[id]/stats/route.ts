/**
 * Tester Statistics API
 *
 * GET /api/testers/[id]/stats - Get detailed statistics for a tester
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Rate limit stats requests to prevent abuse
    const rateLimited = await rateLimitJsonResponse('stats:tester', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    const tester = await prisma.tester.findUnique({
      where: { id },
    });

    if (!tester) {
      return NextResponse.json({ error: 'Tester not found' }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      (businessMember && tester.businessId === businessMember.businessId) ||
      tester.userId === user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get date ranges for statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Aggregate statistics
    const [
      totalTests,
      testsLast30Days,
      testsLast90Days,
      testsLastYear,
      testsByType,
      uniqueClients,
      recentTests,
      monthlyTrend,
    ] = await Promise.all([
      // Total tests
      prisma.test.count({
        where: { testerId: id },
      }),

      // Tests in last 30 days
      prisma.test.count({
        where: {
          testerId: id,
          testDate: { gte: thirtyDaysAgo },
        },
      }),

      // Tests in last 90 days
      prisma.test.count({
        where: {
          testerId: id,
          testDate: { gte: ninetyDaysAgo },
        },
      }),

      // Tests in last year
      prisma.test.count({
        where: {
          testerId: id,
          testDate: { gte: oneYearAgo },
        },
      }),

      // Tests by type
      prisma.test.groupBy({
        by: ['testType'],
        where: { testerId: id },
        _count: true,
      }),

      // Unique clients tested
      prisma.test.findMany({
        where: { testerId: id },
        select: { clientId: true },
        distinct: ['clientId'],
      }),

      // Recent tests
      prisma.test.findMany({
        where: { testerId: id },
        select: {
          id: true,
          testDate: true,
          testType: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          location: true,
        },
        orderBy: { testDate: 'desc' },
        take: 5,
      }),

      // Monthly trend (last 12 months)
      prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT
          DATE_TRUNC('month', "testDate") as month,
          COUNT(*) as count
        FROM "Test"
        WHERE "testerId" = ${id}
          AND "testDate" >= ${oneYearAgo}
        GROUP BY DATE_TRUNC('month', "testDate")
        ORDER BY month DESC
      `,
    ]);

    // Format test types
    const testTypeStats = testsByType.reduce(
      (acc, item) => {
        acc[item.testType] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format monthly trend
    const formattedMonthlyTrend = monthlyTrend.map((item) => ({
      month: item.month,
      count: Number(item.count),
    }));

    // Calculate average tests per month
    const monthsActive = formattedMonthlyTrend.length || 1;
    const avgTestsPerMonth = Math.round(testsLastYear / Math.min(monthsActive, 12));

    return NextResponse.json({
      testerId: id,
      testerName: tester.name,
      statistics: {
        totalTests,
        testsLast30Days,
        testsLast90Days,
        testsLastYear,
        uniqueClientsCount: uniqueClients.length,
        avgTestsPerMonth,
        testsByType: testTypeStats,
      },
      recentTests,
      monthlyTrend: formattedMonthlyTrend,
      lastTestAt: tester.lastTestAt,
    });
  } catch (error) {
    logError('Get tester stats error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch tester statistics' },
      { status: 500 }
    );
  }
}
