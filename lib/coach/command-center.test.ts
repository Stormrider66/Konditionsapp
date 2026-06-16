import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  client: { findMany: vi.fn() },
  dailyMetrics: { findMany: vi.fn() },
  trainingLoad: { findMany: vi.fn() },
  injuryAssessment: { groupBy: vi.fn() },
  workoutLog: { findMany: vi.fn() },
  weeklyTrainingSummary: { findMany: vi.fn() },
  coachAlert: { findMany: vi.fn() },
  trainingProgram: { findMany: vi.fn() },
  test: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { getCoachCommandCenterData } from './command-center'

const baseParams = {
  userId: 'coach-1',
  businessId: 'business-1',
  coachIds: ['coach-1'],
  basePath: '/demo',
  now: new Date('2026-06-16T12:00:00.000Z'),
}

describe('getCoachCommandCenterData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        name: 'Avery Runner',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        sportProfile: { primarySport: 'RUNNING' },
      },
    ])
    mockPrisma.dailyMetrics.findMany.mockResolvedValue([])
    mockPrisma.trainingLoad.findMany.mockResolvedValue([])
    mockPrisma.injuryAssessment.groupBy.mockResolvedValue([])
    mockPrisma.workoutLog.findMany.mockResolvedValue([])
    mockPrisma.weeklyTrainingSummary.findMany.mockResolvedValue([])
    mockPrisma.coachAlert.findMany.mockResolvedValue([])
    mockPrisma.trainingProgram.findMany.mockResolvedValue([])
  })

  it('surfaces review-required tests as coach queue items', async () => {
    mockPrisma.test.findMany
      .mockResolvedValueOnce([
        {
          id: 'latest-test',
          clientId: 'client-1',
          testDate: new Date('2026-06-01T00:00:00.000Z'),
          testType: 'RUNNING',
          vo2max: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'review-test',
          clientId: 'client-1',
          testDate: new Date('2026-06-15T00:00:00.000Z'),
          testType: 'RUNNING',
          qualityWarnings: [
            {
              type: 'LACTATE_DROP',
              severity: 'warning',
              message: 'Lactate dropped from one stage to the next.',
            },
          ],
          client: { name: 'Avery Runner' },
        },
      ])

    const data = await getCoachCommandCenterData(baseParams)

    expect(mockPrisma.test.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
          qualityReviewStatus: 'REVIEW_REQUIRED',
          client: expect.objectContaining({
            businessId: 'business-1',
            userId: { in: ['coach-1'] },
          }),
        }),
      })
    )
    expect(data.queueItems).toContainEqual(
      expect.objectContaining({
        id: 'test-review-review-test',
        title: 'Test data needs review',
        priority: 'medium',
        category: 'testing',
        clientName: 'Avery Runner',
        href: '/demo/coach/tests/review-test#quality-review',
        ctaLabel: 'Review test',
        meta: '1 quality warning',
      })
    )
    expect(data.summary.reviewCount).toBe(1)
  })

  it('raises queue priority for severe test quality warnings', async () => {
    mockPrisma.test.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'critical-review-test',
          clientId: 'client-1',
          testDate: new Date('2026-06-15T00:00:00.000Z'),
          testType: 'CYCLING',
          qualityWarnings: [
            {
              type: 'DATA_ERROR',
              severity: 'critical',
              message: 'Power values are outside the expected range.',
            },
          ],
          client: { name: 'Avery Runner' },
        },
      ])

    const data = await getCoachCommandCenterData(baseParams)

    expect(data.queueItems).toContainEqual(
      expect.objectContaining({
        id: 'test-review-critical-review-test',
        priority: 'high',
      })
    )
    expect(data.summary.urgentCount).toBe(1)
  })
})
