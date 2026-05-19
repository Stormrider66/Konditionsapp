import { PeriodPhase } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function findOrCreateTrainingDayForWorkout(
  programId: string,
  targetDate: Date,
  fallbackPhase: PeriodPhase
): Promise<{ id: string }> {
  const dateStart = new Date(targetDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(targetDate)
  dateEnd.setHours(23, 59, 59, 999)

  const existingDay = await prisma.trainingDay.findFirst({
    where: {
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
      week: {
        programId,
      },
    },
  })

  if (existingDay) {
    return existingDay
  }

  const week = await findOrCreateWeekForDate(programId, targetDate, fallbackPhase)
  const dayNumber = targetDate.getDay() === 0 ? 7 : targetDate.getDay()

  return prisma.trainingDay.create({
    data: {
      weekId: week.id,
      dayNumber,
      date: targetDate,
    },
  })
}

export function formatDateSwedish(date: Date): string {
  return formatDateForLocale(date, 'sv')
}

export function formatDateForLocale(date: Date, locale: 'en' | 'sv' = 'en'): string {
  return date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

async function findOrCreateWeekForDate(
  programId: string,
  targetDate: Date,
  fallbackPhase: PeriodPhase
): Promise<{ id: string }> {
  const existingWeek = await prisma.trainingWeek.findFirst({
    where: {
      programId,
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
  })

  if (existingWeek) {
    return existingWeek
  }

  const weekStart = new Date(targetDate)
  const dayOfWeek = weekStart.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  weekStart.setDate(weekStart.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const maxWeek = await prisma.trainingWeek.findFirst({
    where: { programId },
    orderBy: { weekNumber: 'desc' },
    select: { weekNumber: true },
  })

  return prisma.trainingWeek.create({
    data: {
      programId,
      weekNumber: (maxWeek?.weekNumber || 0) + 1,
      startDate: weekStart,
      endDate: weekEnd,
      phase: fallbackPhase,
      focus: 'Tillagd vecka',
    },
  })
}
