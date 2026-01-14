/**
 * HYROX Test Calculations
 *
 * Station times, race estimation, and performance benchmarking for HYROX competitions.
 */

export type HYROXStation =
  | 'SKIERG_1K'
  | 'SLED_PUSH'
  | 'SLED_PULL'
  | 'BURPEE_BROAD_JUMP'
  | 'ROW_1K'
  | 'FARMERS_CARRY'
  | 'SANDBAG_LUNGE'
  | 'WALL_BALLS'

export type HYROXCategory = 'OPEN' | 'PRO' | 'DOUBLES'
export type HYROXDivision = 'MEN' | 'WOMEN' | 'MIXED'

export interface HYROXStationResult {
  station: HYROXStation
  time: number // seconds
  weight?: number // kg (for weighted stations)
  reps?: number // for wall balls
  tier: 'WORLD_CLASS' | 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
}

export interface HYROXRaceEstimate {
  totalTime: number // seconds
  totalTimeFormatted: string // hh:mm:ss
  stationTime: number
  runningTime: number
  roxzoneTime: number
  category: HYROXCategory
  tier: 'WORLD_CLASS' | 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'
  weakestStation: HYROXStation
  strongestStation: HYROXStation
}

/**
 * HYROX station benchmarks (times in seconds)
 * Based on competitive HYROX athletes
 */
const STATION_BENCHMARKS: Record<
  HYROXStation,
  {
    MEN: { worldClass: number; elite: number; advanced: number; intermediate: number }
    WOMEN: { worldClass: number; elite: number; advanced: number; intermediate: number }
  }
> = {
  SKIERG_1K: {
    MEN: { worldClass: 195, elite: 220, advanced: 260, intermediate: 300 }, // ~3:15, ~3:40, ~4:20, ~5:00
    WOMEN: { worldClass: 230, elite: 260, advanced: 300, intermediate: 360 },
  },
  SLED_PUSH: {
    MEN: { worldClass: 90, elite: 120, advanced: 180, intermediate: 240 },
    WOMEN: { worldClass: 120, elite: 150, advanced: 210, intermediate: 300 },
  },
  SLED_PULL: {
    MEN: { worldClass: 90, elite: 120, advanced: 180, intermediate: 240 },
    WOMEN: { worldClass: 120, elite: 150, advanced: 210, intermediate: 300 },
  },
  BURPEE_BROAD_JUMP: {
    MEN: { worldClass: 300, elite: 360, advanced: 450, intermediate: 540 }, // 80m
    WOMEN: { worldClass: 360, elite: 420, advanced: 510, intermediate: 600 },
  },
  ROW_1K: {
    MEN: { worldClass: 195, elite: 220, advanced: 260, intermediate: 300 },
    WOMEN: { worldClass: 240, elite: 270, advanced: 320, intermediate: 380 },
  },
  FARMERS_CARRY: {
    MEN: { worldClass: 120, elite: 150, advanced: 210, intermediate: 270 }, // 200m
    WOMEN: { worldClass: 150, elite: 180, advanced: 240, intermediate: 330 },
  },
  SANDBAG_LUNGE: {
    MEN: { worldClass: 240, elite: 300, advanced: 390, intermediate: 480 }, // 100m
    WOMEN: { worldClass: 300, elite: 360, advanced: 450, intermediate: 540 },
  },
  WALL_BALLS: {
    MEN: { worldClass: 240, elite: 300, advanced: 390, intermediate: 480 }, // 100 reps
    WOMEN: { worldClass: 240, elite: 300, advanced: 390, intermediate: 480 }, // 75 reps
  },
}

/**
 * Station weights by category and division
 */
const STATION_WEIGHTS: Record<
  HYROXStation,
  {
    MEN_OPEN: number
    MEN_PRO: number
    WOMEN_OPEN: number
    WOMEN_PRO: number
  }
