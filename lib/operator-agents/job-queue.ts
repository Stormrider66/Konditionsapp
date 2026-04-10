/**
 * Operator Agent Job Queue
 *
 * Serverless-friendly job queue using the OperatorAgentJob Prisma model.
 * No Redis, no workers — just a table polled by a cron every minute.
 *
 * Usage:
 *   // Enqueue from anywhere (e.g. webhook handler)
 *   await enqueueAgentJob('SUPPORT', 'new_ticket', { ticketId: '...' })
 *
 *   // The cron /api/cron/operator/job-worker picks it up and runs the agent
 *
 * Features:
 * - Retry with exponential backoff (max 3 attempts)
 * - Stale lock detection (5 min timeout, auto-reclaim)
 * - Batch processing (up to 10 jobs per worker run)
 * - Scheduling (jobs can run in the future via scheduledFor)
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { runOperatorAgent } from './agent-runner'
import type { OperatorAgentType } from './types'

const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const BATCH_SIZE = 10

/**
 * Enqueue an agent job for async processing.
 * Returns the job ID for tracking.
 */
export async function enqueueAgentJob(
  agentType: OperatorAgentType,
  triggeredBy: string,
  context?: Record<string, unknown>,
  options?: {
    /** Run at a specific time (defaults to immediately) */
    scheduledFor?: Date
    /** Max retry attempts (default 3) */
    maxAttempts?: number
  }
): Promise<{ jobId: string }> {
  const job = await prisma.operatorAgentJob.create({
    data: {
      agentType,
      triggeredBy,
      status: 'PENDING',
      scheduledFor: options?.scheduledFor || new Date(),
      maxAttempts: options?.maxAttempts || 3,
      context: context ? (context as never) : undefined,
    },
  })

  logger.info('[job-queue] Enqueued agent job', {
    jobId: job.id,
    agentType,
    triggeredBy,
  })

  return { jobId: job.id }
}

/**
 * Process pending jobs. Called by the cron worker.
 *
 * Claims jobs atomically with a lock, runs the agent, and updates
 * status. Failed jobs are retried up to maxAttempts with exponential
 * backoff before being marked FAILED.
 */
export async function processPendingJobs(): Promise<{
  processed: number
  completed: number
  failed: number
  retried: number
}> {
  const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = new Date()
  const staleLockCutoff = new Date(now.getTime() - LOCK_TIMEOUT_MS)

  // Step 1: Reclaim stale locks (jobs that were claimed but never completed)
  await prisma.operatorAgentJob.updateMany({
    where: {
      status: 'PROCESSING',
      lockedAt: { lt: staleLockCutoff },
    },
    data: {
      status: 'PENDING',
      lockedAt: null,
      lockedBy: null,
    },
  })

  // Step 2: Claim up to BATCH_SIZE pending jobs
  // We use a transaction to claim atomically. Since Prisma doesn't support
  // SELECT ... FOR UPDATE SKIP LOCKED easily, we use a two-step approach:
  //   1. Find candidate job IDs
  //   2. updateMany to claim them (works because status is part of the filter)
  const candidates = await prisma.operatorAgentJob.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  })

  if (candidates.length === 0) {
    return { processed: 0, completed: 0, failed: 0, retried: 0 }
  }

  const candidateIds = candidates.map(c => c.id)
  const claimedCount = await prisma.operatorAgentJob.updateMany({
    where: {
      id: { in: candidateIds },
      status: 'PENDING', // Still PENDING (not claimed by another worker)
    },
    data: {
      status: 'PROCESSING',
      lockedAt: now,
      lockedBy: workerId,
      startedAt: now,
    },
  })

  if (claimedCount.count === 0) {
    return { processed: 0, completed: 0, failed: 0, retried: 0 }
  }

  // Fetch the jobs we actually claimed
  const claimedJobs = await prisma.operatorAgentJob.findMany({
    where: {
      id: { in: candidateIds },
      lockedBy: workerId,
      status: 'PROCESSING',
    },
  })

  let completed = 0
  let failed = 0
  let retried = 0

  // Step 3: Process each claimed job
  for (const job of claimedJobs) {
    try {
      const result = await runOperatorAgent(job.agentType as OperatorAgentType, {
        triggeredBy: 'event',
      })

      if (result.status === 'COMPLETED') {
        await prisma.operatorAgentJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: {
              itemsProcessed: result.itemsProcessed,
              actionsTaken: result.actionsTaken,
              escalations: result.escalations,
              summary: result.summary,
              tokensUsed: result.tokensUsed,
              costUsd: result.costUsd,
            } as never,
          },
        })
        completed++
      } else {
        throw new Error(result.errorMessage || 'Agent reported failure')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const nextAttempt = job.attempts + 1
      const shouldRetry = nextAttempt < job.maxAttempts

      if (shouldRetry) {
        // Exponential backoff: 30s, 2min, 8min
        const backoffMs = Math.pow(4, nextAttempt) * 30_000
        const nextRun = new Date(Date.now() + backoffMs)

        await prisma.operatorAgentJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            scheduledFor: nextRun,
            attempts: nextAttempt,
            lastError: errorMsg.slice(0, 1000),
            lockedAt: null,
            lockedBy: null,
          },
        })
        retried++
        logger.warn('[job-queue] Retrying agent job', {
          jobId: job.id,
          agentType: job.agentType,
          attempt: nextAttempt,
          nextRun: nextRun.toISOString(),
        })
      } else {
        await prisma.operatorAgentJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            attempts: nextAttempt,
            lastError: errorMsg.slice(0, 1000),
          },
        })
        failed++
        logger.error('[job-queue] Agent job FAILED permanently', {
          jobId: job.id,
          agentType: job.agentType,
          attempts: nextAttempt,
          error: errorMsg.slice(0, 200),
        })
      }
    }
  }

  return {
    processed: claimedJobs.length,
    completed,
    failed,
    retried,
  }
}
