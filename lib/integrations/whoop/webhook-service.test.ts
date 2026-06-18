import crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    integrationToken: {
      findFirst: vi.fn(),
    },
    whoopActivity: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/integrations/whoop/client', () => ({
  getWhoopRecoveryForCycle: vi.fn(),
  getWhoopSleep: vi.fn(),
  getWhoopWorkout: vi.fn(),
}))

vi.mock('@/lib/integrations/whoop/sync', () => ({
  syncWhoopData: vi.fn(),
  syncWhoopRecovery: vi.fn(),
  syncWhoopSleep: vi.fn(),
  syncWhoopWorkout: vi.fn(),
}))

vi.mock('@/lib/integrations/recovery-source', () => ({
  resolveRecoverySource: vi.fn(),
}))

import {
  processWhoopWebhookPayload,
  verifyWhoopWebhookSignature,
} from '@/lib/integrations/whoop/webhook-service'

describe('WHOOP webhook service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.integrationToken.findFirst.mockResolvedValue({ clientId: 'client-1' } as never)
    mocks.prisma.whoopActivity.deleteMany.mockResolvedValue({ count: 1 } as never)
  })

  it('validates WHOOP HMAC signatures', () => {
    const rawBody = JSON.stringify({ user_id: 123, id: 'workout-1', type: 'workout.updated' })
    const timestamp = '1781700000000'
    const secret = 'whoop-secret'
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}${rawBody}`)
      .digest('base64')

    expect(verifyWhoopWebhookSignature({ rawBody, timestamp, signature, secret })).toBe(true)
    expect(verifyWhoopWebhookSignature({ rawBody, timestamp, signature: 'bad', secret })).toBe(false)
  })

  it('deletes local workout summaries on workout.deleted events', async () => {
    const result = await processWhoopWebhookPayload({
      user_id: 123,
      id: 'workout-1',
      type: 'workout.deleted',
      trace_id: 'trace-1',
    })

    expect(result.deleted).toBe(1)
    expect(mocks.prisma.whoopActivity.deleteMany).toHaveBeenCalledWith({
      where: { clientId: 'client-1', whoopWorkoutId: 'workout-1' },
    })
  })
})
