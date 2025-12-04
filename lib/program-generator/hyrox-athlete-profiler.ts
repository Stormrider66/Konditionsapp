// lib/program-generator/hyrox-athlete-profiler.ts
/**
 * HYROX Athlete Profiler
 *
 * Analyzes athlete data to create an individualized profile for program generation.
 * Classifies athletes by their running vs station ability to determine training focus.
 */

import {
  RUNNING_BENCHMARKS,
  STATION_BENCHMARKS,
  analyzeStationWeaknesses,
  formatTime,
  parseTime,
  type StationTimes,
  type Gender,
  type PerformanceLevel,
} from './hyrox-benchmarks'
import { calculateVDOT } from '@/lib/training-engine/calculations/vdot'

// ============================================================================
// TYPES
// ============================================================================

export type RunnerType = 'FAST_RUNNER' | 'AVERAGE_RUNNER' | 'SLOW_RUNNER'
export type StationType = 'STRONG_STATIONS' | 'AVERAGE_STATIONS' | 'WEAK_STATIONS'
export type AthleteType = 'FAST_WEAK' | 'SLOW_STRONG' | 'BALANCED' | 'NEEDS_BOTH'
export type PaceDegradationLevel = 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'

export interface HyroxAthleteProfile {
  // Running ability
  runnerType: RunnerType
  vdot: number | null
  pureRunPacePerKm: number | null      // seconds/km from 10K/5K
  hyroxRunPacePerKm: number | null     // seconds/km from HYROX race
  paceDegradation: number | null       // % slower in HYROX vs pure running
  paceDegradationLevel: PaceDegradationLevel | null
  runningScoreVsBenchmark: number      // % vs target benchmark (100 = at benchmark)

  // Station ability
  stationType: StationType
  weakStations: string[]
  strongStations: string[]
  stationScoreVsBenchmark: number      // % vs target benchmark (100 = at benchmark)
  estimatedStationTime: number | null  // total station time in seconds

  // Overall profile
  athleteType: AthleteType
  profileDescription: string           // Swedish description
  trainingFocus: string[]              // Priority training areas

  // Training capacity
  currentWeeklyKm: number | null
  recommendedWeeklyKm: number          // Based on goal and athlete type
  volumeScaleFactor: number            // 0.7-1.3 multiplier for template

  // Goal analysis
  goalTimeSeconds: number | null
  currentEstimatedTime: number | null
  timeGapSeconds: number | null        // How much faster they need to be
  isGoalRealistic: boolean
  goalAssessment: string               // Swedish assessment
}

export interface AthleteProfileInput {
  // Running data (from pure running races, NOT HYROX)
  recentRaceDistance?: '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string              // MM:SS or H:MM:SS

  // HYROX race data
  hyroxAverageRunPace?: number         // seconds per km (from HYROX race)
  stationTimes?: StationTimes

  // Athlete info
  gender: Gender
  currentWeeklyKm?: number
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'

