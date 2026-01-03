// app/api/teams/[teamId]/dashboard/route.ts
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
  params: Promise<{ teamId: string }>
}

// GET /api/teams/[teamId]/dashboard
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

    const { teamId } = await context.params

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

    // Calculate completion stats for each broadcast
    const recentBroadcasts = await Promise.all(
      broadcasts.map(async (broadcast) => {
        let completedCount = 0

        if (broadcast.strengthSessionId) {
          const completed = await prisma.strengthSessionAssignment.count({
            where: {
              teamBroadcastId: broadcast.id,
              status: 'COMPLETED',
            },
          })
          completedCount = completed
        } else if (broadcast.cardioSessionId) {
          const completed = await prisma.cardioSessionAssignment.count({
            where: {
              teamBroadcastId: broadcast.id,
              status: 'COMPLETED',
            },
          })
          completedCount = completed
        } else if (broadcast.hybridWorkoutId) {
          const completed = await prisma.hybridWorkoutAssignment.count({
            where: {
              teamBroadcastId: broadcast.id,
              status: 'COMPLETED',
            },
          })
          completedCount = completed
        }

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
    )

    // Calculate per-member stats (last 30 days)
    const memberStats = await Promise.all(
      team.members.map(async (member) => {
        // Count strength assignments
        const strengthAssigned = await prisma.strengthSessionAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
          },
        })
        const strengthCompleted = await prisma.strengthSessionAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
            status: 'COMPLETED',
          },
        })

        // Count cardio assignments
        const cardioAssigned = await prisma.cardioSessionAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
          },
        })
        const cardioCompleted = await prisma.cardioSessionAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
            status: 'COMPLETED',
          },
        })

        // Count hybrid assignments
        const hybridAssigned = await prisma.hybridWorkoutAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
          },
        })
        const hybridCompleted = await prisma.hybridWorkoutAssignment.count({
          where: {
            athleteId: member.id,
            teamBroadcastId: { not: null },
            assignedDate: { gte: thirtyDaysAgo },
            status: 'COMPLETED',
          },
        })

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
    )

    // Sort members by completion rate (highest first)
    memberStats.sort((a, b) => b.completionRate - a.completionRate)

    return NextResponse.json({
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
    })
  } catch (error) {
    logger.error('Error fetching team dashboard', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team dashboard' },
      { status: 500 }
    )
  }
}
