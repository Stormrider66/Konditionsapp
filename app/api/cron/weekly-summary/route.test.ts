import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSaveWeeklySummary = vi.hoisted(() => vi.fn())
const mockSaveMonthlySummary = vi.hoisted(() => vi.fn())
const mockGenerateVisualReport = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/training/summary-calculator', () => ({
  saveWeeklySummary: mockSaveWeeklySummary,
  saveMonthlySummary: mockSaveMonthlySummary,
}))

vi.mock('@/lib/ai/visual-reports', () => ({
  generateVisualReport: mockGenerateVisualReport,
}))

import { GET } from '@/app/api/cron/weekly-summary/route'

describe('weekly-summary cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveWeeklySummary.mockResolvedValue('weekly-summary-id')
    mockSaveMonthlySummary.mockResolvedValue('monthly-summary-id')
    mockGenerateVisualReport.mockResolvedValue('report-id')
    mockPrisma.client.findMany.mockResolvedValue([])
  })

  it('processes athletes in bounded batches', async () => {
    mockPrisma.client.findMany.mockResolvedValueOnce([
      { id: 'client-1', name: 'Athlete 1', userId: 'coach-1' },
      { id: 'client-2', name: 'Athlete 2', userId: 'coach-2' },
      { id: 'client-3', name: 'Athlete 3', userId: 'coach-3' },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/weekly-summary?limit=2&concurrency=2&pageSize=10',
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
      expect(body.results.weeklySummariesCreated).toBe(2)
      expect(body.results.monthlySummariesUpdated).toBe(2)
      expect(body.results.visualReportsGenerated).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockSaveWeeklySummary).toHaveBeenCalledTimes(2)
      expect(mockSaveMonthlySummary).toHaveBeenCalledTimes(2)
      expect(mockGenerateVisualReport).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/weekly-summary', {
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
