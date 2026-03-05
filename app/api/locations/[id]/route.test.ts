import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireCoach = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  businessMember: {
    findFirst: vi.fn(),
  },
  location: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireCoach: mockRequireCoach,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger-console', () => ({
  logError: vi.fn(),
}))

import { GET } from '@/app/api/locations/[id]/route'

describe('location route access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCoach.mockResolvedValue({ id: 'coach-1' })
  })

  it('requires an active business membership to access a location', async () => {
    mockPrisma.businessMember.findFirst.mockResolvedValue(null)
    mockPrisma.location.findUnique.mockResolvedValue({
      id: 'location-1',
      businessId: 'business-1',
    })

    const response = await GET(
      new NextRequest('http://localhost/api/locations/location-1'),
      { params: Promise.resolve({ id: 'location-1' }) }
    )
    const body = await response.json()

    expect(mockPrisma.businessMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'coach-1',
        isActive: true,
      },
    })
    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Access denied' })
  })
})
