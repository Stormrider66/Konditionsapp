// lib/program-generator/hyrox-benchmarks.ts
/**
 * HYROX Performance Benchmarks and Standards
 *
 * Based on 2024/2025 season data including World Record performances
 * and median amateur statistics.
 *
 * Source: HYROX Performance Engineering Technical Analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export type PerformanceLevel = 'world_class' | 'elite' | 'advanced' | 'intermediate' | 'beginner'
export type Gender = 'male' | 'female'
export type Division = 'open' | 'pro' | 'doubles'

export interface StationTimes {
  skierg: number | null      // 1000m time in seconds
  sledPush: number | null    // 50m time in seconds
  sledPull: number | null    // 50m time in seconds
  burpeeBroadJump: number | null // 80m time in seconds
  rowing: number | null      // 1000m time in seconds
  farmersCarry: number | null // 200m time in seconds
  sandbagLunge: number | null // 100m time in seconds
  wallBalls: number | null   // 75/100 reps time in seconds
  roxzone: number | null     // Transition time in seconds
}

export interface RunningTimes {
  averagePace: number        // seconds per km
  run1Pace: number           // first run pace
  run8Pace: number           // last run pace (usually slower due to fatigue)
  totalRunTime: number       // total 8km running time in seconds
}

export interface StrengthPRs {
  deadlift: number | null    // kg
  backSquat: number | null   // kg
  overheadPress: number | null // kg
  pullUps: number | null     // max strict reps
  barbellRow: number | null  // kg
  benchPress: number | null  // kg
}

// ============================================================================
// STATION WEIGHTS BY CATEGORY (Official 2024/2025 Rules)
// ============================================================================

export const STATION_WEIGHTS = {
  skierg: {
    womenOpen: { damper: 5, dragFactor: '105-115' },
    womenPro: { damper: 6, dragFactor: '115-125' },
    menOpen: { damper: 6, dragFactor: '120-130' },
    menPro: { damper: 7, dragFactor: '130-140' },
  },
  sledPush: {
    womenOpen: 102,  // kg (225 lbs)
    womenPro: 152,   // kg (335 lbs)
    menOpen: 152,    // kg (335 lbs)
    menPro: 202,     // kg (445 lbs)
  },
  sledPull: {
    womenOpen: 78,   // kg (172 lbs)
    womenPro: 103,   // kg (227 lbs)
    menOpen: 103,    // kg (227 lbs)
    menPro: 153,     // kg (337 lbs)
  },
  farmersCarry: {
    womenOpen: 16,   // kg per hand (35 lbs)
    womenPro: 24,    // kg per hand (53 lbs)
    menOpen: 24,     // kg per hand (53 lbs)
    menPro: 32,      // kg per hand (70 lbs)
  },
  sandbagLunge: {
    womenOpen: 10,   // kg (22 lbs)
    womenPro: 20,    // kg (45 lbs)
    menOpen: 20,     // kg (45 lbs)
    menPro: 30,      // kg (66 lbs)
  },
  wallBalls: {
    womenOpen: { weight: 4, reps: 75, targetHeight: 2.7 },  // kg, reps, meters
    womenPro: { weight: 6, reps: 75, targetHeight: 2.7 },
    menOpen: { weight: 6, reps: 100, targetHeight: 3.0 },
    menPro: { weight: 9, reps: 100, targetHeight: 3.0 },
  },
  rowing: {
    womenOpen: { damper: 5, dragFactor: '105-115' },
    womenPro: { damper: 6, dragFactor: '115-125' },
    menOpen: { damper: 6, dragFactor: '120-130' },
    menPro: { damper: 7, dragFactor: '130-140' },
  },
} as const

// ============================================================================
// RUNNING BENCHMARKS BY PERFORMANCE TIER
// ============================================================================

export const RUNNING_BENCHMARKS = {
  male: {
    world_class: {
      targetRaceTime: 55 * 60,      // < 55:00
      run1Pace: { min: 200, max: 205 }, // 3:20-3:25 in seconds
      run8Pace: { min: 215, max: 225 }, // 3:35-3:45
      averagePace: 215,              // ~3:35
      totalRunTime: 29 * 60,         // ~29:00
    },
    elite: {
      targetRaceTime: 60 * 60,      // < 60:00
      run1Pace: { min: 205, max: 215 },
      run8Pace: { min: 230, max: 240 },
      averagePace: 225,              // ~3:45
      totalRunTime: 30 * 60 + 30,    // ~30:30
    },
    advanced: {
      targetRaceTime: 70 * 60,      // < 70:00
      run1Pace: { min: 225, max: 240 },
      run8Pace: { min: 270, max: 285 },
      averagePace: 255,              // ~4:15
      totalRunTime: 34 * 60,         // ~34:00
    },
    intermediate: {
      targetRaceTime: 82.5 * 60,    // 75:00 - 90:00
      run1Pace: { min: 255, max: 285 },
      run8Pace: { min: 330, max: 360 },
      averagePace: 315,              // ~5:15
      totalRunTime: 42 * 60,         // ~42:00
    },
    beginner: {
      targetRaceTime: 100 * 60,     // > 100:00
      run1Pace: { min: 300, max: 330 },
      run8Pace: { min: 390, max: 450 },
      averagePace: 375,              // ~6:15
      totalRunTime: 50 * 60,         // ~50:00
    },
  },
  female: {
    world_class: {
      targetRaceTime: 60 * 60,
      run1Pace: { min: 225, max: 235 },
      run8Pace: { min: 245, max: 255 },
      averagePace: 240,
      totalRunTime: 32 * 60,
    },
    elite: {
      targetRaceTime: 65 * 60,
      run1Pace: { min: 235, max: 250 },
      run8Pace: { min: 260, max: 280 },
      averagePace: 260,
      totalRunTime: 34 * 60 + 30,
    },
    advanced: {
      targetRaceTime: 75 * 60,
      run1Pace: { min: 260, max: 280 },
      run8Pace: { min: 315, max: 330 },
      averagePace: 300,
      totalRunTime: 40 * 60,
    },
    intermediate: {
      targetRaceTime: 92.5 * 60,
      run1Pace: { min: 300, max: 330 },
      run8Pace: { min: 375, max: 405 },
      averagePace: 345,
      totalRunTime: 46 * 60,
    },
    beginner: {
      targetRaceTime: 110 * 60,
      run1Pace: { min: 360, max: 390 },
      run8Pace: { min: 450, max: 510 },
      averagePace: 420,
      totalRunTime: 56 * 60,
    },
  },
} as const

// ============================================================================
// STATION BENCHMARKS BY PERFORMANCE TIER (Men Open/Pro)
// ============================================================================

export const STATION_BENCHMARKS = {
  male: {
    elite: {
      skierg: { min: 210, max: 225 },      // 3:30-3:45
      sledPush: { min: 150, max: 170 },    // 2:30-2:50
      sledPull: { min: 180, max: 200 },    // 3:00-3:20
      burpeeBroadJump: { min: 140, max: 160 }, // 2:20-2:40
      rowing: { min: 210, max: 225 },      // 3:30-3:45
      farmersCarry: { min: 75, max: 90 },  // 1:15-1:30
      sandbagLunge: { min: 150, max: 180 }, // 2:30-3:00
      wallBalls: { min: 180, max: 210 },   // 3:00-3:30
      roxzone: { min: 150, max: 180 },     // 2:30-3:00
    },
    advanced: {
      skierg: { min: 230, max: 250 },      // 3:50-4:10
      sledPush: { min: 180, max: 210 },    // 3:00-3:30
      sledPull: { min: 240, max: 270 },    // 4:00-4:30
      burpeeBroadJump: { min: 210, max: 240 },
      rowing: { min: 230, max: 250 },
      farmersCarry: { min: 105, max: 135 },
      sandbagLunge: { min: 210, max: 255 },
      wallBalls: { min: 270, max: 330 },
      roxzone: { min: 240, max: 300 },
    },
    intermediate: {
      skierg: { min: 255, max: 285 },      // 4:15-4:45
      sledPush: { min: 225, max: 270 },    // 3:45-4:30
      sledPull: { min: 330, max: 390 },    // 5:30-6:30 **TIME SINK**
      burpeeBroadJump: { min: 300, max: 360 },
      rowing: { min: 270, max: 300 },
      farmersCarry: { min: 150, max: 180 },
      sandbagLunge: { min: 300, max: 360 },
      wallBalls: { min: 390, max: 480 },   // 6:30-8:00 **TIME SINK**
      roxzone: { min: 360, max: 480 },
    },
    beginner: {
      skierg: { min: 300, max: 360 },      // 5:00+
      sledPush: { min: 300, max: 400 },    // 5:00+
      sledPull: { min: 480, max: 600 },    // 8:00+ **MAJOR TIME SINK**
      burpeeBroadJump: { min: 420, max: 540 },
      rowing: { min: 330, max: 420 },
      farmersCarry: { min: 210, max: 300 },
      sandbagLunge: { min: 420, max: 540 },
      wallBalls: { min: 540, max: 720 },   // 9:00+ **MAJOR TIME SINK**
      roxzone: { min: 600, max: 900 },
    },
  },
  female: {
    elite: {
      skierg: { min: 240, max: 260 },
      sledPush: { min: 150, max: 180 },
      sledPull: { min: 200, max: 240 },
      burpeeBroadJump: { min: 160, max: 190 },
      rowing: { min: 240, max: 260 },
      farmersCarry: { min: 90, max: 110 },
      sandbagLunge: { min: 180, max: 210 },
      wallBalls: { min: 150, max: 180 },   // 75 reps
      roxzone: { min: 150, max: 180 },
    },
    advanced: {
      skierg: { min: 270, max: 300 },
      sledPush: { min: 200, max: 240 },
      sledPull: { min: 270, max: 330 },
      burpeeBroadJump: { min: 240, max: 300 },
      rowing: { min: 270, max: 300 },
      farmersCarry: { min: 120, max: 150 },
      sandbagLunge: { min: 240, max: 300 },
      wallBalls: { min: 210, max: 270 },
      roxzone: { min: 240, max: 300 },
    },
    intermediate: {
      skierg: { min: 300, max: 360 },
      sledPush: { min: 270, max: 330 },
      sledPull: { min: 390, max: 480 },
      burpeeBroadJump: { min: 360, max: 420 },
      rowing: { min: 300, max: 360 },
      farmersCarry: { min: 180, max: 210 },
      sandbagLunge: { min: 360, max: 420 },
      wallBalls: { min: 330, max: 420 },
      roxzone: { min: 360, max: 480 },
    },
    beginner: {
      skierg: { min: 360, max: 480 },
      sledPush: { min: 360, max: 480 },
      sledPull: { min: 540, max: 720 },
      burpeeBroadJump: { min: 480, max: 600 },
      rowing: { min: 390, max: 480 },
      farmersCarry: { min: 240, max: 330 },
      sandbagLunge: { min: 480, max: 600 },
      wallBalls: { min: 480, max: 600 },
      roxzone: { min: 600, max: 900 },
    },
  },
} as const

// ============================================================================
// STRENGTH BENCHMARKS (1RM and Bodyweight Ratios)
// ============================================================================

export const STRENGTH_BENCHMARKS = {
  male: {
    elite: {
      deadlift: { ratio: 2.0, example: 200 },      // 2.0x BW, ~200kg for 100kg athlete
      backSquat: { ratio: 1.75, example: 160 },    // 1.75x BW
      overheadPress: { ratio: 0.8, example: 75 },  // 0.8x BW
      pullUps: 15,                                  // strict reps
    },
    competitorFloor: {
      deadlift: { ratio: 1.5, example: 150 },      // minimum to be competitive
      backSquat: { ratio: 1.25, example: 125 },
      overheadPress: { ratio: 0.6, example: 60 },
      pullUps: 5,
    },
    proSafeZone: {
      // Recommended minimums for Pro Division
      deadlift: { ratio: 1.8, minAbsolute: 180 },  // Must exceed 1.2x sled pull weight (153kg)
      backSquat: { ratio: 1.5, minAbsolute: 150 },
    },
  },
  female: {
    elite: {
      deadlift: { ratio: 1.75, example: 130 },
      backSquat: { ratio: 1.5, example: 100 },
      overheadPress: { ratio: 0.7, example: 45 },
      pullUps: 8,
    },
    competitorFloor: {
      deadlift: { ratio: 1.25, example: 90 },
      backSquat: { ratio: 1.0, example: 70 },
      overheadPress: { ratio: 0.5, example: 35 },
      pullUps: 1,
    },
    proSafeZone: {
      deadlift: { ratio: 1.5, minAbsolute: 120 },
      backSquat: { ratio: 1.25, minAbsolute: 90 },
    },
  },
} as const

// ============================================================================
// TIME SINK STATIONS (Where beginners lose the most time)
// ============================================================================

export const TIME_SINK_STATIONS = ['sledPull', 'wallBalls'] as const

export const STATION_PRIORITY = {
  // Priority order for training weak stations
  high: ['sledPull', 'wallBalls', 'sandbagLunge'],
  medium: ['sledPush', 'burpeeBroadJump', 'farmersCarry'],
  low: ['skierg', 'rowing'], // Easier to pace, less variance
} as const

// ============================================================================
// TRAINING VOLUME RECOMMENDATIONS
// ============================================================================

export const TRAINING_VOLUME = {
  beginner: {
    hoursPerWeek: { min: 4, max: 6 },
    runsPerWeek: 2,
    strengthSessionsPerWeek: 2,
    hyroxSessionsPerWeek: 0,
  },
  intermediate: {
    hoursPerWeek: { min: 6, max: 10 },
    runsPerWeek: 3,
    strengthSessionsPerWeek: 2,
    hyroxSessionsPerWeek: 1,
  },
  advanced: {
    hoursPerWeek: { min: 8, max: 12 },
    runsPerWeek: 4,
    strengthSessionsPerWeek: 3,
    hyroxSessionsPerWeek: 1,
  },
  elite: {
    hoursPerWeek: { min: 10, max: 15 },
    runsPerWeek: 5,
    strengthSessionsPerWeek: 4,
    hyroxSessionsPerWeek: 2,
  },
} as const

// ============================================================================
// PERIODIZATION PHASES
// ============================================================================

export const PERIODIZATION_PHASES = {
  base: {
    name: 'General Physical Preparedness (Base)',
    weeks: { min: 1, max: 4 },
    focus: 'Aerobic capacity (Zone 2 running), hypertrophy, structural balance',
    distribution: { running: 60, strength: 40, hyrox: 0 },
    intensity: 'Low',
  },
  build: {
    name: 'Build & Strength Endurance',
    weeks: { min: 5, max: 10 },
    focus: 'Lactate Threshold (Zone 4) intervals, maximal strength, compromised running',
    distribution: { running: 50, strength: 20, hyrox: 30 },
    intensity: 'Moderate-High',
  },
  peak: {
    name: 'Peak & Specificity',
    weeks: { min: 11, max: 14 },
    focus: 'Race simulations, VO2 Max intervals, specific race pacing',
    distribution: { running: 40, strength: 20, hyrox: 40 },
    intensity: 'High',
  },
  taper: {
    name: 'Taper',
    weeks: { min: 15, max: 16 },
    focus: 'Volume reduction, maintain intensity, neural priming',
    distribution: { running: 50, strength: 20, hyrox: 30 },
    intensity: 'Moderate (reduced volume)',
  },
} as const

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze athlete station times and identify weaknesses
 */
