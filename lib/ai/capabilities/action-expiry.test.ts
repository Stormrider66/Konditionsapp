import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    aIActionDraft: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

import { expirePendingAiActionDrafts } from './action-expiry'

describe('AI action draft expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.aIActionDraft.findMany.mockResolvedValue([
      { id: 'draft-1' },
      { id: 'draft-2' },
    ])
    mocks.prisma.aIActionDraft.updateMany.mockResolvedValue({ count: 2 })
  })

  it('marks stale pending drafts as expired in a bounded batch', async () => {
    const now = new Date('2026-06-06T10:00:00.000Z')

    const result = await expirePendingAiActionDrafts({ now, limit: 2 })

    expect(mocks.prisma.aIActionDraft.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: 2,
    })
    expect(mocks.prisma.aIActionDraft.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['draft-1', 'draft-2'] },
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
      },
    })
    expect(result).toEqual({
      expiredCount: 2,
      scannedCount: 2,
      hasMore: true,
      cutoff: now,
    })
  })

  it('does not update when there are no stale pending drafts', async () => {
    mocks.prisma.aIActionDraft.findMany.mockResolvedValue([])
    const now = new Date('2026-06-06T10:00:00.000Z')

    const result = await expirePendingAiActionDrafts({ now })

    expect(mocks.prisma.aIActionDraft.updateMany).not.toHaveBeenCalled()
    expect(result).toEqual({
      expiredCount: 0,
      scannedCount: 0,
      hasMore: false,
      cutoff: now,
    })
  })

  it('caps oversized limits', async () => {
    await expirePendingAiActionDrafts({ limit: 5000 })

    expect(mocks.prisma.aIActionDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 })
    )
  })
})
