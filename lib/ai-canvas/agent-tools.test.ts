import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCoachScopedIds = vi.hoisted(() => vi.fn())
const mockGetAccessibleTeamWhere = vi.hoisted(() => vi.fn())
const mockBuildCanvasAnalyticsBlocks = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  client: {
    findMany: vi.fn(),
  },
  team: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
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

vi.mock('@/lib/ai-canvas/context-builder', () => ({
  buildCanvasAnalyticsBlocks: mockBuildCanvasAnalyticsBlocks,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { createCanvasAgentTools } from '@/lib/ai-canvas/agent-tools'

describe('createCanvasAgentTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCoachScopedIds.mockResolvedValue(['coach-1'])
    mockGetAccessibleTeamWhere.mockResolvedValue({})
    mockBuildCanvasAnalyticsBlocks.mockResolvedValue([])
    mockPrisma.client.findMany.mockResolvedValue([
      { id: 'client-1', name: 'Runner One' },
    ])
    mockPrisma.team.findFirst.mockResolvedValue({ id: 'team-1' })
    mockPrisma.team.findMany.mockResolvedValue([])
    mockPrisma.test.findMany.mockResolvedValue([])
  })

  it('omits tests that still require quality review from agent test data', async () => {
    const tools = createCanvasAgentTools({
      userId: 'coach-1',
      businessId: 'business-1',
      businessSlug: 'star',
      role: 'COACH',
      locale: 'en',
    }) as unknown as Record<string, { execute: (input: unknown) => Promise<unknown> }>

    await tools.getTestData.execute({ athleteIds: ['client-1'] })

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
