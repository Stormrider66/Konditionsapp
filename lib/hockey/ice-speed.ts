export interface IceSpeedDefinition {
  key: string
  label: string
  distanceM: number
  time: (metrics: Record<string, number | null>) => number | null | undefined
}

export interface IceSpeedProfileRow {
  key: string
  label: string
  distanceM: number
  timeS: number
  speedKmh: number
}

export interface TeamIceSpeedProfileRow extends IceSpeedProfileRow {
  coverage: number
  leaderName: string
  averageSpeedKmh: number | null
  medianGapM: number | null
  maxGapM: number | null
  maxGapAthleteName: string | null
}

export const ICE_SPEED_DEFINITIONS: IceSpeedDefinition[] = [
  {
    key: 'sprint0to10',
    label: '0-10 m',
    distanceM: 10,
    time: (metrics) => metrics.sprint10m,
  },
  {
    key: 'sprint10to20',
    label: '10-20 m',
    distanceM: 10,
    time: (metrics) => positiveSplit(metrics.sprint20m, metrics.sprint10m),
  },
  {
    key: 'sprint20to30',
    label: '20-30 m',
    distanceM: 10,
    time: (metrics) => positiveSplit(metrics.sprint30m, metrics.sprint20m),
  },
  {
    key: 'sprint0to30',
    label: '0-30 m',
    distanceM: 30,
    time: (metrics) => metrics.sprint30m,
  },
  {
    key: 'endurance7x40Best',
    label: '7x40 best',
    distanceM: 40,
    time: (metrics) => metrics.endurance7x40Best,
  },
]

export function round(value: number | null | undefined, decimals = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function speedKmh(distanceM: number, timeS: number | null | undefined): number | null {
  if (timeS == null || timeS <= 0) return null
  return round((distanceM / timeS) * 3.6, 2)
}

export function positiveSplit(later: number | null | undefined, earlier: number | null | undefined): number | null {
  if (later == null || earlier == null || later <= earlier) return null
  return round(later - earlier, 2)
}

export function distanceGapM(
  distanceM: number,
  leaderTimeS: number | null | undefined,
  athleteTimeS: number | null | undefined,
): number | null {
  if (leaderTimeS == null || athleteTimeS == null || leaderTimeS <= 0 || athleteTimeS <= 0) return null
  if (athleteTimeS <= leaderTimeS) return 0
  return round(distanceM - (distanceM * leaderTimeS / athleteTimeS), 2)
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export function buildIceSpeedProfileRows(
  metrics: Record<string, number | null>,
  definitions: IceSpeedDefinition[] = ICE_SPEED_DEFINITIONS,
): IceSpeedProfileRow[] {
  return definitions
    .map((definition) => {
      const timeS = definition.time(metrics)
      const speed = speedKmh(definition.distanceM, timeS)
      return timeS != null && speed != null
        ? {
            key: definition.key,
            label: definition.label,
            distanceM: definition.distanceM,
            timeS,
            speedKmh: speed,
          }
        : null
    })
    .filter((row): row is IceSpeedProfileRow => row != null)
}

export function buildTeamIceSpeedProfileRows<T extends { name: string; metrics: Record<string, number | null> }>(
  athletes: T[],
  definitions: IceSpeedDefinition[] = ICE_SPEED_DEFINITIONS,
): TeamIceSpeedProfileRow[] {
  return definitions
    .map<TeamIceSpeedProfileRow | null>((definition) => {
      const entries = athletes
        .map((athlete) => {
          const timeS = definition.time(athlete.metrics)
          const speed = speedKmh(definition.distanceM, timeS)
          return timeS != null && speed != null
            ? { athlete, timeS, speed }
            : null
        })
        .filter((entry): entry is { athlete: T; timeS: number; speed: number } => entry != null)
        .sort((a, b) => a.timeS - b.timeS)

      const leader = entries[0]
      if (!leader) return null

      const gaps = entries.map((entry) => ({
        athleteName: entry.athlete.name,
        gapM: distanceGapM(definition.distanceM, leader.timeS, entry.timeS) ?? 0,
      }))
      const maxGap = gaps.reduce((current, candidate) => candidate.gapM > current.gapM ? candidate : current, gaps[0])

      return {
        key: definition.key,
        label: definition.label,
        distanceM: definition.distanceM,
        timeS: leader.timeS,
        speedKmh: leader.speed,
        coverage: entries.length,
        leaderName: leader.athlete.name,
        averageSpeedKmh: round(average(entries.map((entry) => entry.speed)), 2),
        medianGapM: round(median(gaps.map((gap) => gap.gapM)), 2),
        maxGapM: maxGap?.gapM ?? null,
        maxGapAthleteName: maxGap?.athleteName ?? null,
      }
    })
    .filter((row): row is TeamIceSpeedProfileRow => row != null)
}
