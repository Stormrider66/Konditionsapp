/**
 * Floating AI realtime voice call setup.
 *
 * POST /api/ai/chat/realtime-call
 *
 * Exchanges a browser WebRTC SDP offer for an OpenAI Realtime SDP answer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import {
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK,
  requireAiAllowance,
} from '@/lib/ai/billing/require-ai-allowance'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { resolveAthleteProviderAllowlist } from '@/lib/ai/chat/providers'
import {
  getPlatformAiKeyOwnerId,
  getResolvedProviderKey,
} from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const REALTIME_MODEL = 'gpt-realtime'
const REALTIME_VOICE = 'marin'
const realtimeModeSchema = z.enum([
  'coach_operator',
  'athlete_support',
  'pacing',
  'form_cues',
  'recovery',
  'strength_logging',
  'hyrox_pacing',
])
type RealtimeVoiceMode = z.infer<typeof realtimeModeSchema>

function safetyIdentifier(userId: string): string {
  return createHash('sha256').update(`trainomics:${userId}`).digest('hex')
}

const requestSchema = z.object({
  sdp: z.string().min(1).max(200_000),
  isAthleteChat: z.boolean().optional().default(false),
  businessSlug: z.string().trim().min(1).max(120).optional(),
  pageContext: z.string().max(8000).optional().default(''),
  mode: realtimeModeSchema.optional(),
})

async function resolveBusinessId(businessSlug?: string): Promise<string | null> {
  if (!businessSlug) return null
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  })
  return business?.id ?? null
}

function buildModeInstructions(mode: RealtimeVoiceMode): string {
  switch (mode) {
    case 'pacing':
      return 'Kuraterat läge: pacing. Fokusera på fart, puls, effekt, RPE, jämnhet och säkra justeringar. Ge korta cues.'
    case 'form_cues':
      return 'Kuraterat läge: teknikcues. Ge korta, generella rörelsecues. Diagnostisera inte skador och be användaren avbryta vid smärta.'
    case 'recovery':
      return 'Kuraterat läge: återhämtning. Fokusera på sömn, stress, lätt rörelse, readiness och när det är klokt att backa.'
    case 'strength_logging':
      return 'Kuraterat läge: styrkeloggning. Hjälp användaren prata igenom set, reps, vikt, RPE och nästa säkra steg. Skapa inte data direkt i live voice.'
    case 'hyrox_pacing':
      return 'Kuraterat läge: HYROX pacing. Fokusera på stationer, löpsegment, övergångar och energihantering med korta cues.'
    case 'athlete_support':
      return 'Kuraterat läge: atletstöd. Håll dig till pedagogisk, säker träningsförklaring och nästa rimliga steg.'
    case 'coach_operator':
    default:
      return 'Kuraterat läge: coach operator. Hjälp coachen tänka, sammanfatta och välja nästa synliga åtgärd.'
  }
}

function buildRealtimeInstructions(
  pageContext: string,
  isAthleteChat: boolean,
  mode: RealtimeVoiceMode
): string {
  const context = pageContext.trim()
  const roleInstructions = isAthleteChat
    ? [
        'Du är Trainomics flytande AI i live voice-läge för atletchatten.',
        'Svara kort, naturligt och på svenska om användaren talar svenska. Använd ett lugnt, stöttande coach-tonläge.',
        'Du får hjälpa atleten att förstå träning, pass, återhämtning, testdata och nästa rimliga steg.',
        'För åtgärder som skapar pass/program, ändrar data eller öppnar vyer: be användaren använda den vanliga chatten/confirm-kortet så åtgärden blir synlig och bekräftad.',
      ]
    : [
        'Du är Trainomics flytande AI i live voice-läge för coachdashboarden.',
        'Svara kort, naturligt och på svenska om användaren talar svenska. Använd ett lugnt coach-operator-tonläge.',
        'Du får hjälpa användaren att tänka, sammanfatta, förklara och säga vilken vy eller vilket nästa steg som är lämpligt.',
        'För åtgärder som skickar meddelanden, ändrar data, skapar pass/program eller öppnar vyer: be användaren använda den vanliga chatten/confirm-kortet så åtgärden blir synlig och bekräftad.',
      ]

  return [
    ...roleInstructions,
    buildModeInstructions(mode),
    'Du får inte påstå att du har navigerat, skickat, skapat, uppdaterat eller raderat något i appen under live voice-läget.',
    'Du har inte tillgång till hela knowledge-skill-biblioteket i live voice. Håll dig till det kuraterade läget och be användaren använda textchatten om expertkunskap behöver väljas.',
    'Om du saknar åtkomst eller data, säg det tydligt i ord och föreslå ett säkert nästa steg.',
    context ? `Aktuell sidkontext:\n${context}` : '',
  ].filter(Boolean).join('\n\n')
}

async function resolveOpenAiKey(params: {
  currentUserId: string
  isAthleteChat: boolean
  businessSlug?: string
}): Promise<{
  openaiKey: string | null
  clientId: string | null
}> {
  if (params.isAthleteChat) {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat')
    if (!access.allowed) {
      throw new Response(JSON.stringify({
        error: access.reason || 'AI chat requires a subscription',
        code: access.code || 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: access.upgradeUrl || '/athlete/subscription',
        currentUsage: access.currentUsage,
        limit: access.limit,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const consent = await getConsentStatus(resolved.clientId)
    if (!consent.hasRequiredConsent) {
      throw new Response(JSON.stringify({
        error: 'Du måste godkänna databehandling innan du kan använda live voice.',
        code: 'CONSENT_REQUIRED',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const allowanceDenied = await requireAiAllowance(resolved.clientId, {
      minimumRemainingSek: AI_ALLOWANCE_MINIMUM_REMAINING_SEK.richAnalysis,
    })
    if (allowanceDenied) throw allowanceDenied

    const clientRecord = await prisma.client.findUnique({
      where: { id: resolved.clientId },
      select: { userId: true, businessId: true },
    })
    if (!clientRecord?.userId) {
      throw new Response(JSON.stringify({ error: 'Athlete account not properly linked to coach' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const businessId = clientRecord.businessId
    let keyOwnerId = resolved.isCoachInAthleteMode ? resolved.user.id : clientRecord.userId
    if (keyOwnerId === resolved.user.id && !resolved.isCoachInAthleteMode) {
      keyOwnerId = (await getPlatformAiKeyOwnerId('openai')) ?? keyOwnerId
    }

    const allowedProviders = await resolveAthleteProviderAllowlist(keyOwnerId, businessId)
    if (allowedProviders && !allowedProviders.has('openai')) {
      throw new Response(JSON.stringify({ error: 'OpenAI realtime-röst är inte tillåten för det här atletkontot.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = await getResolvedProviderKey(keyOwnerId, 'openai', {
      businessId,
      disableMembershipFallback: true,
    })
    return { openaiKey, clientId: resolved.clientId }
  }

  const hasCoachAccess = await canAccessCoachPlatform(params.currentUserId)
  if (!hasCoachAccess) {
    throw new Response(JSON.stringify({ error: 'Coachbehörighet krävs' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const businessId = await resolveBusinessId(params.businessSlug)
  const openaiKey = await getResolvedProviderKey(params.currentUserId, 'openai', {
    businessId,
    disableMembershipFallback: Boolean(params.businessSlug),
  })

  return { openaiKey, clientId: null }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Skicka en WebRTC SDP-offer för live voice.' },
        { status: 400 }
      )
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-call', currentUser.id, {
      limit: 8,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { openaiKey } = await resolveOpenAiKey({
      currentUserId: currentUser.id,
      isAthleteChat: parsed.data.isAthleteChat,
      businessSlug: parsed.data.businessSlug,
    })

    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API-nyckel saknas för live voice.' },
        { status: 400 }
      )
    }

    const formData = new FormData()
    formData.set('sdp', parsed.data.sdp)
    formData.set('session', JSON.stringify({
      type: 'realtime',
          model: REALTIME_MODEL,
      instructions: buildRealtimeInstructions(
        parsed.data.pageContext,
        parsed.data.isAthleteChat,
        parsed.data.mode ?? (parsed.data.isAthleteChat ? 'athlete_support' : 'coach_operator')
      ),
      output_modalities: ['audio'],
      audio: {
        input: {
          transcription: {
            model: 'gpt-4o-mini-transcribe',
          },
        },
        output: {
          voice: REALTIME_VOICE,
        },
      },
      max_output_tokens: 1200,
    }))

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'OpenAI-Safety-Identifier': safetyIdentifier(currentUser.id),
      },
      body: formData,
    })

    const answerSdp = await response.text()
    if (!response.ok) {
      logger.warn('OpenAI realtime call setup failed', {
        status: response.status,
        body: answerSdp.slice(0, 500),
      })
      return NextResponse.json(
        { error: 'Kunde inte starta OpenAI live voice just nu.' },
        { status: response.status }
      )
    }

    return new NextResponse(answerSdp, {
      status: 200,
      headers: {
        'Content-Type': 'application/sdp',
        'Cache-Control': 'no-store',
        'X-AI-Realtime-Provider': 'openai',
        'X-AI-Realtime-Model': REALTIME_MODEL,
        'X-AI-Realtime-Mode': parsed.data.mode ?? (parsed.data.isAthleteChat ? 'athlete_support' : 'coach_operator'),
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error('Chat realtime call setup error', {}, error)
    return NextResponse.json(
      {
        error: 'Kunde inte starta live voice.',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
