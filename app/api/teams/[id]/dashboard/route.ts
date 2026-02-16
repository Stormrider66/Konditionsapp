// app/api/teams/[id]/dashboard/route.ts
/**
 * Team Dashboard API
 *
 * GET - Get team dashboard data including:
 * - Team info with member count
 * - Recent workout broadcasts with completion stats
 * - Per-member completion statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { performance } from 'node:perf_hooks'

interface RouteContext {
  params: Promise<{ id: string }>
}

type TeamDashboardOptions = {
  includeMemberStats: boolean
  includeRecentBroadcasts: boolean
  days: number
}

// Increase TTL aggressively to reduce refresh work that can block the Node event loop under load.
// Dashboard data can tolerate being a few minutes stale during bursts.
const TEAM_DASHBOARD_TTL_MS = 10 * 60 * 1000
const TEAM_DASHBOARD_STALE_MS = 30 * 60 * 1000
const TEAM_DASHBOARD_MAX_COMPUTE_MS = 4000
// Auth context caching reduces repeated Supabase calls / user lookups under load.
const AUTH_CONTEXT_TTL_MS = 2 * 60 * 1000
const teamDashboardCache = new Map<
  string,
  { expiresAt: number; staleUntil: number; json: string }
>()
const teamDashboardInFlight = new Map<string, Promise<string>>()
const authEmailCache = new Map<string, { expiresAt: number; email: string }>()
const userIdByEmailCache = new Map<string, { expiresAt: number; userId: string }>()
const authEmailInFlight = new Map<string, Promise<string>>()
const userIdByEmailInFlight = new Map<string, Promise<string | null>>()

// GET /api/teams/[id]/dashboard
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const emitDebugHeaders = shouldEmitPerfDebugHeaders(request)
    const t0 = emitDebugHeaders ? performance.now() : 0
    const authResult = await resolveAuthenticatedUserId(request)
    if (!authResult.ok) {
      return authResult.response
    }
    const dbUserId = authResult.userId

    const { id: teamId } = await context.params
    const options = parseTeamDashboardOptions(request)
    const cacheKey = `${dbUserId}:${teamId}:${buildTeamDashboardCacheKey(options)}`
    const nowMs = Date.now()
    const cached = teamDashboardCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'hit' }))
    }
    const inFlight = teamDashboardInFlight.get(cacheKey)
    if (cached && cached.staleUntil > nowMs) {
      if (!inFlight) {
        // Refresh in background and serve stale immediately.
        const refreshPromise = buildTeamDashboardPayload(dbUserId, teamId, options)
        teamDashboardInFlight.set(cacheKey, refreshPromise)
        void refreshPromise.finally(() => teamDashboardInFlight.delete(cacheKey))
      }
      return jsonResponse(cached.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
    }
    if (inFlight) {
      try {
        const json = await withTimeout(inFlight, TEAM_DASHBOARD_MAX_COMPUTE_MS)
        return jsonResponse(json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'inflight' }))
      } catch (error) {
        // If we have anything stale, serve it rather than piling up timeouts.
        const fallback = teamDashboardCache.get(cacheKey)
        if (fallback && fallback.staleUntil > Date.now()) {
          return jsonResponse(fallback.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
        }
        // Degraded fallback (still enforces authorization via a cheap team lookup).
        return NextResponse.json(await buildDegradedTeamDashboardPayload(dbUserId, teamId, options), {
          headers: withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'degraded' }),
        })
      }
    }

    const loadPromise = buildTeamDashboardPayload(dbUserId, teamId, options)

    teamDashboardInFlight.set(cacheKey, loadPromise)
    try {
      const json = await withTimeout(loadPromise, TEAM_DASHBOARD_MAX_COMPUTE_MS)
      return jsonResponse(json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'miss' }))
    } catch (error) {
      const fallback = teamDashboardCache.get(cacheKey)
      if (fallback && fallback.staleUntil > Date.now()) {
        return jsonResponse(fallback.json, withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' }))
      }
      return NextResponse.json(await buildDegradedTeamDashboardPayload(dbUserId, teamId, options), {
        headers: withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'degraded' }),
      })
    } finally {
      teamDashboardInFlight.delete(cacheKey)
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'TEAM_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Team not found or unauthorized' },
        { status: 404 }
      )
    }
    logger.error('Error fetching team dashboard', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team dashboard' },
      { status: 500 }
    )
  }
}

function shouldEmitPerfDebugHeaders(request: NextRequest) {
  const host = request.nextUrl.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) return false

  const incomingSecret = request.headers.get('x-load-test-secret')
  const secret = process.env.LOAD_TEST_BYPASS_SECRET
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

function parseTeamDashboardOptions(request: NextRequest): TeamDashboardOptions {
  const sp = request.nextUrl.searchParams
  const includeMemberStats = sp.get('includeMemberStats') !== 'false'
  const includeRecentBroadcasts = sp.get('includeRecentBroadcasts') !== 'false'
  const days = Math.max(1, Math.min(parseInt(sp.get('days') || '30', 10) || 30, 90))
  return { includeMemberStats, includeRecentBroadcasts, days }
}

function buildTeamDashboardCacheKey(options: TeamDashboardOptions) {
  return [
    options.includeMemberStats ? 'ms1' : 'ms0',
    options.includeRecentBroadcasts ? 'rb1' : 'rb0',
    `d${options.days}`,
  ].join(':')
}

async function buildTeamDashboardPayload(dbUserId: string, teamId: string, options: TeamDashboardOptions) {
  // Verify team exists and user owns it
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      userId: dbUserId,
    },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!team) {
    throw new Error('TEAM_NOT_FOUND')
  }

  // Get recent broadcasts (last N days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - options.days)

  const broadcasts = options.includeRecentBroadcasts
    ? await prisma.teamWorkoutBroadcast.findMany({
        where: {
          teamId,
          assignedDate: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          strengthSession: {
            select: { id: true, name: true },
          },
          cardioSession: {
            select: { id: true, name: true },
          },
          hybridWorkout: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          assignedDate: 'desc',
        },
        take: 10,
      })
    : []

  const broadcastIds = broadcasts.map((b) => b.id)
  const memberIds = team.members.map((m) => m.id)

  // Aggregate completion counts in bulk to avoid N+1 count queries.
  const [strengthCompletedByBroadcast, cardioCompletedByBroadcast, hybridCompletedByBroadcast] =
    broadcastIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.strengthSessionAssignment.groupBy({
            by: ['teamBroadcastId'],
            where: {
              teamBroadcastId: { in: broadcastIds },
              status: 'COMPLETED',
            },
            _count: { teamBroadcastId: true },
          }),
          prisma.cardioSessionAssignment.groupBy({
            by: ['teamBroadcastId'],
            where: {
              teamBroadcastId: { in: broadcastIds },
              status: 'COMPLETED',
            },
            _count: { teamBroadcastId: true },
          }),
          prisma.hybridWorkoutAssignment.groupBy({
            by: ['teamBroadcastId'],
            where: {
              teamBroadcastId: { in: broadcastIds },
              status: 'COMPLETED',
            },
            _count: { teamBroadcastId: true },
          }),
        ])

  const strengthBroadcastMap = new Map(
    strengthCompletedByBroadcast.map((row) => [row.teamBroadcastId, row._count.teamBroadcastId])
  )
  const cardioBroadcastMap = new Map(
    cardioCompletedByBroadcast.map((row) => [row.teamBroadcastId, row._count.teamBroadcastId])
  )
  const hybridBroadcastMap = new Map(
    hybridCompletedByBroadcast.map((row) => [row.teamBroadcastId, row._count.teamBroadcastId])
  )

  // Calculate completion stats for each broadcast
  const recentBroadcasts = broadcasts.map((broadcast) => {
    let completedCount = 0
    if (broadcast.strengthSessionId) completedCount = strengthBroadcastMap.get(broadcast.id) || 0
    else if (broadcast.cardioSessionId) completedCount = cardioBroadcastMap.get(broadcast.id) || 0
    else if (broadcast.hybridWorkoutId) completedCount = hybridBroadcastMap.get(broadcast.id) || 0

    const workoutName =
      broadcast.strengthSession?.name ||
      broadcast.cardioSession?.name ||
      broadcast.hybridWorkout?.name ||
      'Unknown'

    const workoutType = broadcast.strengthSessionId
      ? 'strength'
      : broadcast.cardioSessionId
        ? 'cardio'
        : 'hybrid'

    return {
      id: broadcast.id,
      assignedDate: broadcast.assignedDate,
      workoutName,
      workoutType,
      totalAssigned: broadcast.totalAssigned,
      totalCompleted: completedCount,
      completionRate:
        broadcast.totalAssigned > 0
          ? Math.round((completedCount / broadcast.totalAssigned) * 100)
          : 0,
    }
  })

  const [
    strengthAssignedByAthlete,
    strengthCompletedByAthlete,
    cardioAssignedByAthlete,
    cardioCompletedByAthlete,
    hybridAssignedByAthlete,
    hybridCompletedByAthlete,
  ] =
    !options.includeMemberStats || memberIds.length === 0
      ? [[], [], [], [], [], []]
      : await Promise.all([
          prisma.strengthSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
            },
            _count: { athleteId: true },
          }),
          prisma.strengthSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
              status: 'COMPLETED',
            },
            _count: { athleteId: true },
          }),
          prisma.cardioSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
            },
            _count: { athleteId: true },
          }),
          prisma.cardioSessionAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
              status: 'COMPLETED',
            },
            _count: { athleteId: true },
          }),
          prisma.hybridWorkoutAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
            },
            _count: { athleteId: true },
          }),
          prisma.hybridWorkoutAssignment.groupBy({
            by: ['athleteId'],
            where: {
              athleteId: { in: memberIds },
              teamBroadcastId: { not: null },
              assignedDate: { gte: thirtyDaysAgo },
              status: 'COMPLETED',
            },
            _count: { athleteId: true },
          }),
        ])

  const strengthAssignedMap = new Map(
    strengthAssignedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )
  const strengthCompletedMap = new Map(
    strengthCompletedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )
  const cardioAssignedMap = new Map(
    cardioAssignedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )
  const cardioCompletedMap = new Map(
    cardioCompletedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )
  const hybridAssignedMap = new Map(
    hybridAssignedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )
  const hybridCompletedMap = new Map(
    hybridCompletedByAthlete.map((row) => [row.athleteId, row._count.athleteId])
  )

  // Calculate per-member stats (last 30 days)
  const memberStats = options.includeMemberStats
    ? team.members.map((member) => {
    const strengthAssigned = strengthAssignedMap.get(member.id) || 0
    const strengthCompleted = strengthCompletedMap.get(member.id) || 0
    const cardioAssigned = cardioAssignedMap.get(member.id) || 0
    const cardioCompleted = cardioCompletedMap.get(member.id) || 0
    const hybridAssigned = hybridAssignedMap.get(member.id) || 0
    const hybridCompleted = hybridCompletedMap.get(member.id) || 0
    const totalAssigned = strengthAssigned + cardioAssigned + hybridAssigned
    const totalCompleted = strengthCompleted + cardioCompleted + hybridCompleted

    return {
      athleteId: member.id,
      name: member.name,
      email: member.email,
      assignedCount: totalAssigned,
      completedCount: totalCompleted,
      completionRate:
        totalAssigned > 0
          ? Math.round((totalCompleted / totalAssigned) * 100)
          : 0,
    }
    })
    : []

  // Sort members by completion rate (highest first)
  if (options.includeMemberStats) {
    memberStats.sort((a, b) => b.completionRate - a.completionRate)
  }

  const payload = {
    success: true,
    data: {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        sportType: team.sportType,
        memberCount: team.members.length,
        organization: team.organization,
      },
      recentBroadcasts,
      memberStats,
    },
  }

  const json = JSON.stringify(payload)
  teamDashboardCache.set(`${dbUserId}:${teamId}:${buildTeamDashboardCacheKey(options)}`, {
    expiresAt: Date.now() + TEAM_DASHBOARD_TTL_MS,
    staleUntil: Date.now() + TEAM_DASHBOARD_STALE_MS,
    json,
  })

  return json
}

async function buildDegradedTeamDashboardPayload(
  dbUserId: string,
  teamId: string,
  options: TeamDashboardOptions
) {
  // Keep this cheap: verify ownership and return a minimal payload.
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: dbUserId },
    select: {
      id: true,
      name: true,
      description: true,
      sportType: true,
      organization: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  })

  if (!team) {
    throw new Error('TEAM_NOT_FOUND')
  }

  // Short-lived degraded cache to smooth bursts while a slower refresh is in-flight.
  const payload = {
    success: true,
    degraded: true,
    data: {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        sportType: team.sportType,
        memberCount: team._count.members,
        organization: team.organization,
      },
      recentBroadcasts: options.includeRecentBroadcasts ? [] : [],
      memberStats: options.includeMemberStats ? [] : [],
    },
  }

  return payload
}

function jsonResponse(json: string, extraHeaders?: Record<string, string>) {
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  })
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Team dashboard timeout')), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

async function resolveAuthenticatedUserId(
  request: NextRequest
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const forwardedEmail = request.headers.get('x-auth-user-email')
  const authCacheKey = buildAuthCacheKey(request, forwardedEmail)
  const nowMs = Date.now()

  let authEmail = forwardedEmail
  if (!authEmail) {
    const cachedEmail = authEmailCache.get(authCacheKey)
    if (cachedEmail && cachedEmail.expiresAt > nowMs) {
      authEmail = cachedEmail.email
    } else {
      const inFlightEmail = authEmailInFlight.get(authCacheKey)
      if (inFlightEmail) {
        authEmail = await inFlightEmail
      } else {
        const resolveEmailPromise = (async () => {
          const supabase = await createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user?.email) {
            throw new Error('UNAUTHORIZED')
          }
          return user.email
        })()
        authEmailInFlight.set(authCacheKey, resolveEmailPromise)
        try {
          authEmail = await resolveEmailPromise
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return {
              ok: false,
              response: NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
              ),
            }
          }
          throw error
        } finally {
          authEmailInFlight.delete(authCacheKey)
        }
      }
      authEmailCache.set(authCacheKey, {
        expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
        email: authEmail,
      })
    }
  }

  const cachedUserId = userIdByEmailCache.get(authEmail)
  if (cachedUserId && cachedUserId.expiresAt > nowMs) {
    return { ok: true, userId: cachedUserId.userId }
  }

  const inFlightUserId = userIdByEmailInFlight.get(authEmail)
  const resolvedUserId = inFlightUserId
    ? await inFlightUserId
    : await (() => {
        const lookupPromise = prisma.user
          .findUnique({
            where: { email: authEmail },
            select: { id: true },
          })
          .then(user => user?.id ?? null)
        userIdByEmailInFlight.set(authEmail, lookupPromise)
        return lookupPromise.finally(() => {
          userIdByEmailInFlight.delete(authEmail)
        })
      })()

  if (!resolvedUserId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      ),
    }
  }

  userIdByEmailCache.set(authEmail, {
    expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
    userId: resolvedUserId,
  })

  return { ok: true, userId: resolvedUserId }
}

function buildAuthCacheKey(request: NextRequest, forwardedEmail?: string | null): string {
  if (forwardedEmail) {
    return `forwarded:${forwardedEmail}`
  }
  const cookieHeader = request.headers.get('cookie') || ''
  const supabaseSessionCookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('sb-') && part.includes('auth-token='))

  if (supabaseSessionCookie) {
    return `cookie:${supabaseSessionCookie}`
  }

  return `cookie:${cookieHeader.slice(0, 256)}`
}
