/**
 * Tests for Exercise API endpoints
 *
 * Covers:
 * - Exercise listing with hidden exercise filtering
 * - Exercise deletion (custom vs public)
 * - Hidden exercise toggle
 * - Bulk image generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exercise: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    hiddenExercise: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    strengthSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/api/utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', role: 'COACH' }),
  handleApiError: vi.fn((error) => {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }),
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', role: 'COACH' }),
  canAccessExercise: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { prisma } from '@/lib/prisma'

describe('Hidden Exercises API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/exercises/hidden returns empty array when no hidden exercises', async () => {
    const { GET } = await import('@/app/api/exercises/hidden/route')

    vi.mocked(prisma.hiddenExercise.findMany).mockResolvedValue([])

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  it('GET /api/exercises/hidden returns hidden exercise IDs', async () => {
    const { GET } = await import('@/app/api/exercises/hidden/route')

    vi.mocked(prisma.hiddenExercise.findMany).mockResolvedValue([
      { exerciseId: 'ex-1' },
      { exerciseId: 'ex-2' },
    ] as any)

    const response = await GET()
    const data = await response.json()
    expect(data.data).toEqual(['ex-1', 'ex-2'])
  })

  it('POST /api/exercises/hidden toggles hidden state', async () => {
    const { POST } = await import('@/app/api/exercises/hidden/route')

    // First call: not hidden yet → should create
    vi.mocked(prisma.hiddenExercise.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.hiddenExercise.create).mockResolvedValue({ id: 'h1' } as any)

    const request = new Request('http://localhost/api/exercises/hidden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: 'ex-1' }),
    }) as any

    const response = await POST(request)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.hidden).toBe(true)
    expect(prisma.hiddenExercise.create).toHaveBeenCalled()
  })

  it('POST /api/exercises/hidden unhides when already hidden', async () => {
    const { POST } = await import('@/app/api/exercises/hidden/route')

    vi.mocked(prisma.hiddenExercise.findUnique).mockResolvedValue({ id: 'h1' } as any)
    vi.mocked(prisma.hiddenExercise.delete).mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/exercises/hidden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: 'ex-1' }),
    }) as any

    const response = await POST(request)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.hidden).toBe(false)
    expect(prisma.hiddenExercise.delete).toHaveBeenCalled()
  })
})

describe('Most Used Exercises API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/exercises/most-used returns ranked exercise IDs', async () => {
    vi.mocked(prisma.strengthSession.findMany).mockResolvedValue([
      { exercises: [{ exerciseId: 'ex-1' }, { exerciseId: 'ex-2' }, { exerciseId: 'ex-1' }], warmupData: null, coreData: null, cooldownData: null },
      { exercises: [{ exerciseId: 'ex-1' }, { exerciseId: 'ex-3' }], warmupData: null, coreData: null, cooldownData: null },
    ] as any)

    const { GET } = await import('@/app/api/exercises/most-used/route')

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    // ex-1 appears 3 times, should be ranked first
    expect(data.data[0].exerciseId).toBe('ex-1')
    expect(data.data[0].count).toBe(3)
  })
})
