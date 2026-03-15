import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGenerateNutritionWrapped = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/nutrition/wrapped-generator', () => ({
  generateNutritionWrapped: mockGenerateNutritionWrapped,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/nutrition-wrapped/route'

describe('nutrition-wrapped cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.findMany.mockResolvedValue([])
    mockGenerateNutritionWrapped.mockResolvedValue({ ok: true })
  })

  it('processes clients in bounded batches', async () => {
    mockPrisma.client.findMany.mockResolvedValueOnce([
      { id: 'client-1' },
      { id: 'client-2' },
      { id: 'client-3' },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/nutrition-wrapped?limit=2&concurrency=2&pageSize=10',
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
      expect(body.processed).toBe(2)
      expect(body.monthlyGenerated).toBe(2)
      expect(body.yearlyGenerated).toBe(0)
      expect(body.hasMore).toBe(true)
      expect(mockGenerateNutritionWrapped).toHaveBeenCalledTimes(2)
      expect(mockGenerateNutritionWrapped).toHaveBeenNthCalledWith(
        1,
        'client-1',
        'MONTHLY',
        expect.any(Number),
        expect.any(Number)
      )
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/nutrition-wrapped', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong',
        },
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body).toEqual({ error: 'Unauthorized' })
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })
})
