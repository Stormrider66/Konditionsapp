import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import {
  getTestReviewQueue,
  hasSevereTestQualityWarning,
  parseTestQualityWarnings,
} from './test-review-queue'

describe('test review queue helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes quality warnings from JSON', () => {
    const warnings = parseTestQualityWarnings([
      { type: 'LACTATE_DROP', severity: 'warning', message: 'Lactate dropped.' },
      { message: 'Missing type still renders.' },
      'ignored',
      null,
    ])

    expect(warnings).toEqual([
      { type: 'LACTATE_DROP', severity: 'warning', message: 'Lactate dropped.', details: undefined },
      {
        type: 'QUALITY_WARNING',
        severity: 'warning',
        message: 'Missing type still renders.',
        details: undefined,
      },
    ])
  })

  it('detects severe review warnings', () => {
    expect(hasSevereTestQualityWarning([
      { type: 'DATA_ERROR', severity: 'critical', message: 'Impossible lactate value.' },
    ])).toBe(true)
    expect(hasSevereTestQualityWarning([
      { type: 'LACTATE_DROP', severity: 'warning', message: 'Drop detected.' },
    ])).toBe(false)
  })

  it('returns pending tests with previous cleared test context', async () => {
    mockPrisma.test.findMany
      .mockResolvedValueOnce([
        {
          id: 'pending-1',
          clientId: 'client-1',
          testDate: new Date('2026-06-16T10:00:00.000Z'),
          testType: 'RUNNING',
          qualityWarnings: [
            { type: 'LACTATE_DROP', severity: 'warning', message: 'Lactate dropped.' },
          ],
          client: { name: 'Alex Athlete' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'future-clear',
          clientId: 'client-1',
          testDate: new Date('2026-06-17T10:00:00.000Z'),
          testType: 'RUNNING',
          vo2max: 61,
          maxHR: 189,
        },
        {
          id: 'previous-clear',
          clientId: 'client-1',
          testDate: new Date('2026-06-01T10:00:00.000Z'),
          testType: 'RUNNING',
          vo2max: 58.4,
          maxHR: 186,
        },
      ])

    const queue = await getTestReviewQueue({
      businessId: 'business-1',
      coachIds: ['coach-1'],
    })

    expect(mockPrisma.test.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          qualityReviewStatus: 'REVIEW_REQUIRED',
          client: {
            businessId: 'business-1',
            userId: { in: ['coach-1'] },
          },
        }),
      }),
    )
    expect(queue).toEqual([
      expect.objectContaining({
        id: 'pending-1',
        clientName: 'Alex Athlete',
        warningCount: 1,
        hasSevereWarning: false,
        previousTest: expect.objectContaining({
          id: 'previous-clear',
          vo2max: 58.4,
          maxHR: 186,
        }),
      }),
    ])
  })
})
