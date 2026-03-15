import { NextRequest, NextResponse } from 'next/server'
import { processDailyMetricsPostWriteJobs } from '@/lib/daily-metrics-jobs'
import { logger } from '@/lib/logger'

export const maxDuration = 60

async function runProcessDailyMetricsJobs() {
  const result = await processDailyMetricsPostWriteJobs({ limit: 25 })
  logger.info('Processed durable daily-metrics jobs', result)
  return NextResponse.json({ success: true, ...result })
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runProcessDailyMetricsJobs()
  } catch (error) {
    logger.error('Durable daily-metrics cron failed', {}, error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runProcessDailyMetricsJobs()
  } catch (error) {
    logger.error('Durable daily-metrics cron failed', {}, error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