  // Goal
  goalTime?: string                    // H:MM:SS (target HYROX total time)
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Pace degradation thresholds (% slower in HYROX vs pure running)
const PACE_DEGRADATION_THRESHOLDS = {
  ELITE: 5,        // Elite: 3-5% degradation (strong stations, fast recovery)
  ADVANCED: 10,    // Advanced: 5-10%
  INTERMEDIATE: 20, // Intermediate: 10-20%
  BEGINNER: 30,    // Beginner: 20-30%
} as const

// Running ability thresholds (10K pace in seconds/km)
const RUNNING_PACE_THRESHOLDS = {
  male: {
    FAST_RUNNER: 270,    // < 4:30/km
    AVERAGE_RUNNER: 315, // 4:30-5:15/km
    SLOW_RUNNER: 999,    // > 5:15/km
  },
  female: {
    FAST_RUNNER: 300,    // < 5:00/km
    AVERAGE_RUNNER: 360, // 5:00-6:00/km
    SLOW_RUNNER: 999,    // > 6:00/km
  },
} as const

// VDOT thresholds for running ability
const VDOT_THRESHOLDS = {
  male: {
    FAST_RUNNER: 55,    // VDOT > 55 (sub-3:20 marathon potential)
    AVERAGE_RUNNER: 45, // VDOT 45-55
    SLOW_RUNNER: 0,     // VDOT < 45
  },
  female: {
    FAST_RUNNER: 50,    // VDOT > 50
    AVERAGE_RUNNER: 40, // VDOT 40-50
    SLOW_RUNNER: 0,     // VDOT < 40
  },
} as const

// Station score thresholds (% vs benchmark - lower is better)
const STATION_SCORE_THRESHOLDS = {
  STRONG_STATIONS: 90,   // < 90% of benchmark time (faster than benchmark)
  AVERAGE_STATIONS: 110, // 90-110% of benchmark time
  WEAK_STATIONS: 999,    // > 110% of benchmark time
} as const

// Recommended weekly km by athlete type and goal
const WEEKLY_KM_RECOMMENDATIONS = {
  FAST_WEAK: { min: 40, max: 50 },     // Keep running steady, focus on stations
  SLOW_STRONG: { min: 50, max: 70 },   // Increase running volume
  BALANCED: { min: 45, max: 60 },      // Standard volume
  NEEDS_BOTH: { min: 40, max: 55 },    // Gradual build on both
} as const

// ============================================================================
// MAIN PROFILER FUNCTION
// ============================================================================

/**
 * Analyze athlete data and create a comprehensive profile
 */
export function analyzeAthleteProfile(input: AthleteProfileInput): HyroxAthleteProfile {
  // Calculate VDOT and running metrics
  const runningAnalysis = analyzeRunningAbility(input)

  // Calculate station metrics
  const stationAnalysis = analyzeStationAbility(input)

  // Determine athlete type based on running vs station ability
  const athleteType = determineAthleteType(
    runningAnalysis.runnerType,
    stationAnalysis.stationType,
    runningAnalysis.runningScoreVsBenchmark,
    stationAnalysis.stationScoreVsBenchmark
  )

  // Calculate volume recommendations
  const volumeAnalysis = calculateVolumeRecommendations(
    athleteType,
    input.currentWeeklyKm,
    input.experienceLevel
  )

  // Analyze goal feasibility
  const goalAnalysis = analyzeGoal(
    input.goalTime,
    stationAnalysis.estimatedStationTime,
    runningAnalysis.pureRunPacePerKm,
    input.gender
  )

  // Generate profile description and training focus
  const { profileDescription, trainingFocus } = generateProfileInsights(
    athleteType,
    runningAnalysis,
    stationAnalysis,
    input.gender
  )

  return {
    // Running
    runnerType: runningAnalysis.runnerType,
    vdot: runningAnalysis.vdot,
    pureRunPacePerKm: runningAnalysis.pureRunPacePerKm,
    hyroxRunPacePerKm: input.hyroxAverageRunPace || null,
    paceDegradation: runningAnalysis.paceDegradation,
    paceDegradationLevel: runningAnalysis.paceDegradationLevel,
    runningScoreVsBenchmark: runningAnalysis.runningScoreVsBenchmark,

    // Stations
    stationType: stationAnalysis.stationType,
    weakStations: stationAnalysis.weakStations,
    strongStations: stationAnalysis.strongStations,
    stationScoreVsBenchmark: stationAnalysis.stationScoreVsBenchmark,
    estimatedStationTime: stationAnalysis.estimatedStationTime,

    // Overall
    athleteType,
    profileDescription,
    trainingFocus,

    // Volume
    currentWeeklyKm: input.currentWeeklyKm || null,
    recommendedWeeklyKm: volumeAnalysis.recommendedWeeklyKm,
    volumeScaleFactor: volumeAnalysis.volumeScaleFactor,

    // Goal
    goalTimeSeconds: goalAnalysis.goalTimeSeconds,
    currentEstimatedTime: goalAnalysis.currentEstimatedTime,
    timeGapSeconds: goalAnalysis.timeGapSeconds,
    isGoalRealistic: goalAnalysis.isGoalRealistic,
    goalAssessment: goalAnalysis.goalAssessment,
  }
}

// ============================================================================
// RUNNING ANALYSIS
// ============================================================================

interface RunningAnalysis {
  runnerType: RunnerType
  vdot: number | null
  pureRunPacePerKm: number | null
  paceDegradation: number | null
  paceDegradationLevel: PaceDegradationLevel | null
  runningScoreVsBenchmark: number
}

function analyzeRunningAbility(input: AthleteProfileInput): RunningAnalysis {
  let vdot: number | null = null
  let pureRunPacePerKm: number | null = null

  // Calculate VDOT and pace from race result
  if (input.recentRaceDistance && input.recentRaceTime) {
    const raceResult = calculateFromRaceResult(
      input.recentRaceDistance,
      input.recentRaceTime
    )
    vdot = raceResult.vdot
    pureRunPacePerKm = raceResult.pacePerKm
  }

  // Calculate pace degradation (pure running vs HYROX running)
  let paceDegradation: number | null = null
  let paceDegradationLevel: PaceDegradationLevel | null = null

  if (pureRunPacePerKm && input.hyroxAverageRunPace) {
    paceDegradation = ((input.hyroxAverageRunPace - pureRunPacePerKm) / pureRunPacePerKm) * 100
    paceDegradationLevel = getPaceDegradationLevel(paceDegradation)
  }

  // Determine runner type
  const runnerType = determineRunnerType(vdot, pureRunPacePerKm, input.gender)

  // Calculate running score vs benchmark
  const runningScoreVsBenchmark = calculateRunningScore(
    pureRunPacePerKm,
    input.gender,
    input.experienceLevel
  )

  return {
    runnerType,
    vdot,
    pureRunPacePerKm,
    paceDegradation,
    paceDegradationLevel,
    runningScoreVsBenchmark,
  }
}

function calculateFromRaceResult(
  distance: '5K' | '10K' | 'HALF' | 'MARATHON',
  timeStr: string
): { vdot: number; pacePerKm: number } {
  const distances: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
  }

