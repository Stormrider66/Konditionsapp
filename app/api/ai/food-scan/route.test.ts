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
const mockCalibratePortions = vi.hoisted(() => vi.fn())
const mockFetchPortionStats = vi.hoisted(() => vi.fn())
const mockRecomputeTotals = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  dietaryPreferences: {
    findUnique: vi.fn(),
  },
  nutritionRecipe: {
    findFirst: vi.fn(),
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
  calibratePortions: mockCalibratePortions,
  fetchPortionStats: mockFetchPortionStats,
  recomputeTotals: mockRecomputeTotals,
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
    mockResolveAthleteGoogleKeyContext.mockResolvedValue({ googleKey: 'google-key' })
    mockCreateGoogleGenerativeAI.mockReturnValue((model: string) => `google:${model}`)
    mockPrisma.dietaryPreferences.findUnique.mockResolvedValue({
      enhancedMacroAnalysis: false,
      memoryEnabled: false,
    })
    mockPrisma.nutritionRecipe.findFirst.mockResolvedValue(null)
    mockFetchPortionStats.mockResolvedValue(new Map())
    mockCalibratePortions.mockReturnValue({ items: [], snaps: [] })
    mockRecomputeTotals.mockReturnValue({})
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

  it('injects selected saved recipe context and recalculates the matched recipe item from stored macros', async () => {
    mockPrisma.nutritionRecipe.findFirst.mockResolvedValue({
      id: 'recipe-1',
      name: 'Blodpannkaka',
      baseServings: 1,
      items: [
        {
          name: 'Blodpannkaka',
          grams: 100,
          caloriesPer100g: 200,
          proteinPer100g: 10,
          carbsPer100g: 20,
          fatPer100g: 5,
          fiberPer100g: 2,
        },
        {
          name: 'Mjölk',
          grams: 100,
          caloriesPer100g: 100,
          proteinPer100g: 5,
          carbsPer100g: 10,
          fatPer100g: 1,
          fiberPer100g: 3,
        },
      ],
    })
    mockGenerateObject.mockResolvedValue({
      object: {
        success: true,
        items: [
          {
            name: 'Blodpannkaka',
            category: 'GRAIN',
            estimatedGrams: 100,
            portionDescription: '1 bit',
            calories: 999,
            proteinGrams: 1,
            carbsGrams: 1,
            fatGrams: 1,
            fiberGrams: 1,
            source: 'SAVED_RECIPE',
            recipeId: 'recipe-1',
            recipeName: 'Blodpannkaka',
          },
          {
            name: 'Lingonsylt',
            category: 'OTHER',
            estimatedGrams: 30,
            portionDescription: '2 klickar',
            calories: 60,
            proteinGrams: 0.1,
            carbsGrams: 14.4,
            fatGrams: 0.1,
            fiberGrams: 0.3,
          },
        ],
        totals: {
          calories: 1059,
          proteinGrams: 1.1,
          carbsGrams: 15.4,
          fatGrams: 1.1,
          fiberGrams: 1.3,
        },
        mealDescription: 'Blodpannkaka med lingonsylt',
        suggestedMealType: 'AFTERNOON_SNACK',
        confidence: 0.9,
        notes: [],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const formData = new FormData()
    formData.append('image', new File(['image'], 'meal.png', { type: 'image/png' }))
    formData.append('recipeId', 'recipe-1')
    formData.append('recipeAmount', '95')
    formData.append('recipeAmountUnit', 'g')

    const request = new Request('http://localhost/api/ai/food-scan', {
      method: 'POST',
      body: formData,
    }) as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.nutritionRecipe.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'recipe-1', clientId: 'client-1' },
      })
    )
    const content = mockGenerateObject.mock.calls[0][0].messages[0].content as Array<{
      type: string
      text?: string
    }>
    const prompt = content.find((part) => part.type === 'text')?.text ?? ''
    expect(prompt).toContain('Blodpannkaka')
    expect(prompt).toContain('source="SAVED_RECIPE"')

    expect(body.selectedRecipeUsed).toBe(true)
    expect(body.result.items[0]).toMatchObject({
      name: 'Blodpannkaka',
      estimatedGrams: 95,
      portionDescription: '95 g',
      calories: 143,
      proteinGrams: 7.1,
      carbsGrams: 14.3,
      fatGrams: 2.9,
      fiberGrams: 2.4,
      source: 'SAVED_RECIPE',
      recipeId: 'recipe-1',
    })
    expect(body.result.totals).toMatchObject({
      calories: 203,
      proteinGrams: 7.2,
      carbsGrams: 28.7,
      fatGrams: 3,
      fiberGrams: 2.7,
    })
  })

  it('passes clarification answers into the Gemini prompt for a retry', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        success: true,
        items: [
          {
            name: 'Corn pasta',
            category: 'GRAIN',
            estimatedGrams: 200,
            portionDescription: '1 serving',
            calories: 310,
            proteinGrams: 6,
            carbsGrams: 66,
            fatGrams: 2,
            fiberGrams: 4,
          },
        ],
        totals: {
          calories: 310,
          proteinGrams: 6,
          carbsGrams: 66,
          fatGrams: 2,
          fiberGrams: 4,
        },
        mealDescription: 'Corn pasta',
        suggestedMealType: 'LUNCH',
        confidence: 0.85,
        notes: [],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const formData = new FormData()
    formData.append('image', new File(['image'], 'meal.png', { type: 'image/png' }))
    formData.append('clarificationQuestion', 'Is the main food pasta, rice, or potatoes?')
    formData.append('clarificationAnswer', 'It is corn pasta, about 200 g')

    const request = new Request('http://localhost/api/ai/food-scan', {
      method: 'POST',
      body: formData,
    }) as unknown as NextRequest

    const response = await POST(request)

    expect(response.status).toBe(200)
    const content = mockGenerateObject.mock.calls[0][0].messages[0].content as Array<{
      type: string
      text?: string
    }>
    const prompt = content.find((part) => part.type === 'text')?.text ?? ''
    expect(prompt).toContain('Previous question: Is the main food pasta, rice, or potatoes?')
    expect(prompt).toContain('User answer: It is corn pasta, about 200 g')
  })

  it('adds a fallback clarification question when Gemini returns unsuccessful without one', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        success: false,
        items: [],
        totals: {
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
          fiberGrams: 0,
        },
        mealDescription: '',
        confidence: 0.1,
        notes: ['unclear image'],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const formData = new FormData()
    formData.append('image', new File(['image'], 'meal.png', { type: 'image/png' }))

    const request = new Request('http://localhost/api/ai/food-scan', {
      method: 'POST',
      body: formData,
    }) as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.result).toMatchObject({
      success: false,
      clarification: {
        question: 'I could not identify the main food clearly. What is it?',
      },
    })
  })
})
