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
import { sendEmail } from '@/lib/email/resend'
import { getTrialWarningEmailTemplate } from '@/lib/email/templates'

// Warning thresholds in days
const WARNING_THRESHOLDS = [7, 3]

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
    let emailsSent = 0
    let errors = 0
    const warningsSent: { threshold: number; coachCount: number; athleteCount: number }[] = []

    for (const threshold of WARNING_THRESHOLDS) {
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

      // Send coach warnings
      for (const subscription of coachTrials) {
        if (subscription.user.email) {
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
            emailsSent++
            coachCount++
          } catch (emailError) {
            logger.warn('Failed to send trial warning email', {
              userId: subscription.userId,
              threshold,
            }, emailError)
            errors++
          }
        }
      }

      // Send athlete warnings
      for (const subscription of athleteTrials) {
        const athleteEmail = subscription.client.athleteAccount?.user?.email || subscription.client.email
        if (athleteEmail) {
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
            emailsSent++
            athleteCount++
          } catch (emailError) {
            logger.warn('Failed to send trial warning email', {
              clientId: subscription.clientId,
              threshold,
            }, emailError)
            errors++
          }
        }
      }

      warningsSent.push({ threshold, coachCount, athleteCount })
    }

    logger.info('Trial warning job complete', {
      emailsSent,
      errors,
      warningsSent,
    })

    return NextResponse.json({
      success: true,
      emailsSent,
      errors,
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
