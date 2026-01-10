/**
 * Athlete Post-Workout Feedback API
 *
 * POST /api/athlete/workout-feedback - Submit workout feedback
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const feedbackSchema = z.object({
  notificationId: z.string().uuid(),
  overallFeeling: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  difficulty: z.number().min(1).max(10),
  painOrDiscomfort: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    // Parse and validate body
    const body = await request.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const feedback = validation.data

    // Verify notification belongs to this athlete
    const notification = await prisma.aINotification.findFirst({
      where: {
        id: feedback.notificationId,
        clientId: athleteAccount.clientId,
        notificationType: 'POST_WORKOUT_CHECK',
      },
      select: { id: true, contextData: true },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Update notification with feedback
    const updatedNotification = await prisma.aINotification.update({
      where: { id: feedback.notificationId },
      data: {
        actionTakenAt: new Date(),
        contextData: {
          ...(notification.contextData as object),
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
      console.log(
        `Athlete ${athleteAccount.clientId} reported discomfort after workout: ${feedback.painOrDiscomfort}`
      )
      // Could trigger additional coach notification here
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      notificationId: updatedNotification.id,
    })
  } catch (error) {
    console.error('Error submitting workout feedback:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
