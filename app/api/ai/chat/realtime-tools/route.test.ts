import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockCheckAthleteFeatureAccess = vi.hoisted(() => vi.fn())
const mockGetConsentStatus = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  cardioSessionAssignment: { findMany: vi.fn() },
  strengthSessionAssignment: { findMany: vi.fn() },
  aIGeneratedWOD: { findMany: vi.fn() },
  dailyCheckIn: { findFirst: vi.fn() },
  trainingLoad: { findFirst: vi.fn(), findMany: vi.fn() },
  injuryAssessment: { findMany: vi.fn() },
  quickErgSession: { findMany: vi.fn() },
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/subscription/feature-access', () => ({
  checkAthleteFeatureAccess: mockCheckAthleteFeatureAccess,
}))

vi.mock('@/lib/agent/gdpr/consent-manager', () => ({
  getConsentStatus: mockGetConsentStatus,
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ai/chat/realtime-tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('realtime direct tools route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'user-1', language: 'en' },
    })
    mockCheckAthleteFeatureAccess.mockResolvedValue({ allowed: true })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
    mockGetConsentStatus.mockResolvedValue({ hasRequiredConsent: true })
    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValue([])
    mockPrisma.strengthSessionAssignment.findMany.mockResolvedValue([])
    mockPrisma.aIGeneratedWOD.findMany.mockResolvedValue([])
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValue(null)
    mockPrisma.trainingLoad.findFirst.mockResolvedValue(null)
    mockPrisma.trainingLoad.findMany.mockResolvedValue([])
    mockPrisma.injuryAssessment.findMany.mockResolvedValue([])
    mockPrisma.quickErgSession.findMany.mockResolvedValue([])
  })

  it('returns a navigation target for one planned cardio workout', async () => {
    mockPrisma.cardioSessionAssignment.findMany.mockResolvedValueOnce([
      {
        id: 'assignment-1',
        assignedDate: new Date('2026-06-23T00:00:00.000Z'),
        status: 'PENDING',
        startTime: '09:00',
        session: {
          name: 'Wattbike intervals',
          sport: 'CYCLING',
          totalDuration: 3600,
        },
      },
    ])

    const response = await POST(request({
      toolName: 'openTodayWorkout',
      callId: 'call-open-1',
      arguments: {
        date: '2026-06-23',
        kind: 'CARDIO',
      },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.callId).toBe('call-open-1')
    expect(body.navigation.href).toBe('/athlete/cardio?start=assignment-1')
    expect(body.workout.name).toBe('Wattbike intervals')
  })

  it('returns a readiness briefing from check-in, load, injuries, and plan data', async () => {
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValue({
      date: new Date('2026-06-23T00:00:00.000Z'),
      readinessScore: 72,
      readinessDecision: 'TRAIN',
      sleepQuality: 7,
      sleepHours: 8,
      soreness: 3,
      fatigue: 2,
      stress: 2,
      mood: 7,
      motivation: 8,
      hrv: 55,
      restingHR: 48,
    })
    mockPrisma.trainingLoad.findFirst.mockResolvedValue({
      date: new Date('2026-06-22T00:00:00.000Z'),
      acuteLoad: 400,
      chronicLoad: 450,
      acwr: 0.89,
      acwrZone: 'OPTIMAL',
      injuryRisk: 'LOW',
    })
    mockPrisma.trainingLoad.findMany.mockResolvedValue([
      { dailyLoad: 80, duration: 45 },
      { dailyLoad: 50, duration: 30 },
    ])

    const response = await POST(request({
      toolName: 'getReadinessBriefing',
      arguments: { date: '2026-06-23' },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toContain('Readiness: 72/100')
    expect(body.message).toContain('ACWR 0.89')
    expect(body.briefing.load.last7DaysLoad).toBe(130)
  })

  it('rejects unsupported tools', async () => {
    const response = await POST(request({
      toolName: 'logMeal',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('requires athlete consent', async () => {
    mockGetConsentStatus.mockResolvedValue({ hasRequiredConsent: false })

    const response = await POST(request({
      toolName: 'openTodayWorkout',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.code).toBe('CONSENT_REQUIRED')
  })

  it('returns a rate limit response before running tools', async () => {
    mockRateLimitJsonResponse.mockResolvedValue(NextResponse.json({ success: false, error: 'Too many' }, { status: 429 }))

    const response = await POST(request({
      toolName: 'openTodayWorkout',
      arguments: {},
    }))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe('Too many')
    expect(mockPrisma.cardioSessionAssignment.findMany).not.toHaveBeenCalled()
  })
})
