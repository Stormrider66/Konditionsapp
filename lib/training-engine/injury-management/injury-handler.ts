/**
 * Simplified injury detection handler used for automated testing and
 * integration with cross-training substitutions.
 */

type InjuryAssessment =
  | 'REST_1_DAY'
  | 'REST_2_3_DAYS'
  | 'MODIFY'
  | 'MONITOR'

export interface InjuryEvent {
  clientId: string
  painLevel: number
  painLocation:
    | 'PLANTAR_FASCIA'
    | 'ACHILLES'
    | 'IT_BAND'
    | 'PATELLA'
    | 'SHIN'
    | 'CALF'
    | 'HAMSTRING'
  gaitAffected?: boolean
  assessment: InjuryAssessment
}

export interface InjuryHandlingResult {
  immediateAction: InjuryAssessment
  workoutModified: boolean
  programPaused: boolean
  crossTrainingModality?: string
}

const MODALITY_MAP: Record<InjuryEvent['painLocation'], string> = {
  PLANTAR_FASCIA: 'DEEP_WATER_RUNNING',
  ACHILLES: 'DEEP_WATER_RUNNING',
  IT_BAND: 'CYCLING',
  PATELLA: 'CYCLING',
  SHIN: 'ELLIPTICAL',
  CALF: 'CYCLING',
  HAMSTRING: 'SWIMMING'
}

function shouldPauseProgram(injury: InjuryEvent): boolean {
  return injury.gaitAffected === true || injury.assessment.startsWith('REST')
}

function needsCrossTraining(injury: InjuryEvent): boolean {
  return injury.assessment === 'MODIFY'
}

function normalizeDate(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

async function cancelTodaysWorkout(
  injury: InjuryEvent,
  prisma: any,
  today: Date
) {
  const workout = await prisma.workout?.findFirst?.({
    where: {
      clientId: injury.clientId,
      scheduledDate: today
    }
  })

  if (!workout) return false

  if (prisma.workout?.update) {
    await prisma.workout.update({
      where: { id: workout.id },
      data: { status: 'CANCELLED' }
    })
  } else if (prisma.workout?.updateMany) {
    await prisma.workout.updateMany({
      where: { id: workout.id },
      data: { status: 'CANCELLED' }
    })
  } else {
    workout.status = 'CANCELLED'
  }

  return true
}

async function createCrossTrainingSession(
  injury: InjuryEvent,
  modality: string,
  prisma: any,
  today: Date
) {
  await prisma.crossTrainingSession?.create?.({
    data: {
      clientId: injury.clientId,
      date: today,
      modality,
      reason: 'INJURY',
      injuryType: injury.painLocation,
      duration: 60,
      intensity: 'EASY',
      runningEquivalent: {
        estimatedTSS: 45,
        fitnessRetention: 0.9
      }
    }
  })
}

export async function handleInjuryDetection(
  injury: InjuryEvent,
  prisma: any
): Promise<InjuryHandlingResult> {
  const today = normalizeDate(new Date())
  let workoutModified = false
  let crossTrainingModality: string | undefined

  if (shouldPauseProgram(injury)) {
    const cancelled = await cancelTodaysWorkout(injury, prisma, today)
    workoutModified = workoutModified || cancelled
  }

  if (needsCrossTraining(injury)) {
    workoutModified = true
    crossTrainingModality = MODALITY_MAP[injury.painLocation] || 'DEEP_WATER_RUNNING'
    await createCrossTrainingSession(injury, crossTrainingModality, prisma, today)
  }

  return {
    immediateAction: injury.assessment,
    workoutModified,
    programPaused: shouldPauseProgram(injury),
    crossTrainingModality
  }
}

