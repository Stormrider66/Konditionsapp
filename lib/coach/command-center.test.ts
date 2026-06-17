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

import {
  filterCommandCenterQueueItems,
  getCoachCommandCenterData,
  type CommandCenterQueueItem,
} from './command-center'

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
          updatedAt: new Date('2026-06-15T00:00:00.000Z'),
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
          updatedAt: new Date('2026-06-15T00:00:00.000Z'),
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

  it('includes due snoozed alerts in the queue query', async () => {
    mockPrisma.coachAlert.findMany
      .mockResolvedValueOnce([
        {
          id: 'alert-1',
          alertType: 'PAIN_MENTION',
          severity: 'HIGH',
          status: 'SNOOZED',
          title: 'Post-workout pain',
          message: 'Avery reported calf pain after intervals.',
          contextData: null,
          createdAt: new Date('2026-06-15T12:00:00.000Z'),
          snoozedUntil: new Date('2026-06-16T08:00:00.000Z'),
          clientId: 'client-1',
          client: { name: 'Avery Runner' },
        },
      ])
      .mockResolvedValueOnce([])
    mockPrisma.test.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const data = await getCoachCommandCenterData(baseParams)

    expect(mockPrisma.coachAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                { status: 'ACTIVE' },
                { status: 'SNOOZED', snoozedUntil: { lte: baseParams.now } },
              ],
            },
          ]),
        }),
      })
    )
    expect(data.queueItems).toContainEqual(
      expect.objectContaining({
        id: 'alert-alert-1',
        alertId: 'alert-1',
        alertStatus: 'SNOOZED',
        category: 'injury',
        priority: 'high',
        meta: 'snooze ended',
        opsLabel: 'Snooze due',
        opsTone: 'watch',
      })
    )
  })

  it('brings due pain follow-ups back into the coach queue', async () => {
    mockPrisma.coachAlert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'resolved-alert-1',
          alertType: 'PAIN_MENTION',
          severity: 'MEDIUM',
          status: 'RESOLVED',
          title: 'Post-workout pain',
          message: 'Avery reported calf pain after intervals.',
          contextData: null,
          createdAt: new Date('2026-06-10T12:00:00.000Z'),
          followUpAt: new Date('2026-06-14T09:00:00.000Z'),
          resolutionOutcome: 'TRAINING_ADJUSTED',
          clientId: 'client-1',
          client: { name: 'Avery Runner' },
        },
      ])
    mockPrisma.test.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const data = await getCoachCommandCenterData(baseParams)

    expect(mockPrisma.coachAlert.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          alertType: 'PAIN_MENTION',
          status: { in: ['RESOLVED', 'ACTIONED'] },
          followUpAt: {
            gte: new Date('2026-06-02T12:00:00.000Z'),
            lte: baseParams.now,
          },
        }),
      }),
    )
    expect(data.queueItems).toContainEqual(
      expect.objectContaining({
        id: 'pain-follow-up-resolved-alert-1',
        alertId: 'resolved-alert-1',
        title: 'Pain follow-up due',
        priority: 'high',
        category: 'injury',
        ctaLabel: 'Follow up',
        meta: 'Adjusted training',
        opsLabel: '2 days overdue',
        opsTone: 'overdue',
      }),
    )
    expect(data.summary.overdueCount).toBe(1)
  })

  it('escalates test reviews that have been waiting several days', async () => {
    mockPrisma.test.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'stale-review-test',
          clientId: 'client-1',
          testDate: new Date('2026-06-10T00:00:00.000Z'),
          testType: 'RUNNING',
          updatedAt: new Date('2026-06-09T00:00:00.000Z'),
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

    expect(data.queueItems).toContainEqual(
      expect.objectContaining({
        id: 'test-review-stale-review-test',
        priority: 'critical',
        opsLabel: '7 days waiting',
        opsTone: 'overdue',
      }),
    )
    expect(data.summary.urgentCount).toBe(1)
    expect(data.summary.overdueCount).toBe(1)
  })
})

describe('filterCommandCenterQueueItems', () => {
  const items: CommandCenterQueueItem[] = [
    {
      id: 'pain-1',
      title: 'Pain alert',
      description: 'Pain after workout',
      priority: 'high',
      category: 'injury',
      href: '/athlete',
      ctaLabel: 'Review pain',
    },
    {
      id: 'test-1',
      title: 'Test review',
      description: 'Review test quality',
      priority: 'medium',
      category: 'testing',
      href: '/test',
      ctaLabel: 'Review test',
    },
    {
      id: 'feedback-1',
      title: 'Workout feedback',
      description: 'Session needs feedback',
      priority: 'low',
      category: 'feedback',
      href: '/logs',
      ctaLabel: 'Give feedback',
    },
    {
      id: 'overdue-1',
      title: 'Overdue follow-up',
      description: 'Follow-up due',
      priority: 'low',
      category: 'injury',
      href: '/athlete',
      ctaLabel: 'Follow up',
      opsTone: 'overdue',
    },
  ]

  it('filters queue items by coach inbox mode', () => {
    expect(filterCommandCenterQueueItems(items, 'all').map(item => item.id))
      .toEqual(['pain-1', 'test-1', 'feedback-1', 'overdue-1'])
    expect(filterCommandCenterQueueItems(items, 'high').map(item => item.id))
      .toEqual(['pain-1'])
    expect(filterCommandCenterQueueItems(items, 'overdue').map(item => item.id))
      .toEqual(['overdue-1'])
    expect(filterCommandCenterQueueItems(items, 'review').map(item => item.id))
      .toEqual(['test-1', 'feedback-1'])
    expect(filterCommandCenterQueueItems(items, 'injury').map(item => item.id))
      .toEqual(['pain-1', 'overdue-1'])
    expect(filterCommandCenterQueueItems(items, 'testing').map(item => item.id))
      .toEqual(['test-1'])
  })
})
