/**
 * Business Statistics API
 *
 * GET /api/business/[id]/stats - Get comprehensive statistics for a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Check if user has access to this business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId: id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const business = await prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Get tester and location IDs for this business
    const [testers, locations] = await Promise.all([
      prisma.tester.findMany({
        where: { businessId: id },
        select: { id: true },
      }),
      prisma.location.findMany({
        where: { businessId: id },
        select: { id: true },
      }),
    ]);

    const testerIds = testers.map((t) => t.id);
    const locationIds = locations.map((l) => l.id);

    // Get comprehensive statistics
    const [
      totalTests,
      testsLast30Days,
      testsLast90Days,
      testsLastYear,
      testsByType,
      testsByTester,
      testsByLocation,
      uniqueClients,
      athleteSubscriptions,
      monthlyTrend,
      recentTests,
    ] = await Promise.all([
      // Total tests from this business
      prisma.test.count({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
        },
      }),

      // Tests in last 30 days
      prisma.test.count({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
          testDate: { gte: thirtyDaysAgo },
        },
      }),

      // Tests in last 90 days
      prisma.test.count({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
          testDate: { gte: ninetyDaysAgo },
        },
      }),

      // Tests in last year
      prisma.test.count({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
          testDate: { gte: oneYearAgo },
        },
      }),

      // Tests by type
      prisma.test.groupBy({
        by: ['testType'],
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
        },
        _count: true,
      }),

      // Tests by tester
      prisma.test.groupBy({
        by: ['testerId'],
        where: {
          testerId: { in: testerIds },
        },
        _count: true,
        orderBy: {
          _count: {
            testerId: 'desc',
          },
        },
      }),

      // Tests by location
      prisma.test.groupBy({
        by: ['locationId'],
        where: {
          locationId: { in: locationIds },
        },
        _count: true,
        orderBy: {
          _count: {
            locationId: 'desc',
          },
        },
      }),

      // Unique clients
      prisma.test.findMany({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
        },
        select: { clientId: true },
        distinct: ['clientId'],
      }),

      // Active athlete subscriptions through this business
      prisma.athleteSubscription.findMany({
        where: {
          businessId: id,
          status: 'ACTIVE',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Monthly trend (last 12 months)
      testerIds.length > 0 || locationIds.length > 0
        ? prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
            SELECT
              DATE_TRUNC('month', "testDate") as month,
              COUNT(*) as count
            FROM "Test"
            WHERE ("testerId" = ANY(${testerIds}::text[]) OR "locationId" = ANY(${locationIds}::text[]))
              AND "testDate" >= ${oneYearAgo}
            GROUP BY DATE_TRUNC('month', "testDate")
            ORDER BY month DESC
          `
        : Promise.resolve([]),

      // Recent tests
      prisma.test.findMany({
        where: {
          OR: [
            { testerId: { in: testerIds } },
            { locationId: { in: locationIds } },
          ],
        },
        include: {
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
          testLocation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { testDate: 'desc' },
        take: 10,
      }),
    ]);

    // Get tester and location names for breakdown
    const testerData = await prisma.tester.findMany({
      where: { id: { in: testerIds } },
      select: { id: true, name: true },
    });
    const testerMap = new Map(testerData.map((t) => [t.id, t.name]));

    const locationData = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locationData.map((l) => [l.id, l.name]));

    // Format test type stats
    const testTypeStats = testsByType.reduce(
      (acc, item) => {
        acc[item.testType] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format tester breakdown
    const testerBreakdown = testsByTester
      .filter((t) => t.testerId)
      .map((t) => ({
        testerId: t.testerId,
        testerName: t.testerId ? testerMap.get(t.testerId) || 'Unknown' : 'Unknown',
        testCount: t._count,
      }));

    // Format location breakdown
    const locationBreakdown = testsByLocation
      .filter((l) => l.locationId)
      .map((l) => ({
        locationId: l.locationId,
        locationName: l.locationId ? locationMap.get(l.locationId) || 'Unknown' : 'Unknown',
        testCount: l._count,
      }));

    // Format monthly trend
    const formattedMonthlyTrend = monthlyTrend.map((item) => ({
      month: item.month,
      count: Number(item.count),
    }));

    // Calculate revenue stats
    const subscriptionStats = {
      totalActiveSubscriptions: athleteSubscriptions.length,
      byTier: athleteSubscriptions.reduce(
        (acc, sub) => {
          acc[sub.tier] = (acc[sub.tier] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      businessId: id,
      businessName: business.name,
      statistics: {
        totalTests,
        testsLast30Days,
        testsLast90Days,
        testsLastYear,
        uniqueClientsCount: uniqueClients.length,
        activeTesterCount: testers.length,
        activeLocationCount: locations.length,
        testsByType: testTypeStats,
      },
      subscriptions: subscriptionStats,
      testerBreakdown,
      locationBreakdown,
      monthlyTrend: formattedMonthlyTrend,
      recentTests,
    });
  } catch (error) {
    logError('Get business stats error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch business statistics' },
      { status: 500 }
    );
  }
}
