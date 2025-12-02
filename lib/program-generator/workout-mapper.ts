// lib/program-generator/workout-mapper.ts
// Maps template workouts to CreateWorkoutDTO format for all sports

import { CreateWorkoutDTO, CreateWorkoutSegmentDTO, WorkoutType, WorkoutIntensity, PeriodPhase } from '@/types'
import { CyclingTemplateWorkout, CyclingTemplateWeek } from './templates/cycling'
import { SkiingTemplateWorkout, SkiingTemplateWeek } from './templates/skiing'
import { SwimmingTemplateWorkout, SwimmingTemplateWeek } from './templates/swimming'
import { TriathlonTemplateWorkout, TriathlonTemplateWeek, TriathlonDiscipline } from './templates/triathlon'
import { HYROXTemplateWorkout, HYROXTemplateWeek, HYROXWorkoutType } from './templates/hyrox'

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

// Cycling workout type → WorkoutType
function mapCyclingType(type: CyclingTemplateWorkout['type']): WorkoutType {
  const mapping: Record<CyclingTemplateWorkout['type'], WorkoutType> = {
    endurance: 'CYCLING',
    tempo: 'CYCLING',
    threshold: 'CYCLING',
    vo2max: 'CYCLING',
    sprint: 'CYCLING',
    recovery: 'RECOVERY',
    sweetspot: 'CYCLING',
  }
  return mapping[type]
}

// Skiing workout type → WorkoutType
function mapSkiingType(type: SkiingTemplateWorkout['type']): WorkoutType {
  const mapping: Record<SkiingTemplateWorkout['type'], WorkoutType> = {
    endurance: 'SKIING',
    tempo: 'SKIING',
    threshold: 'SKIING',
    vo2max: 'SKIING',
    sprint: 'SKIING',
    recovery: 'RECOVERY',
    technique: 'SKIING',
    distance: 'SKIING',
  }
  return mapping[type]
}

// Swimming workout type → WorkoutType
function mapSwimmingType(type: SwimmingTemplateWorkout['type']): WorkoutType {
  const mapping: Record<SwimmingTemplateWorkout['type'], WorkoutType> = {
    endurance: 'SWIMMING',
    threshold: 'SWIMMING',
    vo2max: 'SWIMMING',
    sprint: 'SWIMMING',
    recovery: 'RECOVERY',
    technique: 'SWIMMING',
    openwater: 'SWIMMING',
  }
  return mapping[type]
}

// Triathlon discipline → WorkoutType
function mapTriathlonDiscipline(discipline: TriathlonDiscipline): WorkoutType {
  const mapping: Record<TriathlonDiscipline, WorkoutType> = {
    swim: 'SWIMMING',
    bike: 'CYCLING',
    run: 'RUNNING',
    brick: 'TRIATHLON',
    strength: 'STRENGTH',
    rest: 'RECOVERY',
  }
  return mapping[discipline]
}

// HYROX workout type → WorkoutType
function mapHyroxType(type: HYROXWorkoutType): WorkoutType {
  const mapping: Record<HYROXWorkoutType, WorkoutType> = {
    running: 'RUNNING',
    strength: 'STRENGTH',
    station_practice: 'HYROX',
    hyrox_simulation: 'HYROX',
    interval: 'RUNNING',
    endurance: 'RUNNING',
    recovery: 'RECOVERY',
    mixed: 'HYROX',
  }
  return mapping[type]
}

// Power zone → WorkoutIntensity
function mapPowerZoneToIntensity(zone: number): WorkoutIntensity {
  if (zone <= 1) return 'RECOVERY'
  if (zone === 2) return 'EASY'
  if (zone === 3) return 'MODERATE'
  if (zone === 4) return 'THRESHOLD'
  if (zone === 5) return 'INTERVAL'
  return 'MAX'
}

// Generic intensity string → WorkoutIntensity
function mapIntensityString(intensity: 'easy' | 'moderate' | 'hard' | 'race_pace'): WorkoutIntensity {
  const mapping: Record<string, WorkoutIntensity> = {
    easy: 'EASY',
    moderate: 'MODERATE',
    hard: 'THRESHOLD',
    race_pace: 'INTERVAL',
  }
  return mapping[intensity] || 'MODERATE'
}

// ============================================================================
// CYCLING MAPPER
// ============================================================================

export function mapCyclingWorkoutToDTO(
  workout: CyclingTemplateWorkout,
  ftp?: number
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Create main workout segment
  segments.push({
    order: 1,
    type: 'work',
    duration: workout.duration,
    zone: workout.powerZone,
    power: ftp ? Math.round(ftp * getPowerZonePercentage(workout.powerZone)) : undefined,
    description: workout.structure || workout.description,
  })

  return {
    type: mapCyclingType(workout.type),
    name: workout.name,
    description: workout.description,
    intensity: mapPowerZoneToIntensity(workout.powerZone),
    duration: workout.duration,
    instructions: workout.structure,
    segments,
  }
}