> = {
  SKIERG_1K: { MEN_OPEN: 0, MEN_PRO: 0, WOMEN_OPEN: 0, WOMEN_PRO: 0 },
  SLED_PUSH: { MEN_OPEN: 152, MEN_PRO: 202, WOMEN_OPEN: 102, WOMEN_PRO: 152 },
  SLED_PULL: { MEN_OPEN: 103, MEN_PRO: 153, WOMEN_OPEN: 78, WOMEN_PRO: 103 },
  BURPEE_BROAD_JUMP: { MEN_OPEN: 0, MEN_PRO: 0, WOMEN_OPEN: 0, WOMEN_PRO: 0 },
  ROW_1K: { MEN_OPEN: 0, MEN_PRO: 0, WOMEN_OPEN: 0, WOMEN_PRO: 0 },
  FARMERS_CARRY: { MEN_OPEN: 24, MEN_PRO: 32, WOMEN_OPEN: 16, WOMEN_PRO: 24 }, // per hand
  SANDBAG_LUNGE: { MEN_OPEN: 20, MEN_PRO: 30, WOMEN_OPEN: 10, WOMEN_PRO: 20 },
  WALL_BALLS: { MEN_OPEN: 6, MEN_PRO: 9, WOMEN_OPEN: 4, WOMEN_PRO: 6 }, // ball weight
}

/**
 * Wall ball rep counts
 */
const WALL_BALL_REPS = {
  MEN: 100,
  WOMEN: 75,
}

/**
 * Classify station performance
 *
 * @param station - HYROX station
 * @param time - Time in seconds
 * @param division - 'MEN' or 'WOMEN'
 * @returns Performance tier
 */
