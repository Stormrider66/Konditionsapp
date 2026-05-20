import { prisma } from '@/lib/prisma'
import { normalizeMuscleGroups, CANONICAL_MUSCLE_GROUPS, type CanonicalMuscleGroup } from '@/lib/muscle-group-normalizer'
import { startOfWeek, startOfMonth, subWeeks, subMonths, format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale?: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

export async function getMuscleGroupData(
  clientId: string,
  period: 'week' | 'month',
  count: number,
  localeValue?: string
) {
  const locale = getAppLocale(localeValue)
  const dateLocale = locale === 'sv' ? sv : enUS
  const now = new Date()
  const startDate =
    period === 'week'
      ? startOfWeek(subWeeks(now, count - 1), { weekStartsOn: 1 })
      : startOfMonth(subMonths(now, count - 1))

  const setLogs = await prisma.setLog.findMany({
    where: {
      assignment: {
        athleteId: clientId,
      },
      createdAt: { gte: startDate },
    },
    select: {
      weight: true,
      repsCompleted: true,
      createdAt: true,
      exercise: {
        select: {
          muscleGroup: true,
        },
      },
    },
  })

  const periods: Array<{
    label: string
    startDate: Date
    muscleGroups: Record<CanonicalMuscleGroup, { volume: number; sets: number }>
  }> = []

  for (let i = 0; i < count; i++) {
    const bucketStart =
      period === 'week'
        ? startOfWeek(subWeeks(now, count - 1 - i), { weekStartsOn: 1 })
        : startOfMonth(subMonths(now, count - 1 - i))

    const label =
      period === 'week'
        ? `${locale === 'sv' ? 'V' : 'W'}${format(bucketStart, 'w', { locale: dateLocale })}`
        : format(bucketStart, 'MMM', { locale: dateLocale })

    const groups = {} as Record<CanonicalMuscleGroup, { volume: number; sets: number }>
    for (const g of CANONICAL_MUSCLE_GROUPS) {
      groups[g] = { volume: 0, sets: 0 }
    }

    periods.push({ label, startDate: bucketStart, muscleGroups: groups })
  }

  for (const log of setLogs) {
    const logDate = new Date(log.createdAt)
    const normalizedGroups = normalizeMuscleGroups(log.exercise.muscleGroup)
    const volume = log.weight * log.repsCompleted

    for (let i = periods.length - 1; i >= 0; i--) {
      if (logDate >= periods[i].startDate) {
        for (const group of normalizedGroups) {
          periods[i].muscleGroups[group].volume += volume
          periods[i].muscleGroups[group].sets += 1
        }
        break
      }
    }
  }

  const summary: Record<CanonicalMuscleGroup, { volume: number; sets: number }> = {} as Record<
    CanonicalMuscleGroup,
    { volume: number; sets: number }
  >
  for (const g of CANONICAL_MUSCLE_GROUPS) {
    summary[g] = { volume: 0, sets: 0 }
  }

  let totalVolume = 0
  let totalSets = 0

  for (const p of periods) {
    for (const g of CANONICAL_MUSCLE_GROUPS) {
      summary[g].volume += p.muscleGroups[g].volume
      summary[g].sets += p.muscleGroups[g].sets
      totalVolume += p.muscleGroups[g].volume
      totalSets += p.muscleGroups[g].sets
    }
  }

  return {
    periods: periods.map((p) => ({
      label: p.label,
      muscleGroups: p.muscleGroups,
    })),
    summary: {
      muscleGroups: summary,
      totalVolume,
      totalSets,
    },
  }
}
