// lib/program-generator/generators/hyrox-generator.ts
// HYROX program generator (Functional Fitness Racing)

import { Client, CreateTrainingProgramDTO, CreateWorkoutSegmentDTO, PeriodPhase, CreateWorkoutDTO } from '@/types'
import { getProgramStartDate, getProgramEndDate } from '../date-utils'
import { HYROX_BEGINNER_12_WEEK, HYROX_INTERMEDIATE_16_WEEK, HYROXTemplateWeek, HYROXTemplateWorkout } from '../templates/hyrox'
import { mapHyroxWeekToWorkouts } from '../workout-mapper'
import { fetchElitePacesServer, validateEliteZones, type EliteZonePaces } from '../elite-pace-integration'
import { calculateVDOT, getTrainingPaces, type DanielsTrainingPaces } from '@/lib/training-engine/calculations/vdot'
import {
  analyzeStationWeaknesses,
  getStrengthRequirements,
  estimateRaceTime,
  getPerformanceLevel,
  formatTime,
  parseTime,
  type StationTimes,
  type Gender,
  type PerformanceLevel,
  type Division,
} from '../hyrox-benchmarks'
import {
  analyzeAthleteProfile,
  calculateProgressivePaces,
  scaleRunningVolume,
  getStationSessionsPerWeek,
  type HyroxAthleteProfile,
  type AthleteProfileInput,
  type AthleteType,
} from '../hyrox-athlete-profiler'
import {
  generateHyroxStrengthSession,
  calculateWorkingWeight,
  formatWeightPrescription,
  getPhaseProtocol,
  type StrengthPRs,
  type HyroxStrengthExercise,
  type HyroxStation,
} from '../templates/hyrox-strength'
import type { StrengthPhase } from '@prisma/client'

export interface HyroxProgramParams {
  clientId: string
  coachId: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  includeStrength?: boolean
  strengthSessionsPerWeek?: number
  // Race results for VDOT calculation (pure running races only, NOT HYROX times)
  recentRaceDistance?: 'NONE' | '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string // HH:MM:SS or MM:SS format
  // Current training volume for scaling
  currentWeeklyKm?: number
  // Target goal time for progressive pacing
  goalTime?: string // H:MM:SS format (target HYROX total time)

  // HYROX-specific station times (seconds)
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

  // Strength PRs (kg)
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number // max reps
  }
}

/**
 * Generate a HYROX training program
 */
