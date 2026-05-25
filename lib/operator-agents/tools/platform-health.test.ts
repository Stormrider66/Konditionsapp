import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { getAgentErrorRate } from './platform-health'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    operatorAgentRun: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('platform health tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates agent error rate with one aggregate database query', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        total1h: 10,
        failed1h: 3,
        total24h: 40,
        failed24h: 8,
      },
    ])

    const result = await getAgentErrorRate()

    expect(result.success).toBe(true)
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(prisma.operatorAgentRun.count).not.toHaveBeenCalled()
    expect(result.data).toMatchObject({
      totalRuns1h: 10,
      failedRuns1h: 3,
      errorRate: 0.3,
      errorRatePercent: 30,
      totalRuns24h: 40,
      failedRuns24h: 8,
      errorRate24h: 0.2,
      errorRatePercent24h: 20,
    })
  })
})
