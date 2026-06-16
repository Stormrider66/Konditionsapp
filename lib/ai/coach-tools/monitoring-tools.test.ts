import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveAccessibleCoachClient = vi.hoisted(() => vi.fn())
const mockResolveCoachToolBusinessId = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  test: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('./shared', () => ({
  toolText: (locale: 'en' | 'sv', en: string, sv: string) => locale === 'sv' ? sv : en,
  resolveAccessibleCoachClient: mockResolveAccessibleCoachClient,
  resolveCoachToolBusinessId: mockResolveCoachToolBusinessId,
}))

import { createMonitoringTools } from '@/lib/ai/coach-tools/monitoring-tools'

describe('createMonitoringTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveCoachToolBusinessId.mockResolvedValue('business-1')
    mockResolveAccessibleCoachClient.mockResolvedValue({
      ok: true,
      client: { id: 'client-1', name: 'Runner One' },
    })
    mockPrisma.test.findMany.mockResolvedValue([])
    mockPrisma.test.count.mockResolvedValue(0)
  })

  it('omits tests still waiting for quality review from coach AI test summaries', async () => {
    const tools = createMonitoringTools({
      coachUserId: 'coach-1',
      businessSlug: 'star',
      locale: 'en',
    }) as unknown as Record<string, { execute: (input: unknown) => Promise<unknown> }>

    const result = await tools.getAthleteTestResults.execute({
      clientId: 'client-1',
      limit: 3,
    })

    expect(mockPrisma.test.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1',
          qualityReviewStatus: { not: 'REVIEW_REQUIRED' },
        }),
      })
    )
    expect(mockPrisma.test.count).toHaveBeenCalledWith({
      where: {
        clientId: 'client-1',
        status: { not: 'DRAFT' },
        qualityReviewStatus: 'REVIEW_REQUIRED',
      },
    })
    expect(result).toMatchObject({
      success: true,
      athlete: { id: 'client-1', name: 'Runner One' },
      reviewRequiredCount: 0,
    })
  })
})
