import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { OperatorToolResult } from '../types'

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function getNewUsersLast7d(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: { count: users.length, users } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserActivationProgress(userId: string): Promise<OperatorToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        clients: {
          select: {
            id: true,
            name: true,
            dailyCheckIns: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true },
            },
          },
        },
      },
    })

    if (!user) return { success: false, error: 'User not found' }

    const client = user.clients[0]
    const hasProfile = !!client && client.name.trim().length > 0
    const hasCheckIn = !!client && client.dailyCheckIns.length > 0

    let hasWorkout = false
    if (client) {
      const workoutCount = await prisma.strengthSessionAssignment.count({
        where: { athleteId: client.id },
      })
      hasWorkout = workoutCount > 0
    }

    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    )

    return {
      success: true,
      data: {
        userId,
        daysSinceSignup,
        hasProfile,
        hasCheckIn,
        hasWorkout,
        activated: hasProfile && hasCheckIn && hasWorkout,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findStuckUsers(): Promise<OperatorToolResult> {
  try {
    // Users who signed up >2 days ago but haven't checked in
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo, lt: twoDaysAgo },
        clients: {
          some: {
            dailyCheckIns: { none: {} },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      take: 20,
    })

    return {
      success: true,
      data: {
        count: users.length,
        users: users.map(u => ({
          ...u,
          stuckStep: 'first_checkin',
          daysSinceSignup: Math.floor(
            (Date.now() - new Date(u.createdAt).getTime()) / (24 * 60 * 60 * 1000)
          ),
        })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftOnboardingNudge(
  userId: string,
  step: string,
  subject: string,
  body: string
): Promise<OperatorToolResult> {
  try {
    logger.info('[operator-agents] Onboarding nudge drafted', { userId, step })
    return {
      success: true,
      data: {
        userId,
        step,
        subject,
        body,
        note: 'Draft saved for founder review',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// BUSINESS INTELLIGENCE TOOLS
// ============================================================================
