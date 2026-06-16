import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateClient = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockCanAccessCoachPlatform = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  test: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  testStage: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  coachDecision: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/auth-utils', () => ({
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: mockCanAccessCoachPlatform,
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

vi.mock('@/lib/subscription/trial-trigger', () => ({
  triggerTrialAfterTest: vi.fn(),
}))

import { PATCH } from './route'

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tests/test-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('test PATCH route manual threshold decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'coach-1' } },
        }),
      },
    })
    mockCanAccessCoachPlatform.mockResolvedValue(true)
    mockCanAccessClient.mockResolvedValue(true)
    mockPrisma.test.findUnique.mockResolvedValue({
      clientId: 'client-1',
      testType: 'RUNNING',
      testDate: new Date('2026-06-16T08:00:00.000Z'),
      aerobicThreshold: { value: 12.1 },
      anaerobicThreshold: { value: 14.8 },
      manualLT1Lactate: null,
      manualLT1Intensity: null,
      manualLT2Lactate: null,
      manualLT2Intensity: null,
      testStages: [
        { lactate: 1.2 },
        { lactate: 2.1 },
        { lactate: 3.5 },
      ],
    })
    mockPrisma.test.update.mockResolvedValue({
      id: 'test-1',
      clientId: 'client-1',
      testStages: [],
      client: { id: 'client-1' },
    })
    mockPrisma.coachDecision.create.mockResolvedValue({ id: 'decision-1' })
    mockPrisma.$transaction.mockImplementation((operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    )
  })

  it('rejects manual threshold changes without a reason', async () => {
    const response = await PATCH(
      patchRequest({
        manualLT1Lactate: 1.7,
        manualLT1Intensity: 12.4,
      }),
      { params: Promise.resolve({ id: 'test-1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('A reason is required when manual LT1/LT2 thresholds are changed')
    expect(mockPrisma.test.update).not.toHaveBeenCalled()
    expect(mockPrisma.coachDecision.create).not.toHaveBeenCalled()
  })

  it('creates a coach decision when manual threshold changes include a reason', async () => {
    const response = await PATCH(
      patchRequest({
        manualLT1Lactate: 1.7,
        manualLT1Intensity: 12.4,
        manualLT2Lactate: 3.8,
        manualLT2Intensity: 15.1,
        thresholdDecisionReasonCategory: 'COACH_INTUITION',
        thresholdDecisionReason: 'Curve shape and observed breathing pattern matched this better.',
      }),
      { params: Promise.resolve({ id: 'test-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockPrisma.test.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-1' },
        data: expect.objectContaining({
          manualLT1Lactate: 1.7,
          manualLT1Intensity: 12.4,
          manualLT2Lactate: 3.8,
          manualLT2Intensity: 15.1,
          qualityReviewStatus: 'CLEAR',
          qualityReviewedBy: null,
          qualityReviewedAt: null,
          qualityReviewNote: null,
        }),
      })
    )
    expect(mockPrisma.coachDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        coachId: 'coach-1',
        athleteId: 'client-1',
        aiSuggestionType: 'ZONE_CALCULATION',
        reasonCategory: 'COACH_INTUITION',
        reasonNotes: 'Curve shape and observed breathing pattern matched this better.',
      }),
    })
  })
})
