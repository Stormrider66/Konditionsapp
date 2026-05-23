import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aIGeneratedWOD: {
      count: mockCount,
    },
  },
}))

vi.mock('@/lib/training-restrictions', () => ({
  getRestrictionsForWOD: vi.fn(),
}))

import { canGenerateWOD, getWODUsageStats } from './wod-context-builder'

describe('WOD daily usage policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-23T10:00:00+02:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows free users up to three WOD generations per local day', async () => {
    mockCount.mockResolvedValue(2)

    const stats = await getWODUsageStats('client-1', 'FREE')
    const canGenerate = await canGenerateWOD('client-1', 'FREE', 'en')

    expect(stats.dailyCount).toBe(2)
    expect(stats.dailyLimit).toBe(3)
    expect(stats.remaining).toBe(1)
    expect(stats.period).toBe('day')
    expect(canGenerate.allowed).toBe(true)
    expect(canGenerate.remaining).toBe(1)
  })

  it('blocks the fourth free WOD generation of the day', async () => {
    mockCount.mockResolvedValue(3)

    const result = await canGenerateWOD('client-1', 'FREE', 'en')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.reason).toContain('today')
  })

  it('keeps paid tiers unlimited by WOD count', async () => {
    mockCount.mockResolvedValue(99)

    const stats = await getWODUsageStats('client-1', 'STANDARD')
    const result = await canGenerateWOD('client-1', 'STANDARD', 'en')

    expect(stats.isUnlimited).toBe(true)
    expect(stats.dailyLimit).toBe(-1)
    expect(stats.remaining).toBe(-1)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(-1)
  })
})
