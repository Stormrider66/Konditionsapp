/**
 * Test Overview API
 *
 * GET - Fetch test results across teams with filtering, comparison, and stats
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getBusinessMembership } from '@/lib/coach/team-access'
import { getCoachScopedIds } from '@/lib/coach/scoping'

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(req)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')
    const testType = searchParams.get('testType')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const clientIds = searchParams.get('clientIds')?.split(',').filter(Boolean)

    // Build client filter based on role and active business.
    const clientFilter: Prisma.ClientWhereInput = {}
    if (permissions.isTeamScoped && permissions.assignedTeamIds.length > 0) {
      clientFilter.teamId = { in: teamId ? [teamId] : permissions.assignedTeamIds }
    } else if (teamId) {
      clientFilter.teamId = teamId
    }
    if (membership) {
      clientFilter.businessId = membership.businessId
      clientFilter.userId = { in: coachIds }
    } else {
      clientFilter.userId = user.id
    }
    if (clientIds && clientIds.length > 0) {
      clientFilter.id = { in: clientIds }
    }

    // Build date filter
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)

    // Fetch lab tests
    const tests = await prisma.test.findMany({
      where: {
        client: clientFilter,
        ...(testType ? { testType: testType as any } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { testDate: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, name: true, teamId: true, team: { select: { name: true } } } },
        testStages: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { testDate: 'desc' },
      take: 200,
    })

    // Fetch field tests
    const fieldTests = await prisma.fieldTest.findMany({
      where: {
        client: clientFilter,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, name: true, teamId: true, team: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    })

    // Build athlete summary stats
    const athleteMap = new Map<string, {
      id: string; name: string; teamName: string | null
      testCount: number
      latestVo2max: number | null
      latestMaxHR: number | null
      latestMaxLactate: number | null
      latestTestDate: string | null
    }>()

    for (const test of tests) {
      const existing = athleteMap.get(test.clientId)
      if (!existing) {
        athleteMap.set(test.clientId, {
          id: test.client.id,
          name: test.client.name,
          teamName: test.client.team?.name ?? null,
          testCount: 1,
          latestVo2max: test.vo2max,
          latestMaxHR: test.maxHR,
          latestMaxLactate: test.maxLactate,
          latestTestDate: test.testDate.toISOString(),
        })
      } else {
        existing.testCount++
        if (!existing.latestTestDate || test.testDate.toISOString() > existing.latestTestDate) {
          existing.latestVo2max = test.vo2max ?? existing.latestVo2max
          existing.latestMaxHR = test.maxHR ?? existing.latestMaxHR
          existing.latestMaxLactate = test.maxLactate ?? existing.latestMaxLactate
          existing.latestTestDate = test.testDate.toISOString()
        }
      }
    }

    // Group stats by team
    const teamStats = new Map<string, { vo2maxValues: number[]; maxHRValues: number[]; maxLactateValues: number[] }>()
    for (const test of tests) {
      const teamName = test.client.team?.name || 'Inget lag'
      if (!teamStats.has(teamName)) {
        teamStats.set(teamName, { vo2maxValues: [], maxHRValues: [], maxLactateValues: [] })
      }
      const stats = teamStats.get(teamName)!
      if (test.vo2max) stats.vo2maxValues.push(test.vo2max)
      if (test.maxHR) stats.maxHRValues.push(test.maxHR)
      if (test.maxLactate) stats.maxLactateValues.push(test.maxLactate)
    }

    const groupStats = Array.from(teamStats.entries()).map(([teamName, stats]) => {
      const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
      const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : null
      const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : null
      return {
        teamName,
        athleteCount: new Set(tests.filter((t) => (t.client.team?.name || 'Inget lag') === teamName).map((t) => t.clientId)).size,
        vo2max: { avg: avg(stats.vo2maxValues), min: min(stats.vo2maxValues), max: max(stats.vo2maxValues) },
        maxHR: { avg: avg(stats.maxHRValues), min: min(stats.maxHRValues), max: max(stats.maxHRValues) },
        maxLactate: { avg: avg(stats.maxLactateValues), min: min(stats.maxLactateValues), max: max(stats.maxLactateValues) },
      }
    })

    return NextResponse.json({
      tests: tests.map((t) => ({
        id: t.id,
        clientId: t.clientId,
        clientName: t.client.name,
        teamName: t.client.team?.name ?? null,
        testType: t.testType,
        testDate: t.testDate.toISOString(),
        vo2max: t.vo2max,
        maxHR: t.maxHR,
        maxLactate: t.maxLactate,
        restingLactate: t.restingLactate,
        stageCount: t.testStages.length,
      })),
      fieldTests: fieldTests.map((ft) => ({
        id: ft.id,
        clientId: ft.clientId,
        clientName: ft.client.name,
        teamName: ft.client.team?.name ?? null,
        testType: ft.testType,
        date: ft.date.toISOString(),
        results: ft.results,
        lt1Pace: ft.lt1Pace,
        lt1HR: ft.lt1HR,
        lt2Pace: ft.lt2Pace,
        lt2HR: ft.lt2HR,
      })),
      athletes: Array.from(athleteMap.values()),
      groupStats,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching test overview:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
