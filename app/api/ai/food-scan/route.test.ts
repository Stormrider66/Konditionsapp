import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

const mockGenerateObject = vi.hoisted(() => vi.fn())
const mockCreateGoogleGenerativeAI = vi.hoisted(() => vi.fn())
const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRequireFeatureAccess = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockResolveAthleteGoogleKeyContext = vi.hoisted(() => vi.fn())
const mockBuildFoodMemoryContext = vi.hoisted(() => vi.fn())
const mockLogAiUsage = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  dietaryPreferences: {
    findUnique: vi.fn(),
  },
}))

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mockCreateGoogleGenerativeAI,
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/ai/gemini-config', () => ({
  GEMINI_MODELS: {
    FLASH: 'gemini-flash-test',
  },
  GEMINI_PRICING: {
    'gemini-flash-test': {
      input: 0.001,
      output: 0.002,
    },
  },
  getGeminiThinkingOptions: vi.fn(() => ({})),
}))

vi.mock('@/lib/validations/gemini-schemas', () => ({
  FoodPhotoAnalysisSchema: {},
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/subscription/require-feature-access', () => ({
  requireFeatureAccess: mockRequireFeatureAccess,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/ai/resolve-athlete-google-key', () => ({
  resolveAthleteGoogleKeyContext: mockResolveAthleteGoogleKeyContext,
}))

vi.mock('@/lib/nutrition/build-memory-context', () => ({
  buildFoodMemoryContext: mockBuildFoodMemoryContext,
}))

vi.mock('@/lib/ai/usage-logger', () => ({
  logAiUsage: mockLogAiUsage,
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK: {
    foodScan: 0.05,
  },
  requireAiAllowance: mockRequireAiAllowance,
}))

vi.mock('@/lib/nutrition/portion-calibration', () => ({
  calibratePortions: vi.fn(),
  fetchPortionStats: vi.fn(),
  recomputeTotals: vi.fn(),
}))

import { POST } from './route'

describe('food scan API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'user-1' },
    })
    mockRequireFeatureAccess.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
    mockRateLimitJsonResponse.mockResolvedValue(null)
  })

  it('blocks exhausted AI credits before parsing the image or calling Gemini', async () => {
    const exhaustedResponse = NextResponse.json(
      {
        error: 'AI credits exhausted',
        code: 'AI_ALLOWANCE_EXHAUSTED',
      },
      { status: 402 }
    )
    mockRequireAiAllowance.mockResolvedValue(exhaustedResponse)

    const formData = vi.fn()
    const request = { formData } as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body.code).toBe('AI_ALLOWANCE_EXHAUSTED')
    expect(mockRequireAiAllowance).toHaveBeenCalledWith('client-1', {
      minimumRemainingSek: 0.05,
    })
    expect(formData).not.toHaveBeenCalled()
    expect(mockRateLimitJsonResponse).not.toHaveBeenCalled()
    expect(mockResolveAthleteGoogleKeyContext).not.toHaveBeenCalled()
    expect(mockCreateGoogleGenerativeAI).not.toHaveBeenCalled()
    expect(mockGenerateObject).not.toHaveBeenCalled()
    expect(mockLogAiUsage).not.toHaveBeenCalled()
  })
})
