// lib/program-generator/sport-router.ts
// Sport router - routes program generation to sport-specific generators

import { SportType } from '@prisma/client'
import { Client, Test, CreateTrainingProgramDTO } from '@/types'
import { generateBaseProgram, ProgramGenerationParams } from './index'
import { generateCyclingProgram, CyclingProgramParams } from './generators/cycling-generator'
import { generateSkiingProgram, SkiingProgramParams } from './generators/skiing-generator'
import { generateSwimmingProgram, SwimmingProgramParams } from './generators/swimming-generator'
import { generateTriathlonProgram, TriathlonProgramParams } from './generators/triathlon-generator'
import { generateHyroxProgram, HyroxProgramParams } from './generators/hyrox-generator'
import { generateStrengthProgram, StrengthProgramParams } from './generators/strength-generator'
import {
  getGeneralFitnessProgram,
  getProgramDescription,
  type FitnessGoal,
  type FitnessLevel,
} from './templates/general-fitness'
import { calculatePhases } from './periodization'
import {
  calculateVDOT as calculateVDOTDaniels,
  getTrainingPaces as getTrainingPacesDaniels,
  type DanielsTrainingPaces,
} from '@/lib/training-engine/calculations/vdot'

// ============================================================================
// METHODOLOGY-SPECIFIC PACING SYSTEM
// ============================================================================
// Different methodologies use fundamentally different pace calculation systems:
// - Daniels: VDOT-based (% of VO2max velocity) - used for Polarized/Pyramidal
// - Norwegian: LT2-based sub-threshold (train 0.3-0.5 mmol/L BELOW threshold)
// - Canova: Marathon Pace-based (% of goal MP)
// ============================================================================

/**
 * Methodology-specific training paces
 * Each methodology calculates paces from different reference points
 */
export interface MethodologyPaces {
  methodology: 'DANIELS' | 'NORWEGIAN' | 'CANOVA'

  // Common reference paces (km/h)
  marathonPaceKmh: number
  easyPaceKmh: number
  thresholdPaceKmh: number  // LT2 pace (4.0 mmol/L)

  // Norwegian-specific (sub-threshold)
  subThresholdPaceKmh?: number      // 2.3-3.0 mmol/L (just below LT2)
  norwegianAmPaceKmh?: number       // AM session: 2.0-3.0 mmol/L (LT2 + 20s/km)
  norwegianPmPaceKmh?: number       // PM session: 3.0-4.0 mmol/L (LT2 + 10s/km)

  // Canova-specific (MP-based zones)
  canovaRegenerationKmh?: number    // 60-70% MP (very slow recovery)
  canovaFundamentalKmh?: number     // 80% MP
  canovaGeneralEnduranceKmh?: number // 85-90% MP (active recovery in intervals!)
  canovaSpecialEnduranceKmh?: number // 90-95% MP
  canovaSpecificKmh?: number         // 95-105% MP (race zone)
  canovaSpecialSpeedKmh?: number     // 105-110% MP

  // Daniels-specific (VDOT-based)
  intervalPaceKmh?: number     // 100% VDOT velocity
  repetitionPaceKmh?: number   // 110% VDOT velocity

  // Source data and priority flags
  vdot?: number | null
  vo2max?: number | null        // Actual VO2max from lab test (highest priority)
  lt2SpeedKmh?: number | null   // From lactate test (for Norwegian)
  hasLabTestData: boolean       // True if using actual VO2max from lab
  hasLactateTestData: boolean   // True if using LT2 from lactate test
  dataSource: 'LAB_VO2MAX' | 'LACTATE_TEST' | 'RACE_TIME' | 'ESTIMATION'
}

/**
 * Extract actual VO2max from lab test data
 * This is the most accurate source - direct measurement, not estimation
 *
 * Priority hierarchy for pace calculation:
 * 1. Actual VO2max from lab test (this function)
 * 2. LT2 from lactate test (extractLT2FromTest)
 * 3. Race time VDOT estimation
 * 4. Experience-based estimation
 */
function extractVO2maxFromTest(test?: Test): { vo2max: number | null; hasLabTest: boolean } {
  if (!test) {
    return { vo2max: null, hasLabTest: false }
  }

  // Check for actual VO2max from lab test
  const vo2max = (test as any).vo2max as number | null | undefined

  if (vo2max && vo2max > 0) {
    console.log(`[extractVO2maxFromTest] Found actual VO2max from lab test: ${vo2max} ml/kg/min`)
    return { vo2max, hasLabTest: true }
  }

  return { vo2max: null, hasLabTest: false }
}

/**
 * Convert actual VO2max to VDOT equivalent
 * VDOT ≈ VO2max for well-trained runners (Daniels uses them interchangeably)
 * For less trained runners, VDOT may be slightly lower than VO2max
 */
function vo2maxToVdot(vo2max: number, experienceLevel?: string): number {
  // VDOT represents "effective" VO2max (running economy adjusted)
  // Elite runners: VDOT ≈ VO2max (good economy)
  // Recreational: VDOT ≈ 95-98% of VO2max (less efficient)
  const efficiencyFactor = experienceLevel === 'advanced' ? 1.0 :
                            experienceLevel === 'intermediate' ? 0.97 : 0.95

  const vdot = vo2max * efficiencyFactor
  console.log(`[vo2maxToVdot] VO2max ${vo2max} → VDOT ${vdot.toFixed(1)} (efficiency ${(efficiencyFactor * 100).toFixed(0)}%)`)
  return vdot
}

/**
 * Extract LT2 (anaerobic threshold) pace from test data
 * This is the gold standard for Norwegian training - actual lactate test results
 */
function extractLT2FromTest(test?: Test): { lt2SpeedKmh: number | null; lt2PaceMinKm: string | null } {
  if (!test?.anaerobicThreshold) {
    return { lt2SpeedKmh: null, lt2PaceMinKm: null }
  }

  try {
    const threshold = test.anaerobicThreshold as { hr?: number; value?: number; unit?: string }

    if (!threshold.value) {
      return { lt2SpeedKmh: null, lt2PaceMinKm: null }
    }

    // The 'value' is typically speed in km/h for running tests
    const lt2SpeedKmh = threshold.value
    const lt2PaceMinKm = formatPaceMinKm(lt2SpeedKmh)

    console.log(`[extractLT2FromTest] Found LT2 from test: ${lt2SpeedKmh} km/h (${lt2PaceMinKm}/km)`)
    console.log(`[extractLT2FromTest] LT2 HR: ${threshold.hr || 'N/A'} bpm`)

    return { lt2SpeedKmh, lt2PaceMinKm }
  } catch (error) {
    console.warn('[extractLT2FromTest] Failed to parse test data:', error)
    return { lt2SpeedKmh: null, lt2PaceMinKm: null }
  }
}

/**
 * Calculate methodology-specific training paces
 *
 * @param methodology - Training methodology (affects how paces are calculated)
 * @param test - Optional lactate test with LT2 data
 * @param experienceLevel - Athlete experience (for fallback estimation)
 * @param recentRaceDistance - Recent race distance (for VDOT calculation)
 * @param recentRaceTime - Recent race time (for VDOT calculation)
 * @param goalMarathonPaceKmh - Optional goal marathon pace (for Canova)
 */
