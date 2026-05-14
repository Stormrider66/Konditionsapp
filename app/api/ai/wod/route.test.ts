import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

const mockGenerateText = vi.hoisted(() => vi.fn())
const mockCreateAnthropic = vi.hoisted(() => vi.fn())
const mockCreateGoogleGenerativeAI = vi.hoisted(() => vi.fn())
const mockCreateOpenAI = vi.hoisted(() => vi.fn())
const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockBuildWODContext = vi.hoisted(() => vi.fn())
const mockGetWODUsageStats = vi.hoisted(() => vi.fn())
const mockCheckWODGuardrails = vi.hoisted(() => vi.fn())
const mockGetResolvedAiKeys = vi.hoisted(() => vi.fn())
const mockCreateModelInstance = vi.hoisted(() => vi.fn())
const mockLogAiUsage = vi.hoisted(() => vi.fn())
const mockWithAiContext = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
  exerciseLibrary: {
    findMany: vi.fn(),
  },
}))

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mockCreateAnthropic,
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mockCreateGoogleGenerativeAI,
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mockCreateOpenAI,
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/ai/wod-context-builder', () => ({
  buildWODContext: mockBuildWODContext,
  getWODUsageStats: mockGetWODUsageStats,
}))

vi.mock('@/lib/ai/wod-guardrails', () => ({
  checkWODGuardrails: mockCheckWODGuardrails,
}))

vi.mock('@/lib/ai/wod-prompts', () => ({
  buildWODPrompt: vi.fn(() => 'prompt'),
  matchExerciseToLibrary: vi.fn(),
}))

vi.mock('@/lib/user-api-keys', () => ({
  getResolvedAiKeys: mockGetResolvedAiKeys,
}))

vi.mock('@/types/ai-models', () => ({
  AI_MODELS: [],
  getDefaultModel: vi.fn(),
  getModelById: vi.fn(),
  isModelIntent: vi.fn(() => false),
  resolveModel: vi.fn(),
}))

vi.mock('@/lib/ai/create-model', () => ({
  createModelInstance: mockCreateModelInstance,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/ai/usage-logger', () => ({
  logAiUsage: mockLogAiUsage,
  withAiContext: mockWithAiContext,
}))

import { POST } from './route'

describe('WOD generation API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      user: { id: 'user-1' },
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
  })

  it('blocks exhausted AI credits before reading the WOD request or resolving models', async () => {
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
    } as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.code).toBe('AI_ALLOWANCE_EXHAUSTED')
    expect(mockRequireAiAllowance).toHaveBeenCalledWith('client-1')
    expect(request.json).not.toHaveBeenCalled()
    expect(mockPrisma.client.findUnique).not.toHaveBeenCalled()
    expect(mockBuildWODContext).not.toHaveBeenCalled()
    expect(mockCheckWODGuardrails).not.toHaveBeenCalled()
    expect(mockGetWODUsageStats).not.toHaveBeenCalled()
    expect(mockGetResolvedAiKeys).not.toHaveBeenCalled()
    expect(mockCreateModelInstance).not.toHaveBeenCalled()
    expect(mockCreateAnthropic).not.toHaveBeenCalled()
    expect(mockCreateGoogleGenerativeAI).not.toHaveBeenCalled()
    expect(mockCreateOpenAI).not.toHaveBeenCalled()
    expect(mockWithAiContext).not.toHaveBeenCalled()
    expect(mockGenerateText).not.toHaveBeenCalled()
    expect(mockLogAiUsage).not.toHaveBeenCalled()
  })
})
