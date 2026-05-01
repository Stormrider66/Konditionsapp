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
  // General defaults are the fallback when a roster has no clear hockey position.
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

  // Position defaults: intentionally close to the general levels, but tuned
  // toward the physical demands coaches usually care about by role.
  { level: 'J18', position: 'C', metricKey: 'muscleLabWkg', target: 22.5, elite: 27.5, unit: 'W/kg' },
  { level: 'J20', position: 'C', metricKey: 'muscleLabWkg', target: 25.5, elite: 30.5, unit: 'W/kg' },
  { level: 'A-team', position: 'C', metricKey: 'muscleLabWkg', target: 28.5, elite: 34.5, unit: 'W/kg' },
  { level: 'J18', position: 'C', metricKey: 'sprint10m', target: 1.93, elite: 1.80, unit: 's', lowerIsBetter: true },
  { level: 'J20', position: 'C', metricKey: 'sprint10m', target: 1.86, elite: 1.74, unit: 's', lowerIsBetter: true },
  { level: 'A-team', position: 'C', metricKey: 'sprint10m', target: 1.80, elite: 1.68, unit: 's', lowerIsBetter: true },
  { level: 'J18', position: 'C', metricKey: 'endurance7x40AverageKmh', target: 25.5, elite: 27.5, unit: 'km/h' },
  { level: 'J20', position: 'C', metricKey: 'endurance7x40AverageKmh', target: 26.5, elite: 28.5, unit: 'km/h' },
  { level: 'A-team', position: 'C', metricKey: 'endurance7x40AverageKmh', target: 27.5, elite: 29.5, unit: 'km/h' },
  { level: 'J18', position: 'C', metricKey: 'backSquat1RM', target: 1.5, elite: 1.85, unit: 'xBW' },
  { level: 'J20', position: 'C', metricKey: 'backSquat1RM', target: 1.7, elite: 2.05, unit: 'xBW' },
  { level: 'A-team', position: 'C', metricKey: 'backSquat1RM', target: 1.9, elite: 2.25, unit: 'xBW' },

  { level: 'J18', position: 'W', metricKey: 'muscleLabWkg', target: 23, elite: 28, unit: 'W/kg' },
  { level: 'J20', position: 'W', metricKey: 'muscleLabWkg', target: 26, elite: 31, unit: 'W/kg' },
  { level: 'A-team', position: 'W', metricKey: 'muscleLabWkg', target: 29, elite: 35, unit: 'W/kg' },
  { level: 'J18', position: 'W', metricKey: 'sprint10m', target: 1.90, elite: 1.78, unit: 's', lowerIsBetter: true },
  { level: 'J20', position: 'W', metricKey: 'sprint10m', target: 1.84, elite: 1.72, unit: 's', lowerIsBetter: true },
  { level: 'A-team', position: 'W', metricKey: 'sprint10m', target: 1.78, elite: 1.66, unit: 's', lowerIsBetter: true },
  { level: 'J18', position: 'W', metricKey: 'endurance7x40AverageKmh', target: 25.2, elite: 27.2, unit: 'km/h' },
  { level: 'J20', position: 'W', metricKey: 'endurance7x40AverageKmh', target: 26.2, elite: 28.2, unit: 'km/h' },
  { level: 'A-team', position: 'W', metricKey: 'endurance7x40AverageKmh', target: 27.2, elite: 29.2, unit: 'km/h' },
  { level: 'J18', position: 'W', metricKey: 'backSquat1RM', target: 1.45, elite: 1.75, unit: 'xBW' },
  { level: 'J20', position: 'W', metricKey: 'backSquat1RM', target: 1.65, elite: 1.95, unit: 'xBW' },
  { level: 'A-team', position: 'W', metricKey: 'backSquat1RM', target: 1.85, elite: 2.15, unit: 'xBW' },

  { level: 'J18', position: 'D', metricKey: 'muscleLabWkg', target: 21.5, elite: 26.5, unit: 'W/kg' },
  { level: 'J20', position: 'D', metricKey: 'muscleLabWkg', target: 24.5, elite: 29.5, unit: 'W/kg' },
  { level: 'A-team', position: 'D', metricKey: 'muscleLabWkg', target: 27.5, elite: 33.5, unit: 'W/kg' },
  { level: 'J18', position: 'D', metricKey: 'sprint10m', target: 1.98, elite: 1.85, unit: 's', lowerIsBetter: true },
  { level: 'J20', position: 'D', metricKey: 'sprint10m', target: 1.91, elite: 1.79, unit: 's', lowerIsBetter: true },
  { level: 'A-team', position: 'D', metricKey: 'sprint10m', target: 1.85, elite: 1.73, unit: 's', lowerIsBetter: true },
  { level: 'J18', position: 'D', metricKey: 'endurance7x40AverageKmh', target: 24.8, elite: 26.8, unit: 'km/h' },
  { level: 'J20', position: 'D', metricKey: 'endurance7x40AverageKmh', target: 25.8, elite: 27.8, unit: 'km/h' },
  { level: 'A-team', position: 'D', metricKey: 'endurance7x40AverageKmh', target: 26.8, elite: 28.8, unit: 'km/h' },
  { level: 'J18', position: 'D', metricKey: 'backSquat1RM', target: 1.55, elite: 1.85, unit: 'xBW' },
  { level: 'J20', position: 'D', metricKey: 'backSquat1RM', target: 1.75, elite: 2.05, unit: 'xBW' },
  { level: 'A-team', position: 'D', metricKey: 'backSquat1RM', target: 1.95, elite: 2.25, unit: 'xBW' },

  { level: 'J18', position: 'G', metricKey: 'muscleLabWkg', target: 20.5, elite: 25.5, unit: 'W/kg' },
  { level: 'J20', position: 'G', metricKey: 'muscleLabWkg', target: 23, elite: 28, unit: 'W/kg' },
  { level: 'A-team', position: 'G', metricKey: 'muscleLabWkg', target: 25.5, elite: 31.5, unit: 'W/kg' },
  { level: 'J18', position: 'G', metricKey: 'sprint10m', target: 2.05, elite: 1.92, unit: 's', lowerIsBetter: true },
  { level: 'J20', position: 'G', metricKey: 'sprint10m', target: 1.98, elite: 1.86, unit: 's', lowerIsBetter: true },
  { level: 'A-team', position: 'G', metricKey: 'sprint10m', target: 1.92, elite: 1.80, unit: 's', lowerIsBetter: true },
  { level: 'J18', position: 'G', metricKey: 'endurance7x40AverageKmh', target: 24.0, elite: 26.0, unit: 'km/h' },
  { level: 'J20', position: 'G', metricKey: 'endurance7x40AverageKmh', target: 25.0, elite: 27.0, unit: 'km/h' },
  { level: 'A-team', position: 'G', metricKey: 'endurance7x40AverageKmh', target: 26.0, elite: 28.0, unit: 'km/h' },
  { level: 'J18', position: 'G', metricKey: 'backSquat1RM', target: 1.35, elite: 1.65, unit: 'xBW' },
  { level: 'J20', position: 'G', metricKey: 'backSquat1RM', target: 1.55, elite: 1.85, unit: 'xBW' },
  { level: 'A-team', position: 'G', metricKey: 'backSquat1RM', target: 1.75, elite: 2.05, unit: 'xBW' },
]

export function normalizeNormPosition(position: string | null | undefined): string {
  const trimmed = (position ?? '').trim()
  if (!trimmed) return 'All'
  const raw = trimmed.toLowerCase()
  if (raw === 'all' || raw === 'alla') return 'All'
  if (['g', 'goalie', 'goalkeeper', 'målvakt', 'malvakt'].some((needle) => raw === needle || raw.includes(needle))) return 'G'
  if (['d', 'defense', 'defence', 'defender', 'back'].some((needle) => raw === needle || raw.includes(needle))) return 'D'
  if (['c', 'center', 'centre', 'centerforward'].some((needle) => raw === needle || raw.includes(needle))) return 'C'
  if (['w', 'wing', 'winger', 'forward', 'fwd', 'lw', 'rw'].some((needle) => raw === needle || raw.includes(needle))) return 'W'
  return trimmed
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
