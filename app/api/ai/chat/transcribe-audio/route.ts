/**
 * Floating AI chat voice transcription.
 *
 * POST /api/ai/chat/transcribe-audio
 *
 * Transcribes a short voice message into text for the floating chat input.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { resolveAthleteGoogleKeyContext } from '@/lib/ai/resolve-athlete-google-key'
import { getResolvedGoogleKey } from '@/lib/user-api-keys'
import {
  createGoogleGenAIClient,
  createInlineData,
  createText,
  generateContent,
  getGeminiModelId,
} from '@/lib/ai/google-genai-client'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const MAX_AUDIO_SIZE = 5 * 1024 * 1024
const VALID_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/3gpp',
  'audio/aac',
  'audio/x-m4a',
]

function getFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function resolveBusinessId(businessSlug?: string): Promise<string | null> {
  if (!businessSlug) return null
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  })
  return business?.id ?? null
}

export async function POST(request: NextRequest) {
  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { error: 'Skicka röstmeddelandet som formulärdata.' },
        { status: 400 }
      )
    }

    const audioFile = formData.get('audio') as File | null
    const isAthleteChat = getFormString(formData, 'isAthleteChat') === 'true'
    const businessSlug = getFormString(formData, 'businessSlug')

    if (!audioFile) {
      return NextResponse.json({ error: 'Ingen ljudfil uppladdad' }, { status: 400 })
    }

    const baseType = audioFile.type.split(';')[0].trim()
    if (!VALID_AUDIO_TYPES.includes(baseType)) {
      return NextResponse.json(
        { error: 'Ogiltigt ljudformat. Använd WebM, MP4, WAV, OGG eller MP3.' },
        { status: 400 }
      )
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Röstmeddelandet får inte vara större än 5MB.' },
        { status: 400 }
      )
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-voice-transcribe', currentUser.id, {
      limit: 12,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    let googleKey: string | null = null
    let clientId: string | null = null

    if (isAthleteChat) {
      const resolved = await resolveAthleteClientId()
      if (!resolved) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat')
      if (!access.allowed) {
        return NextResponse.json(
          {
            error: access.reason || 'AI chat requires a subscription',
            code: access.code || 'SUBSCRIPTION_REQUIRED',
            upgradeUrl: access.upgradeUrl || '/athlete/subscription',
            currentUsage: access.currentUsage,
            limit: access.limit,
          },
          { status: 403 }
        )
      }

      const consent = await getConsentStatus(resolved.clientId)
      if (!consent.hasRequiredConsent) {
        return NextResponse.json(
          {
            error: 'Du måste godkänna databehandling innan du kan använda röstinmatning.',
            code: 'CONSENT_REQUIRED',
          },
          { status: 403 }
        )
      }

      const allowanceDenied = await requireAiAllowance(resolved.clientId)
      if (allowanceDenied) return allowanceDenied

      const keyContext = await resolveAthleteGoogleKeyContext({
        clientId: resolved.clientId,
        userId: resolved.user.id,
        isCoachInAthleteMode: resolved.isCoachInAthleteMode,
      })
      if (!keyContext) {
        return NextResponse.json({ error: 'Athlete account not found' }, { status: 400 })
      }

      googleKey = keyContext.googleKey
      clientId = resolved.clientId
    } else {
      const hasCoachAccess = await canAccessCoachPlatform(currentUser.id)
      if (!hasCoachAccess) {
        return NextResponse.json({ error: 'Coachbehörighet krävs' }, { status: 403 })
      }

      const businessId = await resolveBusinessId(businessSlug)
      googleKey = await getResolvedGoogleKey(currentUser.id, {
        businessId,
        disableMembershipFallback: Boolean(businessSlug),
      })
    }

    if (!googleKey) {
      return NextResponse.json(
        {
          error: 'Google/Gemini API-nyckel saknas för röstinmatning. Aktivera Gemini i AI-inställningar.',
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const genaiClient = createGoogleGenAIClient(googleKey)
    const modelId = getGeminiModelId('audio')

    const result = await generateContent(
      genaiClient,
      modelId,
      [
        createText(
          'Transkribera denna korta röstinmatning till ren text för en AI-chatt i Trainomics. Behåll språket som användaren talar, oftast svenska. Lägg inte till förklaringar, rubriker, citattecken eller markdown. Returnera bara transkriptionen.'
        ),
        createInlineData(base64, baseType),
      ],
      { thinkingLevel: 'low', maxOutputTokens: 512 },
      {
        userId: currentUser.id,
        clientId,
        category: 'chat_voice_transcription',
      }
    )

    return NextResponse.json({
      success: true,
      text: result.text.trim(),
    })
  } catch (error) {
    logger.error('Chat voice transcription error', {}, error)
    return NextResponse.json(
      {
        error: 'Kunde inte transkribera röstmeddelandet',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
