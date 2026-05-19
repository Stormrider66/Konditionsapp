import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  nutritionRecipe: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  food: {
    updateMany: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { POST } from './route'

describe('nutrition recipes route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      user: { id: 'user-1' },
    })
    mockPrisma.food.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.nutritionRecipe.create.mockImplementation(async ({ data }) => ({
      id: 'recipe-1',
      clientId: data.clientId,
      name: data.name,
      description: data.description ?? null,
      baseServings: data.baseServings,
      source: data.source,
      items: data.items.create,
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    }))
  })

  it('saves a recipe with slash in the name and null optional ingredient fields', async () => {
    const request = new NextRequest('http://localhost/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bananbröd / bananfrallor 1',
        description: null,
        baseServings: 1,
        source: 'MANUAL',
        items: [
          {
            foodId: null,
            name: 'Banan',
            category: null,
            grams: 300,
            caloriesPer100g: 89,
            proteinPer100g: 1.1,
            carbsPer100g: 22.8,
            fatPer100g: 0.3,
            fiberPer100g: null,
          },
        ],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(mockPrisma.nutritionRecipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Bananbröd / bananfrallor 1',
          description: undefined,
          items: {
            create: [
              expect.objectContaining({
                foodId: undefined,
                category: undefined,
                fiberPer100g: 0,
              }),
            ],
          },
        }),
      })
    )
  })

  it('returns an English helpful message instead of a generic validation error by default', async () => {
    const request = new NextRequest('http://localhost/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bananbröd / bananfrallor 1',
        baseServings: 1,
        source: 'MANUAL',
        items: [
          {
            name: 'Bananbröd',
            grams: 100,
            carbsPer100g: 565.8,
          },
        ],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Could not save the recipe. Check the nutrition values per 100 g.')
  })

  it('keeps Swedish validation copy for Swedish athletes', async () => {
    mockResolveAthleteClientId.mockResolvedValue({
      clientId: 'client-1',
      user: { id: 'user-1', language: 'sv' },
    })

    const request = new NextRequest('http://localhost/api/nutrition/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bananbröd / bananfrallor 1',
        baseServings: 1,
        source: 'MANUAL',
        items: [
          {
            name: 'Bananbröd',
            grams: 100,
            carbsPer100g: 565.8,
          },
        ],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Kunde inte spara receptet. Kontrollera näringsvärdena per 100 g.')
  })
})
