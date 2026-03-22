/**
 * Food Scan Audio Transcription API
 *
 * POST /api/ai/food-scan/transcribe-audio
 *
 * Transcribes a short audio clip about food corrections using Gemini.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import {
  createGoogleGenAIClient,
  generateContent,
  createInlineData,
  createText,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client'
import { logger } from '@/lib/logger'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'

const MAX_AUDIO_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved

    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-transcribe', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'Ingen ljudfil uppladdad' }, { status: 400 })
    }

    const validTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/3gpp', 'audio/aac']
    const baseType = audioFile.type.split(';')[0].trim()
    if (!validTypes.includes(baseType)) {
      return NextResponse.json(
        { error: 'Ogiltigt ljudformat. Använd WebM, MP4, WAV eller MP3.' },
        { status: 400 }
      )
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Ljudfilen får inte vara större än 5MB.' },
        { status: 400 }
      )
    }

    // Resolve Google API key
    const keyContext = await resolveAthleteGoogleKeyContext({
      clientId,
      isCoachInAthleteMode,
      userId: user.id,
    })

    if (!keyContext) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 400 })
    }

    // Audio transcription is powered by Gemini for this flow.
    const googleKey = keyContext.googleKey

    if (!googleKey) {
      return NextResponse.json(
        { error: 'Google/Gemini API-nyckel saknas för ljudtranskribering. Aktivera Gemini i AI-inställningar.' },
        { status: 400 }
      )
    }

    // Convert to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Transcribe with Gemini
    const genaiClient = createGoogleGenAIClient(googleKey)
    const modelId = getGeminiModelId('audio')

    const result = await generateContent(genaiClient, modelId, [
      createText(
        'Transkribera denna korta ljudinspelning till svensk text. Inspelningen handlar om mat och näring — användaren korrigerar eller lägger till information om en måltid. Returnera BARA den transkriberade texten, inget annat.'
      ),
      createInlineData(base64, audioFile.type),
    ])

    return NextResponse.json({
      success: true,
      text: result.text.trim(),
    })
  } catch (error) {
    logger.error('Food scan transcribe error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Kunde inte transkribera ljudet',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
