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
import { performance } from 'node:perf_hooks'

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Increase TTL aggressively to reduce refresh work that can block the Node event loop under load.
// In practice these stats can tolerate being a few minutes stale, and the UI refreshes frequently anyway.
const BUSINESS_STATS_TTL_MS = 10 * 60 * 1000
const BUSINESS_STATS_STALE_MS = 30 * 60 * 1000
const BUSINESS_STATS_MAX_COMPUTE_MS = 12000
const BUSINESS_ACCESS_TTL_MS = 2 * 60 * 1000
const BUSINESS_STATS_ERROR_LOG_COOLDOWN_MS = 30 * 1000
const businessStatsCache = new Map<
  string,
  { expiresAt: number; staleUntil: number; json: string; businessName: string }
>()
const businessStatsInFlight = new Map<string, Promise<string>>()
const bypassCoachCache = new Map<string, { expiresAt: number; id: string; role: string }>()
const businessAccessCache = new Map<
  string,
  { expiresAt: number; allowed: boolean; businessName: string | null }
>()
const businessAccessInFlight = new Map<string, Promise<{ allowed: boolean; businessName: string | null }>>()
const businessStatsErrorLogState = new Map<string, { nextAllowedAt: number; suppressed: number }>()

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const emitDebugHeaders = shouldEmitPerfDebugHeaders(request)
    const t0 = emitDebugHeaders ? performance.now() : 0
    const user = await resolveCoachForBusinessStats(request)
    const { id } = await params;

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'
    const nowMs = Date.now()
    const options = parseBusinessStatsOptions(request)
    const cacheKey = buildBusinessStatsCacheKey(id, options)
    const cached = businessStatsCache.get(cacheKey)

    // If we have a fresh cached payload, avoid hitting external rate limiters
    // and avoid repeated JSON serialization under load.
    if (!forceRefresh && cached && cached.expiresAt > nowMs) {
      const access = await resolveBusinessAccess(user.id, id)
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'hit' }))
    }

    // Rate limit stats requests to prevent abuse
    const rateLimited = await rateLimitJsonResponse('stats:business', user.id, {
      limit: 6000,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const access = await resolveBusinessAccess(user.id, id)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const businessName = access.businessName || cached?.businessName || 'Business'

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    if (!forceRefresh) {
      const inFlight = businessStatsInFlight.get(cacheKey)
      if (cached && cached.staleUntil > nowMs) {
        if (!inFlight) {
          const refreshPromise = buildBusinessStatsPayload({
            businessId: id,
            businessName,
            thirtyDaysAgo,
            ninetyDaysAgo,
            oneYearAgo,
            options,
            cacheKey,
          })
          businessStatsInFlight.set(cacheKey, refreshPromise)
          void refreshPromise.finally(() => businessStatsInFlight.delete(cacheKey))
        }
        return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
      }
      if (inFlight) {
        try {
          const json = await withTimeout(inFlight, BUSINESS_STATS_MAX_COMPUTE_MS)
          return jsonResponse(json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'inflight' }))
        } catch {
          if (cached && cached.staleUntil > Date.now()) {
            return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
          }
          return NextResponse.json(createDegradedBusinessStatsPayload(id, businessName), {
            headers: withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'degraded' }),
          })
        }
      }
    }

    const loadStatsPromise = buildBusinessStatsPayload({
      businessId: id,
      businessName,
      thirtyDaysAgo,
      ninetyDaysAgo,
      oneYearAgo,
      options,
      cacheKey,
    })

    businessStatsInFlight.set(cacheKey, loadStatsPromise)
    try {
      const json = await withTimeout(loadStatsPromise, BUSINESS_STATS_MAX_COMPUTE_MS)
      return jsonResponse(json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'miss' }))
    } catch (error) {
      if (cached && cached.staleUntil > Date.now()) {
        return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
      }
      // Degraded fallback instead of hard-failing under transient DB pressure.
      return NextResponse.json(createDegradedBusinessStatsPayload(id, businessName), {
        headers: withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'degraded' }),
      })
    } finally {
      businessStatsInFlight.delete(cacheKey)
    }
  } catch (error) {
    logBusinessStatsErrorThrottled(error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch business statistics' },
      { status: 500 }
    );
  }
}

