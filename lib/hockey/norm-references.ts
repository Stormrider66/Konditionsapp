export interface HockeyNormReferenceConfig {
  id?: string
  level: string
  position: string
  metricKey: string
  target: number
  elite: number
  priorityThreshold?: number | null
  unit: string
  lowerIsBetter?: boolean
}

export interface HockeyNormGap {
  level: string
  position: string
  metricKey: string
  target: number
  elite: number
  unit: string
  lowerIsBetter: boolean
  gapToTarget: number
  gapToElite: number
  priorityThreshold: number | null
}

export const DEFAULT_HOCKEY_NORM_REFERENCES: HockeyNormReferenceConfig[] = [
  { level: 'J18', position: 'All', metricKey: 'muscleLabWkg', target: 22, elite: 27, unit: 'W/kg' },
  { level: 'J20', position: 'All', metricKey: 'muscleLabWkg', target: 25, elite: 30, unit: 'W/kg' },
  { level: 'A-team', position: 'All', metricKey: 'muscleLabWkg', target: 28, elite: 34, unit: 'W/kg' },
  { level: 'J18', position: 'All', metricKey: 'sprint10m', target: 1.95, elite: 1.82, unit: 's', lowerIsBetter: true },
  { level: 'J20', position: 'All', metricKey: 'sprint10m', target: 1.88, elite: 1.76, unit: 's', lowerIsBetter: true },
  { level: 'A-team', position: 'All', metricKey: 'sprint10m', target: 1.82, elite: 1.70, unit: 's', lowerIsBetter: true },
  { level: 'J18', position: 'All', metricKey: 'endurance7x40AverageKmh', target: 25.0, elite: 27.0, unit: 'km/h' },
  { level: 'J20', position: 'All', metricKey: 'endurance7x40AverageKmh', target: 26.0, elite: 28.0, unit: 'km/h' },
  { level: 'A-team', position: 'All', metricKey: 'endurance7x40AverageKmh', target: 27.0, elite: 29.0, unit: 'km/h' },
  { level: 'J18', position: 'All', metricKey: 'backSquat1RM', target: 1.5, elite: 1.8, unit: 'xBW' },
  { level: 'J20', position: 'All', metricKey: 'backSquat1RM', target: 1.7, elite: 2.0, unit: 'xBW' },
  { level: 'A-team', position: 'All', metricKey: 'backSquat1RM', target: 1.9, elite: 2.2, unit: 'xBW' },
]

export function normalizeNormPosition(position: string | null | undefined): string {
  const trimmed = (position ?? '').trim()
  return trimmed || 'All'
}

export function hockeyNormKey(norm: Pick<HockeyNormReferenceConfig, 'level' | 'position' | 'metricKey'>): string {
  return [
    norm.level.trim().toLowerCase(),
    normalizeNormPosition(norm.position).toLowerCase(),
    norm.metricKey.trim(),
  ].join(':')
}

export function mergeHockeyNormReferences(saved: HockeyNormReferenceConfig[]): HockeyNormReferenceConfig[] {
  const merged = new Map<string, HockeyNormReferenceConfig>()
  for (const norm of DEFAULT_HOCKEY_NORM_REFERENCES) {
    merged.set(hockeyNormKey(norm), { ...norm })
  }
  for (const norm of saved) {
    merged.set(hockeyNormKey(norm), {
      ...norm,
      position: normalizeNormPosition(norm.position),
      lowerIsBetter: norm.lowerIsBetter === true,
      priorityThreshold: norm.priorityThreshold ?? null,
    })
  }
  return Array.from(merged.values()).sort((a, b) => (
    a.level.localeCompare(b.level, 'sv') ||
    a.metricKey.localeCompare(b.metricKey, 'sv') ||
    a.position.localeCompare(b.position, 'sv')
  ))
}

export function findHockeyNormReference(
  norms: HockeyNormReferenceConfig[],
  level: string | null | undefined,
  position: string | null | undefined,
  metricKey: string
): HockeyNormReferenceConfig | null {
  const levelKey = (level ?? '').trim().toLowerCase()
  const positionKey = normalizeNormPosition(position).toLowerCase()
  return norms.find((norm) => (
    norm.metricKey === metricKey &&
    norm.level.trim().toLowerCase() === levelKey &&
    normalizeNormPosition(norm.position).toLowerCase() === positionKey
  )) ?? norms.find((norm) => (
    norm.metricKey === metricKey &&
    norm.level.trim().toLowerCase() === levelKey &&
    normalizeNormPosition(norm.position).toLowerCase() === 'all'
  )) ?? null
}

export function roundNormGap(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildHockeyNormGap(
  value: number | null | undefined,
  norm: HockeyNormReferenceConfig | null
): HockeyNormGap | null {
  if (value == null || !Number.isFinite(value) || !norm) return null
  const lowerIsBetter = norm.lowerIsBetter === true
  return {
    level: norm.level,
    position: normalizeNormPosition(norm.position),
    metricKey: norm.metricKey,
    target: norm.target,
    elite: norm.elite,
    unit: norm.unit,
    lowerIsBetter,
    gapToTarget: roundNormGap(lowerIsBetter ? norm.target - value : value - norm.target),
    gapToElite: roundNormGap(lowerIsBetter ? norm.elite - value : value - norm.elite),
    priorityThreshold: norm.priorityThreshold ?? null,
  }
}
