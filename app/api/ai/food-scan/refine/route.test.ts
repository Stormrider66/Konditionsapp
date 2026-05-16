import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mockGenerateObject = vi.hoisted(() => vi.fn())
const mockCreateGoogleGenerativeAI = vi.hoisted(() => vi.fn())
const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRequireFeatureAccess = vi.hoisted(() => vi.fn())
const mockRequireAiAllowance = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockResolveAthleteGoogleKeyContext = vi.hoisted(() => vi.fn())
const mockWithAiContext = vi.hoisted(() => vi.fn())
const mockWithGoogleLogging = vi.hoisted(() => vi.fn())
const mockLoggerChild = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
}))
const mockLoggerError = vi.hoisted(() => vi.fn())

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
    child: vi.fn(() => mockLoggerChild),
    error: mockLoggerError,
  },
}))

vi.mock('@/lib/ai/resolve-athlete-google-key', () => ({
  resolveAthleteGoogleKeyContext: mockResolveAthleteGoogleKeyContext,
}))

vi.mock('@/lib/ai/google', () => ({
  withGoogleLogging: mockWithGoogleLogging,
}))

vi.mock('@/lib/ai/usage-logger', () => ({
  withAiContext: mockWithAiContext,
}))

vi.mock('@/lib/ai/billing/require-ai-allowance', () => ({
  requireAiAllowance: mockRequireAiAllowance,
}))

import { POST } from './route'

const originalAnalysis = {
  success: true,
  items: [
    {
      name: 'Pasta',
      category: 'GRAIN',
      estimatedGrams: 250,
      portionDescription: '1 portion',
      calories: 500,
      proteinGrams: 18,
      carbsGrams: 82,
      fatGrams: 10,
      fiberGrams: 4,
    },
  ],
  totals: {
    calories: 500,
    proteinGrams: 18,
    carbsGrams: 82,
    fatGrams: 10,
    fiberGrams: 4,
  },
  mealDescription: 'Pasta',
  confidence: 0.85,
  notes: [],
}

const refinedAnalysis = {
  success: true,
  items: [
    {
      name: 'Blodpannkaka',
      category: 'OTHER',
      estimatedGrams: 220,
      portionDescription: '1 portion',
      calories: 380,
      proteinGrams: 18,
      carbsGrams: 42,
      fatGrams: 16,
      fiberGrams: 2,
    },
  ],
  totals: {
    calories: 380,
    proteinGrams: 18,
    carbsGrams: 42,
    fatGrams: 16,
    fiberGrams: 2,
  },
  mealDescription: 'Blodpannkaka',
  confidence: 0.9,
  notes: ['korrigerad'],
}

function makeRequest(body: Record<string, unknown>) {
  return {
    json: vi.fn(async () => body),
  } as unknown as NextRequest
}

describe('food scan refine API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      isCoachInAthleteMode: false,
      user: { id: 'user-1' },
    })
    mockRequireFeatureAccess.mockResolvedValue(null)
    mockRequireAiAllowance.mockResolvedValue(null)
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockResolveAthleteGoogleKeyContext.mockResolvedValue({
      googleKey: 'google-key',
      businessId: 'business-1',
      keyOwnerId: 'owner-1',
    })
    mockPrisma.dietaryPreferences.findUnique.mockResolvedValue({
      enhancedMacroAnalysis: true,
    })
    mockCreateGoogleGenerativeAI.mockReturnValue((modelId: string) => ({ modelId }))
    mockWithGoogleLogging.mockImplementation((model) => model)
    mockWithAiContext.mockImplementation((_ctx, fn) => fn())
  })

  it('retries transient Gemini overloads before returning the refined analysis', async () => {
    vi.useFakeTimers()
    mockGenerateObject
      .mockRejectedValueOnce(new Error('503 model is overloaded, please try again'))
      .mockResolvedValueOnce({ object: refinedAnalysis })

    const responsePromise = POST(makeRequest({
      originalAnalysis,
      refinementText: 'Det är blodpannkaka',
    }))

    await vi.advanceTimersByTimeAsync(600)
    const response = await responsePromise
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGenerateObject).toHaveBeenCalledTimes(2)
    expect(mockLoggerChild.warn).toHaveBeenCalledWith(
      'Food scan refine AI call failed',
      expect.objectContaining({ retrying: true, transient: true })
    )
    expect(body.result).toMatchObject({
      mealDescription: 'Blodpannkaka',
      items: [expect.objectContaining({ name: 'Blodpannkaka' })],
    })
  })
})
