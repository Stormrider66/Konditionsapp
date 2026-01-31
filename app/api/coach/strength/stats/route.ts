import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { startOfWeek, endOfWeek, startOfMonth, subMonths } from 'date-fns'

export async function GET() {
  try {
    const user = await requireAuth()
    const userId = user.id

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const thisMonthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = startOfMonth(now)

    // Build exercise access filter based on role (same logic as /api/exercises)
    let exerciseAccessWhere: any = {}
    if (user.role === 'ADMIN') {
      // Admin sees all
    } else if (user.role === 'COACH') {
      exerciseAccessWhere.OR = [{ isPublic: true }, { coachId: userId }]
    } else {
      exerciseAccessWhere.OR = [{ isPublic: true }]
    }

    // Get coach's athletes
    const clients = await prisma.client.findMany({
      where: { userId: userId },
      select: { id: true }
    })
    const athleteIds = clients.map(c => c.id)

    // 1. Total Exercises (accessible to this user)
    const [totalExercises, exercisesAddedThisWeek] = await Promise.all([
      prisma.exercise.count({
        where: exerciseAccessWhere
      }),
      prisma.exercise.count({
        where: {
          coachId: userId,
          createdAt: { gte: weekStart, lte: weekEnd }
        }
      })
    ])

    // 2. Active Programs (strength sessions assigned)
    const [activePrograms, athletesWithPrograms] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: userId },
          status: { in: ['PENDING', 'SCHEDULED'] }
        }
      }),
      prisma.strengthSessionAssignment.groupBy({
        by: ['athleteId'],
        where: {
          session: { coachId: userId },
          status: { in: ['PENDING', 'SCHEDULED'] }
        }
      })
    ])

    // 3. Compliance Rate (completed vs total assignments this month vs last month)
    const [thisMonthCompleted, thisMonthTotal, lastMonthCompleted, lastMonthTotal] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: userId },
          assignedDate: { gte: thisMonthStart },
          status: 'COMPLETED'
        }
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: userId },
          assignedDate: { gte: thisMonthStart }
        }
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: userId },
          assignedDate: { gte: lastMonthStart, lt: lastMonthEnd },
          status: 'COMPLETED'
        }
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: userId },
          assignedDate: { gte: lastMonthStart, lt: lastMonthEnd }
        }
      })
    ])

    const thisMonthRate = thisMonthTotal > 0 ? (thisMonthCompleted / thisMonthTotal) * 100 : 0
    const lastMonthRate = lastMonthTotal > 0 ? (lastMonthCompleted / lastMonthTotal) * 100 : 0
    const complianceChange = thisMonthRate - lastMonthRate

    // 4. PRs this week (from OneRepMaxHistory)
    const prsThisWeek = athleteIds.length > 0 ? await prisma.oneRepMaxHistory.findMany({
      where: {
        clientId: { in: athleteIds },
        date: { gte: weekStart, lte: weekEnd }
      },
      include: {
        exercise: { select: { name: true, nameSv: true } }
      }
    }) : []

    // Group PRs by exercise
    const prsByExercise: Record<string, number> = {}
    for (const pr of prsThisWeek) {
      const exerciseName = pr.exercise?.nameSv || pr.exercise?.name || 'Unknown'
      prsByExercise[exerciseName] = (prsByExercise[exerciseName] || 0) + 1
    }

    // Get top 2 exercises with PRs
    const topPrExercises = Object.entries(prsByExercise)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name, count]) => `${count} ${name}`)
      .join(', ')

    return NextResponse.json({
      totalExercises,
      exercisesAddedThisWeek,
      activePrograms,
      athletesWithPrograms: athletesWithPrograms.length,
      complianceRate: Math.round(thisMonthRate),
      complianceChange: complianceChange.toFixed(1),
      prsThisWeek: prsThisWeek.length,
      topPrExercises: topPrExercises || null
    })
  } catch (error) {
    return handleApiError(error)
  }
}
