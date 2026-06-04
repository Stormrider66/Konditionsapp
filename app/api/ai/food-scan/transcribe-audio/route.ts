/**
 * Food Scan Audio Transcription API
 *
 * POST /api/ai/food-scan/transcribe-audio
 *
 * Transcribes a short audio clip about food corrections using Gemini.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
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
import { withAiContext } from '@/lib/ai/usage-logger'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const MAX_AUDIO_SIZE = 5 * 1024 * 1024 // 5MB

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, isCoachInAthleteMode, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const denied = await requireFeatureAccess(clientId, 'nutrition_planning')
    if (denied) return denied

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

    const rateLimited = await rateLimitJsonResponse('ai:food-scan-transcribe', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: t(locale, 'No audio file uploaded', 'Ingen ljudfil uppladdad') }, { status: 400 })
    }

    const validTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/3gpp', 'audio/aac']
    const baseType = audioFile.type.split(';')[0].trim()
    if (!validTypes.includes(baseType)) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Invalid audio format. Use WebM, MP4, WAV, or MP3.',
            'Ogiltigt ljudformat. Använd WebM, MP4, WAV eller MP3.'
          ),
        },
        { status: 400 }
      )
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: t(locale, 'The audio file cannot be larger than 5MB.', 'Ljudfilen får inte vara större än 5MB.') },
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
      return NextResponse.json(
        { error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') },
        { status: 400 }
      )
    }

    // Audio transcription is powered by Gemini for this flow.
    const googleKey = keyContext.googleKey

    if (!googleKey) {
      return NextResponse.json(
        {
          error: t(
            locale,
            'Google/Gemini API key is missing for audio transcription. Enable Gemini in AI settings.',
            'Google/Gemini API-nyckel saknas för ljudtranskribering. Aktivera Gemini i AI-inställningar.'
          ),
        },
        { status: 400 }
      )
    }

    // Convert to base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Transcribe with Gemini
    const genaiClient = createGoogleGenAIClient(googleKey)
    const modelId = getGeminiModelId('audio')

    const result = await withAiContext(
      { userId: user.id, clientId, category: 'food_scan_audio_transcription' },
      () => generateContent(genaiClient, modelId, [
        createText(
          t(
            locale,
            'Transcribe this short audio recording to clean text. The recording is about food and nutrition; the user is correcting or adding information about a meal. Keep the same language the user speaks and preserve food names, quantities, and units exactly where possible. Return ONLY the transcribed text, nothing else.',
            'Transkribera denna korta ljudinspelning till svensk text. Inspelningen handlar om mat och näring - användaren korrigerar eller lägger till information om en måltid. Returnera BARA den transkriberade texten, inget annat.'
          )
        ),
        createInlineData(base64, audioFile.type),
      ], { thinkingLevel: 'low' }),
    )

    return NextResponse.json({
      success: true,
      text: result.text.trim(),
    })
  } catch (error) {
    logger.error('Food scan transcribe error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: t(locale, 'Could not transcribe the audio', 'Kunde inte transkribera ljudet'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
