/**
 * Food History API
 *
 * GET /api/nutrition/food-history
 *
 * Query params:
 * - range: "7d" | "30d" | "90d" | "365d" | "all" (default: "30d")
 * - view: "top-foods" | "top-meals" | "yesterday" | "nutrient-sources" | "timeline" (default: "top-foods")
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * Compress a free-text meal description into a short, reusable label.
 *
 * Why: top-meals previously surfaced raw descriptions like
 * "Tre små hemgjorda havre- och bananbröd med leverpastej och färska grönsaker",
 * which are too specific to ever match again — and never cluster with
 * near-duplicates ("2 bananbröd (banan, havregryn)..."). The short label
 * drops portion noise and trailing accompaniments so suggestions become
 * clusterable and re-pickable.
 */
function shortenMealDescription(desc: string): string {
  if (!desc) return desc
  let s = desc.trim()
  // Drop parenthetical asides like "(ingredienser banan och havregryn)"
  s = s.replace(/\s*\([^)]*\)/g, '')
  // Strip "en tallrik med", "en portion av", etc.
  s = s.replace(
    /^(en|ett|tre|två|fyra|fem|sex|några|några små|stor|liten|stora|små)\s+(tallrik|skål|portion|kopp|glas|bit|bitar)\s+(med|av)\s+/i,
    ''
  )
  // Strip a leading numeric count (e.g. "2 ", "3 små ")
  s = s.replace(/^\d+\s+(små|stora|stor|liten)?\s*/i, '')
  // Strip a leading number-word count (e.g. "Tre små ")
  s = s.replace(/^(en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio)\s+(små|stora|stor|liten)?\s*/i, '')
  // Cut at the first " med " — keep the main dish, drop accompaniments
  const lower = s.toLowerCase()
  const medIdx = lower.indexOf(' med ')
  if (medIdx > 5) s = s.slice(0, medIdx)
  // Cut at the first comma
  const commaIdx = s.indexOf(',')
  if (commaIdx > 5) s = s.slice(0, commaIdx)
  s = s.trim().replace(/\s+/g, ' ')
  // Clamp to ~32 chars on a word boundary
  if (s.length > 32) {
    const cut = s.slice(0, 32)
    const lastSpace = cut.lastIndexOf(' ')
    s = (lastSpace > 16 ? cut.slice(0, lastSpace) : cut) + '…'
  }
  if (!s) return desc.trim().slice(0, 32)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getDateFromRange(range: string): Date {
  const now = new Date()
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '365d':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    case 'all':
      return new Date('2020-01-01')
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    const view = searchParams.get('view') || 'top-foods'
    const startDate = getDateFromRange(range)

    if (view === 'top-foods') {
      const items = await prisma.mealFoodItem.findMany({
        where: {
          mealLog: { clientId, date: { gte: startDate } },
        },
        select: {
          normalizedName: true,
          name: true,
          category: true,
          estimatedGrams: true,
          calories: true,
          proteinGrams: true,
          carbsGrams: true,
          fatGrams: true,
        },
      })

      // Aggregate by normalizedName
      const foodMap = new Map<string, {
        name: string
        normalizedName: string
        category: string | null
        count: number
        totalGrams: number
        totalCalories: number
        totalProtein: number
        totalCarbs: number
        totalFat: number
      }>()

      for (const item of items) {
        const existing = foodMap.get(item.normalizedName)
        if (existing) {
          existing.count++
          existing.totalGrams += item.estimatedGrams
          existing.totalCalories += item.calories
          existing.totalProtein += item.proteinGrams
          existing.totalCarbs += item.carbsGrams
          existing.totalFat += item.fatGrams
        } else {
          foodMap.set(item.normalizedName, {
            name: item.name,
            normalizedName: item.normalizedName,
            category: item.category,
            count: 1,
            totalGrams: item.estimatedGrams,
            totalCalories: item.calories,
            totalProtein: item.proteinGrams,
            totalCarbs: item.carbsGrams,
            totalFat: item.fatGrams,
          })
        }
      }

      const topFoods = Array.from(foodMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

      return NextResponse.json({
        success: true,
        range,
        totalUniqueItems: foodMap.size,
        totalItemCount: items.length,
        topFoods,
      })
    }

    if (view === 'top-meals') {
      const meals = await prisma.mealLog.findMany({
        where: {
          clientId,
          date: { gte: startDate },
          description: { not: '' },
          calories: { gt: 0 },
        },
        select: {
          description: true,
          calories: true,
          proteinGrams: true,
          carbsGrams: true,
          fatGrams: true,
        },
      })

      // Aggregate by description (case-insensitive)
      const mealMap = new Map<string, {
        description: string
        count: number
        totalCalories: number
        totalProtein: number
        totalCarbs: number
        totalFat: number
      }>()

      for (const meal of meals) {
        if (!meal.description || meal.calories == null) continue
        const key = meal.description.toLowerCase().trim()
        const existing = mealMap.get(key)
        if (existing) {
          existing.count++
          existing.totalCalories += meal.calories ?? 0
          existing.totalProtein += meal.proteinGrams ?? 0
          existing.totalCarbs += meal.carbsGrams ?? 0
          existing.totalFat += meal.fatGrams ?? 0
        } else {
          mealMap.set(key, {
            description: meal.description.trim(),
            count: 1,
            totalCalories: meal.calories ?? 0,
            totalProtein: meal.proteinGrams ?? 0,
            totalCarbs: meal.carbsGrams ?? 0,
            totalFat: meal.fatGrams ?? 0,
          })
        }
      }

      // Re-aggregate by short label so near-duplicate descriptions cluster
      // and the surfaced label is short enough to be reusable.
      const shortMap = new Map<string, {
        description: string
        count: number
        totalCalories: number
        totalProtein: number
        totalCarbs: number
        totalFat: number
      }>()
      for (const m of mealMap.values()) {
        const label = shortenMealDescription(m.description)
        const key = label.toLowerCase()
        const existing = shortMap.get(key)
        if (existing) {
          existing.count += m.count
          existing.totalCalories += m.totalCalories
          existing.totalProtein += m.totalProtein
          existing.totalCarbs += m.totalCarbs
          existing.totalFat += m.totalFat
        } else {
          shortMap.set(key, {
            description: label,
            count: m.count,
            totalCalories: m.totalCalories,
            totalProtein: m.totalProtein,
            totalCarbs: m.totalCarbs,
            totalFat: m.totalFat,
          })
        }
      }

      const topMeals = Array.from(shortMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(m => ({
          description: m.description,
          calories: Math.round(m.totalCalories / m.count),
          protein: Math.round((m.totalProtein / m.count) * 10) / 10,
          carbs: Math.round((m.totalCarbs / m.count) * 10) / 10,
          fat: Math.round((m.totalFat / m.count) * 10) / 10,
          count: m.count,
        }))

      return NextResponse.json({
        success: true,
        range,
        topMeals,
      })
    }

    if (view === 'yesterday') {
      const now = new Date()
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const meals = await prisma.mealLog.findMany({
        where: {
          clientId,
          date: { gte: yesterdayStart, lt: yesterdayEnd },
        },
        select: {
          mealType: true,
          description: true,
          calories: true,
          proteinGrams: true,
          carbsGrams: true,
          fatGrams: true,
          items: {
            orderBy: { sortOrder: 'asc' },
            select: {
              foodId: true,
              name: true,
              estimatedGrams: true,
              portionDescription: true,
              calories: true,
              proteinGrams: true,
              carbsGrams: true,
              fatGrams: true,
              fiberGrams: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Key by meal type (first/most recent entry per type)
      const byType: Record<string, {
        description: string
        calories: number | null
        proteinGrams: number | null
        carbsGrams: number | null
        fatGrams: number | null
        items: {
          foodId: string | null
          name: string
          estimatedGrams: number
          portionDescription: string | null
          calories: number
          proteinGrams: number
          carbsGrams: number
          fatGrams: number
          fiberGrams: number
        }[]
      }> = {}

      for (const meal of meals) {
        if (!byType[meal.mealType] && meal.description) {
          byType[meal.mealType] = {
            description: meal.description,
            calories: meal.calories,
            proteinGrams: meal.proteinGrams,
            carbsGrams: meal.carbsGrams,
            fatGrams: meal.fatGrams,
            items: meal.items,
          }
        }
      }

      return NextResponse.json({
        success: true,
        yesterdayMeals: byType,
      })
    }

    if (view === 'nutrient-sources') {
      const items = await prisma.mealFoodItem.findMany({
        where: {
          mealLog: { clientId, date: { gte: startDate } },
        },
        select: {
          normalizedName: true,
          name: true,
          category: true,
          proteinGrams: true,
          carbsGrams: true,
          fatGrams: true,
        },
      })

      // Aggregate by food name for each macro
      const proteinSources = new Map<string, { name: string; total: number }>()
      const carbSources = new Map<string, { name: string; total: number }>()
      const fatSources = new Map<string, { name: string; total: number }>()

      let totalProtein = 0
      let totalCarbs = 0
      let totalFat = 0

      for (const item of items) {
        totalProtein += item.proteinGrams
        totalCarbs += item.carbsGrams
        totalFat += item.fatGrams

        const key = item.normalizedName

        const ps = proteinSources.get(key)
        if (ps) ps.total += item.proteinGrams
        else proteinSources.set(key, { name: item.name, total: item.proteinGrams })

        const cs = carbSources.get(key)
        if (cs) cs.total += item.carbsGrams
        else carbSources.set(key, { name: item.name, total: item.carbsGrams })

        const fs = fatSources.get(key)
        if (fs) fs.total += item.fatGrams
        else fatSources.set(key, { name: item.name, total: item.fatGrams })
      }

      const toSorted = (map: Map<string, { name: string; total: number }>, grandTotal: number) =>
        Array.from(map.values())
          .filter((s) => s.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
          .map((s) => ({
            name: s.name,
            totalGrams: Math.round(s.total * 10) / 10,
            percent: grandTotal > 0 ? Math.round((s.total / grandTotal) * 1000) / 10 : 0,
          }))

      return NextResponse.json({
        success: true,
        range,
        proteinSources: toSorted(proteinSources, totalProtein),
        carbSources: toSorted(carbSources, totalCarbs),
        fatSources: toSorted(fatSources, totalFat),
        totals: {
          proteinGrams: Math.round(totalProtein),
          carbsGrams: Math.round(totalCarbs),
          fatGrams: Math.round(totalFat),
        },
      })
    }

    if (view === 'timeline') {
      const meals = await prisma.mealLog.findMany({
        where: { clientId, date: { gte: startDate } },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
        take: 100,
      })

      return NextResponse.json({
        success: true,
        range,
        meals: meals.map((m) => ({
          id: m.id,
          date: m.date,
          mealType: m.mealType,
          time: m.time,
          description: m.description,
          calories: m.calories,
          proteinGrams: m.proteinGrams,
          carbsGrams: m.carbsGrams,
          fatGrams: m.fatGrams,
          items: m.items.map((item) => ({
            name: item.name,
            category: item.category,
            estimatedGrams: item.estimatedGrams,
            portionDescription: item.portionDescription,
            calories: item.calories,
            proteinGrams: item.proteinGrams,
            carbsGrams: item.carbsGrams,
            fatGrams: item.fatGrams,
          })),
        })),
      })
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })
  } catch (error) {
    logger.error('Error fetching food history', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