  const distanceMeters = distances[distance]
  const timeSeconds = parseTime(timeStr) || 0
  const timeMinutes = timeSeconds / 60

  const vdot = calculateVDOT(distanceMeters, timeMinutes)
  const pacePerKm = timeSeconds / (distanceMeters / 1000)

  return { vdot, pacePerKm }
}

function getPaceDegradationLevel(degradationPercent: number): PaceDegradationLevel {
  if (degradationPercent <= PACE_DEGRADATION_THRESHOLDS.ELITE) return 'ELITE'
  if (degradationPercent <= PACE_DEGRADATION_THRESHOLDS.ADVANCED) return 'ADVANCED'
  if (degradationPercent <= PACE_DEGRADATION_THRESHOLDS.INTERMEDIATE) return 'INTERMEDIATE'
  return 'BEGINNER'
}

function determineRunnerType(
  vdot: number | null,
  pacePerKm: number | null,
  gender: Gender
): RunnerType {
  // Prefer VDOT-based classification
  if (vdot !== null) {
    const thresholds = VDOT_THRESHOLDS[gender]
    if (vdot >= thresholds.FAST_RUNNER) return 'FAST_RUNNER'
    if (vdot >= thresholds.AVERAGE_RUNNER) return 'AVERAGE_RUNNER'
    return 'SLOW_RUNNER'
  }

  // Fall back to pace-based classification
  if (pacePerKm !== null) {
    const thresholds = RUNNING_PACE_THRESHOLDS[gender]
    if (pacePerKm <= thresholds.FAST_RUNNER) return 'FAST_RUNNER'
    if (pacePerKm <= thresholds.AVERAGE_RUNNER) return 'AVERAGE_RUNNER'
    return 'SLOW_RUNNER'
  }

  // Default to average if no data
  return 'AVERAGE_RUNNER'
}

function calculateRunningScore(
  pacePerKm: number | null,
  gender: Gender,
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
): number {
  if (!pacePerKm) return 100 // Default to benchmark if no data

  // Map experience level to performance level
  const targetLevel: PerformanceLevel =
    experienceLevel === 'advanced' ? 'elite' :
    experienceLevel === 'intermediate' ? 'advanced' :
    'intermediate'

  const benchmark = RUNNING_BENCHMARKS[gender][targetLevel]
  const benchmarkPace = benchmark.averagePace

  // Score = (benchmark / actual) * 100
  // Lower pace is better, so if athlete is faster, score > 100
  return Math.round((benchmarkPace / pacePerKm) * 100)
}

