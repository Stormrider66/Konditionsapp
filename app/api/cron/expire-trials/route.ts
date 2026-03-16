// app/api/cron/expire-trials/route.ts
/**
 * Trial Expiration Cron Job
 *
 * Automatically expires trial subscriptions that have passed their trial end date.
 * Also sends expiration notification emails to affected users.
 *
 * Trigger: Cron job (daily at 2:00 AM)
 * Method: POST /api/cron/expire-trials
 * Auth: Cron secret token (CRON_SECRET environment variable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, getTrialExpiredEmailTemplate } from '@/lib/email'

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

    logger.info('Starting trial expiration job')

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
    let coachExpired = 0
    let athleteExpired = 0
    let emailsSent = 0
    let errors = 0
    let exhausted = false
    let timedOut = false
    let hasMore = false
    let coachCursor: string | null = null
    let athleteCursor: string | null = null

    while (processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        timedOut = true
        break
      }

      const remainingCapacity = batchLimit - processed
      const coachTake = Math.min(pageSize, remainingCapacity)
      const expiredCoachTrials: ExpiredCoachTrial[] = coachTake > 0
        ? await prisma.subscription.findMany({
            where: {
              status: 'TRIAL',
              trialEndsAt: { lte: now },
            },
            ...(coachCursor
              ? {
                  cursor: { id: coachCursor },
                  skip: 1,
                }
              : {}),
            take: coachTake,
            orderBy: { id: 'asc' },
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
        : []

      scanned += expiredCoachTrials.length
      if (expiredCoachTrials.length > 0) {
        coachCursor = expiredCoachTrials[expiredCoachTrials.length - 1].id
        if (expiredCoachTrials.length === coachTake && remainingCapacity === coachTake) {
          hasMore = true
        }
      }

      for (let i = 0; i < expiredCoachTrials.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
          hasMore = true
          break
        }

        const chunk = expiredCoachTrials.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processExpiredCoachTrial))

        for (const outcome of outcomes) {
          processed++
          if (outcome.status === 'success') {
            coachExpired++
            if (outcome.emailSent) {
              emailsSent++
            }
          } else {
            errors++
          }

          if (processed >= batchLimit) {
            hasMore = true
            break
          }
        }

        if (processed >= batchLimit) {
          break
        }
      }

      if (timedOut || processed >= batchLimit) {
        break
      }

      const athleteRemaining = batchLimit - processed
      const athleteTake = Math.min(pageSize, athleteRemaining)
      const expiredAthleteTrials: ExpiredAthleteTrial[] = athleteTake > 0
        ? await prisma.athleteSubscription.findMany({
            where: {
              status: 'TRIAL',
              trialEndsAt: { lte: now },
            },
            ...(athleteCursor
              ? {
                  cursor: { id: athleteCursor },
                  skip: 1,
                }
              : {}),
            take: athleteTake,
            orderBy: { id: 'asc' },
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
        : []

      scanned += expiredAthleteTrials.length
      if (expiredAthleteTrials.length > 0) {
        athleteCursor = expiredAthleteTrials[expiredAthleteTrials.length - 1].id
        if (expiredAthleteTrials.length === athleteTake && athleteRemaining === athleteTake) {
          hasMore = true
        }
      }

      for (let i = 0; i < expiredAthleteTrials.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          timedOut = true
          hasMore = true
          break
        }

        const chunk = expiredAthleteTrials.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processExpiredAthleteTrial))

        for (const outcome of outcomes) {
          processed++
          if (outcome.status === 'success') {
            athleteExpired++
            if (outcome.emailSent) {
              emailsSent++
            }
          } else {
            errors++
          }

          if (processed >= batchLimit) {
            hasMore = true
            break
          }
        }

        if (processed >= batchLimit) {
          break
        }
      }

      if (timedOut || processed >= batchLimit) {
        break
      }

      if (expiredCoachTrials.length < coachTake && expiredAthleteTrials.length < athleteTake) {
        exhausted = true
        break
      }
    }

    logger.info('Trial expiration job complete', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
      scanned,
      processed,
      coachExpired,
      athleteExpired,
      emailsSent,
      errors,
      exhausted,
      timedOut,
      hasMore,
    })

    return NextResponse.json({
      success: true,
      scanned,
      processed,
      coachExpired,
      athleteExpired,
      emailsSent,
      errors,
      exhausted,
      timedOut,
      hasMore,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    logger.error('Trial expiration job failed', {}, error)
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

type ExpiredCoachTrial = {
  id: string
  userId: string
  user: {
    id: string
    email: string | null
    name: string | null
    language: string | null
  }
}

type ExpiredAthleteTrial = {
  id: string
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

type ExpireOutcome =
  | { status: 'success'; emailSent: boolean }
  | { status: 'error'; emailSent: false }

async function processExpiredCoachTrial(subscription: ExpiredCoachTrial): Promise<ExpireOutcome> {
  try {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' },
    })

    if (subscription.user.email) {
      try {
        const locale = (subscription.user.language === 'en' ? 'en' : 'sv') as 'sv' | 'en'
        const template = getTrialExpiredEmailTemplate({
          recipientName: subscription.user.name || 'Coach',
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/coach/subscription`,
          locale,
        })
        await sendEmail({
          to: subscription.user.email,
          subject: template.subject,
          html: template.html,
        })
        return { status: 'success', emailSent: true }
      } catch (emailError) {
        logger.warn('Failed to send trial expired email', { userId: subscription.userId }, emailError)
      }
    }

    return { status: 'success', emailSent: false }
  } catch (error) {
    logger.error('Error expiring coach trial', { subscriptionId: subscription.id }, error)
    return { status: 'error', emailSent: false }
  }
}

async function processExpiredAthleteTrial(subscription: ExpiredAthleteTrial): Promise<ExpireOutcome> {
  try {
    await prisma.athleteSubscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' },
    })

    const athleteEmail = subscription.client.athleteAccount?.user?.email || subscription.client.email
    if (athleteEmail) {
      try {
        const locale = (subscription.client.athleteAccount?.user?.language === 'en' ? 'en' : 'sv') as 'sv' | 'en'
        const template = getTrialExpiredEmailTemplate({
          recipientName: subscription.client.name,
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/athlete/subscription`,
          locale,
        })
        await sendEmail({
          to: athleteEmail,
          subject: template.subject,
          html: template.html,
        })
        return { status: 'success', emailSent: true }
      } catch (emailError) {
        logger.warn('Failed to send trial expired email', { clientId: subscription.clientId }, emailError)
      }
    }

    return { status: 'success', emailSent: false }
  } catch (error) {
    logger.error('Error expiring athlete trial', { subscriptionId: subscription.id }, error)
    return { status: 'error', emailSent: false }
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
