import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { startOfWeek, endOfWeek, startOfMonth, subMonths } from 'date-fns'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const thisMonthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = startOfMonth(now)

    // Get all coach members of this business
    const businessCoaches = await prisma.businessMember.findMany({
      where: {
        businessId: businessId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH'] },
      },
      select: { userId: true },
    })
    const coachUserIds = businessCoaches.map(m => m.userId)

    // Get athletes (clients) belonging to these coaches
    const clients = await prisma.client.findMany({
      where: { userId: { in: coachUserIds } },
      select: { id: true },
    })
    const athleteIds = clients.map(c => c.id)

    // 1. Total Exercises (public + business coaches' custom)
    const [totalExercises, exercisesAddedThisWeek] = await Promise.all([
      prisma.exercise.count({
        where: {
          OR: [
            { isPublic: true },
            { coachId: { in: coachUserIds } },
          ],
        },
      }),
      prisma.exercise.count({
        where: {
          coachId: { in: coachUserIds },
          createdAt: { gte: weekStart, lte: weekEnd },
        },
      }),
    ])

    // 2. Active Programs (strength sessions assigned by business coaches)
    const [activePrograms, athletesWithPrograms] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: { in: coachUserIds } },
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
      }),
      prisma.strengthSessionAssignment.groupBy({
        by: ['athleteId'],
        where: {
          session: { coachId: { in: coachUserIds } },
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
      }),
    ])

    // 3. Compliance Rate
    const [thisMonthCompleted, thisMonthTotal, lastMonthCompleted, lastMonthTotal] = await Promise.all([
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: { in: coachUserIds } },
          assignedDate: { gte: thisMonthStart },
          status: 'COMPLETED',
        },
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: { in: coachUserIds } },
          assignedDate: { gte: thisMonthStart },
        },
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: { in: coachUserIds } },
          assignedDate: { gte: lastMonthStart, lt: lastMonthEnd },
          status: 'COMPLETED',
        },
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          session: { coachId: { in: coachUserIds } },
          assignedDate: { gte: lastMonthStart, lt: lastMonthEnd },
        },
      }),
    ])

    const thisMonthRate = thisMonthTotal > 0 ? (thisMonthCompleted / thisMonthTotal) * 100 : 0
    const lastMonthRate = lastMonthTotal > 0 ? (lastMonthCompleted / lastMonthTotal) * 100 : 0
    const complianceChange = thisMonthRate - lastMonthRate

    // 4. PRs this week
    const prsThisWeek = athleteIds.length > 0 ? await prisma.oneRepMaxHistory.findMany({
      where: {
        clientId: { in: athleteIds },
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        exercise: { select: { name: true, nameSv: true } },
      },
    }) : []

    // Group PRs by exercise
    const prsByExercise: Record<string, number> = {}
    for (const pr of prsThisWeek) {
      const exerciseName = pr.exercise?.nameSv || pr.exercise?.name || 'Unknown'
      prsByExercise[exerciseName] = (prsByExercise[exerciseName] || 0) + 1
    }

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
      topPrExercises: topPrExercises || null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
