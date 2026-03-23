/**
 * Temporal analysis helpers for MVA variable extractors.
 * Pure utility functions for trend detection and time-series statistics.
 */

interface TimePoint {
  date: Date
  value: number
}

/**
 * OLS linear regression slope over time.
 * Returns slope per day, or null if insufficient data points.
 */
export function trendSlope(items: TimePoint[], minPoints = 5): number | null {
  if (items.length < minPoints) return null

  // Convert dates to days from first point
  const t0 = items[0].date.getTime()
  const points = items.map((p) => ({
    x: (p.date.getTime() - t0) / (1000 * 60 * 60 * 24), // days
    y: p.value,
  }))

  const n = points.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null

  return (n * sumXY - sumX * sumY) / denom
}

/**
 * Standard deviation (population).
 */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Coefficient of variation (stdDev / mean).
 * Returns null if mean is zero or insufficient data.
 */
export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return null
  const sd = stdDev(values)
  if (sd == null) return null
  return sd / Math.abs(mean)
}

/**
 * Extract a time series of {date, value} from an array, filtering nulls.
 */
export function extractTimeSeries<T>(
  items: T[],
  dateGetter: (item: T) => Date,
  valueGetter: (item: T) => number | null,
  maxItems?: number
): TimePoint[] {
  const result: TimePoint[] = []
  const limit = maxItems ?? items.length

  for (let i = 0; i < Math.min(items.length, limit); i++) {
    const v = valueGetter(items[i])
    if (v != null && isFinite(v)) {
      result.push({ date: dateGetter(items[i]), value: v })
    }
  }

  return result
}

/**
 * Count items within the last N days.
 */
export function countRecent<T>(
  items: T[],
  dateGetter: (item: T) => Date,
  days = 30
): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  let count = 0
  for (const item of items) {
    if (dateGetter(item) >= cutoff) count++
  }
  return count
}