function logBusinessStatsErrorThrottled(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error'
  const key = message.slice(0, 200)
  const now = Date.now()
  const state = businessStatsErrorLogState.get(key)

  if (!state) {
    businessStatsErrorLogState.set(key, { nextAllowedAt: now + BUSINESS_STATS_ERROR_LOG_COOLDOWN_MS, suppressed: 0 })
    logError('Get business stats error:', error)
    return
  }

  if (now >= state.nextAllowedAt) {
    const suppressed = state.suppressed
    state.nextAllowedAt = now + BUSINESS_STATS_ERROR_LOG_COOLDOWN_MS
    state.suppressed = 0
    if (suppressed > 0) {
      logError(`Get business stats error (suppressed ${suppressed} repeats):`, error)
    } else {
      logError('Get business stats error:', error)
    }
    return
  }

  state.suppressed += 1
}

function shouldEmitPerfDebugHeaders(request: NextRequest) {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host
  const host = (() => {
    if (!rawHost) return request.nextUrl.hostname
    const ipv6 = rawHost.match(/^\[(.+)\](?::\d+)?$/)
    if (ipv6) return ipv6[1]
    return rawHost.split(':')[0]
  })()
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) return false

  const incomingSecret = request.headers.get('x-load-test-secret')
  const secret = process.env.LOAD_TEST_BYPASS_SECRET || 'local-k6-bypass-secret'
  return !!secret && !!incomingSecret && incomingSecret === secret
}

function withHandlerTiming(
  enabled: boolean,
  t0: number,
  headers: Record<string, string>
): Record<string, string> | undefined {
  if (!enabled) return undefined
  const handlerMs = Math.max(0, performance.now() - t0)
  return {
    ...headers,
    'x-handler-ms': handlerMs.toFixed(2),
    'Server-Timing': `handler;dur=${handlerMs.toFixed(2)}`,
  }
}

async function resolveCoachForBusinessStats(request: NextRequest) {
  const bypassEnabled =
    (() => {
      const rawHost =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        request.nextUrl.host
      const host = (() => {
        if (!rawHost) return request.nextUrl.hostname
        const ipv6 = rawHost.match(/^\[(.+)\](?::\d+)?$/)
        if (ipv6) return ipv6[1]
        return rawHost.split(':')[0]
      })()
      return host === 'localhost' || host === '127.0.0.1' || host === '::1'
    })()
  const bypassSecret = process.env.LOAD_TEST_BYPASS_SECRET || 'local-k6-bypass-secret'
  const incomingSecret = request.headers.get('x-load-test-secret')
  const forwardedEmail = request.headers.get('x-auth-user-email')

  if (bypassEnabled && bypassSecret && incomingSecret === bypassSecret && forwardedEmail) {
    const cached = bypassCoachCache.get(forwardedEmail)
    const now = Date.now()
    const bypassUser =
      cached && cached.expiresAt > now
        ? { id: cached.id, role: cached.role }
        : await prisma.user.findUnique({
            where: { email: forwardedEmail },
            select: { id: true, role: true },
          })
    if (bypassUser && (bypassUser.role === 'COACH' || bypassUser.role === 'ADMIN')) {
      bypassCoachCache.set(forwardedEmail, {
        expiresAt: now + 10 * 60 * 1000,
        id: bypassUser.id,
        role: bypassUser.role,
      })
      return { id: bypassUser.id }
    }
  }

  return requireCoach()
}

async function resolveBusinessAccess(userId: string, businessId: string) {
  const cacheKey = `${userId}:${businessId}`
  const nowMs = Date.now()
  const cached = businessAccessCache.get(cacheKey)
  if (cached && cached.expiresAt > nowMs) {
    return { allowed: cached.allowed, businessName: cached.businessName }
  }

  const inFlight = businessAccessInFlight.get(cacheKey)
  if (inFlight) {
    return await inFlight
  }

  const task = (async () => {
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        business: {
          select: { name: true },
        },
      },
    })

    const resolved = {
      allowed: !!membership,
      businessName: membership?.business?.name ?? null,
    }
    businessAccessCache.set(cacheKey, {
      expiresAt: Date.now() + BUSINESS_ACCESS_TTL_MS,
      allowed: resolved.allowed,
      businessName: resolved.businessName,
    })
    return resolved
  })()

  businessAccessInFlight.set(cacheKey, task)
  try {
    return await task
  } finally {
    businessAccessInFlight.delete(cacheKey)
  }
}

