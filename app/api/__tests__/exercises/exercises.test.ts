import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/exercises/route'
import { NextRequest } from 'next/server'

// Mock auth utilities
const mockGetCurrentUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  getRequestedBusinessScope: (request: NextRequest) => ({
    businessSlug: request.headers.get('x-business-slug') || undefined,
    businessId: request.headers.get('x-business-id') || undefined,
  }),
  requireCoach: vi.fn(),
  requireAthlete: vi.fn(),
  resolveAthleteClientId: vi.fn(),
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: vi.fn(() => Promise.resolve(true)),
}))

// Mock Prisma
const mockPrisma = vi.hoisted(() => ({
  exercise: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  businessMember: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
    }
  }))
}))

// Sample exercises for testing
const sampleExercises = [
  {
    id: 'ex-1',
    name: 'Romanian Deadlift',
    nameSv: 'Rumänskt marklyft',
    category: 'STRENGTH',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_2',
    muscleGroup: 'Hamstrings, Glutes',
    difficulty: 'INTERMEDIATE',
    isPublic: true,
  },
  {
    id: 'ex-2',
    name: 'Nordic Hamstring Curl',
    nameSv: 'Nordisk knäböj',
    category: 'STRENGTH',
    biomechanicalPillar: 'POSTERIOR_CHAIN',
    progressionLevel: 'LEVEL_3',
    muscleGroup: 'Hamstrings',
    difficulty: 'ADVANCED',
    isPublic: true,
  },
  {
    id: 'ex-3',
    name: 'Box Jump',
    nameSv: 'Lådhopp',
    category: 'PLYOMETRIC',
    biomechanicalPillar: 'KNEE_DOMINANCE',
    progressionLevel: 'LEVEL_2',
    muscleGroup: 'Quadriceps, Glutes',
    difficulty: 'INTERMEDIATE',
    plyometricIntensity: 'MEDIUM',
    isPublic: true,
  },
]

