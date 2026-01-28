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

    // Find all coach subscriptions with expired trials
    const expiredCoachTrials = await prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lte: now },
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

    // Find all athlete subscriptions with expired trials
    const expiredAthleteTrials = await prisma.athleteSubscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lte: now },
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

    logger.info('Found expired trials', {
      coachTrials: expiredCoachTrials.length,
      athleteTrials: expiredAthleteTrials.length,
    })

    let coachExpired = 0
    let athleteExpired = 0
    let emailsSent = 0
    let errors = 0

    // Expire coach trials
    for (const subscription of expiredCoachTrials) {
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        })
        coachExpired++

        // Send expiration email
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
            emailsSent++
          } catch (emailError) {
            logger.warn('Failed to send trial expired email', { userId: subscription.userId }, emailError)
          }
        }
      } catch (error) {
        logger.error('Error expiring coach trial', { subscriptionId: subscription.id }, error)
        errors++
      }
    }

    // Expire athlete trials
    for (const subscription of expiredAthleteTrials) {
      try {
        await prisma.athleteSubscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        })
        athleteExpired++

        // Send expiration email to athlete (if they have a user account)
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
            emailsSent++
          } catch (emailError) {
            logger.warn('Failed to send trial expired email', { clientId: subscription.clientId }, emailError)
          }
        }
      } catch (error) {
        logger.error('Error expiring athlete trial', { subscriptionId: subscription.id }, error)
        errors++
      }
    }

    logger.info('Trial expiration job complete', {
      coachExpired,
      athleteExpired,
      emailsSent,
      errors,
    })

    return NextResponse.json({
      success: true,
      coachExpired,
      athleteExpired,
      emailsSent,
      errors,
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
