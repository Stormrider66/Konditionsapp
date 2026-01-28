/**
 * Location Statistics API
 *
 * GET /api/locations/[id]/stats - Get detailed statistics for a location
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
    const rateLimited = await rateLimitJsonResponse('stats:location', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    });

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Verify access
    if (!businessMember || location.businessId !== businessMember.businessId) {
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
      uniqueTesters,
      recentTests,
      monthlyTrend,
      testerBreakdown,
    ] = await Promise.all([
      // Total tests
      prisma.test.count({
        where: { locationId: id },
      }),

      // Tests in last 30 days
      prisma.test.count({
        where: {
          locationId: id,
          testDate: { gte: thirtyDaysAgo },
        },
      }),

      // Tests in last 90 days
      prisma.test.count({
        where: {
          locationId: id,
          testDate: { gte: ninetyDaysAgo },
        },
      }),

      // Tests in last year
      prisma.test.count({
        where: {
          locationId: id,
          testDate: { gte: oneYearAgo },
        },
      }),

      // Tests by type
      prisma.test.groupBy({
        by: ['testType'],
        where: { locationId: id },
        _count: true,
      }),

      // Unique clients tested
      prisma.test.findMany({
        where: { locationId: id },
        select: { clientId: true },
        distinct: ['clientId'],
      }),

      // Unique testers at location
      prisma.test.findMany({
        where: { locationId: id, testerId: { not: null } },
        select: { testerId: true },
        distinct: ['testerId'],
      }),

      // Recent tests
      prisma.test.findMany({
        where: { locationId: id },
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
          tester: {
            select: {
              id: true,
              name: true,
            },
          },
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
        WHERE "locationId" = ${id}
          AND "testDate" >= ${oneYearAgo}
        GROUP BY DATE_TRUNC('month', "testDate")
        ORDER BY month DESC
      `,

      // Tests by tester at this location
      prisma.test.groupBy({
        by: ['testerId'],
        where: {
          locationId: id,
          testerId: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            testerId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Get tester names for breakdown
    const testerIds = testerBreakdown
      .map((t) => t.testerId)
      .filter((id): id is string => id !== null);

    const testers = await prisma.tester.findMany({
      where: { id: { in: testerIds } },
      select: { id: true, name: true },
    });

    const testerMap = new Map(testers.map((t) => [t.id, t.name]));

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

    // Format tester breakdown
    const formattedTesterBreakdown = testerBreakdown.map((t) => ({
      testerId: t.testerId,
      testerName: t.testerId ? testerMap.get(t.testerId) || 'Unknown' : 'No tester',
      testCount: t._count,
    }));

    // Calculate average tests per month
    const monthsActive = formattedMonthlyTrend.length || 1;
    const avgTestsPerMonth = Math.round(testsLastYear / Math.min(monthsActive, 12));

    return NextResponse.json({
      locationId: id,
      locationName: location.name,
      city: location.city,
      statistics: {
        totalTests,
        testsLast30Days,
        testsLast90Days,
        testsLastYear,
        uniqueClientsCount: uniqueClients.length,
        uniqueTestersCount: uniqueTesters.length,
        avgTestsPerMonth,
        testsByType: testTypeStats,
      },
      recentTests,
      monthlyTrend: formattedMonthlyTrend,
      testerBreakdown: formattedTesterBreakdown,
      lastTestAt: location.lastTestAt,
    });
  } catch (error) {
    logError('Get location stats error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch location statistics' },
      { status: 500 }
    );
  }
}
