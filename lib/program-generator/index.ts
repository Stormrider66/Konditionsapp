// lib/program-generator/index.ts
// Main program generation orchestrator

import {
  Test,
  Client,
  TrainingZone,
  PeriodPhase,
  CreateTrainingProgramDTO,
  CreateTrainingWeekDTO,
  CreateTrainingDayDTO,
  CreateWorkoutDTO,
} from '@/types'
import {
  MethodologyType,
  AthleteLevel,
  getPolarizedConfig,
  getNorwegianConfig,
  getCanovaConfig,
  getPyramidalConfig,
  type MethodologyConfig,
} from '@/lib/training-engine/methodologies'
import {
  calculatePhases,
  calculateWeeklyVolumeProgression,
  applyRecoveryWeeks,
  calculateTrainingDaysPerWeek,
  getPhaseFocus,
  getLongRunDay,
  getLongRunPercentage,
} from './periodization'
import {
  calculateDeloadSchedule,
  applyDeload,
  type DeloadSchedule,
} from './deload'
import {
  calculateZonePaces,
  calculateZonePowers,
  ZonePaces,
  ZonePowers,
  getGoalPace,
} from './zone-calculator'
import {
  buildLongRun,
  buildTempoRun,
  buildIntervals,
  buildEasyRun,
  buildStrengthWorkout,
  buildCoreWorkout,
  buildPlyometricWorkout,
  buildRecoveryWorkout,
} from './workout-builder'

export interface ProgramGenerationParams {
  testId: string
  clientId: string
  coachId: string
  goalType: 'marathon' | 'half-marathon' | '10k' | '5k' | 'fitness' | 'cycling' | 'skiing' | 'custom'
  targetRaceDate?: Date
  durationWeeks: number
  trainingDaysPerWeek: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyVolume?: number // km or hours
  notes?: string

  // Methodology integration (Phase 6)
  methodology?: MethodologyType // Optional - will auto-select if not provided
  athleteLevel?: AthleteLevel // Optional - will map from experienceLevel if not provided
}

/**
 * Main program generation function
 * Creates a complete training program from test results
 */
export async function generateBaseProgram(
  test: Test,
  client: Client,
  params: ProgramGenerationParams
): Promise<CreateTrainingProgramDTO> {
  // Validate inputs
  if (!test.trainingZones || test.trainingZones.length === 0) {
    throw new Error('Test must have training zones calculated')
  }

  // Map experienceLevel to AthleteLevel if not provided
  const athleteLevel = params.athleteLevel || mapExperienceLevelToAthleteLevel(params.experienceLevel)

  // Get methodology configuration
  const methodology = params.methodology || 'POLARIZED' // Default to safest methodology
  const methodologyConfig = getMethodologyConfig(methodology, params.trainingDaysPerWeek)

  // Calculate periodization
  const phases = calculatePhases(params.durationWeeks)

  // Determine volume based on experience and goal
  const { baseVolume, peakVolume } = calculateVolumeTargets(
    params.experienceLevel,
    params.goalType,
    params.currentWeeklyVolume
  )

  const volumeProgression = calculateWeeklyVolumeProgression(
    params.durationWeeks,
    baseVolume,
    peakVolume
  )

  // Get training paces/powers from test zones
  const zones = test.testType === 'CYCLING'
    ? calculateZonePowers(test.trainingZones)
    : calculateZonePaces(test.trainingZones)

  // Generate program name
  const programName = generateProgramName(params.goalType, params.durationWeeks)

  // Build phase mapping array from PhaseDistribution object
  const phaseMapping: { weekNumber: number; phase: PeriodPhase }[] = []
  let currentWeek = 1

  // BASE PHASE
  for (let i = 0; i < phases.base; i++) {
    phaseMapping.push({ weekNumber: currentWeek++, phase: 'BASE' })
  }

  // BUILD PHASE
  for (let i = 0; i < phases.build; i++) {
    phaseMapping.push({ weekNumber: currentWeek++, phase: 'BUILD' })
  }

  // PEAK PHASE
  for (let i = 0; i < phases.peak; i++) {
    phaseMapping.push({ weekNumber: currentWeek++, phase: 'PEAK' })
  }

  // TAPER PHASE
  for (let i = 0; i < phases.taper; i++) {
    phaseMapping.push({ weekNumber: currentWeek++, phase: 'TAPER' })
  }

  // Calculate advanced deload schedule
  const deloadSchedule = calculateDeloadSchedule(
    params.durationWeeks,
    athleteLevel,
    methodology,
    phaseMapping
  )

  // Generate all weeks
  const weeks: CreateTrainingWeekDTO[] = []

  for (let weekNum = 0; weekNum < params.durationWeeks; weekNum++) {
    const weekData = volumeProgression[weekNum]

    // Apply advanced deload logic (adaptive recovery weeks)
    const adjustedVolume = applyDeload(
      weekNum + 1,
      weekData.volumePercentage,
      deloadSchedule
    )

    // Calculate training days for this phase
    const trainingDays = calculateTrainingDaysPerWeek(
      params.experienceLevel,
      weekData.phase,
      params.trainingDaysPerWeek
    )

    // Build the week (now async)
    const week = await buildWeek(
      weekNum + 1,
      weekData.phase,
      adjustedVolume,
      trainingDays,
      zones as any,
      test.trainingZones,
      params.experienceLevel,
      params.goalType,
      weekData.focus,
      methodologyConfig,
      athleteLevel
    )

    weeks.push(week)
  }

  // Calculate program dates
  const startDate = new Date()
  const endDate = params.targetRaceDate || new Date(
    startDate.getTime() + params.durationWeeks * 7 * 24 * 60 * 60 * 1000
  )

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: params.testId,
    name: programName,
    goalType: params.goalType,
    startDate,
    endDate,
    notes: params.notes,
    weeks,
  }
}

