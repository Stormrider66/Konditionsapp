import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockHandleApiError = vi.hoisted(() => vi.fn())
const mockCanAccessClient = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  hockeyPhysicalTest: {
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

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from './route'

describe('/api/clients/[id]/recent-tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockCanAccessClient.mockResolvedValue(true)
    mockHandleApiError.mockImplementation(() => new Response(JSON.stringify({ error: 'failed' }), { status: 500 }))
    mockPrisma.test.findMany.mockResolvedValue([])
    mockPrisma.test.count.mockResolvedValue(0)
    mockPrisma.hockeyPhysicalTest.findMany.mockResolvedValue([])
    mockPrisma.hockeyPhysicalTest.count.mockResolvedValue(0)
    mockPrisma.customTestResult.findMany.mockResolvedValue([])
    mockPrisma.customTestResult.count.mockResolvedValue(0)
  })

  it('returns quality review metadata for lab test summaries', async () => {
    mockPrisma.test.findMany.mockResolvedValue([
      {
        id: 'test-1',
        testDate: new Date('2026-06-15T00:00:00.000Z'),
        testType: 'RUNNING',
        vo2max: 58.2,
        maxHR: null,
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarnings: [
          { type: 'LACTATE_DROP', severity: 'warning', message: 'Lactate dropped.' },
        ],
      },
    ])
    mockPrisma.test.count.mockResolvedValue(1)

    const response = await GET(new NextRequest('http://localhost/api/clients/client-1/recent-tests'), {
      params: Promise.resolve({ id: 'client-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          qualityReviewStatus: true,
          qualityWarnings: true,
        }),
      })
    )
    expect(body.data).toEqual([
      expect.objectContaining({
        id: 'test-1',
        kind: 'TEST',
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarningCount: 1,
      }),
    ])
  })
})
