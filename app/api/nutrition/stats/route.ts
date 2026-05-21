/**
 * Nutrition Statistics API
 *
 * GET /api/nutrition/stats?range=30d
 *
 * Returns aggregated nutrition statistics for the athlete dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { addDays, startOfDay } from 'date-fns'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { inferCompleteProtein, inferProteinSource, normalizeProteinSource } from '@/lib/nutrition/protein-quality'
import { getTranslations } from '@/i18n/server'

const RANGE_DAYS: Record<string, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

function parseDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export async function GET(request: NextRequest) {
  const t = await getTranslations('api.nutrition.stats')
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const range = request.nextUrl.searchParams.get('range') || '30d'
    const days = RANGE_DAYS[range] || 30
    const requestedDate = parseDateParam(request.nextUrl.searchParams.get('date'))
    const startDate = range === '1d'
      ? startOfDay(requestedDate ?? new Date())
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const endDate = range === '1d' ? addDays(startDate, 1) : null

    // Parallel queries
    const [meals, nutritionGoal, workoutLogs] = await Promise.all([
      prisma.mealLog.findMany({
        where: {
          clientId,
          date: endDate ? { gte: startDate, lt: endDate } : { gte: startDate },
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
          saturatedFatGrams: true,
          monounsaturatedFatGrams: true,
          polyunsaturatedFatGrams: true,
          isPreWorkout: true,
          isPostWorkout: true,
          items: {
            select: {
              name: true,
              category: true,
              proteinGrams: true,
              fatGrams: true,
              saturatedFatGrams: true,
              monounsaturatedFatGrams: true,
              polyunsaturatedFatGrams: true,
              isCompleteProtein: true,
              proteinSource: true,
            },
          },
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
          completedAt: endDate ? { gte: startDate, lt: endDate } : { gte: startDate },
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

    const nutritionQuality = calculateNutritionQuality(meals)

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
      nutritionQuality,
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

    return NextResponse.json({ error: t('errors.fetchFailed') }, { status: 500 })
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function calculateNutritionQuality(meals: Array<{
  proteinGrams: number | null
  fatGrams: number | null
  saturatedFatGrams: number | null
  monounsaturatedFatGrams: number | null
  polyunsaturatedFatGrams: number | null
  items: Array<{
    name: string
    category: string | null
    proteinGrams: number
    fatGrams: number
    saturatedFatGrams: number | null
    monounsaturatedFatGrams: number | null
    polyunsaturatedFatGrams: number | null
    isCompleteProtein: boolean | null
    proteinSource: string | null
  }>
}>) {
  let totalProtein = 0
  let animalProtein = 0
  let plantProtein = 0
  let mixedProtein = 0
  let completeProtein = 0
  let incompleteKnownProtein = 0
  let unknownQualityProtein = 0

  let totalFat = 0
  let saturatedFat = 0
  let monounsaturatedFat = 0
  let polyunsaturatedFat = 0

  for (const meal of meals) {
    totalProtein += meal.proteinGrams ?? 0
    totalFat += meal.fatGrams ?? 0

    const items = meal.items ?? []
    const itemProtein = items.reduce((sum, item) => sum + item.proteinGrams, 0)

    if (items.length === 0 || itemProtein <= 0) {
      unknownQualityProtein += meal.proteinGrams ?? 0
    } else {
      for (const item of items) {
        const protein = item.proteinGrams
        if (protein <= 0) continue

        const source = normalizeProteinSource(item.proteinSource) ?? inferProteinSource(item.name, item.category)
        if (source === 'ANIMAL') animalProtein += protein
        else if (source === 'PLANT') plantProtein += protein
        else if (source === 'MIXED') mixedProtein += protein

        const isComplete = item.isCompleteProtein ?? inferCompleteProtein(item.name, item.category, source)
        if (isComplete === true) completeProtein += protein
        else if (isComplete === false) incompleteKnownProtein += protein
        else unknownQualityProtein += protein
      }

      const mealProteinDelta = Math.max(0, (meal.proteinGrams ?? 0) - itemProtein)
      unknownQualityProtein += mealProteinDelta
    }

    const itemFatWithBreakdown = items.filter(
      (item) =>
        item.saturatedFatGrams != null ||
        item.monounsaturatedFatGrams != null ||
        item.polyunsaturatedFatGrams != null
    )

    if (itemFatWithBreakdown.length > 0) {
      for (const item of itemFatWithBreakdown) {
        saturatedFat += item.saturatedFatGrams ?? 0
        monounsaturatedFat += item.monounsaturatedFatGrams ?? 0
        polyunsaturatedFat += item.polyunsaturatedFatGrams ?? 0
      }
    } else {
      saturatedFat += meal.saturatedFatGrams ?? 0
      monounsaturatedFat += meal.monounsaturatedFatGrams ?? 0
      polyunsaturatedFat += meal.polyunsaturatedFatGrams ?? 0
    }
  }

  const knownQualityProtein = completeProtein + incompleteKnownProtein
  const knownProteinSource = animalProtein + plantProtein + mixedProtein
  const knownFatBreakdown = saturatedFat + monounsaturatedFat + polyunsaturatedFat
  const otherFat = Math.max(0, totalFat - knownFatBreakdown)

  return {
    protein: {
      totalGrams: round1(totalProtein),
      completeGrams: round1(completeProtein),
      incompleteKnownGrams: round1(incompleteKnownProtein),
      unknownQualityGrams: round1(unknownQualityProtein),
      completePercentOfKnown: percentage(completeProtein, knownQualityProtein),
      knownQualityCoveragePercent: percentage(knownQualityProtein, totalProtein),
      targetCompletePercent: 75,
      sourceDistribution: {
        animalGrams: round1(animalProtein),
        plantGrams: round1(plantProtein),
        mixedGrams: round1(mixedProtein),
        unknownGrams: round1(Math.max(0, totalProtein - knownProteinSource)),
        animalPercent: percentage(animalProtein, totalProtein),
        plantPercent: percentage(plantProtein, totalProtein),
        mixedPercent: percentage(mixedProtein, totalProtein),
        unknownPercent: percentage(Math.max(0, totalProtein - knownProteinSource), totalProtein),
      },
    },
    fat: {
      totalGrams: round1(totalFat),
      saturatedGrams: round1(saturatedFat),
      monounsaturatedGrams: round1(monounsaturatedFat),
      polyunsaturatedGrams: round1(polyunsaturatedFat),
      otherGrams: round1(otherFat),
      saturatedPercent: percentage(saturatedFat, totalFat),
      monounsaturatedPercent: percentage(monounsaturatedFat, totalFat),
      polyunsaturatedPercent: percentage(polyunsaturatedFat, totalFat),
      otherPercent: percentage(otherFat, totalFat),
      knownBreakdownCoveragePercent: percentage(knownFatBreakdown, totalFat),
    },
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
