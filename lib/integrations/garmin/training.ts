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

export type GarminSportType =
  | 'RUNNING'
  | 'CYCLING'
  | 'LAP_SWIMMING'
  | 'STRENGTH_TRAINING'
  | 'CARDIO_TRAINING'
  | 'YOGA'
  | 'PILATES'
  | 'MULTI_SPORT'

export type GarminStepType =
  | 'WARMUP'
  | 'COOLDOWN'
  | 'INTERVAL'
  | 'RECOVERY'
  | 'REST'
  | 'OTHER'

export type GarminTargetType =
  | 'NO_TARGET'
  | 'PACE'
  | 'SPEED'
  | 'HEART_RATE'
  | 'POWER'
  | 'CADENCE'

export type GarminDurationType =
  | 'TIME'
  | 'DISTANCE'
  | 'OPEN'
  | 'LAP_BUTTON'

export interface GarminWorkoutTarget {
  targetType: GarminTargetType
  targetValueOne?: number  // lower bound
  targetValueTwo?: number  // upper bound
  zoneNumber?: number
}

export interface GarminWorkoutStep {
  type: 'WorkoutStep'
  stepOrder: number
  stepType: GarminStepType
  durationType: GarminDurationType
  durationValue?: number          // seconds for TIME, meters for DISTANCE
  durationValueType?: string
  target?: GarminWorkoutTarget
  description?: string
}

export interface GarminWorkoutRepeatStep {
  type: 'WorkoutRepeatStep'
  stepOrder: number
  numberOfIterations: number
  steps: GarminWorkoutStep[]
}

export type GarminWorkoutStepUnion = GarminWorkoutStep | GarminWorkoutRepeatStep

export interface GarminWorkout {
  workoutId?: string // returned by Garmin after creation
  workoutName: string
  description?: string
  sportType: GarminSportType
  workoutSegments: Array<{
    segmentOrder: number
    sportType: GarminSportType
    workoutSteps: GarminWorkoutStepUnion[]
  }>
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
const SPORT_TYPE_MAP: Record<string, GarminSportType> = {
  RUNNING: 'RUNNING',
  CYCLING: 'CYCLING',
  SWIMMING: 'LAP_SWIMMING',
  STRENGTH: 'STRENGTH_TRAINING',
  RECOVERY: 'YOGA',
  CROSS_TRAINING: 'CARDIO_TRAINING',
  SKIING: 'CARDIO_TRAINING',
  HYROX: 'CARDIO_TRAINING',
  OTHER: 'CARDIO_TRAINING',
}

/**
 * Convert a Trainomics program workout to Garmin workout format.
 *
 * Handles:
 * - Warmup / cooldown segments
 * - Intervals with repeat blocks
 * - Pace, HR, and power targets
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
      targetType?: 'pace' | 'hr' | 'power' | 'cadence' | 'none'
      targetLow?: number
      targetHigh?: number
    }>
  }>
}): GarminWorkout {
  const garminSportType = SPORT_TYPE_MAP[workout.sportType] || 'CARDIO_TRAINING'

  const workoutSteps: GarminWorkoutStepUnion[] = []
  let stepOrder = 1

  for (const segment of workout.segments) {
    if (segment.repeats && segment.steps && segment.steps.length > 0) {
      // Repeat block (interval set)
      const repeatSteps: GarminWorkoutStep[] = segment.steps.map((step, idx) => ({
        type: 'WorkoutStep' as const,
        stepOrder: idx + 1,
        stepType: mapStepType(step.type),
        ...mapDuration(step.durationSeconds, step.distanceMeters),
        target: mapTarget(step.targetType, step.targetLow, step.targetHigh),
      }))

      workoutSteps.push({
        type: 'WorkoutRepeatStep',
        stepOrder: stepOrder++,
        numberOfIterations: segment.repeats,
        steps: repeatSteps,
      })
    } else {
      // Single step
      workoutSteps.push({
        type: 'WorkoutStep',
        stepOrder: stepOrder++,
        stepType: mapStepType(segment.type),
        ...mapDuration(segment.durationSeconds, segment.distanceMeters),
        target: mapTarget(segment.targetType, segment.targetLow, segment.targetHigh),
      })
    }
  }

  return {
    workoutName: workout.name,
    description: workout.description,
    sportType: garminSportType,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: garminSportType,
        workoutSteps,
      },
    ],
  }
}

function mapStepType(type: string): GarminStepType {
  switch (type) {
    case 'warmup': return 'WARMUP'
    case 'cooldown': return 'COOLDOWN'
    case 'interval': return 'INTERVAL'
    case 'recovery': return 'RECOVERY'
    case 'rest': return 'REST'
    case 'steady': return 'INTERVAL'
    default: return 'OTHER'
  }
}

function mapDuration(
  seconds?: number,
  meters?: number
): { durationType: GarminDurationType; durationValue?: number } {
  if (seconds && seconds > 0) {
    return { durationType: 'TIME', durationValue: seconds }
  }
  if (meters && meters > 0) {
    return { durationType: 'DISTANCE', durationValue: meters }
  }
  return { durationType: 'OPEN' }
}

function mapTarget(
  type?: string,
  low?: number,
  high?: number
): GarminWorkoutTarget | undefined {
  if (!type || type === 'none') return undefined

  const targetTypeMap: Record<string, GarminTargetType> = {
    pace: 'PACE',
    speed: 'SPEED',
    hr: 'HEART_RATE',
    power: 'POWER',
    cadence: 'CADENCE',
  }

  const garminType = targetTypeMap[type]
  if (!garminType) return undefined

  return {
    targetType: garminType,
    targetValueOne: low,
    targetValueTwo: high,
  }
}
