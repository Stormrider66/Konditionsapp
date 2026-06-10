// lib/training-engine/progression/workout-log-rollup.ts
//
// Roll up a WorkoutLog's logged SetLogs (program-workout strength path,
// WorkoutFocusMode) into ProgressionTracking + OneRepMaxHistory via the shared
// setlog-rollup core. Counterpart to assignment-rollup.ts for the other SetLog
// parent.
//
// WorkoutLog.athleteId is a USER id (unlike StrengthSessionAssignment.athleteId,
// which is a Client id) — progression tables key on Client id, so the user is
// mapped via AthleteAccount, falling back to selfAthleteClientId for coaches
// training in athlete mode. Logs whose user has no client record are skipped.

import { prisma } from '@/lib/prisma'
import { rollupSetLogs, type SetLogRollupResult } from './setlog-rollup'

export async function rollupWorkoutLogProgression(workoutLogId: string): Promise<SetLogRollupResult> {
  const log = await prisma.workoutLog.findUnique({
    where: { id: workoutLogId },
    select: { id: true, athleteId: true, completedAt: true, createdAt: true },
  })
  if (!log) return { created: 0, skipped: 0, prs: 0 }

  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: log.athleteId },
    select: { clientId: true },
  })
  let clientId = athleteAccount?.clientId ?? null
  if (!clientId) {
    const user = await prisma.user.findUnique({
      where: { id: log.athleteId },
      select: { selfAthleteClientId: true },
    })
    clientId = user?.selfAthleteClientId ?? null
  }
  if (!clientId) return { created: 0, skipped: 0, prs: 0 }

  const setLogs = await prisma.setLog.findMany({
    where: { workoutLogId },
    select: { exerciseId: true, weight: true, repsCompleted: true, repsTarget: true, rpe: true, estimated1RM: true },
  })
  if (setLogs.length === 0) return { created: 0, skipped: 0, prs: 0 }

  return rollupSetLogs(clientId, log.completedAt ?? log.createdAt, setLogs, { workoutLogId })
}
