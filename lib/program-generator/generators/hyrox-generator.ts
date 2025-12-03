// lib/program-generator/generators/hyrox-generator.ts
// HYROX program generator (Functional Fitness Racing)

import { Client, CreateTrainingProgramDTO, CreateWorkoutSegmentDTO, PeriodPhase } from '@/types'
import { HYROX_BEGINNER_12_WEEK, HYROX_INTERMEDIATE_16_WEEK, HYROXTemplateWeek, HYROXTemplateWorkout } from '../templates/hyrox'
import { mapHyroxWeekToWorkouts } from '../workout-mapper'
import { fetchElitePacesServer, validateEliteZones, type EliteZonePaces } from '../elite-pace-integration'

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

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + params.durationWeeks * 7)

  // Fetch elite paces from LT2 test data (if available)
  let elitePaces: EliteZonePaces | null = null
  try {
    console.log('[HYROX Generator] Fetching elite paces for client:', client.id)
    elitePaces = await fetchElitePacesServer(client.id)

    if (elitePaces && validateEliteZones(elitePaces)) {
      console.log('[HYROX Generator] ✓ Elite paces fetched successfully')
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
  const weeks = template.weeks.map((week, index) => {
    const workouts = mapHyroxWeekToWorkouts(week)

    // Create days from template days
    const days = week.days.map((day) => ({
      dayNumber: day.dayNumber,
      notes: day.isRestDay ? 'Vilodag' : '',
      workouts: day.isRestDay ? [] : day.workouts.map(w => ({
        type: mapHyroxWorkoutType(w.type),
        name: w.name,
        description: w.description,
        intensity: mapIntensity(w.intensity),
        duration: w.duration,
        instructions: w.structure,
        segments: createRunningSegments(w, elitePaces),
      })),
    }))

    return {
      weekNumber: week.weekNumber,
      startDate: new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000),
      phase: mapPhase(week.phase),
      volume: 0,
      focus: week.focus,
      days,
    }
  })

  const goalLabels: Record<string, string> = {
    'beginner': 'Nybörjare',
    'intermediate': 'Mellanliggande',
    'pro': 'Pro Division',
    'age-group': 'Age Group',
    'doubles': 'Doubles',
    'custom': 'Anpassad',
  }

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX ${goalLabels[params.goal] || template.name} - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || template.description || 'HYROX-träningsprogram med löpning och funktionella stationer',
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
function mapIntensity(intensity: string): 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX' {
  const mapping: Record<string, 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'> = {
    easy: 'EASY',
    moderate: 'MODERATE',
    hard: 'THRESHOLD',
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
 * Create running segments with pace data based on workout type and intensity
 * Returns empty array for non-running workouts or if no pace data is available
 */
function createRunningSegments(
  workout: HYROXTemplateWorkout,
  elitePaces: EliteZonePaces | null
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

  // Determine main workout pace based on intensity
  const mainPace = getWorkoutPace(workout.intensity, elitePaces)
  const mainZone = getWorkoutZone(workout.intensity)

  // Check if this is an interval workout (has structure with intervals)
  const isIntervalWorkout = workout.structure && (
    workout.structure.includes('x') ||
    workout.structure.includes('×') ||
    workout.structure.includes('intervall') ||
    workout.structure.includes('800m') ||
    workout.structure.includes('1km') ||
    workout.structure.includes('400m')
  )

  if (isIntervalWorkout && workout.structure) {
    // Parse interval structure (e.g., "6x1km", "8x400m", "5x1km med 2 min vila")
    const intervalMatch = workout.structure.match(/(\d+)\s*[x×]\s*(\d+)\s*(km|m)/i)

    if (intervalMatch) {
      const reps = parseInt(intervalMatch[1])
      const distance = parseInt(intervalMatch[2])
      const unit = intervalMatch[3].toLowerCase()
      const distanceKm = unit === 'km' ? distance : distance / 1000

      // Add warmup segment (10-15 min easy) - use slow end of easy pace
      const warmupPace = elitePaces.daniels.easy.minPace
      segments.push({
        order: 1,
        type: 'warmup',
        duration: 10,
        pace: warmupPace,
        zone: 2, // Zone 2 for warmup (aerobic, not recovery)
        description: `Uppvärmning @ ${warmupPace}`,
      })

      // Add interval work segment - force zone 4 for race-pace intervals
      const intervalZone = workout.name.toLowerCase().includes('race') ||
                           workout.structure?.toLowerCase().includes('race') ? 4 : mainZone
      segments.push({
        order: 2,
        type: 'interval',
        distance: distanceKm,
        pace: mainPace,
        zone: intervalZone,
        reps: reps,
        description: `${reps} × ${distance}${unit} @ ${mainPace}`,
      })

      // Add cooldown segment (5-10 min easy) - use slow end of easy pace
      segments.push({
        order: 3,
        type: 'cooldown',
        duration: 5,
        pace: warmupPace,
        zone: 2, // Zone 2 for cooldown
        description: `Nedvarvning @ ${warmupPace}`,
      })
    } else {
      // Generic interval structure - create single work segment
      segments.push({
        order: 1,
        type: 'work',
        duration: workout.duration,
        pace: mainPace,
        zone: mainZone,
        description: `${workout.name} @ ${mainPace}`,
      })
    }
  } else {
    // Continuous run (easy, tempo, long run)
    const distanceKm = workout.runningDistance ? workout.runningDistance / 1000 : undefined

    // For long runs (>8km), add easy pace range
    if (distanceKm && distanceKm > 8 && workout.intensity === 'easy') {
      const easyPaceRange = `${elitePaces.daniels.easy.minPace} - ${elitePaces.daniels.easy.maxPace}`
      segments.push({
        order: 1,
        type: 'work',
        distance: distanceKm,
        pace: easyPaceRange,
        zone: 1,
        description: `Långpass ${distanceKm} km`, // Don't include pace in description, it's in the pace field
      })
    } else {
      segments.push({
        order: 1,
        type: 'work',
        duration: workout.duration,
        distance: distanceKm,
        pace: mainPace,
        zone: mainZone,
        description: workout.name, // Just the name, pace is in the pace field
      })
    }
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
