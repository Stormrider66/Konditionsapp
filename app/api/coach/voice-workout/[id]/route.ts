/**
 * Voice Workout Session API
 *
 * GET /api/coach/voice-workout/[id] - Get session details
 * DELETE /api/coach/voice-workout/[id] - Delete session
 * PATCH /api/coach/voice-workout/[id] - Update parsed intent (for corrections)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { buildVoiceWorkoutPreview } from '@/lib/ai/voice-workout-generator'
import { normalizeStoragePath } from '@/lib/storage/supabase-storage'
import { createSignedUrl } from '@/lib/storage/supabase-storage-server'
import { voiceWorkoutUpdateIntentSchema } from '@/lib/validations/voice-workout-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type { VoiceWorkoutIntent } from '@/types/voice-workout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const rateLimited = await rateLimitJsonResponse('voice-workout:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const session = await prisma.voiceWorkoutSession.findUnique({
      where: { id },
      include: {
        strengthSession: { select: { id: true, name: true } },
        cardioSession: { select: { id: true, name: true } },
        hybridWorkout: { select: { id: true, name: true } },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get signed URL for audio playback
    let audioSignedUrl: string | undefined
    const path = normalizeStoragePath('voice-workouts', session.audioUrl)
    if (path) {
      try {
        audioSignedUrl = await createSignedUrl('voice-workouts', path, 60 * 60)
      } catch {
        audioSignedUrl = undefined
      }
    }

    // If session is parsed, rebuild preview
    let preview
    if (session.status === 'PARSED' && session.parsedIntent) {
      try {
        preview = await buildVoiceWorkoutPreview(
          session.id,
          session.parsedIntent as unknown as VoiceWorkoutIntent,
          user.id
        )
      } catch (err) {
        logger.error('Failed to build preview', { sessionId: session.id }, err)
      }
    }

    return NextResponse.json({
      session: {
        ...session,
        audioUrl: audioSignedUrl,
      },
      preview,
    })
  } catch (error) {
    logger.error('Voice workout get error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const rateLimited = await rateLimitJsonResponse('voice-workout:delete', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const session = await prisma.voiceWorkoutSession.findUnique({
      where: { id },
      select: { coachId: true, audioUrl: true, status: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Don't allow deleting confirmed sessions with created workouts
    if (session.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Cannot delete confirmed sessions. Delete the workout instead.' },
        { status: 400 }
      )
    }

    // Delete audio from storage
    const path = normalizeStoragePath('voice-workouts', session.audioUrl)
    if (path) {
      try {
        await supabase.storage.from('voice-workouts').remove([path])
      } catch (err) {
        logger.error('Failed to delete audio from storage', { path }, err)
      }
    }

    // Delete database record
    await prisma.voiceWorkoutSession.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Voice workout delete error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const rateLimited = await rateLimitJsonResponse('voice-workout:update', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()

    // Validate update data
    const parsed = voiceWorkoutUpdateIntentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const session = await prisma.voiceWorkoutSession.findUnique({
      where: { id },
      select: { coachId: true, status: true, parsedIntent: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow updates to PARSED sessions
    if (session.status !== 'PARSED') {
      return NextResponse.json(
        { error: 'Can only update sessions with PARSED status' },
        { status: 400 }
      )
    }

    // Merge updates into existing intent
    const currentIntent = session.parsedIntent as unknown as VoiceWorkoutIntent
    const updates = parsed.data

    const updatedIntent: VoiceWorkoutIntent = {
      ...currentIntent,
      target: updates.target
        ? { ...currentIntent.target, ...updates.target }
        : currentIntent.target,
      schedule: updates.schedule
        ? { ...currentIntent.schedule, ...updates.schedule }
        : currentIntent.schedule,
      workout: updates.workout
        ? { ...currentIntent.workout, ...updates.workout }
        : currentIntent.workout,
    }

    // Update session
    await prisma.voiceWorkoutSession.update({
      where: { id },
      data: {
        parsedIntent: updatedIntent as object,
        workoutType: updatedIntent.workout.type,
        targetType: updatedIntent.target.type,
        targetId: updatedIntent.target.resolvedId,
        assignedDate: updatedIntent.schedule.resolvedDate
          ? new Date(updatedIntent.schedule.resolvedDate)
          : null,
      },
    })

    // Rebuild preview
    const preview = await buildVoiceWorkoutPreview(id, updatedIntent, user.id)

    return NextResponse.json({
      success: true,
      preview,
    })
  } catch (error) {
    logger.error('Voice workout update error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
