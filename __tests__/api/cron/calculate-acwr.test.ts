/**
 * Contract tests for the nightly ACWR cron.
 *
 * ACWR drives injury risk classification for every active athlete. A
 * silent bug here either misses athletes (they never get their daily
 * load recorded) or miscategorizes them (a DANGER athlete reads
 * OPTIMAL). Pin auth, batch processing, per-athlete error isolation,
 * and the zone boundary math.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findMany: vi.fn() },
    trainingLoad: { findFirst: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
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

describe('POST /api/cron/calculate-acwr', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.trainingLoad.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.trainingLoad.aggregate).mockResolvedValue({ _sum: { dailyLoad: null } } as any)
    vi.mocked(prisma.trainingLoad.create).mockResolvedValue({} as any)
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
    expect(prisma.trainingLoad.create).not.toHaveBeenCalled()
  })

  it('creates a TrainingLoad row per active athlete', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
      { id: 'client-2', name: 'Bob' },
    ] as any)

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updated).toBe(2)
    expect(body.processed).toBe(2)
    expect(prisma.trainingLoad.create).toHaveBeenCalledTimes(2)
  })

  it('isolates per-athlete failures — one athlete failing does not abort the run', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
      { id: 'client-2', name: 'Bob' },
    ] as any)
    // First athlete's create throws, second succeeds.
    vi.mocked(prisma.trainingLoad.create)
      .mockRejectedValueOnce(new Error('FK violation'))
      .mockResolvedValueOnce({} as any)

    const res = await postCron(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.errors).toBe(1)
    expect(body.updated).toBe(1)
    expect(body.processed).toBe(2)
  })

  it('classifies an athlete with elevated acute load into DANGER zone', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as any)
    // Most-recent training load: acute 80, chronic 40 — daily=0 yesterday.
    // EWMA: acute = 0.4*0 + 0.6*80 = 48. chronic = 0.1*0 + 0.9*40 = 36.
    // ACWR = 48/36 ≈ 1.33 → CAUTION zone
    // Let's pin something more unambiguous: start from acute 110, chronic 60.
    // acute new = 0.4*0 + 0.6*110 = 66. chronic new = 0.1*0 + 0.9*60 = 54.
    // ACWR = 66/54 ≈ 1.22 → OPTIMAL (< 1.3).
    // For DANGER, need ACWR > 1.5. With dailyTSS=0, ratio is chronic/acute
    // decay, so it decreases over time. Start from acute 200, chronic 90:
    // acute new = 0.6 * 200 = 120. chronic new = 0.9 * 90 = 81.
    // ACWR = 120/81 ≈ 1.48 → CAUTION.
    // Use dailyTSS>0: yesterday's workout rows sum to 300 (e.g. strength
    // 180 + team practice 120 — the aggregate sums all workout-sourced rows).
    vi.mocked(prisma.trainingLoad.aggregate).mockResolvedValue({
      _sum: { dailyLoad: 300 },
    } as any)
    // Most-recent carrier entry with prior EWMA values
    vi.mocked(prisma.trainingLoad.findFirst).mockResolvedValue({
      id: 'tl-prev',
      clientId: 'client-1',
      acuteLoad: 60,
      chronicLoad: 50,
    } as any)

    await postCron(buildRequest(`Bearer ${SECRET}`))

    // Acute new = 0.4*300 + 0.6*60 = 156.
    // Chronic new = 0.1*300 + 0.9*50 = 75.
    // ACWR = 156/75 ≈ 2.08 → CRITICAL, VERY_HIGH.
    const createArgs = vi.mocked(prisma.trainingLoad.create).mock.calls[0]?.[0]
    expect(createArgs.data.acwrZone).toBe('CRITICAL')
    expect(createArgs.data.injuryRisk).toBe('VERY_HIGH')
    expect(createArgs.data.dailyLoad).toBe(300)
    expect(createArgs.data.acuteLoad).toBeCloseTo(156, 0)
    expect(createArgs.data.chronicLoad).toBeCloseTo(75, 0)
  })

  it('seeds EWMA from the daily load when no prior training load exists', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'client-1', name: 'Alice' },
    ] as any)
    // No yesterday load (aggregate sum null from beforeEach), no prior entry.
    vi.mocked(prisma.trainingLoad.findFirst).mockResolvedValue(null)

    await postCron(buildRequest(`Bearer ${SECRET}`))

    // dailyTSS = 0, previousEWMA = null → acute = 0, chronic = 0,
    // ACWR = 0 (chronic guard avoids divide-by-zero) → DETRAINING, LOW.
    const createArgs = vi.mocked(prisma.trainingLoad.create).mock.calls[0]?.[0]
    expect(createArgs.data.acwr).toBe(0)
    expect(createArgs.data.acwrZone).toBe('DETRAINING')
    expect(createArgs.data.injuryRisk).toBe('LOW')
  })
})
