'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import type { AssignmentType } from '@/types/dashboard-items'

type RemovePayload =
  | { kind: 'wod'; id: string }
  | { kind: 'program'; workoutId: string; isCustom: boolean }
  | { kind: 'assignment'; assignmentType: AssignmentType; id: string }

type AppLocale = 'en' | 'sv'
type RemovableAssignment = {
  athleteId: string
  status: string
}

function resolveLocale(locale?: string | null): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function removeDashboardItem(payload: RemovePayload, localeInput?: string) {
  const locale = resolveLocale(localeInput)
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return { success: false, error: copy(locale, 'Not signed in', 'Ej inloggad') }
  }

  const clientId = resolved.clientId

  try {
    switch (payload.kind) {
      case 'wod': {
        const wod = await prisma.aIGeneratedWOD.findUnique({
          where: { id: payload.id },
        })
        if (!wod || wod.clientId !== clientId) {
          return { success: false, error: copy(locale, 'Workout not found', 'Passet hittades inte') }
        }
        if (wod.status === 'COMPLETED') {
          return { success: false, error: copy(locale, 'Cannot remove a completed workout', 'Kan inte ta bort ett slutfört pass') }
        }
        await prisma.aIGeneratedWOD.update({
          where: { id: payload.id },
          data: { status: 'ABANDONED' },
        })
        break
      }

      case 'program': {
        const workout = await prisma.workout.findUnique({
          where: { id: payload.workoutId },
          include: {
            day: { include: { week: { include: { program: true } } } },
            logs: { where: { completed: true }, take: 1 },
          },
        })
        if (!workout || workout.day.week.program.clientId !== clientId) {
          return { success: false, error: copy(locale, 'Workout not found', 'Passet hittades inte') }
        }
        if (workout.logs.length > 0) {
          return { success: false, error: copy(locale, 'Cannot remove a completed workout', 'Kan inte ta bort ett slutfört pass') }
        }
        if (payload.isCustom && workout.isCustom) {
          await prisma.workout.delete({ where: { id: payload.workoutId } })
        } else {
          await prisma.workout.update({
            where: { id: payload.workoutId },
            data: { status: 'CANCELLED' },
          })
        }
        break
      }

      case 'assignment': {
        const assignment = await findAssignment(payload.assignmentType, payload.id)
        if (!assignment || assignment.athleteId !== clientId) {
          return { success: false, error: copy(locale, 'Assignment not found', 'Uppgiften hittades inte') }
        }
        if (assignment.status === 'COMPLETED') {
          return { success: false, error: copy(locale, 'Cannot remove a completed assignment', 'Kan inte ta bort en slutförd uppgift') }
        }
        await skipAssignment(payload.assignmentType, payload.id)
        break
      }
    }

    revalidatePath('/athlete/dashboard')
    revalidatePath('/[businessSlug]/athlete/dashboard', 'page')

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function findAssignment(type: AssignmentType, id: string): Promise<RemovableAssignment | null> {
  switch (type) {
    case 'strength':
      return prisma.strengthSessionAssignment.findUnique({
        where: { id },
        select: { athleteId: true, status: true },
      })
    case 'cardio':
      return prisma.cardioSessionAssignment.findUnique({
        where: { id },
        select: { athleteId: true, status: true },
      })
    case 'hybrid':
      return prisma.hybridWorkoutAssignment.findUnique({
        where: { id },
        select: { athleteId: true, status: true },
      })
    case 'agility':
      return prisma.agilityWorkoutAssignment.findUnique({
        where: { id },
        select: { athleteId: true, status: true },
      })
  }
}

async function skipAssignment(type: AssignmentType, id: string) {
  switch (type) {
    case 'strength':
      await prisma.strengthSessionAssignment.update({
        where: { id },
        data: { status: 'SKIPPED' },
      })
      break
    case 'cardio':
      await prisma.cardioSessionAssignment.update({
        where: { id },
        data: { status: 'SKIPPED' },
      })
      break
    case 'hybrid':
      await prisma.hybridWorkoutAssignment.update({
        where: { id },
        data: { status: 'SKIPPED' },
      })
      break
    case 'agility':
      await prisma.agilityWorkoutAssignment.update({
        where: { id },
        data: { status: 'SKIPPED' },
      })
      break
  }
}
