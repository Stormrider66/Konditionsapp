/**
 * Business Statistics API
 *
 * GET /api/business/[id]/stats - Get comprehensive statistics for a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger-console'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'

interface RouteParams {
  params: Promise<{ id: string }>;
}

const BUSINESS_STATS_TTL_MS = 30 * 1000
const BUSINESS_STATS_STALE_MS = 5 * 60 * 1000
const BUSINESS_STATS_MAX_COMPUTE_MS = 12000
const businessStatsCache = new Map<string, { expiresAt: number; staleUntil: number; payload: unknown }>()
const businessStatsInFlight = new Map<string, Promise<unknown>>()

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Rate limit stats requests to prevent abuse
    const rateLimited = await rateLimitJsonResponse('stats:business', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Check if user has access to this business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId: id,
        isActive: true,
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

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
    const nowMs = Date.now()
    const cached = businessStatsCache.get(id)
    if (!forceRefresh) {
      if (cached && cached.expiresAt > nowMs) {
        return NextResponse.json(cached.payload)
      }

      const inFlight = businessStatsInFlight.get(id)
      if (cached && cached.staleUntil > nowMs) {
        if (!inFlight) {
          const refreshPromise = buildBusinessStatsPayload(id, business.name, thirtyDaysAgo, ninetyDaysAgo, oneYearAgo)
          businessStatsInFlight.set(id, refreshPromise)
          void refreshPromise.finally(() => businessStatsInFlight.delete(id))
        }
        return NextResponse.json(cached.payload)
      }
      if (inFlight) {
        const payload = await inFlight
        return NextResponse.json(payload)
      }
    }

    const loadStatsPromise = buildBusinessStatsPayload(id, business.name, thirtyDaysAgo, ninetyDaysAgo, oneYearAgo)

    businessStatsInFlight.set(id, loadStatsPromise)
    try {
      const payload = await withTimeout(loadStatsPromise, BUSINESS_STATS_MAX_COMPUTE_MS)
      return NextResponse.json(payload)
    } catch (error) {
      if (cached && cached.staleUntil > Date.now()) {
        return NextResponse.json(cached.payload)
      }
      // Degraded fallback instead of hard-failing under transient DB pressure.
      return NextResponse.json(createDegradedBusinessStatsPayload(id, business.name))
    } finally {
      businessStatsInFlight.delete(id)
    }
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

async function buildBusinessStatsPayload(
  businessId: string,
  businessName: string,
  thirtyDaysAgo: Date,
  ninetyDaysAgo: Date,
  oneYearAgo: Date
) {
  // Get tester and location data for this business
  const [testers, locations] = await Promise.all([
    prisma.tester.findMany({
      where: { businessId },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: { businessId },
      select: { id: true, name: true },
    }),
  ]);

  const testerIds = testers.map((t) => t.id);
  const locationIds = locations.map((l) => l.id);

  if (testerIds.length === 0 && locationIds.length === 0) {
    const emptyPayload = {
      businessId,
      businessName,
      statistics: {
        totalTests: 0,
        testsLast30Days: 0,
        testsLast90Days: 0,
        testsLastYear: 0,
        uniqueClientsCount: 0,
        activeTesterCount: 0,
        activeLocationCount: 0,
        testsByType: {},
      },
      subscriptions: {
        totalActiveSubscriptions: 0,
        byTier: {},
      },
      testerBreakdown: [],
      locationBreakdown: [],
      monthlyTrend: [],
      recentTests: [],
    }
    businessStatsCache.set(businessId, {
      expiresAt: Date.now() + BUSINESS_STATS_TTL_MS,
      staleUntil: Date.now() + BUSINESS_STATS_STALE_MS,
      payload: emptyPayload,
    })
    return emptyPayload
  }

  // Get comprehensive statistics
  const [
    totalTests,
    testsLast30Days,
    testsLast90Days,
    testsLastYear,
    testsByType,
    testsByTester,
    testsByLocation,
    uniqueClientCountResult,
    athleteSubscriptionsByTier,
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

    // Unique client count
    testerIds.length > 0 || locationIds.length > 0
      ? prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT "clientId")::bigint as count
          FROM "Test"
          WHERE ("testerId" = ANY(${testerIds}::text[]) OR "locationId" = ANY(${locationIds}::text[]))
        `
      : Promise.resolve([{ count: BigInt(0) }]),

    // Active athlete subscriptions by tier through this business
    prisma.athleteSubscription.groupBy({
      by: ['tier'],
      where: {
        businessId,
        status: 'ACTIVE',
      },
      _count: true,
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

  const testerMap = new Map(testers.map((t) => [t.id, t.name]));
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));

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
  const totalActiveSubscriptions = athleteSubscriptionsByTier.reduce(
    (sum, tierRow) => sum + tierRow._count,
    0
  )
  const subscriptionStats = {
    totalActiveSubscriptions,
    byTier: athleteSubscriptionsByTier.reduce(
      (acc, sub) => {
        acc[sub.tier] = (acc[sub.tier] || 0) + sub._count;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  const payload = {
    businessId,
    businessName,
    statistics: {
      totalTests,
      testsLast30Days,
      testsLast90Days,
      testsLastYear,
      uniqueClientsCount: Number(uniqueClientCountResult[0]?.count || 0),
      activeTesterCount: testers.length,
      activeLocationCount: locations.length,
      testsByType: testTypeStats,
    },
    subscriptions: subscriptionStats,
    testerBreakdown,
    locationBreakdown,
    monthlyTrend: formattedMonthlyTrend,
    recentTests,
  }

  businessStatsCache.set(businessId, {
    expiresAt: Date.now() + BUSINESS_STATS_TTL_MS,
    staleUntil: Date.now() + BUSINESS_STATS_STALE_MS,
    payload,
  })

  return payload
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Business stats timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

function createDegradedBusinessStatsPayload(businessId: string, businessName: string) {
  return {
    businessId,
    businessName,
    degraded: true,
    statistics: {
      totalTests: 0,
      testsLast30Days: 0,
      testsLast90Days: 0,
      testsLastYear: 0,
      uniqueClientsCount: 0,
      activeTesterCount: 0,
      activeLocationCount: 0,
      testsByType: {},
    },
    subscriptions: {
      totalActiveSubscriptions: 0,
      byTier: {},
    },
    testerBreakdown: [],
    locationBreakdown: [],
    monthlyTrend: [],
    recentTests: [],
  }
}