export function analyzeStationWeaknesses(
  times: StationTimes,
  gender: Gender,
  targetLevel: PerformanceLevel
): {
  weakStations: string[]
  strongStations: string[]
  recommendations: string[]
  estimatedRaceTime: number
} {
  // Map performance level to station benchmark level (world_class uses elite benchmarks)
  const benchmarkLevel = targetLevel === 'world_class' ? 'elite' : targetLevel
  const benchmarks = STATION_BENCHMARKS[gender][benchmarkLevel]
  const weakStations: string[] = []
  const strongStations: string[] = []
  const recommendations: string[] = []
  let totalStationTime = 0

  const stationKeys = Object.keys(times) as (keyof StationTimes)[]

  for (const station of stationKeys) {
    const time = times[station]
    if (time === null) continue

    const benchmark = benchmarks[station as keyof typeof benchmarks]
    if (!benchmark) continue

    totalStationTime += time

    // Compare to benchmark
    if (time > benchmark.max * 1.2) {
      weakStations.push(station)
      recommendations.push(`${station}: Tid ${formatTime(time)} är över ${targetLevel} nivå. Prioritera denna station.`)
    } else if (time < benchmark.min) {
      strongStations.push(station)
    }
  }

  // Add running time estimate based on level
  const runningBenchmark = RUNNING_BENCHMARKS[gender][targetLevel]
  const estimatedRaceTime = totalStationTime + runningBenchmark.totalRunTime

  // Check for time sink stations
  for (const timeSink of TIME_SINK_STATIONS) {
    if (weakStations.includes(timeSink)) {
      recommendations.unshift(`⚠️ ${timeSink} är en kritisk "time sink" - detta bör vara högsta prioritet!`)
    }
  }

  return {
    weakStations,
    strongStations,
    recommendations,
    estimatedRaceTime,
  }
}

