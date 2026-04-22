import { prisma } from '@/lib/prisma'
import { buildCorrectionHints } from './build-correction-hints'

const WEEKDAY_LABEL_SV = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'] as const

const MEAL_TYPE_LABEL_SV: Record<string, string> = {
  BREAKFAST: 'frukost',
  MORNING_SNACK: 'förmiddagsmellanmål',
  LUNCH: 'lunch',
  AFTERNOON_SNACK: 'eftermiddagsmellanmål',
  PRE_WORKOUT: 'före träning',
  POST_WORKOUT: 'efter träning',
  DINNER: 'middag',
  EVENING_SNACK: 'kvällsmellanmål',
}

export interface MemoryContextOptions {
  clientId: string
  /** How many days of meal history to consider. Default: 60. */
  lookbackDays?: number
  /** Minimum times a food must appear to be included as a "frequent". Default: 3. */
  minOccurrences?: number
}

export interface MemoryContextResult {
  /** Swedish prompt-ready text block. Empty string if user has too little history. */
  text: string
  /** Counts for debugging / telemetry. */
  stats: {
    mealsConsidered: number
    frequentFoods: number
    frequentMeals: number
    correctionsConsidered: number
    correctionHintsIncluded: boolean
  }
}

/**
 * Build a compact Swedish context string from a user's recent meals.
 * Surfaces top foods, top meal descriptions, and day-of-week/mealtime patterns.
 * Returns empty text if there's too little data to be useful (< 10 meals).
 */