export async function generateHyroxProgram(
  params: HyroxProgramParams,
  client: Client
): Promise<CreateTrainingProgramDTO> {
  console.log('[HYROX Generator] Starting program generation')
  console.log(`  Goal: ${params.goal}`)
  console.log(`  Experience Level: ${params.experienceLevel || 'beginner'}`)
  console.log(`  Division: ${params.hyroxDivision || 'open'}`)
  console.log(`  Gender: ${params.hyroxGender || 'not specified'}`)

  const startDate = getProgramStartDate()
  const endDate = getProgramEndDate(startDate, params.durationWeeks)

  // ========================================
  // HYROX Station Times Analysis
  // ========================================
  let weaknessAnalysis: ReturnType<typeof analyzeStationWeaknesses> | null = null
  let raceTimeEstimate: ReturnType<typeof estimateRaceTime> | null = null
  let strengthRequirements: ReturnType<typeof getStrengthRequirements> | null = null
  let programNotes: string[] = []

  if (params.hyroxStationTimes && params.hyroxGender) {
    const stationTimes: StationTimes = {
      skierg: params.hyroxStationTimes.skierg ?? null,
      sledPush: params.hyroxStationTimes.sledPush ?? null,
      sledPull: params.hyroxStationTimes.sledPull ?? null,
      burpeeBroadJump: params.hyroxStationTimes.burpeeBroadJump ?? null,
      rowing: params.hyroxStationTimes.rowing ?? null,
      farmersCarry: params.hyroxStationTimes.farmersCarry ?? null,
      sandbagLunge: params.hyroxStationTimes.sandbagLunge ?? null,
      wallBalls: params.hyroxStationTimes.wallBalls ?? null,
      roxzone: null, // Not collected in wizard yet
    }

    // Check if any times were provided
    const hasAnyTimes = Object.values(stationTimes).some(t => t !== null)

    if (hasAnyTimes) {
      console.log('[HYROX Generator] ===== STATION TIMES ANALYSIS =====')

      // Determine target level based on experience
      const targetLevel: PerformanceLevel =
        params.experienceLevel === 'advanced' ? 'elite' :
        params.experienceLevel === 'intermediate' ? 'advanced' :
        'intermediate'

      // Analyze weaknesses
      weaknessAnalysis = analyzeStationWeaknesses(
        stationTimes,
        params.hyroxGender as Gender,
        targetLevel
      )

      console.log(`  Target Level: ${targetLevel}`)
      console.log(`  Weak Stations: ${weaknessAnalysis.weakStations.join(', ') || 'None identified'}`)
      console.log(`  Strong Stations: ${weaknessAnalysis.strongStations.join(', ') || 'None identified'}`)

      // Log recommendations
      if (weaknessAnalysis.recommendations.length > 0) {
        console.log('  Recommendations:')
        weaknessAnalysis.recommendations.forEach(rec => console.log(`    - ${rec}`))
      }

      // Estimate race time
      if (params.hyroxStationTimes.averageRunPace) {
        raceTimeEstimate = estimateRaceTime(
          stationTimes,
          params.hyroxStationTimes.averageRunPace
        )
        console.log(`  Estimated Race Time: ${raceTimeEstimate.formatted}`)
        console.log(`    Running: ${formatTime(raceTimeEstimate.breakdown.running)}`)
        console.log(`    Stations: ${formatTime(raceTimeEstimate.breakdown.stations)}`)
        console.log(`    Transitions: ${formatTime(raceTimeEstimate.breakdown.transitions)}`)

        // Determine performance level from estimated time
        const performanceLevel = getPerformanceLevel(
          raceTimeEstimate.totalTime,
          params.hyroxGender as Gender
        )
        console.log(`  Current Performance Level: ${performanceLevel}`)
      }

      // Add analysis to program notes
      if (weaknessAnalysis.weakStations.length > 0) {
        const stationLabels: Record<string, string> = {
          skierg: 'SkiErg',
          sledPush: 'Sled Push',
          sledPull: 'Sled Pull',
          burpeeBroadJump: 'Burpee Broad Jump',
          rowing: 'Rowing',
          farmersCarry: 'Farmers Carry',
          sandbagLunge: 'Sandbag Lunge',
          wallBalls: 'Wall Balls',
        }
        const weakLabels = weaknessAnalysis.weakStations.map(s => stationLabels[s] || s)
        programNotes.push(`⚠️ Prioritera: ${weakLabels.join(', ')}`)
      }

      if (raceTimeEstimate) {
        programNotes.push(`📊 Beräknad tävlingstid: ${raceTimeEstimate.formatted}`)
      }

      console.log('[HYROX Generator] ===== END STATION ANALYSIS =====')
    }
  }

  // ========================================
  // Strength Requirements Analysis
  // ========================================
  if (params.hyroxGender && params.hyroxBodyweight) {
    strengthRequirements = getStrengthRequirements(
      params.hyroxGender as Gender,
      (params.hyroxDivision || 'open') as Division,
      params.hyroxBodyweight
    )

    console.log('[HYROX Generator] ===== STRENGTH REQUIREMENTS =====')
    console.log(`  Division: ${params.hyroxDivision || 'open'}`)
    console.log(`  Bodyweight: ${params.hyroxBodyweight} kg`)
    console.log(`  Min Deadlift: ${Math.round(strengthRequirements.deadliftMin)} kg`)
    console.log(`  Min Squat: ${Math.round(strengthRequirements.squatMin)} kg`)
    console.log(`  ${strengthRequirements.recommendation}`)

    // Check athlete's PRs against requirements
    if (params.strengthPRs) {
      console.log('  Athlete PRs:')
      if (params.strengthPRs.deadlift) {
        const deadliftStatus = params.strengthPRs.deadlift >= strengthRequirements.deadliftMin ? '✓' : '⚠️'
        console.log(`    ${deadliftStatus} Deadlift: ${params.strengthPRs.deadlift} kg (min: ${Math.round(strengthRequirements.deadliftMin)} kg)`)
        if (params.strengthPRs.deadlift < strengthRequirements.deadliftMin) {
          programNotes.push(`💪 Öka marklyft: ${params.strengthPRs.deadlift} → ${Math.round(strengthRequirements.deadliftMin)} kg`)
        }
      }
      if (params.strengthPRs.backSquat) {
        const squatStatus = params.strengthPRs.backSquat >= strengthRequirements.squatMin ? '✓' : '⚠️'
        console.log(`    ${squatStatus} Squat: ${params.strengthPRs.backSquat} kg (min: ${Math.round(strengthRequirements.squatMin)} kg)`)
        if (params.strengthPRs.backSquat < strengthRequirements.squatMin) {
          programNotes.push(`💪 Öka knäböj: ${params.strengthPRs.backSquat} → ${Math.round(strengthRequirements.squatMin)} kg`)
        }
      }
    }
    console.log('[HYROX Generator] ===== END STRENGTH REQUIREMENTS =====')
  }

  // ========================================
  // Athlete Profile Analysis (NEW)
  // ========================================
  let athleteProfile: HyroxAthleteProfile | null = null

  if (params.hyroxGender) {
    console.log('[HYROX Generator] ===== ATHLETE PROFILE ANALYSIS =====')

    const profileInput: AthleteProfileInput = {
      gender: params.hyroxGender as Gender,
      experienceLevel: params.experienceLevel,
      currentWeeklyKm: params.currentWeeklyKm,
      goalTime: params.goalTime,
      hyroxAverageRunPace: params.hyroxStationTimes?.averageRunPace || undefined,
      stationTimes: params.hyroxStationTimes ? {
        skierg: params.hyroxStationTimes.skierg ?? null,
        sledPush: params.hyroxStationTimes.sledPush ?? null,
        sledPull: params.hyroxStationTimes.sledPull ?? null,
        burpeeBroadJump: params.hyroxStationTimes.burpeeBroadJump ?? null,
        rowing: params.hyroxStationTimes.rowing ?? null,
        farmersCarry: params.hyroxStationTimes.farmersCarry ?? null,
        sandbagLunge: params.hyroxStationTimes.sandbagLunge ?? null,
        wallBalls: params.hyroxStationTimes.wallBalls ?? null,
        roxzone: null,
      } : undefined,
    }

    // Add race result if available
    if (params.recentRaceDistance && params.recentRaceDistance !== 'NONE' && params.recentRaceTime) {
      profileInput.recentRaceDistance = params.recentRaceDistance as '5K' | '10K' | 'HALF' | 'MARATHON'
      profileInput.recentRaceTime = params.recentRaceTime
    }

    athleteProfile = analyzeAthleteProfile(profileInput)

    console.log(`  Athlete Type: ${athleteProfile.athleteType}`)
    console.log(`  Runner Type: ${athleteProfile.runnerType}`)
    console.log(`  Station Type: ${athleteProfile.stationType}`)
    console.log(`  VDOT: ${athleteProfile.vdot || 'Not calculated'}`)
    console.log(`  Volume Scale Factor: ${athleteProfile.volumeScaleFactor}`)
    console.log(`  Recommended Weekly km: ${athleteProfile.recommendedWeeklyKm}`)
    if (athleteProfile.paceDegradation) {
      console.log(`  Pace Degradation: ${athleteProfile.paceDegradation.toFixed(1)}% (${athleteProfile.paceDegradationLevel})`)
    }
    if (athleteProfile.goalTimeSeconds) {
      console.log(`  Goal Time: ${formatTime(athleteProfile.goalTimeSeconds)}`)
      console.log(`  Current Estimated: ${athleteProfile.currentEstimatedTime ? formatTime(athleteProfile.currentEstimatedTime) : 'N/A'}`)
      console.log(`  Goal Assessment: ${athleteProfile.goalAssessment}`)
    }
    console.log(`  Training Focus:`)
    athleteProfile.trainingFocus.forEach(focus => console.log(`    - ${focus}`))

    // Add profile insights to program notes
    programNotes.push(`🏃 Atletprofil: ${getAthleteTypeLabel(athleteProfile.athleteType)}`)
    programNotes.push(`   ${athleteProfile.profileDescription}`)
    if (athleteProfile.volumeScaleFactor !== 1.0) {
      const scalePercent = Math.round((athleteProfile.volumeScaleFactor - 1) * 100)
      const direction = scalePercent > 0 ? '+' : ''
      programNotes.push(`📊 Volymjustering: ${direction}${scalePercent}% vs standardprogram`)
    }
    if (athleteProfile.goalTimeSeconds && athleteProfile.currentEstimatedTime) {
      programNotes.push(`🎯 ${athleteProfile.goalAssessment}`)
    }

    console.log('[HYROX Generator] ===== END ATHLETE PROFILE ANALYSIS =====')
  }

  // ========================================
  // Calculate Elite Paces for Running Workouts
  // Priority: 1) Wizard race result → VDOT, 2) Database race results
  // ========================================
  let elitePaces: EliteZonePaces | null = null

  // First try: Calculate from wizard race result (highest priority)
  if (params.recentRaceDistance && params.recentRaceDistance !== 'NONE' && params.recentRaceTime) {
    const vdotFromWizard = calculateVDOTFromWizardRace(params.recentRaceDistance, params.recentRaceTime)
    if (vdotFromWizard) {
      elitePaces = convertVDOTToEliteZones(vdotFromWizard.vdot, vdotFromWizard.paces)
      console.log('[HYROX Generator] ✓ Paces calculated from wizard race result (VDOT)')
      console.log(`  Race: ${params.recentRaceDistance} in ${params.recentRaceTime}`)
      console.log(`  VDOT: ${vdotFromWizard.vdot}`)
      console.log(`  Core paces:`)
      console.log(`    Easy: ${elitePaces.core.easy}`)
      console.log(`    Marathon: ${elitePaces.core.marathon}`)
      console.log(`    Threshold: ${elitePaces.core.threshold}`)
      console.log(`    Interval: ${elitePaces.core.interval}`)
    }
  }

  // Second try: Fetch from database (if no wizard race result)
  if (!elitePaces) {
    try {
      console.log('[HYROX Generator] Fetching elite paces from database for client:', client.id)
      elitePaces = await fetchElitePacesServer(client.id)

      if (elitePaces && validateEliteZones(elitePaces)) {
        console.log('[HYROX Generator] ✓ Elite paces fetched from database')
        console.log(`  Source: ${elitePaces.source}`)
        console.log(`  Confidence: ${elitePaces.confidence}`)
        console.log(`  Core paces:`)
        console.log(`    Easy: ${elitePaces.core.easy}`)
        console.log(`    Marathon: ${elitePaces.core.marathon}`)
        console.log(`    Threshold: ${elitePaces.core.threshold}`)
        console.log(`    Interval: ${elitePaces.core.interval}`)
      } else {
        console.log('[HYROX Generator] ⚠ No elite paces available - workouts will not include pace targets')
      }
    } catch (error) {
      console.error('[HYROX Generator] Error fetching elite paces:', error)
    }
  }

  // Select template based on goal and experience level
  let template
  if (params.goal === 'beginner' || params.experienceLevel === 'beginner') {
    template = HYROX_BEGINNER_12_WEEK
  } else if (
    params.goal === 'pro' ||
    params.goal === 'age-group' ||
    params.goal === 'intermediate' ||
    params.experienceLevel === 'intermediate' ||
    params.experienceLevel === 'advanced'
  ) {
    // Pro, age-group, intermediate and advanced all use the 16-week template
    template = HYROX_INTERMEDIATE_16_WEEK
  } else if (params.goal === 'custom') {
    // Custom goal - create empty structure for coach to fill
    return createEmptyHyroxProgram(params, client, startDate, endDate)
  } else {
    // Default to intermediate template for any other goal
    template = HYROX_INTERMEDIATE_16_WEEK
  }

  // Map template weeks to program structure
  // When detailed strength is enabled, filter out template strength workouts
  // so we can replace them with the detailed versions from addStrengthWorkoutsToProgram
  const useDetailedStrength = params.includeStrength && params.strengthSessionsPerWeek && params.strengthSessionsPerWeek > 0

  // Volume scaling from athlete profile
  const volumeScaleFactor = athleteProfile?.volumeScaleFactor ?? 1.0
  const currentAthleteType = athleteProfile?.athleteType ?? 'BALANCED'

  // Use params.durationWeeks instead of template length to respect user's race date
  // Slice template weeks if needed, cycling through if durationWeeks > template length
  const targetWeeks = params.durationWeeks
  const templateLength = template.weeks.length
  const totalWeeks = targetWeeks

  console.log(`[HYROX Generator] Duration: ${targetWeeks} weeks (template has ${templateLength} weeks)`)

  // Log volume scaling info
  if (athleteProfile) {
    console.log('[HYROX Generator] ===== VOLUME SCALING =====')
    console.log(`  Athlete Type: ${currentAthleteType}`)
    console.log(`  Volume Scale Factor: ${volumeScaleFactor}`)
    console.log(`  Current Weekly km: ${athleteProfile.currentWeeklyKm || 'Not provided'}`)
    console.log(`  Recommended Weekly km: ${athleteProfile.recommendedWeeklyKm}`)
  }

  // Create weeks array based on target duration, not template length
  // If targetWeeks < templateLength: use last N weeks of template (peak/taper)
  // If targetWeeks >= templateLength: use full template
  const weeksToUse = targetWeeks <= templateLength
    ? template.weeks.slice(templateLength - targetWeeks) // Take final weeks for shorter programs
    : template.weeks

  const weeks = weeksToUse.map((week, index) => {
    const workouts = mapHyroxWeekToWorkouts(week)
    const weekPhase = mapPhase(week.phase)
    // Use index+1 for week number (not template's week number) so it starts from 1
    const weekNumber = index + 1

    // Create days from template days
    const days = week.days.map((day) => {
      // Filter out template strength workouts when detailed strength is enabled
      const filteredWorkouts = day.isRestDay ? [] : day.workouts
        .filter(w => {
          // Keep all non-strength workouts
          // Only filter out strength workouts if using detailed strength
          if (useDetailedStrength && w.type === 'strength') {
            console.log(`[HYROX Generator] Filtering out template strength: ${w.name}`)
            return false
          }
          return true
        })
        .map(w => {
          // Apply volume scaling to running workouts
          let scaledDistance = w.runningDistance
          let scaledDuration = w.duration

          if (athleteProfile && w.runningDistance && w.type === 'running') {
            const originalDistanceKm = w.runningDistance / 1000
            const scaledDistanceKm = scaleRunningVolume(
              originalDistanceKm,
              volumeScaleFactor,
              currentAthleteType,
              weekPhase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
              weekNumber,
              totalWeeks
            )
            scaledDistance = Math.round(scaledDistanceKm * 1000)

            // Adjust duration proportionally
            if (w.duration && originalDistanceKm > 0) {
              scaledDuration = Math.round(w.duration * (scaledDistanceKm / originalDistanceKm))
            }
          }

          // Create segments first, then calculate totals from them
            const segments = w.type === 'station_practice' || w.type === 'hyrox_simulation' || w.type === 'mixed'
              ? createStationSegments(w, params.hyroxDivision, params.hyroxGender, params.experienceLevel)
              : createRunningSegments(
                  { ...w, runningDistance: scaledDistance, duration: scaledDuration },
                  elitePaces,
                  params.hyroxDivision
                )

            // Calculate actual totals from segments (including warmup, intervals, rest, cooldown)
            const calculatedTotals = calculateTotalsFromSegments(segments, scaledDuration, scaledDistance)

            return {
            type: mapHyroxWorkoutType(w.type),
            name: w.name,
            description: w.description,
            intensity: mapIntensity(w.intensity, w.structure),
            duration: calculatedTotals.totalDuration,
            // Add distance in km for weekly volume tracking
            distance: calculatedTotals.totalDistance,
            instructions: w.structure,
            segments,
          }
        })

      return {
        dayNumber: day.dayNumber,
        notes: day.isRestDay ? 'Vilodag' : '',
        workouts: filteredWorkouts,
      }
    })

    // Calculate scaled weekly volume
    let weeklyVolume = 0
    days.forEach(day => {
      day.workouts.forEach((workout: { type: string; duration?: number }) => {
        if (workout.type === 'RUNNING' && workout.duration) {
          weeklyVolume += workout.duration
        }
      })
    })

    // Adjust focus based on athlete type
    let adjustedFocus = week.focus
    if (athleteProfile) {
      if (currentAthleteType === 'FAST_WEAK') {
        adjustedFocus = `${week.focus} (Fokus: stationsträning)`
      } else if (currentAthleteType === 'SLOW_STRONG') {
        adjustedFocus = `${week.focus} (Fokus: löpvolym)`
      }
    }

    return {
      weekNumber: week.weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
      phase: weekPhase,
      volume: weeklyVolume,
      focus: adjustedFocus,
      days,
    }
  })

  // ========================================
  // Add Strength Workouts
  // ========================================
  if (params.includeStrength && params.strengthSessionsPerWeek && params.strengthSessionsPerWeek > 0) {
    console.log('[HYROX Generator] ===== ADDING STRENGTH WORKOUTS =====')
    console.log(`  Sessions per week: ${params.strengthSessionsPerWeek}`)

    const strengthPRs: StrengthPRs = params.strengthPRs || {}
    const weakStationsList = weaknessAnalysis?.weakStations || []

    console.log(`  Strength PRs provided:`, Object.keys(strengthPRs).filter(k => strengthPRs[k as keyof StrengthPRs]))
    console.log(`  Weak stations to prioritize: ${weakStationsList.join(', ') || 'None'}`)

    addStrengthWorkoutsToProgram(
      weeks,
      params.strengthSessionsPerWeek,
      strengthPRs,
      weakStationsList
    )

    console.log('[HYROX Generator] ===== STRENGTH WORKOUTS ADDED =====')

    // Add note about strength training
    programNotes.push(`💪 Styrketräning: ${params.strengthSessionsPerWeek}x/vecka med ${
      Object.keys(strengthPRs).length > 0 ? '% av 1RM' : 'relativ belastning'
    }`)
  }

  const goalLabels: Record<string, string> = {
    'beginner': 'Nybörjare',
    'intermediate': 'Mellanliggande',
    'pro': 'Pro Division',
    'age-group': 'Age Group',
    'doubles': 'Doubles',
    'custom': 'Anpassad',
  }

  // Build final program notes
  const baseNotes = params.notes || template.description || 'HYROX-träningsprogram med löpning och funktionella stationer'
  const analysisNotes = programNotes.length > 0 ? '\n\n--- Analys ---\n' + programNotes.join('\n') : ''
  const finalNotes = baseNotes + analysisNotes

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX ${goalLabels[params.goal] || template.name} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: finalNotes,
    weeks,
  }
}

