/**
 * Garmin Training API V2 Client
 *
 * Push structured workouts and schedules to Garmin Connect / watches.
 *
 * Endpoints:
 * - POST /workoutportal/workout/v2           — Create workout
 * - GET  /training-api/workout/v2/{id}       — Retrieve workout
 * - PUT  /training-api/workout/v2/{id}       — Update workout
 * - DELETE /training-api/workout/v2/{id}     — Delete workout
 * - POST /training-api/schedule/             — Create schedule
 * - GET  /training-api/schedule?startDate=&endDate= — Get schedules
 *
 * Rate limits:
 * - Evaluation: 100 calls/min per partner, 200 calls/day per user
 * - Production: 3000 calls/min per partner, 1000 calls/day per user
 */

import 'server-only'

import { getValidGarminAccessToken } from './client'
import { resolveGarminExercise, extractWeightKg } from './exercise-catalog'
import { fetchWithTimeoutAndRetry } from '@/lib/http/fetch'
import { logger } from '@/lib/logger'

const GARMIN_TRAINING_API = 'https://apis.garmin.com/training-api'
const GARMIN_WORKOUT_PORTAL = 'https://apis.garmin.com/workoutportal'

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Garmin Training API v2 DTO Types ────────────────────────────────────────
// Garmin v2 uses nested DTO objects for all enums (sport, step type, condition, target)

export interface GarminSportType {
  sportTypeId: number
  sportTypeKey: string
}

interface GarminStepTypeDTO {
  stepTypeId: number
  stepTypeKey: string
}

interface GarminEndCondition {
  conditionTypeId: number
  conditionTypeKey: string
}

interface GarminTargetTypeDTO {
  workoutTargetTypeId: number
  workoutTargetTypeKey: string
}

type GarminWorkoutStep = Record<string, unknown>
type GarminWorkoutStepUnion = Record<string, unknown>

export interface GarminWorkout {
  workoutId?: string
  workoutName: string
  description?: string
  sport: string
  steps: GarminWorkoutStepUnion[]
}

interface GarminWorkoutIdSource {
  workoutId?: unknown
  id?: unknown
}

export function resolveGarminWorkoutId(workout?: GarminWorkoutIdSource | null): string | undefined {
  const id = workout?.workoutId ?? workout?.id
  if (id == null) return undefined

  const value = String(id).trim()
  return value.length > 0 ? value : undefined
}

// Garmin sport string values (used at workout level)
const SPORT_STRINGS: Record<string, string> = {
  RUNNING:            'RUNNING',
  CYCLING:            'CYCLING',
  LAP_SWIMMING:       'LAP_SWIMMING',
  STRENGTH_TRAINING:  'STRENGTH_TRAINING',
  CARDIO_TRAINING:    'CARDIO_TRAINING',
  YOGA:               'YOGA',
  PILATES:            'PILATES',
  MULTI_SPORT:        'MULTI_SPORT',
}

// Garmin sportType objects (used at segment level)
const SPORT_TYPE_OBJECTS: Record<string, GarminSportType> = {
  RUNNING:            { sportTypeId: 1, sportTypeKey: 'running' },
  CYCLING:            { sportTypeId: 2, sportTypeKey: 'cycling' },
  LAP_SWIMMING:       { sportTypeId: 3, sportTypeKey: 'swimming' },
  STRENGTH_TRAINING:  { sportTypeId: 5, sportTypeKey: 'strength_training' },
  CARDIO_TRAINING:    { sportTypeId: 6, sportTypeKey: 'cardio_training' },
  YOGA:               { sportTypeId: 7, sportTypeKey: 'yoga' },
  PILATES:            { sportTypeId: 8, sportTypeKey: 'pilates' },
  MULTI_SPORT:        { sportTypeId: 5, sportTypeKey: 'multi_sport' },
}

// Step type mapping
const STEP_TYPES: Record<string, GarminStepTypeDTO> = {
  warmup:   { stepTypeId: 1, stepTypeKey: 'warmup' },
  cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
  interval: { stepTypeId: 3, stepTypeKey: 'interval' },
  recovery: { stepTypeId: 4, stepTypeKey: 'recovery' },
  rest:     { stepTypeId: 5, stepTypeKey: 'rest' },
  steady:   { stepTypeId: 3, stepTypeKey: 'interval' },
}

