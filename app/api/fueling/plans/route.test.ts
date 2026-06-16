import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
  test: {
    findFirst: vi.fn(),
  },
  raceFuelingPlan: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  resolveAthleteClientId: mockResolveAthleteClientId,
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

import { POST } from './route'

const clientId = '11111111-1111-4111-8111-111111111111'
const testId = '22222222-2222-4222-8222-222222222222'

function fuelingPostRequest() {
  return new NextRequest('http://localhost/api/fueling/plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientId,
      testId,
      sport: 'RUNNING',
      durationMinutes: 120,
    }),
  })
}

describe('/api/fueling/plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockResolveAthleteClientId.mockResolvedValue(null)
    mockCanAccessClient.mockResolvedValue(true)
    mockPrisma.client.findUnique.mockResolvedValue({ weight: 70 })
    mockPrisma.test.findFirst.mockResolvedValue(null)
    mockPrisma.raceFuelingPlan.create.mockResolvedValue({})
  })

  it('does not use a selected test that still requires quality review', async () => {
    const response = await POST(fuelingPostRequest())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain('requires coach review')
    expect(mockPrisma.test.findFirst).toHaveBeenCalledWith({
      where: {
        id: testId,
        clientId,
        qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
      },
      include: { testStages: true },
    })
    expect(mockPrisma.raceFuelingPlan.create).not.toHaveBeenCalled()
  })
})