// ============================================================================
// STATION ANALYSIS
// ============================================================================

interface StationAnalysis {
  stationType: StationType
  weakStations: string[]
  strongStations: string[]
  stationScoreVsBenchmark: number
  estimatedStationTime: number | null
}

function analyzeStationAbility(input: AthleteProfileInput): StationAnalysis {
  if (!input.stationTimes) {
    return {
      stationType: 'AVERAGE_STATIONS',
      weakStations: [],
      strongStations: [],
      stationScoreVsBenchmark: 100,
      estimatedStationTime: null,
    }
  }

  // Map experience level to target level
  const targetLevel: PerformanceLevel =
    input.experienceLevel === 'advanced' ? 'elite' :
    input.experienceLevel === 'intermediate' ? 'advanced' :
    'intermediate'

  // Use existing weakness analysis
  const analysis = analyzeStationWeaknesses(
    input.stationTimes,
    input.gender,
    targetLevel
  )

  // Calculate total station time
  const stationValues = Object.values(input.stationTimes).filter(t => t !== null) as number[]
  const estimatedStationTime = stationValues.length > 0
    ? stationValues.reduce((sum, t) => sum + t, 0)
    : null

  // Calculate station score vs benchmark
  const stationScoreVsBenchmark = calculateStationScore(
    input.stationTimes,
    input.gender,
    targetLevel
  )

  // Determine station type
  const stationType = determineStationType(stationScoreVsBenchmark)

  return {
    stationType,
    weakStations: analysis.weakStations,
    strongStations: analysis.strongStations,
    stationScoreVsBenchmark,
    estimatedStationTime,
  }
}

function calculateStationScore(
  stationTimes: StationTimes,
  gender: Gender,
  targetLevel: PerformanceLevel
): number {
  // Map to station benchmark level (world_class uses elite benchmarks)
  const benchmarkLevel = targetLevel === 'world_class' ? 'elite' : targetLevel
  const benchmarks = STATION_BENCHMARKS[gender][benchmarkLevel]

  let totalRatio = 0
  let count = 0

  const stations = Object.keys(stationTimes) as (keyof StationTimes)[]
  for (const station of stations) {
    const time = stationTimes[station]
    if (time === null) continue

    const benchmark = benchmarks[station as keyof typeof benchmarks]
    if (!benchmark) continue

    // Use middle of benchmark range as target
    const benchmarkMid = (benchmark.min + benchmark.max) / 2

    // Score = (actual / benchmark) * 100
    // Higher time is worse, so if athlete is slower, score > 100
    totalRatio += (time / benchmarkMid) * 100
    count++
  }

  return count > 0 ? Math.round(totalRatio / count) : 100
}

function determineStationType(scoreVsBenchmark: number): StationType {
  if (scoreVsBenchmark <= STATION_SCORE_THRESHOLDS.STRONG_STATIONS) return 'STRONG_STATIONS'
  if (scoreVsBenchmark <= STATION_SCORE_THRESHOLDS.AVERAGE_STATIONS) return 'AVERAGE_STATIONS'
  return 'WEAK_STATIONS'
}

// ============================================================================
// ATHLETE TYPE CLASSIFICATION
// ============================================================================

function determineAthleteType(
  runnerType: RunnerType,
  stationType: StationType,
  runningScore: number,
  stationScore: number
): AthleteType {
  // FAST_WEAK: Fast runner but weak stations
  if (runnerType === 'FAST_RUNNER' && stationType === 'WEAK_STATIONS') {
    return 'FAST_WEAK'
  }
  if (runnerType === 'FAST_RUNNER' && stationScore > 120) {
    return 'FAST_WEAK'
  }

  // SLOW_STRONG: Slow runner but strong stations
  if (runnerType === 'SLOW_RUNNER' && stationType === 'STRONG_STATIONS') {
    return 'SLOW_STRONG'
  }
  if (runnerType === 'SLOW_RUNNER' && stationScore < 95) {
    return 'SLOW_STRONG'
  }

  // BALANCED: Both running and stations within 10% of each other vs benchmarks
  const scoreGap = Math.abs(runningScore - (100 - (stationScore - 100)))
  if (scoreGap <= 15 && runningScore >= 90 && stationScore <= 115) {
    return 'BALANCED'
  }

  // NEEDS_BOTH: Both running and stations significantly below benchmark
  if (runnerType !== 'FAST_RUNNER' && stationType === 'WEAK_STATIONS') {
    return 'NEEDS_BOTH'
  }
  if (runningScore < 90 && stationScore > 115) {
    return 'NEEDS_BOTH'
  }

  // Default to balanced
  return 'BALANCED'
}

