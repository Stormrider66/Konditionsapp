import 'server-only'

import { prisma } from '@/lib/prisma'

export interface ExpirePendingAiActionDraftsOptions {
  now?: Date
  limit?: number
}

export interface ExpirePendingAiActionDraftsResult {
  expiredCount: number
  scannedCount: number
  hasMore: boolean
  cutoff: Date
}

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 1000

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))
}

/**
 * Marks stale pending AI confirmation drafts as expired.
 * Uses a bounded ID lookup before updateMany so cron runs stay predictable.
 */
export async function expirePendingAiActionDrafts(
  options: ExpirePendingAiActionDraftsOptions = {}
): Promise<ExpirePendingAiActionDraftsResult> {
  const cutoff = options.now ?? new Date()
  const limit = normalizeLimit(options.limit)

  const staleDrafts = await prisma.aIActionDraft.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: cutoff },
    },
    select: { id: true },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  })

  if (staleDrafts.length === 0) {
    return {
      expiredCount: 0,
      scannedCount: 0,
      hasMore: false,
      cutoff,
    }
  }

  const ids = staleDrafts.map((draft) => draft.id)
  const update = await prisma.aIActionDraft.updateMany({
    where: {
      id: { in: ids },
      status: 'PENDING',
      expiresAt: { lte: cutoff },
    },
    data: {
      status: 'EXPIRED',
    },
  })

  return {
    expiredCount: update.count,
    scannedCount: staleDrafts.length,
    hasMore: staleDrafts.length === limit,
    cutoff,
  }
}
