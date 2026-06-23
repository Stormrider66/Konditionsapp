export type NullableNumberSeries = Array<number | null>

export interface CardioSensorSampleSeries {
  version: 1
  sampleRateHz: 1
  power?: NullableNumberSeries
  heartRate?: NullableNumberSeries
  cadence?: NullableNumberSeries
  strokeRate?: NullableNumberSeries
  paceSeconds?: NullableNumberSeries
  distanceMeters?: NullableNumberSeries
  calories?: NullableNumberSeries
  speedKmh?: NullableNumberSeries
}

export interface CardioSensorSeriesStats {
  sampleCount: number
  richSampleMetrics: string[]
  avgPower: number | null
  maxPower: number | null
  avgHeartRate: number | null
  maxHeartRate: number | null
  firstHeartRate: number | null
  lastHeartRate: number | null
  heartRateDrop: number | null
  avgCadence: number | null
  avgStrokeRate: number | null
  distanceMeters: number | null
  calories: number | null
}

const MAX_SAMPLE_SECONDS = 7200

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function rounded(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function sanitizeSeries(value: unknown, digits = 0): NullableNumberSeries | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .slice(0, MAX_SAMPLE_SECONDS)
    .map((item) => (isFiniteNumber(item) ? rounded(item, digits) : null))
}

function hasAnyNumber(series: NullableNumberSeries | undefined): series is NullableNumberSeries {
  return Array.isArray(series) && series.some((item) => isFiniteNumber(item))
}

function seriesLength(series: CardioSensorSampleSeries): number {
  return Math.max(
    0,
    series.power?.length ?? 0,
    series.heartRate?.length ?? 0,
    series.cadence?.length ?? 0,
    series.strokeRate?.length ?? 0,
    series.paceSeconds?.length ?? 0,
    series.distanceMeters?.length ?? 0,
    series.calories?.length ?? 0,
    series.speedKmh?.length ?? 0,
  )
}

function denseSeries(series: CardioSensorSampleSeries): CardioSensorSampleSeries {
  const length = seriesLength(series)
  const fill = (values: NullableNumberSeries | undefined) => (
    hasAnyNumber(values)
      ? Array.from({ length }, (_, index) => values[index] ?? null)
      : undefined
  )

  const next: CardioSensorSampleSeries = { version: 1, sampleRateHz: 1 }
  const power = fill(series.power)
  const heartRate = fill(series.heartRate)
  const cadence = fill(series.cadence)
  const strokeRate = fill(series.strokeRate)
  const paceSeconds = fill(series.paceSeconds)
  const distanceMeters = fill(series.distanceMeters)
  const calories = fill(series.calories)
  const speedKmh = fill(series.speedKmh)

  if (power) next.power = power
  if (heartRate) next.heartRate = heartRate
  if (cadence) next.cadence = cadence
  if (strokeRate) next.strokeRate = strokeRate
  if (paceSeconds) next.paceSeconds = paceSeconds
  if (distanceMeters) next.distanceMeters = distanceMeters
  if (calories) next.calories = calories
  if (speedKmh) next.speedKmh = speedKmh
  return next
}

export function sanitizeCardioSensorSamples(value: unknown): NullableNumberSeries | CardioSensorSampleSeries | undefined {
  if (Array.isArray(value)) {
    return sanitizeSeries(value)
  }

  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const next: CardioSensorSampleSeries = {
    version: 1,
    sampleRateHz: 1,
    power: sanitizeSeries(record.power),
    heartRate: sanitizeSeries(record.heartRate),
    cadence: sanitizeSeries(record.cadence, 1),
    strokeRate: sanitizeSeries(record.strokeRate, 1),
    paceSeconds: sanitizeSeries(record.paceSeconds),
    distanceMeters: sanitizeSeries(record.distanceMeters, 1),
    calories: sanitizeSeries(record.calories),
    speedKmh: sanitizeSeries(record.speedKmh, 1),
  }
  const dense = denseSeries(next)
  return seriesLength(dense) > 0 ? dense : undefined
}

export function normalizeCardioSensorSamples(value: unknown): CardioSensorSampleSeries | null {
  const sanitized = sanitizeCardioSensorSamples(value)
  if (!sanitized) return null
  if (Array.isArray(sanitized)) {
    return hasAnyNumber(sanitized)
      ? { version: 1, sampleRateHz: 1, power: sanitized }
      : null
  }
  return sanitized
}

export function extractPowerSamples(value: unknown): number[] {
  const series = normalizeCardioSensorSamples(value)
  return (series?.power ?? []).filter(isFiniteNumber)
}

function numbers(series: NullableNumberSeries | undefined): number[] {
  return (series ?? []).filter(isFiniteNumber)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function max(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null
}

function last(values: number[]): number | null {
  return values.length > 0 ? values[values.length - 1] : null
}

function metricNames(series: CardioSensorSampleSeries): string[] {
  const names: string[] = []
  if (hasAnyNumber(series.power)) names.push('power')
  if (hasAnyNumber(series.heartRate)) names.push('heartRate')
  if (hasAnyNumber(series.cadence)) names.push('cadence')
  if (hasAnyNumber(series.strokeRate)) names.push('strokeRate')
  if (hasAnyNumber(series.paceSeconds)) names.push('pace')
  if (hasAnyNumber(series.distanceMeters)) names.push('distance')
  if (hasAnyNumber(series.calories)) names.push('calories')
  if (hasAnyNumber(series.speedKmh)) names.push('speed')
  return names
}

export function summarizeCardioSensorSamples(value: unknown): CardioSensorSeriesStats {
  const series = normalizeCardioSensorSamples(value)
  if (!series) {
    return {
      sampleCount: 0,
      richSampleMetrics: [],
      avgPower: null,
      maxPower: null,
      avgHeartRate: null,
      maxHeartRate: null,
      firstHeartRate: null,
      lastHeartRate: null,
      heartRateDrop: null,
      avgCadence: null,
      avgStrokeRate: null,
      distanceMeters: null,
      calories: null,
    }
  }

  const power = numbers(series.power)
  const heartRate = numbers(series.heartRate)
  const cadence = numbers(series.cadence)
  const strokeRate = numbers(series.strokeRate)
  const distanceMeters = numbers(series.distanceMeters)
  const calories = numbers(series.calories)
  const firstHeartRate = heartRate[0] ?? null
  const lastHeartRate = last(heartRate)
  const heartRateDrop = firstHeartRate != null && lastHeartRate != null
    ? firstHeartRate - lastHeartRate
    : null

  return {
    sampleCount: seriesLength(series),
    richSampleMetrics: metricNames(series),
    avgPower: mean(power) != null ? rounded(mean(power)!) : null,
    maxPower: max(power),
    avgHeartRate: mean(heartRate) != null ? rounded(mean(heartRate)!) : null,
    maxHeartRate: max(heartRate),
    firstHeartRate,
    lastHeartRate,
    heartRateDrop,
    avgCadence: mean(cadence) != null ? rounded(mean(cadence)!, 1) : null,
    avgStrokeRate: mean(strokeRate) != null ? rounded(mean(strokeRate)!, 1) : null,
    distanceMeters: last(distanceMeters),
    calories: last(calories),
  }
}
