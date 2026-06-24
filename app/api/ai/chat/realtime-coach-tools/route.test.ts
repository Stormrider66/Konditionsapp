import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockCanAccessCoachPlatform = vi.hoisted(() => vi.fn())
const mockGetStaffPermissions = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockCanAccessAthlete = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: { findMany: vi.fn() },
  team: { findMany: vi.fn() },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: mockCanAccessCoachPlatform,
}))

vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: mockGetStaffPermissions,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/auth/athlete-access', () => ({
  canAccessAthlete: mockCanAccessAthlete,
}))

vi.mock('@/lib/coach/team-access', () => ({
  getAccessibleTeam: vi.fn(),
  getAccessibleTeamWhere: vi.fn(async () => ({})),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}))

import { POST } from './route'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/chat/realtime-coach-tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('realtime coach direct tools route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'skelleftea' })
    mockCanAccessCoachPlatform.mockResolvedValue(true)
    mockGetStaffPermissions.mockResolvedValue({
      canViewAthletes: true,
      isTeamScoped: false,
      assignedTeamIds: [],
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockCanAccessAthlete.mockResolvedValue({ allowed: true })
    mockPrisma.client.findMany.mockResolvedValue([])
    mockPrisma.team.findMany.mockResolvedValue([])
  })

  it('returns a coach readiness overview for accessible athletes', async () => {
    mockPrisma.client.findMany.mockResolvedValueOnce([
      {
        id: 'client-1',
        name: 'Henrik Lundholm',
        team: { name: 'A Team' },
        dailyCheckIns: [{
          date: new Date('2026-06-24T00:00:00.000Z'),
          readinessScore: 42,
          readinessDecision: 'REDUCE',
          sleepHours: 6,
          soreness: 7,
          fatigue: 6,
          stress: 4,
          notes: null,
        }],
        injuryAssessments: [{
          bodyPart: 'CALF',
          side: 'LEFT',
          painLevel: 4,
          status: 'ACTIVE',
        }],
        cardioSessionAssignments: [{
          status: 'PENDING',
          session: { name: 'Wattbike intervals', sport: 'CYCLING', totalDuration: 3600 },
        }],
        strengthSessionAssignments: [],
      },
    ])

    const response = await POST(request({
      toolName: 'getCoachReadinessOverview',
      callId: 'call-readiness-1',
      arguments: { date: '2026-06-24', limit: 5 },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.callId).toBe('call-readiness-1')
    expect(body.message).toContain('Henrik Lundholm')
    expect(body.overview.attentionCount).toBe(1)
    expect(body.overview.athletes[0].readinessScore).toBe(42)
  })

  it('asks for clarification when an athlete cardio summary name matches several athletes', async () => {
    mockPrisma.client.findMany.mockResolvedValueOnce([
      { id: 'client-1', name: 'Alex A', team: { id: 'team-1', name: 'A Team' } },
      { id: 'client-2', name: 'Alex B', team: { id: 'team-1', name: 'A Team' } },
    ])

    const response = await POST(request({
      toolName: 'getCoachAthleteCardioSummary',
      arguments: { athleteName: 'Alex', days: 14 },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.needsClarification).toBe(true)
    expect(body.candidates).toHaveLength(2)
  })

  it('rejects unsupported coach tools', async () => {
    const response = await POST(request({
      toolName: 'deleteWorkout',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns rate limit response before querying coach data', async () => {
    mockRateLimitJsonResponse.mockResolvedValue(NextResponse.json({ success: false, error: 'Too many' }, { status: 429 }))

    const response = await POST(request({
      toolName: 'getCoachReadinessOverview',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many')
    expect(mockPrisma.client.findMany).not.toHaveBeenCalled()
  })
})
