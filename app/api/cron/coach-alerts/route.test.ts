import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
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
  test: {
    findMany: vi.fn(),
  },
  coachAlert: {
    findMany: vi.fn(),
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
    mockPrisma.test.findMany.mockResolvedValue([])
    mockPrisma.coachAlert.findMany.mockResolvedValue([])
    mockPrisma.coachAlert.findFirst.mockResolvedValue(null)
    mockPrisma.coachAlert.create.mockResolvedValue({ id: 'alert-1' })
    mockPrisma.user.findUnique.mockResolvedValue({ language: 'en' })
  })

  afterEach(() => {
    vi.useRealTimers()
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
      expect(body.byType.COACH_OPS_OVERDUE).toBe(0)
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

  it('creates a deduped overdue coach ops alert for stale test reviews', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T09:00:00.000Z'))
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'athlete-1', name: 'Athlete 1', userId: 'coach-1' },
    ])
    mockPrisma.dailyCheckIn.findMany.mockResolvedValue([])
    mockPrisma.test.findMany.mockResolvedValue([
      {
        id: 'test-1',
        testType: 'RUNNING',
        updatedAt: new Date('2026-06-12T09:00:00.000Z'),
      },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/coach-alerts?limit=1', {
        method: 'GET',
        headers: {
          authorization: 'Bearer secret',
        },
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.alertsCreated).toBe(1)
      expect(body.byType.COACH_OPS_OVERDUE).toBe(1)
      expect(mockPrisma.coachAlert.findFirst).toHaveBeenCalledWith({
        where: {
          coachId: 'coach-1',
          clientId: 'athlete-1',
          alertType: 'COACH_OPS_OVERDUE',
          sourceId: 'coach_ops_overdue:athlete-1',
          status: { in: ['ACTIVE', 'SNOOZED', 'ACTIONED'] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date('2026-06-17T09:00:00.000Z') } },
          ],
        },
      })
      expect(mockPrisma.coachAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          coachId: 'coach-1',
          clientId: 'athlete-1',
          alertType: 'COACH_OPS_OVERDUE',
          severity: 'MEDIUM',
          title: 'Athlete 1: Overdue coach follow-up',
          sourceId: 'coach_ops_overdue:athlete-1',
          contextData: expect.objectContaining({
            staleTestReviewIds: ['test-1'],
          }),
        }),
      })
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })
})
