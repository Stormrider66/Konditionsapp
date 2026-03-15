import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateMorningBriefing = vi.hoisted(() => vi.fn())
const mockGetResolvedAiKeys = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  aINotificationPreferences: {
    findMany: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
  aIBriefing: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/ai/briefing-generator', () => ({
  createMorningBriefing: mockCreateMorningBriefing,
}))

vi.mock('@/lib/user-api-keys', () => ({
  getResolvedAiKeys: mockGetResolvedAiKeys,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/morning-briefings/route'

describe('morning-briefings cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.findMany.mockResolvedValue([])
    mockPrisma.aIBriefing.findFirst.mockResolvedValue(null)
    mockGetResolvedAiKeys.mockResolvedValue({ openaiKey: 'key', anthropicKey: null, googleKey: null })
    mockCreateMorningBriefing.mockResolvedValue('briefing-1')
  })

  it('processes eligible athletes in bounded batches', async () => {
    const stockholmHour = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date()).find((p) => p.type === 'hour')?.value || '07'

    mockPrisma.aINotificationPreferences.findMany.mockResolvedValue([
      {
        clientId: 'client-1',
        morningBriefingTime: `${stockholmHour}:00`,
        timezone: 'Europe/Stockholm',
        client: { userId: 'coach-1' },
      },
      {
        clientId: 'client-2',
        morningBriefingTime: `${stockholmHour}:00`,
        timezone: 'Europe/Stockholm',
        client: { userId: 'coach-2' },
      },
      {
        clientId: 'client-3',
        morningBriefingTime: `${stockholmHour}:00`,
        timezone: 'Europe/Stockholm',
        client: { userId: 'coach-3' },
      },
    ])

    const request = new NextRequest(
      'http://localhost/api/cron/morning-briefings?limit=2&concurrency=2&pageSize=10',
      {
        method: 'POST',
        headers: {
          'x-cron-secret': 'secret',
        },
      }
    )

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.processed).toBe(2)
      expect(body.created).toBe(2)
      expect(body.hasMore).toBe(true)
      expect(mockCreateMorningBriefing).toHaveBeenCalledTimes(2)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })

  it('supports Vercel cron bearer auth via GET', async () => {
    mockPrisma.aINotificationPreferences.findMany.mockResolvedValue([])

    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'secret'

    try {
      const request = new NextRequest('http://localhost/api/cron/morning-briefings', {
        method: 'GET',
        headers: {
          authorization: 'Bearer secret',
        },
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
    } finally {
      process.env.CRON_SECRET = previousSecret
    }
  })
})
