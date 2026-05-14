import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockCreateGoogleGenAIClient = vi.hoisted(() => vi.fn())
const mockAnalyzeGeneric = vi.hoisted(() => vi.fn())
const mockAnalyzeSkiingTechnique = vi.hoisted(() => vi.fn())
const mockAnalyzeHyroxStation = vi.hoisted(() => vi.fn())
const mockAnalyzeRunningGait = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  videoAnalysis: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  userApiKey: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/ai/google-genai-client', () => ({
  createGoogleGenAIClient: mockCreateGoogleGenAIClient,
  getGeminiModelId: vi.fn(() => 'gemini-video-test'),
}))

vi.mock('@/lib/ai/usage-logger', () => ({
  withAiContext: vi.fn((_context: unknown, fn: () => unknown) => fn()),
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK: {
    richAnalysis: 0.5,
  },
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/ai/skiing-prompts', () => ({
  isSkiingVideoType: vi.fn(() => false),
}))

vi.mock('@/lib/ai/hyrox-prompts', () => ({
  isHyroxVideoType: vi.fn(() => false),
}))

vi.mock('@/lib/video-analysis/analyzers/generic', () => ({
  analyzeGeneric: mockAnalyzeGeneric,
}))

vi.mock('@/lib/video-analysis/analyzers/skiing', () => ({
  analyzeSkiingTechnique: mockAnalyzeSkiingTechnique,
}))

vi.mock('@/lib/video-analysis/analyzers/hyrox', () => ({
  analyzeHyroxStation: mockAnalyzeHyroxStation,
}))

vi.mock('@/lib/video-analysis/analyzers/running-gait', () => ({
  analyzeRunningGait: mockAnalyzeRunningGait,
}))

import { POST } from './route'

describe('video analysis run API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-1' })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
    mockPrisma.videoAnalysis.findFirst.mockResolvedValue({
      id: 'analysis-1',
      coachId: 'coach-1',
      athleteId: 'client-1',
      videoType: 'STRENGTH',
      athlete: { id: 'client-1', name: 'Athlete One', gender: null },
      exercise: null,
    })
  })

  it('blocks exhausted AI credits before loading keys or starting video analysis', async () => {
    const exhaustedResponse = NextResponse.json(
      {
        error: 'AI credits exhausted',
        code: 'AI_ALLOWANCE_EXHAUSTED',
      },
      { status: 402 }
    )
    mockRequireAiAllowance.mockResolvedValue(exhaustedResponse)

    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ id: 'analysis-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.code).toBe('AI_ALLOWANCE_EXHAUSTED')
    expect(mockRequireAiAllowance).toHaveBeenCalledWith('client-1', {
      minimumRemainingSek: 0.5,
    })
    expect(mockPrisma.userApiKey.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.videoAnalysis.update).not.toHaveBeenCalled()
    expect(mockCreateGoogleGenAIClient).not.toHaveBeenCalled()
    expect(mockAnalyzeGeneric).not.toHaveBeenCalled()
    expect(mockAnalyzeSkiingTechnique).not.toHaveBeenCalled()
    expect(mockAnalyzeHyroxStation).not.toHaveBeenCalled()
    expect(mockAnalyzeRunningGait).not.toHaveBeenCalled()
  })
})