/**
 * Build a single training week
 */
async function buildWeek(
  weekNumber: number,
  phase: PeriodPhase,
  volumePercentage: number,
  trainingDays: number,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  focus: string,
  methodologyConfig: MethodologyConfig,
  athleteLevel: AthleteLevel
): Promise<CreateTrainingWeekDTO> {
  const days: CreateTrainingDayDTO[] = []

  // Determine workout distribution based on phase and volume
  const workoutPlan = determineWorkoutDistribution(
    phase,
    trainingDays,
    experienceLevel,
    goalType,
    volumePercentage,
    methodologyConfig,
    athleteLevel
  )

  // Build each training day
  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const dayWorkouts = workoutPlan.filter(w => w.dayNumber === dayNum)

    if (dayWorkouts.length > 0) {
      // Create workouts sequentially with await
      const workouts: CreateWorkoutDTO[] = []
      for (const w of dayWorkouts) {
        const workout = await createWorkout(w.type, w.params, zones, trainingZones, phase)
        workouts.push(workout)
      }

      days.push({
        dayNumber: dayNum,
        workouts,
        notes: dayNum === 7 ? 'Viktig nyckelpass denna vecka' : undefined,
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        workouts: [],
        notes: 'Vilodag',
      })
    }
  }

  return {
    weekNumber,
    startDate: new Date(), // Will be set properly by API
    phase,
    volume: volumePercentage,
    focus,
    days,
  }
}

/**
 * Calculate workout intensity distribution based on methodology
 */
interface IntensityDistribution {
  easyWorkouts: number // Zone 1 (long runs, easy runs, recovery)
  moderateWorkouts: number // Zone 2 (tempo, threshold)
  hardWorkouts: number // Zone 3 (intervals, VO2max)
}

function calculateMethodologyIntensityDistribution(
  trainingDays: number,
  methodologyConfig: MethodologyConfig,
  phase: PeriodPhase
): IntensityDistribution {
  // Get zone distribution from methodology
  const { zone1Percent, zone2Percent, zone3Percent } = methodologyConfig.zoneDistribution3

  // BASE phase: shift slightly more to Zone 1
  // PEAK/TAPER: shift slightly more to Zone 3
  let adjustedZone1 = zone1Percent
  let adjustedZone2 = zone2Percent
  let adjustedZone3 = zone3Percent

  if (phase === 'BASE' || phase === 'TRANSITION') {
    // More aerobic work in base phase
    adjustedZone1 += 5
    adjustedZone3 -= 5
  } else if (phase === 'PEAK') {
    // More race-specific work in peak
    adjustedZone3 += 5
    adjustedZone1 -= 5
  }

  // Ensure percentages still sum to 100
  const total = adjustedZone1 + adjustedZone2 + adjustedZone3
  adjustedZone1 = (adjustedZone1 / total) * 100
  adjustedZone2 = (adjustedZone2 / total) * 100
  adjustedZone3 = (adjustedZone3 / total) * 100

  // Calculate number of workouts in each zone
  // Subtract 1-2 days for strength/core (non-cardio)
  const cardioWorkouts = Math.max(trainingDays - 1, 2)

  const easyWorkouts = Math.round((cardioWorkouts * adjustedZone1) / 100)
  const hardWorkouts = Math.round((cardioWorkouts * adjustedZone3) / 100)
  const moderateWorkouts = cardioWorkouts - easyWorkouts - hardWorkouts

  return {
    easyWorkouts: Math.max(easyWorkouts, 1), // Always at least 1 easy workout
    moderateWorkouts: Math.max(moderateWorkouts, 0),
    hardWorkouts: Math.max(hardWorkouts, 0),
  }
}

