export interface HockeyDataQualityArea<Key extends string = string> {
  id: string
  label: string
  description: string
  keys: readonly Key[]
  requiredKeys: readonly Key[]
}

export interface HockeyDataQualitySummary<Key extends string = string> {
  area: HockeyDataQualityArea<Key>
  presentCells: number
  totalCells: number
  coveragePercent: number
  completeAthletes: number
  missingAthletes: Array<{
    id: string
    name: string
    position: string
    missingLabels: string[]
  }>
}

export interface HockeyDataQualityWatchItem {
  id: string
  name: string
  position: string
  latestTestDate: string | null
  missingCount: number
  missingLabels: string[]
  warningCount: number
}

export interface HockeyDataQualityReport<Key extends string = string> {
  areaSummaries: HockeyDataQualitySummary<Key>[]
  watchlist: HockeyDataQualityWatchItem[]
  totalCoveragePercent: number
  analysisReadyAthletes: number
  athletesWithoutTests: number
  warningCount: number
}

export interface HockeyDataQualityAthlete {
  id?: string
  name: string
  position?: string | { key?: string; label?: string } | null
  latestTestDate?: string | null
  metrics: Record<string, number | null | undefined>
  qualityFlags?: Array<{ severity?: string }>
}

export interface SimcaRowQuality {
  simca_row_core_coverage_pct: number
  simca_row_required_missing_count: number
  simca_row_required_missing_keys: string
  simca_row_analysis_ready: 0 | 1
}

export interface SimcaExportQualitySummary {
  rowCount: number
  averageCoreCoveragePercent: number
  analysisReadyRows: number
  missingRequiredCells: number
  areaCoverage: Array<{
    id: string
    label: string
    coveragePercent: number
  }>
}

export type SimcaExportPresetId =
  | 'full'
  | 'explosive_power'
  | 'on_ice_speed'
  | 'repeated_sprint'
  | 'strength'
  | 'target_gaps'
  | 'development_pathway'