function calculateMethodologyPaces(
  methodology: string,
  test?: Test,
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string,
  goalMarathonPaceKmh?: number
): MethodologyPaces {
  // =========================================================================
  // PRIORITY HIERARCHY FOR PACE DATA:
  // 1. Actual VO2max from lab test (most accurate)
  // 2. LT2 from lactate test (for threshold-based calculations)
  // 3. Race time VDOT (if no lab test data)
  // 4. Experience-based estimation (fallback)
  // =========================================================================

  // Extract actual VO2max from lab test (Priority 1)
  const { vo2max, hasLabTest } = extractVO2maxFromTest(test)

  // Extract LT2 from lactate test (Priority 2 - gold standard for Norwegian)
  const { lt2SpeedKmh } = extractLT2FromTest(test)
  const hasLactateTestData = lt2SpeedKmh !== null

  // Determine data source and calculate VDOT
  let vdot: number | null = null
  let dataSource: 'LAB_VO2MAX' | 'LACTATE_TEST' | 'RACE_TIME' | 'ESTIMATION'

  if (hasLabTest && vo2max) {
    // Priority 1: Use actual VO2max from lab test
    vdot = vo2maxToVdot(vo2max, experienceLevel)
    dataSource = 'LAB_VO2MAX'
    console.log(`[calculateMethodologyPaces] Using ACTUAL VO2max from lab: ${vo2max} ml/kg/min → VDOT ${vdot.toFixed(1)}`)
  } else if (recentRaceDistance && recentRaceTime && recentRaceDistance !== 'NONE') {
    // Priority 3: Calculate from race time
    vdot = calculateVdotFromRace(recentRaceDistance, recentRaceTime)
    dataSource = vdot ? 'RACE_TIME' : 'ESTIMATION'
    if (vdot) {
      console.log(`[calculateMethodologyPaces] Using race time VDOT: ${vdot.toFixed(1)}`)
    }
  } else {
    dataSource = 'ESTIMATION'
  }

  // Get Daniels paces - use actual VDOT if we have it, otherwise estimate
  let danielsPaces: TrainingPacesResult

  if (vdot) {
    // We have a real VDOT (from lab or race) - use proper Daniels formulas
    const paces = getTrainingPacesDaniels(vdot)
    danielsPaces = {
      marathonPaceKmh: paces.marathon.kmh,
      easyPaceKmh: { min: paces.easy.minKmh, max: paces.easy.maxKmh },
      thresholdPaceKmh: paces.threshold.kmh,
      intervalPaceKmh: paces.interval.kmh,
      repetitionPaceKmh: paces.repetition.kmh,
      vdot,
    }
    console.log(`[calculateMethodologyPaces] Daniels paces from VDOT ${vdot.toFixed(1)}:`)
    console.log(`  Marathon: ${paces.marathon.pace}, Threshold: ${paces.threshold.pace}`)
  } else {
    // Fallback: estimate from experience level
    danielsPaces = estimateTrainingPaces(
      experienceLevel || 'intermediate',
      currentWeeklyVolume,
      recentRaceDistance,
      recentRaceTime
    )
    console.log(`[calculateMethodologyPaces] Using experience-based estimation (no test/race data)`)
  }

  const normalizedMethodology = methodology?.toUpperCase() || 'POLARIZED'

  // =========================================================================
  // NORWEGIAN METHODOLOGY - Sub-threshold pacing from LT2
  // =========================================================================
  if (normalizedMethodology === 'NORWEGIAN_SINGLE' || normalizedMethodology === 'NORWEGIAN_DOUBLES') {
    // Use actual LT2 from test if available, otherwise estimate from Daniels threshold
    const lt2Kmh = lt2SpeedKmh || danielsPaces.thresholdPaceKmh

    // Norwegian sub-threshold: Train 0.3-0.5 mmol/L BELOW LT2 (not AT it)
    // This typically translates to 3-5% slower than LT2 pace
    // Reference: Marius Bakken - train at 97% of LT2 pace for sub-threshold
    const subThresholdPaceKmh = lt2Kmh * 0.97

    // Norwegian Doubles AM/PM differentiation:
    // AM session (Low Zone 2): 2.0-3.0 mmol/L → LT2 pace + ~20 sec/km
    // PM session (High Zone 2): 3.0-4.0 mmol/L → LT2 pace + ~10 sec/km
    // Converting time offset to speed: slower pace = lower km/h
    const amPaceOffset = 20 / 3600 * lt2Kmh  // 20 sec/km slower in km/h terms
    const pmPaceOffset = 10 / 3600 * lt2Kmh  // 10 sec/km slower in km/h terms
    const norwegianAmPaceKmh = lt2Kmh * 0.94  // ~6% slower (low Zone 2)
    const norwegianPmPaceKmh = lt2Kmh * 0.97  // ~3% slower (high Zone 2)

    // Easy pace for Norwegian: very easy, ~75 sec/km slower than LT2
    const easyPaceKmh = lt2Kmh * 0.78  // Much slower for true recovery

    console.log(`[calculateMethodologyPaces] ${normalizedMethodology}:`)
    console.log(`  LT2 (reference): ${formatPaceMinKm(lt2Kmh)}/km ${hasLactateTestData ? '(from test)' : '(estimated)'}`)
    console.log(`  Sub-threshold:   ${formatPaceMinKm(subThresholdPaceKmh)}/km (97% of LT2)`)
    if (normalizedMethodology === 'NORWEGIAN_DOUBLES') {
      console.log(`  AM session:      ${formatPaceMinKm(norwegianAmPaceKmh)}/km (94% LT2, 2-3 mmol/L)`)
      console.log(`  PM session:      ${formatPaceMinKm(norwegianPmPaceKmh)}/km (97% LT2, 3-4 mmol/L)`)
    }
    console.log(`  Easy:            ${formatPaceMinKm(easyPaceKmh)}/km`)

    return {
      methodology: 'NORWEGIAN',
      marathonPaceKmh: danielsPaces.marathonPaceKmh,
      easyPaceKmh,
      thresholdPaceKmh: lt2Kmh,
      subThresholdPaceKmh,
      norwegianAmPaceKmh,
      norwegianPmPaceKmh,
      vdot,
      vo2max,
      lt2SpeedKmh,
      hasLabTestData: hasLabTest,
      hasLactateTestData,
      dataSource: hasLactateTestData ? 'LACTATE_TEST' : dataSource,
    }
  }

  // =========================================================================
  // CANOVA METHODOLOGY - Marathon Pace-based zones
  // =========================================================================
  if (normalizedMethodology === 'CANOVA') {
    // Canova uses Goal Marathon Pace as the reference, NOT threshold/VDOT
    const mpKmh = goalMarathonPaceKmh || danielsPaces.marathonPaceKmh

    // Canova zones as % of Marathon Pace
    const canovaRegenerationKmh = mpKmh * 0.65     // 60-70% MP (very slow!)
    const canovaFundamentalKmh = mpKmh * 0.80      // 80% MP
    const canovaGeneralEnduranceKmh = mpKmh * 0.875 // 85-90% MP (ACTIVE RECOVERY!)
    const canovaSpecialEnduranceKmh = mpKmh * 0.925 // 90-95% MP
    const canovaSpecificKmh = mpKmh                 // 95-105% MP (the race zone)
    const canovaSpecialSpeedKmh = mpKmh * 1.075     // 105-110% MP

    // Canova threshold is derived from MP with metabolic compression factor
    // Elite: MP = 96-98% of threshold
    // Recreational: MP = 82% of threshold
    // For intermediate athletes, use ~90%
    const compressionFactor = experienceLevel === 'advanced' ? 0.95 :
                              experienceLevel === 'intermediate' ? 0.90 : 0.85
    const thresholdFromMp = mpKmh / compressionFactor

    console.log(`[calculateMethodologyPaces] CANOVA:`)
    console.log(`  Marathon Pace (ref): ${formatPaceMinKm(mpKmh)}/km`)
    console.log(`  Regeneration:        ${formatPaceMinKm(canovaRegenerationKmh)}/km (65% MP)`)
    console.log(`  Fundamental:         ${formatPaceMinKm(canovaFundamentalKmh)}/km (80% MP)`)
    console.log(`  General Endurance:   ${formatPaceMinKm(canovaGeneralEnduranceKmh)}/km (87.5% MP - active recovery!)`)
    console.log(`  Special Endurance:   ${formatPaceMinKm(canovaSpecialEnduranceKmh)}/km (92.5% MP)`)
    console.log(`  Specific:            ${formatPaceMinKm(canovaSpecificKmh)}/km (100% MP - race zone)`)
    console.log(`  Special Speed:       ${formatPaceMinKm(canovaSpecialSpeedKmh)}/km (107.5% MP)`)

    return {
      methodology: 'CANOVA',
      marathonPaceKmh: mpKmh,
      easyPaceKmh: canovaRegenerationKmh,  // Canova "easy" = regeneration
      thresholdPaceKmh: thresholdFromMp,
      canovaRegenerationKmh,
      canovaFundamentalKmh,
      canovaGeneralEnduranceKmh,
      canovaSpecialEnduranceKmh,
      canovaSpecificKmh,
      canovaSpecialSpeedKmh,
      vdot,
      vo2max,
      lt2SpeedKmh,
      hasLabTestData: hasLabTest,
      hasLactateTestData,
      dataSource,
    }
  }

  // =========================================================================
  // DANIELS/POLARIZED/PYRAMIDAL - VDOT-based pacing (default)
  // =========================================================================
  console.log(`[calculateMethodologyPaces] DANIELS (${normalizedMethodology}):`)
  console.log(`  VDOT:       ${danielsPaces.vdot || 'estimated'}`)
  console.log(`  Marathon:   ${formatPaceMinKm(danielsPaces.marathonPaceKmh)}/km`)
  console.log(`  Threshold:  ${formatPaceMinKm(danielsPaces.thresholdPaceKmh)}/km`)
  console.log(`  Interval:   ${formatPaceMinKm(danielsPaces.intervalPaceKmh)}/km`)
  console.log(`  Repetition: ${formatPaceMinKm(danielsPaces.repetitionPaceKmh)}/km`)
  console.log(`  Easy:       ${formatPaceMinKm(danielsPaces.easyPaceKmh.min)}-${formatPaceMinKm(danielsPaces.easyPaceKmh.max)}/km`)

  return {
    methodology: 'DANIELS',
    marathonPaceKmh: danielsPaces.marathonPaceKmh,
    easyPaceKmh: (danielsPaces.easyPaceKmh.min + danielsPaces.easyPaceKmh.max) / 2,
    thresholdPaceKmh: danielsPaces.thresholdPaceKmh,
    intervalPaceKmh: danielsPaces.intervalPaceKmh,
    repetitionPaceKmh: danielsPaces.repetitionPaceKmh,
    vdot,
    vo2max,
    lt2SpeedKmh,
    hasLabTestData: hasLabTest,
    hasLactateTestData,
    dataSource,
  }
}

export type DataSourceType = 'TEST' | 'PROFILE' | 'MANUAL'

export interface SportProgramParams {
  // Common fields
  clientId: string
  coachId: string
  sport: SportType
  goal: string
  dataSource: DataSourceType
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date

  // Test-based
  testId?: string

  // Manual values
  manualFtp?: number
  manualCss?: string
  manualVdot?: number

  // Sport-specific
  methodology?: string
  weeklyHours?: number
  bikeType?: string
  technique?: string
  poolLength?: string

  // Strength integration
  includeStrength?: boolean
  strengthSessionsPerWeek?: number

  // ===== NEW FIELDS FROM WIZARD =====

  // Athlete Profile (Running/HYROX/Triathlon)
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  yearsRunning?: number
  currentWeeklyVolume?: number
  longestLongRun?: number

  // Race Results for VDOT (pure running races only)
  recentRaceDistance?: 'NONE' | '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string // HH:MM:SS or MM:SS format

  // Target Race Goal Time (for progressive pace calculation)
  targetTime?: string // HH:MM:SS format - the goal time for the target race

  // Core & Alternative Training
  coreSessionsPerWeek?: number
  alternativeTrainingSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean

  // Equipment & Monitoring
  hasLactateMeter?: boolean
  hasHRVMonitor?: boolean
  hasPowerMeter?: boolean // Cycling/Triathlon only

  // ===== HYROX Station Times (seconds) =====
  hyroxStationTimes?: {
    skierg?: number | null
    sledPush?: number | null
    sledPull?: number | null
    burpeeBroadJump?: number | null
    rowing?: number | null
    farmersCarry?: number | null
    sandbagLunge?: number | null
    wallBalls?: number | null
    averageRunPace?: number | null
  }

  // HYROX Division
  hyroxDivision?: 'open' | 'pro' | 'doubles'
  hyroxGender?: 'male' | 'female'
  hyroxBodyweight?: number

  // ===== Strength PRs (kg) =====
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number // max reps
  }

  // General Fitness specific
  fitnessGoal?: FitnessGoal
  fitnessLevel?: FitnessLevel
  hasGymAccess?: boolean
  preferredActivities?: string[]

  // Calendar constraints - blocked dates won't have workouts scheduled
  calendarConstraints?: {
    blockedDates: string[] // ISO date strings (YYYY-MM-DD)
    reducedDates: string[] // dates with reduced training capacity
    altitudePeriods: { start: string; end: string; altitude: number }[]
  }
}

/**
 * Format date to YYYY-MM-DD string in local timezone
 * (avoids UTC conversion issues with toISOString)
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Helper to check if a date is blocked by calendar constraints
 */
function isDateBlocked(date: Date, blockedDates: string[]): boolean {
  const dateStr = formatLocalDate(date)
  return blockedDates.includes(dateStr)
}

/**
 * Helper to check if a date has reduced capacity
 */
function isDateReduced(date: Date, reducedDates: string[]): boolean {
  const dateStr = formatLocalDate(date)
  return reducedDates.includes(dateStr)
}

/**
 * Apply calendar constraints to a generated program
 * - Remove workouts from blocked dates
 * - Add notes for reduced capacity dates
 */
function applyCalendarConstraints(
  program: CreateTrainingProgramDTO,
  constraints: SportProgramParams['calendarConstraints']
): CreateTrainingProgramDTO {
  if (!constraints) return program

  const { blockedDates = [], reducedDates = [] } = constraints

  // Process each week and day
  const updatedWeeks = program.weeks?.map(week => {
    const updatedDays = week.days.map(day => {
      // Calculate the actual date for this day
      const weekStartMs = program.startDate.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000
      const dayDate = new Date(weekStartMs + (day.dayNumber - 1) * 24 * 60 * 60 * 1000)

      // Check if this date is blocked
      if (isDateBlocked(dayDate, blockedDates)) {
        // Remove all workouts and add a note
        return {
          ...day,
          workouts: [],
          notes: day.notes
            ? `${day.notes}\n⚠️ Vilodag (kalenderblockering)`
            : '⚠️ Vilodag (kalenderblockering)',
        }
      }

      // Check if this date has reduced capacity
      if (isDateReduced(dayDate, reducedDates)) {
        // Keep workouts but add a note about reduced capacity
        return {
          ...day,
          notes: day.notes
            ? `${day.notes}\n⚡ Reducerad träningskapacitet`
            : '⚡ Reducerad träningskapacitet',
        }
      }

      return day
    })

    return {
      ...week,
      days: updatedDays,
    }
  })

  return {
    ...program,
    weeks: updatedWeeks,
  }
}

/**
 * Main sport router - routes to appropriate generator based on sport type
 */
export async function generateSportProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  console.log('=====================================')
  console.log(`SPORT ROUTER: Generating ${params.sport} program`)
  console.log(`Goal: ${params.goal}`)
  console.log(`Data Source: ${params.dataSource}`)
  if (params.calendarConstraints) {
    console.log(`Calendar: ${params.calendarConstraints.blockedDates.length} blocked, ${params.calendarConstraints.reducedDates.length} reduced`)
  }
  console.log('=====================================\n')

  let program: CreateTrainingProgramDTO

  switch (params.sport) {
    case 'RUNNING':
      program = await generateRunningProgram(params, client, test)
      break

    case 'CYCLING':
      program = await generateCyclingProgram({
        ...params,
        ftp: params.manualFtp,
        weeklyHours: params.weeklyHours || 8,
        bikeType: params.bikeType as any,
      } as CyclingProgramParams, client)
      break

    case 'SKIING':
      program = await generateSkiingProgram({
        ...params,
        technique: params.technique as any,
      } as SkiingProgramParams, client, test)
      break

    case 'SWIMMING':
      program = await generateSwimmingProgram({
        ...params,
        css: params.manualCss,
        poolLength: params.poolLength as any,
      } as SwimmingProgramParams, client)
      break

    case 'TRIATHLON':
      program = await generateTriathlonProgram({
        ...params,
        ftp: params.manualFtp,
        css: params.manualCss,
        vdot: params.manualVdot,
      } as TriathlonProgramParams, client, test)
      break

    case 'HYROX':
      program = await generateHyroxProgram({
        ...params,
        experienceLevel: params.experienceLevel,
        // Pass race result data for VDOT calculation (pure running races only)
        recentRaceDistance: params.recentRaceDistance,
        recentRaceTime: params.recentRaceTime,
        // Pass HYROX-specific data
        hyroxStationTimes: params.hyroxStationTimes,
        hyroxDivision: params.hyroxDivision,
        hyroxGender: params.hyroxGender,
        hyroxBodyweight: params.hyroxBodyweight,
        strengthPRs: params.strengthPRs,
      } as HyroxProgramParams, client)
      break

    case 'STRENGTH':
      program = await generateStrengthProgram({
        ...params,
      } as StrengthProgramParams, client)
      break

    case 'GENERAL_FITNESS':
      program = await generateGeneralFitnessProgram(params, client)
      break

    default:
      throw new Error(`Unsupported sport type: ${params.sport}`)
  }

  // Apply calendar constraints - remove workouts from blocked dates
  if (params.calendarConstraints) {
    console.log('Applying calendar constraints to program...')
    program = applyCalendarConstraints(program, params.calendarConstraints)
  }

  return program
}

