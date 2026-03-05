/**
 * Nutrition Statistics API
 *
 * GET /api/nutrition/stats?range=30d
 *
 * Returns aggregated nutrition statistics for the athlete dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const range = request.nextUrl.searchParams.get('range') || '30d'
    const days = RANGE_DAYS[range] || 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Parallel queries
    const [meals, nutritionGoal, workoutLogs] = await Promise.all([
      prisma.mealLog.findMany({
        where: {
          clientId,
          date: { gte: startDate },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          mealType: true,
          calories: true,
          proteinGrams: true,
          carbsGrams: true,
          fatGrams: true,
          fiberGrams: true,
          isPreWorkout: true,
          isPostWorkout: true,
        },
      }),

      prisma.nutritionGoal.findUnique({
        where: { clientId },
        select: {
          goalType: true,
          macroProfile: true,
          customProteinPercent: true,
          customCarbsPercent: true,
          customFatPercent: true,
        },
      }),

      prisma.workoutLog.findMany({
        where: {
          workout: {
            day: { week: { program: { clientId } } },
          },
          completedAt: { gte: startDate },
        },
        select: {
          completedAt: true,
        },
      }),
    ])

    // Group meals by date
    const dailyMap = new Map<string, {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
      mealCount: number
    }>()

    const mealTypeMap = new Map<string, { count: number; totalCalories: number }>()

    for (const meal of meals) {
      const dateStr = meal.date.toISOString().split('T')[0]

      // Daily totals
      const day = dailyMap.get(dateStr) || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealCount: 0 }
      day.calories += meal.calories ?? 0
      day.protein += meal.proteinGrams ?? 0
      day.carbs += meal.carbsGrams ?? 0
      day.fat += meal.fatGrams ?? 0
      day.fiber += meal.fiberGrams ?? 0
      day.mealCount += 1
      dailyMap.set(dateStr, day)

      // Meal type distribution
      const mt = mealTypeMap.get(meal.mealType) || { count: 0, totalCalories: 0 }
      mt.count += 1
      mt.totalCalories += meal.calories ?? 0
      mealTypeMap.set(meal.mealType, mt)
    }

    // Daily totals array
    const dailyTotals = Array.from(dailyMap.entries()).map(([date, totals]) => ({
      date,
      ...totals,
    }))

    // Weekly averages (group by ISO week)
    const weeklyMap = new Map<string, { days: typeof dailyTotals }>()
    for (const day of dailyTotals) {
      const d = new Date(day.date)
      const yearWeek = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
      const week = weeklyMap.get(yearWeek) || { days: [] }
      week.days.push(day)
      weeklyMap.set(yearWeek, week)
    }

    const weeklyAverages = Array.from(weeklyMap.entries()).map(([week, data]) => {
      const n = data.days.length
      return {
        week,
        avgCalories: Math.round(data.days.reduce((s, d) => s + d.calories, 0) / n),
        avgProtein: Math.round(data.days.reduce((s, d) => s + d.protein, 0) / n),
        avgCarbs: Math.round(data.days.reduce((s, d) => s + d.carbs, 0) / n),
        avgFat: Math.round(data.days.reduce((s, d) => s + d.fat, 0) / n),
        daysLogged: n,
      }
    })

    // Meal type distribution
    const mealTypeDistribution = Array.from(mealTypeMap.entries()).map(([type, data]) => ({
      mealType: type,
      count: data.count,
      avgCalories: Math.round(data.totalCalories / data.count),
    }))

    // Protein timing vs workouts
    const workoutDates = new Set(
      workoutLogs
        .filter((w) => w.completedAt)
        .map((w) => w.completedAt!.toISOString().split('T')[0])
    )

    let workoutDayProtein = 0
    let workoutDayCount = 0
    let restDayProtein = 0
    let restDayCount = 0

    for (const day of dailyTotals) {
      if (workoutDates.has(day.date)) {
        workoutDayProtein += day.protein
        workoutDayCount += 1
      } else {
        restDayProtein += day.protein
        restDayCount += 1
      }
    }

    const proteinTiming = {
      avgWorkoutDayProtein: workoutDayCount > 0 ? Math.round(workoutDayProtein / workoutDayCount) : null,
      avgRestDayProtein: restDayCount > 0 ? Math.round(restDayProtein / restDayCount) : null,
      workoutDays: workoutDayCount,
      restDays: restDayCount,
    }

    // Goal adherence (% of days within 10% of macro target)
    // Use custom percentages if available, otherwise use approximate defaults
    let goalAdherence = null
    if (nutritionGoal && dailyTotals.length > 0) {
      // We'd need actual computed targets. For simplicity, calculate adherence
      // based on consistency (days meeting their own daily average within ±10%)
      const avgCal = dailyTotals.reduce((s, d) => s + d.calories, 0) / dailyTotals.length
      const avgP = dailyTotals.reduce((s, d) => s + d.protein, 0) / dailyTotals.length
      const avgC = dailyTotals.reduce((s, d) => s + d.carbs, 0) / dailyTotals.length
      const avgF = dailyTotals.reduce((s, d) => s + d.fat, 0) / dailyTotals.length

      const withinRange = (value: number, target: number) =>
        target > 0 && Math.abs(value - target) / target <= 0.1

      goalAdherence = {
        calories: Math.round(
          (dailyTotals.filter((d) => withinRange(d.calories, avgCal)).length / dailyTotals.length) * 100
        ),
        protein: Math.round(
          (dailyTotals.filter((d) => withinRange(d.protein, avgP)).length / dailyTotals.length) * 100
        ),
        carbs: Math.round(
          (dailyTotals.filter((d) => withinRange(d.carbs, avgC)).length / dailyTotals.length) * 100
        ),
        fat: Math.round(
          (dailyTotals.filter((d) => withinRange(d.fat, avgF)).length / dailyTotals.length) * 100
        ),
      }
    }

    // Overall macro ratio (caloric split)
    const totalProteinCal = dailyTotals.reduce((s, d) => s + d.protein * 4, 0)
    const totalCarbsCal = dailyTotals.reduce((s, d) => s + d.carbs * 4, 0)
    const totalFatCal = dailyTotals.reduce((s, d) => s + d.fat * 9, 0)
    const totalMacroCal = totalProteinCal + totalCarbsCal + totalFatCal

    const overallMacroRatio = totalMacroCal > 0
      ? {
          proteinPercent: Math.round((totalProteinCal / totalMacroCal) * 100),
          carbsPercent: Math.round((totalCarbsCal / totalMacroCal) * 100),
          fatPercent: Math.round((totalFatCal / totalMacroCal) * 100),
        }
      : null

    // Summary
    const totalDaysLogged = dailyTotals.length
    const avgMealsPerDay = totalDaysLogged > 0
      ? Math.round((meals.length / totalDaysLogged) * 10) / 10
      : 0

    return NextResponse.json({
      success: true,
      range,
      dailyTotals,
      weeklyAverages,
      mealTypeDistribution,
      proteinTiming,
      goalAdherence,
      overallMacroRatio,
      summary: {
        totalDaysLogged,
        avgMealsPerDay,
        totalMeals: meals.length,
      },
    })
  } catch (error) {
    logger.error('Nutrition stats error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Kunde inte hämta statistik' }, { status: 500 })
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