export function classifyStationPerformance(
  station: HYROXStation,
  time: number,
  division: 'MEN' | 'WOMEN'
): 'WORLD_CLASS' | 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  const benchmarks = STATION_BENCHMARKS[station][division]

  if (time <= benchmarks.worldClass) return 'WORLD_CLASS'
  if (time <= benchmarks.elite) return 'ELITE'
  if (time <= benchmarks.advanced) return 'ADVANCED'
  if (time <= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Analyze individual station result
 *
 * @param station - HYROX station
 * @param time - Time in seconds
 * @param division - 'MEN' or 'WOMEN'
 * @param weight - Optional weight used (for verification)
 * @param reps - Optional rep count (for wall balls)
 * @returns HYROXStationResult
 */
export function analyzeStationResult(
  station: HYROXStation,
  time: number,
  division: 'MEN' | 'WOMEN',
  weight?: number,
  reps?: number
): HYROXStationResult {
  const tier = classifyStationPerformance(station, time, division)

  return {
    station,
    time,
    weight,
    reps,
    tier,
  }
}

/**
 * Estimate total HYROX race time from station times
 *
 * @param stationTimes - Object with times for each station (in seconds)
 * @param runPacePerKm - Running pace in seconds per km
 * @param roxzoneTimePerStation - Transition time per station (default: 30s)
 * @param division - 'MEN' or 'WOMEN'
 * @param category - 'OPEN' or 'PRO'
 * @returns HYROXRaceEstimate
 */
export function estimateRaceTime(
  stationTimes: Partial<Record<HYROXStation, number>>,
  runPacePerKm: number,
  roxzoneTimePerStation: number = 30,
  division: 'MEN' | 'WOMEN',
  category: HYROXCategory = 'OPEN'
): HYROXRaceEstimate {
  // Calculate total station time
  const stations = Object.keys(stationTimes) as HYROXStation[]
  const stationTime = stations.reduce(
    (sum, station) => sum + (stationTimes[station] || 0),
    0
  )

  // Running time (8 × 1km)
  const runningTime = runPacePerKm * 8

  // Roxzone transitions (8 stations)
  const roxzoneTime = roxzoneTimePerStation * 8

  // Total time
  const totalTime = stationTime + runningTime + roxzoneTime

  // Format total time
  const hours = Math.floor(totalTime / 3600)
  const minutes = Math.floor((totalTime % 3600) / 60)
  const seconds = Math.round(totalTime % 60)
  const totalTimeFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  // Find weakest and strongest stations
  let weakestStation: HYROXStation = 'SKIERG_1K'
  let strongestStation: HYROXStation = 'SKIERG_1K'
  let worstTier = 0
  let bestTier = Infinity

  const tierValue = (tier: string) => {
    switch (tier) {
      case 'WORLD_CLASS':
        return 1
      case 'ELITE':
        return 2
      case 'ADVANCED':
        return 3
      case 'INTERMEDIATE':
        return 4
      default:
        return 5
    }
  }

  for (const station of stations) {
    const time = stationTimes[station]!
    const tier = classifyStationPerformance(station, time, division)
    const value = tierValue(tier)

    if (value > worstTier) {
      worstTier = value
      weakestStation = station
    }
    if (value < bestTier) {
      bestTier = value
      strongestStation = station
    }
  }

  // Classify overall performance
  const tier = classifyOverallRaceTime(totalTime, division, category)

  return {
    totalTime,
    totalTimeFormatted,
    stationTime,
    runningTime,
    roxzoneTime,
    category,
    tier,
    weakestStation,
    strongestStation,
  }
}

/**
 * Classify overall HYROX race time
 *
 * @param totalTime - Total race time in seconds
 * @param division - 'MEN' or 'WOMEN'
 * @param category - 'OPEN' or 'PRO'
 * @returns Performance tier
 */
export function classifyOverallRaceTime(
  totalTime: number,
  division: 'MEN' | 'WOMEN',
  category: HYROXCategory
): 'WORLD_CLASS' | 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Race time benchmarks in seconds (total time including running)
  const benchmarks = {
    MEN_PRO: {
      worldClass: 3600, // 1:00:00
      elite: 4200, // 1:10:00
      advanced: 4800, // 1:20:00
      intermediate: 5700, // 1:35:00
    },
    MEN_OPEN: {
      worldClass: 4200, // 1:10:00
      elite: 4800, // 1:20:00
      advanced: 5400, // 1:30:00
      intermediate: 6300, // 1:45:00
    },
    WOMEN_PRO: {
      worldClass: 4200, // 1:10:00
      elite: 4800, // 1:20:00
      advanced: 5400, // 1:30:00
      intermediate: 6300, // 1:45:00
    },
    WOMEN_OPEN: {
      worldClass: 4800, // 1:20:00
      elite: 5400, // 1:30:00
      advanced: 6000, // 1:40:00
      intermediate: 6900, // 1:55:00
    },
  }

  const key = `${division}_${category}` as keyof typeof benchmarks
  const divisionBenchmarks = benchmarks[key] || benchmarks.MEN_OPEN

  if (totalTime <= divisionBenchmarks.worldClass) return 'WORLD_CLASS'
  if (totalTime <= divisionBenchmarks.elite) return 'ELITE'
  if (totalTime <= divisionBenchmarks.advanced) return 'ADVANCED'
  if (totalTime <= divisionBenchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Get station weight for a given category and division
 *
 * @param station - HYROX station
 * @param division - 'MEN' or 'WOMEN'
 * @param category - 'OPEN' or 'PRO'
 * @returns Weight in kg
 */
export function getStationWeight(
  station: HYROXStation,
  division: 'MEN' | 'WOMEN',
  category: 'OPEN' | 'PRO'
): number {
  const key = `${division}_${category}` as keyof (typeof STATION_WEIGHTS)[HYROXStation]
  return STATION_WEIGHTS[station][key]
}

/**
 * Get wall ball rep count for division
 *
 * @param division - 'MEN' or 'WOMEN'
 * @returns Number of reps required
 */
export function getWallBallReps(division: 'MEN' | 'WOMEN'): number {
  return WALL_BALL_REPS[division]
}

/**
 * Format time in seconds to mm:ss
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatStationTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get station description in Swedish
 *
 * @param station - HYROX station
 * @returns Swedish description
 */
export function getStationDescription(station: HYROXStation): {
  name: string
  description: string
  distance?: string
} {
  const descriptions: Record<
    HYROXStation,
    { name: string; description: string; distance?: string }
  > = {
    SKIERG_1K: {
      name: 'SkiErg',
      description: 'Skidmaskin',
      distance: '1000m',
    },
    SLED_PUSH: {
      name: 'Sled Push',
      description: 'Skjut släde',
      distance: '50m',
    },
    SLED_PULL: {
      name: 'Sled Pull',
      description: 'Dra släde med rep',
      distance: '50m',
    },
    BURPEE_BROAD_JUMP: {
      name: 'Burpee Broad Jump',
      description: 'Burpees med längdhopp',
      distance: '80m',
    },
    ROW_1K: {
      name: 'Rowing',
      description: 'Roddmaskin',
      distance: '1000m',
    },
    FARMERS_CARRY: {
      name: 'Farmers Carry',
      description: 'Bär vikter',
      distance: '200m',
    },
    SANDBAG_LUNGE: {
      name: 'Sandbag Lunge',
      description: 'Utfallssteg med sandsäck',
      distance: '100m',
    },
    WALL_BALLS: {
      name: 'Wall Balls',
      description: 'Kasta boll mot vägg',
    },
  }

  return descriptions[station]
}
