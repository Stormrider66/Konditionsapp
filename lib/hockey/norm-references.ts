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

const HOCKEY_LEVELS = ['J18', 'J20', 'A-team'] as const
const HOCKEY_POSITIONS = ['All', 'C', 'W', 'D', 'G'] as const

type HockeyLevel = typeof HOCKEY_LEVELS[number]
type HockeyPosition = typeof HOCKEY_POSITIONS[number]

const POSITION_ADJUST: Record<HockeyPosition, Partial<Record<string, number>>> = {
  All: {},
  C: {
    vo2Max: 1,
    lt2SpeedKmh: 0.2,
    endurance7x40Resistance: 1,
    endurance7x40Drop: -0.5,
  },
  W: {
    sprint30m: -0.05,
    standingLongJump: 5,
    muscleLabWkg: 0.5,
  },
  D: {
    backSquat1RM: 0.05,
    benchPress1RM: 0.05,
    sprint30m: 0.05,
  },
  G: {
    vo2Max: -2,
    lt2SpeedKmh: -0.4,
    sprint30m: 0.15,
    standingLongJump: -5,
    backSquat1RM: -0.1,
    endurance7x40Resistance: -1,
  },
}

function normTemplate(
  metricKey: string,
  unit: string,
  baseTarget: Record<HockeyLevel, number>,
  baseElite: Record<HockeyLevel, number>,
  options: { lowerIsBetter?: boolean; priorityThreshold?: number | null } = {}
): HockeyNormReferenceConfig[] {
  return HOCKEY_LEVELS.flatMap((level) => (
    HOCKEY_POSITIONS.map((position) => {
      const adjust = POSITION_ADJUST[position][metricKey] ?? 0
      return {
        level,
        position,
        metricKey,
        target: roundNormTemplate(baseTarget[level] + adjust),
        elite: roundNormTemplate(baseElite[level] + adjust),
        priorityThreshold: options.priorityThreshold ?? null,
        unit,
        lowerIsBetter: options.lowerIsBetter,
      }
    })
  ))
}

function roundNormTemplate(value: number): number {
  return Math.round(value * 100) / 100
}

const SKELLEFTEA_HOCKEY_NORM_TEMPLATES: HockeyNormReferenceConfig[] = [
  ...normTemplate('vo2Max', 'ml/kg/min', { J18: 54, J20: 57, 'A-team': 60 }, { J18: 60, J20: 63, 'A-team': 66 }, { priorityThreshold: 50 }),
  ...normTemplate('lt2SpeedKmh', 'km/h', { J18: 14.0, J20: 14.8, 'A-team': 15.5 }, { J18: 15.5, J20: 16.2, 'A-team': 17.0 }),
  ...normTemplate('maxLactate', 'mmol/L', { J18: 10.0, J20: 10.5, 'A-team': 11.0 }, { J18: 13.0, J20: 14.0, 'A-team': 15.0 }),
  ...normTemplate('rampTimeSeconds', 's', { J18: 660, J20: 720, 'A-team': 780 }, { J18: 780, J20: 840, 'A-team': 900 }),
  ...normTemplate('sprint30m', 's', { J18: 4.35, J20: 4.20, 'A-team': 4.05 }, { J18: 4.10, J20: 3.95, 'A-team': 3.85 }, { lowerIsBetter: true, priorityThreshold: 4.55 }),
  ...normTemplate('standingLongJump', 'cm', { J18: 235, J20: 250, 'A-team': 260 }, { J18: 260, J20: 275, 'A-team': 285 }),
  ...normTemplate('threeJumpBest', 'cm', { J18: 720, J20: 760, 'A-team': 800 }, { J18: 800, J20: 840, 'A-team': 880 }),
  ...normTemplate('powerClean1RM', 'xBW', { J18: 0.9, J20: 1.0, 'A-team': 1.1 }, { J18: 1.1, J20: 1.2, 'A-team': 1.3 }),
  ...normTemplate('benchPress1RM', 'xBW', { J18: 1.0, J20: 1.1, 'A-team': 1.2 }, { J18: 1.2, J20: 1.3, 'A-team': 1.4 }),
  ...normTemplate('gripMax', 'kg', { J18: 55, J20: 60, 'A-team': 65 }, { J18: 65, J20: 70, 'A-team': 75 }),
  ...normTemplate('endurance7x40Resistance', '%', { J18: 92, J20: 93, 'A-team': 94 }, { J18: 96, J20: 97, 'A-team': 98 }),
  ...normTemplate('endurance7x40Drop', '%', { J18: 8, J20: 7, 'A-team': 6 }, { J18: 4, J20: 3.5, 'A-team': 3 }, { lowerIsBetter: true, priorityThreshold: 10 }),
]

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

  ...SKELLEFTEA_HOCKEY_NORM_TEMPLATES,
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
