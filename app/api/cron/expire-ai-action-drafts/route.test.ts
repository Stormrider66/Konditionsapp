import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockExpirePendingAiActionDrafts = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ai/capabilities/action-expiry', () => ({
  expirePendingAiActionDrafts: mockExpirePendingAiActionDrafts,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/expire-ai-action-drafts/route'

function request(url = 'http://localhost/api/cron/expire-ai-action-drafts', secret = 'secret') {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${secret}`,
    },
  })
}

describe('expire AI action drafts cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'secret'
    mockExpirePendingAiActionDrafts.mockResolvedValue({
      expiredCount: 4,
      scannedCount: 4,
      hasMore: false,
      cutoff: new Date('2026-06-06T10:00:00.000Z'),
    })
  })

  it('expires stale AI action drafts through GET', async () => {
    const response = await GET(request('http://localhost/api/cron/expire-ai-action-drafts?limit=25'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockExpirePendingAiActionDrafts).toHaveBeenCalledWith({ limit: 25 })
    expect(body).toMatchObject({
      success: true,
      expiredCount: 4,
      scannedCount: 4,
      hasMore: false,
      cutoff: '2026-06-06T10:00:00.000Z',
    })
    expect(body.durationMs).toEqual(expect.any(Number))
  })

  it('supports POST for manual cron testing', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockExpirePendingAiActionDrafts).toHaveBeenCalledWith({ limit: 500 })
  })

  it('caps oversized limits before calling the service', async () => {
    const response = await GET(request('http://localhost/api/cron/expire-ai-action-drafts?limit=9999'))

    expect(response.status).toBe(200)
    expect(mockExpirePendingAiActionDrafts).toHaveBeenCalledWith({ limit: 1000 })
  })

  it('rejects requests without the cron secret', async () => {
    const response = await GET(request('http://localhost/api/cron/expire-ai-action-drafts', 'wrong'))

    expect(response.status).toBe(401)
    expect(mockExpirePendingAiActionDrafts).not.toHaveBeenCalled()
  })
})
