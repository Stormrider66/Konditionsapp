// lib/training-engine/progression/setlog-rollup.ts
//
// Shared core for rolling logged strength sets up into ProgressionTracking +
// OneRepMaxHistory — the aggregate tables the Progression Dashboard, PR
// tracking, and "most-trained exercises" surfaces read. Used by both SetLog
// parents: StrengthSessionAssignment (assignment-rollup.ts) and WorkoutLog
// (workout-log-rollup.ts).
//
// One record per LOADED exercise (heaviest working set is the representative).
// Bodyweight-only exercises are skipped — there's no load to progress.
// Idempotent: skips an exercise that already has a record for the same day.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculateProgression } from './index'
import { calculateEpley1RM } from './rm-estimation'

export interface SetLogRollupResult {
  created: number
  skipped: number
  prs: number
}

export interface RollupSet {
  exerciseId: string
  weight: number
  repsCompleted: number
  repsTarget: number | null
  rpe: number | null
  estimated1RM: number | null
}

/** Stored per-set estimate when available (assignment path), Epley otherwise (WorkoutLog path). */
function setEstimated1RM(set: RollupSet): number {
  if (set.estimated1RM && set.estimated1RM > 0) return set.estimated1RM
  if (set.weight > 0 && set.repsCompleted > 0) return calculateEpley1RM(set.weight, set.repsCompleted)
  return 0
}

export async function rollupSetLogs(
  clientId: string,
  sessionDay: Date,
  setLogs: RollupSet[],
  logContext: Record<string, string>
): Promise<SetLogRollupResult> {
  const day = new Date(sessionDay)
  day.setHours(0, 0, 0, 0)
  const nextDay = new Date(day)
  nextDay.setDate(day.getDate() + 1)

  const byExercise = new Map<string, RollupSet[]>()
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
      if (s.weight === best.weight && setEstimated1RM(s) > setEstimated1RM(best)) return s
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
        logger.warn('Set-log progression rollup failed for exercise', { ...logContext, exerciseId }, error)
      }
    }

    // Surface a 1RM PR (OneRepMaxHistory) when this session's best estimated 1RM
    // beats the stored max — mirrors /api/strength-pr/from-set. Independent of
    // the ProgressionTracking write (self-idempotent via the PR gate), best-effort.
    try {
      const bestE1RM = loaded.reduce((max, s) => Math.max(max, setEstimated1RM(s)), 0)
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
      logger.warn('Set-log PR rollup failed for exercise', { ...logContext, exerciseId }, error)
    }
  }

  return { created, skipped, prs }
}
