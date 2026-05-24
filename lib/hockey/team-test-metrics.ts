import { buildRepeatedSprintProfile } from '@/lib/hockey/ice-speed'

export interface HockeyMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

export type HockeyMetricValues = Record<string, number | null>
export type HockeyBenchmarkBand = 'top' | 'above' | 'team' | 'watch' | 'priority'

export const HOCKEY_METRICS: HockeyMetric[] = [
  { key: 'muscleLabWkg', label: 'MuscleLab AP/BW', unit: 'W/kg' },
  { key: 'backSquat1RM', label: 'Knäböj', unit: 'kg' },
  { key: 'powerClean1RM', label: 'Power clean', unit: 'kg' },
  { key: 'benchPress1RM', label: 'Bänkpress', unit: 'kg' },
  { key: 'pullUp1RM', label: 'Pull-up 1RM', unit: 'kg' },
  { key: 'gripMax', label: 'Grepp max', unit: 'kg' },
  { key: 'standingLongJump', label: 'Längdhopp', unit: 'cm' },
  { key: 'threeJumpBest', label: '3-steg bäst', unit: 'cm' },
  { key: 'beepScore', label: 'Beep', unit: 'nivå' },
  { key: 'wingate30sAveragePower', label: 'Wingate 30 s', unit: 'W' },
  { key: 'vo2Max', label: 'VO2max', unit: 'ml/kg/min' },
  { key: 'lt1SpeedKmh', label: 'LT1 fart', unit: 'km/h' },
  { key: 'lt1HeartRate', label: 'LT1 puls', unit: 'bpm' },
  { key: 'lt1Lactate', label: 'LT1 laktat', unit: 'mmol/L' },
  { key: 'lt2SpeedKmh', label: 'LT2 fart', unit: 'km/h' },
  { key: 'lt2HeartRate', label: 'LT2 puls', unit: 'bpm' },
  { key: 'lt2Lactate', label: 'LT2 laktat', unit: 'mmol/L' },
  { key: 'maxLactate', label: 'Max laktat', unit: 'mmol/L' },
  { key: 'maxHeartRate', label: 'Maxpuls', unit: 'bpm' },
  { key: 'rampTimeSeconds', label: 'Ramptid', unit: 's' },
  { key: 'sprint5m', label: '5m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint10m', label: '10m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20m', label: '20m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint30m', label: '30m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20mFly', label: '20m fly', unit: 's', lowerIsBetter: true },
  { key: 'sprint30mFly', label: '30m fly', unit: 's', lowerIsBetter: true },
  { key: 'agilityBest', label: '5-10-5 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Best', label: '7x40 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Average', label: '7x40 snitt', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40AverageKmh', label: '7x40 snittfart', unit: 'km/h' },
  { key: 'endurance7x40Drop', label: '7x40 drop', unit: '%', lowerIsBetter: true },
  { key: 'endurance7x40Resistance', label: '7x40 resistance', unit: '%' },
  { key: 'endurance7x40Score', label: 'RSA score', unit: 'pts' },
]

export const PATHWAY_METRIC_KEYS = [
  'muscleLabWkg',
  'sprint10m',
  'endurance7x40AverageKmh',
  'vo2Max',
  'lt2SpeedKmh',
  'backSquat1RM',
  'powerClean1RM',
] as const

export type HockeyTestForSummary = {
  clientId: string
  testDate: Date
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  sprint20mFly: number | null
  sprint30mFly: number | null
  agility505Left: number | null
  agility505Right: number | null
  endurance7x40: unknown
  gripStrengthLeft: number | null
  gripStrengthRight: number | null
  standingLongJump: number | null
  threeJumpLeft: number | null
  threeJumpRight: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  wingate30sAveragePower: number | null
  vo2Max: number | null
  lt1SpeedKmh: number | null
  lt1HeartRate: number | null
  lt1Lactate: number | null
  lt2SpeedKmh: number | null
  lt2HeartRate: number | null
  lt2Lactate: number | null
  maxLactate: number | null
  maxHeartRate: number | null
  rampTimeSeconds: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabMaxima: unknown
}

export function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

export function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

export function round(value: number | null, decimals = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function percentileFromRank(rank: number, coverage: number): number {
  if (coverage <= 1) return 100
  return Math.round(((coverage - rank) / (coverage - 1)) * 100)
}

export function benchmarkBand(percentile: number | null): HockeyBenchmarkBand {
  if (percentile == null) return 'team'
  if (percentile >= 80) return 'top'
  if (percentile >= 60) return 'above'
  if (percentile >= 40) return 'team'
  if (percentile >= 20) return 'watch'
  return 'priority'
}

export function orientedMetricValue(value: number | null, metric: HockeyMetric): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return metric.lowerIsBetter ? -value : value
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null
  const avg = mean(values)
  if (avg == null) return null
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length
  const sd = Math.sqrt(variance)
  return sd > 0 ? sd : null
}

export function metricValuesForTest(test: HockeyTestForSummary | undefined): HockeyMetricValues {
  const beepScore = test?.beepTestLevel
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null
  const endurance = enduranceValues(test?.endurance7x40)
  const repeatedSprint = buildRepeatedSprintProfile(endurance)

  return {
    muscleLabWkg: round(numberFromJson(test?.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
    backSquat1RM: test?.backSquat1RM ?? null,
    powerClean1RM: test?.powerClean1RM ?? null,
    benchPress1RM: test?.benchPress1RM ?? null,
    pullUp1RM: test?.pullUp1RM ?? null,
    gripMax: bestOf([test?.gripStrengthLeft, test?.gripStrengthRight]),
    standingLongJump: test?.standingLongJump ?? null,
    threeJumpBest: bestOf([test?.threeJumpLeft, test?.threeJumpRight]),
    beepScore: round(beepScore, 1),
    wingate30sAveragePower: round(test?.wingate30sAveragePower ?? null, 0),
    vo2Max: round(test?.vo2Max ?? null, 1),
    lt1SpeedKmh: round(test?.lt1SpeedKmh ?? null, 1),
    lt1HeartRate: test?.lt1HeartRate ?? null,
    lt1Lactate: round(test?.lt1Lactate ?? null, 1),
    lt2SpeedKmh: round(test?.lt2SpeedKmh ?? null, 1),
    lt2HeartRate: test?.lt2HeartRate ?? null,
    lt2Lactate: round(test?.lt2Lactate ?? null, 1),
    maxLactate: round(test?.maxLactate ?? null, 1),
    maxHeartRate: test?.maxHeartRate ?? null,
    rampTimeSeconds: test?.rampTimeSeconds ?? null,
    sprint5m: test?.sprint5m ?? null,
    sprint10m: test?.sprint10m ?? null,
    sprint20m: test?.sprint20m ?? null,
    sprint30m: test?.sprint30m ?? null,
    sprint20mFly: test?.sprint20mFly ?? null,
    sprint30mFly: test?.sprint30mFly ?? null,
    agilityBest: bestOf([test?.agility505Left, test?.agility505Right], true),
    endurance7x40Best: repeatedSprint.bestTimeS,
    endurance7x40Average: repeatedSprint.averageTimeS,
    endurance7x40AverageKmh: repeatedSprint.averageSpeedKmh,
    endurance7x40Drop: repeatedSprint.fatigueDropPct,
    endurance7x40Resistance: repeatedSprint.fatigueResistancePct,
    endurance7x40Score: null,
  }
}

export function improvementDelta(
  metric: HockeyMetric,
  latest: number | null,
  previous: number | null
): number | null {
  if (latest == null || previous == null) return null
  return round(metric.lowerIsBetter ? previous - latest : latest - previous, metric.unit === 's' ? 2 : 1)
}

export function enduranceValues(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

export function averageMetric(rows: Array<Record<string, number | null>>, key: string, unit = ''): number | null {
  const values = rows.map((row) => row[key]).filter((value): value is number => value != null)
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, unit === 's' ? 2 : 1)
}

export function normComparableValue(metricValue: number | null | undefined, unit: string, bodyWeightKg: number | null | undefined): number | null {
  if (metricValue == null || !Number.isFinite(metricValue)) return null
  if (unit === 'xBW') {
    return bodyWeightKg && bodyWeightKg > 0 ? round(metricValue / bodyWeightKg, 2) : null
  }
  return metricValue
}
