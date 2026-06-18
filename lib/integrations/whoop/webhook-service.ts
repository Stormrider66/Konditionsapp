import crypto from 'crypto'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  getWhoopRecoveryForCycle,
  getWhoopSleep,
  getWhoopWorkout,
  WhoopSleep,
} from '@/lib/integrations/whoop/client'
import {
  syncWhoopData,
  syncWhoopRecovery,
  syncWhoopSleep,
  syncWhoopWorkout,
} from '@/lib/integrations/whoop/sync'
import { resolveRecoverySource } from '@/lib/integrations/recovery-source'

export type WhoopWebhookType =
  | 'workout.updated'
  | 'workout.deleted'
  | 'sleep.updated'
  | 'sleep.deleted'
  | 'recovery.updated'
  | 'recovery.deleted'

export interface WhoopWebhookPayload {
  user_id: number
  id: string | number
  type: WhoopWebhookType
  trace_id?: string
}

export interface WhoopWebhookResult {
  processed: number
  deleted: number
  errors: string[]
}

export function verifyWhoopWebhookSignature(input: {
  rawBody: string
  signature?: string | null
  timestamp?: string | null
  secret?: string
}): boolean {
  const { rawBody, signature, timestamp, secret } = input
  if (!rawBody || !signature || !timestamp || !secret) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64')

  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export function logWhoopWebhookReceipt(payload: WhoopWebhookPayload) {
  logger.info('WHOOP webhook event received', {
    type: payload.type,
    userId: payload.user_id,
    id: payload.id,
    traceId: payload.trace_id,
  })
}

async function findClientIdByWhoopUser(userId: number | string): Promise<string | null> {
  const token = await prisma.integrationToken.findFirst({
    where: {
      type: 'WHOOP',
      externalUserId: String(userId),
      syncEnabled: true,
    },
    select: { clientId: true },
  })
  return token?.clientId ?? null
}

async function syncRecoveryFromSleep(clientId: string, sleep: WhoopSleep): Promise<void> {
  if (!sleep.cycle_id) {
    await syncWhoopData(clientId, { daysBack: 3 })
    return
  }

  const recovery = await getWhoopRecoveryForCycle(clientId, sleep.cycle_id)
  const writeRecovery = await resolveRecoverySource(clientId) === 'WHOOP'
  await syncWhoopRecovery(clientId, recovery, sleep, undefined, writeRecovery)
}

export async function processWhoopWebhookPayload(payload: WhoopWebhookPayload): Promise<WhoopWebhookResult> {
  const result: WhoopWebhookResult = { processed: 0, deleted: 0, errors: [] }

  const clientId = await findClientIdByWhoopUser(payload.user_id)
  if (!clientId) {
    result.errors.push(`No client found for WHOOP user ${payload.user_id}`)
    return result
  }

  try {
    if (payload.type === 'workout.deleted') {
      await prisma.whoopActivity.deleteMany({
        where: { clientId, whoopWorkoutId: String(payload.id) },
      })
      result.deleted++
      return result
    }

    if (payload.type === 'sleep.deleted' || payload.type === 'recovery.deleted') {
      await syncWhoopData(clientId, { daysBack: 7 })
      result.processed++
      return result
    }

    if (payload.type === 'workout.updated') {
      const workout = await getWhoopWorkout(clientId, String(payload.id))
      await syncWhoopWorkout(clientId, workout)
      result.processed++
      return result
    }

    if (payload.type === 'sleep.updated') {
      const sleep = await getWhoopSleep(clientId, String(payload.id))
      const writeRecovery = await resolveRecoverySource(clientId) === 'WHOOP'
      await syncWhoopSleep(clientId, sleep, writeRecovery)
      await syncRecoveryFromSleep(clientId, sleep).catch(error => {
        logger.warn('WHOOP recovery refresh after sleep webhook failed', { clientId, sleepId: sleep.id }, error)
      })
      result.processed++
      return result
    }

    if (payload.type === 'recovery.updated') {
      const sleep = await getWhoopSleep(clientId, String(payload.id))
      await syncRecoveryFromSleep(clientId, sleep)
      result.processed++
      return result
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown WHOOP webhook error')
  }

  return result
}

export function processWhoopWebhookPayloadAsync(
  payload: WhoopWebhookPayload,
  source = 'whoop-webhook',
): void {
  void processWhoopWebhookPayload(payload)
    .then(result => {
      logger.info('WHOOP webhook processing completed asynchronously', {
        source,
        processed: result.processed,
        deleted: result.deleted,
        errorCount: result.errors.length,
      })
    })
    .catch(error => {
      logger.error('WHOOP webhook asynchronous processing failed', { source }, error)
    })
}