/**
 * Generate running program using existing generator
 */
async function generateRunningProgram(
  params: SportProgramParams,
  client: Client,
  test?: Test
): Promise<CreateTrainingProgramDTO> {
  // Map goal to legacy goalType
  const goalTypeMap: Record<string, ProgramGenerationParams['goalType']> = {
    'marathon': 'marathon',
    'half-marathon': 'half-marathon',
    '10k': '10k',
    '5k': '5k',
    'custom': 'custom',
  }

  const runningParams: ProgramGenerationParams = {
    testId: params.testId || '',
    clientId: params.clientId,
    coachId: params.coachId,
    goalType: goalTypeMap[params.goal] || 'fitness',
    durationWeeks: params.durationWeeks,
    trainingDaysPerWeek: params.sessionsPerWeek,
    experienceLevel: params.experienceLevel || 'intermediate',
    targetRaceDate: params.targetRaceDate,
    targetTime: params.targetTime, // Goal time for progressive pace calculation
    notes: params.notes,
    methodology: params.methodology as any,
    strengthSessionsPerWeek: params.includeStrength ? (params.strengthSessionsPerWeek || 2) : 0,
    // New fields from wizard
    currentWeeklyVolume: params.currentWeeklyVolume,
    longestLongRun: params.longestLongRun,
    yearsRunning: params.yearsRunning,
    recentRaceDistance: params.recentRaceDistance,
    recentRaceTime: params.recentRaceTime,
    coreSessionsPerWeek: params.coreSessionsPerWeek,
    alternativeTrainingSessionsPerWeek: params.alternativeTrainingSessionsPerWeek,
    scheduleStrengthAfterRunning: params.scheduleStrengthAfterRunning,
    scheduleCoreAfterRunning: params.scheduleCoreAfterRunning,
    hasLactateMeter: params.hasLactateMeter,
    hasHRVMonitor: params.hasHRVMonitor,
  }

  if (!test && params.dataSource === 'TEST') {
    throw new Error('Test required for test-based running program')
  }

  // For MANUAL or PROFILE data source without test, create custom program
  if (!test) {
    return createCustomRunningProgram(params, client)
  }

  return generateBaseProgram(test, client, runningParams)
}

/**
 * Generate custom running program without test data
 * Creates actual workouts based on methodology and athlete profile
 */
function createCustomRunningProgram(
  params: SportProgramParams,
  client: Client
): CreateTrainingProgramDTO {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + params.durationWeeks * 7)

  const goalLabels: Record<string, string> = {
    'marathon': 'Marathon',
    'half-marathon': 'Halvmaraton',
    '10k': '10K',
    '5k': '5K',
    'custom': 'Anpassad',
  }

  const goalLabel = goalLabels[params.goal] || params.goal

  // Calculate current fitness pace from PB/recent race
  const currentFitnessPaceKmh = estimateMarathonPace(
    params.experienceLevel || 'intermediate',
    params.currentWeeklyVolume,
    params.recentRaceDistance,
    params.recentRaceTime
  )

  // Calculate target pace from goal time if provided
  let targetPaceKmh: number | null = null
  if (params.targetTime && params.goal) {
    targetPaceKmh = calculateTargetPace(params.goal, params.targetTime)
  }

  // Create progressive pace configuration
  const paceProgression: PaceProgression = {
    currentPaceKmh: currentFitnessPaceKmh,
    targetPaceKmh: targetPaceKmh || currentFitnessPaceKmh,
    totalWeeks: params.durationWeeks,
  }

  // Get methodology-specific phase distribution for logging
  const methodology = params.methodology?.toUpperCase() || 'POLARIZED'
  const previewPhases = calculatePhases(params.durationWeeks, methodology)

  console.log(`[Custom Running] Methodology: ${methodology}`)
  console.log(`[Custom Running] Sessions per week: ${params.sessionsPerWeek}`)
  console.log(`[Custom Running] ═══════════════════════════════════════════`)
  console.log(`[Custom Running] PHASE DISTRIBUTION (${methodology}):`)
  console.log(`[Custom Running]   BASE:  ${previewPhases.base} weeks`)
  console.log(`[Custom Running]   BUILD: ${previewPhases.build} weeks`)
  console.log(`[Custom Running]   PEAK:  ${previewPhases.peak} weeks`)
  console.log(`[Custom Running]   TAPER: ${previewPhases.taper} weeks`)
  console.log(`[Custom Running] ═══════════════════════════════════════════`)
  console.log(`[Custom Running] PROGRESSIVE PACE PLAN:`)
  console.log(`[Custom Running]   Current fitness: ${formatPaceMinKm(currentFitnessPaceKmh)}/km`)
  if (targetPaceKmh && targetPaceKmh !== currentFitnessPaceKmh) {
    console.log(`[Custom Running]   Target goal:     ${formatPaceMinKm(targetPaceKmh)}/km`)
    const gapSeconds = (60 / currentFitnessPaceKmh - 60 / targetPaceKmh) * 60
    console.log(`[Custom Running]   Gap to close:    ${gapSeconds.toFixed(0)} sec/km over ${params.durationWeeks} weeks`)
    console.log(`[Custom Running]   Week 1 (BASE):   ${formatPaceMinKm(currentFitnessPaceKmh)}/km`)
    // Calculate mid-point of BUILD phase for preview
    const buildMidWeek = Math.floor(previewPhases.build / 2)
    const midPace = calculateProgressivePace(paceProgression, buildMidWeek, previewPhases.build, 'BUILD')
    const midWeekOverall = previewPhases.base + buildMidWeek
    console.log(`[Custom Running]   Week ${midWeekOverall} (BUILD mid): ${formatPaceMinKm(midPace)}/km`)
    console.log(`[Custom Running]   Week ${params.durationWeeks - previewPhases.taper} (PEAK):  ${formatPaceMinKm(targetPaceKmh)}/km`)
  }
  console.log(`[Custom Running] ═══════════════════════════════════════════`)

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${goalLabel} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || `Löpprogram för ${goalLabel.toLowerCase()}`,
    weeks: createProgressiveWeeks(
      params.durationWeeks,
      startDate,
      params.sessionsPerWeek,
      paceProgression,
      params.goal,
      methodology,
      params.targetRaceDate,
      {
        strengthSessionsPerWeek: params.strengthSessionsPerWeek,
        coreSessionsPerWeek: params.coreSessionsPerWeek,
        scheduleStrengthAfterRunning: params.scheduleStrengthAfterRunning,
        scheduleCoreAfterRunning: params.scheduleCoreAfterRunning,
      },
      // Methodology context for LT2-based and MP-based pacing
      {
        test: undefined,  // No test in custom program - will use race result estimates
        experienceLevel: params.experienceLevel,
        currentWeeklyVolume: params.currentWeeklyVolume,
        recentRaceDistance: params.recentRaceDistance,
        recentRaceTime: params.recentRaceTime,
      }
    ),
  }
}

/**
 * Pace progression configuration for progressive training
 */
interface PaceProgression {
  currentPaceKmh: number  // Starting pace (from current fitness/PB)
  targetPaceKmh: number   // Goal pace (from target time)
  totalWeeks: number      // Total program duration
}

/**
 * Calculate progressive pace for a given week within a phase
 *
 * Progression strategy (phase-aware):
 * - BASE phase: Stay at current fitness + small progression (0-20% of gap)
 * - BUILD phase: Progressive pace improvement (20-90% of gap)
 * - PEAK phase: Train at goal pace (100% of target)
 * - TAPER phase: Maintain goal pace, reduce volume
 *
 * @param progression - Pace progression configuration
 * @param weekInPhase - Which week within the current phase (1-indexed)
 * @param phaseLength - Total weeks in this phase
 * @param phase - Current training phase
 */
function calculateProgressivePace(
  progression: PaceProgression,
  weekInPhase: number,
  phaseLength: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): number {
  const { currentPaceKmh, targetPaceKmh } = progression

  // If no improvement needed, return current
  if (currentPaceKmh >= targetPaceKmh) {
    return currentPaceKmh
  }

  const paceGap = targetPaceKmh - currentPaceKmh // Positive = need to get faster

  // Calculate progress within the phase (0.0 to 1.0)
  const progressInPhase = Math.min((weekInPhase - 1) / Math.max(phaseLength - 1, 1), 1)

  switch (phase) {
    case 'BASE':
      // BASE: Train at current fitness + small progression (0-20% of gap)
      // Linear progression through 0-20% of pace gap
      const baseProgress = progressInPhase * 0.2
      return currentPaceKmh + (paceGap * baseProgress)

    case 'BUILD':
      // BUILD: Progressive improvement (20-90% of gap)
      // Linear progression from 20% to 90% of pace gap
      const buildProgress = 0.2 + (progressInPhase * 0.7)
      return currentPaceKmh + (paceGap * buildProgress)

    case 'PEAK':
      // PEAK: Train at goal pace (100% of target)
      return targetPaceKmh

    case 'TAPER':
      // TAPER: Maintain goal pace
      return targetPaceKmh

    default:
      return currentPaceKmh
  }
}

/**
 * Create weeks with progressive pacing - routes to methodology-specific generators
 *
 * Uses methodology-specific phase distributions:
 * - POLARIZED: 40% BASE, 35% BUILD, 15% PEAK, 10% TAPER (traditional)
 * - NORWEGIAN_SINGLE: 30% BASE, 45% BUILD, 15% PEAK, 10% TAPER (more threshold)
 * - NORWEGIAN_DOUBLES: 35% BASE, 40% BUILD, 15% PEAK, 10% TAPER (elite)
 * - CANOVA: 25% BASE, 27% BUILD, 40% PEAK, 8% TAPER (inverted - long peak!)
 * - PYRAMIDAL: 45% BASE, 30% BUILD, 15% PEAK, 10% TAPER (longer aerobic base)
 */
interface SupplementaryTraining {
  strengthSessionsPerWeek?: number
  coreSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean
}

interface MethodologyContext {
  test?: Test
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyVolume?: number
  recentRaceDistance?: string
  recentRaceTime?: string
}

function createProgressiveWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  paceProgression: PaceProgression,
  goal: string,
  methodology: string,
  targetRaceDate?: Date,
  supplementaryTraining?: SupplementaryTraining,
  methodologyContext?: MethodologyContext
) {
  const weeks = []

  // Calculate methodology-specific paces (Norwegian uses LT2 from test, Canova uses MP-based)
  const methodologyPaces = calculateMethodologyPaces(
    methodology,
    methodologyContext?.test,
    methodologyContext?.experienceLevel,
    methodologyContext?.currentWeeklyVolume,
    methodologyContext?.recentRaceDistance,
    methodologyContext?.recentRaceTime,
    paceProgression.targetPaceKmh  // Goal marathon pace for Canova
  )

  console.log(`[Progressive Weeks] Methodology: ${methodologyPaces.methodology}`)
  console.log(`[Progressive Weeks] LT2 test data: ${methodologyPaces.hasLactateTestData ? 'YES ✓' : 'NO (using estimates)'}`)

  // Use methodology-specific phase distribution from periodization.ts
  const phaseDistribution = calculatePhases(durationWeeks, methodology)
  const baseWeeks = phaseDistribution.base
  const buildWeeks = phaseDistribution.build
  const peakWeeks = phaseDistribution.peak
  // taperWeeks is calculated as remainder

  console.log(`[Progressive Weeks] ${methodology}: BASE ${baseWeeks}w, BUILD ${buildWeeks}w, PEAK ${peakWeeks}w, TAPER ${phaseDistribution.taper}w`)
  if (targetRaceDate) {
    console.log(`[Progressive Weeks] Target race date: ${targetRaceDate.toISOString().split('T')[0]}`)
  }

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    let phaseLength: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
      phaseLength = baseWeeks
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
      phaseLength = buildWeeks
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
      phaseLength = peakWeeks
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
      phaseLength = phaseDistribution.taper
    }

    // Calculate progressive pace for this week (using phase-aware progression)
    const weekPaceKmh = calculateProgressivePace(paceProgression, weekInPhase, phaseLength, phase)

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    // Get focus description based on methodology
    const focus = getProgressiveFocus(phase, methodology, weekPaceKmh)

    // Generate days based on methodology (passing methodology-specific paces)
    let days
    switch (methodology) {
      case 'NORWEGIAN_SINGLE':
      case 'NORWEGIAN_SINGLES':
        days = createNorwegianSinglesDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal, methodologyPaces)
        break
      case 'NORWEGIAN':
      case 'NORWEGIAN_DOUBLES':
        days = createNorwegianDoublesDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, methodologyPaces)
        break
      case 'CANOVA':
        days = createCanovaDays(sessionsPerWeek, phase, phase === 'BASE' ? 'FUNDAMENTAL' : phase === 'BUILD' ? 'SPECIAL' : 'COMPETITION', weekInPhase, weekPaceKmh, goal, methodologyPaces)
        break
      case 'PYRAMIDAL':
        days = createPyramidalDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal)
        break
      default:
        days = createPolarizedDays(sessionsPerWeek, phase, weekInPhase, weekPaceKmh, goal)
    }

    // Check if race day falls in this week and mark it appropriately
    const weekStartDate = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000)
    if (targetRaceDate) {
      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const dayDate = new Date(weekStartDate.getTime() + (days[dayIdx].dayNumber - 1) * 24 * 60 * 60 * 1000)
        // Compare dates (ignoring time)
        if (dayDate.toDateString() === targetRaceDate.toDateString()) {
          console.log(`[Progressive Weeks] Found race day in week ${i + 1}, day ${days[dayIdx].dayNumber}`)
          // Replace this day with race day marker
          days[dayIdx] = {
            dayNumber: days[dayIdx].dayNumber,
            notes: `🏁 TÄVLINGSDAG - ${goal.toUpperCase()}`,
            workouts: [], // No workouts on race day - it's race day!
          }
        }
      }
    }

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      phase,
      volume: volumePercent,
      focus,
      days,
    })
  }

  // Add strength and core sessions if requested
  if (supplementaryTraining) {
    addSupplementaryTraining(weeks, supplementaryTraining)
  }

  return weeks
}

/**
 * Add strength and core sessions to existing weeks
 */
function addSupplementaryTraining(
  weeks: any[],
  training: SupplementaryTraining
) {
  const { strengthSessionsPerWeek = 0, coreSessionsPerWeek = 0, scheduleStrengthAfterRunning = false, scheduleCoreAfterRunning = false } = training

  if (strengthSessionsPerWeek <= 0 && coreSessionsPerWeek <= 0) return

  for (const week of weeks) {
    // Find days with running workouts (for after-running scheduling)
    const runningDays = week.days.filter((d: any) =>
      d.workouts?.some((w: any) => w.type === 'RUNNING')
    )

    // Find rest days or light days for standalone sessions
    const restDays = week.days.filter((d: any) =>
      !d.workouts || d.workouts.length === 0 || d.notes?.toLowerCase().includes('vila')
    )

    // Add strength sessions
    let strengthAdded = 0
    if (strengthSessionsPerWeek > 0) {
      if (scheduleStrengthAfterRunning && runningDays.length > 0) {
        // Add to running days (PM session)
        for (let i = 0; i < Math.min(strengthSessionsPerWeek, runningDays.length); i++) {
          const day = runningDays[i]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createStrengthWorkout(week.phase, i === 0 ? 'full' : 'maintenance'))
          strengthAdded++
        }
      } else {
        // Add to rest days or any available day
        const availableDays = restDays.length > 0 ? restDays : week.days
        for (let i = 0; i < Math.min(strengthSessionsPerWeek, availableDays.length); i++) {
          const day = availableDays[i % availableDays.length]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createStrengthWorkout(week.phase, i === 0 ? 'full' : 'maintenance'))
          strengthAdded++
        }
      }
    }

    // Add core sessions
    if (coreSessionsPerWeek > 0) {
      if (scheduleCoreAfterRunning && runningDays.length > 0) {
        // Add to running days (after running)
        for (let i = 0; i < Math.min(coreSessionsPerWeek, runningDays.length); i++) {
          const day = runningDays[i]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createCoreWorkout(week.phase))
        }
      } else {
        // Add to rest days or any available day
        const availableDays = restDays.length > 0 ? restDays : week.days
        for (let i = 0; i < Math.min(coreSessionsPerWeek, availableDays.length); i++) {
          const dayIndex = (i + strengthAdded) % availableDays.length
          const day = availableDays[dayIndex]
          if (!day.workouts) day.workouts = []
          day.workouts.push(createCoreWorkout(week.phase))
        }
      }
    }
  }
}

/**
 * Create a strength workout based on phase
 */
function createStrengthWorkout(phase: string, type: 'full' | 'maintenance'): any {
  const isFullSession = type === 'full'
  const duration = isFullSession ? 45 : 30

  // Periodize based on training phase
  let focus: string
  let exercises: string
  if (phase === 'BASE') {
    focus = 'Anatomisk anpassning'
    exercises = 'Fokus: stabilitet, teknik, lägre belastning'
  } else if (phase === 'BUILD') {
    focus = 'Maximal styrka'
    exercises = 'Fokus: tyngre belastning, färre repetitioner'
  } else if (phase === 'PEAK') {
    focus = 'Explosiv kraft'
    exercises = 'Fokus: snabbhet, plyometrics'
  } else {
    focus = 'Underhåll'
    exercises = 'Fokus: bibehåll styrka utan utmattning'
  }

  return {
    type: 'STRENGTH' as const,
    name: isFullSession ? 'Styrkepass' : 'Underhållsstyrka',
    intensity: phase === 'BUILD' ? 'THRESHOLD' as const : 'MODERATE' as const,
    duration,
    instructions: `${focus}. ${exercises}. ${isFullSession ? 'Fullständigt pass med uppvärmning.' : 'Kortare underhållspass.'}`,
    segments: [],
  }
}

/**
 * Create a core workout
 */
function createCoreWorkout(phase: string): any {
  return {
    type: 'CORE' as const,
    name: 'Core & stabilitet',
    intensity: 'MODERATE' as const,
    duration: 20,
    instructions: 'Bålstabilitet för löpare. Fokus: plankor, sidoplankor, dead bugs, fågelräkning.',
    segments: [],
  }
}

/**
 * Get focus description with pace info
 */
function getProgressiveFocus(phase: string, methodology: string, paceKmh: number): string {
  const paceStr = formatPaceMinKm(paceKmh)

  const baseFocus: Record<string, Record<string, string>> = {
    'NORWEGIAN_SINGLE': {
      'BASE': `Aerob bas - Sub-tröskel @ ~${paceStr}/km`,
      'BUILD': `Progressiva tröskelpass @ ~${paceStr}/km`,
      'PEAK': `Tävlingsspecifik @ ${paceStr}/km`,
      'TAPER': `Nedtrappning - bibehåll ${paceStr}/km`,
    },
    'NORWEGIAN': {
      'BASE': `Dubbla tröskelpass @ ~${paceStr}/km`,
      'BUILD': `Intensifierade dubbeldagar @ ~${paceStr}/km`,
      'PEAK': `Tävlingsförberedelse @ ${paceStr}/km`,
      'TAPER': `Nedtrappning`,
    },
    'CANOVA': {
      'BASE': `Grundläggande aerob @ ~${paceStr}/km`,
      'BUILD': `Maratonspecifik @ ~${paceStr}/km`,
      'PEAK': `Tävlingsförberedelse @ ${paceStr}/km`,
      'TAPER': `Nedtrappning`,
    },
    'PYRAMIDAL': {
      'BASE': `Aerob bas 70/20/10 @ ~${paceStr}/km`,
      'BUILD': `Progressiv intensitet @ ~${paceStr}/km`,
      'PEAK': `Tävlingsspecifik @ ${paceStr}/km`,
      'TAPER': `Nedtrappning`,
    },
    'POLARIZED': {
      'BASE': `Aerob bas 80/20 @ ~${paceStr}/km`,
      'BUILD': `Tempokörningar @ ~${paceStr}/km`,
      'PEAK': `Tävlingsspecifik @ ${paceStr}/km`,
      'TAPER': `Återhämtning`,
    },
  }

  const methodologyFocus = baseFocus[methodology] || baseFocus['POLARIZED']
  return methodologyFocus[phase] || `${phase} @ ${paceStr}/km`
}

/**
 * Training paces result with all Daniels zones
 */
interface TrainingPacesResult {
  marathonPaceKmh: number
  easyPaceKmh: { min: number; max: number }
  thresholdPaceKmh: number
  intervalPaceKmh: number
  repetitionPaceKmh: number
  vdot: number | null
}

/**
 * Estimate training paces from athlete profile using Jack Daniels' VDOT system
 * Returns all training paces calculated as proper percentages of VDOT velocity
 */
function estimateTrainingPaces(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string
): TrainingPacesResult {
  // If we have race results, calculate from VDOT using proper Daniels formulas
  if (recentRaceDistance && recentRaceTime && recentRaceDistance !== 'NONE') {
    const vdot = calculateVdotFromRace(recentRaceDistance, recentRaceTime)
    if (vdot) {
      // Get proper Daniels training paces (calculated as % of VDOT velocity)
      const danielsPaces = getTrainingPacesDaniels(vdot)

      console.log(`[estimateTrainingPaces] VDOT: ${vdot}`)
      console.log(`[estimateTrainingPaces] Marathon: ${danielsPaces.marathon.pace}`)
      console.log(`[estimateTrainingPaces] Threshold: ${danielsPaces.threshold.pace}`)
      console.log(`[estimateTrainingPaces] Interval: ${danielsPaces.interval.pace}`)
      console.log(`[estimateTrainingPaces] Easy: ${danielsPaces.easy.minPace} - ${danielsPaces.easy.maxPace}`)

      return {
        marathonPaceKmh: danielsPaces.marathon.kmh,
        easyPaceKmh: { min: danielsPaces.easy.minKmh, max: danielsPaces.easy.maxKmh },
        thresholdPaceKmh: danielsPaces.threshold.kmh,
        intervalPaceKmh: danielsPaces.interval.kmh,
        repetitionPaceKmh: danielsPaces.repetition.kmh,
        vdot,
      }
    }
  }

  // Otherwise estimate from experience level and volume (fallback)
  const basePaces: Record<string, number> = {
    'beginner': 9.0,      // ~6:40/km marathon pace
    'intermediate': 11.0, // ~5:27/km marathon pace
    'advanced': 13.0,     // ~4:37/km marathon pace
  }

  let marathonPace = basePaces[experienceLevel] || 10.0

  // Adjust for weekly volume (higher volume = typically faster)
  if (currentWeeklyVolume) {
    if (currentWeeklyVolume > 60) marathonPace += 1.0
    else if (currentWeeklyVolume > 40) marathonPace += 0.5
    else if (currentWeeklyVolume < 20) marathonPace -= 0.5
  }

  // For fallback, estimate other paces relative to marathon using Daniels ratios
  // These ratios assume: Easy 70%, Marathon 84%, Threshold 88%, Interval 100% of VDOT velocity
  // Marathon = 84% → Threshold = marathon * (88/84) = marathon * 1.048
  // Marathon = 84% → Interval = marathon * (100/84) = marathon * 1.190
  // Marathon = 84% → Easy = marathon * (59-74/84) = marathon * (0.70-0.88)
  return {
    marathonPaceKmh: marathonPace,
    easyPaceKmh: { min: marathonPace * 0.70, max: marathonPace * 0.88 },
    thresholdPaceKmh: marathonPace * 1.048,
    intervalPaceKmh: marathonPace * 1.19,
    repetitionPaceKmh: marathonPace * 1.31,
    vdot: null,
  }
}

/**
 * Estimate marathon pace from athlete profile (legacy wrapper)
 * @deprecated Use estimateTrainingPaces instead for proper Daniels paces
 */
function estimateMarathonPace(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  currentWeeklyVolume?: number,
  recentRaceDistance?: string,
  recentRaceTime?: string
): number {
  const paces = estimateTrainingPaces(experienceLevel, currentWeeklyVolume, recentRaceDistance, recentRaceTime)
  return paces.marathonPaceKmh
}

