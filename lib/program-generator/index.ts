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
import {
  generateCanovaWeek,
  getCanovaSpecialBlock,
  getCanovaLongFastRun,
  getCanovaIntervals,
  selectCanovaWorkout,
  calculateCanovaZones,
  type CanovaPhase,
  type CanovaBlockType
} from '@/lib/training-engine/methodologies/canova'
import {
  generatePolarizedWeek,
  generatePolarizedWeekAdvanced,
  getSeilerInterval,
  selectSeilerInterval,
  getLSDSession,
  calculateSessionDistribution,
  type PolarizedPhase,
  type SeilerIntervalType
} from '@/lib/training-engine/methodologies/polarized'
import {
  generateNorwegianWeek,
  generateNorwegianSingleWeek,
  selectNorwegianDoublesSession,
  getNorwegianDoublesSession,
  calculateNorwegianDoublesIntensity,
  selectNorwegianSinglesSessionType,
  getNorwegianSinglesSession,
  calculateNorwegianSinglesIntensity
} from '@/lib/training-engine/methodologies/norwegian'
import {
  generatePyramidalWeek,
  getCruiseIntervalSession,
  getContinuousTempoSession,
  getAdvancedThresholdSession,
  calculateVolumeAdjustedPyramid,
  calculateEventSpecificPyramid,
  selectCruiseInterval,
  selectContinuousTempo,
  type PyramidalPhase,
  type PyramidalEventType,
  type CruiseIntervalType,
  type ContinuousTempoType
} from '@/lib/training-engine/methodologies/pyramidal'
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
import { selectReliableMarathonPace, formatPaceValidation } from './pace-validator'

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

  // Granular session control
  runningSessionsPerWeek?: number // 1-14 (supports double days)
  strengthSessionsPerWeek?: number // 0-7
  coreSessionsPerWeek?: number // 0-7
  alternativeTrainingSessionsPerWeek?: number // 0-7 (cross-training)
  scheduleStrengthAfterRunning?: boolean // Same-day PM session
  scheduleCoreAfterRunning?: boolean // Same-day PM session
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

  if (params.methodology === 'AUTO' || !params.methodology) {
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
  } else if (params.methodology === 'LYDIARD') {
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

  // Calculate periodization
  const phases = calculatePhases(params.durationWeeks)
  console.log(`[Program Generator] Phase distribution for ${params.durationWeeks} weeks:`, phases)
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
        ? calculateZonePowers(test.trainingZones)
        : calculateZonePaces(test.trainingZones))

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
      test.trainingZones,
      params.experienceLevel,
      params.goalType,
      weekData.focus,
      methodologyConfig,
      athleteLevel,
      weekInPhase,
      test, // Pass test for lactate-based calculations
      params, // Pass params for granular session control
      elitePaces // Pass elite paces for methodology-specific zones
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
  elitePaces: EliteZonePaces | null // Elite pace data (if available)
): Promise<CreateTrainingWeekDTO> {
  // Log elite pace usage for this week
  if (elitePaces) {
    console.log(`  Week ${weekNumber}: Using ${elitePaces.source} paces (${elitePaces.confidence} confidence)`)
  }
  const days: CreateTrainingDayDTO[] = []

  // Determine workout distribution based on phase and volume
  const workoutPlan = determineWorkoutDistribution(
    phase,
    trainingDays,
    experienceLevel,
    goalType,
    volumePercentage,
    methodologyConfig,
    athleteLevel,
    weekInPhase,
    test,
    params
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
  athleteLevel: AthleteLevel,
  weekInPhase: number,
  test: Test,
  params: ProgramGenerationParams
): WorkoutSlot[] {
  const workouts: WorkoutSlot[] = []

  // Recovery weeks get easier workouts
  const isRecoveryWeek = volumePercentage < 80

  // === CANOVA METHODOLOGY - Elite marathon training with Special Blocks ===
  if (methodologyConfig.type === 'CANOVA') {
    console.log(`[Workout Distribution] Using CANOVA elite methodology for ${phase} phase, week ${weekInPhase}`)

    // Map periodization phases to Canova phases
    const canovaPhase: CanovaPhase =
      phase === 'BASE' && weekInPhase <= 4 ? 'GENERAL' :
      phase === 'BASE' ? 'FUNDAMENTAL' :
      phase === 'BUILD' ? 'SPECIAL' :
      phase === 'PEAK' ? 'SPECIFIC' :
      'TAPER'

    console.log(`[Canova] Mapped to Canova phase: ${canovaPhase}`)

    // === SMART MARATHON PACE SELECTION ===
    // Use validated pace from test data with consistency checks
    const paceValidation = selectReliableMarathonPace(
      test as any,
      params.goalType,
      params.targetRaceDate
    )

    const marathonPaceKmh = paceValidation.marathonPaceKmh

    // Log validation results
    console.log(`[Canova] ${formatPaceValidation(paceValidation)}`)

    // Log warnings and errors for monitoring
    if (paceValidation.warnings.length > 0) {
      console.warn(`[Canova] ⚠️ VARNINGAR:`, paceValidation.warnings)
    }
    if (paceValidation.errors.length > 0) {
      console.error(`[Canova] 🚨 FEL:`, paceValidation.errors)
    }

    const canovaZones = calculateCanovaZones(marathonPaceKmh)

    // === SPECIAL BLOCK DAYS (every 3-4 weeks in SPECIAL/SPECIFIC phases) ===
    const isBlockWeek = (canovaPhase === 'SPECIAL' && weekInPhase % 4 === 0) ||
                        (canovaPhase === 'SPECIFIC' && weekInPhase % 3 === 0)

    if (isBlockWeek && trainingDays >= 6) {
      console.log(`[Canova] ⭐ SPECIAL BLOCK WEEK - Double workout day`)

      // Determine block type based on athlete level and phase
      const blockType: CanovaBlockType =
        canovaPhase === 'SPECIFIC' ? 'MIXED' :
        athleteLevel === 'ELITE' && weekInPhase % 2 === 0 ? 'EXTENSIVE' :
        'INTENSIVE'

      const specialBlock = getCanovaSpecialBlock(blockType, athleteLevel === 'ELITE' ? 'ELITE' : 'ADVANCED')

      console.log(`[Canova] Block type: ${blockType}`)
      console.log(`[Canova] Total volume: ${specialBlock.totalDailyVolume}km`)
      console.log(`[Canova] Nutritional strategy: ${specialBlock.nutritionalStrategy}`)

      // === TUESDAY: SPECIAL BLOCK DAY (AM + PM sessions) ===
      // AM Session
      workouts.push({
        dayNumber: 2,
        type: 'tempo', // Or intervals depending on block structure
        params: {
          description: specialBlock.amSession.description,
          distance: specialBlock.amSession.totalDistance,
          pacePercent: specialBlock.amSession.segments[0].pacePercent,
          marathonPace: marathonPaceKmh,
          sessionTime: 'AM',
          specialBlock: true
        }
      })

      // PM Session
      workouts.push({
        dayNumber: 2,
        type: blockType === 'MIXED' ? 'intervals' : 'tempo',
        params: {
          description: specialBlock.pmSession.description,
          distance: specialBlock.pmSession.totalDistance,
          pacePercent: specialBlock.pmSession.segments[0].pacePercent,
          marathonPace: marathonPaceKmh,
          sessionTime: 'PM',
          specialBlock: true
        }
      })

      // === REGENERATION DAYS (after block) ===
      // Wednesday, Thursday: Very slow regeneration runs
      for (let day = 3; day <= 4; day++) {
        workouts.push({
          dayNumber: day,
          type: 'easy',
          params: {
            duration: 40,
            pacePercent: 55, // Regeneration: 50-60% MP
            description: 'Regeneration: Very slow recovery (50-60% MP)',
            regeneration: true
          }
        })
      }

      // === FRIDAY: Moderate quality ===
      const moderateIntervals = getCanovaIntervals('SPECIFIC_INTENSIVE', weekInPhase)
      workouts.push({
        dayNumber: 5,
        type: 'canovaIntervals',
        params: {
          reps: moderateIntervals.reps,
          workDistance: moderateIntervals.workDistance,
          pacePercent: moderateIntervals.workPacePercent,
          recoveryDistance: moderateIntervals.recoveryDistance,
          recoveryPacePercent: moderateIntervals.recoveryPacePercent,
          marathonPace: marathonPaceKmh
        }
      })

      // === SUNDAY: Long Fast Run ===
      const longRun = getCanovaLongFastRun(canovaPhase, 'CONTINUOUS')
      workouts.push({
        dayNumber: 7,
        type: 'long',
        params: {
          distance: longRun.totalDistance,
          pacePercent: longRun.segments[0].pacePercent,
          description: longRun.description,
          marathonPace: marathonPaceKmh
        }
      })

      return workouts
    }

    // === NORMAL WEEKS (non-block weeks) ===

    // === TUESDAY: Quality session 1 ===
    const quality1Type = selectCanovaWorkout(canovaPhase, weekInPhase, 'QUALITY_1')

    if (quality1Type === 'SPECIFIC_EXTENSIVE') {
      // Long intervals with active recovery
      const intervals = getCanovaIntervals('SPECIFIC_EXTENSIVE', weekInPhase)
      workouts.push({
        dayNumber: 2,
        type: 'canovaIntervals',
        params: {
          reps: intervals.reps,
          workDistance: intervals.workDistance,
          pacePercent: intervals.workPacePercent,
          recoveryDistance: intervals.recoveryDistance,
          recoveryPacePercent: intervals.recoveryPacePercent,
          marathonPace: marathonPaceKmh
        }
      })
    } else {
      // Fundamental or other continuous run
      workouts.push({
        dayNumber: 2,
        type: 'tempo',
        params: {
          duration: 30,
          pacePercent: canovaPhase === 'GENERAL' ? 80 : 90,
          description: `Fundamental run at ${canovaPhase === 'GENERAL' ? '80' : '90'}% MP`,
          marathonPace: marathonPaceKmh
        }
      })
    }

    // === THURSDAY: Quality session 2 ===
    const quality2Type = selectCanovaWorkout(canovaPhase, weekInPhase, 'QUALITY_2')

    if (quality2Type === 'SPECIFIC_INTENSIVE') {
      // Short intervals, higher pace
      const intervals = getCanovaIntervals('SPECIFIC_INTENSIVE', weekInPhase)
      workouts.push({
        dayNumber: 4,
        type: 'canovaIntervals',
        params: {
          reps: intervals.reps,
          workDistance: intervals.workDistance,
          pacePercent: intervals.workPacePercent,
          recoveryDistance: intervals.recoveryDistance,
          recoveryPacePercent: intervals.recoveryPacePercent,
          marathonPace: marathonPaceKmh
        }
      })
    } else if (quality2Type === 'HILL_SPRINTS') {
      // Alactic hill sprints for neuromuscular recruitment
      // For elite athletes: 8-10 reps × 30-40 seconds maximal uphill
      workouts.push({
        dayNumber: 4,
        type: 'hillSprints',
        params: {
          reps: 8,
          workSeconds: 35, // 35 seconds for elite athlete neuromuscular development
          rest: 3, // Full recovery (walk down)
          description: 'Backsprints: Maximal ansträngning uppför backe',
        }
      })
    } else {
      // Easy or uphill circuits
      workouts.push({
        dayNumber: 4,
        type: 'easy',
        params: {
          duration: 45,
          pacePercent: 80,
          description: 'General aerobic run',
          marathonPace: marathonPaceKmh
        }
      })
    }

    // === SUNDAY: Long Fast Run (Phase-specific) ===
    const longRunType = selectCanovaWorkout(canovaPhase, weekInPhase, 'LONG')
    const longRunStyle: 'CONTINUOUS' | 'PROGRESSIVE' | 'ALTERNATING' =
      longRunType === 'LONG_PROGRESSIVE' ? 'PROGRESSIVE' :
      longRunType === 'LONG_ALTERNATING' || longRunType === 'SPECIFIC_LONG_RUN' ? 'ALTERNATING' :
      'CONTINUOUS'

    const longRun = getCanovaLongFastRun(canovaPhase, longRunStyle)

    if (longRun.type === 'PROGRESSIVE') {
      // Progressive long run with multiple segments
      workouts.push({
        dayNumber: 7,
        type: 'long',
        params: {
          distance: longRun.totalDistance,
          progressive: true,
          segments: longRun.segments.map(seg => ({
            distance: seg.distance,
            pacePercent: seg.pacePercent
          })),
          description: longRun.description,
          marathonPace: marathonPaceKmh
        }
      })
    } else if (longRun.type === 'ALTERNATING') {
      // Alternating pace run (1km fast/1km moderate)
      workouts.push({
        dayNumber: 7,
        type: 'long',
        params: {
          distance: longRun.totalDistance,
          alternating: true,
          fastPacePercent: 103, // Fast km
          slowPacePercent: 90,  // Recovery km
          description: longRun.description + ' (no stopping!)',
          marathonPace: marathonPaceKmh
        }
      })
    } else {
      // Continuous long run
      workouts.push({
        dayNumber: 7,
        type: 'long',
        params: {
          distance: longRun.totalDistance,
          pacePercent: longRun.segments[0].pacePercent,
          description: longRun.description,
          marathonPace: marathonPaceKmh
        }
      })
    }

    // === EASY DAYS: Fill remaining days to reach runningSessionsPerWeek ===
    const runningSessionsNeeded = (params.runningSessionsPerWeek || trainingDays) - workouts.filter(w => w.type !== 'strength' && w.type !== 'core').length
    const availableDays = [1, 3, 5, 6] // Monday, Wednesday, Friday, Saturday

    let addedSessions = 0
    for (const dayNum of availableDays) {
      if (addedSessions >= runningSessionsNeeded) break
      if (!workouts.some(w => w.dayNumber === dayNum)) {
        workouts.push({
          dayNumber: dayNum,
          type: 'easy',
          params: {
            duration: 40,
            pacePercent: 75, // Fundamental base: 75-85% MP
            description: 'Easy aerobic run',
            marathonPace: marathonPaceKmh
          }
        })
        addedSessions++
      }
    }

    // === STRENGTH SESSIONS (Respects strengthSessionsPerWeek parameter) ===
    const strengthSessionsNeeded = params.strengthSessionsPerWeek || 0
    if (strengthSessionsNeeded > 0) {
      // If scheduleStrengthAfterRunning is true, schedule as PM session
      if (params.scheduleStrengthAfterRunning) {
        // Find first running day to add strength as PM session
        const runningDays = workouts.filter(w => w.type !== 'strength' && w.type !== 'core').map(w => w.dayNumber).sort()
        for (let i = 0; i < Math.min(strengthSessionsNeeded, runningDays.length); i++) {
          workouts.push({
            dayNumber: runningDays[i],
            type: 'strength',
            params: {
              focus: canovaPhase === 'GENERAL' || canovaPhase === 'FUNDAMENTAL' ? 'circuit' : 'maintenance',
              description: 'Strength training (PM session after running)',
              pmSession: true
            }
          })
        }
      } else {
        // Schedule on separate days (Saturday, Friday, etc.)
        const strengthDays = [6, 5]
        for (let i = 0; i < Math.min(strengthSessionsNeeded, strengthDays.length); i++) {
          if (!workouts.some(w => w.dayNumber === strengthDays[i] && w.type === 'strength')) {
            workouts.push({
              dayNumber: strengthDays[i],
              type: 'strength',
              params: {
                focus: canovaPhase === 'GENERAL' || canovaPhase === 'FUNDAMENTAL' ? 'circuit' : 'maintenance',
                description: 'Strength training (standalone session)'
              }
            })
          }
        }
      }
    }

    // === CORE SESSIONS (Respects coreSessionsPerWeek parameter) ===
    const coreSessionsNeeded = params.coreSessionsPerWeek || 0
    if (coreSessionsNeeded > 0) {
      if (params.scheduleCoreAfterRunning) {
        // Find running days to add core as PM session (avoid days with strength already)
        const runningDays = workouts
          .filter(w => w.type !== 'strength' && w.type !== 'core')
          .map(w => w.dayNumber)
          .sort()

        let addedCore = 0
        for (const dayNum of runningDays) {
          if (addedCore >= coreSessionsNeeded) break
          // Skip if this day already has a PM strength session
          if (!workouts.some(w => w.dayNumber === dayNum && w.type === 'strength' && w.params?.pmSession)) {
            workouts.push({
              dayNumber: dayNum,
              type: 'core',
              params: {
                duration: 20,
                description: 'Core training (PM session after running)',
                pmSession: true
              }
            })
            addedCore++
          }
        }
      } else {
        // Schedule on separate days
        const coreDays = [3, 5] // Wednesday, Friday
        for (let i = 0; i < Math.min(coreSessionsNeeded, coreDays.length); i++) {
          if (!workouts.some(w => w.dayNumber === coreDays[i] && w.type === 'core')) {
            workouts.push({
              dayNumber: coreDays[i],
              type: 'core',
              params: {
                duration: 20,
                description: 'Core training (standalone session)'
              }
            })
          }
        }
      }
    }

    console.log(`[Canova] Generated ${workouts.length} workouts for ${canovaPhase} phase`)
    return workouts
  }

  // === POLARIZED METHODOLOGY - Advanced Seiler protocols with 80/20 distribution ===
  if (methodologyConfig.type === 'POLARIZED') {
    console.log(`[Workout Distribution] Using POLARIZED methodology (Seiler) for ${phase} phase, week ${weekInPhase}`)

    // Map periodization phases to Polarized phases
    const polarizedPhase: PolarizedPhase =
      phase === 'BASE' || phase === 'BUILD' ? 'BASE' : // Strict 80/20 in base/build
      'SPECIFIC' // Race-specific with some Zone 2 in peak

    console.log(`[Polarized] Mapped to Polarized phase: ${polarizedPhase}`)

    // Calculate session distribution (80/20 by SESSION COUNT)
    const sessionDist = calculateSessionDistribution(trainingDays)
    console.log(`[Polarized] Session distribution: ${sessionDist.distribution}`)
    if (sessionDist.warning) {
      console.log(`[Polarized] ⚠️  ${sessionDist.warning}`)
    }

    // Generate advanced Polarized week structure
    const polarizedSchedule = generatePolarizedWeekAdvanced(
      trainingDays,
      polarizedPhase,
      weekInPhase
    )

    console.log(`[Polarized] Generated ${polarizedSchedule.length} sessions`)

    // Convert Polarized schedule to WorkoutSlot format
    for (const session of polarizedSchedule) {
      if (session.type === 'LSD') {
        // Long Slow Distance session
        const lsdSession = session.session as ReturnType<typeof getLSDSession>
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'long',
          params: {
            duration: lsdSession.duration,
            zone: 1, // Strict Zone 1
            description: lsdSession.description,
            hrDriftMonitoring: lsdSession.driftMonitoring,
            maxHRPercent: lsdSession.maxHeartRate
          }
        })
      } else if (session.type === 'SEILER_INTERVALS') {
        // Seiler research-proven interval protocols
        const intervalSession = session.session as ReturnType<typeof getSeilerInterval>

        // Check if this is micro-intervals (30/15) or hill repeats
        if (intervalSession.type === '30_15') {
          // Rønnestad micro-intervals: 3 sets of (13 × 30s/15s)
          workouts.push({
            dayNumber: session.dayNumber,
            type: 'intervals',
            params: {
              reps: 13, // Per set
              sets: 3,
              work: intervalSession.workDuration / 60, // Convert seconds to minutes
              rest: intervalSession.restDuration / 60,
              setRest: 3, // 3 min between sets
              zone: 5, // VO2max
              description: intervalSession.description,
              seilerProtocol: true
            }
          })
        } else if (intervalSession.type === 'HILL_REPEATS') {
          // Hill repeats with full recovery
          workouts.push({
            dayNumber: session.dayNumber,
            type: 'intervals',
            params: {
              reps: intervalSession.reps,
              work: intervalSession.workDuration, // Minutes (45 seconds = 0.75 min)
              rest: intervalSession.restDuration,
              zone: 5,
              description: intervalSession.description,
              hillRepeats: true,
              seilerProtocol: true
            }
          })
        } else {
          // Classic Seiler intervals (4×6, 4×7, 4×8, 5×8)
          workouts.push({
            dayNumber: session.dayNumber,
            type: 'intervals',
            params: {
              reps: intervalSession.reps,
              work: intervalSession.workDuration, // Already in minutes
              rest: intervalSession.restDuration,
              zone: 5, // VO2max intensity (90-92% HRmax)
              description: intervalSession.description,
              intensity: intervalSession.intensity,
              seilerProtocol: true
            }
          })
        }
      } else if (session.type === 'SPECIFIC_TEMPO') {
        // Race-specific Zone 2 tempo (SPECIFIC phase only)
        const tempoSession = session.session
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'tempo',
          params: {
            duration: tempoSession.duration,
            zone: 4, // Threshold zone
            description: tempoSession.description + ' (Canova integration in SPECIFIC phase)'
          }
        })
      } else if (session.type === 'EASY') {
        // Easy recovery run (Zone 1)
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'easy',
          params: {
            duration: session.session.duration,
            zone: 1,
            description: session.session.description,
            maxHRPercent: 75 // Below LT1
          }
        })
      } else if (session.type === 'RECOVERY') {
        // Regeneration run after quality
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'recovery',
          params: {
            duration: session.session.duration,
            description: session.session.description,
            maxHRPercent: 70 // Very slow
          }
        })
      }
    }

    // Add strength work for Polarized (not part of 80/20 calculation)
    if (trainingDays >= 5 && phase !== 'TAPER') {
      workouts.push({
        dayNumber: 3, // Wednesday - recovery day
        type: 'strength',
        params: {
          focus: phase === 'BASE' ? 'full' : 'lower',
          description: 'Strength training (not counted in 80/20 distribution)'
        }
      })
    }

    console.log(`[Polarized] Generated ${workouts.length} workouts for ${polarizedPhase} phase`)
    return workouts
  }

  // === NORWEGIAN DOUBLES METHODOLOGY - Double threshold with AM/PM clustering ===
  if (methodologyConfig.type === 'NORWEGIAN') {
    console.log(`[Workout Distribution] Using NORWEGIAN DOUBLES methodology for ${phase} phase, week ${weekInPhase}`)
    console.log(`[Norwegian Doubles] Elite training: AM (2.0-3.0 mmol/L) + PM (3.0-4.0 mmol/L) sessions`)

    // Calculate individualized Norwegian Doubles intensity from lactate test
    let doublesIntensity: ReturnType<typeof calculateNorwegianDoublesIntensity> | null = null

    if (test.anaerobicThreshold && test.testStages && test.testStages.length > 0) {
      try {
        doublesIntensity = calculateNorwegianDoublesIntensity(
          test.testStages,
          test.anaerobicThreshold
        )
        console.log(`[Norwegian Doubles] Calculated individualized intensity:`)
        console.log(`  AM (Low Zone 2): ${doublesIntensity.am.targetLactateLow.toFixed(1)}-${doublesIntensity.am.targetLactateHigh.toFixed(1)} mmol/L`)
        console.log(`  AM Pace: ${doublesIntensity.am.paceLow.toFixed(1)}-${doublesIntensity.am.paceHigh.toFixed(1)} ${doublesIntensity.unit}`)
        console.log(`  PM (High Zone 2): ${doublesIntensity.pm.targetLactateLow.toFixed(1)}-${doublesIntensity.pm.targetLactateHigh.toFixed(1)} mmol/L`)
        console.log(`  PM Pace: ${doublesIntensity.pm.paceLow.toFixed(1)}-${doublesIntensity.pm.paceHigh.toFixed(1)} ${doublesIntensity.unit}`)
      } catch (error) {
        console.warn('[Norwegian Doubles] Could not calculate individualized intensity, using zone-based approach:', error)
      }
    } else {
      console.warn('[Norwegian Doubles] No lactate test data available, using zone-based approach')
    }

    // Norwegian Doubles: Tuesday and Thursday are double-threshold days
    // Each day has AM + PM sessions
    const doubleThresholdDays = [2, 4] // Tuesday, Thursday

    for (const dayNum of doubleThresholdDays) {
      // === AM SESSION (Low Zone 2: 2.0-3.0 mmol/L) ===
      const amSessionType = selectNorwegianDoublesSession(
        phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
        weekInPhase,
        'AM'
      )
      const amDetails = getNorwegianDoublesSession(amSessionType)

      console.log(`[Norwegian Doubles] ${dayNum === 2 ? 'Tuesday' : 'Thursday'} AM: ${amDetails.description}`)

      const amParams: any = {
        reps: amDetails.reps,
        work: amDetails.workType === 'distance'
          ? amDetails.work * 1000 / 200 // Convert km to laps
          : amDetails.work, // Keep minutes for time-based
        rest: amDetails.rest / 60, // Convert seconds to minutes
        zone: 3, // Use Zone 3 for now (will use individualized pace if available)
        description: amDetails.description,
        workType: amDetails.workType,
        sessionTime: 'AM'
      }

      // Add individualized AM pace/HR if calculated
      if (doublesIntensity) {
        amParams.targetPace = doublesIntensity.am.paceHigh
        amParams.targetHR = doublesIntensity.am.hrHigh
        amParams.targetLactate = amDetails.targetLactate
      }

      workouts.push({
        dayNumber: dayNum,
        type: 'intervals',
        params: amParams
      })

      // === PM SESSION (High Zone 2: 3.0-4.0 mmol/L) ===
      const pmSessionType = selectNorwegianDoublesSession(
        phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
        weekInPhase,
        'PM'
      )
      const pmDetails = getNorwegianDoublesSession(pmSessionType)

      console.log(`[Norwegian Doubles] ${dayNum === 2 ? 'Tuesday' : 'Thursday'} PM: ${pmDetails.description}`)

      const pmParams: any = {
        reps: pmDetails.reps,
        work: pmDetails.workType === 'distance'
          ? pmDetails.work * 1000 / 200 // Convert km to laps
          : pmDetails.work, // Keep minutes for time-based
        rest: pmDetails.rest / 60, // Convert seconds to minutes
        zone: 4, // Use Zone 4 for now (will use individualized pace if available)
        description: pmDetails.description,
        workType: pmDetails.workType,
        sessionTime: 'PM'
      }

      // Add individualized PM pace/HR if calculated
      if (doublesIntensity) {
        pmParams.targetPace = doublesIntensity.pm.paceHigh
        pmParams.targetHR = doublesIntensity.pm.hrHigh
        pmParams.targetLactate = pmDetails.targetLactate
      }

      workouts.push({
        dayNumber: dayNum,
        type: 'intervals',
        params: pmParams
      })
    }

    // Easy days: Monday, Wednesday, Friday (often double easy runs)
    const easyDays = [1, 3, 5]
    for (const dayNum of easyDays) {
      // AM easy run
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: { duration: 40, sessionTime: 'AM' }
      })
      // PM easy run (if high volume athlete)
      if (trainingDays >= 10) {
        workouts.push({
          dayNumber: dayNum,
          type: 'easy',
          params: { duration: 40, sessionTime: 'PM' }
        })
      }
    }

    // Saturday: Zone 4 HIT session (hills, sprints)
    workouts.push({
      dayNumber: 6,
      type: 'intervals',
      params: {
        reps: 20,
        work: 0.2, // 200m
        rest: 2, // 2 minutes (recovery jog back)
        zone: 5,
        description: 'Zone 4 HIT: 20 × 200m hills (>6.0 mmol/L)'
      }
    })

    // Sunday: Long easy run
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: { distance: 18 }
    })

    return workouts
  }

  // === NORWEGIAN SINGLE METHODOLOGY - Sub-threshold intervals for recreational runners ===
  if (methodologyConfig.type === 'NORWEGIAN_SINGLE') {
    console.log(`[Workout Distribution] Using NORWEGIAN_SINGLE methodology for ${phase} phase, week ${weekInPhase}`)
    console.log(`[Norwegian Singles] SUB-threshold training at LT2 - 0.7 to 1.7 mmol/L`)

    // Calculate individualized Norwegian Singles intensity from lactate test
    let singlesIntensity: ReturnType<typeof calculateNorwegianSinglesIntensity> | null = null

    if (test.anaerobicThreshold && test.testStages && test.testStages.length > 0) {
      try {
        singlesIntensity = calculateNorwegianSinglesIntensity(
          test.testStages,
          test.anaerobicThreshold
        )
        console.log(`[Norwegian Singles] Calculated individualized intensity:`)
        console.log(`  Target lactate: ${singlesIntensity.targetLactateLow.toFixed(1)}-${singlesIntensity.targetLactateHigh.toFixed(1)} mmol/L`)
        console.log(`  Training pace: ${singlesIntensity.paceLow.toFixed(1)}-${singlesIntensity.paceHigh.toFixed(1)} ${singlesIntensity.unit}`)
        console.log(`  Training HR: ${singlesIntensity.hrLow}-${singlesIntensity.hrHigh} bpm`)
      } catch (error) {
        console.warn('[Norwegian Singles] Could not calculate individualized intensity, using zone-based approach:', error)
      }
    } else {
      console.warn('[Norwegian Singles] No lactate test data available, using zone-based approach')
    }

    // Norwegian Singles uses 2-3 quality sessions per week
    // Sessions: Tuesday (1k intervals), Thursday (2k intervals), Saturday (3k or time-based)
    const qualitySessions = trainingDays >= 6 ? 3 : 2

    // Track session number (1st, 2nd, or 3rd)
    let sessionNumber: 1 | 2 | 3 = 1

    // Quality days: Tuesday, Thursday, Saturday
    const qualityDays = [2, 4, 6]

    for (let i = 0; i < qualitySessions; i++) {
      const dayNum = qualityDays[i]

      // Select Norwegian Singles session type (distance-based intervals)
      const sessionType = selectNorwegianSinglesSessionType(
        phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
        weekInPhase,
        sessionNumber as 1 | 2 | 3
      )
      const sessionDetails = getNorwegianSinglesSession(sessionType)

      console.log(`[Norwegian Singles] Session ${sessionNumber} (${['Tue', 'Thu', 'Sat'][i]}): ${sessionDetails.description}`)

      // Build params with individualized intensity if available
      const workoutParams: any = {
        reps: sessionDetails.reps,
        work: sessionDetails.workType === 'distance'
          ? sessionDetails.work * 1000 / 200 // Convert km to laps/units for builder
          : sessionDetails.work, // Keep minutes for time-based
        rest: sessionDetails.rest / 60, // Convert seconds to minutes
        zone: 3, // Zone 3 for sub-threshold (82-87% HR, 2.3-3.0 mmol/L)
        description: sessionDetails.description,
        workType: sessionDetails.workType
      }

      // Add individualized pace/HR targets if calculated
      if (singlesIntensity) {
        workoutParams.targetPace = singlesIntensity.paceHigh // Use upper bound for quality work
        workoutParams.targetHR = singlesIntensity.hrHigh
        workoutParams.targetLactate = `${singlesIntensity.targetLactateLow.toFixed(1)}-${singlesIntensity.targetLactateHigh.toFixed(1)} mmol/L`
      }

      // Convert to intervals
      workouts.push({
        dayNumber: dayNum,
        type: 'intervals',
        params: workoutParams
      })

      sessionNumber++
    }

    // Easy runs on remaining days
    const easyDays = [1, 3, 5] // Monday, Wednesday, Friday
    for (const dayNum of easyDays) {
      if (trainingDays >= dayNum) {
        workouts.push({
          dayNumber: dayNum,
          type: 'easy',
          params: { duration: 45 } // 45-60 min easy at <70% HR
        })
      }
    }

    // Long run on Sunday
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: { distance: 16 } // 16-18km easy long run
    })

    // Add minimal strength for Norwegian Single (focus on running)
    if (trainingDays >= 6 && phase === 'BASE') {
      workouts.push({ dayNumber: 6, type: 'core', params: {} })
    }

    return workouts
  }

  // === PYRAMIDAL METHODOLOGY - Daniels/Pfitzinger/Lydiard integration ===
  if (methodologyConfig.type === 'PYRAMIDAL') {
    console.log(`[Workout Distribution] Using PYRAMIDAL methodology (Daniels/Pfitzinger/Lydiard) for ${phase} phase, week ${weekInPhase}`)

    // Map periodization phases to Pyramidal (Lydiard) phases
    const pyramidalPhase: PyramidalPhase =
      phase === 'BASE' && weekInPhase <= 4 ? 'BASE' :      // Pure aerobic base
      phase === 'BASE' ? 'STRENGTH' :                       // Hills + threshold intro
      phase === 'BUILD' ? 'SHARPENING' :                    // VO2max intervals
      phase === 'PEAK' ? 'COORDINATION' :                   // Race-specific
      'COORDINATION'                                         // Taper = coordination

    // Map goal type to event type for Pyramidal logic
    const pyramidalEvent: PyramidalEventType =
      params.goalType === 'marathon' ? 'MARATHON' :
      params.goalType === '5k' ? '5K' :
      params.goalType === '10k' ? '10K' :
      'HALF_MARATHON'

    console.log(`[Pyramidal] Mapped to Pyramidal phase: ${pyramidalPhase}`)
    console.log(`[Pyramidal] Event type: ${pyramidalEvent}`)

    // Calculate volume (estimate from trainingDays)
    const weeklyMileage = trainingDays * 7 // Rough estimate: ~7 km per session

    // Calculate weeks to race (if applicable)
    const totalWeeks = params.durationWeeks
    const weekNumber = weekInPhase
    const weeksToRace = Math.max(0, totalWeeks - weekNumber)

    // Apply event-specific distribution adjustments
    const eventDistribution = calculateEventSpecificPyramid(
      pyramidalEvent,
      pyramidalPhase,
      weeksToRace
    )

    console.log(`[Pyramidal] Zone distribution: Z1=${eventDistribution.zone1Percent}%, Z2=${eventDistribution.zone2Percent}%, Z3=${eventDistribution.zone3Percent}%`)

    // Check for special cases: 5K Polarized Switch or Marathon Z3 Lock
    if (pyramidalEvent === '5K' && weeksToRace <= 4) {
      console.log(`[Pyramidal] ⚡ 5K POLARIZED SWITCH activated (${weeksToRace} weeks to race)`)
      console.log(`[Pyramidal] Dropping Zone 2 work, maximizing VO2max sharpening`)
    } else if (pyramidalEvent === 'MARATHON' && weeksToRace <= 8) {
      console.log(`[Pyramidal] 🔒 MARATHON Z3 LOCK activated (${weeksToRace} weeks to race)`)
      console.log(`[Pyramidal] Removing all VO2max work to prevent glycogen wastage`)
    }

    // === TUESDAY: THRESHOLD WORK (Key session) ===
    if (pyramidalPhase === 'STRENGTH' || pyramidalPhase === 'SHARPENING' || pyramidalPhase === 'MARATHON_SPECIFIC') {
      // Daniels Cruise Intervals OR Pfitzinger Continuous Tempo
      const useCruiseIntervals = weekInPhase % 2 === 0 // Alternate between cruise and continuous

      if (useCruiseIntervals) {
        // Jack Daniels Cruise Intervals
        const cruiseType = selectCruiseInterval(pyramidalPhase, weeklyMileage, weekInPhase)
        const cruiseSession = getCruiseIntervalSession(cruiseType, weeklyMileage)

        console.log(`[Pyramidal] Tuesday: ${cruiseSession.description}`)
        console.log(`[Pyramidal] ${cruiseSession.danielsRule}`)

        workouts.push({
          dayNumber: 2,
          type: 'intervals',
          params: {
            reps: cruiseSession.reps,
            work: cruiseSession.workDistance,
            rest: cruiseSession.restDuration / 60, // Convert to minutes
            zone: 4, // Threshold zone
            description: cruiseSession.description,
            danielsProtocol: true,
            targetPace: 'T_PACE'
          }
        })
      } else {
        // Pfitzinger Continuous Tempo
        const tempoType = selectContinuousTempo(pyramidalPhase, pyramidalEvent, weekInPhase)
        const tempoSession = getContinuousTempoSession(tempoType)

        console.log(`[Pyramidal] Tuesday: ${tempoSession.description}`)
        console.log(`[Pyramidal] ${tempoSession.pfitzingerNote}`)

        workouts.push({
          dayNumber: 2,
          type: 'tempo',
          params: {
            duration: tempoSession.duration,
            zone: 4,
            description: tempoSession.description,
            pfitzingerProtocol: true,
            targetPace: tempoSession.targetPace
          }
        })
      }
    } else {
      // BASE phase: Easy run
      workouts.push({
        dayNumber: 2,
        type: 'easy',
        params: { duration: 45 }
      })
    }

    // === THURSDAY: INTERVALS OR SECOND QUALITY ===
    if (eventDistribution.zone3Percent > 0) {
      // VO2max intervals (if not in Marathon Z3 Lock)
      if (pyramidalPhase === 'SHARPENING' || (pyramidalEvent === '5K' && weeksToRace <= 4)) {
        workouts.push({
          dayNumber: 4,
          type: 'intervals',
          params: {
            reps: 5,
            work: 3,
            rest: 2,
            zone: 5, // VO2max
            description: 'Classic VO2max: 5 × 3 min @ 5K pace'
          }
        })
      } else {
        // Threshold intervals
        workouts.push({
          dayNumber: 4,
          type: 'intervals',
          params: {
            reps: 4,
            work: 5,
            rest: 2,
            zone: 4,
            description: 'Threshold intervals'
          }
        })
      }
    } else if (eventDistribution.zone2Percent > 0) {
      // Marathon: Second threshold session (if Z3 locked)
      const tempoSession = getContinuousTempoSession('CT_20MIN')
      workouts.push({
        dayNumber: 4,
        type: 'tempo',
        params: {
          duration: tempoSession.duration,
          zone: 4,
          description: 'Second threshold session (marathon-specific)'
        }
      })
    } else {
      // Easy run
      workouts.push({
        dayNumber: 4,
        type: 'easy',
        params: { duration: 40 }
      })
    }

    // === SATURDAY: ADVANCED THRESHOLD WORK (Optional) ===
    if (pyramidalEvent === 'MARATHON' && pyramidalPhase === 'MARATHON_SPECIFIC') {
      // Fatigued Threshold: Easy miles + tempo
      const advancedSession = getAdvancedThresholdSession('FATIGUED_THRESHOLD')
      console.log(`[Pyramidal] Saturday: ${advancedSession.description}`)
      console.log(`[Pyramidal] Mechanism: ${advancedSession.mechanism}`)

      workouts.push({
        dayNumber: 6,
        type: 'tempo',
        params: {
          description: advancedSession.description,
          structure: advancedSession.structure,
          fatigued: true, // Signal that this is a fatigued threshold run
          zone: 4
        }
      })
    } else if (trainingDays >= 6 && pyramidalPhase === 'STRENGTH') {
      // Hilly work (Lydiard strength phase)
      workouts.push({
        dayNumber: 6,
        type: 'intervals',
        params: {
          reps: 8,
          work: 0.5, // 30 seconds
          rest: 3, // Full recovery (jog down)
          zone: 5,
          description: 'Hill repeats: 8 × 30s max effort uphill'
        }
      })
    }

    // === SUNDAY: LONG RUN ===
    const longRunDistance = phase === 'TAPER' ? 12 :
                           phase === 'PEAK' && pyramidalEvent === 'MARATHON' ? 20 :
                           phase === 'PEAK' ? 16 :
                           15

    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRunDistance,
        description: 'Long Slow Distance - strict Zone 1'
      }
    })

    // === EASY DAYS: Monday, Wednesday, Friday ===
    const easyDays = [1, 3, 5]
    for (const dayNum of easyDays) {
      if (trainingDays >= dayNum && !workouts.some(w => w.dayNumber === dayNum)) {
        workouts.push({
          dayNumber: dayNum,
          type: 'easy',
          params: {
            duration: 40,
            description: 'General Aerobic - conversational pace'
          }
        })
      }
    }

    // === STRENGTH WORK (Optional, BASE/STRENGTH phases) ===
    if (trainingDays >= 6 && (pyramidalPhase === 'BASE' || pyramidalPhase === 'STRENGTH')) {
      workouts.push({
        dayNumber: 3, // Wednesday
        type: 'strength',
        params: {
          focus: pyramidalPhase === 'BASE' ? 'full' : 'lower',
          description: 'Strength training (Lydiard general strength)'
        }
      })
    }

    console.log(`[Pyramidal] Generated ${workouts.length} workouts for ${pyramidalPhase} phase`)
    return workouts
  }

  // === DEFAULT METHODOLOGY - Original logic (fallback) ===
  console.log(`[Workout Distribution] Using DEFAULT logic for ${methodologyConfig.type} methodology`)
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
            biomechanicalPillar: pillar,
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
          biomechanicalPillar: 'CORE',
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
