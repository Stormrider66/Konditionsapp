/**
 * AI Model Preference API
 *
 * POST /api/ai/models/preference - Save athlete's preferred AI model
 * GET /api/ai/models/preference - Get athlete's preferred AI model
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { isModelIntent, legacyModelIdToIntent } from '@/types/ai-models'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { user, clientId, isCoachInAthleteMode } = resolved
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:model-preference:set', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { intent, modelId } = body

    // Intent-based flow: store intent string directly
    if (intent && isModelIntent(intent)) {
      await prisma.sportProfile.upsert({
        where: { clientId },
        update: { preferredAIModelId: intent },
        create: {
          clientId,
          preferredAIModelId: intent,
        },
      })

      return NextResponse.json({ success: true, intent })
    }

    // Legacy flow: validate model exists in DB
    if (!modelId) {
      return NextResponse.json(
        { error: t(locale, 'Missing intent or modelId', 'Intent eller modelId saknas') },
        { status: 400 }
      )
    }

    const dbModel = await prisma.aIModel.findFirst({
      where: {
        OR: [{ id: modelId }, { modelId }],
        isActive: true,
        availableForAthletes: true,
      },
    })

    if (!dbModel) {
      return NextResponse.json(
        { error: t(locale, 'Model not available for athletes', 'Modellen är inte tillgänglig för atleter') },
        { status: 403 }
      )
    }

    // Get the coach ID for API key validation
    const clientContext = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, businessId: true },
    })

    const coachId = isCoachInAthleteMode
      ? user.id
      : clientContext?.userId
    const businessId = clientContext?.businessId ?? null

    if (!coachId) {
      return NextResponse.json(
        { error: t(locale, 'Coach not found', 'Coachen hittades inte') },
        { status: 404 }
      )
    }

    // Validate model is allowed by coach
    const coachSettings = await prisma.userApiKey.findUnique({
      where: { userId: coachId },
      select: {
        allowedAthleteModelIds: true,
      },
    })

    const businessSettings = businessId
      ? await prisma.business.findUnique({
          where: { id: businessId },
          select: {
            aiKeys: {
              select: {
                allowedAthleteModelIds: true,
              },
            },
          },
        })
      : null

    const resolvedKeys = await getResolvedAiKeys(coachId, {
      businessId,
      disableMembershipFallback: true,
    })

    const providerKeyValid =
      (dbModel.provider === 'ANTHROPIC' && resolvedKeys.anthropicKey) ||
      (dbModel.provider === 'GOOGLE' && resolvedKeys.googleKey) ||
      (dbModel.provider === 'OPENAI' && resolvedKeys.openaiKey)

    if (!providerKeyValid) {
      return NextResponse.json(
        { error: t(locale, 'Model provider not available', 'Modellens leverantör är inte tillgänglig') },
        { status: 403 }
      )
    }

    // If coach has restricted models, verify this one is allowed
    if (
      coachSettings?.allowedAthleteModelIds?.length &&
      !coachSettings.allowedAthleteModelIds.includes(dbModel.id) &&
      !coachSettings.allowedAthleteModelIds.includes(dbModel.modelId)
    ) {
      return NextResponse.json(
        { error: t(locale, 'Model not allowed by coach', 'Modellen är inte tillåten av coachen') },
        { status: 403 }
      )
    }

    if (
      businessSettings?.aiKeys?.allowedAthleteModelIds?.length &&
      !businessSettings.aiKeys.allowedAthleteModelIds.includes(dbModel.id) &&
      !businessSettings.aiKeys.allowedAthleteModelIds.includes(dbModel.modelId)
    ) {
      return NextResponse.json(
        { error: t(locale, 'Model not allowed by business settings', 'Modellen är inte tillåten av verksamhetens inställningar') },
        { status: 403 }
      )
    }

    // Update sport profile with preference (store the DB model ID)
    await prisma.sportProfile.upsert({
      where: { clientId },
      update: { preferredAIModelId: dbModel.id },
      create: {
        clientId,
        preferredAIModelId: dbModel.id,
      },
    })

    return NextResponse.json({ success: true, modelId: dbModel.id })
  } catch (error) {
    logger.error('POST /api/ai/models/preference error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to save preference', 'Kunde inte spara inställningen') },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { user, clientId } = resolved
    locale = resolveRequestLocale(request, user.language)

    const rateLimited = await rateLimitJsonResponse('ai:model-preference:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get sport profile
    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
      select: { preferredAIModelId: true },
    })

    const stored = sportProfile?.preferredAIModelId || null

    // If stored value is a valid intent, return it directly
    if (stored && isModelIntent(stored)) {
      return NextResponse.json({
        success: true,
        intent: stored,
        modelId: null,
      })
    }

    // Legacy model ID — map to intent
    if (stored) {
      return NextResponse.json({
        success: true,
        intent: legacyModelIdToIntent(stored),
        modelId: stored,
      })
    }

    return NextResponse.json({
      success: true,
      intent: null,
      modelId: null,
    })
  } catch (error) {
    logger.error('GET /api/ai/models/preference error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get preference', 'Kunde inte hämta inställningen') },
      { status: 500 }
    )
  }
}
