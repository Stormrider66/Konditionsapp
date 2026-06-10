/**
 * Unit tests for rollupWorkoutLogProgression.
 *
 * The WorkoutLog path is the only SetLog parent keyed by USER id —
 * progression tables key on Client id, so the user→client mapping
 * (AthleteAccount, then selfAthleteClientId for coaches in athlete mode)
 * is the part that can silently drop an athlete's logged work. Pin the
 * mapping, the no-client and no-sets early returns, and the rollup day
 * (completedAt, falling back to createdAt).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workoutLog: { findUnique: vi.fn() },
    athleteAccount: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    setLog: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/training-engine/progression/setlog-rollup', () => ({
  rollupSetLogs: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { rollupSetLogs } from '@/lib/training-engine/progression/setlog-rollup'
import { rollupWorkoutLogProgression } from '@/lib/training-engine/progression/workout-log-rollup'

const COMPLETED_AT = new Date('2026-06-08T18:30:00Z')
const CREATED_AT = new Date('2026-06-08T17:00:00Z')

const LOG = { id: 'wl-1', athleteId: 'user-1', completedAt: COMPLETED_AT, createdAt: CREATED_AT }
const SETS = [
  { exerciseId: 'ex-1', weight: 100, repsCompleted: 5, repsTarget: 5, rpe: 8, estimated1RM: null },
]

describe('rollupWorkoutLogProgression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.workoutLog.findUnique).mockResolvedValue(LOG as never)
    vi.mocked(prisma.athleteAccount.findUnique).mockResolvedValue({ clientId: 'client-1' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ selfAthleteClientId: null } as never)
    vi.mocked(prisma.setLog.findMany).mockResolvedValue(SETS as never)
    vi.mocked(rollupSetLogs).mockResolvedValue({ created: 1, skipped: 0, prs: 1 })
  })

  it('returns zeros for a missing workout log', async () => {
    vi.mocked(prisma.workoutLog.findUnique).mockResolvedValue(null)
    const result = await rollupWorkoutLogProgression('missing')
    expect(result).toEqual({ created: 0, skipped: 0, prs: 0 })
    expect(rollupSetLogs).not.toHaveBeenCalled()
  })

  it('maps the user to a client via AthleteAccount and rolls up on completedAt day', async () => {
    const result = await rollupWorkoutLogProgression('wl-1')
    expect(prisma.athleteAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    )
    expect(rollupSetLogs).toHaveBeenCalledWith('client-1', COMPLETED_AT, SETS, { workoutLogId: 'wl-1' })
    expect(result).toEqual({ created: 1, skipped: 0, prs: 1 })
  })

  it('falls back to selfAthleteClientId for coaches in athlete mode', async () => {
    vi.mocked(prisma.athleteAccount.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ selfAthleteClientId: 'client-self' } as never)
    await rollupWorkoutLogProgression('wl-1')
    expect(rollupSetLogs).toHaveBeenCalledWith('client-self', COMPLETED_AT, SETS, { workoutLogId: 'wl-1' })
  })

  it('returns zeros when the user has no client record at all', async () => {
    vi.mocked(prisma.athleteAccount.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ selfAthleteClientId: null } as never)
    const result = await rollupWorkoutLogProgression('wl-1')
    expect(result).toEqual({ created: 0, skipped: 0, prs: 0 })
    expect(rollupSetLogs).not.toHaveBeenCalled()
  })

  it('returns zeros without rolling up when the log has no set logs', async () => {
    vi.mocked(prisma.setLog.findMany).mockResolvedValue([])
    const result = await rollupWorkoutLogProgression('wl-1')
    expect(result).toEqual({ created: 0, skipped: 0, prs: 0 })
    expect(rollupSetLogs).not.toHaveBeenCalled()
  })

  it('uses createdAt as the rollup day when the log was never completed', async () => {
    vi.mocked(prisma.workoutLog.findUnique).mockResolvedValue({ ...LOG, completedAt: null } as never)
    await rollupWorkoutLogProgression('wl-1')
    expect(rollupSetLogs).toHaveBeenCalledWith('client-1', CREATED_AT, SETS, { workoutLogId: 'wl-1' })
  })
})
