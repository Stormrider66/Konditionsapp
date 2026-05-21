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
  food: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
    mockPrisma.food.findFirst.mockResolvedValue(null)
    mockPrisma.food.findMany.mockResolvedValue([])
    mockCreateGoogleGenerativeAI.mockReturnValue((modelId: string) => ({ modelId }))
    mockWithGoogleLogging.mockImplementation((model) => model)
    mockWithAiContext.mockImplementation((_ctx, fn) => fn())
  })

  it('updates corn pasta identity corrections from compound database matches', async () => {
    mockPrisma.food.findMany.mockResolvedValueOnce([
      {
        nameSv: 'Pasta kokt m. salt majs 100% glutenfri',
        nameEn: null,
        category: 'GRAIN',
        caloriesPer100g: 155,
        proteinPer100g: 2.9,
        carbsPer100g: 33,
        fatPer100g: 0.8,
        fiberPer100g: 1.2,
        saturatedFatPer100g: null,
        monounsaturatedFatPer100g: null,
        polyunsaturatedFatPer100g: null,
        sugarPer100g: null,
        isCompleteProtein: false,
        proteinSource: 'PLANT',
      },
    ])

    const response = await POST(makeRequest({
      originalAnalysis,
      refinementText: 'Det är majspasta',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGenerateObject).not.toHaveBeenCalled()
    expect(mockRequireAiAllowance).not.toHaveBeenCalled()
    expect(mockResolveAthleteGoogleKeyContext).not.toHaveBeenCalled()
    expect(body.fastRefine).toMatchObject({
      source: 'reference_food',
      targetIndex: 0,
    })
    expect(body.result).toMatchObject({
      mealDescription: 'Pasta kokt m. salt majs 100% glutenfri',
      items: [expect.objectContaining({
        name: 'Pasta kokt m. salt majs 100% glutenfri',
        calories: 388,
        proteinGrams: 7.3,
        carbsGrams: 82.5,
        fatGrams: 2,
        fiberGrams: 3,
      })],
      totals: expect.objectContaining({
        calories: 388,
        proteinGrams: 7.3,
        carbsGrams: 82.5,
        fatGrams: 2,
        fiberGrams: 3,
      }),
    })
  })

  it('preserves macro density for simple identity corrections without a database match', async () => {
    const response = await POST(makeRequest({
      originalAnalysis,
      refinementText: 'Det är specialpasta',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGenerateObject).not.toHaveBeenCalled()
    expect(mockRequireAiAllowance).not.toHaveBeenCalled()
    expect(body.fastRefine).toMatchObject({
      source: 'preserved_similar_item',
      targetIndex: 0,
    })
    expect(body.result).toMatchObject({
      mealDescription: 'Specialpasta',
      items: [expect.objectContaining({
        name: 'Specialpasta',
        calories: 500,
        proteinGrams: 18,
        carbsGrams: 82,
      })],
      totals: expect.objectContaining({
        calories: 500,
        proteinGrams: 18,
        carbsGrams: 82,
      }),
    })
  })

  it('uses the reference food database for simple identity corrections when available', async () => {
    mockPrisma.food.findFirst.mockResolvedValueOnce({
      nameSv: 'Quinoa kokt',
      nameEn: 'Cooked quinoa',
      category: 'GRAIN',
      caloriesPer100g: 120,
      proteinPer100g: 4.4,
      carbsPer100g: 21.3,
      fatPer100g: 1.9,
      fiberPer100g: 2.8,
      saturatedFatPer100g: 0.2,
      monounsaturatedFatPer100g: 0.5,
      polyunsaturatedFatPer100g: 1,
      sugarPer100g: 0.9,
      isCompleteProtein: true,
      proteinSource: 'PLANT',
    })

    const response = await POST(makeRequest({
      originalAnalysis,
      refinementText: 'Det är quinoa',
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGenerateObject).not.toHaveBeenCalled()
    expect(mockRequireAiAllowance).not.toHaveBeenCalled()
    expect(body.fastRefine).toMatchObject({
      source: 'reference_food',
      targetIndex: 0,
    })
    expect(body.result.items[0]).toMatchObject({
      name: 'Quinoa kokt',
      category: 'GRAIN',
      estimatedGrams: 250,
      calories: 300,
      proteinGrams: 11,
      carbsGrams: 53.3,
      fatGrams: 4.8,
      fiberGrams: 7,
      sugarGrams: 2.3,
      complexCarbsGrams: 51,
      isCompleteProtein: true,
      proteinSource: 'PLANT',
    })
    expect(body.result.totals).toMatchObject({
      calories: 300,
      proteinGrams: 11,
      carbsGrams: 53.3,
      fatGrams: 4.8,
      fiberGrams: 7,
    })
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
