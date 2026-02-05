/**
 * Voice Workout API
 *
 * POST /api/coach/voice-workout - Upload audio and parse intent
 * GET /api/coach/voice-workout - List voice workout sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { parseVoiceWorkoutIntent } from '@/lib/ai/voice-workout-parser'
import { buildVoiceWorkoutPreview } from '@/lib/ai/voice-workout-generator'
import { decryptSecret } from '@/lib/crypto/secretbox'
import { normalizeStoragePath } from '@/lib/storage/supabase-storage'
import { createSignedUrl, downloadAsBase64 } from '@/lib/storage/supabase-storage-server'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB
const MAX_DURATION = 300 // 5 minutes

export const maxDuration = 300 // Allow up to 5 minutes for AI processing

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('voice-workout:upload', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const duration = parseInt(formData.get('duration') as string) || 0

    // Validation
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    // Check if file type starts with any allowed type (handles codecs like "audio/webm;codecs=opus")
    const isAllowedType = ALLOWED_TYPES.some(allowed => audioFile.type.startsWith(allowed))
    if (!isAllowedType) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (duration > MAX_DURATION) {
      return NextResponse.json(
        { error: `Recording too long. Maximum duration: ${MAX_DURATION / 60} minutes` },
        { status: 400 }
      )
    }

    // Get API keys
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
    })

    let googleKey: string | undefined
    if (apiKeys?.googleKeyEncrypted) {
      try {
        googleKey = decryptSecret(apiKeys.googleKeyEncrypted)
      } catch {
        googleKey = undefined
      }
    }

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google API key not configured. Add API key in settings.' },
        { status: 400 }
      )
    }

    // Generate unique filename with correct extension for MIME type
    const timestamp = Date.now()
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
    }
    // Extract base MIME type without codec suffix (e.g., "audio/webm;codecs=opus" -> "audio/webm")
    const baseMimeType = audioFile.type.split(';')[0]
    const ext = mimeToExt[baseMimeType] || 'webm'
    const fileName = `${user.id}/${timestamp}.${ext}`

    // Upload to Supabase Storage
    const arrayBuffer = await audioFile.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-workouts')
      .upload(fileName, arrayBuffer, {
        contentType: audioFile.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Voice workout upload: Supabase upload error', {
        message: uploadError.message,
        name: uploadError.name,
        bucket: 'voice-workouts',
        fileName,
      }, uploadError)
      // Return more specific error for debugging
      const errorMessage = uploadError.message?.includes('bucket')
        ? 'Storage bucket "voice-workouts" not found. Please create it in Supabase.'
        : uploadError.message?.includes('policy')
        ? 'Storage permission denied. Check bucket policies.'
        : `Failed to upload audio file: ${uploadError.message}`
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    // Create database record
    const session = await prisma.voiceWorkoutSession.create({
      data: {
        coachId: user.id,
        audioUrl: uploadData.path,
        duration,
        mimeType: audioFile.type,
        status: 'PROCESSING',
      },
    })

    // Process audio with AI
    const startTime = Date.now()

    try {
      // Convert audio to base64 for Gemini
      const base64Data = Buffer.from(arrayBuffer).toString('base64')

      // Parse intent from audio
      const { intent, modelUsed } = await parseVoiceWorkoutIntent(
        base64Data,
        audioFile.type,
        user.id,
        googleKey
      )

      // Build preview for coach review
      const preview = await buildVoiceWorkoutPreview(session.id, intent, user.id)

      const processingTime = Date.now() - startTime

      // Update session with parsed data
      await prisma.voiceWorkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'PARSED',
          transcription: intent.transcription,
          parsedIntent: intent as object,
          workoutType: intent.workout.type,
          targetType: intent.target.type,
          targetId: intent.target.resolvedId,
          assignedDate: intent.schedule.resolvedDate
            ? new Date(intent.schedule.resolvedDate)
            : null,
          processingTimeMs: processingTime,
          modelUsed,
        },
      })

      // Get signed URL for audio playback
      const audioSignedUrl = await createSignedUrl('voice-workouts', uploadData.path, 60 * 60)

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        audioUrl: audioSignedUrl,
        preview,
        processingTimeMs: processingTime,
      })
    } catch (aiError) {
      logger.error('Voice workout AI processing error', { sessionId: session.id }, aiError)

      // Update status to failed
      await prisma.voiceWorkoutSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          errorMessage: aiError instanceof Error ? aiError.message : 'AI processing failed',
        },
      })

      return NextResponse.json(
        {
          error: 'AI processing failed',
          details:
            process.env.NODE_ENV !== 'production'
              ? (aiError instanceof Error ? aiError.message : 'Unknown error')
              : undefined,
          sessionId: session.id, // Return session ID so user can retry
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Voice workout upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to process voice workout' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('voice-workout:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const sessions = await prisma.voiceWorkoutSession.findMany({
      where: {
        coachId: user.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        audioUrl: true,
        duration: true,
        status: true,
        transcription: true,
        workoutType: true,
        targetType: true,
        targetId: true,
        assignedDate: true,
        errorMessage: true,
        createdAt: true,
        strengthSession: { select: { id: true, name: true } },
        cardioSession: { select: { id: true, name: true } },
        hybridWorkout: { select: { id: true, name: true } },
      },
    })

    // Add signed URLs for playback
    const sessionsWithUrls = await Promise.all(
      sessions.map(async (s) => {
        const path = normalizeStoragePath('voice-workouts', s.audioUrl)
        if (!path) return s
        try {
          const signedUrl = await createSignedUrl('voice-workouts', path, 60 * 60)
          return { ...s, audioUrl: signedUrl }
        } catch {
          return s
        }
      })
    )

    return NextResponse.json({ sessions: sessionsWithUrls })
  } catch (error) {
    logger.error('Voice workout list error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to fetch voice workout sessions' }, { status: 500 })
  }
}