/**
 * Determine workout distribution for a week
 */
interface WorkoutSlot {
  dayNumber: number
  type: string
  params: any
}

function determineWorkoutDistribution(
  phase: PeriodPhase,
  trainingDays: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  volumePercentage: number,
  methodologyConfig: MethodologyConfig,
  athleteLevel: AthleteLevel
): WorkoutSlot[] {
  const workouts: WorkoutSlot[] = []

  // Recovery weeks get easier workouts
  const isRecoveryWeek = volumePercentage < 80

  // Calculate intensity distribution from methodology
  const intensityDist = calculateMethodologyIntensityDistribution(
    trainingDays,
    methodologyConfig,
    phase
  )

  // Distribute workouts throughout the week based on methodology
  let currentDay = 1
  let easyCount = 0
  let moderateCount = 0
  let hardCount = 0

  switch (phase) {
    case 'BASE':
      // BASE: Focus on aerobic development with methodology-specific distribution
      // Always include long run on weekend (Sunday = day 7)
      workouts.push({ dayNumber: 7, type: 'long', params: { distance: 15 } })
      easyCount++

      // Distribute remaining easy workouts
      const baseEasyRemaining = intensityDist.easyWorkouts - 1 // -1 for long run
      for (let i = 0; i < baseEasyRemaining && currentDay <= 6; i++) {
        if (currentDay === 1 || currentDay === 3) {
          workouts.push({ dayNumber: currentDay, type: 'easy', params: { duration: 40 } })
          currentDay++
          easyCount++
        }
        currentDay++
      }

      // Add strength work if days available
      if (trainingDays >= 4) {
        workouts.push({ dayNumber: 5, type: 'strength', params: { focus: 'full' } })
      }
      if (trainingDays >= 6) {
        workouts.push({ dayNumber: 4, type: 'core', params: {} })
      }
      break

    case 'BUILD':
      // BUILD: Add quality work based on methodology
      // Long run on weekend
      workouts.push({ dayNumber: 7, type: 'long', params: { distance: 18 } })
      easyCount++

      // Add hard workouts (intervals) - key day on Tuesday
      for (let i = 0; i < intensityDist.hardWorkouts && hardCount < intensityDist.hardWorkouts; i++) {
        if (!isRecoveryWeek) {
          workouts.push({
            dayNumber: 2,
            type: 'intervals',
            params: { reps: 5, work: 4, rest: 2, zone: 4 }
          })
          hardCount++
        }
      }

      // Add moderate workouts (tempo) - Thursday
      for (let i = 0; i < intensityDist.moderateWorkouts && moderateCount < intensityDist.moderateWorkouts; i++) {
        if (!isRecoveryWeek) {
          workouts.push({ dayNumber: 4, type: 'tempo', params: { duration: 25 } })
          moderateCount++
        }
      }

      // Fill remaining with easy runs
      const buildEasyRemaining = intensityDist.easyWorkouts - 1 // -1 for long run
      for (let i = 0; i < buildEasyRemaining; i++) {
        if (easyCount < intensityDist.easyWorkouts) {
          const day = i === 0 ? 5 : 1
          workouts.push({ dayNumber: day, type: 'easy', params: { duration: 40 } })
          easyCount++
        }
      }

      // Add strength work
      if (trainingDays >= 5) {
        workouts.push({ dayNumber: 3, type: 'strength', params: { focus: 'lower' } })
      }
      if (trainingDays >= 6) {
        workouts.push({ dayNumber: 6, type: 'core', params: {} })
      }
      break

    case 'PEAK':
      // PEAK: Maximum race-specific work
      workouts.push({ dayNumber: 7, type: 'long', params: { distance: 20 } })
      easyCount++

      // More hard work in peak phase (following methodology)
      workouts.push({
        dayNumber: 4,
        type: 'intervals',
        params: { reps: 6, work: 5, rest: 2, zone: 5 }
      })
      hardCount++

      // Add tempo/threshold work if methodology allows (moderate zone)
      if (intensityDist.moderateWorkouts > 0) {
        workouts.push({ dayNumber: 1, type: 'tempo', params: { duration: 30 } })
        moderateCount++
      }

      // Fill with easy runs
      for (let i = easyCount; i < intensityDist.easyWorkouts; i++) {
        workouts.push({ dayNumber: 2 + i, type: 'easy', params: { duration: 45 } })
      }

      // Plyometric work for race sharpness
      if (trainingDays >= 5) {
        workouts.push({ dayNumber: 3, type: 'plyometric', params: {} })
      }
      break

    case 'TAPER':
      // TAPER: Reduce volume but maintain some intensity
      // Short easy runs + one key workout
      workouts.push({ dayNumber: 2, type: 'easy', params: { duration: 30 } })
      workouts.push({ dayNumber: 6, type: 'easy', params: { duration: 40 } })

      // One sharp interval session to maintain fitness
      if (intensityDist.hardWorkouts > 0 && !isRecoveryWeek) {
        workouts.push({
          dayNumber: 4,
          type: 'intervals',
          params: { reps: 4, work: 3, rest: 3, zone: 5 }
        })
      }

      // Recovery on other days
      if (trainingDays >= 4) {
        workouts.push({ dayNumber: 1, type: 'recovery', params: {} })
      }
      break

    case 'RECOVERY':
      // RECOVERY: All easy, following methodology's easy percentage (should be ~100%)
      for (let i = 0; i < Math.min(trainingDays, 3); i++) {
        const days = [2, 5, 3]
        const types = ['recovery', 'easy', 'core']
        workouts.push({ dayNumber: days[i], type: types[i], params: i === 1 ? { duration: 30 } : {} })
      }
      break

    case 'TRANSITION':
      // TRANSITION: Build base, mostly easy
      for (let i = 0; i < Math.min(trainingDays, 3); i++) {
        const days = [2, 7, 4]
        const types = ['easy', 'easy', 'strength']
        const params = i === 0 ? { duration: 40 } : i === 1 ? { duration: 50 } : { focus: 'full' }
        workouts.push({ dayNumber: days[i], type: types[i], params })
      }
      break
  }

  return workouts
}

