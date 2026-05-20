/**
 * Floating AI chat text-to-speech.
 *
 * POST /api/ai/chat/speech
 *
 * Generates high-quality spoken audio for completed assistant replies.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { resolveAthleteProviderAllowlist } from '@/lib/ai/chat/providers'
import {
  getPlatformAiKeyOwnerId,
  getResolvedProviderKey,
} from '@/lib/user-api-keys'
import { logAiUsage } from '@/lib/ai/usage-logger'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const TTS_MODEL = 'gpt-4o-mini-tts'
const TTS_VOICE = 'marin'
const MAX_TTS_CHARS = 4096
const OPENAI_TTS_INPUT_USD_PER_1M = 0.60
const OPENAI_TTS_AUDIO_OUTPUT_USD_PER_1M = 12.00
type AppLocale = 'en' | 'sv'

const requestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TTS_CHARS),
  isAthleteChat: z.boolean().optional().default(false),
  businessSlug: z.string().trim().min(1).max(120).optional(),
})

async function resolveBusinessId(businessSlug?: string): Promise<string | null> {
  if (!businessSlug) return null
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  })
  return business?.id ?? null
}

function estimateTtsCostUsd(text: string): {
  inputTokens: number
  outputTokens: number
  estimatedCost: number
} {
  const inputTokens = Math.ceil(text.length / 4)
  const estimatedAudioSeconds = Math.max(1, Math.ceil(text.length / 13))
  const outputTokens = estimatedAudioSeconds * 50
  const estimatedCost =
    (inputTokens / 1_000_000) * OPENAI_TTS_INPUT_USD_PER_1M +
    (outputTokens / 1_000_000) * OPENAI_TTS_AUDIO_OUTPUT_USD_PER_1M

  return { inputTokens, outputTokens, estimatedCost }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Send the text that should be read aloud.', 'Skicka texten som ska läsas upp.') },
        { status: 400 }
      )
    }

    const { text, isAthleteChat, businessSlug } = parsed.data
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = getUserLocale(currentUser.language)

    const rateLimited = await rateLimitJsonResponse('ai:chat-speech', currentUser.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    let openaiKey: string | null = null
    let clientId: string | null = null
    let keyOwnerId = currentUser.id
    let businessId: string | null = null

    if (isAthleteChat) {
      const resolved = await resolveAthleteClientId()
      if (!resolved) {
        return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
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
            error: t(locale, 'You must approve data processing before using AI voice.', 'Du måste godkänna databehandling innan du kan använda AI-röst.'),
            code: 'CONSENT_REQUIRED',
          },
          { status: 403 }
        )
      }

      const allowanceDenied = await requireAiAllowance(resolved.clientId)
      if (allowanceDenied) return allowanceDenied

      const clientRecord = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { id: true, userId: true, businessId: true },
      })
      if (!clientRecord?.userId) {
        return NextResponse.json(
          { error: t(locale, 'Athlete account is not properly linked to a coach', 'Atletkontot är inte korrekt kopplat till en coach') },
          { status: 400 }
        )
      }

      clientId = resolved.clientId
      businessId = clientRecord.businessId
      keyOwnerId = resolved.isCoachInAthleteMode ? resolved.user.id : clientRecord.userId

      if (keyOwnerId === resolved.user.id && !resolved.isCoachInAthleteMode) {
        keyOwnerId = (await getPlatformAiKeyOwnerId('openai')) ?? keyOwnerId
      }

      const allowedProviders = await resolveAthleteProviderAllowlist(keyOwnerId, businessId)
      if (allowedProviders && !allowedProviders.has('openai')) {
        return NextResponse.json(
          { error: t(locale, 'OpenAI voices are not allowed for this athlete account.', 'OpenAI-röster är inte tillåtna för det här atletkontot.') },
          { status: 403 }
        )
      }

      openaiKey = await getResolvedProviderKey(keyOwnerId, 'openai', {
        businessId,
        disableMembershipFallback: true,
      })
    } else {
      const hasCoachAccess = await canAccessCoachPlatform(currentUser.id)
      if (!hasCoachAccess) {
        return NextResponse.json({ error: t(locale, 'Coach access required', 'Coachbehörighet krävs') }, { status: 403 })
      }

      businessId = await resolveBusinessId(businessSlug)
      openaiKey = await getResolvedProviderKey(currentUser.id, 'openai', {
        businessId,
        disableMembershipFallback: Boolean(businessSlug),
      })
    }

    if (!openaiKey) {
      return NextResponse.json(
        {
          error: t(
            locale,
            "OpenAI API key is missing for AI voice. I can use the browser's voice as a fallback.",
            'OpenAI API-nyckel saknas för AI-röst. Jag kan använda webbläsarens röst som fallback.'
          ),
          fallback: 'browser_speech',
        },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey: openaiKey })
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      instructions: buildTtsInstructions(locale),
      response_format: 'mp3',
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const usage = estimateTtsCostUsd(text)
    logAiUsage({
      userId: currentUser.id,
      clientId,
      category: 'chat_voice_reply_tts',
      provider: 'OPENAI',
      model: TTS_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
    })

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-AI-TTS-Provider': 'openai',
        'X-AI-TTS-Model': TTS_MODEL,
        'X-AI-Generated-Voice': 'true',
      },
    })
  } catch (error) {
    logger.error('Chat speech generation error', {}, error)
    return NextResponse.json(
      {
        error: t(locale, "Could not create the AI voice right now. I can use the browser's voice as a fallback.", 'Kunde inte skapa AI-rösten just nu. Jag kan använda webbläsarens röst som fallback.'),
        fallback: 'browser_speech',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function buildTtsInstructions(locale: AppLocale): string {
  return locale === 'sv'
    ? 'Speak Swedish naturally unless the text is in another language. Use a calm, helpful coach-operator tone. Keep names and training terms clear.'
    : 'Speak English naturally unless the text is in another language. Use a calm, helpful coach-operator tone. Keep names and training terms clear.'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
