/**
 * Smoke tests for the adjustment-recommendation GET route.
 *
 * These tests focus on the contract (auth, ownership, shape of the
 * response). The pure decision engine is covered separately in
 * __tests__/lib/training-engine/plan-adjustment/decide-adjustment.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: { findUnique: vi.fn() },
  trainingLoad: { findFirst: vi.fn() },
  dailyCheckIn: { findFirst: vi.fn() },
  conversationMemory: { findFirst: vi.fn() },
  strengthSessionAssignment: { findFirst: vi.fn() },
  cardioSessionAssignment: { findFirst: vi.fn() },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/coach/clients/[clientId]/adjustment-recommendation/route'

function makeRequest() {
  return new NextRequest(
    'http://localhost/api/coach/clients/client-1/adjustment-recommendation'
  )
}

const paramsFor = (clientId: string) => ({ params: Promise.resolve({ clientId }) })

describe('GET /api/coach/clients/:clientId/adjustment-recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Sensible defaults for the "happy path" — tests override as needed.
    mockRequireCoach.mockResolvedValue({ id: 'coach-1' })
    mockCanAccessClient.mockResolvedValue(true)
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'client-1',
      name: 'Test Athlete',
    })
    mockPrisma.trainingLoad.findFirst.mockResolvedValue(null)
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValue(null)
    mockPrisma.conversationMemory.findFirst.mockResolvedValue(null)
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValue(null)
    mockPrisma.cardioSessionAssignment.findFirst.mockResolvedValue(null)
  })

  it('returns 401 when the caller is not an authenticated coach', async () => {
    mockRequireCoach.mockRejectedValueOnce(new Error('Unauthorized'))

    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(401)
  })

  it('returns 403 when the coach does not own this client', async () => {
    mockCanAccessClient.mockResolvedValueOnce(false)

    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(403)
  })

  it('returns 404 when the client does not exist', async () => {
    mockPrisma.client.findUnique.mockResolvedValueOnce(null)

    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(404)
  })

  it('returns PROCEED with null signals and null nextAssignment for a fresh client', async () => {
    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.client).toEqual({ id: 'client-1', name: 'Test Athlete' })
    expect(body.signals.acwr).toBeNull()
    expect(body.signals.readiness).toBeNull()
    expect(body.signals.recentPainLevel).toBeNull()
    expect(body.decision.action).toBe('PROCEED')
    expect(body.decision.hadSufficientSignal).toBe(false)
    expect(body.nextAssignment).toBeNull()
  })

  it('composes the full recommendation when all signals and a pending assignment exist', async () => {
    mockPrisma.trainingLoad.findFirst.mockResolvedValueOnce({
      date: new Date('2026-04-10T00:00:00Z'),
      acwr: 1.75,
      acwrZone: 'DANGER',
      injuryRisk: 'HIGH',
    })
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValueOnce({
      date: new Date('2026-04-11T00:00:00Z'),
      readinessScore: 45,
      readinessDecision: 'EASY',
    })
    mockPrisma.conversationMemory.findFirst.mockResolvedValueOnce(null)
    mockPrisma.strengthSessionAssignment.findFirst.mockResolvedValueOnce({
      id: 'sa-1',
      sessionId: 'ss-1',
      athleteId: 'client-1',
      assignedDate: new Date('2026-04-12T00:00:00Z'),
      status: 'PENDING',
      notes: null,
      session: { id: 'ss-1', name: 'Heavy lower body' },
    })

    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(200)
    const body = await response.json()

    // Signals surfaced
    expect(body.signals.acwr).toEqual({
      value: 1.75,
      zone: 'DANGER',
      injuryRisk: 'HIGH',
      date: new Date('2026-04-10T00:00:00Z').toISOString(),
    })
    expect(body.signals.readiness.score).toBe(45)
    expect(body.signals.readiness.decision).toBe('EASY')

    // Decision should escalate to DEFER_ONE_DAY because ACWR DANGER wins
    // over the READINESS_EASY rule.
    expect(body.decision.action).toBe('DEFER_ONE_DAY')
    expect(body.decision.triggers).toContain('ACWR_DANGER')
    expect(body.decision.hadSufficientSignal).toBe(true)

    // Next assignment surfaced
    expect(body.nextAssignment).toMatchObject({
      kind: 'STRENGTH',
      id: 'sa-1',
      sessionName: 'Heavy lower body',
    })
  })

  it('translates a recent INJURY_MENTION into a recentPainLevel signal', async () => {
    mockPrisma.conversationMemory.findFirst.mockResolvedValueOnce({
      importance: 4, // AI-rated 1-5; maps to 8/10 pain proxy
      content: 'Knee is really sore after yesterday',
    })

    const response = await GET(makeRequest(), paramsFor('client-1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.signals.recentPainLevel).toBe(8)
    // pain 8 → SKIP
    expect(body.decision.action).toBe('SKIP')
    expect(body.decision.triggers).toContain('PAIN_CRITICAL')
  })
})