/**
 * Create a workout from type and parameters
 */
async function createWorkout(
  type: string,
  params: any,
  zones: ZonePaces | ZonePowers,
  trainingZones: TrainingZone[],
  phase: PeriodPhase
): Promise<CreateWorkoutDTO> {
  switch (type) {
    case 'long':
      return buildLongRun(params.distance, zones as ZonePaces, trainingZones)

    case 'tempo':
      return buildTempoRun(params.duration, zones as ZonePaces, trainingZones)

    case 'intervals':
      return buildIntervals(
        params.reps,
        params.work,
        params.rest,
        params.zone,
        zones as ZonePaces,
        trainingZones
      )

    case 'easy':
      return buildEasyRun(params.duration, zones as ZonePaces, trainingZones)

    case 'strength':
      // Fetch actual exercise IDs from database
      const strengthExercises = await getDefaultExercises('strength', params.focus)
      return buildStrengthWorkout(phase, params.focus, strengthExercises)

    case 'core':
      const coreExercises = await getDefaultExercises('core')
      return buildCoreWorkout(coreExercises)

    case 'plyometric':
      const plyoExercises = await getDefaultExercises('plyometric')
      return buildPlyometricWorkout(plyoExercises)

    case 'recovery':
      return buildRecoveryWorkout()

    default:
      return buildEasyRun(30, zones as ZonePaces, trainingZones)
  }
}

/**
 * Get default exercise IDs from database
 */
