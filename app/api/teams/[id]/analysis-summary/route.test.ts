import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockTeamFindFirst = vi.hoisted(() => vi.fn())
const mockTrainingLoadFindMany = vi.hoisted(() => vi.fn())
const mockOneRepMaxHistoryFindMany = vi.hoisted(() => vi.fn())
const mockHockeyPhysicalTestFindMany = vi.hoisted(() => vi.fn())
const mockTestFindMany = vi.hoisted(() => vi.fn())
const mockHockeyNormReferenceFindMany = vi.hoisted(() => vi.fn())
const mockStrengthSessionAssignmentFindMany = vi.hoisted(() => vi.fn())
const mockCardioSessionAssignmentFindMany = vi.hoisted(() => vi.fn())
const mockHybridWorkoutAssignmentFindMany = vi.hoisted(() => vi.fn())
const mockAgilityWorkoutAssignmentFindMany = vi.hoisted(() => vi.fn())
const mockClientFindMany = vi.hoisted(() => vi.fn())
const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetAccessibleTeamWhere = vi.hoisted(() => vi.fn())
const mockLogError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findFirst: mockTeamFindFirst,
    },
    client: {
      findMany: mockClientFindMany,
    },
    trainingLoad: {
      findMany: mockTrainingLoadFindMany,
    },
    oneRepMaxHistory: {
      findMany: mockOneRepMaxHistoryFindMany,
    },
    hockeyPhysicalTest: {
      findMany: mockHockeyPhysicalTestFindMany,
    },
    test: {
      findMany: mockTestFindMany,
    },
    hockeyNormReference: {
      findMany: mockHockeyNormReferenceFindMany,
    },
    strengthSessionAssignment: {
      findMany: mockStrengthSessionAssignmentFindMany,
    },
    cardioSessionAssignment: {
      findMany: mockCardioSessionAssignmentFindMany,
    },
    hybridWorkoutAssignment: {
      findMany: mockHybridWorkoutAssignmentFindMany,
    },
    agilityWorkoutAssignment: {
      findMany: mockAgilityWorkoutAssignmentFindMany,
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
}))

vi.mock('@/lib/coach/team-access', () => ({
  getAccessibleTeamWhere: mockGetAccessibleTeamWhere,
}))

vi.mock('@/lib/logger-console', () => ({
  logError: mockLogError,
}))

import { GET } from './route'

describe('GET /api/teams/[id]/analysis-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-a', language: 'sv' })
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'star-by-thomson' })
    mockGetAccessibleTeamWhere.mockResolvedValue({
      OR: [
        { userId: 'owner-user' },
        { id: { in: ['team-1'] } },
      ],
    })
    mockTeamFindFirst.mockResolvedValue({
      id: 'team-1',
      name: 'Piteå Hockey A-lag',
      members: [],
    })
    mockTrainingLoadFindMany.mockResolvedValue([])
    mockOneRepMaxHistoryFindMany.mockResolvedValue([])
    mockHockeyPhysicalTestFindMany.mockResolvedValue([])
    mockTestFindMany.mockResolvedValue([])
    mockHockeyNormReferenceFindMany.mockResolvedValue([])
    mockStrengthSessionAssignmentFindMany.mockResolvedValue([])
    mockCardioSessionAssignmentFindMany.mockResolvedValue([])
    mockHybridWorkoutAssignmentFindMany.mockResolvedValue([])
    mockAgilityWorkoutAssignmentFindMany.mockResolvedValue([])
    mockClientFindMany.mockResolvedValue([])
  })

  it('uses business-scoped team access instead of direct coach ownership', async () => {
    const request = new NextRequest('http://localhost/api/teams/team-1/analysis-summary', {
      headers: { 'x-business-slug': 'star-by-thomson' },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'team-1' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        teamId: 'team-1',
        teamName: 'Piteå Hockey A-lag',
        members: [],
      },
    })
    expect(mockGetRequestedBusinessScope).toHaveBeenCalledWith(request)
    expect(mockGetAccessibleTeamWhere).toHaveBeenCalledWith('coach-a', 'star-by-thomson')
    expect(mockTeamFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'team-1',
        AND: [
          {
            OR: [
              { userId: 'owner-user' },
              { id: { in: ['team-1'] } },
            ],
          },
        ],
      },
    }))
  })

  it('excludes lab tests that still require review from team analysis inputs', async () => {
    mockTeamFindFirst.mockResolvedValue({
      id: 'team-1',
      name: 'Piteå Hockey A-lag',
      members: [
        {
          id: 'client-1',
          name: 'Player One',
          weight: 82,
          position: 'Forward',
        },
      ],
    })

    const request = new NextRequest('http://localhost/api/teams/team-1/analysis-summary', {
      headers: { 'x-business-slug': 'star-by-thomson' },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'team-1' }) })

    expect(response.status).toBe(200)
    expect(mockTestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: { in: ['client-1'] },
          status: 'COMPLETED',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        }),
      })
    )
  })
})
