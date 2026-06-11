import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockResetExpiredAiAllowanceAccounts = vi.hoisted(() => vi.fn())

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/ai/billing/allowance', () => ({
  resetExpiredAiAllowanceAccounts: mockResetExpiredAiAllowanceAccounts,
}))

import { POST } from '@/app/api/cron/reset-ai-usage/route'

describe('reset AI usage cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockResetExpiredAiAllowanceAccounts.mockResolvedValue({
      resetCount: 3,
      periodStart: new Date('2026-06-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-01T00:00:00.000Z'),
    })
  })

  it('resets expired allowance accounts', async () => {
    const request = new NextRequest('http://localhost/api/cron/reset-ai-usage', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockResetExpiredAiAllowanceAccounts).toHaveBeenCalledTimes(1)
    expect(mockResetExpiredAiAllowanceAccounts.mock.calls[0][0]).toBeInstanceOf(Date)
    expect(body).toMatchObject({
      success: true,
      allowanceResetCount: 3,
      allowancePeriodStart: '2026-06-01T00:00:00.000Z',
      allowancePeriodEnd: '2026-07-01T00:00:00.000Z',
    })
  })

  it('rejects requests without the cron secret', async () => {
    const request = new NextRequest('http://localhost/api/cron/reset-ai-usage', {
      method: 'POST',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mockResetExpiredAiAllowanceAccounts).not.toHaveBeenCalled()
  })
})
