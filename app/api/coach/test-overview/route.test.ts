import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetStaffPermissions = vi.hoisted(() => vi.fn())
const mockGetStaffRolePreview = vi.hoisted(() => vi.fn())
const mockGetBusinessMembership = vi.hoisted(() => vi.fn())
const mockGetCoachScopedIds = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
  },
  fieldTest: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/permissions/assistant-coach', () => ({
  getStaffPermissions: mockGetStaffPermissions,
}))

vi.mock('@/lib/permissions/role-preview-server', () => ({
  getStaffRolePreview: mockGetStaffRolePreview,
}))

vi.mock('@/lib/coach/team-access', () => ({
  getBusinessMembership: mockGetBusinessMembership,
}))

vi.mock('@/lib/coach/scoping', () => ({
  getCoachScopedIds: mockGetCoachScopedIds,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from './route'

describe('/api/coach/test-overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-1', language: 'en' })
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'star' })
    mockGetBusinessMembership.mockResolvedValue({
      businessId: 'business-1',
      role: 'COACH',
    })
    mockGetStaffRolePreview.mockResolvedValue(null)
    mockGetStaffPermissions.mockResolvedValue({
      isTeamScoped: false,
      assignedTeamIds: [],
    })
    mockGetCoachScopedIds.mockResolvedValue(['coach-1'])
    mockPrisma.fieldTest.findMany.mockResolvedValue([])
  })

  it('returns review status on rows, athlete summaries, and group stats', async () => {
    mockPrisma.test.findMany.mockResolvedValue([
      {
        id: 'test-1',
        clientId: 'client-1',
        client: {
          id: 'client-1',
          name: 'Runner One',
          teamId: 'team-1',
          team: { name: 'Team A' },
        },
        testType: 'RUNNING',
        testDate: new Date('2026-06-15T00:00:00.000Z'),
        vo2max: 58,
        maxHR: 188,
        maxLactate: 8.1,
        restingLactate: null,
        qualityReviewStatus: 'REVIEW_REQUIRED',
        qualityWarnings: [
          { type: 'LACTATE_DROP', severity: 'warning', message: 'Lactate dropped.' },
        ],
        testStages: [{ sequence: 1 }],
      },
      {
        id: 'test-2',
        clientId: 'client-1',
        client: {
          id: 'client-1',
          name: 'Runner One',
          teamId: 'team-1',
          team: { name: 'Team A' },
        },
        testType: 'RUNNING',
        testDate: new Date('2026-05-15T00:00:00.000Z'),
        vo2max: 55,
        maxHR: 184,
        maxLactate: 7.4,
        restingLactate: null,
        qualityReviewStatus: 'CLEAR',
        qualityWarnings: [],
        testStages: [{ sequence: 1 }],
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/coach/test-overview'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.tests[0]).toMatchObject({
      id: 'test-1',
      qualityReviewStatus: 'REVIEW_REQUIRED',
      qualityWarningCount: 1,
    })
    expect(body.athletes[0]).toMatchObject({
      id: 'client-1',
      latestQualityReviewStatus: 'REVIEW_REQUIRED',
      latestQualityWarningCount: 1,
      reviewRequiredCount: 1,
    })
    expect(body.groupStats[0]).toMatchObject({
      teamName: 'Team A',
      reviewRequiredCount: 1,
    })
  })
})
