import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockRequireFeatureAccess = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockResolveAthleteGoogleKeyContext = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  liveHRParticipant: {
    findFirst: vi.fn(),
  },
  strengthSessionAssignment: {
    findFirst: vi.fn(),
  },
  hybridWorkoutAssignment: {
    findFirst: vi.fn(),
  },
  cardioSessionAssignment: {
    findFirst: vi.fn(),
  },
  liveVoiceCoachingSession: {
    create: vi.fn(),
  },
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Modality: {
    AUDIO: 'AUDIO',
    TEXT: 'TEXT',
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/subscription/require-feature-access', () => ({
  requireFeatureAccess: mockRequireFeatureAccess,
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK: {
    richAnalysis: 0.5,
  },
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/ai/resolve-athlete-google-key', () => ({
  resolveAthleteGoogleKeyContext: mockResolveAthleteGoogleKeyContext,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/ai/live-voice-coaching/system-prompt', () => ({
  buildLiveCoachingSystemInstruction: vi.fn(),
  buildStrengthCoachingSystemInstruction: vi.fn(),
  buildHybridCoachingSystemInstruction: vi.fn(),
}))

vi.mock('@/lib/ai/live-voice-coaching/tools', () => ({
  CARDIO_COACHING_TOOLS: [],
  STRENGTH_COACHING_TOOLS: [],
  HYBRID_COACHING_TOOLS: [],
}))

vi.mock('@/lib/ai/gemini-config', () => ({
  GEMINI_MODELS: {
    LIVE: 'gemini-live-test',
  },
}))

import { POST } from './route'

describe('live voice coaching init API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'user-1' },
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockRequireFeatureAccess.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
  })

  it('blocks exhausted AI credits before reading the workout request or opening Google live setup', async () => {
    const exhaustedResponse = NextResponse.json(
      {
        error: 'AI credits exhausted',
        code: 'AI_ALLOWANCE_EXHAUSTED',
      },
      { status: 402 }
    )
    mockRequireAiAllowance.mockResolvedValue(exhaustedResponse)

    const request = {
      json: vi.fn(),
    } as unknown as Request

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.code).toBe('AI_ALLOWANCE_EXHAUSTED')
    expect(mockRequireAiAllowance).toHaveBeenCalledWith('client-1', {
      minimumRemainingSek: 0.5,
    })
    expect(request.json).not.toHaveBeenCalled()
    expect(mockResolveAthleteGoogleKeyContext).not.toHaveBeenCalled()
    expect(mockPrisma.liveHRParticipant.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.liveVoiceCoachingSession.create).not.toHaveBeenCalled()
  })
})
