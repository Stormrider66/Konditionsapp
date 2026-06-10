/**
 * Contract tests for the nightly strength progression sweep cron.
 *
 * The sweep is the safety net for assignment-logged strength: athletes who
 * log sets but never tap "complete" only get ProgressionTracking rows from
 * this job. Pin auth, the assignment selection window (past days only,
 * SKIPPED excluded, must have setLogs), per-assignment error isolation,
 * and result aggregation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    strengthSessionAssignment: { findMany: vi.fn() },
    workoutLog: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/training-engine/progression/assignment-rollup', () => ({
  rollupAssignmentProgression: vi.fn(),
}))

vi.mock('@/lib/training-engine/progression/workout-log-rollup', () => ({
  rollupWorkoutLogProgression: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { rollupAssignmentProgression } from '@/lib/training-engine/progression/assignment-rollup'
import { rollupWorkoutLogProgression } from '@/lib/training-engine/progression/workout-log-rollup'
import { POST as postCron } from '@/app/api/cron/strength-progression-sweep/route'

const SECRET = 'test-secret'

function buildRequest(auth: string | null) {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = auth
  return new NextRequest('http://localhost/api/cron/strength-progression-sweep', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/strength-progression-sweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    vi.mocked(prisma.strengthSessionAssignment.findMany).mockResolvedValue([])
    vi.mocked(prisma.workoutLog.findMany).mockResolvedValue([])
    vi.mocked(rollupAssignmentProgression).mockResolvedValue({ created: 0, skipped: 0, prs: 0 })
    vi.mocked(rollupWorkoutLogProgression).mockResolvedValue({ created: 0, skipped: 0, prs: 0 })
  })

  it('returns 500 when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(prisma.strengthSessionAssignment.findMany).not.toHaveBeenCalled()
  })

  it('rejects missing Authorization with 401', async () => {
    const res = await postCron(buildRequest(null))
    expect(res.status).toBe(401)
    expect(prisma.strengthSessionAssignment.findMany).not.toHaveBeenCalled()
  })

  it('rejects wrong bearer token with 401', async () => {
    const res = await postCron(buildRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(prisma.strengthSessionAssignment.findMany).not.toHaveBeenCalled()
  })

  it('runs successfully with zero matching assignments and workout logs', async () => {
    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.assignments).toBe(0)
    expect(body.workoutLogs).toBe(0)
    expect(rollupAssignmentProgression).not.toHaveBeenCalled()
    expect(rollupWorkoutLogProgression).not.toHaveBeenCalled()
  })

  it('selects only past-day, non-SKIPPED assignments that have setLogs', async () => {
    await postCron(buildRequest(`Bearer ${SECRET}`))
    const where = vi.mocked(prisma.strengthSessionAssignment.findMany).mock.calls[0][0]?.where
    expect(where?.status).toEqual({ not: 'SKIPPED' })
    expect(where?.setLogs).toEqual({ some: {} })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(where?.assignedDate).toMatchObject({ lt: today })
    expect((where?.assignedDate as { gte: Date }).gte.getTime()).toBeLessThan(today.getTime())
  })

  it('rolls up each assignment and aggregates results', async () => {
    vi.mocked(prisma.strengthSessionAssignment.findMany).mockResolvedValue([
      { id: 'a-1', status: 'SCHEDULED' },
      { id: 'a-2', status: 'COMPLETED' },
    ] as never)
    vi.mocked(rollupAssignmentProgression)
      .mockResolvedValueOnce({ created: 2, skipped: 1, prs: 1 })
      .mockResolvedValueOnce({ created: 0, skipped: 3, prs: 0 })

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(rollupAssignmentProgression).toHaveBeenCalledWith('a-1')
    expect(rollupAssignmentProgression).toHaveBeenCalledWith('a-2')
    expect(body).toMatchObject({ assignments: 2, created: 2, skipped: 4, prs: 1, errors: 0 })
  })

  it('selects workout logs with setLogs by completedAt, falling back to createdAt', async () => {
    await postCron(buildRequest(`Bearer ${SECRET}`))
    const where = vi.mocked(prisma.workoutLog.findMany).mock.calls[0][0]?.where
    expect(where?.setLogs).toEqual({ some: {} })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(where?.OR?.[0]).toMatchObject({ completedAt: { lt: today } })
    expect(where?.OR?.[1]).toMatchObject({ completedAt: null, createdAt: { lt: today } })
  })

  it('rolls up workout logs and aggregates their results with assignments', async () => {
    vi.mocked(prisma.strengthSessionAssignment.findMany).mockResolvedValue([
      { id: 'a-1', status: 'SCHEDULED' },
    ] as never)
    vi.mocked(prisma.workoutLog.findMany).mockResolvedValue([{ id: 'wl-1' }, { id: 'wl-2' }] as never)
    vi.mocked(rollupAssignmentProgression).mockResolvedValueOnce({ created: 1, skipped: 0, prs: 0 })
    vi.mocked(rollupWorkoutLogProgression)
      .mockResolvedValueOnce({ created: 2, skipped: 1, prs: 1 })
      .mockResolvedValueOnce({ created: 0, skipped: 2, prs: 0 })

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(rollupWorkoutLogProgression).toHaveBeenCalledWith('wl-1')
    expect(rollupWorkoutLogProgression).toHaveBeenCalledWith('wl-2')
    expect(body).toMatchObject({ assignments: 1, workoutLogs: 2, created: 3, skipped: 3, prs: 1, errors: 0 })
  })

  it('isolates per-assignment failures and keeps sweeping', async () => {
    vi.mocked(prisma.strengthSessionAssignment.findMany).mockResolvedValue([
      { id: 'a-1', status: 'SCHEDULED' },
      { id: 'a-2', status: 'SCHEDULED' },
    ] as never)
    vi.mocked(rollupAssignmentProgression)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ created: 1, skipped: 0, prs: 0 })

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ assignments: 2, created: 1, errors: 1 })
  })
})
