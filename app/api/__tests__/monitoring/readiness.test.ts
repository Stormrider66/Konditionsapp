import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/readiness/route'

const mockTrend = vi.hoisted(() => ({
  direction: 'UP',
  magnitude: 'MEDIUM',
  consecutive: 4,
  explanation: 'Improving readiness'
}))

const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn()
  }
}))

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  client: { findUnique: vi.fn() },
  dailyMetrics: { findFirst: vi.fn(), findMany: vi.fn() }
}))

const mockCreateClient = vi.hoisted(() => vi.fn(() => Promise.resolve(mockSupabase)))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

const mockAnalyzeTrend = vi.hoisted(() => vi.fn(() => mockTrend))

vi.mock('@/lib/training-engine/monitoring', () => ({
  analyzeReadinessTrend: mockAnalyzeTrend
}))

const authUser = { id: 'auth-user-id', email: 'coach@example.com' }
const dbUser = { id: 'db-user-id', role: 'COACH' }

function sampleMetric(overrides: Partial<any> = {}) {
  return {
    date: new Date('2025-01-10T00:00:00Z'),
    readinessScore: 8.4,
    readinessLevel: 'GOOD',
    hrvRMSSD: 65,
    hrvQuality: 'EXCELLENT',
    restingHR: 48,
    wellnessScore: 8.9,
    ...overrides
  }
}

function mockAuthState(user: any = authUser) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user },
    error: null
  })
  mockPrisma.user.findUnique.mockResolvedValue(dbUser)
}

function mockClientAccess(access: { isOwner?: boolean; isAthlete?: boolean } = {}) {
  mockPrisma.client.findUnique.mockResolvedValue({
    id: 'client-1',
    userId: access.isOwner === false ? 'other-coach' : dbUser.id,
    athleteProfile: access.isAthlete
      ? { athleteUserId: dbUser.id }
      : { athleteUserId: 'other-athlete' }
  })
}

describe('GET /api/readiness', () => {
beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockReset()
  mockPrisma.user.findUnique.mockReset()
  mockPrisma.client.findUnique.mockReset()
  mockPrisma.dailyMetrics.findFirst.mockReset()
  mockPrisma.dailyMetrics.findMany.mockReset()
  mockAnalyzeTrend.mockReset()
  mockAnalyzeTrend.mockReturnValue(mockTrend)
})

  it('returns readiness summary for an authorized request', async () => {
    mockAuthState()
    mockClientAccess({ isOwner: true })

    const currentMetrics = sampleMetric({
      date: new Date(),
      recommendedAction: 'PROCEED'
    })

    const last7Days = [
      sampleMetric({ date: new Date('2025-01-01'), readinessScore: 7.2 }),
      sampleMetric({ date: new Date('2025-01-02'), readinessScore: 7.8 }),
      sampleMetric({ date: new Date('2025-01-03'), readinessScore: 8.1 }),
      sampleMetric({ date: new Date('2025-01-04'), readinessScore: 8.3 })
    ]

    const last30Days = [
      sampleMetric({ date: new Date('2024-12-20'), hrvRMSSD: 60 }),
      sampleMetric({ date: new Date('2024-12-25'), restingHR: 50 }),
      sampleMetric({ date: new Date('2024-12-30'), wellnessScore: 9.1 })
    ]

    mockPrisma.dailyMetrics.findFirst.mockResolvedValue(currentMetrics)
    mockPrisma.dailyMetrics.findMany
      .mockResolvedValueOnce(last7Days)
      .mockResolvedValueOnce([...last7Days, ...last30Days])

    const request = new Request('http://localhost/api/readiness?clientId=client-1')
    const response = await GET(request as NextRequest)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.current.readinessScore).toBe(currentMetrics.readinessScore)
    expect(body.trend).toEqual(mockTrend)
    expect(body.history.last7Days).toHaveLength(last7Days.length)
    expect(mockAnalyzeTrend).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ score: last7Days[0].readinessScore })
      ])
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new Request('http://localhost/api/readiness?clientId=client-1')
    const response = await GET(request as NextRequest)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('validates required query parameters', async () => {
    mockAuthState()
    mockClientAccess({ isOwner: true })

    const request = new Request('http://localhost/api/readiness')
    const response = await GET(request as NextRequest)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing required parameter: clientId')
  })

  it('returns 403 when coach does not own the client and is not the athlete', async () => {
    mockAuthState()
    mockClientAccess({ isOwner: false, isAthlete: false })

    const request = new Request('http://localhost/api/readiness?clientId=client-1')
    const response = await GET(request as NextRequest)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Access denied')
  })
})

