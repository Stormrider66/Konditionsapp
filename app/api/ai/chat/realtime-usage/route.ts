/**
 * Floating AI realtime voice usage logging.
 *
 * POST /api/ai/chat/realtime-usage
 *
 * Records estimated OpenAI Realtime usage after a browser WebRTC session ends.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { estimateRealtimeVoiceCost } from '@/lib/ai/realtime-voice-cost'
import { recordAiUsageDebit, usdToSek } from '@/lib/ai/billing/allowance'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const REALTIME_MODEL = 'gpt-realtime-2'

const requestSchema = z.object({
  durationSeconds: z.number().min(0).max(7200),
  audioInputSeconds: z.number().min(0).max(7200).optional(),
  audioOutputSeconds: z.number().min(0).max(7200).optional(),
  inputTokens: z.number().int().min(0).max(10_000_000).optional(),
  outputTokens: z.number().int().min(0).max(10_000_000).optional(),
  textInputTokens: z.number().int().min(0).max(10_000_000).optional(),
  textOutputTokens: z.number().int().min(0).max(10_000_000).optional(),
  audioInputTokens: z.number().int().min(0).max(10_000_000).optional(),
  audioOutputTokens: z.number().int().min(0).max(10_000_000).optional(),
  isAthleteChat: z.boolean().optional().default(false),
  endReason: z.enum(['user_stopped', 'disconnected', 'error', 'close', 'new_chat']).optional().default('user_stopped'),
})

async function resolveClientIdForUsage(isAthleteChat: boolean, locale: AppLocale): Promise<{
  userId: string
  clientId: string | null
}> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Response(JSON.stringify({ error: t(locale, 'Unauthorized', 'Obehörig') }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isAthleteChat) {
    const hasCoachAccess = await canAccessCoachPlatform(currentUser.id)
    if (!hasCoachAccess) {
      throw new Response(JSON.stringify({ error: t(locale, 'Coach access required', 'Coachbehörighet krävs') }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return { userId: currentUser.id, clientId: null }
  }

  const resolved = await resolveAthleteClientId()
  if (!resolved) {
    throw new Response(JSON.stringify({ error: t(locale, 'Unauthorized', 'Obehörig') }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat')
  if (!access.allowed) {
    throw new Response(JSON.stringify({
      error: access.reason || t(locale, 'AI chat requires a subscription', 'AI-chat kräver en prenumeration'),
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
      error: t(
        locale,
        'You must approve data processing before live voice cost can be logged.',
        'Du måste godkänna databehandling innan live voice-kostnad kan loggas.'
      ),
      code: 'CONSENT_REQUIRED',
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { userId: resolved.user.id, clientId: resolved.clientId }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Send valid live voice usage.', 'Skicka giltig live voice-användning.') },
        { status: 400 }
      )
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, currentUser.language)

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-usage', currentUser.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { userId, clientId } = await resolveClientIdForUsage(parsed.data.isAthleteChat, locale)
    const estimate = estimateRealtimeVoiceCost(parsed.data)

    await prisma.aIUsageLog.create({
      data: {
        userId,
        clientId,
        category: parsed.data.isAthleteChat ? 'athlete_chat_realtime_voice' : 'coach_chat_realtime_voice',
        provider: 'OPENAI',
        model: REALTIME_MODEL,
        inputTokens: estimate.inputTokens,
        outputTokens: estimate.outputTokens,
        estimatedCost: estimate.estimatedCost,
      },
    })

    let remainingSek: number | undefined
    if (clientId && estimate.estimatedCost > 0) {
      const debit = await recordAiUsageDebit({
        clientId,
        costSek: usdToSek(estimate.estimatedCost),
      })
      remainingSek = debit.debit.remainingSek
    }

    logger.info('Floating realtime voice usage logged', {
      clientId,
      durationSeconds: parsed.data.durationSeconds,
      endReason: parsed.data.endReason,
      estimatedCost: estimate.estimatedCost,
      usedTokenDetails: estimate.usedTokenDetails,
    })

    return NextResponse.json({
      success: true,
      estimatedCost: estimate.estimatedCost,
      inputTokens: estimate.inputTokens,
      outputTokens: estimate.outputTokens,
      remainingSek,
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error('Chat realtime usage logging error', {}, error)
    return NextResponse.json(
      {
        error: t(locale, 'Could not log live voice usage.', 'Kunde inte logga live voice-användning.'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
