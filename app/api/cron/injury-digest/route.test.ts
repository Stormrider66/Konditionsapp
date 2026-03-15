import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

process.env.RESEND_API_KEY = 'test-key'

const mockSendEmail = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
  workout: {
    findMany: vi.fn(),
  },
  workoutModification: {
    findMany: vi.fn(),
  },
  injuryAssessment: {
    findMany: vi.fn(),
  },
  trainingLoad: {
    findMany: vi.fn(),
  },
  dailyCheckIn: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: mockSendEmail,
    }
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeForEmail: (value: string) => value,
}))

import { GET } from '@/app/api/cron/injury-digest/route'

describe('injury-digest cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'coach@example.com',
      name: 'Coach Example',
    })
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'athlete-1', name: 'Athlete 1' },
    ])
    mockPrisma.workout.findMany.mockResolvedValue([{ id: 'workout-1' }])
    mockPrisma.workoutModification.findMany.mockResolvedValue([])
    mockPrisma.injuryAssessment.findMany.mockResolvedValue([])
    mockPrisma.trainingLoad.findMany.mockResolvedValue([])
    mockPrisma.dailyCheckIn.findMany.mockResolvedValue([])
    mockSendEmail.mockResolvedValue({ id: 'email-1' })
  })

  it('processes coaches in bounded batches', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'coach-1', email: 'coach1@example.com', name: 'Coach 1' },
      { id: 'coach-2', email: 'coach2@example.com', name: 'Coach 2' },
      { id: 'coach-3', email: 'coach3@example.com', name: 'Coach 3' },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/injury-digest?limit=2&concurrency=2&pageSize=10',
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
      expect(body.sent).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockSendEmail).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/injury-digest', {
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
