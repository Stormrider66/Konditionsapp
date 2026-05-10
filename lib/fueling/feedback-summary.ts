import type { PrismaClient } from '@prisma/client'

export interface FuelingFeedbackSummary {
  count: number
  averageActualCarbsGPerHour: number | null
  averagePlannedCarbsGPerHour: number | null
  averageStomachRating: number | null
  averageEnergyRating: number | null
  bestToleratedCarbsGPerHour: number | null
  latestActualCarbsGPerHour: number | null
  status: 'NO_DATA' | 'READY_TO_PROGRESS' | 'HOLD' | 'REDUCE' | 'ON_TRACK'
}

type PrismaLike = Pick<PrismaClient, 'workoutFuelingLog'>

export async function getFuelingFeedbackSummary(
  prisma: PrismaLike,
  clientId: string,
  take = 6
): Promise<FuelingFeedbackSummary> {
  const rows = await prisma.workoutFuelingLog.findMany({
    where: {
      workoutLog: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      actualCarbsGPerHour: true,
      stomachRating: true,
      energyRating: true,
      workoutLog: {
        select: {
          workout: {
            select: {
              fuelingPrescription: {
                select: { targetCarbsGPerHour: true },
              },
            },
          },
        },
      },
    },
  })

  if (rows.length === 0) {
    return {
      count: 0,
      averageActualCarbsGPerHour: null,
      averagePlannedCarbsGPerHour: null,
      averageStomachRating: null,
      averageEnergyRating: null,
      bestToleratedCarbsGPerHour: null,
      latestActualCarbsGPerHour: null,
      status: 'NO_DATA',
    }
  }

  const actualValues = rows.map((row) => row.actualCarbsGPerHour).filter(isNumber)
  const plannedValues = rows.map((row) => row.workoutLog.workout.fuelingPrescription?.targetCarbsGPerHour).filter(isNumber)
  const stomachValues = rows.map((row) => row.stomachRating).filter(isNumber)
  const energyValues = rows.map((row) => row.energyRating).filter(isNumber)
  const toleratedValues = rows
    .filter((row) => (row.stomachRating ?? 0) >= 4 && row.actualCarbsGPerHour != null)
    .map((row) => row.actualCarbsGPerHour)
    .filter(isNumber)

  const averageActual = average(actualValues)
  const averagePlanned = average(plannedValues)
  const averageStomach = average(stomachValues)
  const averageEnergy = average(energyValues)

  return {
    count: rows.length,
    averageActualCarbsGPerHour: averageActual,
    averagePlannedCarbsGPerHour: averagePlanned,
    averageStomachRating: averageStomach,
    averageEnergyRating: averageEnergy,
    bestToleratedCarbsGPerHour: toleratedValues.length > 0 ? Math.max(...toleratedValues) : null,
    latestActualCarbsGPerHour: actualValues[0] ?? null,
    status: resolveFuelingStatus(averageActual, averagePlanned, averageStomach, rows.length),
  }
}

export function adaptCarbTargetFromFeedback(
  plannedTarget: number,
  summary: FuelingFeedbackSummary
): number {
  if (summary.status === 'NO_DATA') return plannedTarget

  if (summary.status === 'REDUCE') {
    const tolerated = summary.bestToleratedCarbsGPerHour ?? summary.latestActualCarbsGPerHour ?? plannedTarget - 15
    return roundToFive(Math.max(30, Math.min(plannedTarget - 10, tolerated)))
  }

  if (summary.status === 'HOLD') {
    const anchor = summary.latestActualCarbsGPerHour ?? summary.averageActualCarbsGPerHour ?? plannedTarget
    return roundToFive(Math.max(30, Math.min(plannedTarget, anchor + 5)))
  }

  if (summary.status === 'READY_TO_PROGRESS') {
    return roundToFive(Math.min(120, plannedTarget + 5))
  }

  return roundToFive(plannedTarget)
}

function resolveFuelingStatus(
  actual: number | null,
  planned: number | null,
  stomach: number | null,
  count: number
): FuelingFeedbackSummary['status'] {
  if (count === 0 || actual == null) return 'NO_DATA'
  if (stomach != null && stomach < 2.6) return 'REDUCE'
  if (stomach != null && stomach < 3.5) return 'HOLD'
  if (planned != null && actual < planned - 15) return 'HOLD'
  if (count >= 2 && stomach != null && stomach >= 4.2 && planned != null && actual >= planned - 5) return 'READY_TO_PROGRESS'
  return 'ON_TRACK'
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
