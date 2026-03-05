import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAuth = vi.hoisted(() => vi.fn())
const mockRequireBusinessMembership = vi.hoisted(() => vi.fn())
const mockHandleApiError = vi.hoisted(() => vi.fn((error: unknown) => {
  throw error
}))

const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/api/utils', () => ({
  requireAuth: mockRequireAuth,
  handleApiError: mockHandleApiError,
}))

vi.mock('@/lib/auth-utils', () => ({
  requireBusinessMembership: mockRequireBusinessMembership,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from '@/app/api/business/[id]/clients/route'

describe('business clients route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'user-1' })
    mockRequireBusinessMembership.mockResolvedValue({ membershipId: 'member-1', role: 'COACH' })
  })

  it('scopes client lookup to the requested business', async () => {
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        name: 'Scoped Athlete',
        email: 'athlete@example.com',
        team: null,
        athleteAccount: null,
      },
    ])

    const response = await GET(
      new NextRequest('http://localhost/api/business/business-1/clients'),
      { params: Promise.resolve({ id: 'business-1' }) }
    )
    const body = await response.json()

    expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
      where: {
        businessId: 'business-1',
      },
      include: {
        team: true,
        athleteAccount: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
    expect(response.status).toBe(200)
    expect(body).toEqual({
      clients: [
        {
          id: 'client-1',
          name: 'Scoped Athlete',
          email: 'athlete@example.com',
        },
      ],
    })
  })
})