async function getDefaultExercises(category: string, focus?: string): Promise<string[]> {
  const { prisma } = await import('@/lib/prisma')

  try {
    // Build muscle group filter based on focus
    let muscleGroupFilter: string | undefined

    if (category === 'strength' && focus) {
      muscleGroupFilter = focus === 'lower' ? 'Ben' :
                          focus === 'upper' ? 'Överkropp' :
                          undefined // 'full' includes both
    }

    console.log(`[getDefaultExercises] Searching for category: ${category.toUpperCase()}, focus: ${focus}, muscleGroupFilter: ${muscleGroupFilter}`)

    // Query public exercises
    const exercises = await prisma.exercise.findMany({
      where: {
        isPublic: true,
        category: category.toUpperCase() as any,
        ...(muscleGroupFilter && { muscleGroup: { contains: muscleGroupFilter } }),
      },
      take: 5,
      select: { id: true },
    })

    console.log(`[getDefaultExercises] Found ${exercises.length} exercises:`, exercises.map(e => e.id))

    if (exercises.length === 0) {
      console.warn(`❌ No exercises found for category: ${category}, focus: ${focus}`)
      return []
    }

    return exercises.map(e => e.id)
  } catch (error) {
    console.error('❌ Error fetching exercises:', error)
    return []
  }
}

/**
 * Calculate volume targets based on experience and goal
 */
function calculateVolumeTargets(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  goalType: string,
  currentVolume?: number
): { baseVolume: number; peakVolume: number } {
  // Base volumes (km per week for running)
  const baseVolumes = {
    beginner: { base: 20, peak: 40 },
    intermediate: { base: 35, peak: 65 },
    advanced: { base: 50, peak: 90 },
  }

  // Adjust for goal type
  const multipliers = {
    'marathon': 1.2,
    'half-marathon': 1.0,
    '10k': 0.8,
    '5k': 0.7,
    'fitness': 0.6,
    'cycling': 1.5, // Hours instead of km
    'skiing': 1.0,
    'custom': 1.0,
  }

  const base = baseVolumes[experienceLevel]
  const multiplier = multipliers[goalType as keyof typeof multipliers] || 1.0

  // Use current volume if provided, otherwise use default
  const actualBase = currentVolume
    ? Math.min(currentVolume, base.base * multiplier)
    : base.base * multiplier

  return {
    baseVolume: actualBase,
    peakVolume: base.peak * multiplier,
  }
}

/**
 * Generate program name
 */
function generateProgramName(goalType: string, weeks: number): string {
  const goalNames: Record<string, string> = {
    'marathon': 'Maratonprogram',
    'half-marathon': 'Halvmaratonprogram',
    '10k': '10K-program',
    '5k': '5K-program',
    'fitness': 'Konditionsprogram',
    'cycling': 'Cykelprogram',
    'skiing': 'Skidprogram',
    'custom': 'Träningsprogram',
  }

  const name = goalNames[goalType] || 'Träningsprogram'
  return `${name} (${weeks} veckor)`
}

/**
 * Validate program parameters
 */
export function validateProgramParams(params: ProgramGenerationParams): string[] {
  const errors: string[] = []

  if (params.durationWeeks < 4) {
    errors.push('Program måste vara minst 4 veckor')
  }

  if (params.durationWeeks > 52) {
    errors.push('Program kan inte vara längre än 52 veckor')
  }

  if (params.trainingDaysPerWeek < 2) {
    errors.push('Minst 2 träningsdagar per vecka krävs')
  }

  if (params.trainingDaysPerWeek > 7) {
    errors.push('Max 7 träningsdagar per vecka')
  }

  if (params.targetRaceDate && params.targetRaceDate < new Date()) {
    errors.push('Tävlingsdatum kan inte vara i det förflutna')
  }

  return errors
}

/**
 * Map experienceLevel to AthleteLevel for methodology selection
 */
function mapExperienceLevelToAthleteLevel(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): AthleteLevel {
  const mapping: Record<string, AthleteLevel> = {
    beginner: 'BEGINNER',
    intermediate: 'RECREATIONAL',
    advanced: 'ADVANCED',
  }
  return mapping[experienceLevel]
}

/**
 * Get methodology configuration
 */
function getMethodologyConfig(
  methodology: MethodologyType,
  weeklySessionCount: number
): MethodologyConfig {
  switch (methodology) {
    case 'POLARIZED':
      return getPolarizedConfig(weeklySessionCount)
    case 'NORWEGIAN':
      return getNorwegianConfig(weeklySessionCount)
    case 'CANOVA':
      return getCanovaConfig(weeklySessionCount)
    case 'PYRAMIDAL':
      return getPyramidalConfig(weeklySessionCount)
    default:
      return getPolarizedConfig(weeklySessionCount) // Default fallback
  }
}
