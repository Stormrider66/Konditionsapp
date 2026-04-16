import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

export async function getNutritionUsageStats(): Promise<OperatorToolResult> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalMealLogs,
    mealLogs7d,
    mealLogs30d,
    nutritionGoals,
    activeGoals,
    uniqueUsersEver,
    uniqueUsers7d,
  ] = await Promise.all([
    prisma.mealLog.count(),
    prisma.mealLog.count({ where: { date: { gte: sevenDaysAgo } } }),
    prisma.mealLog.count({ where: { date: { gte: thirtyDaysAgo } } }),
    prisma.nutritionGoal.count(),
    prisma.client.count({ where: { nutritionGoal: { isNot: null } } }),
    prisma.mealLog.groupBy({ by: ['clientId'] }).then(g => g.length),
    prisma.mealLog.groupBy({
      by: ['clientId'],
      where: { date: { gte: sevenDaysAgo } },
    }).then(g => g.length),
  ])

  const topUsers = await prisma.mealLog.groupBy({
    by: ['clientId'],
    _count: true,
    where: { date: { gte: thirtyDaysAgo } },
    orderBy: { _count: { clientId: 'desc' } },
    take: 10,
  })

  const topUserDetails = topUsers.length > 0 ? await prisma.client.findMany({
    where: { id: { in: topUsers.map(u => u.clientId) } },
    select: { id: true, name: true },
  }) : []

  const nameMap = new Map(topUserDetails.map(u => [u.id, u.name]))

  return {
    success: true,
    data: {
      overview: {
        totalMealLogs,
        uniqueUsersEver,
        nutritionGoalsCreated: nutritionGoals,
        usersWithNutritionGoals: activeGoals,
      },
      last7days: { mealLogs: mealLogs7d, uniqueUsers: uniqueUsers7d },
      last30days: { mealLogs: mealLogs30d },
      topUsers30d: topUsers.map(u => ({
        name: nameMap.get(u.clientId) || 'Unknown',
        mealLogs: u._count,
      })),
    },
  }
}
