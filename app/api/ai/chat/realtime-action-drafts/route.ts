import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { isAiAssistantOperationsEnabled } from '@/lib/ai/capabilities/feature-gate'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'
import {
  buildCreateCardioWorkoutPreview,
  CREATE_CARDIO_WORKOUT_TOOL_NAME,
  createCardioWorkoutInputSchema,
  getCreateCardioWorkoutClarification,
} from '@/lib/ai/cardio-workout-action'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  toolName: z.literal(CREATE_CARDIO_WORKOUT_TOOL_NAME),
  arguments: z.unknown(),
  callId: z.string().max(200).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat', locale)
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: access.reason || t(locale, 'AI chat requires a subscription', 'AI-chat kräver en prenumeration'),
          code: access.code || 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: access.upgradeUrl,
          currentUsage: access.currentUsage,
          limit: access.limit,
        },
        { status: 403 }
      )
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-action-drafts', resolved.user.id, {
      limit: 12,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const allowanceDenied = await requireAiAllowance(resolved.clientId)
    if (allowanceDenied) return allowanceDenied

    const consent = await getConsentStatus(resolved.clientId)
    if (!consent.hasRequiredConsent) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'You must approve data processing before live voice can prepare actions.',
            'Du måste godkänna databehandling innan live voice kan förbereda åtgärder.'
          ),
          code: 'CONSENT_REQUIRED',
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unsupported live voice action.', 'Live voice-åtgärden stöds inte.') },
        { status: 400 }
      )
    }

    let rawArguments: unknown
    try {
      rawArguments = parseToolArguments(parsedRequest.data.arguments)
    } catch {
      return NextResponse.json(
        { success: false, error: t(locale, 'The workout details were not valid JSON.', 'Passdetaljerna var inte giltig JSON.') },
        { status: 400 }
      )
    }

    const parsedInput = createCardioWorkoutInputSchema.safeParse(rawArguments)
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'The workout details were incomplete or invalid.', 'Passdetaljerna var ofullständiga eller ogiltiga.'),
          details: parsedInput.error.flatten(),
        },
        { status: 400 }
      )
    }

    const clarification = getCreateCardioWorkoutClarification(parsedInput.data, locale)
    if (clarification) {
      return NextResponse.json({
        success: false,
        needsClarification: true,
        error: clarification,
      })
    }

    const client = await prisma.client.findUnique({
      where: { id: resolved.clientId },
      select: {
        businessId: true,
        business: {
          select: { slug: true },
        },
      },
    })

    const operationsEnabled = await isAiAssistantOperationsEnabled(client?.businessId)
    if (!operationsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'AI action confirmations are not enabled for this organization.', 'AI-bekräftelser är inte aktiverade för den här verksamheten.'),
        },
        { status: 403 }
      )
    }

    const draft = await createAiActionDraftForTool(
      CREATE_CARDIO_WORKOUT_TOOL_NAME,
      parsedInput.data,
      {
        enabled: true,
        actorUserId: resolved.user.id,
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        businessId: client?.businessId ?? null,
        businessSlug: client?.business?.slug ?? null,
        clientId: resolved.clientId,
        locale,
      },
      buildCreateCardioWorkoutPreview(parsedInput.data, locale)
    )

    return NextResponse.json({
      ...draft,
      callId: parsedRequest.data.callId,
    })
  } catch (error) {
    logger.error('Realtime action draft error', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not prepare the live voice action.', 'Kunde inte förbereda live voice-åtgärden.') },
      { status: 500 }
    )
  }
}
