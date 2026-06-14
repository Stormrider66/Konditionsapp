import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAthleteOrCoachInAthleteMode = vi.hoisted(() => vi.fn())
const mockIntervalSessionParticipantFindMany = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  requireAthleteOrCoachInAthleteMode: mockRequireAthleteOrCoachInAthleteMode,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intervalSessionParticipant: {
      findMany: mockIntervalSessionParticipantFindMany,
    },
  },
}))

import { GET } from './route'

describe('GET /api/athlete/interval-results', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00.000Z'))
    vi.clearAllMocks()
    mockRequireAthleteOrCoachInAthleteMode.mockResolvedValue({
      clientId: 'client-1',
      user: { id: 'user-1', language: 'en' },
    })
    mockIntervalSessionParticipantFindMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters ended sessions to the requested recent window', async () => {
    const request = new NextRequest('http://localhost/api/athlete/interval-results?maxAgeHours=24&limit=5')

    const response = await GET(request)

    expect(response.status).toBe(200)
    const findManyArgs = mockIntervalSessionParticipantFindMany.mock.calls[0][0]
    expect(findManyArgs.take).toBe(5)
    expect(findManyArgs.where).toEqual({
      clientId: 'client-1',
      session: {
        status: 'ENDED',
        OR: [
          { endedAt: { gte: new Date('2026-06-13T12:00:00.000Z') } },
          { endedAt: null, startedAt: { gte: new Date('2026-06-13T12:00:00.000Z') } },
        ],
      },
    })
  })

  it('keeps full history behavior when no recent window is requested', async () => {
    const request = new NextRequest('http://localhost/api/athlete/interval-results')

    const response = await GET(request)

    expect(response.status).toBe(200)
    const findManyArgs = mockIntervalSessionParticipantFindMany.mock.calls[0][0]
    expect(findManyArgs.take).toBe(20)
    expect(findManyArgs.where).toEqual({
      clientId: 'client-1',
      session: {
        status: 'ENDED',
      },
    })
  })
})
