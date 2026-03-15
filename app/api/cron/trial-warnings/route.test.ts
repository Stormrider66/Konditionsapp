import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSendEmail = vi.hoisted(() => vi.fn())
const mockGetTrialWarningEmailTemplate = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  subscription: {
    findMany: vi.fn(),
  },
  athleteSubscription: {
    findMany: vi.fn(),
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

vi.mock('@/lib/email', () => ({
  sendEmail: mockSendEmail,
  getTrialWarningEmailTemplate: mockGetTrialWarningEmailTemplate,
}))

import { GET, POST } from '@/app/api/cron/trial-warnings/route'

describe('trial-warnings cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.subscription.findMany.mockResolvedValue([])
    mockPrisma.athleteSubscription.findMany.mockResolvedValue([])
    mockGetTrialWarningEmailTemplate.mockReturnValue({
      subject: 'Trial warning',
      html: '<p>Trial warning</p>',
    })
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('processes warnings in bounded batches', async () => {
    mockPrisma.subscription.findMany.mockResolvedValueOnce([
      {
        userId: 'coach-user-1',
        user: { id: 'coach-user-1', email: 'coach1@test.com', name: 'Coach 1', language: 'sv' },
      },
      {
        userId: 'coach-user-2',
        user: { id: 'coach-user-2', email: 'coach2@test.com', name: 'Coach 2', language: 'sv' },
      },
      {
        userId: 'coach-user-3',
        user: { id: 'coach-user-3', email: 'coach3@test.com', name: 'Coach 3', language: 'sv' },
      },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/trial-warnings?limit=2&concurrency=2&pageSize=10',
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer secret',
          },
        }
      )

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.processed).toBe(2)
      expect(body.emailsSent).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(body.warningsSent).toEqual([
        { threshold: 7, coachCount: 2, athleteCount: 0 },
      ])
      expect(mockSendEmail).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid via GET', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/trial-warnings', {
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