/**
 * Map HYROX workout type to WorkoutType
 */
function mapHyroxWorkoutType(type: string): 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY' {
  const mapping: Record<string, 'RUNNING' | 'STRENGTH' | 'HYROX' | 'RECOVERY'> = {
    running: 'RUNNING',
    strength: 'STRENGTH',
    station_practice: 'HYROX',
    hyrox_simulation: 'HYROX',
    interval: 'RUNNING',
    endurance: 'RUNNING',
    recovery: 'RECOVERY',
    mixed: 'HYROX',
  }
  return mapping[type] || 'HYROX'
}

/**
 * Map intensity string to WorkoutIntensity
 */
function mapIntensity(
  intensity: string,
  structure?: string
): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  // Check if this is an interval workout based on structure
  const isIntervalStructure = structure && (
    structure.includes('x') ||
    structure.includes('×') ||
    /\d+x\d+/.test(structure) ||
    structure.toLowerCase().includes('intervall')
  )

  const mapping: Record<string, 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'> = {
    easy: 'EASY',
    moderate: 'MODERATE',
    // 'hard' maps to INTERVAL if it has interval structure (e.g., 6x1km), otherwise THRESHOLD
    hard: isIntervalStructure ? 'INTERVAL' : 'THRESHOLD',
    race_pace: 'INTERVAL',
  }
  return mapping[intensity] || 'MODERATE'
}

/**
 * Map phase string to PeriodPhase
 */
function mapPhase(phase: string): PeriodPhase {
  const mapping: Record<string, PeriodPhase> = {
    BASE: 'BASE',
    BUILD: 'BUILD',
    PEAK: 'PEAK',
    TAPER: 'TAPER',
    RACE: 'PEAK',
    RECOVERY: 'RECOVERY',
  }
  return mapping[phase] || 'BASE'
}

/**
 * Create empty HYROX program structure
 */
