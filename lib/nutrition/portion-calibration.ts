import { prisma } from '@/lib/prisma'

/**
 * Per-food historical stats derived from MealFoodItem rows.
 */
export interface PortionStats {
  count: number
  /** Median grams after trimming extreme outliers. */
  medianGrams: number
  /** The user's most common portionDescription for this food (if any). */
  commonPortionDescription: string | null
}

export interface CalibratableItem {
  name: string
  estimatedGrams: number
  portionDescription?: string | null
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number
  saturatedFatGrams?: number
  monounsaturatedFatGrams?: number
  polyunsaturatedFatGrams?: number
  sugarGrams?: number
  complexCarbsGrams?: number
}

export interface PortionSnap {
  /** Original index in the scan's items array. */
  itemIndex: number
  name: string
  originalGrams: number
  snappedGrams: number
  /** How many historical observations of this food the snap was based on. */
  historicalCount: number
  /** Median from history (pre-blend). */
  historicalMedianGrams: number
}

export interface CalibrationResult<T extends CalibratableItem> {
  /** Items with potentially adjusted grams + scaled macros + preferred portion description. */
  items: T[]
  snaps: PortionSnap[]
}

const MIN_HISTORICAL_COUNT = 3
/** Within this ±band of the user's median we trust Gemini. */
const TRUST_BAND = 0.4
/** Blend weight on user median when Gemini is outside the trust band. */
const MEDIAN_WEIGHT = 0.6

const normalizeName = (name: string) => name.toLowerCase().trim()

/**
 * Snap Gemini's gram estimates toward the user's typical portion for a food
 * when Gemini is clearly off. Scales macros proportionally to the new grams.
 *
 * Pure function — takes pre-fetched stats, does not hit the DB. Tests can
 * pass synthetic stats without mocking Prisma.
 */
export function calibratePortions<T extends CalibratableItem>(
  items: T[],
  statsByNormalizedName: Map<string, PortionStats>,
): CalibrationResult<T> {
  const snaps: PortionSnap[] = []
  const calibrated = items.map((item, itemIndex) => {
    const key = normalizeName(item.name)
    const stats = statsByNormalizedName.get(key)
    if (!stats || stats.count < MIN_HISTORICAL_COUNT) return item

    const g = item.estimatedGrams
    if (!Number.isFinite(g) || g <= 0) return item

    const median = stats.medianGrams
    if (!Number.isFinite(median) || median <= 0) return item

    const deviation = Math.abs(g - median) / median
    if (deviation <= TRUST_BAND) return item

    const snappedGrams = Math.round(MEDIAN_WEIGHT * median + (1 - MEDIAN_WEIGHT) * g)
    if (snappedGrams === g || snappedGrams <= 0) return item

    const scale = snappedGrams / g

    snaps.push({
      itemIndex,
      name: item.name,
      originalGrams: g,
      snappedGrams,
      historicalCount: stats.count,
      historicalMedianGrams: median,
    })

    return {
      ...item,
      estimatedGrams: snappedGrams,
      portionDescription: stats.commonPortionDescription ?? item.portionDescription ?? '',
      calories: round1(item.calories * scale),
      proteinGrams: round1(item.proteinGrams * scale),
      carbsGrams: round1(item.carbsGrams * scale),
      fatGrams: round1(item.fatGrams * scale),
      fiberGrams: round1(item.fiberGrams * scale),
      saturatedFatGrams:
        item.saturatedFatGrams != null ? round1(item.saturatedFatGrams * scale) : item.saturatedFatGrams,
      monounsaturatedFatGrams:
        item.monounsaturatedFatGrams != null ? round1(item.monounsaturatedFatGrams * scale) : item.monounsaturatedFatGrams,
      polyunsaturatedFatGrams:
        item.polyunsaturatedFatGrams != null ? round1(item.polyunsaturatedFatGrams * scale) : item.polyunsaturatedFatGrams,
      sugarGrams: item.sugarGrams != null ? round1(item.sugarGrams * scale) : item.sugarGrams,
      complexCarbsGrams:
        item.complexCarbsGrams != null ? round1(item.complexCarbsGrams * scale) : item.complexCarbsGrams,
    }
  })
  return { items: calibrated, snaps }
}

/**
 * Recompute a scan result's totals from its (potentially-calibrated) items.
 * Keeps behavior consistent with the client-side calculateFoodTotals.
 */
