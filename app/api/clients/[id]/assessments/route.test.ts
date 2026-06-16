import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockHandleApiError = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockResolveRequestLocale = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  hockeyPhysicalTest: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  sportTest: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  ergometerFieldTest: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  customTestResult: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/api/utils', () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}))

vi.mock('@/lib/auth-utils', () => ({
  canAccessClient: mockCanAccessClient,
}))

vi.mock('@/lib/i18n/request-locale', () => ({
  resolveRequestLocale: mockResolveRequestLocale,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from './route'

function assessmentsRequest(query = '') {
  return new NextRequest(`http://localhost/api/clients/client-1/assessments${query}`)
}

describe('/api/clients/[id]/assessments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockHandleApiError.mockImplementation(() => new Response(JSON.stringify({ error: 'failed' }), { status: 500 }))
    mockCanAccessClient.mockResolvedValue(true)
    mockResolveRequestLocale.mockReturnValue('en')
    mockPrisma.test.findMany.mockResolvedValue([])
    mockPrisma.test.count.mockResolvedValue(0)
    mockPrisma.hockeyPhysicalTest.findMany.mockResolvedValue([])
    mockPrisma.hockeyPhysicalTest.count.mockResolvedValue(0)
    mockPrisma.sportTest.findMany.mockResolvedValue([])
    mockPrisma.sportTest.count.mockResolvedValue(0)
    mockPrisma.ergometerFieldTest.findMany.mockResolvedValue([])
    mockPrisma.ergometerFieldTest.count.mockResolvedValue(0)
    mockPrisma.customTestResult.findMany.mockResolvedValue([])
    mockPrisma.customTestResult.count.mockResolvedValue(0)
  })

  it('returns a review-only endurance feed when requested', async () => {
    mockPrisma.test.findMany.mockResolvedValue([
      {
        id: 'test-1',
        testDate: new Date('2026-06-15T00:00:00.000Z'),
        testType: 'RUNNING',
        vo2max: null,
        maxHR: 182,
        status: 'COMPLETED',
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarnings: [
          {
            type: 'LACTATE_DROP',
            severity: 'warning',
            message: 'Lactate dropped between stages.',
          },
        ],
      },
    ])
    mockPrisma.test.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)

    const response = await GET(assessmentsRequest('?reviewStatus=REVIEW_REQUIRED'), {
      params: Promise.resolve({ id: 'client-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          qualityReviewStatus: 'REVIEW_REQUIRED',
        },
      })
    )
    expect(mockPrisma.hockeyPhysicalTest.findMany).not.toHaveBeenCalled()
    expect(body.data).toEqual([
      expect.objectContaining({
        id: 'test-1',
        kind: 'ENDURANCE',
        label: 'Running',
        summary: 'Max HR 182 bpm',
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarningCount: 1,
      }),
    ])
    expect(body.counts).toMatchObject({
      endurance: 4,
      reviewRequired: 1,
      total: 4,
    })
  })
})
