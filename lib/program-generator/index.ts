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
  getNorwegianSingleConfig,
  getCanovaConfig,
  getPyramidalConfig,
  type MethodologyConfig,
} from '@/lib/training-engine/methodologies'
// Methodology-specific imports moved to workout-distribution module
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
  fetchElitePaces,
  validateEliteZones,
  getRecommendedMethodology,
  getZoneConfidenceWarnings,
  formatZoneSummary,
  type EliteZonePaces,
} from './elite-pace-integration'
import {
  buildLongRun,
  buildTempoRun,
  buildIntervals,
  buildHillSprints,
  buildCanovaIntervals,
  buildEasyRun,
  buildStrengthWorkout,
  buildCoreWorkout,
  buildPlyometricWorkout,
  buildRecoveryWorkout,
} from './workout-builder'
import { selectReliableMarathonPace, formatPaceValidation, type RaceResultForPace } from './pace-validator'
import { determineWorkoutDistribution } from './workout-distribution'

export interface ProgramGenerationParams {
  testId: string
  clientId: string
  coachId: string
  goalType: 'marathon' | 'half-marathon' | '10k' | '5k' | 'fitness' | 'cycling' | 'skiing' | 'custom'
  targetRaceDate?: Date
  targetTime?: string // Target race time in format "H:MM:SS" or "HH:MM:SS" (e.g., "3:00:00" for 3h marathon)
  durationWeeks: number
  trainingDaysPerWeek: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyVolume?: number // km or hours
  notes?: string

  // Recent race result for current fitness calculation (Canova: "10k/HM PRs used to calculate baseline")
  recentRaceDistance?: 'NONE' | '5K' | '10K' | 'HALF' | 'MARATHON' // Recent race distance
  recentRaceTime?: string // Recent race time in format "H:MM:SS" or "MM:SS"

  // Methodology integration (Phase 6)
  methodology?: MethodologyType // Optional - will auto-select if not provided
  athleteLevel?: AthleteLevel // Optional - will map from experienceLevel if not provided

  // Granular session control
  runningSessionsPerWeek?: number // 1-14 (supports double days)
  strengthSessionsPerWeek?: number // 0-7
  coreSessionsPerWeek?: number // 0-7
  alternativeTrainingSessionsPerWeek?: number // 0-7 (cross-training)
  scheduleStrengthAfterRunning?: boolean // Same-day PM session
  scheduleCoreAfterRunning?: boolean // Same-day PM session

  // Additional athlete profile fields from wizard
  yearsRunning?: number // Years of running experience
  longestLongRun?: number // Longest long run in km in last 6 months

  // Equipment & Monitoring
  hasLactateMeter?: boolean // Enables Norwegian method
  hasHRVMonitor?: boolean // Daily recovery tracking
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
  console.log('=====================================')
  console.log('PROGRAM GENERATION: Starting')
  console.log('=====================================\n')

  // Step 0.5: Fetch recent race results for VDOT-based pace calculation
  console.log('[0/6] Fetching recent race results...')
  const recentRaceResult = await fetchRecentRaceResult(params.clientId)

  // Step 1: Fetch elite paces from comprehensive pace selector
  console.log('[1/6] Fetching elite paces...')
  let elitePaces: EliteZonePaces | null = null

  try {
    elitePaces = await fetchElitePaces(client.id)

    if (elitePaces && validateEliteZones(elitePaces)) {
      console.log('✓ Elite paces fetched successfully')
      console.log('  Source:', elitePaces.source)
      console.log('  Confidence:', elitePaces.confidence)
      console.log('  Athlete Level:', elitePaces.athleteLevel)
      if (elitePaces.metabolicType) {
        console.log('  Metabolic Type:', elitePaces.metabolicType)
      }

      // Check for warnings
      const warnings = getZoneConfidenceWarnings(elitePaces)
      if (warnings.length > 0) {
        console.log('\n⚠️  Zone Confidence Warnings:')
        warnings.forEach((w) => console.log('   -', w))
      }
    } else {
      console.log('⚠️  Elite paces not available, using legacy zone calculation')
    }
  } catch (error) {
    console.error('❌ Error fetching elite paces:', error)
    console.log('   Using legacy zone calculation from test')
  }

  // Validate inputs (updated to allow elite paces OR test zones)
  if (!elitePaces && (!test.trainingZones || test.trainingZones.length === 0)) {
    throw new Error('Test must have training zones calculated OR client must have race results/lactate data')
  }

  // Map experienceLevel to AthleteLevel if not provided
  const athleteLevel = params.athleteLevel || mapExperienceLevelToAthleteLevel(params.experienceLevel)

  // Get methodology configuration
  // Handle 'AUTO' by selecting appropriate methodology based on athlete profile
  console.log('\n[2/6] Selecting training methodology...')
  let methodology: MethodologyType = 'POLARIZED' // Default to safest methodology

