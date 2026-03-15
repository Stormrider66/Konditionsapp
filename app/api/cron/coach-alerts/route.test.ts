import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
  dailyCheckIn: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  strengthSessionAssignment: {
    findMany: vi.fn(),
  },
  cardioSessionAssignment: {
    findMany: vi.fn(),
  },
  conversationMemory: {
    findMany: vi.fn(),
  },
  trainingLoad: {
    findFirst: vi.fn(),
  },
  coachAlert: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/coach-alerts/route'

describe('coach-alerts cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.dailyCheckIn.findMany.mockResolvedValue([
      { date: new Date('2026-03-15T08:00:00Z'), readinessScore: 4.2 },
      { date: new Date('2026-03-14T08:00:00Z'), readinessScore: 4.4 },
      { date: new Date('2026-03-13T08:00:00Z'), readinessScore: 4.1 },
    ])
    mockPrisma.dailyCheckIn.count.mockResolvedValue(2)
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValue(null)
    mockPrisma.strengthSessionAssignment.findMany.mockResolvedValue([])
    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValue([])
    mockPrisma.conversationMemory.findMany.mockResolvedValue([])
    mockPrisma.trainingLoad.findFirst.mockResolvedValue(null)
    mockPrisma.coachAlert.findFirst.mockResolvedValue(null)
    mockPrisma.coachAlert.create.mockResolvedValue({ id: 'alert-1' })
  })

  it('processes athletes in bounded batches', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'athlete-1', name: 'Athlete 1', userId: 'coach-1' },
      { id: 'athlete-2', name: 'Athlete 2', userId: 'coach-2' },
      { id: 'athlete-3', name: 'Athlete 3', userId: 'coach-3' },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/coach-alerts?limit=2&concurrency=2&pageSize=10',
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
      expect(body.alertsCreated).toBe(2)
      expect(body.byType.READINESS_DROP).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockPrisma.coachAlert.create).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/coach-alerts', {
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
