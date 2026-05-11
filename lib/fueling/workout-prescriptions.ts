import type { PrismaClient, WorkoutIntensity, WorkoutType } from '@prisma/client'
import {
  adaptCarbTargetFromFeedback,
  getFuelingFeedbackSummary,
  type FuelingFeedbackSummary,
} from '@/lib/fueling/feedback-summary'

interface ProgramForFueling {
  id: string
  clientId: string
  goalType?: string | null
  weeks: Array<{
    weekNumber: number
    days: Array<{
      workouts: Array<{
        id: string
        name: string
        type: WorkoutType
        intensity: WorkoutIntensity
        duration?: number | null
        distance?: number | null
      }>
    }>
  }>
}

type FuelingPlanForPrescription = {
  id: string
  recommendedCarbsGPerHour: number | null
}

type PrismaLike = Pick<PrismaClient, 'raceFuelingPlan' | 'trainingProgram' | 'workoutFuelingLog' | 'workoutFuelingPrescription'>

export async function createFuelingPrescriptionsForProgram(
  prisma: PrismaLike,
  program: ProgramForFueling
): Promise<number> {
  const plan = await prisma.raceFuelingPlan.findFirst({
    where: {
      clientId: program.clientId,
      status: { not: 'ARCHIVED' },
    },
    orderBy: [
      { raceDate: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      recommendedCarbsGPerHour: true,
    },
  })

  return upsertFuelingPrescriptionsForProgram(prisma, program, plan)
}

export async function refreshFuelingPrescriptionsForActivePrograms(
  prisma: PrismaLike,
  clientId: string,
  planId: string
): Promise<number> {
  const plan = await prisma.raceFuelingPlan.findFirst({
    where: {
      id: planId,
      clientId,
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      recommendedCarbsGPerHour: true,
    },
  })

  if (!plan?.recommendedCarbsGPerHour) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId,
      isActive: true,
    },
    select: {
      id: true,
      clientId: true,
      goalType: true,
      weeks: {
        select: {
          weekNumber: true,
          days: {
            where: { date: { gte: today } },
            select: {
              workouts: {
                where: { status: { not: 'CANCELLED' } },
                select: {
                  id: true,
                  name: true,
                  type: true,
                  intensity: true,
                  duration: true,
                  distance: true,
                },
              },
            },
          },
        },
      },
    },
  })

  let count = 0
  for (const program of programs) {
    count += await upsertFuelingPrescriptionsForProgram(prisma, program, plan)
  }

  return count
}

async function upsertFuelingPrescriptionsForProgram(
  prisma: PrismaLike,
  program: ProgramForFueling,
  plan: FuelingPlanForPrescription | null
): Promise<number> {
  if (!plan?.recommendedCarbsGPerHour) return 0

  const feedbackSummary = await getFuelingFeedbackSummary(prisma, program.clientId, 6)
  const maxWeek = Math.max(...program.weeks.map((week) => week.weekNumber), 1)
  const prescriptions = program.weeks.flatMap((week) =>
    week.days.flatMap((day) =>
      day.workouts
        .filter((workout) => shouldPrescribeFueling(workout, program.goalType))
        .map((workout) => {
          const progressiveTarget = calculateProgressiveCarbTarget(
            plan.recommendedCarbsGPerHour ?? 75,
            week.weekNumber,
            maxWeek,
            workout
          )
          const targetCarbsGPerHour = adaptCarbTargetFromFeedback(progressiveTarget, feedbackSummary)
          const durationHours = (workout.duration ?? estimateDurationFromDistance(workout)) / 60

          return {
            workoutId: workout.id,
            planId: plan.id,
            targetCarbsGPerHour,
            targetCarbsTotalG: durationHours > 0 ? Math.round(targetCarbsGPerHour * durationHours) : null,
            hydrationMl: durationHours > 0 ? Math.round(500 * durationHours) : null,
            instructionsSv: buildFuelingInstructions(targetCarbsGPerHour, durationHours, feedbackSummary.status),
          }
        })
    )
  )

  if (prescriptions.length === 0) return 0

  await Promise.all(
    prescriptions.map((prescription) =>
      prisma.workoutFuelingPrescription.upsert({
        where: { workoutId: prescription.workoutId },
        create: prescription,
        update: {
          planId: prescription.planId,
          targetCarbsGPerHour: prescription.targetCarbsGPerHour,
          targetCarbsTotalG: prescription.targetCarbsTotalG,
          hydrationMl: prescription.hydrationMl,
          instructionsSv: prescription.instructionsSv,
        },
      })
    )
  )

  return prescriptions.length
}