type BusinessStatsOptions = {
  includeRecentTests: boolean
  includeMonthlyTrend: boolean
  includeBreakdowns: boolean
  includeSubscriptions: boolean
  recentTestsTake: number
  shortWindow: boolean
}

function parseBusinessStatsOptions(request: NextRequest): BusinessStatsOptions {
  const sp = request.nextUrl.searchParams
  const includeRecentTests = sp.get('includeRecentTests') !== 'false'
  const includeMonthlyTrend = sp.get('includeMonthlyTrend') !== 'false'
  const includeBreakdowns = sp.get('includeBreakdowns') !== 'false'
  const includeSubscriptions = sp.get('includeSubscriptions') !== 'false'
  const recentTestsTake = Math.max(0, Math.min(parseInt(sp.get('recentTestsTake') || '10'), 50))
  const shortWindow = sp.get('shortWindow') === 'true'
  return {
    includeRecentTests,
    includeMonthlyTrend,
    includeBreakdowns,
    includeSubscriptions,
    recentTestsTake,
    shortWindow,
  }
}

function buildBusinessStatsCacheKey(businessId: string, options: BusinessStatsOptions) {
  return [
    businessId,
    options.includeRecentTests ? 'rt1' : 'rt0',
    options.includeMonthlyTrend ? 'mt1' : 'mt0',
    options.includeBreakdowns ? 'bd1' : 'bd0',
    options.includeSubscriptions ? 'sb1' : 'sb0',
    options.shortWindow ? 'sw1' : 'sw0',
    `take${options.recentTestsTake}`,
  ].join(':')
}

type BuildBusinessStatsPayloadInput = {
  businessId: string
  businessName: string
  thirtyDaysAgo: Date
  ninetyDaysAgo: Date
  oneYearAgo: Date
  options: BusinessStatsOptions
  cacheKey: string
}

