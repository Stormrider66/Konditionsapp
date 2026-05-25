import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockTeamFindFirst = vi.hoisted(() => vi.fn())
const mockRequireCoach = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetAccessibleTeamWhere = vi.hoisted(() => vi.fn())
const mockLogError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findFirst: mockTeamFindFirst,
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
})