// Helper to create a mock request
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/exercises')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: object, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/exercises', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('GET /api/exercises', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user', role: 'COACH' })
    mockPrisma.businessMember.findMany.mockResolvedValue([])
    mockPrisma.businessMember.findFirst.mockResolvedValue(null)
    mockPrisma.$transaction.mockResolvedValue([sampleExercises, sampleExercises.length])
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createGetRequest()
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Pagination', () => {
    it('returns exercises with default pagination', async () => {
      const request = createGetRequest()
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()

      expect(body.exercises).toBeDefined()
      expect(body.pagination).toBeDefined()
      expect(body.pagination.limit).toBe(50)
      expect(body.pagination.offset).toBe(0)
    })

    it('respects custom pagination parameters', async () => {
      const request = createGetRequest({ limit: '20', offset: '40' })
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('caps limit at 500', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])

      const request = createGetRequest({ limit: '1000' })
      const response = await GET(request)
      const body = await response.json()

      expect(body.pagination.limit).toBe(500)
    })

    it('ensures limit is at least 1', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])

      const request = createGetRequest({ limit: '0' })
      const response = await GET(request)
      const body = await response.json()

      expect(body.pagination.limit).toBe(1)
    })

    it('calculates pagination metadata correctly', async () => {
      mockPrisma.$transaction.mockResolvedValue([sampleExercises, 100])

      const request = createGetRequest({ limit: '10', offset: '20' })
      const response = await GET(request)
      const body = await response.json()

      expect(body.pagination.totalCount).toBe(100)
      expect(body.pagination.totalPages).toBe(10)
      expect(body.pagination.currentPage).toBe(3)
      expect(body.pagination.hasNextPage).toBe(true)
      expect(body.pagination.hasPreviousPage).toBe(true)
    })
  })

  describe('Sorting', () => {
    it('sorts by name by default', async () => {
      const request = createGetRequest()
      await GET(request)

      // The transaction should be called with findMany that has orderBy
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('rejects invalid sort fields (sortBy injection protection)', async () => {
      mockPrisma.$transaction.mockResolvedValue([sampleExercises, 3])

      // Try to inject a malicious sortBy field
      const request = createGetRequest({ sortBy: 'name; DROP TABLE exercises;--' })
      const response = await GET(request)

      // Should still work, falling back to 'name'
      expect(response.status).toBe(200)
    })

    it('accepts valid sort fields', async () => {
      mockPrisma.$transaction.mockResolvedValue([sampleExercises, 3])

      const validFields = ['name', 'nameSv', 'category', 'difficulty', 'createdAt']
      for (const field of validFields) {
        const request = createGetRequest({ sortBy: field })
        const response = await GET(request)
        expect(response.status).toBe(200)
      }
    })

    it('supports ascending and descending sort order', async () => {
      mockPrisma.$transaction.mockResolvedValue([sampleExercises, 3])

      const ascRequest = createGetRequest({ sortOrder: 'asc' })
      const ascResponse = await GET(ascRequest)
      expect(ascResponse.status).toBe(200)

      const descRequest = createGetRequest({ sortOrder: 'desc' })
      const descResponse = await GET(descRequest)
      expect(descResponse.status).toBe(200)
    })
  })

  describe('Filtering', () => {
    it('includes business-scoped exercises for active business coaches', async () => {
      mockPrisma.businessMember.findMany.mockResolvedValue([{ businessId: 'business-1' }])

      const request = createGetRequest()
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { isPublic: true },
                { coachId: 'test-user' },
                { businessId: { in: ['business-1'] } },
              ]),
            }),
          ]),
        }),
      }))
    })

    it('keeps legacy private exercises owner-scoped when coach has no business library', async () => {
      const request = createGetRequest()
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { isPublic: true },
                { coachId: 'test-user' },
              ]),
            }),
          ]),
        }),
      }))
    })

    it('filters by category', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        sampleExercises.filter(e => e.category === 'STRENGTH'),
        2
      ])

      const request = createGetRequest({ category: 'STRENGTH' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('filters by biomechanical pillar', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        sampleExercises.filter(e => e.biomechanicalPillar === 'POSTERIOR_CHAIN'),
        2
      ])

      const request = createGetRequest({ pillar: 'POSTERIOR_CHAIN' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('filters by progression level', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        sampleExercises.filter(e => e.progressionLevel === 'LEVEL_2'),
        2
      ])

      const request = createGetRequest({ level: 'LEVEL_2' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('filters by search term across multiple fields', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        sampleExercises.filter(e => e.name.includes('Deadlift')),
        1
      ])

      const request = createGetRequest({ search: 'Deadlift' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('ignores ALL filter value', async () => {
      mockPrisma.$transaction.mockResolvedValue([sampleExercises, 3])

      const request = createGetRequest({ category: 'ALL', pillar: 'ALL' })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})

describe('POST /api/exercises', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'test-user', role: 'COACH' })
    mockPrisma.businessMember.findMany.mockResolvedValue([])
    mockPrisma.businessMember.findFirst.mockResolvedValue(null)
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createPostRequest({
        name: 'Test Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('returns 400 when name is missing', async () => {
      const request = createPostRequest({
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toContain('required')
    })

    it('returns 400 when category is missing', async () => {
      const request = createPostRequest({
        name: 'Test Exercise',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('returns 400 when biomechanicalPillar is missing', async () => {
      const request = createPostRequest({
        name: 'Test Exercise',
        category: 'STRENGTH',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Exercise Creation', () => {
    it('creates an exercise with required fields', async () => {
      const newExercise = {
        id: 'new-ex',
        name: 'Test Exercise',
        nameSv: 'Test Exercise',
        nameEn: 'Test Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
        isPublic: false,
      }

      mockPrisma.exercise.create.mockResolvedValue(newExercise)

      const request = createPostRequest({
        name: 'Test Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const body = await response.json()
      expect(body.name).toBe('Test Exercise')
    })

    it('creates an exercise with all fields', async () => {
      const fullExercise = {
        id: 'new-ex',
        name: 'Full Exercise',
        nameSv: 'Full Övning',
        nameEn: 'Full Exercise EN',
        category: 'PLYOMETRIC',
        biomechanicalPillar: 'KNEE_DOMINANCE',
        muscleGroup: 'Quadriceps',
        progressionLevel: 'LEVEL_2',
        difficulty: 'INTERMEDIATE',
        description: 'A test exercise',
        instructions: ['Step 1', 'Step 2'],
        equipment: 'Box',
        videoUrl: 'https://example.com/video',
        imageUrl: 'https://example.com/image',
        plyometricIntensity: 'MEDIUM',
        contactsPerRep: 2,
        isPublic: true,
        userId: 'user-123',
      }

      mockPrisma.exercise.create.mockResolvedValue(fullExercise)

      const request = createPostRequest(fullExercise)
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.exercise.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Full Exercise',
          nameSv: 'Full Övning',
          plyometricIntensity: 'MEDIUM',
          isPublic: false,
          coachId: 'test-user',
          businessId: null,
        }),
      })
    })

    it('defaults nameSv and nameEn to name if not provided', async () => {
      mockPrisma.exercise.create.mockResolvedValue({
        id: 'new-ex',
        name: 'Only Name',
        nameSv: 'Only Name',
        nameEn: 'Only Name',
        category: 'STRENGTH',
        biomechanicalPillar: 'CORE',
      })

      const request = createPostRequest({
        name: 'Only Name',
        category: 'STRENGTH',
        biomechanicalPillar: 'CORE',
      })

      await POST(request)

      expect(mockPrisma.exercise.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nameSv: 'Only Name',
          nameEn: 'Only Name',
        }),
      })
    })

    it('creates a private coach exercise by default', async () => {
      mockPrisma.exercise.create.mockResolvedValue({
        id: 'private-ex',
        name: 'Private Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
        isPublic: false,
        coachId: 'test-user',
        businessId: null,
      })

      const request = createPostRequest({
        name: 'Private Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.exercise.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublic: false,
          coachId: 'test-user',
          businessId: null,
        }),
      })
    })

    it('creates a business-scoped exercise when requested from a business route', async () => {
      mockPrisma.businessMember.findFirst.mockResolvedValue({ businessId: 'business-1' })
      mockPrisma.exercise.create.mockResolvedValue({
        id: 'business-ex',
        name: 'Business Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
        isPublic: false,
        coachId: 'test-user',
        businessId: 'business-1',
      })

      const request = createPostRequest(
        {
          name: 'Business Exercise',
          category: 'STRENGTH',
          biomechanicalPillar: 'POSTERIOR_CHAIN',
          visibility: 'BUSINESS',
        },
        { 'x-business-slug': 'star-by-thomson' },
      )

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.businessMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user',
          business: expect.objectContaining({ slug: 'star-by-thomson' }),
        }),
      }))
      expect(mockPrisma.exercise.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublic: false,
          coachId: 'test-user',
          businessId: 'business-1',
        }),
      })
    })

    it('rejects business visibility without active business membership', async () => {
      mockPrisma.businessMember.findFirst.mockResolvedValue(null)

      const request = createPostRequest({
        name: 'Business Exercise',
        category: 'STRENGTH',
        biomechanicalPillar: 'POSTERIOR_CHAIN',
        visibility: 'BUSINESS',
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      expect(mockPrisma.exercise.create).not.toHaveBeenCalled()
    })
  })
})
