import type { PrismaClient, WorkoutIntensity, WorkoutType } from '@prisma/client'
import {
  adaptCarbTargetFromFeedback,
  getFuelingFeedbackSummary,
  type FuelingFeedbackSummary,
} from '@/lib/fueling/feedback-summary'
import { sortFuelingPlansForDisplay } from '@/lib/fueling/plan-ordering'

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
  sport?: string | null
  raceDate?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  recommendedCarbsGPerHour: number | null
}

type PrismaLike = Pick<PrismaClient, 'raceFuelingPlan' | 'trainingProgram' | 'workoutFuelingLog' | 'workoutFuelingPrescription'>

export async function createFuelingPrescriptionsForProgram(
  prisma: PrismaLike,
  program: ProgramForFueling
): Promise<number> {
  const plans = await prisma.raceFuelingPlan.findMany({
    where: {
      clientId: program.clientId,
      status: { not: 'ARCHIVED' },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      sport: true,
      raceDate: true,
      createdAt: true,
      updatedAt: true,
      recommendedCarbsGPerHour: true,
    },
  })
  const plan = selectFuelingPlanForProgram(plans, program.goalType)

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
      sport: true,
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

export function selectFuelingPlanForProgram<T extends FuelingPlanForPrescription>(
  plans: T[],
  goalType?: string | null
): T | null {
  if (plans.length === 0) return null

  const goal = goalType?.toLowerCase() ?? ''
  const usablePlans = plans.filter((plan) => Boolean(plan.recommendedCarbsGPerHour))
  if (usablePlans.length === 0) return null

  const sortedPlans = hasAllPlanOrderingFields(usablePlans)
    ? sortFuelingPlansForDisplay(usablePlans)
    : usablePlans
  const matchingPlan = sortedPlans.find((plan) => plan.sport && goalMatchesSport(goal, plan.sport))
  return matchingPlan ?? sortedPlans[0]
}

function hasAllPlanOrderingFields<T extends FuelingPlanForPrescription>(
  plans: T[]
): plans is Array<T & {
  raceDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}> {
  return plans.every(hasPlanOrderingFields)
}

function hasPlanOrderingFields<T extends FuelingPlanForPrescription>(plan: T): plan is T & {
  raceDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
} {
  return plan.raceDate !== undefined && plan.createdAt !== undefined && plan.updatedAt !== undefined
}

function goalMatchesSport(goal: string, sport: string): boolean {
  if (!goal) return false
  if (sport === 'RUNNING') return /run|running|löp|marathon|half|halv|10k|5k/.test(goal)
  if (sport === 'CYCLING') return /cycl|cykel|bike|gravel|velo/.test(goal)
  if (sport === 'SKIING') return /ski|skid|vasalopp/.test(goal)
  if (sport === 'SWIMMING') return /swim|sim/.test(goal)
  if (sport === 'TRIATHLON') return /triathlon|ironman|halviron/.test(goal)
  if (sport === 'HYROX') return /hyrox/.test(goal)
  if (sport === 'TENNIS') return /tennis/.test(goal)
  if (sport === 'PADEL') return /padel/.test(goal)
  if (sport === 'STRENGTH') return /strength|styrk/.test(goal)
  if (sport === 'FUNCTIONAL_FITNESS' || sport === 'GENERAL_FITNESS') return /fitness|crossfit|funktionell/.test(goal)
  if (sport === 'TEAM_FOOTBALL') return /football|fotboll|soccer/.test(goal)
  if (sport === 'TEAM_ICE_HOCKEY') return /hockey|ishockey/.test(goal)
  if (sport === 'TEAM_HANDBALL') return /handboll|handball/.test(goal)
  if (sport === 'TEAM_FLOORBALL') return /floorball|innebandy/.test(goal)
  if (sport === 'TEAM_BASKETBALL') return /basket|basketball/.test(goal)
  if (sport === 'TEAM_VOLLEYBALL') return /volley|volleyball/.test(goal)
  return goal.includes(sport.toLowerCase())
}

function buildFuelingInstructions(
  targetCarbsGPerHour: number,
  durationHours: number,
  feedbackStatus: FuelingFeedbackSummary['status']
): string {
  const every20 = Math.round(targetCarbsGPerHour / 3)
  const total = durationHours > 0 ? Math.round(targetCarbsGPerHour * durationHours) : null

  return [
    `Gut training: aim for ${targetCarbsGPerHour} g carbohydrates/hour.`,
    `Practical setup: about ${every20} g every 20 minutes.`,
    total ? `Total for the session: about ${total} g carbohydrates.` : null,
    feedbackHint(feedbackStatus),
    targetCarbsGPerHour > 60 ? 'Prefer a glucose/fructose mix because the target is above 60 g/hour.' : null,
    'Use products intended for racing and note gut response after the session.',
  ].filter(Boolean).join(' ')
}

function feedbackHint(status: FuelingFeedbackSummary['status']): string | null {
  if (status === 'REDUCE') {
    return 'The latest gut response suggests backing off slightly and prioritizing stable tolerance before increasing.'
  }

  if (status === 'HOLD') {
    return 'Repeat this level until intake and gut response are stable before the next increase.'
  }

  if (status === 'READY_TO_PROGRESS') {
    return 'Tolerance looks stable, so the level can be increased carefully.'
  }

  return null
}
