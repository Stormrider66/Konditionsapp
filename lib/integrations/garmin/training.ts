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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segments: Array<Record<string, any>>
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

export interface GarminSchedule {
  workoutId: string
  calendarDate: string // YYYY-MM-DD
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
    `${GARMIN_WORKOUT_PORTAL}/workout/v2`,
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
  const result = await trainingApiRequest<GarminSchedule>(
    clientId,
    `${GARMIN_TRAINING_API}/schedule/`,
    'POST',
    schedule
  )
  logger.info('Scheduled Garmin workout', { clientId, workoutId: schedule.workoutId, date: schedule.calendarDate })
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
  } = {}
): GarminWorkoutStep {
  const step: GarminWorkoutStep = {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType: STEP_TYPES[stepType] || STEP_TYPES.interval,
  }

  // End condition (duration)
  if (opts.isLapButton || (!opts.durationSeconds && !opts.distanceMeters)) {
    step.endCondition = END_CONDITIONS.lap_button
  } else if (opts.durationSeconds && opts.durationSeconds > 0) {
    step.endCondition = END_CONDITIONS.time
    step.endConditionValue = opts.durationSeconds
  } else if (opts.distanceMeters && opts.distanceMeters > 0) {
    step.endCondition = END_CONDITIONS.distance
    step.endConditionValue = opts.distanceMeters
  }

  // Target (only include if there's a real target)
  if (opts.targetType && opts.targetType !== 'none' && TARGET_TYPES[opts.targetType]) {
    step.targetType = TARGET_TYPES[opts.targetType]
    if (opts.targetLow != null) step.targetValueOne = opts.targetLow
    if (opts.targetHigh != null) step.targetValueTwo = opts.targetHigh
  }

  return step
}

function buildRepeatGroup(
  order: number,
  iterations: number,
  steps: GarminWorkoutStep[]
): GarminWorkoutStepUnion {
  return {
    type: 'RepeatGroupDTO',
    stepOrder: order,
    numberOfIterations: iterations,
    workoutSteps: steps,
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
    steps?: Array<{
      type: 'interval' | 'recovery' | 'rest'
      durationSeconds?: number
      distanceMeters?: number
      durationIsLapButton?: boolean
      targetType?: 'pace' | 'hr' | 'power' | 'cadence' | 'none'
      targetLow?: number
      targetHigh?: number
      description?: string
    }>
  }>
}): GarminWorkout {
  const sport = getSportString(workout.sportType)
  // Use running (ID 1) as fallback — most universally supported by Garmin
  const sportKey = SPORT_TYPE_MAP[workout.sportType] || 'CARDIO_TRAINING'
  const sportTypeObj: GarminSportType = SPORT_TYPE_OBJECTS[sportKey] || SPORT_TYPE_OBJECTS.RUNNING

  const workoutSteps: GarminWorkoutStepUnion[] = []
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
        })
      )
      workoutSteps.push(buildRepeatGroup(stepOrder++, segment.repeats, childSteps))
    } else {
      // Single step
      workoutSteps.push(
        buildStep(stepOrder++, segment.type, {
          durationSeconds: segment.durationSeconds,
          distanceMeters: segment.distanceMeters,
          targetType: segment.targetType,
          targetLow: segment.targetLow,
          targetHigh: segment.targetHigh,
        })
      )
    }
  }

  // Match workout-level sport string with segment-level sportType
  const sportString = sportTypeObj.sportTypeKey === 'running' ? 'RUNNING'
    : sportTypeObj.sportTypeKey === 'cycling' ? 'CYCLING'
    : sport

  const result: GarminWorkout = {
    workoutName: workout.name,
    sport: sportString,
    segments: [{
      segmentOrder: 1,
      sport: sportString,
      sportType: sportTypeObj,
      workoutSteps,
    }],
  }
  if (workout.description) result.description = workout.description
  return result
}
