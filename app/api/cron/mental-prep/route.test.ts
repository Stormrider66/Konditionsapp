import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGenerateMentalPrepContent = vi.hoisted(() => vi.fn())
const mockGetPrepTypeForDay = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  race: {
    findMany: vi.fn(),
  },
  aINotification: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/ai/mental-prep-generator', () => ({
  generateMentalPrepContent: mockGenerateMentalPrepContent,
  getPrepTypeForDay: mockGetPrepTypeForDay,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/cron/mental-prep/route'

describe('mental-prep cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPrepTypeForDay.mockReturnValue('VISUALIZATION')
    mockGenerateMentalPrepContent.mockResolvedValue({
      prepType: 'VISUALIZATION',
      daysUntilRace: 3,
      title: 'Race focus',
      subtitle: 'See the course',
      mainContent: 'Visualize your race.',
      preview: 'Prepare mentally for race day.',
      bulletPoints: ['Start calm', 'Trust your plan'],
    })
    mockPrisma.aINotification.findFirst.mockResolvedValue(null)
    mockPrisma.aINotification.create.mockResolvedValue({ id: 'notification-1' })
  })

  it('processes races in bounded batches', async () => {
    const raceDate = new Date()
    raceDate.setDate(raceDate.getDate() + 3)

    mockPrisma.race.findMany.mockResolvedValue([
      {
        id: 'race-1',
        clientId: 'client-1',
        name: 'Race 1',
        date: raceDate,
        distance: '10K',
        targetTime: '00:45:00',
        targetPace: 270,
        classification: 'A',
        client: {
          id: 'client-1',
          name: 'Athlete One',
          userId: 'coach-1',
        },
      },
      {
        id: 'race-2',
        clientId: 'client-2',
        name: 'Race 2',
        date: raceDate,
        distance: '5K',
        targetTime: null,
        targetPace: null,
        classification: 'B',
        client: {
          id: 'client-2',
          name: 'Athlete Two',
          userId: 'coach-2',
        },
      },
      {
        id: 'race-3',
        clientId: 'client-3',
        name: 'Race 3',
        date: raceDate,
        distance: 'HALF',
        targetTime: null,
        targetPace: null,
        classification: 'C',
        client: {
          id: 'client-3',
          name: 'Athlete Three',
          userId: 'coach-3',
        },
      },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/mental-prep?limit=2&concurrency=2&pageSize=10',
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
      expect(body.notificationsCreated).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockGenerateMentalPrepContent).toHaveBeenCalledTimes(2)
      expect(mockPrisma.aINotification.create).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/mental-prep', {
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