function createEmptyHyroxProgram(
  params: HyroxProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => ({
    weekNumber: i + 1,
    startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
    phase: getHyroxPhase(i + 1, params.durationWeeks),
    volume: 0,
    focus: getHyroxFocus(params.goal, i + 1, params.durationWeeks),
    days: Array.from({ length: 7 }).map((_, j) => ({
      dayNumber: j + 1,
      notes: '',
      workouts: [],
    })),
  }))

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || 'HYROX-träningsprogram med löpning och funktionella stationer',
    weeks,
  }
}

function getHyroxPhase(weekNum: number, totalWeeks: number): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' {
  const progress = weekNum / totalWeeks
  if (progress < 0.3) return 'BASE'
  if (progress < 0.7) return 'BUILD'
  if (progress < 0.9) return 'PEAK'
  return 'TAPER'
}

function getHyroxFocus(goal: string, weekNum: number, totalWeeks: number): string {
  const progress = weekNum / totalWeeks

  // HYROX-specific focus areas
  if (progress < 0.25) return 'Grundkondition och teknisk inlärning av stationer'
  if (progress < 0.5) return 'Stationsspecifik träning och löpkapacitet'
  if (progress < 0.75) return 'Race-simuleringar och övergångar'
  if (progress < 0.9) return 'Tävlingstempo och finjustering'
  return 'Taper och vila'
}

/**
 * Parse pace string (MM:SS or M:SS or MM:SS/km) to seconds
 * Returns the pace in seconds per km
 */
function parsePaceToSeconds(pace: string): number {
  if (!pace) return 0
  // Remove "/km" suffix if present
  const cleanPace = pace.replace(/\/km$/i, '').trim()
  const parts = cleanPace.split(':').map(Number)
  if (parts.some(isNaN) || parts.length !== 2) return 0
  return parts[0] * 60 + parts[1]
}

/**
 * Calculate total duration and distance from workout segments
 * Includes warmup, intervals, rest periods, and cooldown
 * Falls back to template values if segments don't provide enough info
 */
function calculateTotalsFromSegments(
  segments: CreateWorkoutSegmentDTO[],
  fallbackDuration: number,
  fallbackDistanceMeters: number | undefined
): { totalDuration: number; totalDistance: number | undefined } {
  if (!segments || segments.length === 0) {
    return {
      totalDuration: fallbackDuration,
      totalDistance: fallbackDistanceMeters ? fallbackDistanceMeters / 1000 : undefined,
    }
  }

  let totalDuration = 0
  let totalDistance = 0
  let hasDistanceData = false

  for (const segment of segments) {
    // Sum duration (in minutes)
    if (segment.duration) {
      totalDuration += segment.duration
    } else if (segment.distance && segment.pace) {
      // Calculate duration from distance and pace
      // pace is in seconds/km, distance is in km
      const paceSeconds = typeof segment.pace === 'string' ? parseInt(segment.pace, 10) : segment.pace
      if (!isNaN(paceSeconds) && paceSeconds > 0) {
        const durationMinutes = (segment.distance * paceSeconds) / 60
        totalDuration += durationMinutes
      }
    }

    // Sum distance (segments store in km)
    if (segment.distance) {
      totalDistance += segment.distance
      hasDistanceData = true
    }
  }

  return {
    totalDuration: totalDuration > 0 ? Math.round(totalDuration) : fallbackDuration,
    totalDistance: hasDistanceData ? Math.round(totalDistance * 10) / 10 : (fallbackDistanceMeters ? fallbackDistanceMeters / 1000 : undefined),
  }
}

/**
 * Create running segments with pace data based on workout type and intensity
 * Returns empty array for non-running workouts or if no pace data is available
 *
 * All running workouts >= 20 min or >= 3km get warmup/cooldown structure.
 * Pace is stored as numeric seconds for Focus Mode compatibility.
 * Interval workouts get individual rest segments between reps.
 */
