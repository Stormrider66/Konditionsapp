// lib/programs/bundled-assignments.ts
//
// Server-side loader for studio assignments linked to a TrainingProgram via
// programId (the "bundle into program" feature). Returns lightweight view
// models the athlete/coach program timeline can render alongside hierarchy
// workouts — the assignment rows stay the single source of truth.
import { prisma } from '@/lib/prisma'

export type BundledAssignmentKind = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

export interface BundledAssignment {
  id: string
  kind: BundledAssignmentKind
  name: string
  /** ISO string of the assigned calendar day (UTC midnight, @db.Date) */
  date: string
  completed: boolean
  /** Minutes, when known (actual or estimated) */
  duration: number | null
  /** App-relative path (prepend basePath when rendering) */
  href: string
}

export async function getBundledAssignments(
  programId: string,
  clientId: string
): Promise<BundledAssignment[]> {
  const where = { programId, athleteId: clientId }

  const [strength, cardio, hybrid, agility] = await Promise.all([
    prisma.strengthSessionAssignment.findMany({
      where,
      select: {
        id: true,
        assignedDate: true,
        status: true,
        duration: true,
        session: { select: { name: true, estimatedDuration: true } },
      },
    }),
    prisma.cardioSessionAssignment.findMany({
      where,
      select: {
        id: true,
        assignedDate: true,
        status: true,
        actualDuration: true,
        session: { select: { name: true } },
      },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where,
      select: {
        id: true,
        workoutId: true,
        assignedDate: true,
        status: true,
        workout: { select: { name: true } },
      },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where,
      select: {
        id: true,
        workoutId: true,
        assignedDate: true,
        status: true,
        workout: { select: { name: true, totalDuration: true } },
      },
    }),
  ])

  const items: BundledAssignment[] = [
    ...strength.map((a) => ({
      id: a.id,
      kind: 'STRENGTH' as const,
      name: a.session.name,
      date: a.assignedDate.toISOString(),
      completed: a.status === 'COMPLETED',
      duration: a.duration ?? a.session.estimatedDuration ?? null,
      href: `/athlete/workout/${a.id}`,
    })),
    ...cardio.map((a) => ({
      id: a.id,
      kind: 'CARDIO' as const,
      name: a.session.name,
      date: a.assignedDate.toISOString(),
      completed: a.status === 'COMPLETED',
      duration: a.actualDuration != null ? Math.round(a.actualDuration / 60) : null,
      href: '/athlete/cardio',
    })),
    ...hybrid.map((a) => ({
      id: a.id,
      kind: 'HYBRID' as const,
      name: a.workout.name,
      date: a.assignedDate.toISOString(),
      completed: a.status === 'COMPLETED',
      duration: null,
      href: `/athlete/hybrid/${a.workoutId}`,
    })),
    ...agility.map((a) => ({
      id: a.id,
      kind: 'AGILITY' as const,
      name: a.workout.name,
      date: a.assignedDate.toISOString(),
      completed: a.status === 'COMPLETED',
      duration: a.workout.totalDuration ?? null,
      href: `/athlete/agility/${a.workoutId}`,
    })),
  ]

  return items.sort((a, b) => a.date.localeCompare(b.date))
}
