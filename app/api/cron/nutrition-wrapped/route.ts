/**
 * Nutrition Wrapped Cron Job
 *
 * Runs monthly on the 1st — generates previous month's wrapped for all athletes.
 * On January 1st, also generates yearly wrapped for the previous year.
 *
 * Schedule: 0 6 1 * * (6 AM on the 1st of each month)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNutritionWrapped } from '@/lib/nutrition/wrapped-generator'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentYear = now.getFullYear()

  // Previous month
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

  try {
    // Find all athletes who have meal food items in the previous month
    const startDate = new Date(prevMonthYear, prevMonth - 1, 1)
    const endDate = new Date(prevMonthYear, prevMonth, 0, 23, 59, 59)

    const clientsWithData = await prisma.mealFoodItem.findMany({
      where: {
        mealLog: {
          date: { gte: startDate, lte: endDate },
        },
      },
      select: {
        mealLog: { select: { clientId: true } },
      },
      distinct: ['mealLogId'],
    })

    const uniqueClientIds = [...new Set(clientsWithData.map((c) => c.mealLog.clientId))]

    logger.info('Nutrition wrapped cron: processing', {
      month: prevMonth,
      year: prevMonthYear,
      athleteCount: uniqueClientIds.length,
    })

    let monthlyGenerated = 0
    let yearlyGenerated = 0

    for (const clientId of uniqueClientIds) {
      try {
        // Generate monthly wrapped
        await generateNutritionWrapped(clientId, 'MONTHLY', prevMonthYear, prevMonth)
        monthlyGenerated++

        // If January, also generate yearly wrapped for previous year
        if (currentMonth === 1) {
          await generateNutritionWrapped(clientId, 'YEARLY', currentYear - 1)
          yearlyGenerated++
        }
      } catch (error) {
        logger.error('Failed to generate wrapped for client', { clientId }, error)
      }
    }

    return NextResponse.json({
      success: true,
      monthlyGenerated,
      yearlyGenerated,
      totalAthletes: uniqueClientIds.length,
    })
  } catch (error) {
    logger.error('Nutrition wrapped cron error', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