// ============================================================================
// VOLUME RECOMMENDATIONS
// ============================================================================

interface VolumeAnalysis {
  recommendedWeeklyKm: number
  volumeScaleFactor: number
}

function calculateVolumeRecommendations(
  athleteType: AthleteType,
  currentWeeklyKm: number | undefined,
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
): VolumeAnalysis {
  const recommendations = WEEKLY_KM_RECOMMENDATIONS[athleteType]

  // Base recommendation
  let recommendedWeeklyKm = (recommendations.min + recommendations.max) / 2

  // Adjust based on experience level
  if (experienceLevel === 'beginner') {
    recommendedWeeklyKm = recommendations.min
  } else if (experienceLevel === 'advanced') {
    recommendedWeeklyKm = recommendations.max
  }

  // Calculate scale factor based on current vs recommended
  let volumeScaleFactor = 1.0
  if (currentWeeklyKm) {
    // Scale factor adjusts template volume to athlete's capacity
    // If athlete runs less than recommended, scale down (min 0.7)
    // If athlete runs more, scale up (max 1.3)
    const ratio = currentWeeklyKm / recommendedWeeklyKm
    volumeScaleFactor = Math.max(0.7, Math.min(1.3, ratio))

    // For SLOW_STRONG, we want to increase running, so don't cap as low
    if (athleteType === 'SLOW_STRONG') {
      volumeScaleFactor = Math.max(0.8, Math.min(1.4, ratio * 1.1))
    }

    // For FAST_WEAK, keep running steady, don't scale up as much
    if (athleteType === 'FAST_WEAK') {
      volumeScaleFactor = Math.max(0.7, Math.min(1.1, ratio))
    }
  }

  return {
    recommendedWeeklyKm: Math.round(recommendedWeeklyKm),
    volumeScaleFactor: Math.round(volumeScaleFactor * 100) / 100,
  }
}

// ============================================================================
// GOAL ANALYSIS
// ============================================================================

interface GoalAnalysis {
  goalTimeSeconds: number | null
  currentEstimatedTime: number | null
  timeGapSeconds: number | null
  isGoalRealistic: boolean
  goalAssessment: string
}

function analyzeGoal(
  goalTime: string | undefined,
  estimatedStationTime: number | null,
  pureRunPacePerKm: number | null,
  gender: Gender
): GoalAnalysis {
  if (!goalTime) {
    return {
      goalTimeSeconds: null,
      currentEstimatedTime: null,
      timeGapSeconds: null,
      isGoalRealistic: true,
      goalAssessment: 'Ingen måltid angiven',
    }
  }

  const goalTimeSeconds = parseTime(goalTime)

  if (!goalTimeSeconds) {
    return {
      goalTimeSeconds: null,
      currentEstimatedTime: null,
      timeGapSeconds: null,
      isGoalRealistic: true,
      goalAssessment: 'Kunde inte tolka måltid',
    }
  }

  // Estimate current race time
  let currentEstimatedTime: number | null = null

  if (estimatedStationTime && pureRunPacePerKm) {
    // Running: 8 x 1km at HYROX pace (add ~10% degradation from pure running)
    const hyroxRunPace = pureRunPacePerKm * 1.10
    const runningTime = hyroxRunPace * 8

    // Transitions: estimate 45s per roxzone x 8
    const transitionTime = 45 * 8

    currentEstimatedTime = Math.round(estimatedStationTime + runningTime + transitionTime)
  }

  const timeGapSeconds = currentEstimatedTime
    ? currentEstimatedTime - goalTimeSeconds
    : null

  // Assess goal realism
  let isGoalRealistic = true
  let goalAssessment = ''

  if (timeGapSeconds !== null) {
    const improvementPercent = (timeGapSeconds / (currentEstimatedTime || 1)) * 100

    if (timeGapSeconds <= 0) {
      goalAssessment = `Du är redan ${formatTime(Math.abs(timeGapSeconds))} under måltiden!`
      isGoalRealistic = true
    } else if (improvementPercent <= 5) {
      goalAssessment = `Målet är nåbart - ${formatTime(timeGapSeconds)} att förbättra (${improvementPercent.toFixed(1)}%)`
      isGoalRealistic = true
    } else if (improvementPercent <= 10) {
      goalAssessment = `Ambitiöst mål - ${formatTime(timeGapSeconds)} att förbättra (${improvementPercent.toFixed(1)}%). Möjligt med dedikerad träning.`
      isGoalRealistic = true
    } else if (improvementPercent <= 15) {
      goalAssessment = `Mycket ambitiöst - ${formatTime(timeGapSeconds)} att förbättra (${improvementPercent.toFixed(1)}%). Kan kräva längre förberedelse.`
      isGoalRealistic = false
    } else {
      goalAssessment = `Orealistiskt mål - ${formatTime(timeGapSeconds)} att förbättra (${improvementPercent.toFixed(1)}%). Överväg ett närmare delmål.`
      isGoalRealistic = false
    }
  } else {
    goalAssessment = `Måltid: ${formatTime(goalTimeSeconds)}. Ange stationstider för fullständig analys.`
  }

  return {
    goalTimeSeconds,
    currentEstimatedTime,
    timeGapSeconds,
    isGoalRealistic,
    goalAssessment,
  }
}