function createRunningSegments(
  workout: HYROXTemplateWorkout,
  elitePaces: EliteZonePaces | null,
  division?: 'open' | 'pro' | 'doubles'
): CreateWorkoutSegmentDTO[] {
  // Skip if not a running workout
  const runningTypes = ['running', 'interval', 'endurance']
  if (!runningTypes.includes(workout.type)) {
    return []
  }

  // Skip if no pace data available
  if (!elitePaces || !validateEliteZones(elitePaces)) {
    return []
  }

  const segments: CreateWorkoutSegmentDTO[] = []
  let segmentOrder = 1

  // Determine main workout pace based on intensity (as seconds)
  const mainPaceStr = getWorkoutPace(workout.intensity, elitePaces)
  const mainPaceSeconds = parsePaceToSeconds(mainPaceStr)
  const mainZone = getWorkoutZone(workout.intensity)

  // Warmup/cooldown pace (easy pace, slower end)
  const warmupPaceStr = elitePaces.daniels.easy.minPace
  const warmupPaceSeconds = parsePaceToSeconds(warmupPaceStr)

  // Check if this is an interval workout (has structure with intervals)
  const isIntervalWorkout = workout.structure && (
    workout.structure.includes('x') ||
    workout.structure.includes('×') ||
    workout.structure.includes('intervall') ||
    workout.structure.includes('800m') ||
    workout.structure.includes('1km') ||
    workout.structure.includes('400m')
  )

  // Check if workout needs warmup/cooldown (>= 20 min or >= 3km)
  const distanceKm = workout.runningDistance ? workout.runningDistance / 1000 : undefined
  const needsWarmupCooldown = workout.duration >= 20 || (distanceKm && distanceKm >= 3) || isIntervalWorkout

  if (isIntervalWorkout && workout.structure) {
    // Parse interval structure (e.g., "6x1km", "8x400m", "5x1km med 2 min vila")
    const intervalMatch = workout.structure.match(/(\d+)\s*[x×]\s*(\d+)\s*(km|m)/i)

    if (intervalMatch) {
      const reps = parseInt(intervalMatch[1])
      const distance = parseInt(intervalMatch[2])
      const unit = intervalMatch[3].toLowerCase()
      const intervalDistanceKm = unit === 'km' ? distance : distance / 1000

      // Parse rest time from structure (e.g., "med 2 min vila", "90 sek vila")
      const restMatch = workout.structure.match(/(\d+)\s*(min|sek)/i)
      let restSeconds = 120 // Default 2 min rest
      if (restMatch) {
        const restValue = parseInt(restMatch[1])
        const restUnit = restMatch[2].toLowerCase()
        restSeconds = restUnit === 'min' ? restValue * 60 : restValue
      }

      // Calculate warmup/cooldown distances based on easy pace
      const warmupDurationMin = 10
      const cooldownDurationMin = 5
      const warmupDistanceKm = warmupPaceSeconds > 0
        ? Math.round((warmupDurationMin / (warmupPaceSeconds / 60)) * 10) / 10
        : 1.5
      const cooldownDistanceKm = warmupPaceSeconds > 0
        ? Math.round((cooldownDurationMin / (warmupPaceSeconds / 60)) * 10) / 10
        : 0.8

      // Add warmup segment (10 min easy) with distance
      segments.push({
        order: segmentOrder++,
        type: 'warmup',
        duration: warmupDurationMin,
        distance: warmupDistanceKm,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Uppvärmning ${warmupDistanceKm} km @ ${warmupPaceStr}`,
      })

      // For short intervals (400m-1km), use INTERVAL pace
      const isShortInterval = intervalDistanceKm <= 1
      const intervalPaceStr = isShortInterval
        ? elitePaces.core.interval
        : mainPaceStr
      const intervalPaceSeconds = parsePaceToSeconds(intervalPaceStr)
      const intervalZone = isShortInterval ? 4 : mainZone

      // Create individual segments for each rep with rest between
      for (let rep = 1; rep <= reps; rep++) {
        // Interval segment
        const partnerNote = division === 'doubles'
          ? ` (Partner ${rep % 2 === 1 ? 'A' : 'B'})`
          : ''

        segments.push({
          order: segmentOrder++,
          type: 'interval',
          distance: intervalDistanceKm,
          pace: intervalPaceSeconds.toString(),
          zone: intervalZone,
          description: `Intervall ${rep}/${reps}: ${distance}${unit} @ ${intervalPaceStr}${partnerNote}`,
        })

        // Rest segment between reps (not after last rep)
        if (rep < reps) {
          segments.push({
            order: segmentOrder++,
            type: 'rest',
            duration: Math.round(restSeconds / 60), // Duration in minutes
            zone: 1,
            description: `Vila ${restSeconds >= 60 ? Math.round(restSeconds / 60) + ' min' : restSeconds + ' sek'}`,
          })
        }
      }

      // Add cooldown segment (5 min easy) with distance
      segments.push({
        order: segmentOrder++,
        type: 'cooldown',
        duration: cooldownDurationMin,
        distance: cooldownDistanceKm,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Nedvarvning ${cooldownDistanceKm} km @ ${warmupPaceStr}`,
      })
    } else {
      // Generic interval structure - still add warmup/cooldown
      // Calculate distances
      const warmupDist = warmupPaceSeconds > 0
        ? Math.round((10 / (warmupPaceSeconds / 60)) * 10) / 10
        : 1.5
      const cooldownDist = warmupPaceSeconds > 0
        ? Math.round((5 / (warmupPaceSeconds / 60)) * 10) / 10
        : 0.8

      segments.push({
        order: segmentOrder++,
        type: 'warmup',
        duration: 10,
        distance: warmupDist,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Uppvärmning ${warmupDist} km @ ${warmupPaceStr}`,
      })

      segments.push({
        order: segmentOrder++,
        type: 'work',
        duration: workout.duration - 15, // Subtract warmup/cooldown time
        pace: mainPaceSeconds.toString(),
        zone: mainZone,
        description: workout.name,
      })

      segments.push({
        order: segmentOrder++,
        type: 'cooldown',
        duration: 5,
        distance: cooldownDist,
        pace: warmupPaceSeconds.toString(),
        zone: 2,
        description: `Nedvarvning ${cooldownDist} km @ ${warmupPaceStr}`,
      })
    }
  } else if (needsWarmupCooldown) {
    // Continuous run with warmup/cooldown (>= 20 min or >= 3km)
    const warmupDuration = 10 // 10 min warmup
    const cooldownDuration = 5 // 5 min cooldown

    // Calculate warmup/cooldown distances based on easy pace
    // warmupPaceSeconds is sec/km, so distance = duration(min) / (pace(sec/km) / 60)
    const warmupDistanceKm = warmupPaceSeconds > 0
      ? Math.round((warmupDuration / (warmupPaceSeconds / 60)) * 10) / 10
      : 1.5
    const cooldownDistanceKm = warmupPaceSeconds > 0
      ? Math.round((cooldownDuration / (warmupPaceSeconds / 60)) * 10) / 10
      : 0.8

    // Add warmup with calculated distance
    segments.push({
      order: segmentOrder++,
      type: 'warmup',
      duration: warmupDuration,
      distance: warmupDistanceKm,
      pace: warmupPaceSeconds.toString(),
      zone: 2,
      description: `Uppvärmning ${warmupDistanceKm} km @ ${warmupPaceStr}`,
    })

    // Main work segment - use the FULL template distance (don't subtract warmup/cooldown)
    // The template distance IS the main workout, warmup/cooldown are ADDITIONAL
    const mainDuration = distanceKm
      ? undefined // Use distance instead of duration
      : Math.max(workout.duration - warmupDuration - cooldownDuration, 10)

    // Use template distance directly for main work
    const mainDistance = distanceKm

    // For easy/long runs, provide pace range
    if (workout.intensity === 'easy' && distanceKm && distanceKm > 8) {
      const easyMinSeconds = parsePaceToSeconds(elitePaces.daniels.easy.minPace)

      segments.push({
        order: segmentOrder++,
        type: 'work',
        distance: mainDistance,
        duration: mainDuration,
        pace: easyMinSeconds.toString(), // Use slower pace as target
        zone: 1,
        description: `Huvudpass ${mainDistance ? mainDistance.toFixed(1) + ' km' : mainDuration + ' min'} @ ${elitePaces.daniels.easy.minPace}-${elitePaces.daniels.easy.maxPace}`,
      })
    } else {
      segments.push({
        order: segmentOrder++,
        type: 'work',
        distance: mainDistance,
        duration: mainDuration,
        pace: mainPaceSeconds.toString(),
        zone: mainZone,
        description: `Huvudpass ${mainDistance ? mainDistance.toFixed(1) + ' km' : mainDuration + ' min'} @ ${mainPaceStr}`,
      })
    }

    // Add cooldown with calculated distance
    segments.push({
      order: segmentOrder++,
      type: 'cooldown',
      duration: cooldownDuration,
      distance: cooldownDistanceKm,
      pace: warmupPaceSeconds.toString(),
      zone: 2,
      description: `Nedvarvning ${cooldownDistanceKm} km @ ${warmupPaceStr}`,
    })
  } else {
    // Short runs (< 20 min and < 3km) - single work segment
    segments.push({
      order: segmentOrder++,
      type: 'work',
      duration: workout.duration,
      distance: distanceKm,
      pace: mainPaceSeconds.toString(),
      zone: mainZone,
      description: workout.name,
    })
  }

  return segments
}

/**
 * Get pace string based on workout intensity
 */
function getWorkoutPace(intensity: string, elitePaces: EliteZonePaces): string {
  switch (intensity) {
    case 'easy':
      return elitePaces.core.easy
    case 'moderate':
      return elitePaces.core.marathon // Marathon pace for moderate efforts
    case 'hard':
      return elitePaces.core.threshold // Threshold/LT2 pace for hard efforts
    case 'race_pace':
      return elitePaces.core.interval // Interval pace for race-pace efforts
    default:
      return elitePaces.core.easy
  }
}

/**
 * Get training zone based on workout intensity
 */
function getWorkoutZone(intensity: string): number {
  switch (intensity) {
    case 'easy':
      return 1
    case 'moderate':
      return 2
    case 'hard':
      return 3
    case 'race_pace':
      return 4
    default:
      return 2
  }
}

// ============================================================================
// STATION WORKOUT SEGMENTS
// ============================================================================

/**
 * HYROX Station Configuration
 * Contains official distances, reps, weights, and technique cues for each station
 */
interface StationConfig {
  id: string
  name: string
  nameSv: string
  distance?: number        // meters (for SkiErg, Rowing, Sled Push/Pull, etc.)
  reps?: number           // repetitions (for Wall Balls)
  weightOpen: {
    male: number | string
    female: number | string
  }
  weightPro: {
    male: number | string
    female: number | string
  }
  technique: string
  techniqueSv: string
  targetTimeElite: { min: number; max: number }  // seconds
  targetTimeIntermediate: { min: number; max: number }
}

const HYROX_STATIONS: StationConfig[] = [
  {
    id: 'skierg',
    name: 'SkiErg',
    nameSv: 'SkiErg',
    distance: 1000,
    weightOpen: { male: 'Damper 6', female: 'Damper 5' },
    weightPro: { male: 'Damper 7', female: 'Damper 6' },
    technique: 'Long arm movement, drive from core, hinge at hips',
    techniqueSv: 'Lång armrörelse, driv från core, höftled',
    targetTimeElite: { min: 210, max: 225 },
    targetTimeIntermediate: { min: 255, max: 285 },
  },
  {
    id: 'sled_push',
    name: 'Sled Push',
    nameSv: 'Släde Push',
    distance: 50,
    weightOpen: { male: 152, female: 102 },
    weightPro: { male: 202, female: 152 },
    technique: 'Low body position, short steps, drive through legs',
    techniqueSv: 'Låg kroppsposition, korta steg, driv genom benen',
    targetTimeElite: { min: 150, max: 170 },
    targetTimeIntermediate: { min: 225, max: 270 },
  },
  {
    id: 'sled_pull',
    name: 'Sled Pull',
    nameSv: 'Släde Pull',
    distance: 50,
    weightOpen: { male: 103, female: 78 },
    weightPro: { male: 153, female: 103 },
    technique: 'Hand-over-hand technique, sit back, engage lats',
    techniqueSv: 'Hand-över-hand teknik, sitt bakåt, aktivera latsen',
    targetTimeElite: { min: 180, max: 200 },
    targetTimeIntermediate: { min: 330, max: 390 },
  },
  {
    id: 'burpee_broad_jump',
    name: 'Burpee Broad Jump',
    nameSv: 'Burpee Längdhopp',
    distance: 80,
    weightOpen: { male: '-', female: '-' },
    weightPro: { male: '-', female: '-' },
    technique: 'Efficient jumps, minimize time on ground, steady pace',
    techniqueSv: 'Effektiva hopp, minimera tid på marken, jämn takt',
    targetTimeElite: { min: 140, max: 160 },
    targetTimeIntermediate: { min: 300, max: 360 },
  },
  {
    id: 'rowing',
    name: 'Rowing',
    nameSv: 'Rodd',
    distance: 1000,
    weightOpen: { male: 'Damper 6', female: 'Damper 5' },
    weightPro: { male: 'Damper 7', female: 'Damper 6' },
    technique: 'Drive with legs first, long stroke finish, controlled recovery',
    techniqueSv: 'Driv med benen först, lång avslutning, kontrollerad återhämtning',
    targetTimeElite: { min: 210, max: 225 },
    targetTimeIntermediate: { min: 270, max: 300 },
  },
  {
    id: 'farmers_carry',
    name: 'Farmers Carry',
    nameSv: 'Farmers Carry',
    distance: 200,
    weightOpen: { male: 24, female: 16 },
    weightPro: { male: 32, female: 24 },
    technique: 'Straight back, short quick steps, tight core',
    techniqueSv: 'Rak rygg, korta snabba steg, spänd core',
    targetTimeElite: { min: 75, max: 90 },
    targetTimeIntermediate: { min: 150, max: 180 },
  },
  {
    id: 'sandbag_lunge',
    name: 'Sandbag Lunges',
    nameSv: 'Sandsäck Utfall',
    distance: 100,
    weightOpen: { male: 20, female: 10 },
    weightPro: { male: 30, female: 20 },
    technique: 'Knee to floor, stable core, upright torso',
    techniqueSv: 'Knä till golv, stabil core, upprätt överkropp',
    targetTimeElite: { min: 150, max: 180 },
    targetTimeIntermediate: { min: 300, max: 360 },
  },
  {
    id: 'wall_balls',
    name: 'Wall Balls',
    nameSv: 'Wall Balls',
    reps: 100, // Men Open/Pro get 100, Women get 75
    weightOpen: { male: 6, female: 4 },
    weightPro: { male: 9, female: 6 },
    technique: 'Full squat, high throw, catch and descend in one motion',
    techniqueSv: 'Full knäböj, högt kast, fånga och sjunk i en rörelse',
    targetTimeElite: { min: 180, max: 210 },
    targetTimeIntermediate: { min: 390, max: 480 },
  },
]

/**
 * Create station workout segments with detailed HYROX-specific data
 * Includes warmup, station work with load/reps/target times, and transitions
 */
function createStationSegments(
  workout: HYROXTemplateWorkout,
  division?: 'open' | 'pro' | 'doubles',
  gender?: 'male' | 'female',
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
): CreateWorkoutSegmentDTO[] {
  const segments: CreateWorkoutSegmentDTO[] = []
  let segmentOrder = 1
  const div = division || 'open'
  const gen = gender || 'male'
  const level = experienceLevel || 'intermediate'

  // Determine if this is a full simulation or partial station practice
  const isFullSimulation = workout.type === 'hyrox_simulation' ||
    workout.name.toLowerCase().includes('simulering') ||
    workout.name.toLowerCase().includes('simulation')

  // Parse which stations to include from workout structure or description
  const stationsToInclude = parseStationsFromWorkout(workout)

  // Add warmup segment
  segments.push({
    order: segmentOrder++,
    type: 'warmup',
    duration: isFullSimulation ? 15 : 10,
    zone: 2,
    description: isFullSimulation
      ? 'Uppvärmning: 5 min rodd/SkiErg, dynamisk stretch, aktivering'
      : 'Uppvärmning: 5 min lätt cardio, rörlighet',
  })

  if (isFullSimulation) {
    // Full HYROX simulation: 8 runs + 8 stations
    const runDistanceKm = 1 // Standard 1km per run segment

    for (let i = 0; i < 8; i++) {
      const station = HYROX_STATIONS[i]
      const runNumber = i + 1
      const isDoublesPartnerA = div === 'doubles' && runNumber % 2 === 1
      const isDoublesPartnerB = div === 'doubles' && runNumber % 2 === 0

      // Running segment
      const partnerRunNote = div === 'doubles'
        ? ` (Partner ${isDoublesPartnerA ? 'A' : 'B'})`
        : ''

      segments.push({
        order: segmentOrder++,
        type: 'interval',
        distance: runDistanceKm,
        zone: 3,
        description: `Löpning ${runNumber}/8: 1 km${partnerRunNote}`,
      })

      // Roxzone/Transition segment
      segments.push({
        order: segmentOrder++,
        type: 'rest',
        duration: 1, // ~45-60 seconds transition
        zone: 1,
        description: `Roxzone ${runNumber}: Övergång till ${station.nameSv}`,
      })

      // Station segment
      const weight = div === 'pro' ? station.weightPro[gen] : station.weightOpen[gen]
      const targetTime = level === 'advanced' || level === 'intermediate'
        ? station.targetTimeIntermediate
        : station.targetTimeElite
      const repsForWallBalls = station.id === 'wall_balls'
        ? (gen === 'female' ? 75 : 100)
        : undefined

      // Partner alternation for station work in doubles
      const partnerStationNote = div === 'doubles'
        ? ` - Partner ${isDoublesPartnerB ? 'A' : 'B'} (byte vid halva)`
        : ''

      const stationDescription = station.distance
        ? `${station.nameSv} ${station.distance}m @ ${typeof weight === 'number' ? weight + 'kg' : weight}${partnerStationNote}`
        : `${station.nameSv} ${repsForWallBalls} reps @ ${weight}kg${partnerStationNote}`

      segments.push({
        order: segmentOrder++,
        type: 'work',
        duration: Math.round(targetTime.max / 60), // Approximate duration in minutes
        distance: station.distance ? station.distance / 1000 : undefined,
        reps: repsForWallBalls,
        zone: 4,
        description: stationDescription,
        notes: station.techniqueSv,
      })
    }
  } else {
    // Partial station practice - use specific stations from workout
    const selectedStations = stationsToInclude.length > 0
      ? HYROX_STATIONS.filter(s => stationsToInclude.includes(s.id))
      : HYROX_STATIONS.slice(0, 4) // Default: first 4 stations

    // Determine number of rounds from workout structure
    const rounds = parseRoundsFromWorkout(workout)

    for (let round = 1; round <= rounds; round++) {
      if (rounds > 1) {
        segments.push({
          order: segmentOrder++,
          type: 'work',
          duration: 0,
          zone: 3,
          description: `--- Runda ${round}/${rounds} ---`,
        })
      }

      for (const station of selectedStations) {
        const weight = div === 'pro' ? station.weightPro[gen] : station.weightOpen[gen]
        const targetTime = level === 'advanced'
          ? station.targetTimeElite
          : station.targetTimeIntermediate

        // Scale distance/reps for practice (usually less than full race)
        const practiceDistance = station.distance ? Math.round(station.distance * 0.5) : undefined
        const practiceReps = station.reps ? Math.round(station.reps * 0.5) : undefined

        // Partner note for doubles
        const partnerNote = div === 'doubles'
          ? ` (Partner ${round % 2 === 1 ? 'A' : 'B'})`
          : ''

        const description = practiceDistance
          ? `${station.nameSv} ${practiceDistance}m @ ${typeof weight === 'number' ? weight + 'kg' : weight}${partnerNote}`
          : `${station.nameSv} ${practiceReps} reps @ ${weight}kg${partnerNote}`

        segments.push({
          order: segmentOrder++,
          type: 'work',
          duration: Math.round((targetTime.max * 0.5) / 60), // Scaled duration
          distance: practiceDistance ? practiceDistance / 1000 : undefined,
          reps: practiceReps,
          zone: 3,
          description,
          notes: station.techniqueSv,
        })

        // Rest between stations (not after last station in round)
        if (selectedStations.indexOf(station) < selectedStations.length - 1) {
          segments.push({
            order: segmentOrder++,
            type: 'rest',
            duration: 1,
            zone: 1,
            description: 'Vila/övergång mellan stationer',
          })
        }
      }

      // Rest between rounds
      if (round < rounds) {
        segments.push({
          order: segmentOrder++,
          type: 'rest',
          duration: 2,
          zone: 1,
          description: `Vila mellan rundor: 2 min`,
        })
      }
    }
  }

  // Add cooldown segment
  segments.push({
    order: segmentOrder++,
    type: 'cooldown',
    duration: 5,
    zone: 1,
    description: 'Nedvarvning: lätt stretch och rörlighet',
  })

  return segments
}

/**
 * Parse station IDs from workout structure/description
 */
function parseStationsFromWorkout(workout: HYROXTemplateWorkout): string[] {
  const text = `${workout.name} ${workout.description || ''} ${workout.structure || ''}`.toLowerCase()
  const stations: string[] = []

  const stationKeywords: Record<string, string> = {
    'skierg': 'skierg',
    'ski erg': 'skierg',
    'sled push': 'sled_push',
    'släde push': 'sled_push',
    'sled pull': 'sled_pull',
    'släde pull': 'sled_pull',
    'burpee': 'burpee_broad_jump',
    'bred hopp': 'burpee_broad_jump',
    'rowing': 'rowing',
    'rodd': 'rowing',
    'farmers carry': 'farmers_carry',
    'farmer': 'farmers_carry',
    'sandbag': 'sandbag_lunge',
    'sandsäck': 'sandbag_lunge',
    'lunge': 'sandbag_lunge',
    'utfall': 'sandbag_lunge',
    'wall ball': 'wall_balls',
    'wallball': 'wall_balls',
  }

  for (const [keyword, stationId] of Object.entries(stationKeywords)) {
    if (text.includes(keyword) && !stations.includes(stationId)) {
      stations.push(stationId)
    }
  }

  return stations
}

/**
 * Parse number of rounds from workout structure
 */
function parseRoundsFromWorkout(workout: HYROXTemplateWorkout): number {
  const text = `${workout.structure || ''} ${workout.description || ''}`.toLowerCase()

  // Look for patterns like "3 rundor", "3 rounds", "3x"
  const roundMatch = text.match(/(\d+)\s*(rundor|rounds|x\s)/i)
  if (roundMatch) {
    return parseInt(roundMatch[1])
  }

  // Default based on duration
  if (workout.duration >= 60) return 3
  if (workout.duration >= 40) return 2
  return 1
}

// ============================================================================
// STRENGTH WORKOUT GENERATION
// ============================================================================

/**
 * Map running phase to strength phase
 */
function mapRunningPhaseToStrengthPhase(
  phase: PeriodPhase,
  weekInPhase: number,
  totalWeeksInPhase: number
): StrengthPhase {
  switch (phase) {
    case 'BASE':
      // First half of base = AA, second half = Max Strength
      return weekInPhase <= totalWeeksInPhase / 2 ? 'ANATOMICAL_ADAPTATION' : 'MAXIMUM_STRENGTH'
    case 'BUILD':
      return 'MAXIMUM_STRENGTH'
    case 'PEAK':
      // First part = Power, then Maintenance
      return weekInPhase <= 3 ? 'POWER' : 'MAINTENANCE'
    case 'TAPER':
      return 'TAPER'
    case 'RECOVERY':
      return 'ANATOMICAL_ADAPTATION'
    default:
      return 'MAINTENANCE'
  }
}

/**
 * Create a HYROX strength workout from template
 */
function createHyroxStrengthWorkout(
  strengthPhase: StrengthPhase,
  sessionType: 'lower' | 'upper' | 'full_body' | 'power' | 'station_specific',
  strengthPRs: StrengthPRs,
  weakStations?: HyroxStation[]
): CreateWorkoutDTO {
  const session = generateHyroxStrengthSession(
    strengthPhase,
    sessionType,
    strengthPRs,
    weakStations
  )

  // Build instructions with warmup and exercises
  const instructions: string[] = []

  // Warmup section
  instructions.push('=== UPPVÄRMNING ===')
  instructions.push(`${session.warmup.generalCardio.exerciseSv} - ${session.warmup.generalCardio.durationMinutes} min`)
  instructions.push('')
  instructions.push('Aktiveringsövningar:')
  for (const activation of session.warmup.activation) {
    instructions.push(`• ${activation.exerciseSv}: ${activation.sets}×${activation.reps}`)
  }

  if (session.warmup.rampUpSets && session.warmup.rampUpSets.length > 0) {
    instructions.push('')
    instructions.push('Uppvärmningsset (för huvudövningen):')
    for (const rampUp of session.warmup.rampUpSets) {
      instructions.push(`• ${rampUp.reps} reps @ ${rampUp.percentOf1RM}%`)
    }
  }

  // Main workout section
  instructions.push('')
  instructions.push('=== HUVUDPASS ===')

  for (const exercise of session.mainWorkout) {
    const workingWeight = exercise.percentOf1RM
      ? calculateWorkingWeight(exercise.id, exercise.percentOf1RM, strengthPRs)
      : null

    const repStr = typeof exercise.reps === 'number' ? exercise.reps : exercise.reps
    const restStr = exercise.restSeconds >= 60
      ? `${Math.round(exercise.restSeconds / 60)} min`
      : `${exercise.restSeconds}s`

    let exerciseLine = `${exercise.nameSv}: ${exercise.sets}×${repStr}`

    if (exercise.percentOf1RM && workingWeight) {
      exerciseLine += ` @ ${exercise.percentOf1RM}% (${workingWeight}kg)`
    } else if (exercise.percentOf1RM) {
      exerciseLine += ` @ ${exercise.percentOf1RM}%`
    }

    exerciseLine += ` - Vila ${restStr}`

    if (exercise.tempo) {
      exerciseLine += ` [Tempo: ${exercise.tempo}]`
    }

    instructions.push(`• ${exerciseLine}`)

    if (exercise.notesSv) {
      instructions.push(`  → ${exercise.notesSv}`)
    }
  }

  // Finisher section
  if (session.finisher) {
    instructions.push('')
    instructions.push(`=== AVSLUTNING: ${session.finisher.nameSv} ===`)
    instructions.push(`Format: ${session.finisher.format}`)
    for (const ex of session.finisher.exercises) {
      instructions.push(`• ${ex.exerciseSv}: ${ex.reps}`)
    }
  }

  // Create workout segments for strength exercises
  const segments: CreateWorkoutSegmentDTO[] = session.mainWorkout.map((exercise, index) => {
    const workingWeight = exercise.percentOf1RM
      ? calculateWorkingWeight(exercise.id, exercise.percentOf1RM, strengthPRs)
      : null

    return {
      order: index + 1,
      type: 'work',
      description: exercise.nameSv,
      duration: Math.round((exercise.sets * (typeof exercise.reps === 'number' ? exercise.reps * 3 : 30) + exercise.restSeconds * (exercise.sets - 1)) / 60),
      // Store strength-specific data in description
    }
  })

  return {
    type: 'STRENGTH',
    name: session.nameSv,
    description: `${getStrengthPhaseNameSv(strengthPhase)} - HYROX styrkepass`,
    intensity: strengthPhase === 'ANATOMICAL_ADAPTATION' ? 'MODERATE' :
               strengthPhase === 'MAXIMUM_STRENGTH' ? 'THRESHOLD' :
               strengthPhase === 'POWER' ? 'INTERVAL' : 'MODERATE',
    duration: session.durationMinutes,
    instructions: instructions.join('\n'),
    segments,
  }
}

/**
 * Get Swedish name for strength phase
 */
function getStrengthPhaseNameSv(phase: StrengthPhase): string {
  const names: Record<StrengthPhase, string> = {
    ANATOMICAL_ADAPTATION: 'Anatomisk anpassning',
    MAXIMUM_STRENGTH: 'Maxstyrka',
    POWER: 'Kraft',
    MAINTENANCE: 'Underhåll',
    TAPER: 'Taper',
  }
  return names[phase] || phase
}

/**
 * Add strength workouts to program weeks
 */
export function addStrengthWorkoutsToProgram(
  weeks: NonNullable<CreateTrainingProgramDTO['weeks']>,
  strengthSessionsPerWeek: number,
  strengthPRs: StrengthPRs,
  weakStations?: string[]
): void {
  if (strengthSessionsPerWeek < 1 || !weeks || weeks.length === 0) return

  const typedWeakStations = (weakStations || []) as HyroxStation[]

  // Track phase progression
  let currentRunningPhase: PeriodPhase = 'BASE'
  let weeksInPhase = 0
  let totalWeeksInPhase = 4

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]

    // Update phase tracking
    if (week.phase !== currentRunningPhase) {
      currentRunningPhase = week.phase as PeriodPhase
      weeksInPhase = 0
      // Estimate total weeks in this phase (look ahead)
      totalWeeksInPhase = weeks.filter(w => w.phase === currentRunningPhase).length
    }
    weeksInPhase++

    // Determine strength phase for this week
    const strengthPhase = mapRunningPhaseToStrengthPhase(
      currentRunningPhase,
      weeksInPhase,
      totalWeeksInPhase
    )

    // Find suitable days for strength training (avoid back-to-back with hard running)
    const strengthDays = findStrengthTrainingDays(week.days, strengthSessionsPerWeek)

    // Add strength workouts
    for (let i = 0; i < strengthDays.length && i < strengthSessionsPerWeek; i++) {
      const dayIndex = strengthDays[i]
      const day = week.days[dayIndex]

      // Determine session type based on day number and phase
      let sessionType: 'lower' | 'upper' | 'full_body' | 'power' | 'station_specific'

      if (strengthSessionsPerWeek === 1) {
        sessionType = 'full_body'
      } else if (strengthPhase === 'POWER') {
        sessionType = i === 0 ? 'power' : 'station_specific'
      } else if (strengthPhase === 'TAPER') {
        sessionType = 'full_body'
      } else {
        sessionType = i === 0 ? 'lower' : i === 1 ? 'upper' : 'station_specific'
      }

      const strengthWorkout = createHyroxStrengthWorkout(
        strengthPhase,
        sessionType,
        strengthPRs,
        typedWeakStations
      )

      // Add to day's workouts
      day.workouts.push(strengthWorkout)
    }
  }
}

/**
 * Find suitable days for strength training
 * Avoids scheduling on same day as hard running or the day after
 */
function findStrengthTrainingDays(
  days: NonNullable<NonNullable<CreateTrainingProgramDTO['weeks']>[0]['days']>,
  sessionsNeeded: number
): number[] {
  const suitableDays: number[] = []
  const hardRunningDays = new Set<number>()

  // Identify hard running days (intervals, tempo, long runs)
  days.forEach((day, index) => {
    const hasHardRunning = day.workouts.some(
      w => w.type === 'RUNNING' &&
           (w.intensity === 'THRESHOLD' || w.intensity === 'INTERVAL' || w.intensity === 'MAX' ||
            (w.duration && w.duration >= 70)) // Long runs
    )
    if (hasHardRunning) {
      hardRunningDays.add(index)
    }
  })

  // Find suitable days (not hard running day, not day after hard running)
  for (let i = 0; i < days.length; i++) {
    const dayBefore = i > 0 ? i - 1 : 6 // Wrap to previous week's last day
    const isHardDay = hardRunningDays.has(i)
    const isDayAfterHard = hardRunningDays.has(dayBefore)
    const isRestDay = days[i].workouts.length === 0

    // Prefer days that aren't hard running days and aren't the day after hard running
    if (!isHardDay && !isDayAfterHard) {
      suitableDays.push(i)
    }
  }

  // If we don't have enough suitable days, add some less ideal options
  if (suitableDays.length < sessionsNeeded) {
    for (let i = 0; i < days.length; i++) {
      if (!suitableDays.includes(i) && !hardRunningDays.has(i)) {
        suitableDays.push(i)
      }
    }
  }

  // Return the best days, spread out through the week
  const spreadDays: number[] = []
  if (sessionsNeeded === 1) {
    // Single session: prefer Tuesday (1) or Thursday (3)
    const preferred = [1, 3, 5, 2, 4, 0, 6]
    for (const pref of preferred) {
      if (suitableDays.includes(pref)) {
        spreadDays.push(pref)
        break
      }
    }
  } else if (sessionsNeeded === 2) {
    // Two sessions: prefer Tuesday/Friday or Monday/Thursday
    const pairs = [[1, 4], [0, 3], [2, 5]]
    for (const pair of pairs) {
      if (pair.every(d => suitableDays.includes(d))) {
        spreadDays.push(...pair)
        break
      }
    }
    if (spreadDays.length === 0) {
      // Fall back to first two suitable days
      spreadDays.push(...suitableDays.slice(0, 2))
    }
  } else {
    // Three sessions: prefer Monday/Wednesday/Friday or Tuesday/Thursday/Saturday
    const triples = [[0, 2, 4], [1, 3, 5]]
    for (const triple of triples) {
      if (triple.every(d => suitableDays.includes(d))) {
        spreadDays.push(...triple)
        break
      }
    }
    if (spreadDays.length === 0) {
      // Fall back to first three suitable days
      spreadDays.push(...suitableDays.slice(0, 3))
    }
  }

  return spreadDays.sort((a, b) => a - b)
}

// ========================================
// VDOT / PACE CALCULATION HELPERS
// ========================================

/**
 * Parse time string (MM:SS or HH:MM:SS) to minutes
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 60 + parts[1] + parts[2] / 60
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] + parts[1] / 60
  }
  return 0
}

/**
 * Get distance in meters from race distance string
 */
function getDistanceMeters(distance: '5K' | '10K' | 'HALF' | 'MARATHON'): number {
  const distances: Record<string, number> = {
    '5K': 5000,
    '10K': 10000,
    'HALF': 21097.5,
    'MARATHON': 42195,
  }
  return distances[distance] || 0
}

/**
 * Calculate VDOT from wizard race result
 */
function calculateVDOTFromWizardRace(
  distance: '5K' | '10K' | 'HALF' | 'MARATHON',
  timeStr: string
): { vdot: number; paces: DanielsTrainingPaces } | null {
  const distanceMeters = getDistanceMeters(distance)
  const timeMinutes = parseTimeToMinutes(timeStr)

  if (distanceMeters === 0 || timeMinutes <= 0) {
    console.log('[HYROX Generator] Invalid race data for VDOT calculation')
    return null
  }

  const vdot = calculateVDOT(distanceMeters, timeMinutes)
  const paces = getTrainingPaces(vdot)

  console.log(`[HYROX Generator] VDOT calculated: ${vdot}`)
  console.log(`  Distance: ${distance} (${distanceMeters}m)`)
  console.log(`  Time: ${timeStr} (${timeMinutes.toFixed(2)} min)`)

  return { vdot, paces }
}

/**
 * Convert VDOT training paces to EliteZonePaces format
 */
function convertVDOTToEliteZones(vdot: number, paces: DanielsTrainingPaces): EliteZonePaces {
  return {
    legacy: {
      zone1: paces.easy.maxPace,
      zone2: paces.marathon.pace,
      zone3: paces.threshold.pace,
      zone4: paces.interval.pace,
      zone5: paces.repetition.pace,
    },
    daniels: {
      easy: { minPace: paces.easy.minPace, maxPace: paces.easy.maxPace, minKmh: paces.easy.minKmh, maxKmh: paces.easy.maxKmh },
      marathon: { pace: paces.marathon.pace, kmh: paces.marathon.kmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      interval: { pace: paces.interval.pace, kmh: paces.interval.kmh },
      repetition: { pace: paces.repetition.pace, kmh: paces.repetition.kmh },
    },
    canova: {
      fundamental: { pace: paces.easy.maxPace, kmh: paces.easy.maxKmh },
      progressive: { minPace: paces.easy.maxPace, maxPace: paces.marathon.pace },
      marathon: { pace: paces.marathon.pace, kmh: paces.marathon.kmh },
      specific: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      fiveK: { pace: paces.interval.pace, kmh: paces.interval.kmh },
      oneK: { pace: paces.repetition.pace, kmh: paces.repetition.kmh },
    },
    norwegian: {
      green: { minPace: paces.easy.minPace, maxPace: paces.easy.maxPace, minKmh: paces.easy.minKmh, maxKmh: paces.easy.maxKmh },
      threshold: { pace: paces.threshold.pace, kmh: paces.threshold.kmh },
      red: { minPace: paces.interval.pace, maxPace: paces.repetition.pace, minKmh: paces.interval.kmh, maxKmh: paces.repetition.kmh },
    },
    core: {
      easy: paces.easy.maxPace,
      marathon: paces.marathon.pace,
      threshold: paces.threshold.pace,
      interval: paces.interval.pace,
    },
    source: 'VDOT',
    confidence: 'VERY_HIGH',
    athleteLevel: vdot >= 65 ? 'ELITE' : vdot >= 55 ? 'SUB_ELITE' : vdot >= 45 ? 'ADVANCED' : vdot >= 35 ? 'INTERMEDIATE' : 'RECREATIONAL',
  }
}

/**
 * Get Swedish label for athlete type
 */
function getAthleteTypeLabel(athleteType: AthleteType): string {
  const labels: Record<AthleteType, string> = {
    FAST_WEAK: 'Stark löpare / Svaga stationer',
    SLOW_STRONG: 'Svag löpare / Starka stationer',
    BALANCED: 'Balanserad profil',
    NEEDS_BOTH: 'Utvecklingspotential i båda',
  }
  return labels[athleteType]
}

/**
 * Format pace from seconds/km to MM:SS
 */
function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