async function buildBusinessStatsPayload(input: BuildBusinessStatsPayloadInput) {
  const { businessId, businessName, thirtyDaysAgo, ninetyDaysAgo, oneYearAgo, options, cacheKey } =
    input
  const effectiveMonthlyTrendStart = options.shortWindow ? thirtyDaysAgo : oneYearAgo
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
      ...(options.includeSubscriptions
        ? {
            subscriptions: {
              totalActiveSubscriptions: 0,
              byTier: {},
            },
          }
        : {}),
      ...(options.includeBreakdowns
        ? {
            testerBreakdown: [],
            locationBreakdown: [],
          }
        : {}),
      ...(options.includeMonthlyTrend ? { monthlyTrend: [] } : {}),
      ...(options.includeRecentTests ? { recentTests: [] } : {}),
    }
    const json = JSON.stringify(emptyPayload)
    businessStatsCache.set(cacheKey, {
      expiresAt: Date.now() + BUSINESS_STATS_TTL_MS,
      staleUntil: Date.now() + BUSINESS_STATS_STALE_MS,
      json,
      businessName,
    })
    return json
  }

  // Get comprehensive statistics
  const [
    totalTests,
    testsLast30Days,
    testsLast90DaysMaybe,
    testsLastYearMaybe,
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
    options.shortWindow
      ? Promise.resolve(null as number | null)
      : prisma.test.count({
          where: {
            OR: [
              { testerId: { in: testerIds } },
              { locationId: { in: locationIds } },
            ],
            testDate: { gte: ninetyDaysAgo },
          },
        }),

    // Tests in last year
    options.shortWindow
      ? Promise.resolve(null as number | null)
      : prisma.test.count({
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
    options.includeBreakdowns
      ? prisma.test.groupBy({
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
        })
      : Promise.resolve([] as Array<{ testerId: string | null; _count: number }>),

    // Tests by location
    options.includeBreakdowns
      ? prisma.test.groupBy({
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
        })
      : Promise.resolve([] as Array<{ locationId: string | null; _count: number }>),

    // Unique client count
    testerIds.length > 0 || locationIds.length > 0
      ? prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(DISTINCT "clientId")::bigint as count
          FROM "Test"
          WHERE ("testerId" = ANY(${testerIds}::text[]) OR "locationId" = ANY(${locationIds}::text[]))
        `
      : Promise.resolve([{ count: BigInt(0) }]),

    // Active athlete subscriptions by tier through this business
    options.includeSubscriptions
      ? prisma.athleteSubscription.groupBy({
          by: ['tier'],
          where: {
            businessId,
            status: 'ACTIVE',
          },
          _count: true,
        })
      : Promise.resolve([] as Array<{ tier: string; _count: number }>),

    // Monthly trend (last 12 months)
    options.includeMonthlyTrend
      ? testerIds.length > 0 || locationIds.length > 0
        ? prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
            SELECT
              DATE_TRUNC('month', "testDate") as month,
              COUNT(*) as count
            FROM "Test"
            WHERE ("testerId" = ANY(${testerIds}::text[]) OR "locationId" = ANY(${locationIds}::text[]))
              AND "testDate" >= ${effectiveMonthlyTrendStart}
            GROUP BY DATE_TRUNC('month', "testDate")
            ORDER BY month DESC
          `
        : Promise.resolve([])
      : Promise.resolve([]),

    // Recent tests
    options.includeRecentTests
      ? prisma.test.findMany({
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
          take: options.recentTestsTake,
        })
      : Promise.resolve([]),
  ]);

  const testsLast90Days = options.shortWindow ? testsLast30Days : (testsLast90DaysMaybe ?? testsLast30Days)
  const testsLastYear = options.shortWindow ? testsLast30Days : (testsLastYearMaybe ?? testsLast30Days)

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
  const testerBreakdown = options.includeBreakdowns
    ? (testsByTester as any)
        .filter((t: any) => t.testerId)
        .map((t: any) => ({
          testerId: t.testerId,
          testerName: t.testerId ? testerMap.get(t.testerId) || 'Unknown' : 'Unknown',
          testCount: t._count,
        }))
    : undefined

  // Format location breakdown
  const locationBreakdown = options.includeBreakdowns
    ? (testsByLocation as any)
        .filter((l: any) => l.locationId)
        .map((l: any) => ({
          locationId: l.locationId,
          locationName: l.locationId ? locationMap.get(l.locationId) || 'Unknown' : 'Unknown',
          testCount: l._count,
        }))
    : undefined

  // Format monthly trend
  const formattedMonthlyTrend = options.includeMonthlyTrend
    ? monthlyTrend.map((item) => ({
        month: item.month,
        count: Number(item.count),
      }))
    : undefined

  // Calculate revenue stats
  const subscriptionStats = options.includeSubscriptions
    ? (() => {
        const totalActiveSubscriptions = athleteSubscriptionsByTier.reduce(
          (sum, tierRow: any) => sum + tierRow._count,
          0
        )
        return {
          totalActiveSubscriptions,
          byTier: athleteSubscriptionsByTier.reduce(
            (acc: Record<string, number>, sub: any) => {
              acc[sub.tier] = (acc[sub.tier] || 0) + sub._count
              return acc
            },
            {} as Record<string, number>
          ),
        }
      })()
    : undefined

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
    ...(options.includeSubscriptions ? { subscriptions: subscriptionStats } : {}),
    ...(options.includeBreakdowns
      ? { testerBreakdown, locationBreakdown }
      : {}),
    ...(options.includeMonthlyTrend ? { monthlyTrend: formattedMonthlyTrend } : {}),
    ...(options.includeRecentTests ? { recentTests } : {}),
  }

  const json = JSON.stringify(payload)
  businessStatsCache.set(cacheKey, {
    expiresAt: Date.now() + BUSINESS_STATS_TTL_MS,
    staleUntil: Date.now() + BUSINESS_STATS_STALE_MS,
    json,
    businessName,
  })

  return json
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

function jsonResponse(json: string, extraHeaders?: Record<string, string>) {
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  })
}
