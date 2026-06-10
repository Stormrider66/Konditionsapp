import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { expirePendingAiActionDrafts } from '@/lib/ai/capabilities/action-expiry'

const DEFAULT_BATCH_LIMIT = 500

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not configured', {})
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = value ? parseInt(value, 10) : fallback
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(parsed, max))
}

// GET /api/cron/expire-ai-action-drafts - Expire stale pending AI confirmation drafts
export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const limit = parseBoundedInt(
    request.nextUrl.searchParams.get('limit'),
    DEFAULT_BATCH_LIMIT,
    1,
    1000
  )

  try {
    logger.info('Starting AI action draft expiry job', { limit })

    const result = await expirePendingAiActionDrafts({ limit })
    const durationMs = Date.now() - startTime

    logger.info('AI action draft expiry job completed', {
      durationMs,
      expiredCount: result.expiredCount,
      scannedCount: result.scannedCount,
      hasMore: result.hasMore,
    })

    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
      scannedCount: result.scannedCount,
      hasMore: result.hasMore,
      cutoff: result.cutoff.toISOString(),
      durationMs,
    })
  } catch (error) {
    logger.error('AI action draft expiry job failed', {}, error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