export function mapCyclingWeekToWorkouts(
  week: CyclingTemplateWeek,
  ftp?: number
): CreateWorkoutDTO[] {
  return week.keyWorkouts.map(w => mapCyclingWorkoutToDTO(w, ftp))
}

function getPowerZonePercentage(zone: number): number {
  const percentages: Record<number, number> = {
    1: 0.50, // Recovery
    2: 0.65, // Endurance
    3: 0.82, // Tempo
    4: 0.95, // Threshold
    5: 1.10, // VO2max
    6: 1.30, // Anaerobic
    7: 1.50, // Neuromuscular
  }
  return percentages[zone] || 0.75
}

// ============================================================================
// SKIING MAPPER
// ============================================================================

export function mapSkiingWorkoutToDTO(
  workout: SkiingTemplateWorkout
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Create main workout segment
  segments.push({
    order: 1,
    type: 'work',
    duration: workout.duration,
    zone: workout.paceZone,
    description: `${workout.description}${workout.technique !== 'any' ? ` (${workout.technique === 'classic' ? 'Klassisk' : workout.technique === 'skating' ? 'Skating' : 'Valfritt'})` : ''}`,
    notes: workout.surface !== 'any' ? `Underlag: ${workout.surface === 'snow' ? 'Snö' : workout.surface === 'roller_ski' ? 'Rullskidor' : 'Löpning'}` : undefined,
  })

  return {
    type: mapSkiingType(workout.type),
    name: workout.name,
    description: workout.description,
    intensity: mapPowerZoneToIntensity(workout.paceZone),
    duration: workout.duration,
    instructions: workout.structure,
    segments,
  }
}

export function mapSkiingWeekToWorkouts(
  week: SkiingTemplateWeek
): CreateWorkoutDTO[] {
  return week.keyWorkouts.map(w => mapSkiingWorkoutToDTO(w))
}

// ============================================================================
// SWIMMING MAPPER
// ============================================================================

export function mapSwimmingWorkoutToDTO(
  workout: SwimmingTemplateWorkout,
  cssSeconds?: number // CSS in seconds per 100m
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Create main workout segment
  segments.push({
    order: 1,
    type: 'work',
    duration: workout.duration,
    distance: workout.distance,
    zone: workout.swimZone,
    pace: cssSeconds ? formatCssPace(cssSeconds, workout.swimZone) : undefined,
    description: workout.structure || workout.description,
    notes: workout.strokeFocus ? `Simtag: ${mapStrokeFocus(workout.strokeFocus)}` : undefined,
  })

  return {
    type: mapSwimmingType(workout.type),
    name: workout.name,
    description: workout.description,
    intensity: mapPowerZoneToIntensity(workout.swimZone),
    duration: workout.duration,
    distance: workout.distance,
    instructions: workout.structure,
    segments,
  }
}

export function mapSwimmingWeekToWorkouts(
  week: SwimmingTemplateWeek,
  cssSeconds?: number
): CreateWorkoutDTO[] {
  return week.keyWorkouts.map(w => mapSwimmingWorkoutToDTO(w, cssSeconds))
}

