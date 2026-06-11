import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveAthleteClientId: vi.fn(),
  getAthleteHistoryFeed: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mocks.resolveAthleteClientId,
}))

vi.mock('@/lib/athlete/history-feed', () => ({
  getAthleteHistoryFeed: mocks.getAthleteHistoryFeed,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { GET } from '@/app/api/athlete/history/route'

function makeRequest(query = '') {
  return new NextRequest(`http://localhost:3000/api/athlete/history${query}`)
}

const feed = {
  timeframe: '30days',
  items: Array.from({ length: 5 }, (_, i) => ({ id: `item-${i}` })),
  stats: { totalWorkouts: 5, totalDistanceKm: 12, totalDurationMin: 180, avgRPE: 6.5 },
  logs: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAthleteClientId.mockResolvedValue({
    user: { id: 'user-1', language: 'sv' },
    clientId: 'client-1',
    isCoachInAthleteMode: false,
  })
  mocks.getAthleteHistoryFeed.mockResolvedValue(feed)
})

describe('GET /api/athlete/history', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.resolveAthleteClientId.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ success: false })
  })

  it('returns the feed with the standard envelope and forwards params', async () => {
    const res = await GET(makeRequest('?timeframe=7days&type=RUNNING'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(5)
    expect(body.data.items).toHaveLength(5)
    expect(body.data.stats.avgRPE).toBe(6.5)

    expect(mocks.getAthleteHistoryFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        clientId: 'client-1',
        timeframe: '7days',
        typeFilter: 'RUNNING',
      })
    )
  })

  it('applies limit/offset to items while total stays full-count', async () => {
    const res = await GET(makeRequest('?limit=2&offset=1'))
    const body = await res.json()
    expect(body.data.items.map((i: { id: string }) => i.id)).toEqual(['item-1', 'item-2'])
    expect(body.data.total).toBe(5)
  })

  it('clamps nonsense limit/offset values', async () => {
    const res = await GET(makeRequest('?limit=-5&offset=abc'))
    const body = await res.json()
    expect(body.data.items.map((i: { id: string }) => i.id)).toEqual(['item-0']) // limit → 1, offset → 0
  })
})