export function shouldPrescribeFueling(
  workout: Pick<ProgramForFueling['weeks'][number]['days'][number]['workouts'][number], 'name' | 'type' | 'duration' | 'distance' | 'intensity'>,
  goalType?: string | null
): boolean {
  const name = workout.name.toLowerCase()
  const isEnduranceType = ['RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'HYROX'].includes(workout.type)
  if (!isEnduranceType) return false

  const isRaceSpecific = /lång|long|race|tävling|lopp|marathon|halvmarathon|tempo|brick/i.test(name)
  const duration = workout.duration ?? estimateDurationFromDistance(workout)
  const goalLooksEndurance = goalType ? /marathon|half|10k|5k|cycling|skiing|triathlon|hyrox/i.test(goalType) : false

  return Boolean(
    duration >= 75 ||
    (goalLooksEndurance && duration >= 60 && workout.intensity !== 'RECOVERY') ||
    (isRaceSpecific && duration >= 45)
  )
}

export function calculateProgressiveCarbTarget(
  raceTarget: number,
  weekNumber: number,
  maxWeek: number,
  workout: Pick<ProgramForFueling['weeks'][number]['days'][number]['workouts'][number], 'name' | 'intensity'>
): number {
  const lowerTarget = Math.min(50, raceTarget)
  const progress = maxWeek <= 1 ? 1 : (weekNumber - 1) / (maxWeek - 1)
  const isRaceRehearsal = /race|tävling|lopp|marathon|brick/i.test(workout.name) || workout.intensity === 'THRESHOLD'
  const progressionTarget = lowerTarget + (raceTarget - lowerTarget) * Math.min(1, progress * 1.15)
  const raw = isRaceRehearsal && progress > 0.65 ? Math.max(progressionTarget, raceTarget * 0.9) : progressionTarget

  return Math.round(Math.max(30, Math.min(120, raw)) / 5) * 5
}

export function estimateDurationFromDistance(
  workout: Pick<ProgramForFueling['weeks'][number]['days'][number]['workouts'][number], 'type' | 'distance'>
): number {
  if (!workout.distance) return 0
  const assumedSpeedKmh = workout.type === 'CYCLING' ? 28 : workout.type === 'SKIING' ? 14 : workout.type === 'SWIMMING' ? 3 : 10
  return Math.round((workout.distance / assumedSpeedKmh) * 60)
}

function buildFuelingInstructions(
  targetCarbsGPerHour: number,
  durationHours: number,
  feedbackStatus: FuelingFeedbackSummary['status']
): string {
  const every20 = Math.round(targetCarbsGPerHour / 3)
  const total = durationHours > 0 ? Math.round(targetCarbsGPerHour * durationHours) : null

  return [
    `Magträning: sikta på ${targetCarbsGPerHour} g kolhydrater/timme.`,
    `Praktiskt upplägg: cirka ${every20} g var 20:e minut.`,
    total ? `Totalt för passet: ungefär ${total} g kolhydrater.` : null,
    feedbackHint(feedbackStatus),
    targetCarbsGPerHour > 60 ? 'Använd gärna glukos/fruktos-blandning eftersom målet är över 60 g/timme.' : null,
    'Använd produkter som är tänkta för tävling och notera magrespons efter passet.',
  ].filter(Boolean).join(' ')
}

function feedbackHint(status: FuelingFeedbackSummary['status']): string | null {
  if (status === 'REDUCE') {
    return 'Senaste magresponsen talar för att backa lite och prioritera stabil känsla före höjning.'
  }

  if (status === 'HOLD') {
    return 'Upprepa nivån tills intag och magrespons är stabila innan nästa höjning.'
  }

  if (status === 'READY_TO_PROGRESS') {
    return 'Toleransen ser stabil ut, därför kan nivån höjas försiktigt.'
  }

  return null
}
