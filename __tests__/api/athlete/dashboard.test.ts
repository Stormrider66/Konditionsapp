import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveAthleteClientId: vi.fn(),
  getAthleteDashboardData: vi.fn(),
  clientFindUnique: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mocks.resolveAthleteClientId,
}))

vi.mock('@/lib/athlete/dashboard-data', () => ({
  getAthleteDashboardData: mocks.getAthleteDashboardData,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { client: { findUnique: mocks.clientFindUnique } },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { GET } from '@/app/api/athlete/dashboard/route'

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/athlete/dashboard')
}

const NOW = new Date('2026-06-11T12:00:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveAthleteClientId.mockResolvedValue({
    user: { id: 'user-1', language: 'en' },
    clientId: 'client-1',
    isCoachInAthleteMode: false,
  })
  mocks.clientFindUnique.mockResolvedValue({
    name: 'E2E Athlete',
    sportProfile: { primarySport: 'RUNNING', secondarySports: [] },
    athleteSubscription: { tier: 'PRO' },
  })
  mocks.getAthleteDashboardData.mockResolvedValue({
    activePrograms: [
      { id: 'p-1', name: 'Base block', startDate: NOW, endDate: NOW, weeks: [{}, {}, {}] },
    ],
    sortedTodayItems: [
      {
        kind: 'wod',
        id: 'wod-1',
        title: 'AI Blast',
        status: 'GENERATED',
        requestedDuration: 30,
        actualDuration: null,
        createdAt: NOW,
        completedAt: null,
        primarySport: 'RUNNING',
      },
    ],
    upcomingItems: [],
    nextItem: null,
    firstActionableItem: null,
    readinessScore: 82,
    hasCheckedInToday: true,
    weeklyTSS: 120,
    weeklyTSSTarget: 300,
    muscularFatigue: { fatigueEstimate: 0.2 },
    activeInjuries: [],
    wodHistory: [],
    wodStats: { thisWeek: 1, totalCompleted: 2, totalMinutes: 45 },
    wodUsageStats: { remaining: 3, isUnlimited: false },
    recentActivitySummary: null,
  })
})

describe('GET /api/athlete/dashboard', () => {
  it('returns 401 when unauthenticated', async () => {
    mocks.resolveAthleteClientId.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns the summarized dashboard with the standard envelope', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.data.athlete).toMatchObject({
      clientId: 'client-1',
      name: 'E2E Athlete',
      primarySport: 'RUNNING',
      subscriptionTier: 'PRO',
    })
    // WOD item is summarized (no raw prisma tree), name comes from title.
    expect(body.data.today).toHaveLength(1)
    expect(body.data.today[0]).toMatchObject({
      kind: 'wod',
      id: 'wod-1',
      name: 'AI Blast',
      completed: false,
      duration: 30,
      sport: 'RUNNING',
    })
    expect(body.data.activePrograms[0]).toMatchObject({ id: 'p-1', weekCount: 3 })
    expect(body.data.readiness).toEqual({ score: 82, hasCheckedInToday: true })
    expect(body.data.weeklyLoad).toEqual({ weeklyTSS: 120, weeklyTSSTarget: 300 })
    expect(body.data.wodUsage).toEqual({ remaining: 3, isUnlimited: false })
  })

  it('passes the subscription tier and identity through to the data layer', async () => {
    await GET(makeRequest())
    expect(mocks.getAthleteDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        clientId: 'client-1',
        subscriptionTier: 'PRO',
      })
    )
  })
})
