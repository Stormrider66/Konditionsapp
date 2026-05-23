import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockClientFindMany = vi.hoisted(() => vi.fn())
const mockClientCount = vi.hoisted(() => vi.fn())
const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockGetRequestedBusinessScope = vi.hoisted(() => vi.fn())
const mockGetBusinessMembership = vi.hoisted(() => vi.fn())
const mockGetCoachScopedIds = vi.hoisted(() => vi.fn())
const mockLoggerError = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      findMany: mockClientFindMany,
      count: mockClientCount,
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: mockGetCurrentUser,
  getRequestedBusinessScope: mockGetRequestedBusinessScope,
  hasReachedAthleteLimit: vi.fn(),
}))

vi.mock('@/lib/coach/team-access', () => ({
  getBusinessMembership: mockGetBusinessMembership,
  getWritableTeam: vi.fn(),
}))

vi.mock('@/lib/coach/scoping', () => ({
  getCoachScopedIds: mockGetCoachScopedIds,
}))

vi.mock('@/lib/athlete-account-utils', () => ({
  createAthleteAccountForClient: vi.fn(),
}))

vi.mock('@/lib/coach/team-connection', () => ({
  connectTeamMemberToCoach: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mockLoggerError,
    info: vi.fn(),
  },
}))

import { GET } from './route'

describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue({ id: 'coach-a', language: 'en' })
    mockGetRequestedBusinessScope.mockReturnValue({ businessSlug: 'skelleftea-aik' })
    mockGetBusinessMembership.mockResolvedValue({
      businessId: 'business-skelleftea',
      role: 'COACH',
    })
    mockGetCoachScopedIds.mockResolvedValue(['coach-a', 'coach-b'])
    mockClientFindMany.mockResolvedValue([])
    mockClientCount.mockResolvedValue(0)
  })

  it('filters clients to the active business scope', async () => {
    const request = new NextRequest('http://localhost/api/clients', {
      headers: { 'x-business-slug': 'skelleftea-aik' },
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [],
    })
    expect(mockGetBusinessMembership).toHaveBeenCalledWith('coach-a', 'skelleftea-aik')
    expect(mockGetCoachScopedIds).toHaveBeenCalledWith('coach-a', 'business-skelleftea', 'COACH')
    expect(mockClientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { in: ['coach-a', 'coach-b'] },
          businessId: 'business-skelleftea',
        },
      }),
    )
    expect(mockClientCount).toHaveBeenCalledWith({
      where: {
        userId: { in: ['coach-a', 'coach-b'] },
        businessId: 'business-skelleftea',
      },
    })
  })
})
