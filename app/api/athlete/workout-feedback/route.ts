/**
 * Athlete Post-Workout Feedback API
 *
 * POST /api/athlete/workout-feedback - Submit workout feedback
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { createPostWorkoutPainCoachAlert } from '@/lib/coach/post-workout-pain-alert'

const feedbackSchema = z.object({
  notificationId: z.string().uuid(),
  overallFeeling: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  difficulty: z.number().min(1).max(10),
  painOrDiscomfort: z.string().optional(),
  notes: z.string().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: Request) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { clientId } = resolved

    // Parse and validate body
    const body = await request.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: t(locale, 'Invalid feedback data', 'Ogiltig feedbackdata'),
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const feedback = validation.data

    // Verify notification belongs to this athlete
    const notification = await prisma.aINotification.findFirst({
      where: {
        id: feedback.notificationId,
        clientId: clientId,
        notificationType: 'POST_WORKOUT_CHECK',
      },
      select: {
        id: true,
        contextData: true,
        client: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: t(locale, 'Notification not found', 'Notisen hittades inte') },
        { status: 404 }
      )
    }

    // Update notification with feedback
    const existingContext = (notification.contextData as object) || {}
    const updatedNotification = await prisma.aINotification.update({
      where: { id: feedback.notificationId },
      data: {
        actionTakenAt: new Date(),
        contextData: {
          ...existingContext,
          feedback: {
            overallFeeling: feedback.overallFeeling,
            energyLevel: feedback.energyLevel,
            difficulty: feedback.difficulty,
            painOrDiscomfort: feedback.painOrDiscomfort || null,
            notes: feedback.notes || null,
            submittedAt: new Date().toISOString(),
          },
        },
      },
    })

    // If pain/discomfort was reported, consider creating a flag for the coach
    if (feedback.painOrDiscomfort && feedback.painOrDiscomfort.trim().length > 0) {
      const alertResult = await createPostWorkoutPainCoachAlert({
        athleteUserId: resolved.user.id,
        client: notification.client,
        notificationId: feedback.notificationId,
        notificationContextData: notification.contextData,
        feedback,
      })

      logger.info('Athlete reported discomfort after workout', {
        clientId: clientId,
        alertCreated: alertResult.created,
        alertId: alertResult.alertId,
        severity: alertResult.severity,
        skippedReason: alertResult.skippedReason,
      })
    }

    return NextResponse.json({
      success: true,
      message: t(locale, 'Feedback submitted successfully', 'Feedbacken skickades'),
      notificationId: updatedNotification.id,
    })
  } catch (error) {
    console.error('Error submitting workout feedback:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to submit feedback', 'Kunde inte skicka feedback') },
      { status: 500 }
    )
  }
}