/**
 * Calculate VDOT from race result using Jack Daniels' oxygen cost formula
 * Reference: Daniels' Running Formula (3rd ed.)
 */
function calculateVdotFromRace(distance: string, timeStr: string): number | null {
  const distanceMeters: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
  }

  const meters = distanceMeters[distance]
  if (!meters) return null

  // Parse time (MM:SS or HH:MM:SS)
  const parts = timeStr.split(':').map(Number)
  let totalMinutes: number
  if (parts.length === 3) {
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    totalMinutes = parts[0] + parts[1] / 60
  } else {
    return null
  }

  // Use proper Daniels VDOT formula
  const vdot = calculateVDOTDaniels(meters, totalMinutes)

  console.log(`[calculateVdotFromRace] ${distance} in ${timeStr} → VDOT ${vdot}`)

  return vdot
}

/**
 * Format pace as MM:SS/km
 */
function formatPaceMinKm(kmh: number): string {
  const minPerKm = 60 / kmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Calculate target pace from goal time and distance
 * Returns equivalent marathon pace (km/h) for training zone calculations
 */
function calculateTargetPace(goal: string, targetTime: string): number | null {
  // Distance in km for each goal
  const distances: Record<string, number> = {
    '5k': 5,
    '10k': 10,
    'half-marathon': 21.0975,
    'marathon': 42.195,
  }

  const distanceKm = distances[goal.toLowerCase()]
  if (!distanceKm) return null

  // Parse target time (MM:SS or HH:MM:SS)
  const parts = targetTime.split(':').map(Number)
  let totalMinutes: number

  if (parts.length === 3) {
    // HH:MM:SS
    totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    // MM:SS
    totalMinutes = parts[0] + parts[1] / 60
  } else {
    return null
  }

  // Calculate target pace (km/h)
  const targetPaceKmh = (distanceKm / totalMinutes) * 60

  // Convert to equivalent marathon pace for zone calculations
  // 10K pace is roughly 108% of marathon pace
  // Half marathon pace is roughly 103% of marathon pace
  // 5K pace is roughly 112% of marathon pace
  const marathonEquivalentFactors: Record<string, number> = {
    '5k': 0.89,        // 5K pace / 1.12 = marathon pace
    '10k': 0.926,      // 10K pace / 1.08 = marathon pace
    'half-marathon': 0.97, // HM pace / 1.03 = marathon pace
    'marathon': 1.0,
  }

  const factor = marathonEquivalentFactors[goal.toLowerCase()] || 1.0
  const equivalentMarathonPaceKmh = targetPaceKmh * factor

  console.log(`[Target Pace] Goal: ${goal}, Target time: ${targetTime}`)
  console.log(`[Target Pace] Target race pace: ${formatPaceMinKm(targetPaceKmh)}/km`)
  console.log(`[Target Pace] Equivalent marathon pace: ${formatPaceMinKm(equivalentMarathonPaceKmh)}/km`)

  return equivalentMarathonPaceKmh
}

/**
 * Create weeks with actual polarized workouts
 */
function createPolarizedWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []

  // Calculate phase distribution
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)
  const taperWeeks = Math.max(durationWeeks - baseWeeks - buildWeeks - peakWeeks, 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: getWeekFocus(phase, goal),
      days: createPolarizedDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal),
    })
  }

  return weeks
}

/**
 * Calculate volume percentage for week
 */
function calculateVolumePercent(
  phase: string,
  weekInPhase: number,
  overallWeek: number,
  totalWeeks: number
): number {
  switch (phase) {
    case 'BASE':
      return 70 + weekInPhase * 3 // 70-85%
    case 'BUILD':
      return 85 + weekInPhase * 2 // 85-95%
    case 'PEAK':
      return 100 // Peak volume
    case 'TAPER':
      return 70 - weekInPhase * 10 // 70-50%
    default:
      return 80
  }
}

/**
 * Get week focus description
 */
function getWeekFocus(phase: string, goal: string): string {
  const focusMap: Record<string, string> = {
    'BASE': 'Aerob bas och grundläggande uthållighet',
    'BUILD': 'Progressiv volymökning och tempokörningar',
    'PEAK': 'Tävlingsspecifik träning',
    'TAPER': 'Återhämtning inför tävling',
  }
  return focusMap[phase] || 'General'
}

/**
 * Create 7 days with polarized workout distribution
 */
function createPolarizedDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string
) {
  const days = []

  // Polarized distribution: 80% easy, 20% hard
  const hardSessions = Math.max(1, Math.ceil(sessionsPerWeek * 0.20))
  const easySessions = sessionsPerWeek - hardSessions - 1 // -1 for long run

  // Assign days: Long run Sunday (7), Quality Tuesday (2) & Thursday (4), Easy other days
  const longRunDay = 7
  const qualityDays = [2, 4].slice(0, hardSessions)
  const easyDays = [1, 3, 5, 6].slice(0, Math.max(0, easySessions))

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === longRunDay && sessionsPerWeek >= 3) {
      // Long run
      const baseDuration = phase === 'TAPER' ? 60 : (phase === 'BASE' ? 75 : 90)
      const duration = baseDuration + weekInPhase * 5
      const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
      const distance = Math.round((Math.min(duration, 150) / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Långpass - Zon 1, konversationstempo',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Långpass',
          intensity: 'EASY' as const,
          duration: Math.min(duration, 150),
          distance,
          instructions: `Lugnt långpass i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). Ska kunna prata obehindrat.`,
          segments: [],
        }],
      })
    } else if (qualityDays.includes(dayNum)) {
      // Quality session (intervals)
      const workout = createQualityWorkout(phase, weekInPhase, marathonPaceKmh, goal)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass',
        workouts: [workout],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy run
      const duration = phase === 'TAPER' ? 30 : 40
      const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). Återhämtning.`,
          segments: [],
        }],
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Calculate interval pace based on work duration using Daniels' guidelines
 *
 * Pace varies by interval duration (from Daniels' Running Formula):
 * - 30-90s (Repetition): 110% VDOT = marathon × 1.31
 * - 2-3 min (Fast I): 100-105% VDOT = marathon × 1.19-1.25
 * - 3-5 min (Interval/VO2max): 98-100% VDOT = marathon × 1.17-1.19
 * - 5-8 min (Long Interval): 92-95% VDOT = marathon × 1.10-1.13
 * - 8+ min (Cruise/Threshold): 88% VDOT = marathon × 1.05
 *
 * @param marathonPaceKmh - Marathon pace in km/h
 * @param workDurationMin - Work interval duration in minutes
 * @returns Pace in km/h for the given interval duration
 */
function getIntervalPaceForDuration(marathonPaceKmh: number, workDurationMin: number): number {
  // Daniels multipliers relative to marathon pace (marathon = 84% VDOT)
  if (workDurationMin <= 1.5) {
    // Repetition pace (30-90s): 110% VDOT = 110/84 × marathon
    return marathonPaceKmh * 1.31
  } else if (workDurationMin <= 3) {
    // Fast Interval (2-3 min): ~103% VDOT
    return marathonPaceKmh * 1.23
  } else if (workDurationMin <= 5) {
    // VO2max Interval (3-5 min): 100% VDOT = 100/84 × marathon
    return marathonPaceKmh * 1.19
  } else if (workDurationMin <= 8) {
    // Long Interval (5-8 min): ~94% VDOT - slightly slower for sustainability
    return marathonPaceKmh * 1.12
  } else {
    // Cruise Interval (8+ min): 88% VDOT (threshold pace)
    return marathonPaceKmh * 1.05
  }
}

/**
 * Create quality (interval) workout based on phase
 */
function createQualityWorkout(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string
) {

  // Seiler-style intervals that progress through phases
  let reps: number, workMin: number, restMin: number, name: string, description: string

  if (phase === 'BASE') {
    // Start with shorter intervals, build up
    if (weekInPhase <= 2) {
      reps = 4; workMin = 4; restMin = 2
      name = '4x4 min intervaller'
    } else if (weekInPhase <= 4) {
      reps = 4; workMin = 5; restMin = 2
      name = '4x5 min intervaller'
    } else {
      reps = 4; workMin = 6; restMin = 2
      name = '4x6 min intervaller'
    }
  } else if (phase === 'BUILD') {
    // Classic 4x8 or 5x8
    if (weekInPhase <= 3) {
      reps = 4; workMin = 7; restMin = 2
      name = '4x7 min intervaller'
    } else {
      reps = 4; workMin = 8; restMin = 2
      name = '4x8 min intervaller'
    }
  } else if (phase === 'PEAK') {
    reps = 5; workMin = 5; restMin = 2
    name = 'Tävlingsspecifika intervaller'
  } else {
    // Taper - reduced volume, maintain intensity
    reps = 3; workMin = 4; restMin = 2
    name = 'Underhållsintervaller'
  }

  // Calculate duration-appropriate interval pace (Daniels-based)
  const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace

  // Determine the actual workout pace based on phase
  // PEAK phase uses race-specific pacing, other phases use duration-based pacing
  let workoutPaceKmh: number
  if (phase === 'PEAK') {
    // Race-specific: use faster pace for 5K/10K goals
    workoutPaceKmh = goal === '5k' || goal === '10k'
      ? marathonPaceKmh * 1.19  // Interval pace (100% VDOT)
      : marathonPaceKmh * 1.08  // Slightly faster than marathon for longer races
  } else {
    // BASE, BUILD, TAPER: use duration-appropriate pace
    workoutPaceKmh = getIntervalPaceForDuration(marathonPaceKmh, workMin)
  }

  // Generate description with the actual workout pace
  if (phase === 'BASE') {
    description = `Seiler-intervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. VO2max-träning - hög intensitet men hållbar.`
  } else if (phase === 'BUILD') {
    description = `Klassiska Seiler 4x${workMin} @ ${formatPaceMinKm(workoutPaceKmh)}/km. "Isoeffort" - håll samma känsla hela vägen.`
  } else if (phase === 'PEAK') {
    description = `Race-pace intervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. Förbered dig för tävling.`
  } else {
    description = `Underhållsintervaller @ ${formatPaceMinKm(workoutPaceKmh)}/km. Håll farten utan att trötta ut dig.`
  }

  // Calculate total distance for the workout using the actual workout pace
  const workDistanceKm = (reps * workMin / 60) * workoutPaceKmh
  const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh // Jogging during rest
  const warmupCooldownKm = (20 / 60) * easyPaceKmh // 20 min warmup+cooldown
  const totalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

  // Build segments array with warmup, work/rest intervals, and cooldown
  const segments = []

  // Warmup segment (10 min)
  segments.push({
    order: 1,
    type: 'warmup' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Uppvärmning - lätt jogg',
  })

  // Work/rest intervals
  for (let i = 0; i < reps * 2 - 1; i++) {
    segments.push({
      order: segments.length + 1,
      type: (i % 2 === 0 ? 'work' : 'rest') as 'work' | 'rest',
      duration: i % 2 === 0 ? workMin : restMin,
      distance: undefined,
      targetPace: i % 2 === 0 ? formatPaceMinKm(workoutPaceKmh) : undefined,
      targetHeartRateZone: i % 2 === 0 ? 4 : 1,
      notes: i % 2 === 0 ? 'Arbete' : 'Vila',
    })
  }

  // Cooldown segment (10 min)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Nedvarvning - lätt jogg',
  })

  return {
    type: 'RUNNING' as const,
    name,
    intensity: 'INTERVAL' as const,
    duration: (reps * workMin) + ((reps - 1) * restMin) + 20, // Add warmup/cooldown
    distance: totalDistanceKm,
    instructions: `${reps}x${workMin} min med ${restMin} min vila. ${description}`,
    segments,
  }
}

/**
 * Create weeks with Norwegian Singles workouts (sub-threshold training)
 * Norwegian Singles: 2-3 quality sessions at LT2 minus 0.7-1.7 mmol/L
 */
function createNorwegianSinglesWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []

  // Calculate phase distribution (same as Polarized)
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    // Volume progression
    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: getNorwegianWeekFocus(phase),
      days: createNorwegianSinglesDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal),
    })
  }

  return weeks
}

/**
 * Get Norwegian Singles week focus description
 */
function getNorwegianWeekFocus(phase: string): string {
  const focusMap: Record<string, string> = {
    'BASE': 'Aerob bas med sub-tröskelintervaller',
    'BUILD': 'Progressiva tröskelpass',
    'PEAK': 'Tävlingsspecifik intensitet',
    'TAPER': 'Återhämtning med fartbehållning',
  }
  return focusMap[phase] || 'Norwegian Singles'
}

/**
 * Create 7 days with Norwegian Singles workout distribution
 * Key principle: Sub-threshold intervals (LT2 - 0.7 to 1.7 mmol/L)
 */
function createNorwegianSinglesDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  methodologyPaces?: MethodologyPaces
) {
  const days = []

  // Norwegian Singles: 2-3 quality sessions per week
  const qualitySessions = sessionsPerWeek >= 6 ? 3 : 2
  const easySessions = Math.max(0, sessionsPerWeek - qualitySessions - 1) // -1 for long run

  // Quality days: Tuesday, Thursday, (Saturday if 3 sessions)
  const qualityDays = [2, 4, 6].slice(0, qualitySessions)
  // Easy days: Monday, Wednesday, Friday
  const easyDays = [1, 3, 5].slice(0, easySessions)
  // Long run: Sunday
  const longRunDay = 7

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === longRunDay && sessionsPerWeek >= 3) {
      // Long easy run - Daniels Easy pace is ~82-88% of marathon speed
      const baseDuration = phase === 'TAPER' ? 60 : (phase === 'BASE' ? 75 : 90)
      const duration = Math.min(baseDuration + weekInPhase * 5, 120)
      const easyPaceKmh = marathonPaceKmh * 0.85 // Long run at comfortable easy pace
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Långpass - Green zone',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Långpass',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Långpass i Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Strikt aerobt.`,
          segments: [],
        }],
      })
    } else if (qualityDays.includes(dayNum)) {
      // Norwegian Singles quality session (sub-threshold intervals)
      const workout = createNorwegianSinglesWorkout(phase, weekInPhase, marathonPaceKmh, goal, qualityDays.indexOf(dayNum) + 1, methodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: 'Sub-tröskelintervaller',
        workouts: [workout],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy recovery run - slower end of Daniels Easy zone
      const duration = phase === 'TAPER' ? 30 : 45
      const easyPaceKmh = marathonPaceKmh * 0.82 // Recovery runs slightly slower
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning - Green zone',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning i Green zone (${formatPaceMinKm(easyPaceKmh)}/km). Återhämtning.`,
          segments: [],
        }],
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Create Norwegian Singles quality workout
 * Key: Sub-threshold at LT2 minus 0.7-1.7 mmol/L (just below lactate threshold)
 *
 * Norwegian Singles pacing system (from documentation):
 * - Uses ACTUAL LT2 from lactate test when available (gold standard)
 * - Sub-threshold = 97% of LT2 pace (trains at 2.3-3.0 mmol/L, not 4.0)
 * - Allows 3-4 quality sessions per week (vs 1-2 in traditional threshold)
 *
 * Interval paces from 5K (when no lactate data):
 * - 1K intervals: 85-88% of 5K pace
 * - 2K intervals: 83-86% of 5K pace (~ half marathon pace)
 * - 3K intervals: 80-83% of 5K pace (~ 30K pace)
 */