// End condition (duration) mapping
const END_CONDITIONS: Record<string, GarminEndCondition> = {
  time:       { conditionTypeId: 2, conditionTypeKey: 'time' },
  distance:   { conditionTypeId: 1, conditionTypeKey: 'distance' },
  lap_button: { conditionTypeId: 0, conditionTypeKey: 'lap.button' },
}

// Target type mapping
const TARGET_TYPES: Record<string, GarminTargetTypeDTO> = {
  none:     { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
  power:    { workoutTargetTypeId: 2, workoutTargetTypeKey: 'power.zone' },
  cadence:  { workoutTargetTypeId: 3, workoutTargetTypeKey: 'cadence.zone' },
  hr:       { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  pace:     { workoutTargetTypeId: 6, workoutTargetTypeKey: 'speed.zone' },
}

export interface GarminTargetBounds {
  low?: number
  high?: number
}

export function parseNumberTargetBounds(value?: string | number | null): GarminTargetBounds {
  if (value == null) return {}
  if (typeof value === 'number') return { low: value, high: value }

  const matches = value.match(/\d+(?:\.\d+)?/g)
  if (!matches?.length) return {}

  const first = Number(matches[0])
  if (!Number.isFinite(first)) return {}

  const second = matches[1] != null ? Number(matches[1]) : first
  if (!Number.isFinite(second)) return { low: first, high: first }

  return {
    low: Math.min(first, second),
    high: Math.max(first, second),
  }
}

function paceTokenToMetersPerSecond(token: string): number | undefined {
  const match = token.match(/(\d{1,2}):(\d{2})/)
  if (!match) return undefined

  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const totalSeconds = minutes * 60 + seconds
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return undefined

  // Garmin speed targets are meters/second. Trainomics pace strings are min/km.
  return 1000 / totalSeconds
}

export function parsePaceTargetBounds(value?: string | null): GarminTargetBounds {
  if (!value) return {}

  const tokens = value.match(/\d{1,2}:\d{2}/g)
  if (!tokens?.length) return {}

  const speeds = tokens
    .map(paceTokenToMetersPerSecond)
    .filter((speed): speed is number => speed != null && Number.isFinite(speed))

  if (!speeds.length) return {}

  return {
    low: Math.min(...speeds),
    high: Math.max(...speeds),
  }
}

export interface GarminSchedule {
  workoutId: string
  date?: string       // YYYY-MM-DD
  calendarDate?: string
}

interface GarminSchedulePayload {
  // Garmin's Training API stores workout IDs as numeric (Long) and rejects a
  // string here, so send a number whenever the ID is purely numeric.
  workoutId: number | string
  // The schedule endpoint expects `date` (YYYY-MM-DD), NOT `calendarDate`.
  // Posting `calendarDate` leaves `date` unset and the workout is created on
  // Garmin but never lands on the athlete's calendar/watch.
  date: string
}

function normalizeGarminSchedule(schedule: GarminSchedule): GarminSchedulePayload {
  const date = schedule.calendarDate ?? schedule.date
  if (!date) {
    throw new Error('Garmin schedule date is required')
  }

  const trimmedId = String(schedule.workoutId).trim()
  const numericId = Number(trimmedId)
  const workoutId = trimmedId.length > 0 && Number.isFinite(numericId) && String(numericId) === trimmedId
    ? numericId
    : schedule.workoutId

  return { workoutId, date }
}

// ─── API Helpers ────────────────────────────────────────────────────────────

async function trainingApiRequest<T>(
  clientId: string,
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
  const accessToken = await getValidGarminAccessToken(clientId)
  if (!accessToken) {
    throw new Error('No valid Garmin access token')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }

  const init: RequestInit = { method, headers }
  if (body) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetchWithTimeoutAndRetry(url, init, {
    timeoutMs: 15_000,
    maxAttempts: 2,
  })

  if (response.status === 429) {
    throw new Error('Garmin Training API rate limit exceeded')
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Garmin Training API error: ${response.status} ${error}`)
  }

  // DELETE returns 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// ─── Workout CRUD ───────────────────────────────────────────────────────────

/**
 * Create a workout on Garmin Connect.
 * Returns the created workout with workoutId.
 */
export async function createGarminWorkout(
  clientId: string,
  workout: GarminWorkout
): Promise<GarminWorkout> {
  const result = await trainingApiRequest<GarminWorkout>(
    clientId,
    `${GARMIN_TRAINING_API}/workout`,
    'POST',
    workout
  )
  logger.info('Created Garmin workout', { clientId, workoutId: result.workoutId })
  return result
}

/**
 * Retrieve a workout from Garmin Connect.
 */
export async function getGarminWorkout(
  clientId: string,
  workoutId: string
): Promise<GarminWorkout> {
  return trainingApiRequest<GarminWorkout>(
    clientId,
    `${GARMIN_TRAINING_API}/workout/v2/${workoutId}`,
    'GET'
  )
}

/**
 * Update a workout on Garmin Connect.
 */
export async function updateGarminWorkout(
  clientId: string,
  workoutId: string,
  workout: GarminWorkout
): Promise<GarminWorkout> {
  const result = await trainingApiRequest<GarminWorkout>(
    clientId,
    `${GARMIN_TRAINING_API}/workout/v2/${workoutId}`,
    'PUT',
    workout
  )
  logger.info('Updated Garmin workout', { clientId, workoutId })
  return result
}

/**
 * Delete a workout from Garmin Connect.
 */
export async function deleteGarminWorkout(
  clientId: string,
  workoutId: string
): Promise<void> {
  await trainingApiRequest<void>(
    clientId,
    `${GARMIN_TRAINING_API}/workout/v2/${workoutId}`,
    'DELETE'
  )
  logger.info('Deleted Garmin workout', { clientId, workoutId })
}

// ─── Schedule ───────────────────────────────────────────────────────────────

/**
 * Schedule a workout on a specific date in the athlete's Garmin Connect calendar.
 */
export async function scheduleGarminWorkout(
  clientId: string,
  schedule: GarminSchedule
): Promise<GarminSchedule> {
  const payload = normalizeGarminSchedule(schedule)
  const result = await trainingApiRequest<GarminSchedule>(
    clientId,
    `${GARMIN_TRAINING_API}/schedule/`,
    'POST',
    payload
  )
  logger.info('Scheduled Garmin workout', { clientId, workoutId: payload.workoutId, date: payload.date })
  return result
}

/**
 * Get scheduled workouts in a date range.
 */
export async function getGarminSchedules(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<GarminSchedule[]> {
  return trainingApiRequest<GarminSchedule[]>(
    clientId,
    `${GARMIN_TRAINING_API}/schedule?startDate=${startDate}&endDate=${endDate}`,
    'GET'
  )
}

// ─── Trainomics → Garmin Serializer ─────────────────────────────────────────

/**
 * Map Trainomics sport type to Garmin sport type
 */
const SPORT_TYPE_MAP: Record<string, string> = {
  RUNNING: 'RUNNING',
  CYCLING: 'CYCLING',
  SWIMMING: 'LAP_SWIMMING',
  STRENGTH: 'STRENGTH_TRAINING',
  RECOVERY: 'YOGA',
  CROSS_TRAINING: 'CARDIO_TRAINING',
  SKIING: 'CARDIO_TRAINING',
  HYROX: 'CARDIO_TRAINING',
  GENERAL_FITNESS: 'CARDIO_TRAINING',
  TRIATHLON: 'MULTI_SPORT',
  OTHER: 'CARDIO_TRAINING',
}

function getSportString(trainomicsSport: string): string {
  const key = SPORT_TYPE_MAP[trainomicsSport] || 'CARDIO_TRAINING'
  return SPORT_STRINGS[key] || 'CARDIO_TRAINING'
}

// ─── DTO Builders ──────────────────────────────────────────────────────────

// Step type string mapping
const STEP_TYPE_STRINGS: Record<string, string> = {
  warmup: 'WARMUP', cooldown: 'COOLDOWN', interval: 'INTERVAL',
  recovery: 'RECOVERY', rest: 'REST', steady: 'INTERVAL',
}

function buildStep(
  order: number,
  stepType: string,
  opts: {
    durationSeconds?: number
    distanceMeters?: number
    isLapButton?: boolean
    targetType?: string
    targetLow?: number
    targetHigh?: number
    description?: string
    exerciseCategory?: string
    exerciseName?: string
    weightKg?: number
  } = {}
): GarminWorkoutStep {
  // Map step type to intensity
  const INTENSITY_MAP: Record<string, string> = {
    warmup: 'WARMUP', cooldown: 'COOLDOWN', interval: 'INTERVAL',
    recovery: 'REST', rest: 'REST', steady: 'ACTIVE',
  }

  const step: GarminWorkoutStep = {
    type: 'WorkoutStep',
    stepOrder: order,
    stepType: STEP_TYPE_STRINGS[stepType] || 'INTERVAL',
    intensity: INTENSITY_MAP[stepType] || 'INTERVAL',
  }

  // End condition (duration)
  if (opts.isLapButton || (!opts.durationSeconds && !opts.distanceMeters)) {
    step.durationType = 'LAP_BUTTON'
  } else if (opts.durationSeconds && opts.durationSeconds > 0) {
    step.durationType = 'TIME'
    step.durationValue = opts.durationSeconds
  } else if (opts.distanceMeters && opts.distanceMeters > 0) {
    step.durationType = 'DISTANCE'
    step.durationValue = opts.distanceMeters
  }

  // Target
  if (opts.targetType && opts.targetType !== 'none') {
    const targetMap: Record<string, string> = {
      power: 'POWER', cadence: 'CADENCE', hr: 'HEART_RATE', pace: 'SPEED',
    }
    if (targetMap[opts.targetType]) {
      step.targetType = targetMap[opts.targetType]
      if (opts.targetLow != null) step.targetValueOne = opts.targetLow
      if (opts.targetHigh != null) step.targetValueTwo = opts.targetHigh
    }
  }

  // Step description metadata, when supported by Garmin clients.
  if (opts.description) step.description = opts.description

  // Garmin's controlled exercise vocabulary — this is what the watch renders as
  // the exercise name (and uses for rep detection), unlike `description` which
  // the watch ignores. Verified against the live Training API 2026-07-01.
  if (opts.exerciseCategory) step.exerciseCategory = opts.exerciseCategory
  if (opts.exerciseName) step.exerciseName = opts.exerciseName
  if (opts.weightKg != null && opts.weightKg > 0) {
    step.weightValue = opts.weightKg
    step.weightDisplayUnit = 'KILOGRAM'
  }

  return step
}

function buildRepeatGroup(
  order: number,
  iterations: number,
  steps: GarminWorkoutStep[]
): GarminWorkoutStepUnion {
  return {
    type: 'WorkoutRepeatStep',
    stepOrder: order,
    repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',
    repeatValue: iterations,
    numberOfIterations: iterations,
    steps: steps,
  }
}

/**
 * Convert a Trainomics workout to Garmin Training API v2 format.
 */
export function serializeWorkoutToGarmin(workout: {
  name: string
  description?: string
  sportType: string
  segments: Array<{
    type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'steady'
    durationSeconds?: number
    distanceMeters?: number
    repeats?: number
    targetType?: 'pace' | 'hr' | 'power' | 'cadence' | 'none'
    targetLow?: number
    targetHigh?: number
    description?: string
    exerciseCategory?: string
    exerciseName?: string
    weightKg?: number
    steps?: Array<{
      type: 'interval' | 'recovery' | 'rest'
      durationSeconds?: number
      distanceMeters?: number
      durationIsLapButton?: boolean
      targetType?: 'pace' | 'hr' | 'power' | 'cadence' | 'none'
      targetLow?: number
      targetHigh?: number
      description?: string
      exerciseCategory?: string
      exerciseName?: string
      weightKg?: number
    }>
  }>
}): GarminWorkout {
  const sport = getSportString(workout.sportType)
  // Use running (ID 1) as fallback — most universally supported by Garmin
  const sportKey = SPORT_TYPE_MAP[workout.sportType] || 'CARDIO_TRAINING'
  const sportTypeObj: GarminSportType = SPORT_TYPE_OBJECTS[sportKey] || SPORT_TYPE_OBJECTS.RUNNING

  const steps: GarminWorkoutStepUnion[] = []
  let stepOrder = 1

  for (const segment of workout.segments) {
    if (segment.repeats && segment.steps && segment.steps.length > 0) {
      // Repeat block with child steps
      const childSteps = segment.steps.map((step, idx) =>
        buildStep(idx + 1, step.type, {
          durationSeconds: step.durationSeconds,
          distanceMeters: step.distanceMeters,
          isLapButton: step.durationIsLapButton,
          targetType: step.targetType,
          targetLow: step.targetLow,
          targetHigh: step.targetHigh,
          description: step.description,
          exerciseCategory: step.exerciseCategory,
          exerciseName: step.exerciseName,
          weightKg: step.weightKg,
        })
      )
      steps.push(buildRepeatGroup(stepOrder++, segment.repeats, childSteps))
    } else {
      // Single step
      steps.push(
        buildStep(stepOrder++, segment.type, {
          durationSeconds: segment.durationSeconds,
          distanceMeters: segment.distanceMeters,
          targetType: segment.targetType,
          targetLow: segment.targetLow,
          targetHigh: segment.targetHigh,
          description: segment.description,
          exerciseCategory: segment.exerciseCategory,
          exerciseName: segment.exerciseName,
          weightKg: segment.weightKg,
        })
      )
    }
  }

  const result: GarminWorkout = {
    workoutName: workout.name,
    sport,
    steps,
  }
  if (workout.description) result.description = workout.description
  return result
}

// ─── Strength Session → Garmin Serializer ──────────────────────────────────

interface StrengthExercise {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number | string
  weight?: number
  restSeconds?: number
  notes?: string
}

interface StrengthSessionForGarmin {
  name: string
  description?: string
  exercises: StrengthExercise[]
  warmupExercises?: StrengthExercise[]
  cooldownExercises?: StrengthExercise[]
}

/**
 * Serialize a strength session to a Garmin workout.
 *
 * Garmin represents strength workouts as:
 * - Sport type: STRENGTH_TRAINING (ID 5)
 * - Each exercise = a RepeatGroup with N repetitions (sets)
 *   containing a work step (reps description) + rest step
 * - Warmup/cooldown as timed steps
 */
export function buildGarminStrengthWorkout(session: StrengthSessionForGarmin): GarminWorkout {
  const sportTypeObj = SPORT_TYPE_OBJECTS.STRENGTH_TRAINING
  const steps: GarminWorkoutStepUnion[] = []
  let stepOrder = 1

  // Warmup exercises as simple timed steps
  if (session.warmupExercises?.length) {
    for (const ex of session.warmupExercises) {
      steps.push(buildStep(stepOrder++, 'warmup', {
        durationSeconds: 60,
        description: `${ex.exerciseName}${ex.notes ? ` - ${ex.notes}` : ''}`,
      }))
    }
  }

  // Main exercises — each as a repeat group (sets × [work + rest])
  for (const ex of session.exercises) {
    const repsStr = typeof ex.reps === 'number' ? `${ex.reps}` : ex.reps
    const weightStr = ex.weight ? ` @ ${ex.weight}kg` : ''
    const exerciseDescription = `${ex.exerciseName}: ${repsStr} reps${weightStr}`

    // Give the watch a real exercise identity (name + rep detection), not just
    // a free-text description it ignores.
    const garminExercise = resolveGarminExercise(ex.exerciseName)
    const weightKg = ex.weight ?? extractWeightKg(ex.exerciseName)
    const exerciseOpts = {
      exerciseCategory: garminExercise?.exerciseCategory,
      exerciseName: garminExercise?.exerciseName,
      weightKg,
    }

    if (ex.sets > 1 && ex.restSeconds && ex.restSeconds > 0) {
      // Repeat group: sets × (work + rest)
      const childSteps = [
        buildStep(1, 'interval', {
          isLapButton: true,
          description: exerciseDescription,
          ...exerciseOpts,
        }),
        buildStep(2, 'rest', {
          durationSeconds: ex.restSeconds,
          description: 'Vila',
        }),
      ]
      steps.push(buildRepeatGroup(stepOrder++, ex.sets, childSteps))
    } else {
      // Single step with lap button per set
      for (let s = 0; s < ex.sets; s++) {
        steps.push(buildStep(stepOrder++, 'interval', {
          isLapButton: true,
          description: `${exerciseDescription} (set ${s + 1}/${ex.sets})`,
          ...exerciseOpts,
        }))
      }
    }
  }

  // Cooldown exercises
  if (session.cooldownExercises?.length) {
    for (const ex of session.cooldownExercises) {
      steps.push(buildStep(stepOrder++, 'cooldown', {
        durationSeconds: 60,
        description: `${ex.exerciseName}${ex.notes ? ` - ${ex.notes}` : ''}`,
      }))
    }
  }

  return {
    workoutName: session.name,
    sport: 'STRENGTH_TRAINING',
    sportType: sportTypeObj,
    description: session.description,
    steps,
  } as GarminWorkout
}
