import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { validateSystemState } from './multi-system-validation'

const mockPrisma = {
  injuryAssessment: {
    findFirst: vi.fn(),
  },
  dailyCheckIn: {
    findFirst: vi.fn(),
  },
  test: {
    findFirst: vi.fn(),
  },
  athleteProfile: {
    findUnique: vi.fn(),
  },
  trainingProgramEngine: {
    findFirst: vi.fn(),
  },
  fieldTestSchedule: {
    findFirst: vi.fn(),
  },
  workoutLog: {
    findMany: vi.fn(),
  },
  trainingProgram: {
    findFirst: vi.fn(),
  },
}

describe('multi-system validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.injuryAssessment.findFirst.mockResolvedValue(null)
    mockPrisma.dailyCheckIn.findFirst.mockResolvedValue(null)
    mockPrisma.test.findFirst.mockResolvedValue(null)
    mockPrisma.athleteProfile.findUnique.mockResolvedValue(null)
    mockPrisma.trainingProgramEngine.findFirst.mockResolvedValue(null)
    mockPrisma.fieldTestSchedule.findFirst.mockResolvedValue(null)
    mockPrisma.workoutLog.findMany.mockResolvedValue([])
    mockPrisma.trainingProgram.findFirst.mockResolvedValue(null)
  })

  it('ignores lactate tests that are still waiting for quality review', async () => {
    await validateSystemState('client-1', mockPrisma as unknown as PrismaClient)

    expect(mockPrisma.test.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          testType: {
            in: ['RUNNING', 'CYCLING'],
          },
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        },
      })
    )
  })
})
