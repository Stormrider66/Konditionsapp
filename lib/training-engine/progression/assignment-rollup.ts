// lib/training-engine/progression/assignment-rollup.ts
//
// Roll up a StrengthSessionAssignment's logged SetLogs into ProgressionTracking
// so the Progression Dashboard, PR tracking, and "most-trained exercises"
// surfaces populate. Previously, assignment-based strength logging saved
// per-set estimated1RM but never produced the aggregate ProgressionTracking
// records those views read — see the focus-mode completion hook + backfill.
//
// Aggregation semantics live in the shared setlog-rollup core (also used by
// the WorkoutLog path, see workout-log-rollup.ts).

import { prisma } from '@/lib/prisma'
import { rollupSetLogs, type SetLogRollupResult } from './setlog-rollup'

export type AssignmentRollupResult = SetLogRollupResult

export async function rollupAssignmentProgression(assignmentId: string): Promise<AssignmentRollupResult> {
  const assignment = await prisma.strengthSessionAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, athleteId: true, assignedDate: true, completedAt: true },
  })
  if (!assignment) return { created: 0, skipped: 0, prs: 0 }

  const setLogs = await prisma.setLog.findMany({
    where: { assignmentId },
    select: { exerciseId: true, weight: true, repsCompleted: true, repsTarget: true, rpe: true, estimated1RM: true },
  })
  if (setLogs.length === 0) return { created: 0, skipped: 0, prs: 0 }

  // StrengthSessionAssignment.athleteId is a Client id (despite the name).
  return rollupSetLogs(assignment.athleteId, assignment.completedAt ?? assignment.assignedDate, setLogs, { assignmentId })
}
