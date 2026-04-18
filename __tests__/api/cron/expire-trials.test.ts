/**
 * Contract tests for the expire-trials cron.
 *
 * Pins the security boundary and the core state-transition. Silent
 * failures here leave expired trials stuck in TRIAL status, effectively
 * giving paid features away indefinitely.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: { findMany: vi.fn(), update: vi.fn() },
    athleteSubscription: { findMany: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  getTrialExpiredEmailTemplate: vi.fn(() => ({
    subject: 'Trial expired',
    html: '<p>expired</p>',
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { POST as postExpireTrials } from '@/app/api/cron/expire-trials/route'
import { NextRequest } from 'next/server'

const SECRET = 'test-secret'

function buildRequest(auth: string | null) {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = auth
  return new NextRequest('http://localhost/api/cron/expire-trials', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/expire-trials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([])
    vi.mocked(prisma.athleteSubscription.findMany).mockResolvedValue([])
  })

  it('returns 500 when CRON_SECRET is not set (fail loud, never run)', async () => {
    delete process.env.CRON_SECRET
    const res = await postExpireTrials(buildRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(prisma.subscription.findMany).not.toHaveBeenCalled()
    expect(prisma.athleteSubscription.findMany).not.toHaveBeenCalled()
  })

  it('rejects missing Authorization header with 401', async () => {
    const res = await postExpireTrials(buildRequest(null))
    expect(res.status).toBe(401)
    expect(prisma.subscription.findMany).not.toHaveBeenCalled()
  })

  it('rejects wrong bearer token with 401', async () => {
    const res = await postExpireTrials(buildRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(prisma.subscription.findMany).not.toHaveBeenCalled()
  })

  it('completes with zero processed when there are no expired trials', async () => {
    const res = await postExpireTrials(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.processed).toBe(0)
    expect(body.exhausted).toBe(true)
  })

  it('marks expired coach trials as EXPIRED and attempts email', async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([
        {
          id: 'sub-c1',
          userId: 'user-1',
          user: { id: 'user-1', email: 'coach@example.com', name: 'Coach', language: 'sv' },
        } as any,
      ])
      .mockResolvedValueOnce([])
    vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

    const res = await postExpireTrials(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.coachExpired).toBe(1)
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-c1' },
      data: { status: 'EXPIRED' },
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(body.emailsSent).toBe(1)
  })

  it('expires athlete trials after coach trials in the same run', async () => {
    vi.mocked(prisma.subscription.findMany)
      .mockResolvedValueOnce([])
    vi.mocked(prisma.athleteSubscription.findMany)
      .mockResolvedValueOnce([
        {
          id: 'sub-a1',
          clientId: 'client-1',
          client: {
            id: 'client-1',
            name: 'Athlete',
            email: 'athlete@example.com',
            athleteAccount: null,
          },
        } as any,
      ])
      .mockResolvedValueOnce([])
    vi.mocked(prisma.athleteSubscription.update).mockResolvedValue({} as any)

    const res = await postExpireTrials(buildRequest(`Bearer ${SECRET}`))
    const body = await res.json()

    expect(body.athleteExpired).toBe(1)
    expect(prisma.athleteSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-a1' },
      data: { status: 'EXPIRED' },
    })
  })
})
