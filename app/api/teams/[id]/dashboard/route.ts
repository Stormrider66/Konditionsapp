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

interface RouteContext {
  params: Promise<{ id: string }>
}

const TEAM_DASHBOARD_TTL_MS = 15 * 1000
const teamDashboardCache = new Map<string, { expiresAt: number; payload: unknown }>()
const teamDashboardInFlight = new Map<string, Promise<unknown>>()

// GET /api/teams/[id]/dashboard
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: teamId } = await context.params
    const cacheKey = `${user.id}:${teamId}`
    const nowMs = Date.now()
    const cached = teamDashboardCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(cached.payload)
    }
    const inFlight = teamDashboardInFlight.get(cacheKey)
    if (inFlight) {
      const payload = await inFlight
      return NextResponse.json(payload)
    }

    const loadPromise = (async () => {

    // Verify team exists and user owns it
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        userId: user.id,
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
      return NextResponse.json(
        { success: false, error: 'Team not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get recent broadcasts (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const broadcasts = await prisma.teamWorkoutBroadcast.findMany({
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

    const broadcastIds = broadcasts.map((b) => b.id)
    const memberIds = team.members.map((m) => m.id)

    // Aggregate completion counts in bulk to avoid N+1 count queries.
    const [strengthCompletedByBroadcast, cardioCompletedByBroadcast, hybridCompletedByBroadcast] =
      await Promise.all([
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
    ] = await Promise.all([
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
    const memberStats = team.members.map((member) => {
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

    // Sort members by completion rate (highest first)
    memberStats.sort((a, b) => b.completionRate - a.completionRate)

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

    teamDashboardCache.set(cacheKey, {
      expiresAt: Date.now() + TEAM_DASHBOARD_TTL_MS,
      payload,
    })
    return payload
    })()

    teamDashboardInFlight.set(cacheKey, loadPromise)
    try {
      const payload = await loadPromise
      return NextResponse.json(payload)
    } finally {
      teamDashboardInFlight.delete(cacheKey)
    }
  } catch (error) {
    logger.error('Error fetching team dashboard', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team dashboard' },
      { status: 500 }
    )
  }
}