  if (params.methodology === ('AUTO' as any) || !params.methodology) {
    // Auto-select using elite classification if available
    if (elitePaces && validateEliteZones(elitePaces)) {
      methodology = getRecommendedMethodology(
        elitePaces.athleteLevel,
        elitePaces.metabolicType,
        params.goalType
      )
      console.log(`✓ Auto-selected: ${methodology} (from elite classification)`)
    } else {
      // Fallback to legacy rule-based selection
      if (athleteLevel === 'ELITE' || athleteLevel === 'ADVANCED') {
        if (params.goalType === 'marathon' || params.goalType === 'half-marathon') {
          methodology = 'CANOVA'
        } else {
          methodology = 'POLARIZED'
        }
      } else {
        methodology = 'POLARIZED'
      }
      console.log(`✓ Auto-selected: ${methodology} (legacy rules)`)
    }
  } else if (params.methodology === ('LYDIARD' as any)) {
    // LYDIARD not yet implemented, use CANOVA as closest equivalent
    methodology = 'CANOVA'
    console.log(`✓ Using specified: ${methodology} (LYDIARD mapped to CANOVA)`)
  } else {
    // Use the specified methodology
    methodology = params.methodology as MethodologyType
    console.log(`✓ Using specified: ${methodology}`)
  }

  const methodologyConfig = getMethodologyConfig(methodology, params.trainingDaysPerWeek)

  console.log(`[Program Generator] Using methodology: ${methodology} (requested: ${params.methodology})`)
  console.log(`[Program Generator] Methodology config type: ${methodologyConfig.type}`)

  // Calculate periodization (methodology-aware for Canova)
  const phases = calculatePhases(params.durationWeeks, methodology)
  console.log(`[Program Generator] Phase distribution for ${params.durationWeeks} weeks (${methodology}):`, phases)
  console.log(`[Program Generator] Total phase weeks: ${phases.base + phases.build + phases.peak + phases.taper}`)

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
  console.log(`[Program Generator] Volume progression length: ${volumeProgression.length} (expected: ${params.durationWeeks})`)

  // Get training paces/powers (elite or legacy)
  console.log('\n[3/6] Determining training zones...')
  const zones = (elitePaces && validateEliteZones(elitePaces))
    ? elitePaces.legacy // Use elite-calculated paces
    : (test.testType === 'CYCLING'
        ? calculateZonePowers(test.trainingZones || [])
        : calculateZonePaces(test.trainingZones || []))

  if (elitePaces && validateEliteZones(elitePaces)) {
    console.log('✓ Using ELITE pace system')
    console.log('  Marathon pace:', elitePaces.core.marathon)
    console.log('  Threshold pace:', elitePaces.core.threshold)
  } else {
    console.log('✓ Using LEGACY zone calculation')
    console.log('  Zone 2 (Marathon):', zones.zone2)
    console.log('  Zone 3 (Threshold):', zones.zone3)
  }

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

  // Track week within each phase
  let weekInPhase = 0
  let currentPhase: PeriodPhase | null = null