function createNorwegianSinglesWorkout(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  sessionNumber: number,
  methodologyPaces?: MethodologyPaces  // Optional: use actual LT2 from test
) {
  // Use methodology-specific pacing if available (from lactate test)
  // Otherwise fall back to estimation from marathon pace
  let subThresholdPaceKmh: number
  let thresholdPaceKmh: number
  let easyPaceKmh: number

  if (methodologyPaces?.subThresholdPaceKmh) {
    // Using actual LT2 data from lactate test - Norwegian gold standard!
    subThresholdPaceKmh = methodologyPaces.subThresholdPaceKmh
    thresholdPaceKmh = methodologyPaces.thresholdPaceKmh
    easyPaceKmh = methodologyPaces.easyPaceKmh
    console.log(`[Norwegian Singles] Using LT2 from test: ${formatPaceMinKm(thresholdPaceKmh)}/km`)
    console.log(`[Norwegian Singles] Sub-threshold pace: ${formatPaceMinKm(subThresholdPaceKmh)}/km`)
  } else {
    // Fallback: estimate from marathon pace (less accurate)
    thresholdPaceKmh = marathonPaceKmh * 1.05  // Threshold ~105% marathon
    subThresholdPaceKmh = thresholdPaceKmh * 0.97  // Sub-threshold ~97% of LT2
    easyPaceKmh = marathonPaceKmh * 0.78  // Much slower for Norwegian easy
    console.log(`[Norwegian Singles] Estimated sub-threshold: ${formatPaceMinKm(subThresholdPaceKmh)}/km (no LT2 test data)`)
  }

  let reps: number, workMin: number, restMin: number, name: string, description: string

  if (phase === 'BASE') {
    // Build tolerance with shorter intervals
    if (weekInPhase <= 2) {
      reps = 5; workMin = 5; restMin = 1
      name = '5x5 min sub-tröskel'
    } else if (weekInPhase <= 4) {
      reps = 4; workMin = 6; restMin = 1
      name = '4x6 min sub-tröskel'
    } else {
      reps = 5; workMin = 6; restMin = 1
      name = '5x6 min sub-tröskel'
    }
    description = `Sub-tröskelintervaller (${formatPaceMinKm(subThresholdPaceKmh)}/km). Strax under LT2, bör kännas kontrollerat.`
  } else if (phase === 'BUILD') {
    // Classic Norwegian Singles progression
    if (sessionNumber === 1) {
      reps = 5; workMin = 6; restMin = 1
      name = '5x6 min threshold minus'
    } else if (sessionNumber === 2) {
      reps = 4; workMin = 8; restMin = 1
      name = '4x8 min threshold minus'
    } else {
      reps = 3; workMin = 10; restMin = 1.5
      name = '3x10 min threshold minus'
    }
    description = `Norwegian Singles (${formatPaceMinKm(subThresholdPaceKmh)}/km). Håll laktat strax under tröskel.`
  } else if (phase === 'PEAK') {
    // Race-specific with longer intervals
    const raceSpecificPace = goal === '5k' || goal === '10k'
      ? marathonPaceKmh * 1.12
      : marathonPaceKmh * 1.06
    reps = 4; workMin = 8; restMin = 1
    name = 'Tävlingsspecifika intervaller'
    description = `Tävlingsfart intervaller (${formatPaceMinKm(raceSpecificPace)}/km). Nära målrace-tempo.`
  } else {
    // Taper - maintain with reduced volume
    reps = 3; workMin = 5; restMin = 1
    name = 'Underhåll sub-tröskel'
    description = 'Bibehåll känslan för tröskel utan att trötta ut dig.'
  }

  // Calculate total distance for the workout
  // easyPaceKmh is already defined above from methodologyPaces or fallback
  const workDistanceKm = (reps * workMin / 60) * subThresholdPaceKmh
  const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh // Jogging during rest
  const warmupCooldownKm = (20 / 60) * easyPaceKmh // 20 min warmup+cooldown
  const totalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

  // Build segments array with warmup, work/rest intervals, and cooldown
  const segments = []

  // Warmup segment (10 min)
  segments.push({
    order: 1,
    type: 'warmup' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Uppvärmning - lätt jogg',
  })

  // Work/rest intervals
  for (let i = 0; i < reps * 2 - 1; i++) {
    segments.push({
      order: segments.length + 1,
      type: (i % 2 === 0 ? 'work' : 'rest') as 'work' | 'rest',
      duration: i % 2 === 0 ? workMin : restMin,
      distance: undefined,
      targetPace: i % 2 === 0 ? formatPaceMinKm(subThresholdPaceKmh) : undefined,
      targetHeartRateZone: i % 2 === 0 ? 3 : 1,
      notes: i % 2 === 0 ? 'Sub-tröskel' : 'Vila (jogg)',
    })
  }

  // Cooldown segment (10 min)
  segments.push({
    order: segments.length + 1,
    type: 'cooldown' as const,
    duration: 10,
    distance: undefined,
    targetPace: formatPaceMinKm(easyPaceKmh),
    targetHeartRateZone: 1,
    notes: 'Nedvarvning - lätt jogg',
  })

  return {
    type: 'RUNNING' as const,
    name,
    intensity: 'THRESHOLD' as const,
    duration: (reps * workMin) + ((reps - 1) * restMin) + 20, // Add warmup/cooldown
    distance: totalDistanceKm,
    instructions: `${reps}x${workMin} min med ${restMin} min vila. ${description}`,
    segments,
  }
}

// ============================================================================
// NORWEGIAN DOUBLES METHODOLOGY
// ============================================================================

/**
 * Create weeks with Norwegian Doubles workouts (AM/PM threshold sessions)
 * Norwegian Doubles: 2x weekly double-threshold days (AM: 2-3 mmol/L, PM: 3-4 mmol/L)
 */
function createNorwegianDoublesWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: phase === 'BASE' ? 'Dubbla tröskelpass - aerob bas' :
             phase === 'BUILD' ? 'Intensifierade dubbeldagar' :
             phase === 'PEAK' ? 'Tävlingsförberedelse' : 'Nedtrappning',
      days: createNorwegianDoublesDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh),
    })
  }

  return weeks
}

/**
 * Create 7 days with Norwegian Doubles distribution
 * Key: Tuesday & Thursday are double-threshold days (AM + PM sessions)
 *
 * Norwegian Doubles AM/PM differentiation (from documentation):
 * - AM session (Low Zone 2): 2.0-3.0 mmol/L → ~94% of LT2 pace
 * - PM session (High Zone 2): 3.0-4.0 mmol/L → ~97% of LT2 pace
 * - Uses ACTUAL LT2 from lactate test when available
 * - Priming effect: AM primes metabolism for faster PM session
 */
function createNorwegianDoublesDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  methodologyPaces?: MethodologyPaces  // Optional: use actual LT2 from test
) {
  const days = []

  // Use methodology-specific pacing if available (from lactate test)
  let thresholdPaceKmh: number
  let lowThresholdPace: number  // AM session: 2-3 mmol/L
  let highThresholdPace: number // PM session: 3-4 mmol/L
  let easyPaceKmh: number

  if (methodologyPaces?.norwegianAmPaceKmh && methodologyPaces?.norwegianPmPaceKmh) {
    // Using actual LT2 data - Norwegian gold standard!
    thresholdPaceKmh = methodologyPaces.thresholdPaceKmh
    lowThresholdPace = methodologyPaces.norwegianAmPaceKmh   // 94% of LT2
    highThresholdPace = methodologyPaces.norwegianPmPaceKmh  // 97% of LT2
    easyPaceKmh = methodologyPaces.easyPaceKmh
    console.log(`[Norwegian Doubles] Using LT2 from test: ${formatPaceMinKm(thresholdPaceKmh)}/km`)
    console.log(`[Norwegian Doubles] AM pace (2-3 mmol/L): ${formatPaceMinKm(lowThresholdPace)}/km`)
    console.log(`[Norwegian Doubles] PM pace (3-4 mmol/L): ${formatPaceMinKm(highThresholdPace)}/km`)
  } else {
    // Fallback: estimate from marathon pace
    thresholdPaceKmh = marathonPaceKmh * 1.05
    lowThresholdPace = thresholdPaceKmh * 0.94   // AM: ~6% slower than LT2
    highThresholdPace = thresholdPaceKmh * 0.97  // PM: ~3% slower than LT2
    easyPaceKmh = marathonPaceKmh * 0.78  // Norwegian easy (very slow)
    console.log(`[Norwegian Doubles] Estimated paces (no LT2 test data)`)
  }

  // Double-threshold days: Tuesday (2) and Thursday (4)
  const doubleDays = [2, 4]
  // Easy days: Monday, Wednesday, Friday
  const easyDays = [1, 3, 5]

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Long easy run
      const duration = phase === 'TAPER' ? 70 : Math.min(90 + weekInPhase * 5, 120)
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Långpass - Green zone',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Långpass',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Långpass i Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`,
          segments: [],
        }],
      })
    } else if (dayNum === 6) {
      // Saturday: Zone 4 HIT session (hill sprints)
      // ~10-15 reps x 30-45s @ ~15-17 km/h + jog back (~2 min)
      const hillReps = 12
      const hillSprintKmh = 16 // High intensity
      const postIntervalRestMin = 3 // Time-only rest after last rep before cooldown (no distance)
      const sprintDistanceKm = (hillReps * 0.6 / 60) * hillSprintKmh // ~0.6 min per rep
      const recoveryDistanceKm = ((hillReps - 1) * 2 / 60) * easyPaceKmh // ~2 min jog back between reps
      const warmupCooldownKm = (15 / 60) * easyPaceKmh // 15 min warmup+cooldown
      const hitTotalDistanceKm = Math.round((sprintDistanceKm + recoveryDistanceKm + warmupCooldownKm) * 10) / 10
      const hitTotalDurationMin = Math.round(15 + (hillReps * 0.6) + ((hillReps - 1) * 2) + postIntervalRestMin)

      days.push({
        dayNumber: dayNum,
        notes: 'Zone 4 HIT - Hög intensitet',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Backintervaller',
          intensity: 'INTERVAL' as const,
          duration: hitTotalDurationMin,
          distance: hitTotalDistanceKm,
          instructions: `10-15 × 30-45s backe med full vila. Avsluta med ${postIntervalRestMin} min vila innan nedjogg. Maximal intensitet (>6.0 mmol/L).`,
          segments: [],
        }],
      })
    } else if (doubleDays.includes(dayNum) && phase !== 'TAPER') {
      // Double-threshold day: AM + PM sessions
      // lowThresholdPace and highThresholdPace are already set above from methodologyPaces

      // AM: 5×6 min with 1 min rest + warmup/cooldown
      const amWorkDistanceKm = (5 * 6 / 60) * lowThresholdPace
      const amRestDistanceKm = (4 * 1 / 60) * easyPaceKmh
      const amWarmupCooldownKm = (20 / 60) * easyPaceKmh
      const amTotalDistanceKm = Math.round((amWorkDistanceKm + amRestDistanceKm + amWarmupCooldownKm) * 10) / 10

      // PM: 4×8 min with 1.5 min rest + warmup/cooldown
      const pmWorkDistanceKm = (4 * 8 / 60) * highThresholdPace
      const pmRestDistanceKm = (3 * 1.5 / 60) * easyPaceKmh
      const pmWarmupCooldownKm = (20 / 60) * easyPaceKmh
      const pmTotalDistanceKm = Math.round((pmWorkDistanceKm + pmRestDistanceKm + pmWarmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Dubbel tröskeldag (FM + EM)',
        workouts: [
          {
            type: 'RUNNING' as const,
            name: 'FM: Låg tröskel (2-3 mmol/L)',
            intensity: 'THRESHOLD' as const,
            duration: 55,
            distance: amTotalDistanceKm,
            instructions: `FM-pass: 5×6 min @ ${formatPaceMinKm(lowThresholdPace)}/km med 1 min vila. Håll laktat 2-3 mmol/L.`,
            segments: [],
          },
          {
            type: 'RUNNING' as const,
            name: 'EM: Hög tröskel (3-4 mmol/L)',
            intensity: 'THRESHOLD' as const,
            duration: 55,
            distance: pmTotalDistanceKm,
            instructions: `EM-pass: 4×8 min @ ${formatPaceMinKm(highThresholdPace)}/km med 90s vila. Håll laktat 3-4 mmol/L.`,
            segments: [],
          },
        ],
      })
    } else if (easyDays.includes(dayNum)) {
      // Easy recovery run
      const duration = phase === 'TAPER' ? 30 : 45
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning - Green zone',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning i Green zone (${formatPaceMinKm(easyPaceKmh)}/km).`,
          segments: [],
        }],
      })
    } else {
      // Rest day
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

// ============================================================================
// CANOVA METHODOLOGY (Marathon-specialist)
// ============================================================================

/**
 * Create weeks with Canova methodology
 * Canova: Progressive marathon-specific work, fundamental + special blocks
 */
function createCanovaWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []

  // Canova periodization: Fundamental (40%) → Special (40%) → Competition (20%)
  const fundamentalWeeks = Math.max(Math.floor(durationWeeks * 0.4), 3)
  const specialWeeks = Math.max(Math.floor(durationWeeks * 0.4), 3)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number
    let canovaPhase: string

    if (i < fundamentalWeeks) {
      phase = 'BASE'
      canovaPhase = 'FUNDAMENTAL'
      weekInPhase = i + 1
    } else if (i < fundamentalWeeks + specialWeeks) {
      phase = 'BUILD'
      canovaPhase = 'SPECIAL'
      weekInPhase = i - fundamentalWeeks + 1
    } else {
      phase = i < durationWeeks - 2 ? 'PEAK' : 'TAPER'
      canovaPhase = 'COMPETITION'
      weekInPhase = i - fundamentalWeeks - specialWeeks + 1
    }

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: canovaPhase === 'FUNDAMENTAL' ? 'Grundläggande aerob kapacitet' :
             canovaPhase === 'SPECIAL' ? 'Maratonspecifik träning' : 'Tävlingsförberedelse',
      days: createCanovaDays(sessionsPerWeek, phase, canovaPhase, weekInPhase, marathonPaceKmh, goal),
    })
  }

  return weeks
}

/**
 * Create 7 days with Canova distribution
 * Key workouts: Long intervals at marathon pace, progressive tempo runs
 *
 * Canova MP-based pacing system (from documentation):
 * - All paces calculated as % of Goal Marathon Pace
 * - Regeneration: 60-70% MP (very slow!)
 * - Fundamental: 80% MP
 * - General Endurance: 85-90% MP (used for ACTIVE RECOVERY in intervals!)
 * - Special Endurance: 90-95% MP
 * - Specific: 95-105% MP (THE RACE ZONE)
 * - Special Speed: 105-110% MP
 */
function createCanovaDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  canovaPhase: string,
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  methodologyPaces?: MethodologyPaces  // Optional: use calculated Canova zones
) {
  const days = []

  // Use methodology-specific pacing if available
  let mpPaceKmh: number
  let regenerationPaceKmh: number
  let fundamentalPaceKmh: number
  let generalEnduranceKmh: number  // Active recovery during intervals!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (methodologyPaces?.canovaSpecificKmh) {
    // Using Canova-calculated zones
    mpPaceKmh = methodologyPaces.marathonPaceKmh
    regenerationPaceKmh = methodologyPaces.canovaRegenerationKmh!  // 65% MP
    fundamentalPaceKmh = methodologyPaces.canovaFundamentalKmh!   // 80% MP
    generalEnduranceKmh = methodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = methodologyPaces.canovaSpecialEnduranceKmh!  // 92.5% MP
    specificPaceKmh = methodologyPaces.canovaSpecificKmh!  // 100% MP
    specialSpeedKmh = methodologyPaces.canovaSpecialSpeedKmh!  // 107.5% MP

    console.log(`[Canova] Using MP-based zones:`)
    console.log(`  MP: ${formatPaceMinKm(mpPaceKmh)}/km`)
    console.log(`  Regeneration: ${formatPaceMinKm(regenerationPaceKmh)}/km (65% MP)`)
    console.log(`  Active Recovery: ${formatPaceMinKm(generalEnduranceKmh)}/km (87.5% MP - NOT jogging!)`)
  } else {
    // Fallback: calculate from marathon pace
    mpPaceKmh = marathonPaceKmh
    regenerationPaceKmh = mpPaceKmh * 0.65     // 65% MP (very slow!)
    fundamentalPaceKmh = mpPaceKmh * 0.80      // 80% MP
    generalEnduranceKmh = mpPaceKmh * 0.875    // 87.5% MP (active recovery!)
    specialEnduranceKmh = mpPaceKmh * 0.925    // 92.5% MP
    specificPaceKmh = mpPaceKmh                 // 100% MP
    specialSpeedKmh = mpPaceKmh * 1.075         // 107.5% MP
  }

  // Canova key principle: "Easy" days are REGENERATION (very slow), not Daniels Easy
  const easyPaceKmh = regenerationPaceKmh

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Canova Long Run (progressive or with MP segments)
      const baseDuration = phase === 'TAPER' ? 60 : (canovaPhase === 'FUNDAMENTAL' ? 90 : 105)
      const duration = Math.min(baseDuration + weekInPhase * 5, 150)
      const distance = Math.round((duration / 60) * (easyPaceKmh * 0.85) * 10) / 10

      const longRunInstructions = canovaPhase === 'FUNDAMENTAL'
        ? `Grundläggande långpass (${formatPaceMinKm(easyPaceKmh)}/km). Bygg aerob bas.`
        : canovaPhase === 'SPECIAL'
        ? `Progressivt långpass: Börja lugnt, avsluta sista 20-30 min @ MP (${formatPaceMinKm(mpPaceKmh)}/km).`
        : `Tävlingsförberedande långpass med MP-segment.`

      days.push({
        dayNumber: dayNum,
        notes: 'Canova Långpass',
        workouts: [{
          type: 'RUNNING' as const,
          name: canovaPhase === 'FUNDAMENTAL' ? 'Grundläggande långpass' : 'Progressivt långpass',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: longRunInstructions,
          segments: [],
        }],
      })
    } else if (dayNum === 2) {
      // Tuesday: Quality session 1
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 1, methodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass 1',
        workouts: [workout],
      })
    } else if (dayNum === 4) {
      // Thursday: Quality session 2
      const workout = createCanovaQualityWorkout(canovaPhase, weekInPhase, marathonPaceKmh, goal, 2, methodologyPaces)
      days.push({
        dayNumber: dayNum,
        notes: 'Kvalitetspass 2',
        workouts: [workout],
      })
    } else if (dayNum === 6 && sessionsPerWeek >= 6) {
      // Saturday: Medium long run or tempo
      const duration = phase === 'TAPER' ? 45 : 60
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Medellångt pass',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Medellångt pass',
          intensity: 'MODERATE' as const,
          duration,
          distance,
          instructions: `Medellångt pass med möjlig tempohöjning sista 15-20 min.`,
          segments: [],
        }],
      })
    } else if ([1, 3, 5].includes(dayNum) && sessionsPerWeek >= dayNum) {
      // Easy days
      const duration = phase === 'TAPER' ? 30 : 40
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Lugn löpning',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Lugn löpning',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Lätt löpning (${formatPaceMinKm(easyPaceKmh)}/km).`,
          segments: [],
        }],
      })
    } else {
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Create Canova quality workout
 *
 * Canova workout principles (from documentation):
 * - ACTIVE RECOVERY during intervals at 85-90% MP (NOT easy jog!)
 * - Extension principle: Run MORE distance at same pace, not faster
 * - "Specific Endurance" is the primary training zone (95-105% MP)
 */
function createCanovaQualityWorkout(
  canovaPhase: string,
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string,
  sessionNumber: number,
  methodologyPaces?: MethodologyPaces
) {
  // Use Canova zones if available
  let mpPaceKmh: number
  let fundamentalPaceKmh: number
  let activeRecoveryPaceKmh: number  // 85-90% MP - Canova's key difference!
  let specialEnduranceKmh: number
  let specificPaceKmh: number
  let specialSpeedKmh: number

  if (methodologyPaces?.canovaSpecificKmh) {
    mpPaceKmh = methodologyPaces.marathonPaceKmh
    fundamentalPaceKmh = methodologyPaces.canovaFundamentalKmh!
    activeRecoveryPaceKmh = methodologyPaces.canovaGeneralEnduranceKmh!  // 87.5% MP
    specialEnduranceKmh = methodologyPaces.canovaSpecialEnduranceKmh!
    specificPaceKmh = methodologyPaces.canovaSpecificKmh!
    specialSpeedKmh = methodologyPaces.canovaSpecialSpeedKmh!
  } else {
    mpPaceKmh = marathonPaceKmh
    fundamentalPaceKmh = mpPaceKmh * 0.80
    activeRecoveryPaceKmh = mpPaceKmh * 0.875  // 87.5% MP - NOT easy jog!
    specialEnduranceKmh = mpPaceKmh * 0.925
    specificPaceKmh = mpPaceKmh
    specialSpeedKmh = mpPaceKmh * 1.075
  }

  const is10KorShorter = goal === '5k' || goal === '10k'

  let name: string, description: string, intensity: 'THRESHOLD' | 'INTERVAL' | 'MODERATE'

  if (canovaPhase === 'FUNDAMENTAL') {
    // Fundamental: Build aerobic capacity at 80% MP with varied fartlek
    if (sessionNumber === 1) {
      name = 'Varierad fartlek'
      description = `Fartlek: 8-10 × 2-3 min @ ${formatPaceMinKm(fundamentalPaceKmh)}/km med ${formatPaceMinKm(activeRecoveryPaceKmh)}/km vila. Bygg aerob kapacitet.`
      intensity = 'MODERATE'
    } else {
      name = 'Progressiv tempo'
      description = `Progressivt tempo: Börja @ ${formatPaceMinKm(fundamentalPaceKmh)}/km, avsluta @ ${formatPaceMinKm(specialEnduranceKmh)}/km.`
      intensity = 'THRESHOLD'
    }
  } else if (canovaPhase === 'SPECIAL') {
    // Special: Marathon-specific intervals with ACTIVE RECOVERY (85-90% MP)
    if (sessionNumber === 1) {
      name = 'MP-intervaller'
      description = is10KorShorter
        ? `6-8 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Aktiv vila!`
        : `4-5 × 2000m @ ${formatPaceMinKm(specificPaceKmh)}/km med 400m @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km. Marathon-specifik.`
      intensity = 'THRESHOLD'
    } else {
      name = 'Canova Special Block'
      description = `Special block: 3 × (3km @ ${formatPaceMinKm(specificPaceKmh)}/km + 1km @ ${formatPaceMinKm(activeRecoveryPaceKmh)}/km). Uthållighet vid MP.`
      intensity = 'THRESHOLD'
    }
  } else {
    // Competition: Race-specific at Specific pace (100% MP)
    name = 'Tävlingsförberedelse'
    description = is10KorShorter
      ? `4-5 × 1000m @ ${formatPaceMinKm(specialSpeedKmh)}/km med full vila. Tävlingskänsla.`
      : `2 × 3km @ ${formatPaceMinKm(specificPaceKmh)}/km med 5 min vila. Slipa formen.`
    intensity = 'INTERVAL'
  }

  // Estimate distance: Canova workouts include active recovery at 87.5% MP
  const avgPaceKmh = intensity === 'THRESHOLD' ? specialEnduranceKmh :
                      intensity === 'INTERVAL' ? specificPaceKmh :
                      fundamentalPaceKmh
  const estimatedDistanceKm = Math.round((60 / 60) * avgPaceKmh * 10) / 10

  return {
    type: 'RUNNING' as const,
    name,
    intensity,
    duration: 60,
    distance: estimatedDistanceKm,
    instructions: description,
    segments: [],
  }
}

// ============================================================================
// PYRAMIDAL METHODOLOGY (70/20/10)
// ============================================================================

/**
 * Create weeks with Pyramidal methodology
 * Pyramidal: 70% Zone 1, 20% Zone 2 (tempo), 10% Zone 3 (VO2max)
 */
function createPyramidalWeeks(
  durationWeeks: number,
  startDate: Date,
  sessionsPerWeek: number,
  marathonPaceKmh: number,
  goal: string
) {
  const weeks = []
  const baseWeeks = Math.max(Math.floor(durationWeeks * 0.4), 2)
  const buildWeeks = Math.max(Math.floor(durationWeeks * 0.35), 2)
  const peakWeeks = Math.max(Math.floor(durationWeeks * 0.15), 1)

  for (let i = 0; i < durationWeeks; i++) {
    let phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
    let weekInPhase: number

    if (i < baseWeeks) {
      phase = 'BASE'
      weekInPhase = i + 1
    } else if (i < baseWeeks + buildWeeks) {
      phase = 'BUILD'
      weekInPhase = i - baseWeeks + 1
    } else if (i < baseWeeks + buildWeeks + peakWeeks) {
      phase = 'PEAK'
      weekInPhase = i - baseWeeks - buildWeeks + 1
    } else {
      phase = 'TAPER'
      weekInPhase = i - baseWeeks - buildWeeks - peakWeeks + 1
    }

    const volumePercent = calculateVolumePercent(phase, weekInPhase, i, durationWeeks)

    weeks.push({
      weekNumber: i + 1,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase,
      volume: volumePercent,
      focus: phase === 'BASE' ? 'Aerob bas (70/20/10)' :
             phase === 'BUILD' ? 'Progressiv intensitet' :
             phase === 'PEAK' ? 'Tävlingsspecifik' : 'Nedtrappning',
      days: createPyramidalDays(sessionsPerWeek, phase, weekInPhase, marathonPaceKmh, goal),
    })
  }

  return weeks
}

/**
 * Create 7 days with Pyramidal distribution
 * Distribution: 70% easy, 20% tempo/threshold, 10% VO2max intervals
 */
function createPyramidalDays(
  sessionsPerWeek: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  marathonPaceKmh: number,
  goal: string
) {
  const days = []
  const easyPaceKmh = marathonPaceKmh * 0.85 // Daniels Easy pace
  const tempoPaceKmh = marathonPaceKmh * 1.05 // Threshold pace (88% VDOT)
  // Interval pace will be calculated based on work duration using getIntervalPaceForDuration
  const workMin = phase === 'BASE' ? 3 : 4
  const intervalPaceKmh = getIntervalPaceForDuration(marathonPaceKmh, workMin) // Duration-aware VO2max pace

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    if (dayNum === 7) {
      // Sunday: Long easy run (Zone 1)
      const duration = phase === 'TAPER' ? 60 : Math.min(80 + weekInPhase * 5, 120)
      const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Långpass - Zon 1',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Långpass',
          intensity: 'EASY' as const,
          duration,
          distance,
          instructions: `Långpass i Zon 1 (${formatPaceMinKm(easyPaceKmh)}/km). 70% av träningen.`,
          segments: [],
        }],
      })
    } else if (dayNum === 2) {
      // Tuesday: Tempo/Threshold (Zone 2 - 20%)
      const tempoMinutes = phase === 'TAPER' ? 15 : Math.min(20 + weekInPhase * 2, 35)
      const totalDuration = tempoMinutes + 25 // tempo + warmup/cooldown
      // Calculate distance: tempo part at tempo pace + warmup/cooldown at easy pace
      const tempoDistanceKm = (tempoMinutes / 60) * tempoPaceKmh
      const warmupCooldownKm = (25 / 60) * easyPaceKmh
      const tempoTotalDistanceKm = Math.round((tempoDistanceKm + warmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'Tempopass - Zon 2',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'Tempopass',
          intensity: 'THRESHOLD' as const,
          duration: totalDuration,
          distance: tempoTotalDistanceKm,
          instructions: `Tempo: ${tempoMinutes} min @ ${formatPaceMinKm(tempoPaceKmh)}/km (Zon 2). Jämn ansträngning.`,
          segments: [],
        }],
      })
    } else if (dayNum === 4 && phase !== 'TAPER') {
      // Thursday: VO2max intervals (Zone 3 - 10%)
      const reps = phase === 'BASE' ? 4 : 5
      const workMin = phase === 'BASE' ? 3 : 4
      const restMin = 3
      // Calculate distance: work at interval pace + rest jogging + warmup/cooldown
      const workDistanceKm = (reps * workMin / 60) * intervalPaceKmh
      const restDistanceKm = ((reps - 1) * restMin / 60) * easyPaceKmh
      const warmupCooldownKm = (20 / 60) * easyPaceKmh
      const vo2maxTotalDistanceKm = Math.round((workDistanceKm + restDistanceKm + warmupCooldownKm) * 10) / 10

      days.push({
        dayNumber: dayNum,
        notes: 'VO2max-intervaller - Zon 3',
        workouts: [{
          type: 'RUNNING' as const,
          name: 'VO2max-intervaller',
          intensity: 'INTERVAL' as const,
          duration: 50,
          distance: vo2maxTotalDistanceKm,
          instructions: `${reps}×${workMin} min @ ${formatPaceMinKm(intervalPaceKmh)}/km med 3 min vila. Hög intensitet (Zon 3).`,
          segments: [],
        }],
      })
    } else if ([1, 3, 5, 6].includes(dayNum) && sessionsPerWeek > 3) {
      // Easy days (Zone 1)
      const easyCount = Math.min(sessionsPerWeek - 3, 4) // Max 4 easy days
      const easyDays = [1, 3, 5, 6].slice(0, easyCount)

      if (easyDays.includes(dayNum)) {
        const duration = phase === 'TAPER' ? 30 : 40
        const distance = Math.round((duration / 60) * easyPaceKmh * 10) / 10

        days.push({
          dayNumber: dayNum,
          notes: 'Lugn löpning - Zon 1',
          workouts: [{
            type: 'RUNNING' as const,
            name: 'Lugn löpning',
            intensity: 'EASY' as const,
            duration,
            distance,
            instructions: `Lätt löpning (${formatPaceMinKm(easyPaceKmh)}/km). Del av 70% Zon 1.`,
            segments: [],
          }],
        })
      } else {
        days.push({
          dayNumber: dayNum,
          notes: 'Vilodag',
          workouts: [],
        })
      }
    } else {
      days.push({
        dayNumber: dayNum,
        notes: 'Vilodag',
        workouts: [],
      })
    }
  }

  return days
}

/**
 * Generate General Fitness program from templates
 */
function generateGeneralFitnessProgram(
  params: SportProgramParams,
  client: Client
): CreateTrainingProgramDTO {
  const fitnessGoal = (params.fitnessGoal || mapGoalToFitnessGoal(params.goal)) as FitnessGoal
  const fitnessLevel = (params.fitnessLevel || 'moderately_active') as FitnessLevel

  const fitnessWeeks = getGeneralFitnessProgram(
    fitnessGoal,
    fitnessLevel,
    Math.min(6, Math.max(3, params.sessionsPerWeek)) as 3 | 4 | 5 | 6,
    {
      hasGymAccess: params.hasGymAccess || false,
      preferredActivities: params.preferredActivities || [],
    }
  )

  const programDesc = getProgramDescription(fitnessGoal)
  const durationWeeks = fitnessWeeks.length

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationWeeks * 7)

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `${programDesc.titleSv} - ${client.name}`,
    goalType: 'fitness',
    startDate,
    endDate,
    notes: params.notes || programDesc.descriptionSv,
    weeks: fitnessWeeks.map((week, weekIndex) => ({
      weekNumber: week.week,
      startDate: new Date(startDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000),
      phase: week.phase,
      volume: 0,
      focus: week.focus,
      days: Array.from({ length: 7 }).map((_, dayIndex) => {
        const workout = week.workouts[dayIndex % week.workouts.length]
        const hasWorkout = dayIndex < week.workouts.length

        return {
          dayNumber: dayIndex + 1,
          notes: hasWorkout ? week.tips[dayIndex % week.tips.length] || '' : '',
          workouts: hasWorkout && workout
            ? [
                {
                  type: mapFitnessWorkoutType(workout.type),
                  name: workout.name,
                  intensity: mapIntensity(workout.intensity),
                  duration: workout.duration,
                  distance: undefined,
                  instructions: workout.description,
                  segments: [],
                },
              ]
            : [],
        }
      }),
    })),
  }
}

/**
 * Map goal string to FitnessGoal
 */
function mapGoalToFitnessGoal(goal: string): FitnessGoal {
  const mapping: Record<string, FitnessGoal> = {
    'weight_loss': 'weight_loss',
    'strength': 'strength',
    'endurance': 'endurance',
    'flexibility': 'flexibility',
    'stress_relief': 'stress_relief',
    'general_health': 'general_health',
  }
  return mapping[goal] || 'general_health'
}


/**
 * Map fitness workout types
 */
function mapFitnessWorkoutType(type: string): 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'OTHER' {
  const typeMap: Record<string, 'RUNNING' | 'STRENGTH' | 'CORE' | 'RECOVERY' | 'OTHER'> = {
    cardio: 'RUNNING',
    strength: 'STRENGTH',
    hiit: 'RUNNING',
    mobility: 'RECOVERY',
    yoga: 'RECOVERY',
    'active-rest': 'RECOVERY',
    circuit: 'STRENGTH',
    core: 'CORE',
  }
  return typeMap[type] || 'OTHER'
}

/**
 * Map intensity levels
 */
function mapIntensity(intensity: string): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const intensityMap: Record<string, 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL'> = {
    low: 'EASY',
    moderate: 'MODERATE',
    high: 'THRESHOLD',
    very_high: 'INTERVAL',
  }
  return intensityMap[intensity] || 'MODERATE'
}
