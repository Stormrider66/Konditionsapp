import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCoachScopedIds = vi.hoisted(() => vi.fn())
const mockGetAccessibleTeamWhere = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
  team: {
    findFirst: vi.fn(),
  },
  test: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/coach/scoping', () => ({
  getCoachScopedIds: mockGetCoachScopedIds,
}))

vi.mock('@/lib/coach/team-access', () => ({
  getAccessibleTeamWhere: mockGetAccessibleTeamWhere,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import {
  buildCanvasAnalyticsBlocks,
  buildCanvasContextSummary,
} from '@/lib/ai-canvas/context-builder'

const baseParams = {
  userId: 'coach-1',
  businessSlug: 'star',
  businessId: 'business-1',
  role: 'COACH',
  now: new Date('2026-06-16T00:00:00.000Z'),
  locale: 'en' as const,
  selection: {
    scope: 'athlete' as const,
    athleteId: 'client-1',
    dateRange: 'last30' as const,
    dataKeys: ['tests' as const],
  },
}

describe('AI canvas test context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCoachScopedIds.mockResolvedValue(['coach-1'])
    mockGetAccessibleTeamWhere.mockResolvedValue({})
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        name: 'Runner One',
        notes: null,
        sportProfile: { primarySport: 'RUNNING' },
        team: null,
      },
    ])
    mockPrisma.team.findFirst.mockResolvedValue({ id: 'team-1' })
    mockPrisma.test.findMany.mockResolvedValue([])
  })

  it('uses only review-clear lab tests in canvas text context', async () => {
    const summary = await buildCanvasContextSummary(baseParams)

    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: { in: ['client-1'] },
          status: 'COMPLETED',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        }),
      })
    )
    expect(summary).toContain('no usable completed test data')
  })

  it('uses only review-clear lab tests in canvas analytics blocks', async () => {
    await buildCanvasAnalyticsBlocks(baseParams)

    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: { in: ['client-1'] },
          status: 'COMPLETED',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        }),
      })
    )
  })
})
