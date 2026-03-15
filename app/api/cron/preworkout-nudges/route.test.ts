import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockFindUpcomingWorkouts = vi.hoisted(() => vi.fn())
const mockCreatePreWorkoutNudge = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/ai/preworkout-nudge-generator', () => ({
  findUpcomingWorkouts: mockFindUpcomingWorkouts,
  createPreWorkoutNudge: mockCreatePreWorkoutNudge,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/preworkout-nudges/route'

describe('preworkout-nudges cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUpcomingWorkouts.mockResolvedValue([
      {
        id: 'workout-1',
        type: 'program',
        name: 'Morning run',
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      },
    ])
    mockCreatePreWorkoutNudge.mockResolvedValue('nudge-1')
  })

  it('processes athletes in bounded batches', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'athlete-1',
        userId: 'coach-1',
        aiNotificationPrefs: {
          preWorkoutNudgeEnabled: true,
          preWorkoutLeadTime: 120,
        },
      },
      {
        id: 'athlete-2',
        userId: 'coach-2',
        aiNotificationPrefs: {
          preWorkoutNudgeEnabled: true,
          preWorkoutLeadTime: 120,
        },
      },
      {
        id: 'athlete-3',
        userId: 'coach-3',
        aiNotificationPrefs: {
          preWorkoutNudgeEnabled: true,
          preWorkoutLeadTime: 120,
        },
      },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/preworkout-nudges?limit=2&concurrency=2&pageSize=10',
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
      expect(body.results.nudgesCreated).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockCreatePreWorkoutNudge).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/preworkout-nudges', {
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