export async function buildFoodMemoryContext(
  options: MemoryContextOptions,
): Promise<MemoryContextResult> {
  const { clientId, lookbackDays = 60, minOccurrences = 3 } = options

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)

  // Fetch meals and recent corrections in parallel — corrections are a
  // separate signal that can fire even if passive-log history is thin.
  const [meals, corrections] = await Promise.all([
    prisma.mealLog.findMany({
      where: { clientId, date: { gte: since } },
      select: {
        date: true,
        mealType: true,
        description: true,
        items: {
          select: {
            normalizedName: true,
            name: true,
            estimatedGrams: true,
            portionDescription: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 400,
    }),
    prisma.foodScanCorrection.findMany({
      where: { clientId, createdAt: { gte: since } },
      select: {
        aiItemsJson: true,
        finalItemsJson: true,
        correctionType: true,
        wentThroughRefine: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ])

  const correctionHints = buildCorrectionHints(corrections)

  // If we have neither enough meals nor any correction hints, bail early —
  // no useful context to inject.
  if (meals.length < 10 && !correctionHints) {
    return {
      text: '',
      stats: {
        mealsConsidered: meals.length,
        frequentFoods: 0,
        frequentMeals: 0,
        correctionsConsidered: corrections.length,
        correctionHintsIncluded: false,
      },
    }
  }

  // Top foods by (normalizedName, mealType)
  const foodKey = (n: string, m: string) => `${n}::${m}`
  const foodCounts = new Map<string, {
    normalizedName: string
    name: string
    mealType: string
    count: number
    grams: number[]
    portionDescriptions: string[]
  }>()

  // Top meal descriptions by (description, mealType)
  const mealCounts = new Map<string, { description: string; mealType: string; count: number }>()

  // Weekday / mealtime hotspots: (weekday, mealType) → top food name
  const weekdayHotspots = new Map<string, Map<string, number>>()

  for (const meal of meals) {
    const weekday = new Date(meal.date).getUTCDay()
    const weekdayKey = `${weekday}::${meal.mealType}`
    if (!weekdayHotspots.has(weekdayKey)) weekdayHotspots.set(weekdayKey, new Map())
    const hotspot = weekdayHotspots.get(weekdayKey)!

    if (meal.description) {
      const mKey = `${meal.description.toLowerCase().trim()}::${meal.mealType}`
      const existing = mealCounts.get(mKey)
      if (existing) existing.count += 1
      else mealCounts.set(mKey, { description: meal.description, mealType: meal.mealType, count: 1 })
    }

    for (const item of meal.items) {
      if (!item.normalizedName) continue
      const key = foodKey(item.normalizedName, meal.mealType)
      const bucket = foodCounts.get(key)
      if (bucket) {
        bucket.count += 1
        bucket.grams.push(item.estimatedGrams)
        if (item.portionDescription) bucket.portionDescriptions.push(item.portionDescription)
      } else {
        foodCounts.set(key, {
          normalizedName: item.normalizedName,
          name: item.name,
          mealType: meal.mealType,
          count: 1,
          grams: [item.estimatedGrams],
          portionDescriptions: item.portionDescription ? [item.portionDescription] : [],
        })
      }

      hotspot.set(item.normalizedName, (hotspot.get(item.normalizedName) ?? 0) + 1)
    }
  }

  const frequentFoods = Array.from(foodCounts.values())
    .filter((f) => f.count >= minOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const frequentMeals = Array.from(mealCounts.values())
    .filter((m) => m.count >= minOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Strong weekday signals: weekday+mealType where one food dominates (>=3 times, >=50% share)
  const strongSignals: string[] = []
  for (const [key, foods] of weekdayHotspots.entries()) {
    const [weekdayStr, mealType] = key.split('::')
    const totals = Array.from(foods.values()).reduce((a, b) => a + b, 0)
    if (totals < 3) continue
    const top = Array.from(foods.entries()).sort((a, b) => b[1] - a[1])[0]
    if (!top) continue
    const [name, count] = top
    if (count < 3 || count / totals < 0.5) continue
    strongSignals.push(
      `${WEEKDAY_LABEL_SV[Number(weekdayStr)]} ${MEAL_TYPE_LABEL_SV[mealType] ?? mealType}: ${name} (${count}/${totals} ggr)`,
    )
    if (strongSignals.length >= 5) break
  }

  if (
    frequentFoods.length === 0 &&
    frequentMeals.length === 0 &&
    strongSignals.length === 0 &&
    !correctionHints
  ) {
    return {
      text: '',
      stats: {
        mealsConsidered: meals.length,
        frequentFoods: 0,
        frequentMeals: 0,
        correctionsConsidered: corrections.length,
        correctionHintsIncluded: false,
      },
    }
  }

  const lines: string[] = []
  if (correctionHints) {
    lines.push(correctionHints)
    lines.push('')
  }
  lines.push('ANVÄNDARENS MATHISTORIK (de senaste ' + lookbackDays + ' dagarna — ledtråd, inte facit):')

  if (frequentFoods.length > 0) {
    lines.push('Vanliga livsmedel per måltidstyp:')
    for (const f of frequentFoods.slice(0, 12)) {
      const medianGrams = median(f.grams)
      const portion = mostCommon(f.portionDescriptions)
      const portionHint = portion ? `, typiskt "${portion}"` : ''
      lines.push(
        `- ${MEAL_TYPE_LABEL_SV[f.mealType] ?? f.mealType}: ${f.name} (~${Math.round(medianGrams)}g${portionHint}, ${f.count} ggr)`,
      )
    }
  }

  if (frequentMeals.length > 0) {
    lines.push('Vanliga måltider:')
    for (const m of frequentMeals) {
      lines.push(`- ${MEAL_TYPE_LABEL_SV[m.mealType] ?? m.mealType}: ${m.description} (${m.count} ggr)`)
    }
  }

  if (strongSignals.length > 0) {
    lines.push('Starka veckodagsmönster:')
    for (const s of strongSignals) lines.push(`- ${s}`)
  }

  lines.push('')
  lines.push(
    'VIKTIGT: Historiken är en ledtråd, inte facit. Om bilden tydligt visar något annat — lita på bilden, inte på historiken.',
  )

  return {
    text: lines.join('\n'),
    stats: {
      mealsConsidered: meals.length,
      frequentFoods: frequentFoods.length,
      frequentMeals: frequentMeals.length,
      correctionsConsidered: corrections.length,
      correctionHintsIncluded: Boolean(correctionHints),
    },
  }
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mostCommon(xs: string[]): string | null {
  if (xs.length === 0) return null
  const counts = new Map<string, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [x, c] of counts.entries()) {
    if (c > bestCount) {
      best = x
      bestCount = c
    }
  }
  return best
}
