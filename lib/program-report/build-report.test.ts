import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  trainingProgram: {
    findUnique: vi.fn(),
  },
  fieldTestSchedule: {
    findMany: vi.fn(),
  },
  race: {
    findMany: vi.fn(),
  },
  test: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { buildProgramReport } from '@/lib/program-report/build-report'

describe('buildProgramReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.trainingProgram.findUnique.mockResolvedValue({
      id: 'program-1',
      clientId: 'client-1',
      name: 'Base build',
      description: null,
      goalRace: null,
      goalDate: null,
      goalType: null,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-14T00:00:00.000Z'),
      planningMetadata: null,
      test: null,
      weeks: [],
    })
    mockPrisma.fieldTestSchedule.findMany.mockResolvedValue([])
    mockPrisma.race.findMany.mockResolvedValue([])
    mockPrisma.test.findFirst.mockResolvedValue(null)
  })

  it('uses only review-clear tests when falling back to latest training zones', async () => {
    const result = await buildProgramReport('program-1')

    expect(result).not.toBeNull()
    expect(mockPrisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          trainingZones: { not: undefined },
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        },
      })
    )
  })
})