export function recomputeTotals<T extends CalibratableItem>(items: T[]) {
  const totals = {
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    fiberGrams: 0,
    saturatedFatGrams: 0,
    monounsaturatedFatGrams: 0,
    polyunsaturatedFatGrams: 0,
    sugarGrams: 0,
    complexCarbsGrams: 0,
  }
  let hasAnyEnhanced = false
  for (const item of items) {
    totals.calories += item.calories
    totals.proteinGrams += item.proteinGrams
    totals.carbsGrams += item.carbsGrams
    totals.fatGrams += item.fatGrams
    totals.fiberGrams += item.fiberGrams
    if (item.saturatedFatGrams != null) {
      totals.saturatedFatGrams += item.saturatedFatGrams
      hasAnyEnhanced = true
    }
    if (item.monounsaturatedFatGrams != null) {
      totals.monounsaturatedFatGrams += item.monounsaturatedFatGrams
      hasAnyEnhanced = true
    }
    if (item.polyunsaturatedFatGrams != null) {
      totals.polyunsaturatedFatGrams += item.polyunsaturatedFatGrams
      hasAnyEnhanced = true
    }
    if (item.sugarGrams != null) {
      totals.sugarGrams += item.sugarGrams
      hasAnyEnhanced = true
    }
    if (item.complexCarbsGrams != null) {
      totals.complexCarbsGrams += item.complexCarbsGrams
      hasAnyEnhanced = true
    }
  }
  const rounded = {
    calories: round1(totals.calories),
    proteinGrams: round1(totals.proteinGrams),
    carbsGrams: round1(totals.carbsGrams),
    fatGrams: round1(totals.fatGrams),
    fiberGrams: round1(totals.fiberGrams),
  }
  if (!hasAnyEnhanced) return rounded
  return {
    ...rounded,
    saturatedFatGrams: round1(totals.saturatedFatGrams),
    monounsaturatedFatGrams: round1(totals.monounsaturatedFatGrams),
    polyunsaturatedFatGrams: round1(totals.polyunsaturatedFatGrams),
    sugarGrams: round1(totals.sugarGrams),
    complexCarbsGrams: round1(totals.complexCarbsGrams),
  }
}

/**
 * Fetch portion stats for a set of foods from a client's recent history.
 * Keeps lookups bounded — caps per-food rows and trims outliers before
 * computing the median so a single extreme logging mistake doesn't skew
 * everything.
 */
export async function fetchPortionStats(
  clientId: string,
  normalizedNames: string[],
  options: { lookbackDays?: number } = {},
): Promise<Map<string, PortionStats>> {
  const { lookbackDays = 90 } = options
  const out = new Map<string, PortionStats>()
  if (normalizedNames.length === 0) return out

  const uniqueNames = Array.from(new Set(normalizedNames.map((n) => n.trim().toLowerCase()).filter(Boolean)))
  if (uniqueNames.length === 0) return out

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)

  const rows = await prisma.mealFoodItem.findMany({
    where: {
      normalizedName: { in: uniqueNames },
      mealLog: { clientId, date: { gte: since } },
    },
    select: {
      normalizedName: true,
      estimatedGrams: true,
      portionDescription: true,
    },
    // Guardrail — a user with 10 years of "havregrynsgröt" logs shouldn't pull
    // thousands of rows. 90 days × a few items per name is plenty.
    take: 2000,
  })

  const grouped = new Map<string, { grams: number[]; portions: string[] }>()
  for (const row of rows) {
    const bucket = grouped.get(row.normalizedName) ?? { grams: [], portions: [] }
    if (Number.isFinite(row.estimatedGrams) && row.estimatedGrams > 0) {
      bucket.grams.push(row.estimatedGrams)
    }
    if (row.portionDescription) bucket.portions.push(row.portionDescription)
    grouped.set(row.normalizedName, bucket)
  }

  for (const [name, bucket] of grouped.entries()) {
    if (bucket.grams.length === 0) continue
    out.set(name, {
      count: bucket.grams.length,
      medianGrams: trimmedMedian(bucket.grams),
      commonPortionDescription: mostCommon(bucket.portions),
    })
  }
  return out
}

function trimmedMedian(xs: number[]): number {
  if (xs.length === 0) return 0
  if (xs.length < 5) return median(xs)
  const sorted = [...xs].sort((a, b) => a - b)
  // Drop top & bottom 10% (at least 1 each) to resist logging outliers
  const dropCount = Math.max(1, Math.floor(sorted.length * 0.1))
  const trimmed = sorted.slice(dropCount, sorted.length - dropCount)
  return median(trimmed)
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

function round1(n: number) {
  return Math.round(n * 10) / 10
}