/**
 * Calculate strength requirements based on division
 */
export function getStrengthRequirements(
  gender: Gender,
  division: Division,
  bodyweight: number
): {
  deadliftMin: number
  squatMin: number
  recommendation: string
} {
  const benchmarks = STRENGTH_BENCHMARKS[gender]
  const floor = benchmarks.competitorFloor

  // For Pro division, use proSafeZone
  if (division === 'pro') {
    const proZone = benchmarks.proSafeZone
    return {
      deadliftMin: Math.max(proZone.deadlift.minAbsolute, bodyweight * proZone.deadlift.ratio),
      squatMin: Math.max(proZone.backSquat.minAbsolute, bodyweight * proZone.backSquat.ratio),
      recommendation: `Pro Division kräver högre styrka. Rekommenderad marklyft: ${Math.round(bodyweight * proZone.deadlift.ratio)}kg`,
    }
  }

  return {
    deadliftMin: bodyweight * floor.deadlift.ratio,
    squatMin: bodyweight * floor.backSquat.ratio,
    recommendation: `Open Division minimum: Marklyft ${Math.round(bodyweight * floor.deadlift.ratio)}kg, Knäböj ${Math.round(bodyweight * floor.backSquat.ratio)}kg`,
  }
}

/**
 * Estimate total race time from splits
 */
