import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockSendEmail = vi.hoisted(() => vi.fn())
const mockGetTrialExpiredEmailTemplate = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  subscription: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  athleteSubscription: {
    findMany: vi.fn(),
    update: vi.fn(),
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
  getTrialExpiredEmailTemplate: mockGetTrialExpiredEmailTemplate,
}))

import { GET, POST } from '@/app/api/cron/expire-trials/route'

describe('expire-trials cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.subscription.findMany.mockResolvedValue([])
    mockPrisma.subscription.update.mockResolvedValue({})
    mockPrisma.athleteSubscription.findMany.mockResolvedValue([])
    mockPrisma.athleteSubscription.update.mockResolvedValue({})
    mockGetTrialExpiredEmailTemplate.mockReturnValue({
      subject: 'Trial expired',
      html: '<p>Expired</p>',
    })
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('processes expirations in bounded batches', async () => {
    mockPrisma.subscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        userId: 'coach-user-1',
        user: { id: 'coach-user-1', email: 'coach1@test.com', name: 'Coach 1', language: 'sv' },
      },
      {
        id: 'sub-2',
        userId: 'coach-user-2',
        user: { id: 'coach-user-2', email: 'coach2@test.com', name: 'Coach 2', language: 'sv' },
      },
      {
        id: 'sub-3',
        userId: 'coach-user-3',
        user: { id: 'coach-user-3', email: 'coach3@test.com', name: 'Coach 3', language: 'sv' },
      },
    ])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest(
        'http://localhost/api/cron/expire-trials?limit=2&concurrency=2&pageSize=10',
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
      expect(body.coachExpired).toBe(2)
      expect(body.athleteExpired).toBe(0)
      expect(body.emailsSent).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockPrisma.subscription.update).toHaveBeenCalledTimes(2)
      expect(mockSendEmail).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('returns 401 when bearer auth is invalid via GET', async () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/expire-trials', {
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
