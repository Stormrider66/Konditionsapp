// lib/training-engine/progression/assignment-rollup.ts
//
// Roll up a StrengthSessionAssignment's logged SetLogs into ProgressionTracking
// so the Progression Dashboard, PR tracking, and "most-trained exercises"
// surfaces populate. Previously, assignment-based strength logging saved
// per-set estimated1RM but never produced the aggregate ProgressionTracking
// records those views read — see the focus-mode completion hook + backfill.
//
// One record per LOADED exercise (heaviest working set is the representative).
// Bodyweight-only exercises are skipped — there's no load to progress.
// Idempotent: skips an exercise that already has a record for the same day.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculateProgression } from './index'

export interface AssignmentRollupResult {
  created: number
  skipped: number
  prs: number
}

export async function rollupAssignmentProgression(assignmentId: string): Promise<AssignmentRollupResult> {
  const assignment = await prisma.strengthSessionAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, athleteId: true, assignedDate: true, completedAt: true },
  })
  if (!assignment) return { created: 0, skipped: 0, prs: 0 }

  const clientId = assignment.athleteId
  const day = new Date(assignment.completedAt ?? assignment.assignedDate)
  day.setHours(0, 0, 0, 0)
  const nextDay = new Date(day)
  nextDay.setDate(day.getDate() + 1)

  const setLogs = await prisma.setLog.findMany({
    where: { assignmentId },
    select: { exerciseId: true, weight: true, repsCompleted: true, repsTarget: true, rpe: true, estimated1RM: true },
  })

  const byExercise = new Map<string, typeof setLogs>()
  for (const set of setLogs) {
    const arr = byExercise.get(set.exerciseId) ?? []
    arr.push(set)
    byExercise.set(set.exerciseId, arr)
  }

  let created = 0
  let skipped = 0
  let prs = 0

  for (const [exerciseId, sets] of byExercise) {
    // Only loaded sets drive 1RM progression; bodyweight-only exercises are skipped.
    const loaded = sets.filter((s) => s.weight > 0 && s.repsCompleted > 0)
    if (loaded.length === 0) {
      skipped++
      continue
    }

    // Representative working set = heaviest (tie-break on estimated 1RM).
    const top = loaded.reduce((best, s) => {
      if (s.weight > best.weight) return s
      if (s.weight === best.weight && (s.estimated1RM ?? 0) > (best.estimated1RM ?? 0)) return s
      return best
    })

    // ProgressionTracking — idempotent per client/exercise/day.
    const existing = await prisma.progressionTracking.findFirst({
      where: { clientId, exerciseId, date: { gte: day, lt: nextDay } },
      select: { id: true },
    })
    if (existing) {
      skipped++
    } else {
      try {
        await calculateProgression({
          clientId,
          exerciseId,
          date: day,
          sets: sets.length,
          repsCompleted: top.repsCompleted,
          repsTarget: top.repsTarget ?? top.repsCompleted,
          actualLoad: top.weight,
          rpe: top.rpe ?? undefined,
        })
        created++
      } catch (error) {
        logger.warn('Assignment progression rollup failed for exercise', { assignmentId, exerciseId }, error)
      }
    }

    // Surface a 1RM PR (OneRepMaxHistory) when this session's best estimated 1RM
    // beats the stored max — mirrors /api/strength-pr/from-set. Independent of
    // the ProgressionTracking write (self-idempotent via the PR gate), best-effort.
    try {
      const bestE1RM = loaded.reduce((max, s) => Math.max(max, s.estimated1RM ?? 0), 0)
      if (bestE1RM > 0) {
        const latestPr = await prisma.oneRepMaxHistory.findFirst({
          where: { clientId, exerciseId, unit: 'KG' },
          orderBy: { date: 'desc' },
          select: { oneRepMax: true },
        })
        if (!latestPr || bestE1RM > latestPr.oneRepMax) {
          await prisma.oneRepMaxHistory.create({
            data: {
              clientId,
              exerciseId,
              date: day,
              oneRepMax: bestE1RM,
              source: 'ESTIMATED',
              unit: 'KG',
              notes: 'Auto-detected from logged session',
            },
          })
          prs++
        }
      }
    } catch (error) {
      logger.warn('Assignment PR rollup failed for exercise', { assignmentId, exerciseId }, error)
    }
  }

  return { created, skipped, prs }
}
