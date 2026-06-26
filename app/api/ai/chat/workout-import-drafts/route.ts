import { NextRequest, NextResponse } from 'next/server'
import { AIProvider } from '@prisma/client'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { getPlatformAiKeyOwnerId, getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveAthleteProviderAllowlist } from '@/lib/ai/chat/providers'
import { isAiAssistantOperationsEnabled } from '@/lib/ai/capabilities/feature-gate'
import { createAiActionDraftForTool } from '@/lib/ai/capabilities/action-drafts'
import {
  EmptyPdfError,
  MAX_FILE_BYTES,
  formatEmptyPdfError,
  normalizeFile,
  type NormalizedInput,
} from '@/lib/ai/file-normalize'
import {
  normalizePastedWorkoutText,
  parseImportedWorkoutSource,
} from '@/lib/ai/athlete-workout-import'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getFormString(form: FormData, key: string): string | null {
  const value = form.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function providerFromModelName(modelUsed: string): AIProvider {
  const lower = modelUsed.toLowerCase()
  if (lower.includes('gemini')) return AIProvider.GOOGLE
  if (lower.includes('gpt')) return AIProvider.OPENAI
  return AIProvider.ANTHROPIC
}

async function ensureImportConversation(params: {
  conversationId: string | null
  clientId: string
  coachId: string
  modelUsed: string
  title: string
}): Promise<string> {
  if (params.conversationId) {
    const existing = await prisma.aIConversation.findFirst({
      where: {
        id: params.conversationId,
        athleteId: params.clientId,
        createdByRole: 'ATHLETE',
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    if (!existing) {
      throw new Error('CONVERSATION_NOT_FOUND')
    }
    return existing.id
  }

  const conversation = await prisma.aIConversation.create({
    data: {
      coachId: params.coachId,
      athleteId: params.clientId,
      createdByRole: 'ATHLETE',
      modelUsed: params.modelUsed,
      provider: providerFromModelName(params.modelUsed),
      title: params.title,
      status: 'ACTIVE',
    },
    select: { id: true },
  })
  return conversation.id
}

async function appendImportMessages(params: {
  conversationId: string
  sourceLabel: string
  workoutName: string
  workoutType: string
  locale: AppLocale
}): Promise<void> {
  const userContent = t(
    params.locale,
    `Imported workout source: ${params.sourceLabel}`,
    `Importerad träningskälla: ${params.sourceLabel}`
  )
  const assistantContent = t(
    params.locale,
    `I found a ${params.workoutType.toLowerCase()} workout: ${params.workoutName}. Review the card before creating it.`,
    `Jag hittade ett ${params.workoutType.toLowerCase()}-pass: ${params.workoutName}. Granska kortet innan du skapar det.`
  )

  await prisma.$transaction([
    prisma.aIMessage.create({
      data: {
        conversationId: params.conversationId,
        role: 'user',
        content: userContent,
      },
    }),
    prisma.aIMessage.create({
      data: {
        conversationId: params.conversationId,
        role: 'assistant',
        content: assistantContent,
      },
    }),
    prisma.aIConversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    }),
  ])
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    if (!resolved.isCoachInAthleteMode) {
      const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat', locale)
      if (!access.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: access.reason || t(locale, 'AI chat requires a subscription', 'AI-chat kräver en prenumeration'),
            code: access.code || 'SUBSCRIPTION_REQUIRED',
            upgradeUrl: access.upgradeUrl || '/athlete/subscription',
            currentUsage: access.currentUsage,
            limit: access.limit,
          },
          { status: 403 }
        )
      }
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-workout-import-drafts', resolved.user.id, {
      limit: 8,
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
            'You must approve data processing before importing workouts with AI chat.',
            'Du måste godkänna databehandling innan du importerar pass med AI-chatten.'
          ),
          code: 'CONSENT_REQUIRED',
        },
        { status: 403 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: resolved.clientId },
      select: {
        id: true,
        name: true,
        userId: true,
        businessId: true,
        business: {
          select: { slug: true },
        },
      },
    })

    if (!client?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Athlete account is not properly linked.',
            'Atletkontot är inte korrekt kopplat.'
          ),
        },
        { status: 400 }
      )
    }

    const operationsEnabled = await isAiAssistantOperationsEnabled(client.businessId)
    if (!operationsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'AI action confirmations are not enabled for this organization.',
            'AI-bekräftelser är inte aktiverade för den här verksamheten.'
          ),
        },
        { status: 403 }
      )
    }

    const form = await request.formData()
    const sourceText = getFormString(form, 'text')
    const note = getFormString(form, 'note')
    const assignedDate = getFormString(form, 'assignedDate')
    const conversationId = getFormString(form, 'conversationId')
    const maybeFile = form.get('file')
    const file = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null

    if (file && sourceText) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Import one source at a time: either a file or pasted text.', 'Importera en källa åt gången: antingen fil eller inklistrad text.'),
        },
        { status: 400 }
      )
    }

    if (file && file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            `File too large. Max ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
            `Filen är för stor. Max ${MAX_FILE_BYTES / (1024 * 1024)} MB.`
          ),
        },
        { status: 413 }
      )
    }

    let normalized: NormalizedInput | null = null
    try {
      normalized = file
        ? await normalizeFile(file)
        : sourceText
          ? normalizePastedWorkoutText(sourceText)
          : null
    } catch (error) {
      logger.warn('Failed to normalize athlete workout import source', { clientId: client.id }, error)
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof EmptyPdfError
              ? formatEmptyPdfError(error.filename, locale)
              : error instanceof Error
                ? error.message
                : t(locale, 'Could not read the workout source.', 'Kunde inte läsa träningskällan.'),
        },
        { status: 400 }
      )
    }

    if (!normalized || (normalized.kind !== 'image' && normalized.body.trim().length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Paste workout text or upload a workout file first.', 'Klistra in passtext eller ladda upp en träningsfil först.'),
        },
        { status: 400 }
      )
    }

    let apiKeyUserId = client.userId
    if (apiKeyUserId === resolved.user.id && !resolved.isCoachInAthleteMode) {
      const platformKeyOwnerId = await getPlatformAiKeyOwnerId()
      if (platformKeyOwnerId) apiKeyUserId = platformKeyOwnerId
    }

    const allowedProviders = await resolveAthleteProviderAllowlist(apiKeyUserId, client.businessId)
    const decryptedKeys = await getResolvedAiKeys(apiKeyUserId, {
      businessId: client.businessId,
      disableMembershipFallback: true,
    })
    const effectiveKeys = allowedProviders
      ? {
          anthropicKey: allowedProviders.has('anthropic') ? decryptedKeys.anthropicKey : null,
          googleKey: allowedProviders.has('google') ? decryptedKeys.googleKey : null,
          openaiKey: allowedProviders.has('openai') ? decryptedKeys.openaiKey : null,
        }
      : decryptedKeys

    if (!effectiveKeys.anthropicKey && !effectiveKeys.googleKey && !effectiveKeys.openaiKey) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'No allowed AI model is available for workout import right now.',
            'Ingen tillåten AI-modell är tillgänglig för träningsimport just nu.'
          ),
        },
        { status: 400 }
      )
    }

    const parsed = await parseImportedWorkoutSource({
      normalized,
      note,
      assignedDate,
      locale,
      userId: resolved.user.id,
      clientId: client.id,
      ownerUserId: client.userId,
      keys: effectiveKeys,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error,
          needsClarification: parsed.needsClarification,
        },
        { status: parsed.status }
      )
    }

    const ensuredConversationId = await ensureImportConversation({
      conversationId,
      clientId: client.id,
      coachId: client.userId,
      modelUsed: parsed.modelUsed,
      title: parsed.preview.name,
    })

    const draft = await createAiActionDraftForTool(
      'createImportedWorkout',
      parsed.draftInput,
      {
        enabled: true,
        actorUserId: resolved.user.id,
        actorRole: 'ATHLETE',
        surface: 'athlete_chat',
        businessId: client.businessId,
        businessSlug: client.business?.slug ?? null,
        clientId: client.id,
        conversationId: ensuredConversationId,
        locale,
      },
      parsed.actionPreview
    )

    if (!draft.success) {
      return NextResponse.json(draft, { status: 400 })
    }

    await appendImportMessages({
      conversationId: ensuredConversationId,
      sourceLabel: normalized.filename || normalized.kind,
      workoutName: parsed.preview.name,
      workoutType: parsed.preview.workoutType,
      locale,
    })

    return NextResponse.json({
      ...draft,
      conversationId: ensuredConversationId,
      parsedPreview: parsed.preview,
      warnings: parsed.warnings,
      modelUsed: parsed.modelUsed,
      inputKind: parsed.inputKind,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'CONVERSATION_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: t(locale, 'Conversation not found.', 'Konversationen hittades inte.') },
        { status: 404 }
      )
    }

    logger.error('Athlete workout import draft error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Could not prepare the workout import.', 'Kunde inte förbereda träningsimporten.'),
      },
      { status: 500 }
    )
  }
}
