// lib/strength/last-performance.ts
//
// "Last time you did this exercise" lookup for prefilling weights in the
// strength logging UI. Matches on REP SCHEME (repsTarget) — the reliable
// context signal — so a 5×5 max-strength weight isn't carried into a 3×8 day.
// (Intent matching beyond rep scheme isn't reliable yet: velocityZone is
// VBT-only and strengthPhase isn't captured per logged session — see the
// athlete-profile redesign notes.)
//
// Returns the heaviest working set of the most recent PREVIOUS session for
// each (exerciseId, repsTarget), with a flag when only a different rep scheme
// was available so the UI can label it honestly.

import { prisma } from '@/lib/prisma'

export interface LastPerformance {
  weight: number
  reps: number
  /** The rep scheme of the matched historical session. */
  repsTarget: number | null
  date: string
  /** True when the match used the requested rep scheme; false = fell back to another scheme. */
  sameScheme: boolean
}

export interface LastPerformanceItem {
  exerciseId: string
  /** Today's prescribed reps (numeric only — string schemes like "8-10" skip scheme matching). */
  repsTarget: number | null
}

/** Key used in the returned map: exerciseId + the requested repsTarget. */
export function lastPerformanceKey(exerciseId: string, repsTarget: number | null): string {
  return `${exerciseId}:${repsTarget ?? 'any'}`
}

export async function getLastPerformance(
  clientId: string,
  currentAssignmentId: string,
  items: LastPerformanceItem[],
): Promise<Map<string, LastPerformance>> {
  const result = new Map<string, LastPerformance>()
  const exerciseIds = Array.from(new Set(items.map((i) => i.exerciseId)))
  if (exerciseIds.length === 0) return result

  const rows = await prisma.setLog.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      weight: { gt: 0 },
      assignmentId: { not: currentAssignmentId },
      assignment: { athleteId: clientId },
    },
    orderBy: { completedAt: 'desc' },
    take: 1000,
    select: {
      exerciseId: true,
      assignmentId: true,
      weight: true,
      repsCompleted: true,
      repsTarget: true,
      completedAt: true,
    },
  })

  // Group history per exercise (already newest-first from the query).
  const byExercise = new Map<string, typeof rows>()
  for (const row of rows) {
    const arr = byExercise.get(row.exerciseId) ?? []
    arr.push(row)
    byExercise.set(row.exerciseId, arr)
  }

  // For a set of rows from one session (same assignment), pick the heaviest.
  const heaviestOf = (sets: typeof rows) =>
    sets.reduce((best, s) => (s.weight > best.weight ? s : best))

  for (const item of items) {
    const history = byExercise.get(item.exerciseId)
    if (!history || history.length === 0) continue

    const pick = (subset: typeof rows, sameScheme: boolean): LastPerformance | null => {
      if (subset.length === 0) return null
      // subset is newest-first; the most recent session is the first row's assignment.
      const latestAssignmentId = subset[0].assignmentId
      const sameSession = subset.filter((s) => s.assignmentId === latestAssignmentId)
      const top = heaviestOf(sameSession)
      return {
        weight: top.weight,
        reps: top.repsCompleted,
        repsTarget: top.repsTarget,
        date: top.completedAt.toISOString(),
        sameScheme,
      }
    }

    const matched = item.repsTarget != null
      ? pick(history.filter((h) => h.repsTarget === item.repsTarget), true)
      : null
    const chosen = matched ?? pick(history, false)
    if (chosen) {
      result.set(lastPerformanceKey(item.exerciseId, item.repsTarget), chosen)
    }
  }

  return result
}