  for (let weekNum = 0; weekNum < params.durationWeeks; weekNum++) {
    const weekData = volumeProgression[weekNum]

    // Safety check: ensure weekData exists
    if (!weekData) {
      console.error(`❌ Missing week data for week ${weekNum + 1}. Volume progression length: ${volumeProgression.length}, expected: ${params.durationWeeks}`)
      throw new Error(`Program generation failed: Missing week ${weekNum + 1} data. Please check program duration.`)
    }

    // Track week within phase (reset when phase changes)
    if (currentPhase !== weekData.phase) {
      currentPhase = weekData.phase
      weekInPhase = 0
    }
    weekInPhase++

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
      test.trainingZones || [],
      params.experienceLevel,
      params.goalType,
      weekData.focus,
      methodologyConfig,
      athleteLevel,
      weekInPhase,
      test, // Pass test for lactate-based calculations
      params, // Pass params for granular session control
      elitePaces, // Pass elite paces for methodology-specific zones
      recentRaceResult // Pass race result for VDOT-based pace calculation
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
  athleteLevel: AthleteLevel,
  weekInPhase: number,
  test: Test,
  params: ProgramGenerationParams,
  elitePaces: EliteZonePaces | null, // Elite pace data (if available)
  recentRaceResult?: RaceResultForPace // Race result for VDOT-based pace calculation
): Promise<CreateTrainingWeekDTO> {
  // Log elite pace usage for this week
  if (elitePaces) {
    console.log(`  Week ${weekNumber}: Using ${elitePaces.source} paces (${elitePaces.confidence} confidence)`)
  }
  const days: CreateTrainingDayDTO[] = []

  // Determine workout distribution based on phase and volume
  const workoutPlan = determineWorkoutDistribution({
    phase,
    trainingDays,
    experienceLevel,
    goalType,
    volumePercentage,
    methodologyConfig,
    athleteLevel,
    weekInPhase,
    weekNumber,       // Pass overall week number for progressive pacing
    totalWeeks: params.durationWeeks, // Pass total weeks for progressive pacing
    test,
    params,
    elitePaces,
    recentRaceResult
  })

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
      return buildLongRun(params, zones as ZonePaces, trainingZones)

    case 'tempo':
      return buildTempoRun(params, zones as ZonePaces, trainingZones)

    case 'intervals':
      return buildIntervals(
        params.reps,
        params.work,
        params.rest,
        params.zone,
        zones as ZonePaces,
        trainingZones
      )

    case 'hillSprints':
      return buildHillSprints(
        params.reps,
        params.workSeconds,
        params.rest,
        zones as ZonePaces,
        trainingZones
      )

    case 'canovaIntervals':
      return buildCanovaIntervals(
        params.reps,
        params.workDistance,
        params.pacePercent,
        params.recoveryDistance,
        params.recoveryPacePercent,
        params.marathonPace,
        zones as ZonePaces,
        trainingZones
      )

    case 'easy':
      return buildEasyRun(params, zones as ZonePaces, trainingZones)

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
 * Uses the new strength training system's Exercise schema
 */
async function getDefaultExercises(category: string, focus?: string): Promise<string[]> {
  const { prisma } = await import('@/lib/prisma')

  try {
    console.log(`[getDefaultExercises] Searching for category: ${category.toUpperCase()}, focus: ${focus}`)

    let exercises: any[] = []

    if (category === 'strength') {
      // For strength workouts, select exercises based on biomechanical balance
      // Get 1 exercise from each pillar for a balanced workout

      const pillars = focus === 'upper'
        ? ['UPPER_BODY', 'CORE']
        : focus === 'lower'
        ? ['POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'UNILATERAL', 'FOOT_ANKLE']
        : ['POSTERIOR_CHAIN', 'KNEE_DOMINANCE', 'UNILATERAL', 'CORE']

      for (const pillar of pillars) {
        const ex = await prisma.exercise.findFirst({
          where: {
            isPublic: true,
            category: 'STRENGTH',
            biomechanicalPillar: pillar as any,
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' }, // Use oldest (most basic) exercises
        })
        if (ex) exercises.push(ex)
      }
    } else if (category === 'core') {
      // Core exercises from CORE pillar
      exercises = await prisma.exercise.findMany({
        where: {
          isPublic: true,
          category: 'CORE',
          biomechanicalPillar: 'CORE' as any,
        },
        take: 4,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    } else if (category === 'plyometric') {
      // Plyometric exercises
      exercises = await prisma.exercise.findMany({
        where: {
          isPublic: true,
          category: 'PLYOMETRIC',
        },
        take: 3,
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    }

    console.log(`[getDefaultExercises] Found ${exercises.length} exercises for ${category}/${focus}`)

    if (exercises.length === 0) {
      console.warn(`❌ No exercises found for category: ${category}, focus: ${focus}. Make sure exercises are seeded!`)
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
 * Fetch the most recent race result for a client
 * Returns formatted data for VDOT-based pace calculation
 */
async function fetchRecentRaceResult(clientId: string): Promise<RaceResultForPace | undefined> {
  const { prisma } = await import('@/lib/prisma')

  // Standard race distances in meters
  const distanceMap: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF_MARATHON': 21097.5,
    'MARATHON': 42195,
  }

  try {
    // Fetch the most recent race result from the RaceResult model
    const recentRace = await prisma.raceResult.findFirst({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      select: {
        distance: true,
        customDistanceKm: true,
        timeMinutes: true,
        raceDate: true,
      },
    })

    if (!recentRace) {
      console.log('[Program Generator] No race results found for client')
      return undefined
    }

    // Convert distance to meters
    let distanceMeters: number
    if (recentRace.distance === 'CUSTOM' && recentRace.customDistanceKm) {
      distanceMeters = recentRace.customDistanceKm * 1000
    } else {
      distanceMeters = distanceMap[recentRace.distance] || 0
    }

    if (distanceMeters === 0) {
      console.log(`[Program Generator] Unknown distance: ${recentRace.distance}`)
      return undefined
    }

    // Convert timeMinutes to seconds
    const timeSeconds = recentRace.timeMinutes * 60

    console.log(`[Program Generator] ✓ Found race result: ${(distanceMeters/1000).toFixed(1)}km in ${Math.floor(timeSeconds/60)}:${String(Math.round(timeSeconds%60)).padStart(2,'0')}`)

    return {
      distanceMeters,
      timeSeconds,
      date: recentRace.raceDate,
    }
  } catch (error) {
    console.error('[Program Generator] Error fetching race result:', error)
    return undefined
  }
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
    case 'NORWEGIAN_SINGLE':
      return getNorwegianSingleConfig(weeklySessionCount)
    case 'CANOVA':
      return getCanovaConfig(weeklySessionCount)
    case 'PYRAMIDAL':
      return getPyramidalConfig(weeklySessionCount)
    default:
      return getPolarizedConfig(weeklySessionCount) // Default fallback
  }
}
