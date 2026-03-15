import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockAnalyzeAllAthletes = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ai/pattern-detector', () => ({
  analyzeAllAthletes: mockAnalyzeAllAthletes,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/pattern-detection/route'

describe('pattern-detection cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAnalyzeAllAthletes.mockResolvedValue({
      scanned: 3,
      processed: 2,
      alertsCreated: 1,
      skipped: 1,
      errors: 0,
      exhausted: false,
      timedOut: false,
      hasMore: true,
    })
  })

  it('forwards bounded batch parameters to the service', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/pattern-detection?limit=2&concurrency=2&pageSize=50&budgetMs=45000',
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer secret',
          },
        }
      )

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.results.processed).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockAnalyzeAllAthletes).toHaveBeenCalledWith({
        batchLimit: 2,
        pageSize: 50,
        concurrency: 2,
        executionBudgetMs: 45000,
      })
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/pattern-detection', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong',
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })
})