export function estimateRaceTime(
  stationTimes: StationTimes,
  averageRunPace: number, // seconds per km
  transitionTime: number = 45 // average roxzone per transition
): {
  totalTime: number
  breakdown: {
    running: number
    stations: number
    transitions: number
  }
  formatted: string
} {
  // Sum station times
  let stationTotal = 0
  const stations = Object.values(stationTimes).filter(t => t !== null) as number[]
  stationTotal = stations.reduce((sum, t) => sum + t, 0)

  // Running: 8 x 1km
  const runningTotal = averageRunPace * 8

  // Transitions: 8 roxzones
  const transitionsTotal = transitionTime * 8

  const totalTime = stationTotal + runningTotal + transitionsTotal

  return {
    totalTime,
    breakdown: {
      running: runningTotal,
      stations: stationTotal,
      transitions: transitionsTotal,
    },
    formatted: formatTime(totalTime),
  }
}

/**
 * Format seconds to MM:SS or H:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse time string to seconds
 */
export function parseTime(timeStr: string): number | null {
  if (!timeStr) return null

  const parts = timeStr.split(':').map(Number)
  if (parts.some(isNaN)) return null

  if (parts.length === 3) {
    // H:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  }

  return null
}

/**
 * Get performance level from race time
 */
export function getPerformanceLevel(
  raceTimeSeconds: number,
  gender: Gender
): PerformanceLevel {
  const benchmarks = RUNNING_BENCHMARKS[gender]

  if (raceTimeSeconds < benchmarks.world_class.targetRaceTime) return 'world_class'
  if (raceTimeSeconds < benchmarks.elite.targetRaceTime) return 'elite'
  if (raceTimeSeconds < benchmarks.advanced.targetRaceTime) return 'advanced'
  if (raceTimeSeconds < benchmarks.intermediate.targetRaceTime) return 'intermediate'
  return 'beginner'
}
