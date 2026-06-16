import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  athleteProfile: {
    findUnique: vi.fn(),
  },
  test: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { getClientZones } from './zones'

describe('getClientZones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.athleteProfile.findUnique.mockResolvedValue(null)
    mockPrisma.test.findMany.mockResolvedValue([])
  })

  it('falls back only to tests that are safe for decisions', async () => {
    await getClientZones('client-1')

    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
          trainingZones: { not: undefined },
        },
      })
    )
  })
})
