import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockClientFindUnique = vi.hoisted(() => vi.fn())
const mockClientFindFirst = vi.hoisted(() => vi.fn())
const mockTestCreate = vi.hoisted(() => vi.fn())
const mockTestFindMany = vi.hoisted(() => vi.fn())
const mockTestCount = vi.hoisted(() => vi.fn())
const mockLocationFindFirst = vi.hoisted(() => vi.fn())
const mockTesterFindUnique = vi.hoisted(() => vi.fn())
const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockCanAccessCoachPlatform = vi.hoisted(() => vi.fn())
const mockGetBusinessMembership = vi.hoisted(() => vi.fn())
const mockGenerateVisualReport = vi.hoisted(() => vi.fn())
const mockLoggerError = vi.hoisted(() => vi.fn())
const mockSupabaseGetUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      findUnique: mockClientFindUnique,
      findFirst: mockClientFindFirst,
    },
    test: {
      create: mockTestCreate,
      findMany: mockTestFindMany,
      count: mockTestCount,
    },
    location: {
      findFirst: mockLocationFindFirst,
    },
    tester: {
      findUnique: mockTesterFindUnique,
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  canAccessClient: mockCanAccessClient,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/user-capabilities', () => ({
  canAccessCoachPlatform: mockCanAccessCoachPlatform,
}))

vi.mock('@/lib/coach/team-access', () => ({
  getBusinessMembership: mockGetBusinessMembership,
}))

vi.mock('@/lib/ai/visual-reports', () => ({
  generateVisualReport: mockGenerateVisualReport,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockSupabaseGetUser,
    },
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mockLoggerError,
  },
}))

import { GET, POST } from './route'

const scopedClientId = '11111111-1111-4111-8111-111111111111'

function testRequest(body: unknown) {
  return new NextRequest('http://localhost/api/tests', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-business-slug': 'skelleftea-aik',
    },
    body: JSON.stringify(body),
  })
}

describe('/api/tests business scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({
      id: 'coach-a',
      name: 'Coach A',
      language: 'en',
    })
    mockSupabaseGetUser.mockResolvedValue({
      data: { user: { id: 'coach-a' } },
    })
    mockCanAccessCoachPlatform.mockResolvedValue(true)
    mockCanAccessClient.mockResolvedValue(true)
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'skelleftea-aik' })
    mockGetBusinessMembership.mockResolvedValue({
      businessId: 'business-skelleftea',
      role: 'COACH',
    })
    mockClientFindFirst.mockResolvedValue({ id: scopedClientId })
    mockTestFindMany.mockResolvedValue([])
    mockTestCount.mockResolvedValue(0)
    mockLocationFindFirst.mockResolvedValue(null)
    mockTesterFindUnique.mockResolvedValue(null)
    mockGenerateVisualReport.mockResolvedValue(undefined)
  })

  it('rejects creating a test for a client outside the active business', async () => {
    mockClientFindUnique.mockResolvedValue({
      id: scopedClientId,
      businessId: 'business-star',
    })

    const response = await POST(testRequest({
      clientId: scopedClientId,
      testDate: '2026-05-23',
      testType: 'RUNNING',
      stages: [
        { duration: 4, heartRate: 120, lactate: 1.2, speed: 10 },
        { duration: 4, heartRate: 145, lactate: 2.1, speed: 12 },
        { duration: 4, heartRate: 168, lactate: 4.4, speed: 14 },
      ],
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Unauthorized - client does not belong to you',
    })
    expect(mockTestCreate).not.toHaveBeenCalled()
  })

  it('filters test history to clients in the active business', async () => {
    const request = new NextRequest(`http://localhost/api/tests?clientId=${scopedClientId}`, {
      headers: { 'x-business-slug': 'skelleftea-aik' },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockClientFindFirst).toHaveBeenCalledWith({
      where: {
        id: scopedClientId,
        businessId: 'business-skelleftea',
      },
      select: { id: true },
    })
    expect(mockTestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'coach-a',
          clientId: scopedClientId,
          client: { businessId: 'business-skelleftea' },
        },
      }),
    )
    expect(mockTestCount).toHaveBeenCalledWith({
      where: {
        userId: 'coach-a',
        clientId: scopedClientId,
        client: { businessId: 'business-skelleftea' },
      },
    })
  })

  it('marks newly created tests as review required when lactate drops', async () => {
    mockClientFindUnique.mockResolvedValue({
      id: scopedClientId,
      businessId: 'business-skelleftea',
    })
    mockTestCreate.mockResolvedValue({
      id: 'test-1',
      clientId: scopedClientId,
      testStages: [],
    })

    const response = await POST(testRequest({
      clientId: scopedClientId,
      testDate: '2026-05-23',
      testType: 'RUNNING',
      stages: [
        { duration: 4, heartRate: 120, lactate: 1.2, speed: 10 },
        { duration: 4, heartRate: 145, lactate: 2.4, speed: 12 },
        { duration: 4, heartRate: 168, lactate: 1.8, speed: 14 },
      ],
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.warnings).toHaveLength(1)
    expect(mockTestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qualityReviewStatus: 'REVIEW_REQUIRED',
          qualityWarnings: expect.arrayContaining([
            expect.objectContaining({ type: 'LACTATE_DROP' }),
          ]),
        }),
      })
    )
  })
})