export const HOCKEY_DATA_QUALITY_AREAS: readonly HockeyDataQualityArea[] = [
  {
    id: 'power',
    label: 'Power/hopp',
    description: 'MuscleLab, längdhopp och 3-steg.',
    keys: ['muscleLabWkg', 'standingLongJump', 'threeJumpBest'],
    requiredKeys: ['muscleLabWkg', 'standingLongJump'],
  },
  {
    id: 'strength',
    label: 'Styrka',
    description: 'Baslyft, pull-up och greppstyrka.',
    keys: ['backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'gripMax'],
    requiredKeys: ['backSquat1RM', 'powerClean1RM', 'benchPress1RM'],
  },
  {
    id: 'ice-speed',
    label: 'Isfart',
    description: 'Acceleration, 30m och riktningsförändring.',
    keys: ['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'agilityBest'],
    requiredKeys: ['sprint10m', 'sprint30m', 'agilityBest'],
  },
  {
    id: 'repeated-sprint',
    label: '7x40',
    description: 'Upprepad sprintförmåga och farttålighet.',
    keys: ['endurance7x40Best', 'endurance7x40AverageKmh', 'endurance7x40Resistance', 'endurance7x40Drop'],
    requiredKeys: ['endurance7x40AverageKmh', 'endurance7x40Resistance'],
  },
  {
    id: 'lab',
    label: 'Lab/motor',
    description: 'VO2max, LT2 och rampdata.',
    keys: ['vo2max', 'lt2SpeedKmh', 'lt2HeartRate', 'maxHeartRate', 'maxLactate', 'rampDurationMin'],
    requiredKeys: ['vo2max', 'lt2SpeedKmh', 'maxHeartRate'],
  },
] as const

export const SIMCA_QUALITY_AREAS: readonly HockeyDataQualityArea[] = [
  {
    id: 'power',
    label: 'Power/jump',
    description: 'MuscleLab, long jump and 3-jump variables.',
    keys: ['musclelab_ap_w_per_kg_bw', 'standing_long_jump_cm', 'three_jump_best_cm'],
    requiredKeys: ['musclelab_ap_w_per_kg_bw', 'standing_long_jump_cm'],
  },
  {
    id: 'strength',
    label: 'Strength',
    description: 'Core lifts, pull-up and grip variables.',
    keys: ['back_squat_1rm_kg', 'power_clean_1rm_kg', 'bench_press_1rm_kg', 'pullup_1rm_kg', 'grip_max_kg'],
    requiredKeys: ['back_squat_1rm_kg', 'power_clean_1rm_kg', 'bench_press_1rm_kg'],
  },
  {
    id: 'ice-speed',
    label: 'Ice speed',
    description: 'Acceleration, 30m speed and change of direction.',
    keys: ['sprint_5m_s', 'sprint_10m_s', 'sprint_20m_s', 'sprint_30m_s', 'agility_505_best_s'],
    requiredKeys: ['sprint_10m_s', 'sprint_30m_s', 'agility_505_best_s'],
  },
  {
    id: 'repeated-sprint',
    label: '7x40',
    description: 'Repeated sprint speed and fatigue resistance.',
    keys: ['endurance_7x40_best_s', 'endurance_7x40_mean_kmh', 'endurance_7x40_resistance_pct', 'endurance_7x40_drop_pct'],
    requiredKeys: ['endurance_7x40_mean_kmh', 'endurance_7x40_resistance_pct'],
  },
  {
    id: 'lab',
    label: 'Lab/engine',
    description: 'VO2max, LT2 and ramp variables.',
    keys: ['vo2max_ml_kg_min', 'lt2_speed_kmh', 'lt2_heart_rate_bpm', 'max_heart_rate_bpm', 'max_lactate_mmol_l', 'ramp_duration_min'],
    requiredKeys: ['vo2max_ml_kg_min', 'lt2_speed_kmh', 'max_heart_rate_bpm'],
  },
] as const

export const SIMCA_EXPORT_PRESET_DETAILS: Record<SimcaExportPresetId, { label: string; description: string }> = {
  full: {
    label: 'Full hockey',
    description: 'Alla hockeymått, z-scores, utvecklingsväg och target gaps.',
  },
  explosive_power: {
    label: 'Power',
    description: 'MuscleLab, hopp, acceleration och riktningsförändring.',
  },
  on_ice_speed: {
    label: 'Isfart',
    description: 'Sprintsplitar, km/h och distansgap till snabbaste spelaren.',
  },
  repeated_sprint: {
    label: '7x40',
    description: 'Upprepad sprintförmåga, farttålighet och RSA-score.',
  },
  strength: {
    label: 'Styrka',
    description: '1RM-lyft, pull-up, grepp och relativ knäböjstyrka.',
  },
  target_gaps: {
    label: 'Target gaps',
    description: 'Gap mot sparade hockeynormer för nivå och position.',
  },
  development_pathway: {
    label: 'Utvecklingsväg',
    description: 'Säsong, nivåbyten och progression från J18 till A-lag.',
  },
}

export const SIMCA_QUALITY_KEYS = uniqueKeys(SIMCA_QUALITY_AREAS.flatMap((area) => area.keys))
export const SIMCA_REQUIRED_KEYS = uniqueKeys(SIMCA_QUALITY_AREAS.flatMap((area) => area.requiredKeys))

function uniqueKeys<Key extends string>(keys: readonly Key[]): Key[] {
  return Array.from(new Set(keys))
}

export function isHockeyMetricPresent(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

export function hasSimcaExportValue(value: string | number | null | undefined): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.trim().length > 0
  return false
}

function positionLabel(position: HockeyDataQualityAthlete['position']): string {
  if (!position) return '-'
  if (typeof position === 'string') return position
  return position.label ?? position.key ?? '-'
}

export function buildHockeyDataQuality<Key extends string = string>(
  athletes: HockeyDataQualityAthlete[],
  options?: {
    areas?: readonly HockeyDataQualityArea<Key>[]
    labelForKey?: (key: Key) => string
  },
): HockeyDataQualityReport<Key> {
  const areas = options?.areas ?? HOCKEY_DATA_QUALITY_AREAS as readonly HockeyDataQualityArea<Key>[]
  const labelForKey = options?.labelForKey ?? ((key: Key) => key)

  const areaSummaries = areas.map((area) => {
    let presentCells = 0
    const totalCells = athletes.length * area.keys.length
    let completeAthletes = 0
    const missingAthletes: HockeyDataQualitySummary<Key>['missingAthletes'] = []

    for (const athlete of athletes) {
      const missingLabels = area.requiredKeys
        .filter((key) => !isHockeyMetricPresent(athlete.metrics[key]))
        .map(labelForKey)

      area.keys.forEach((key) => {
        if (isHockeyMetricPresent(athlete.metrics[key])) presentCells += 1
      })

      if (missingLabels.length === 0) {
        completeAthletes += 1
      } else {
        missingAthletes.push({
          id: athlete.id ?? athlete.name,
          name: athlete.name,
          position: positionLabel(athlete.position),
          missingLabels,
        })
      }
    }

    return {
      area,
      presentCells,
      totalCells,
      coveragePercent: totalCells > 0 ? Math.round((presentCells / totalCells) * 100) : 0,
      completeAthletes,
      missingAthletes: missingAthletes
        .sort((a, b) => b.missingLabels.length - a.missingLabels.length || a.name.localeCompare(b.name, 'sv'))
        .slice(0, 4),
    }
  })

  const requiredKeys = uniqueKeys(areas.flatMap((area) => area.requiredKeys))
  const coreKeys = uniqueKeys(areas.flatMap((area) => area.keys))
  const watchlist = athletes
    .map((athlete) => {
      const missingLabels = requiredKeys
        .filter((key) => !isHockeyMetricPresent(athlete.metrics[key]))
        .map(labelForKey)

      return {
        id: athlete.id ?? athlete.name,
        name: athlete.name,
        position: positionLabel(athlete.position),
        latestTestDate: athlete.latestTestDate ?? null,
        missingCount: missingLabels.length,
        missingLabels,
        warningCount: athlete.qualityFlags?.filter((flag) => flag.severity === 'warning').length ?? 0,
      }
    })
    .filter((item) => item.missingCount > 0 || item.warningCount > 0 || !item.latestTestDate)
    .sort((a, b) => {
      if (!a.latestTestDate && b.latestTestDate) return -1
      if (a.latestTestDate && !b.latestTestDate) return 1
      return b.missingCount - a.missingCount || b.warningCount - a.warningCount || a.name.localeCompare(b.name, 'sv')
    })
    .slice(0, 8)

  const presentCells = areaSummaries.reduce((sum, area) => sum + area.presentCells, 0)
  const totalCells = areaSummaries.reduce((sum, area) => sum + area.totalCells, 0)
  const analysisReadyAthletes = athletes.filter((athlete) => {
    const missingRequired = requiredKeys.some((key) => !isHockeyMetricPresent(athlete.metrics[key]))
    const athletePresentCells = coreKeys.filter((key) => isHockeyMetricPresent(athlete.metrics[key])).length
    const athleteCoverage = coreKeys.length > 0 ? athletePresentCells / coreKeys.length : 0
    return !missingRequired && athleteCoverage >= 0.75
  }).length

  return {
    areaSummaries,
    watchlist,
    totalCoveragePercent: totalCells > 0 ? Math.round((presentCells / totalCells) * 100) : 0,
    analysisReadyAthletes,
    athletesWithoutTests: athletes.filter((athlete) => !athlete.latestTestDate).length,
    warningCount: athletes.reduce(
      (sum, athlete) => sum + (athlete.qualityFlags?.filter((flag) => flag.severity === 'warning').length ?? 0),
      0,
    ),
  }
}

export function buildSimcaRowQuality(row: Record<string, string | number | null | undefined>): SimcaRowQuality {
  const presentCells = SIMCA_QUALITY_KEYS.filter((key) => hasSimcaExportValue(row[key])).length
  const missingRequiredKeys = SIMCA_REQUIRED_KEYS.filter((key) => !hasSimcaExportValue(row[key]))
  const coveragePercent = SIMCA_QUALITY_KEYS.length > 0
    ? Math.round((presentCells / SIMCA_QUALITY_KEYS.length) * 100)
    : 0

  return {
    simca_row_core_coverage_pct: coveragePercent,
    simca_row_required_missing_count: missingRequiredKeys.length,
    simca_row_required_missing_keys: missingRequiredKeys.join('|'),
    simca_row_analysis_ready: missingRequiredKeys.length === 0 && coveragePercent >= 75 ? 1 : 0,
  }
}

export function buildSimcaExportQualitySummary(
  rows: Array<Record<string, string | number | null | undefined>>,
): SimcaExportQualitySummary {
  const totalCoverage = rows.reduce((sum, row) => sum + (Number(row.simca_row_core_coverage_pct) || 0), 0)
  const missingRequiredCells = rows.reduce((sum, row) => sum + (Number(row.simca_row_required_missing_count) || 0), 0)
  const areaCoverage = SIMCA_QUALITY_AREAS.map((area) => {
    const totalCells = rows.length * area.keys.length
    const filledCells = rows.reduce((sum, row) => (
      sum + area.keys.filter((key) => hasSimcaExportValue(row[key])).length
    ), 0)

    return {
      id: area.id,
      label: area.label,
      coveragePercent: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0,
    }
  })

  return {
    rowCount: rows.length,
    averageCoreCoveragePercent: rows.length > 0 ? Math.round(totalCoverage / rows.length) : 0,
    analysisReadyRows: rows.filter((row) => row.simca_row_analysis_ready === 1).length,
    missingRequiredCells,
    areaCoverage,
  }
}