// ============================================================================
// PROFILE INSIGHTS GENERATION
// ============================================================================

interface ProfileInsights {
  profileDescription: string
  trainingFocus: string[]
}

function generateProfileInsights(
  athleteType: AthleteType,
  runningAnalysis: RunningAnalysis,
  stationAnalysis: StationAnalysis,
  gender: Gender
): ProfileInsights {
  const descriptions: Record<AthleteType, string> = {
    FAST_WEAK: 'Din löpkapacitet är stark, men stationerna bromsar dig. Fokusera på stationsträning och "kompromisslöpning" efter stationer.',
    SLOW_STRONG: 'Dina stationer är effektiva, men löpningen begränsar din totaltid. Öka löpvolymen och laktattröskelträning.',
    BALANCED: 'Du har en balanserad profil. Fortsätt utveckla båda områdena parallellt.',
    NEEDS_BOTH: 'Både löpning och stationer behöver utvecklas. Bygg gradvis upp kapacitet på båda fronterna.',
  }

  const focusAreas: Record<AthleteType, string[]> = {
    FAST_WEAK: [
      'Stationsspecifik uthållighetsträning',
      'Kompromisslöpning (löpning direkt efter stationer)',
      'Sled push/pull teknik och styrka',
      stationAnalysis.weakStations.length > 0
        ? `Prioritera: ${stationAnalysis.weakStations.join(', ')}`
        : 'Wall balls och Sled Pull (vanliga time sinks)',
    ],
    SLOW_STRONG: [
      'Öka löpvolym (+15-20% gradvis)',
      'Tröskelintervaller (4-8 x 1km @ LT2)',
      'Långpass med ökad distans',
      'Bibehåll stationsstyrka 1x/vecka',
    ],
    BALANCED: [
      'Fortsätt balanserad träning',
      'Periodisera löp- och stationsträning',
      'Race-simuleringar för att vänja kroppen vid HYROX-formatet',
      'Fokusera på övergångar (roxzone-effektivitet)',
    ],
    NEEDS_BOTH: [
      'Bygg aerob bas (Zone 2 löpning)',
      'Grundläggande styrka för alla stationer',
      'Gradvis öka både volym och intensitet',
      'Fokusera på teknik innan intensitet',
    ],
  }

  // Add weak stations to focus if any
  let trainingFocus = [...focusAreas[athleteType]]

  // Add pace degradation insight
  if (runningAnalysis.paceDegradationLevel) {
    const degradationInsights: Record<PaceDegradationLevel, string> = {
      ELITE: 'Utmärkt återhämtning mellan stationer',
      ADVANCED: 'Bra återhämtning, fokusera på specifik kondition',
      INTERMEDIATE: 'Förbättra stationsuthållighet för snabbare återhämtning',
      BEGINNER: 'Bygg upp kondition för att återhämta snabbare mellan stationer',
    }
    if (runningAnalysis.paceDegradationLevel !== 'ELITE') {
      trainingFocus.push(degradationInsights[runningAnalysis.paceDegradationLevel])
    }
  }

  return {
    profileDescription: descriptions[athleteType],
    trainingFocus,
  }
}

