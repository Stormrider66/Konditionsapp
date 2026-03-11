/**
 * Nutrition Wrapped Generator
 *
 * Computes monthly and yearly summary stats from food item data.
 * Results are stored in the NutritionWrapped table for instant page loads.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface WrappedStats {
  totalMeals: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  daysLogged: number
  averageMealsPerDay: number
  averageDailyCalories: number
  averageDailyProtein: number
  topFoods: { name: string; count: number; totalGrams: number }[]
  proteinSources: { name: string; totalGrams: number; percent: number }[]
  carbSources: { name: string; totalGrams: number; percent: number }[]
  fatSources: { name: string; totalGrams: number; percent: number }[]
  categoryBreakdown: { category: string; count: number }[]
  mostLoggedMealType: string | null
  mealTypeDistribution: { mealType: string; count: number }[]
  varietyScore: number // unique foods / total items (0-1)
  longestStreak: number // consecutive days logged
  highestCalorieDay: { date: string; calories: number } | null
  lowestCalorieDay: { date: string; calories: number } | null
  totalFoodItems: number
  uniqueFoodItems: number
  funFacts: string[]
}

export async function generateNutritionWrapped(
  clientId: string,
  periodType: 'MONTHLY' | 'YEARLY',
  year: number,
  month?: number
): Promise<WrappedStats | null> {
  // Determine date range
  let startDate: Date
  let endDate: Date

  if (periodType === 'MONTHLY' && month) {
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59) // last day of month
  } else {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
  }

  // Fetch all meals with items for the period
  const meals = await prisma.mealLog.findMany({
    where: {
      clientId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      items: true,
    },
    orderBy: { date: 'asc' },
  })

  if (meals.length === 0) return null

  // All food items
  const allItems = meals.flatMap((m) => m.items)

  // Basic totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)
  const totalProtein = meals.reduce((sum, m) => sum + (m.proteinGrams ?? 0), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbsGrams ?? 0), 0)
  const totalFat = meals.reduce((sum, m) => sum + (m.fatGrams ?? 0), 0)

  // Days logged
  const uniqueDates = new Set(meals.map((m) => m.date.toISOString().split('T')[0]))
  const daysLogged = uniqueDates.size

  // Top foods by frequency
  const foodFreq = new Map<string, { name: string; count: number; totalGrams: number }>()
  for (const item of allItems) {
    const existing = foodFreq.get(item.normalizedName)
    if (existing) {
      existing.count++
      existing.totalGrams += item.estimatedGrams
    } else {
      foodFreq.set(item.normalizedName, {
        name: item.name,
        count: 1,
        totalGrams: item.estimatedGrams,
      })
    }
  }
  const topFoods = Array.from(foodFreq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Nutrient sources
  const proteinMap = new Map<string, { name: string; total: number }>()
  const carbMap = new Map<string, { name: string; total: number }>()
  const fatMap = new Map<string, { name: string; total: number }>()
  let itemTotalProtein = 0
  let itemTotalCarbs = 0
  let itemTotalFat = 0

  for (const item of allItems) {
    itemTotalProtein += item.proteinGrams
    itemTotalCarbs += item.carbsGrams
    itemTotalFat += item.fatGrams

    const key = item.normalizedName
    const p = proteinMap.get(key)
    if (p) p.total += item.proteinGrams
    else proteinMap.set(key, { name: item.name, total: item.proteinGrams })

    const c = carbMap.get(key)
    if (c) c.total += item.carbsGrams
    else carbMap.set(key, { name: item.name, total: item.carbsGrams })

    const f = fatMap.get(key)
    if (f) f.total += item.fatGrams
    else fatMap.set(key, { name: item.name, total: item.fatGrams })
  }

  const toSourceList = (map: Map<string, { name: string; total: number }>, grandTotal: number) =>
    Array.from(map.values())
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((s) => ({
        name: s.name,
        totalGrams: Math.round(s.total),
        percent: grandTotal > 0 ? Math.round((s.total / grandTotal) * 100) : 0,
      }))

  // Category breakdown
  const catMap = new Map<string, number>()
  for (const item of allItems) {
    const cat = item.category || 'OTHER'
    catMap.set(cat, (catMap.get(cat) || 0) + 1)
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Meal type distribution
  const mealTypeMap = new Map<string, number>()
  for (const meal of meals) {
    mealTypeMap.set(meal.mealType, (mealTypeMap.get(meal.mealType) || 0) + 1)
  }
  const mealTypeDistribution = Array.from(mealTypeMap.entries())
    .map(([mealType, count]) => ({ mealType, count }))
    .sort((a, b) => b.count - a.count)

  // Streaks
  const sortedDates = Array.from(uniqueDates).sort()
  let longestStreak = 1
  let currentStreak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  // Daily calorie extremes
  const dailyCalories = new Map<string, number>()
  for (const meal of meals) {
    const dateKey = meal.date.toISOString().split('T')[0]
    dailyCalories.set(dateKey, (dailyCalories.get(dateKey) || 0) + (meal.calories ?? 0))
  }
  const dailyEntries = Array.from(dailyCalories.entries())
    .filter(([, cal]) => cal > 0)
    .sort((a, b) => b[1] - a[1])

  const highestCalorieDay = dailyEntries.length > 0
    ? { date: dailyEntries[0][0], calories: dailyEntries[0][1] }
    : null
  const lowestCalorieDay = dailyEntries.length > 0
    ? { date: dailyEntries[dailyEntries.length - 1][0], calories: dailyEntries[dailyEntries.length - 1][1] }
    : null

  // Variety score
  const varietyScore = allItems.length > 0 ? foodFreq.size / allItems.length : 0

  // Fun facts
  const funFacts = generateFunFacts({
    topFoods,
    totalCalories,
    totalProtein,
    daysLogged,
    longestStreak,
    uniqueFoods: foodFreq.size,
    totalItems: allItems.length,
    periodType,
    month,
  })

  const stats: WrappedStats = {
    totalMeals: meals.length,
    totalCalories,
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    daysLogged,
    averageMealsPerDay: daysLogged > 0 ? Math.round((meals.length / daysLogged) * 10) / 10 : 0,
    averageDailyCalories: daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0,
    averageDailyProtein: daysLogged > 0 ? Math.round(totalProtein / daysLogged) : 0,
    topFoods,
    proteinSources: toSourceList(proteinMap, itemTotalProtein),
    carbSources: toSourceList(carbMap, itemTotalCarbs),
    fatSources: toSourceList(fatMap, itemTotalFat),
    categoryBreakdown,
    mostLoggedMealType: mealTypeDistribution[0]?.mealType ?? null,
    mealTypeDistribution,
    varietyScore: Math.round(varietyScore * 100) / 100,
    longestStreak,
    highestCalorieDay,
    lowestCalorieDay,
    totalFoodItems: allItems.length,
    uniqueFoodItems: foodFreq.size,
    funFacts,
  }

  // Upsert into NutritionWrapped
  await prisma.nutritionWrapped.upsert({
    where: {
      clientId_periodType_year_month: {
        clientId,
        periodType,
        year,
        month: month ?? 0,
      },
    },
    update: {
      stats: stats as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    },
    create: {
      clientId,
      periodType,
      year,
      month: month ?? 0,
      stats: stats as unknown as Record<string, unknown>,
    },
  })

  logger.info('Generated nutrition wrapped', { clientId, periodType, year, month })

  return stats
}

function generateFunFacts(data: {
  topFoods: { name: string; count: number; totalGrams: number }[]
  totalCalories: number
  totalProtein: number
  daysLogged: number
  longestStreak: number
  uniqueFoods: number
  totalItems: number
  periodType: string
  month?: number
}): string[] {
  const facts: string[] = []

  if (data.topFoods[0]) {
    facts.push(
      `Din favoritmat var ${data.topFoods[0].name} — du åt det ${data.topFoods[0].count} gånger!`
    )
    const kg = data.topFoods[0].totalGrams / 1000
    if (kg >= 1) {
      facts.push(
        `Du konsumerade ${kg.toFixed(1)} kg ${data.topFoods[0].name} totalt`
      )
    }
  }

  if (data.totalCalories > 0) {
    const bananas = Math.round(data.totalCalories / 89)
    facts.push(`Dina ${data.totalCalories.toLocaleString()} kcal motsvarar ungefär ${bananas.toLocaleString()} bananer`)
  }

  if (data.totalProtein > 0) {
    const chickenBreasts = Math.round(data.totalProtein / 31) // ~31g protein per chicken breast
    facts.push(`Du åt ${data.totalProtein}g protein — det är som ${chickenBreasts} kycklingbröst`)
  }

  if (data.longestStreak > 1) {
    facts.push(`Din längsta loggningssvit var ${data.longestStreak} dagar i rad`)
  }

  if (data.uniqueFoods >= 20) {
    facts.push(`Du åt ${data.uniqueFoods} olika livsmedel — bra variation!`)
  } else if (data.uniqueFoods >= 10) {
    facts.push(`Du åt ${data.uniqueFoods} olika livsmedel`)
  }

  return facts
}
