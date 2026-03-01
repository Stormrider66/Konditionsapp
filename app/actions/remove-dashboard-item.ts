'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import type { AssignmentType } from '@/types/dashboard-items'

type RemovePayload =
  | { kind: 'wod'; id: string }
  | { kind: 'program'; workoutId: string; isCustom: boolean }
  | { kind: 'assignment'; assignmentType: AssignmentType; id: string }

export async function removeDashboardItem(payload: RemovePayload) {
  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    return { success: false, error: 'Ej inloggad' }
  }

  const clientId = resolved.clientId

  try {
    switch (payload.kind) {
      case 'wod': {
        const wod = await prisma.aIGeneratedWOD.findUnique({
          where: { id: payload.id },
        })
        if (!wod || wod.clientId !== clientId) {
          return { success: false, error: 'Passet hittades inte' }
        }
        if (wod.status === 'COMPLETED') {
          return { success: false, error: 'Kan inte ta bort ett slutfört pass' }
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
          return { success: false, error: 'Passet hittades inte' }
        }
        if (workout.logs.length > 0) {
          return { success: false, error: 'Kan inte ta bort ett slutfört pass' }
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
        const table = getAssignmentTable(payload.assignmentType)
        const assignment = await (prisma as any)[table].findUnique({
          where: { id: payload.id },
        })
        if (!assignment || assignment.athleteId !== clientId) {
          return { success: false, error: 'Uppgiften hittades inte' }
        }
        if (assignment.status === 'COMPLETED') {
          return { success: false, error: 'Kan inte ta bort en slutförd uppgift' }
        }
        await (prisma as any)[table].update({
          where: { id: payload.id },
          data: { status: 'SKIPPED' },
        })
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

function getAssignmentTable(type: AssignmentType): string {
  switch (type) {
    case 'strength': return 'strengthSessionAssignment'
    case 'cardio':   return 'cardioSessionAssignment'
    case 'hybrid':   return 'hybridWorkoutAssignment'
    case 'agility':  return 'agilityWorkoutAssignment'
  }
}