// ============================================================================
// PROGRESSIVE PACING HELPERS
// ============================================================================

/**
 * Calculate progressive pace targets for each phase of training
 */
export function calculateProgressivePaces(
  currentPacePerKm: number,  // seconds/km (current 10K pace)
  goalPacePerKm: number,     // seconds/km (target HYROX running pace)
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  totalWeeksInPhase: number
): {
  tempoPace: number        // seconds/km for tempo runs
  intervalPace: number     // seconds/km for intervals
  easyPace: number         // seconds/km for easy runs
} {
  const paceGap = currentPacePerKm - goalPacePerKm
  const phaseProgress = weekInPhase / totalWeeksInPhase

  let tempoPace: number
  let intervalPace: number
  let easyPace: number

  switch (phase) {
    case 'BASE':
      // Train at current ability
      tempoPace = currentPacePerKm
      intervalPace = currentPacePerKm - 15  // 15s faster than tempo
      easyPace = currentPacePerKm + 60      // 1 min slower than tempo
      break

    case 'BUILD':
      // Progress 50% toward goal by end of phase
      const buildProgress = paceGap * 0.5 * phaseProgress
      tempoPace = currentPacePerKm - buildProgress
      intervalPace = tempoPace - 15
      easyPace = currentPacePerKm + 50
      break

    case 'PEAK':
      // Train at or slightly faster than goal
      tempoPace = goalPacePerKm * 0.98  // 2% faster than goal
      intervalPace = goalPacePerKm - 20
      easyPace = goalPacePerKm + 45
      break

    case 'TAPER':
      // Easy paces, maintain sharpness
      tempoPace = goalPacePerKm
      intervalPace = goalPacePerKm - 10
      easyPace = currentPacePerKm + 70
      break

    default:
      tempoPace = currentPacePerKm
      intervalPace = currentPacePerKm - 15
      easyPace = currentPacePerKm + 60
  }

  return {
    tempoPace: Math.round(tempoPace),
    intervalPace: Math.round(intervalPace),
    easyPace: Math.round(easyPace),
  }
}

/**
 * Scale running volume based on athlete profile and phase
 */
export function scaleRunningVolume(
  templateDistanceKm: number,
  volumeScaleFactor: number,
  athleteType: AthleteType,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekNumber: number,
  totalWeeks: number
): number {
  // Base scaling from athlete's volume factor
  let scaledDistance = templateDistanceKm * volumeScaleFactor

  // Phase-based adjustments
  const phaseMultipliers = {
    BASE: 0.85,   // 85% of peak volume
    BUILD: 1.0,   // Peak volume
    PEAK: 0.95,   // Slightly reduced
    TAPER: 0.6,   // 60% of peak
  }
  scaledDistance *= phaseMultipliers[phase]

  // Progressive build within phase
  const progress = weekNumber / totalWeeks
  const progressionMultiplier = 0.9 + (progress * 0.2)  // 90% → 110%
  scaledDistance *= progressionMultiplier

  // Athlete type adjustments
  const typeMultipliers: Record<AthleteType, number> = {
    FAST_WEAK: 0.9,     // Slightly less running, more station work
    SLOW_STRONG: 1.15,  // More running needed
    BALANCED: 1.0,      // Standard
    NEEDS_BOTH: 0.95,   // Slightly conservative
  }
  scaledDistance *= typeMultipliers[athleteType]

  return Math.round(scaledDistance * 10) / 10
}

/**
 * Get recommended station sessions per week based on athlete type
 */
export function getStationSessionsPerWeek(athleteType: AthleteType): number {
  const sessions: Record<AthleteType, number> = {
    FAST_WEAK: 3,    // More station work
    SLOW_STRONG: 1,  // Maintain stations only
    BALANCED: 2,     // Standard
    NEEDS_BOTH: 2,   // Balance both
  }
  return sessions[athleteType]
}
