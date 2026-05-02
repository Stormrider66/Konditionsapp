/**
 * Nightly Oura Sync Job
 *
 * Runs daily ~04:00 UTC. Iterates clients with an active OURA IntegrationToken
 * and pulls the last 3 days of recovery aggregates (overlap window covers
 * Oura's late-arriving sleep data).
 *
 * Auth: Bearer CRON_SECRET (matches /api/cron/calculate-acwr).
 */

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { syncOuraData } from '@/lib/integrations/oura/sync'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not configured', {})
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 },
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  logger.info('Starting nightly Oura sync')

  const tokens = await prisma.integrationToken.findMany({
    where: { type: 'OURA', syncEnabled: true },
    select: { clientId: true },
  })

  let succeeded = 0
  let failed = 0
  const failures: Array<{ clientId: string; error: string }> = []

  for (const { clientId } of tokens) {
    try {
      const result = await syncOuraData(clientId, { daysBack: 3 })
      if (result.errors.length > 0) {
        failed++
        failures.push({ clientId, error: result.errors.join('; ').slice(0, 300) })
      } else {
        succeeded++
      }
    } catch (error) {
      failed++
      failures.push({
        clientId,
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

  const durationMs = Date.now() - startedAt
  logger.info('Oura sync cron complete', {
    total: tokens.length,
    succeeded,
    failed,
    durationMs,
  })

  return NextResponse.json({
    success: true,
    total: tokens.length,
    succeeded,
    failed,
    durationMs,
    failures: failures.slice(0, 25),
  })
}

export async function GET(request: NextRequest) {
  // Vercel cron pings via GET; reuse POST handler.
  return POST(request)
}