function formatCssPace(cssSeconds: number, zone: number): string {
  // Adjust CSS based on zone
  const zoneMultipliers: Record<number, number> = {
    1: 1.15, // Recovery - 15% slower
    2: 1.07, // Endurance - 7% slower
    3: 1.00, // CSS zone
    4: 0.95, // VO2max - 5% faster
    5: 0.88, // Sprint - 12% faster
  }
  const adjustedSeconds = Math.round(cssSeconds * (zoneMultipliers[zone] || 1))
  const minutes = Math.floor(adjustedSeconds / 60)
  const seconds = adjustedSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}/100m`
}

function mapStrokeFocus(stroke: string): string {
  const mapping: Record<string, string> = {
    freestyle: 'Crawl',
    backstroke: 'Ryggsim',
    breaststroke: 'Bröstsim',
    butterfly: 'Fjärilsim',
    im: 'Medley',
    mixed: 'Blandat',
  }
  return mapping[stroke] || stroke
}

// ============================================================================
// TRIATHLON MAPPER
// ============================================================================

export function mapTriathlonWorkoutToDTO(
  workout: TriathlonTemplateWorkout
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Create segment based on discipline
  if (workout.swimDistance) {
    segments.push({
      order: 1,
      type: 'work',
      duration: workout.duration,
      distance: workout.swimDistance,
      description: `Simning: ${workout.swimDistance}m`,
    })
  }

  if (workout.bikeDistance) {
    segments.push({
      order: segments.length + 1,
      type: 'work',
      duration: workout.duration,
      distance: workout.bikeDistance * 1000, // km to m
      description: `Cykling: ${workout.bikeDistance}km`,
    })
  }

  if (workout.runDistance) {
    segments.push({
      order: segments.length + 1,
      type: 'work',
      duration: workout.duration,
      distance: workout.runDistance * 1000, // km to m
      description: `Löpning: ${workout.runDistance}km`,
    })
  }

  // If no specific distances, add a generic segment
  if (segments.length === 0) {
    segments.push({
      order: 1,
      type: 'work',
      duration: workout.duration,
      description: workout.structure || workout.description,
    })
  }

  return {
    type: mapTriathlonDiscipline(workout.discipline),
    name: workout.name,
    description: workout.description,
    intensity: mapIntensityString(workout.intensity),
    duration: workout.duration,
    instructions: workout.structure,
    segments,
  }
}

export function mapTriathlonWeekToWorkouts(
  week: TriathlonTemplateWeek
): CreateWorkoutDTO[] {
  return week.keyWorkouts.map(w => mapTriathlonWorkoutToDTO(w))
}

// ============================================================================
// HYROX MAPPER
// ============================================================================

export function mapHyroxWorkoutToDTO(
  workout: HYROXTemplateWorkout
): CreateWorkoutDTO {
  const segments: CreateWorkoutSegmentDTO[] = []

  // Add running segment if applicable
  if (workout.runningDistance) {
    segments.push({
      order: 1,
      type: 'work',
      distance: workout.runningDistance,
      duration: Math.round(workout.runningDistance / 1000 * 5), // ~5 min/km estimate
      description: `Löpning: ${workout.runningDistance / 1000}km`,
    })
  }

  // Add station segments if applicable
  if (workout.stations && workout.stations.length > 0) {
    workout.stations.forEach((station, index) => {
      segments.push({
        order: segments.length + 1,
        type: 'work',
        description: `Station: ${mapHyroxStation(station)}`,
      })
    })
  }

  // If no specific segments, add a generic one
  if (segments.length === 0) {
    segments.push({
      order: 1,
      type: 'work',
      duration: workout.duration,
      description: workout.structure || workout.description,
    })
  }

  return {
    type: mapHyroxType(workout.type),
    name: workout.name,
    description: workout.description,
    intensity: mapIntensityString(workout.intensity),
    duration: workout.duration,
    instructions: workout.structure,
    segments,
  }
}

export function mapHyroxWeekToWorkouts(
  week: HYROXTemplateWeek
): CreateWorkoutDTO[] {
  const workouts: CreateWorkoutDTO[] = []

  week.days.forEach(day => {
    if (!day.isRestDay) {
      day.workouts.forEach(w => {
        workouts.push(mapHyroxWorkoutToDTO(w))
      })
    }
  })

  return workouts
}

function mapHyroxStation(station: string): string {
  const mapping: Record<string, string> = {
    skierg: 'SkiErg 1000m',
    sled_push: 'Släde Push 50m',
    sled_pull: 'Släde Pull 50m',
    burpee_broad_jump: 'Burpee Broad Jump 80m',
    rowing: 'Rodd 1000m',
    farmers_carry: 'Farmers Carry 200m',
    sandbag_lunge: 'Sandbag Lunges 100m',
    wall_balls: 'Wall Balls 75-100 reps',
  }
  return mapping[station] || station
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Distribute workouts across a week's days
 * @param workouts List of workouts to distribute
 * @param daysPerWeek Number of training days (4-6)
 * @returns Array of days with workouts assigned
 */
export function distributeWorkoutsAcrossWeek(
  workouts: CreateWorkoutDTO[],
  daysPerWeek: number = 5
): { dayNumber: number; notes: string; workouts: CreateWorkoutDTO[] }[] {
  const days: { dayNumber: number; notes: string; workouts: CreateWorkoutDTO[] }[] = []

  // Create 7 days
  for (let i = 1; i <= 7; i++) {
    days.push({
      dayNumber: i,
      notes: '',
      workouts: [],
    })
  }

  // Determine training days (spread evenly across the week)
  const trainingDays = getTrainingDays(daysPerWeek)

  // Distribute workouts across training days
  workouts.forEach((workout, index) => {
    const dayIndex = trainingDays[index % trainingDays.length] - 1
    days[dayIndex].workouts.push(workout)
  })

  // Mark rest days
  days.forEach((day, index) => {
    if (!trainingDays.includes(index + 1)) {
      day.notes = 'Vilodag'
    }
  })

  return days
}

function getTrainingDays(daysPerWeek: number): number[] {
  // Common training day patterns
  const patterns: Record<number, number[]> = {
    3: [1, 3, 5],           // Mon, Wed, Fri
    4: [1, 2, 4, 6],        // Mon, Tue, Thu, Sat
    5: [1, 2, 4, 5, 6],     // Mon, Tue, Thu, Fri, Sat
    6: [1, 2, 3, 4, 5, 6],  // Mon-Sat
    7: [1, 2, 3, 4, 5, 6, 7], // Every day
  }
  return patterns[daysPerWeek] || patterns[5]
}

/**
 * Convert phase string to PeriodPhase type
 */
export function mapPhase(phase: string): PeriodPhase {
  const mapping: Record<string, PeriodPhase> = {
    BASE: 'BASE',
    BUILD: 'BUILD',
    PEAK: 'PEAK',
    TAPER: 'TAPER',
    RECOVERY: 'RECOVERY',
    RACE: 'PEAK', // Map RACE to PEAK
    TRANSITION: 'TRANSITION',
  }
  return mapping[phase] || 'BASE'
}
