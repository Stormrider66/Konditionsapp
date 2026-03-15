// app/api/cron/trial-warnings/route.ts
/**
 * Trial Warning Cron Job
 *
 * Sends warning emails to users whose trials are about to expire.
 * Warnings are sent at 7 days and 3 days before trial expiration.
 *
 * Trigger: Cron job (daily at 9:00 AM)
 * Method: POST /api/cron/trial-warnings
 * Auth: Cron secret token (CRON_SECRET environment variable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, getTrialWarningEmailTemplate } from '@/lib/email'

// Warning thresholds in days
const WARNING_THRESHOLDS = [7, 3]
const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not configured', {})
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting trial warning job')

    const now = new Date()
    const batchLimit = parseBoundedInt(
      request.nextUrl.searchParams.get('limit'),
      DEFAULT_BATCH_LIMIT,
      1,
      500
    )
    const pageSize = parseBoundedInt(
      request.nextUrl.searchParams.get('pageSize'),
      DEFAULT_PAGE_SIZE,
      25,
      500
    )
    const concurrency = parseBoundedInt(
      request.nextUrl.searchParams.get('concurrency'),
      DEFAULT_CONCURRENCY,
      1,
      20
    )
    const executionBudgetMs = parseBoundedInt(
      request.nextUrl.searchParams.get('budgetMs'),
      DEFAULT_EXECUTION_BUDGET_MS,
      30_000,
      DEFAULT_EXECUTION_BUDGET_MS
    )
    const startTime = Date.now()

    let scanned = 0
    let processed = 0
    let emailsSent = 0
    let errors = 0
    let exhausted = false
    let timedOut = false
    let hasMore = false
    const warningsSent: { threshold: number; coachCount: number; athleteCount: number }[] = []

    for (const threshold of WARNING_THRESHOLDS) {
      if (processed >= batchLimit || Date.now() - startTime >= executionBudgetMs) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
        }
        hasMore = true
        break
      }

      // Calculate the target date range for this threshold
      // We want trials that expire in exactly `threshold` days (within a 24-hour window)
      const targetDateStart = new Date(now)
      targetDateStart.setDate(targetDateStart.getDate() + threshold)
      targetDateStart.setHours(0, 0, 0, 0)

      const targetDateEnd = new Date(targetDateStart)
      targetDateEnd.setDate(targetDateEnd.getDate() + 1)

      // Find coach subscriptions expiring in this window
      const coachTrials = await prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            gte: targetDateStart,
            lt: targetDateEnd,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              language: true,
            },
          },
        },
      })

      // Find athlete subscriptions expiring in this window
      const athleteTrials = await prisma.athleteSubscription.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            gte: targetDateStart,
            lt: targetDateEnd,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              athleteAccount: {
                select: {
                  user: {
                    select: {
                      email: true,
                      language: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      let coachCount = 0
      let athleteCount = 0

      scanned += coachTrials.length + athleteTrials.length

      const coachRemaining = batchLimit - processed
      if (coachTrials.length > coachRemaining) {
        hasMore = true
      }
      const coachesToProcess = coachTrials.slice(0, coachRemaining)

      for (let i = 0; i < coachesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
          hasMore = true
          break
        }

        const chunk = coachesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map((subscription) => processCoachWarning(subscription, threshold)))

        for (const outcome of outcomes) {
          processed++
          if (outcome.status === 'sent') {
            emailsSent++
            coachCount++
          } else if (outcome.status === 'error') {
            errors++
          }
        }

        if (processed >= batchLimit) {
          hasMore = true
          break
        }
      }

      if (timedOut || processed >= batchLimit) {
        warningsSent.push({ threshold, coachCount, athleteCount })
        break
      }

      const athleteRemaining = batchLimit - processed
      if (athleteTrials.length > athleteRemaining) {
        hasMore = true
      }
      const athletesToProcess = athleteTrials.slice(0, athleteRemaining)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
          hasMore = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(
          chunk.map((subscription) => processAthleteWarning(subscription, threshold))
        )

        for (const outcome of outcomes) {
          processed++
          if (outcome.status === 'sent') {
            emailsSent++
            athleteCount++
          } else if (outcome.status === 'error') {
            errors++
          }
        }

        if (processed >= batchLimit) {
          hasMore = true
          break
        }
      }

      warningsSent.push({ threshold, coachCount, athleteCount })

      if (timedOut || processed >= batchLimit) {
        break
      }
    }

    if (!timedOut && !hasMore) {
      exhausted = true
    }

    logger.info('Trial warning job complete', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
      scanned,
      processed,
      emailsSent,
      errors,
      exhausted,
      timedOut,
      hasMore,
      warningsSent,
    })

    return NextResponse.json({
      success: true,
      scanned,
      processed,
      emailsSent,
      errors,
      exhausted,
      timedOut,
      hasMore,
      warningsSent,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    logger.error('Trial warning job failed', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Allow GET for manual testing (requires same authentication)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}

type CoachTrialSubscription = {
  userId: string
  user: {
    id: string
    email: string | null
    name: string | null
    language: string | null
  }
}

type AthleteTrialSubscription = {
  clientId: string
  client: {
    id: string
    name: string
    email: string | null
    athleteAccount: {
      user: {
        email: string | null
        language: string | null
      }
    } | null
  }
}

type EmailOutcome =
  | { status: 'sent' | 'skipped' }
  | { status: 'error' }

async function processCoachWarning(
  subscription: CoachTrialSubscription,
  threshold: number
): Promise<EmailOutcome> {
  if (!subscription.user.email) {
    return { status: 'skipped' }
  }

  try {
    const locale = (subscription.user.language === 'en' ? 'en' : 'sv') as 'sv' | 'en'
    const template = getTrialWarningEmailTemplate({
      recipientName: subscription.user.name || 'Coach',
      daysRemaining: threshold,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/coach/subscription`,
      locale,
    })
    await sendEmail({
      to: subscription.user.email,
      subject: template.subject,
      html: template.html,
    })
    return { status: 'sent' }
  } catch (emailError) {
    logger.warn('Failed to send trial warning email', {
      userId: subscription.userId,
      threshold,
    }, emailError)
    return { status: 'error' }
  }
}

async function processAthleteWarning(
  subscription: AthleteTrialSubscription,
  threshold: number
): Promise<EmailOutcome> {
  const athleteEmail = subscription.client.athleteAccount?.user?.email || subscription.client.email
  if (!athleteEmail) {
    return { status: 'skipped' }
  }

  try {
    const locale = (subscription.client.athleteAccount?.user?.language === 'en' ? 'en' : 'sv') as 'sv' | 'en'
    const template = getTrialWarningEmailTemplate({
      recipientName: subscription.client.name,
      daysRemaining: threshold,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/athlete/subscription`,
      locale,
    })
    await sendEmail({
      to: athleteEmail,
      subject: template.subject,
      html: template.html,
    })
    return { status: 'sent' }
  } catch (emailError) {
    logger.warn('Failed to send trial warning email', {
      clientId: subscription.clientId,
      threshold,
    }, emailError)
    return { status: 'error' }
  }
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback

  return Math.min(Math.max(parsed, min), max)
}
