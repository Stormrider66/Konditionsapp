import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  test: {
    findFirst: vi.fn(),
  },
  injuryAssessment: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/api/utils', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/auth-utils', () => ({
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { GET } from './route'

function fitnessProjectionRequest(query = '') {
  return new NextRequest(`http://localhost/api/cross-training/fitness-projection/client-1${query}`)
}

describe('/api/cross-training/fitness-projection/[clientId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockCanAccessClient.mockResolvedValue(true)
    mockPrisma.test.findFirst.mockResolvedValue({ vo2max: 62 })
    mockPrisma.injuryAssessment.findFirst.mockResolvedValue(null)
  })

  it('uses only decision-safe tests for the VO2max baseline', async () => {
    const response = await GET(fitnessProjectionRequest('?weeks=4&modality=DWR'), {
      params: Promise.resolve({ clientId: 'client-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.baselineVO2max).toBe(62)
    expect(mockPrisma.test.findFirst).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
      },
      orderBy: { testDate: 'desc' },
      select: { vo2max: true },
    })
  })
})
