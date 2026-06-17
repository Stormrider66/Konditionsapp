/**
 * Contract tests for the nightly ACWR cron.
 *
 * ACWR drives injury risk classification for every active athlete. A
 * silent bug here either misses athletes (they never get their daily
 * load recorded) or miscategorizes them (a DANGER athlete reads
 * OPTIMAL). Pin auth, batched processing, idempotent re-runs, and the
 * zone boundary math.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findMany: vi.fn() },
    trainingLoad: { findMany: vi.fn(), groupBy: vi.fn(), createMany: vi.fn() },
    stravaActivity: { findMany: vi.fn() },
    garminActivity: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '@/lib/prisma'
import { POST as postCron } from '@/app/api/cron/calculate-acwr/route'

const SECRET = 'test-secret'

function buildRequest(auth: string | null) {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = auth
  return new NextRequest('http://localhost/api/cron/calculate-acwr', {
    method: 'POST',
    headers,
  })
}

function createManyArgs() {
  return vi.mocked(prisma.trainingLoad.createMany).mock.calls[0]?.[0] as {
    data: Array<Record<string, unknown>>
  }
}

describe('POST /api/cron/calculate-acwr', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    // No summaries written yet today
    vi.mocked(prisma.trainingLoad.findMany).mockResolvedValue([])
    // No workout load yesterday
    vi.mocked(prisma.trainingLoad.groupBy).mockResolvedValue([] as never)
    vi.mocked(prisma.stravaActivity.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.garminActivity.findMany).mockResolvedValue([] as never)
    // No prior ACWR carrier entries
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
    vi.mocked(prisma.trainingLoad.createMany).mockImplementation(
      (async (args: { data: unknown[] }) => ({ count: args.data.length })) as never
    )
  })

  it('returns 500 when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(prisma.client.findMany).not.toHaveBeenCalled()
  })

  it('rejects missing Authorization with 401', async () => {
    const res = await postCron(buildRequest(null))
    expect(res.status).toBe(401)
    expect(prisma.client.findMany).not.toHaveBeenCalled()
  })

  it('rejects wrong bearer token with 401', async () => {
    const res = await postCron(buildRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(prisma.client.findMany).not.toHaveBeenCalled()
  })

  it('runs successfully with zero athletes and creates nothing', async () => {
    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.processed).toBe(0)
    expect(body.updated).toBe(0)
    expect(body.errors).toBe(0)
    expect(prisma.trainingLoad.createMany).not.toHaveBeenCalled()
  })

  it('creates a TrainingLoad row per active athlete in one batched write', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
      { id: 'client-2', name: 'Bob' },
    ] as never)

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updated).toBe(2)
    expect(body.processed).toBe(2)
    expect(prisma.trainingLoad.createMany).toHaveBeenCalledTimes(1)
    expect(createManyArgs().data).toHaveLength(2)
    expect(createManyArgs().data.map((r) => r.clientId)).toEqual([
      'client-1',
      'client-2',
    ])
    expect((createManyArgs().data[0].date as Date).getUTCHours()).toBe(0)
  })

  it('skips athletes that already have a summary today — re-runs are idempotent', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
      { id: 'client-2', name: 'Bob' },
    ] as never)
    // client-1 was already processed by an earlier (partial) run today.
    vi.mocked(prisma.trainingLoad.findMany).mockResolvedValue([
      { clientId: 'client-1' },
    ] as never)

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skipped).toBe(1)
    expect(body.processed).toBe(1)
    expect(body.updated).toBe(1)
    expect(createManyArgs().data.map((r) => r.clientId)).toEqual(['client-2'])
  })

  it('is a no-op when every athlete already has a summary today', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as never)
    vi.mocked(prisma.trainingLoad.findMany).mockResolvedValue([
      { clientId: 'client-1' },
    ] as never)

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.skipped).toBe(1)
    expect(body.updated).toBe(0)
    expect(prisma.trainingLoad.createMany).not.toHaveBeenCalled()
  })

  it('classifies an athlete with elevated acute load into CRITICAL zone', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as never)
    // Yesterday's workout rows sum to 300 (e.g. strength 180 + team
    // practice 120 — the grouped sum covers all workout-sourced rows).
    vi.mocked(prisma.trainingLoad.groupBy).mockResolvedValue([
      { clientId: 'client-1', _sum: { dailyLoad: 300 } },
    ] as never)
    // Most-recent carrier entry with prior EWMA values
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { clientId: 'client-1', acuteLoad: 60, chronicLoad: 50 },
    ])

    await postCron(buildRequest(`Bearer ${SECRET}`))

    // Acute new = 0.4*300 + 0.6*60 = 156.
    // Chronic new = 0.1*300 + 0.9*50 = 75.
    // ACWR = 156/75 ≈ 2.08 → CRITICAL, VERY_HIGH.
    const row = createManyArgs().data[0]
    expect(row.acwrZone).toBe('CRITICAL')
    expect(row.injuryRisk).toBe('VERY_HIGH')
    expect(row.dailyLoad).toBe(300)
    expect(row.acuteLoad).toBeCloseTo(156, 0)
    expect(row.chronicLoad).toBeCloseTo(75, 0)
  })

  it('adds synced activity TSS to yesterday workout load', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as never)
    vi.mocked(prisma.trainingLoad.groupBy).mockResolvedValue([
      { clientId: 'client-1', _sum: { dailyLoad: 20 } },
    ] as never)
    vi.mocked(prisma.garminActivity.findMany).mockResolvedValue([
      {
        id: 'garmin-1',
        clientId: 'client-1',
        startDate: new Date('2026-06-16T08:00:00.000Z'),
        duration: 1800,
        distance: 5000,
        mappedType: 'RUNNING',
        type: 'RUNNING',
        tss: 40,
        trimp: null,
        averageHeartrate: 150,
      },
    ] as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { clientId: 'client-1', acuteLoad: 30, chronicLoad: 40 },
    ])

    await postCron(buildRequest(`Bearer ${SECRET}`))

    const row = createManyArgs().data[0]
    expect(row.dailyLoad).toBe(60)
    expect(row.acuteLoad).toBeCloseTo(42, 0)
    expect(row.chronicLoad).toBeCloseTo(42, 0)
    expect(prisma.garminActivity.findMany).toHaveBeenCalled()
  })

  it('deduplicates same-session synced activities before storing ACWR load', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as never)
    vi.mocked(prisma.garminActivity.findMany).mockResolvedValue([
      {
        id: 'garmin-1',
        clientId: 'client-1',
        startDate: new Date('2026-06-16T08:00:00.000Z'),
        duration: 1800,
        distance: 5000,
        mappedType: 'RUNNING',
        type: 'RUNNING',
        tss: 40,
        trimp: null,
        averageHeartrate: 150,
      },
    ] as never)
    vi.mocked(prisma.stravaActivity.findMany).mockResolvedValue([
      {
        id: 'strava-1',
        clientId: 'client-1',
        stravaId: 'external-strava-1',
        startDate: new Date('2026-06-16T08:02:00.000Z'),
        movingTime: 1810,
        distance: 5010,
        mappedType: 'RUNNING',
        type: 'Run',
        tss: 55,
        trimp: null,
        averageHeartrate: 151,
      },
    ] as never)

    await postCron(buildRequest(`Bearer ${SECRET}`))

    const row = createManyArgs().data[0]
    expect(row.dailyLoad).toBe(55)
  })

  it('seeds EWMA from the daily load when no prior training load exists', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as never)
    // No yesterday load (groupBy empty from beforeEach), no prior entry.

    await postCron(buildRequest(`Bearer ${SECRET}`))

    // dailyTSS = 0, previousEWMA = null → acute = 0, chronic = 0,
    // ACWR = 0 (chronic guard avoids divide-by-zero) → DETRAINING, LOW.
    const row = createManyArgs().data[0]
    expect(row.acwr).toBe(0)
    expect(row.acwrZone).toBe('DETRAINING')
    expect(row.injuryRisk).toBe('LOW')
  })
})
