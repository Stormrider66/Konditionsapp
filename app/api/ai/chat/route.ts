/**
 * AI Chat Streaming API
 *
 * POST /api/ai/chat — stream AI responses using Vercel AI SDK.
 *
 * Orchestrator only. The heavy lifting — context builders, system prompt,
 * model selection, stream finish handler — lives under lib/ai/chat/ so
 * each concern is independently testable.
 */

import { NextRequest } from 'next/server'
import { streamText, type LanguageModel } from 'ai'
import { requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { type EmbeddingKeys } from '@/lib/ai/embeddings'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getPlatformAiKeyOwnerId, getResolvedAiKeys } from '@/lib/user-api-keys'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { createChatTools } from '@/lib/ai/chat-tools'
import { createCoachChatTools } from '@/lib/ai/coach-chat-tools'
import { type AthleteCapabilities } from '@/lib/ai/athlete-prompts'
import type { ChatRequest } from '@/lib/ai/chat/types'
import { convertToCoreMessages } from '@/lib/ai/chat/message-format'
import {
  resolveAthleteProviderAllowlist,
  type LowerProvider,
} from '@/lib/ai/chat/providers'
import { buildChatContext } from '@/lib/ai/chat/context-builder'
import {
  buildCoachSystemPrompt,
  VISIBLE_ACTION_RESPONSE_POLICY,
} from '@/lib/ai/chat/system-prompt'
import { resolveAiModel, getMaxOutputTokens } from '@/lib/ai/chat/model-selector'
import { buildOnFinishHandler } from '@/lib/ai/chat/on-finish'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import type { KnowledgeSkillAccessMode } from '@/lib/ai/skill-access'

// Allow longer execution time for AI streaming responses (60 seconds)
export const maxDuration = 60

function jsonError(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const {
      conversationId,
      messages,
      model,
      provider,
      athleteId,
      documentIds = [],
      webSearchEnabled = false,
      deepThinkEnabled = false,
      pageContext = '',
      businessSlug,
      isAthleteChat = false,
      memoryContext,
      selectedSkillIds = [],
    } = body

    // ── 1. Auth + business scope + athlete capabilities ─────────────
    let userId: string
    let apiKeyUserId: string
    let athleteClientId: string | undefined
    let athleteCapabilities: AthleteCapabilities | undefined
    let staffPermissions: Awaited<ReturnType<typeof getStaffPermissions>> | undefined
    let athleteAllowedProviders: Set<LowerProvider> | null = null
    let skillAccessMode: KnowledgeSkillAccessMode = 'full'

    let calendarProgramStartDate: Date | undefined
    let calendarProgramEndDate: Date | undefined

    let effectiveBusinessId: string | null = request.headers.get('x-business-id')
    const explicitBusinessSlug = businessSlug || request.headers.get('x-business-slug')
    if (!effectiveBusinessId && explicitBusinessSlug) {
      const scopedBusiness = await prisma.business.findUnique({
        where: { slug: explicitBusinessSlug },
        select: { id: true },
      })
      effectiveBusinessId = scopedBusiness?.id ?? null
    }

    if (isAthleteChat) {
      const resolved = await resolveAthleteClientId()
      if (!resolved) return jsonError(401, { error: 'Unauthorized' })

      userId = resolved.user.id
      athleteClientId = resolved.clientId

      const clientRecord = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { id: true, name: true, userId: true, businessId: true },
      })
      if (!clientRecord?.userId) {
        return jsonError(400, { error: 'Athlete account not properly linked to coach' })
      }

      apiKeyUserId = clientRecord.userId
      effectiveBusinessId = clientRecord.businessId

      // Direct athlete: client.userId is the athlete → fall back to platform admin.
      if (apiKeyUserId === userId && !resolved.isCoachInAthleteMode) {
        const platformKeyOwnerId = await getPlatformAiKeyOwnerId()
        if (platformKeyOwnerId) apiKeyUserId = platformKeyOwnerId
      }

      athleteAllowedProviders = await resolveAthleteProviderAllowlist(
        apiKeyUserId,
        effectiveBusinessId
      )

      // Subscription gate (skipped for coaches in athlete mode).
      if (!resolved.isCoachInAthleteMode) {
        const access = await checkAthleteFeatureAccess(athleteClientId, 'ai_chat')
        if (!access.allowed) {
          return jsonError(403, {
            error: access.reason || 'AI chat requires a subscription',
            code: access.code || 'SUBSCRIPTION_REQUIRED',
            upgradeUrl: access.upgradeUrl || '/athlete/subscription',
            currentUsage: access.currentUsage,
            limit: access.limit,
          })
        }
      }

      // Active program window + capabilities.
      try {
        const [program, subscription] = await Promise.all([
          prisma.trainingProgram.findFirst({
            where: { clientId: athleteClientId, isActive: true },
            orderBy: { createdAt: 'desc' },
            select: { startDate: true, endDate: true },
          }),
          prisma.athleteSubscription.findUnique({
            where: { clientId: athleteClientId },
            select: { tier: true, assignedCoachId: true },
          }),
        ])
        calendarProgramStartDate = program?.startDate
        calendarProgramEndDate = program?.endDate
        const isSelfCoached = !subscription?.assignedCoachId
        const subscriptionTier = (subscription?.tier || 'FREE') as 'FREE' | 'STANDARD' | 'PRO'
        const canGenerateProgram =
          isSelfCoached && (subscriptionTier === 'STANDARD' || subscriptionTier === 'PRO')
        athleteCapabilities = {
          canGenerateProgram,
          hasActiveProgram: !!program,
          subscriptionTier,
          isSelfCoached,
        }
        skillAccessMode = isSelfCoached ? 'athlete_self_coached' : 'athlete_coached'
      } catch (error) {
        logger.warn('Error fetching training program dates for calendar context', {}, error)
        skillAccessMode = 'athlete_self_coached'
      }

      const allowanceDenied = await requireAiAllowance(athleteClientId)
      if (allowanceDenied) return allowanceDenied
    } else {
      const user = await requireCoach()
      userId = user.id
      apiKeyUserId = user.id
      staffPermissions = await getStaffPermissions(user.id)
    }

    // ── 2. Rate limit ───────────────────────────────────────────────
    const rateLimited = await rateLimitJsonResponse('ai:chat', userId, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // ── 3. Resolve API keys (user → business) ───────────────────────
    const decryptedKeys = await getResolvedAiKeys(apiKeyUserId, {
      businessId: effectiveBusinessId,
      disableMembershipFallback: isAthleteChat || !!effectiveBusinessId,
    })
    const effectiveKeys = isAthleteChat && athleteAllowedProviders
      ? {
          anthropicKey: athleteAllowedProviders.has('anthropic') ? decryptedKeys.anthropicKey : null,
          googleKey: athleteAllowedProviders.has('google') ? decryptedKeys.googleKey : null,
          openaiKey: athleteAllowedProviders.has('openai') ? decryptedKeys.openaiKey : null,
        }
      : decryptedKeys

    if (!effectiveKeys.anthropicKey && !effectiveKeys.googleKey && !effectiveKeys.openaiKey) {
      const errorMsg = isAthleteChat
        ? (athleteAllowedProviders
            ? 'Din coach/verksamhet tillåter inte några modeller med tillgängliga API-nycklar just nu.'
            : 'Din coach har inte konfigurerat AI-nycklar ännu')
        : 'API keys not configured'
      return jsonError(400, { error: errorMsg })
    }

    // ── 4. GDPR consent check ───────────────────────────────────────
    let hasAthleteConsent = false
    if (isAthleteChat && athleteClientId) {
      const consentStatus = await getConsentStatus(athleteClientId)
      if (!consentStatus.hasRequiredConsent) {
        return jsonError(403, {
          error: 'Du måste godkänna databehandling innan du kan använda AI-chatten.',
          code: 'CONSENT_REQUIRED',
        })
      }
      hasAthleteConsent = true
    } else if (athleteId) {
      const consentStatus = await getConsentStatus(athleteId)
      hasAthleteConsent = consentStatus.hasRequiredConsent
    }

    // ── 5. Build context (athlete bio + sport + calendar + RAG + web) ──
    const embeddingKeys: EmbeddingKeys = {
      googleKey: decryptedKeys.googleKey,
      openaiKey: decryptedKeys.openaiKey,
    }
    const context = await buildChatContext({
      messages,
      isAthleteChat,
      athleteClientId,
      athleteId,
      hasAthleteConsent,
      documentIds,
      webSearchEnabled,
      pageContext,
      memoryContext,
      athleteCapabilities,
      staffPermissions,
      apiKeyUserId,
      embeddingKeys,
      userId,
      calendarProgramStartDate,
      calendarProgramEndDate,
      selectedSkillIds,
      skillAccessMode,
    })

    // ── 6. System prompt ────────────────────────────────────────────
    const systemPrompt = isAthleteChat && context.athleteSystemPrompt
      ? `${context.athleteSystemPrompt}\n${VISIBLE_ACTION_RESPONSE_POLICY}\n${pageContext}\n`
      : buildCoachSystemPrompt({
          pageContext,
          athleteContext: context.athleteContext,
          sportSpecificContext: context.sportSpecificContext,
          calendarContext: context.calendarContext,
          skillContext: context.skillContext,
          documentContext: context.documentContext,
          webSearchContext: context.webSearchContext,
          webSearchEnabled,
          staffPermissions,
          athleteIdRequested: !!athleteId,
          hasAthleteConsent,
        })

    // ── 7. Resolve AI model ─────────────────────────────────────────
    const modelResult = resolveAiModel({
      provider,
      model,
      effectiveKeys,
      intent: body.intent,
      isAthleteChat,
      deepThinkEnabled,
    })
    if (!modelResult.ok) return jsonError(400, { error: modelResult.errorMessage })

    const coreMessages = convertToCoreMessages(messages)
    const maxOutputTokens = getMaxOutputTokens(provider, model)

    logger.debug('AI chat request', {
      provider,
      model,
      isAthleteChat,
      athleteClientId: isAthleteChat ? athleteClientId : undefined,
      deepThinkEnabled: provider === 'GOOGLE' && deepThinkEnabled,
      hasApiKey: Boolean(
        effectiveKeys.anthropicKey || effectiveKeys.googleKey || effectiveKeys.openaiKey
      ),
      messageCount: messages.length,
      documentCount: documentIds.length,
      webSearchEnabled,
      hasConversationId: Boolean(conversationId),
    })

    // ── 8. Stream ───────────────────────────────────────────────────
    const result = streamText({
      model: modelResult.aiModel as LanguageModel,
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens,
      experimental_telemetry: { isEnabled: false },
      ...(isAthleteChat && athleteClientId && {
        tools: createChatTools(
          athleteClientId,
          conversationId,
          athleteCapabilities
            ? { canGenerateProgram: athleteCapabilities.canGenerateProgram }
            : undefined
        ),
        maxSteps: 4,
      }),
      ...(!isAthleteChat && {
        tools: createCoachChatTools(userId, explicitBusinessSlug || undefined),
        maxSteps: 4,
      }),
      ...(provider === 'GOOGLE' && deepThinkEnabled && {
        providerOptions: {
          google: { thinkingConfig: { thinkingLevel: 'high' as const } },
        },
      }),
      onError: (error) => {
        logger.error('Stream error during generation', {}, error)
      },
      onFinish: buildOnFinishHandler({
        conversationId,
        messages,
        model,
        provider,
        maxOutputTokens,
        isAthleteChat,
        athleteClientId,
        apiKeyUserId,
        effectiveBusinessId,
        usageLoggedByMiddleware: modelResult.usageLoggedByMiddleware,
      }),
    })

    // ── 9. Response ─────────────────────────────────────────────────
    try {
      const response = result.toUIMessageStreamResponse()
      if (context.skillsUsed.length > 0) {
        response.headers.set('X-Knowledge-Skills', JSON.stringify(context.skillsUsed))
      }
      logger.debug('Stream response created successfully')
      return response
    } catch (streamError) {
      logger.error('Error creating stream response', {}, streamError)
      throw streamError
    }
  } catch (error) {
    logger.error('Chat streaming error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return jsonError(401, { error: 'Unauthorized' })
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let userMessage = 'Failed to stream response'
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('api_key')
    ) {
      userMessage = 'API key is invalid or expired. Please check your API key in settings.'
    } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.'
    } else if (errorMessage.includes('model')) {
      userMessage = `Model error: ${errorMessage}`
    }

    return jsonError(500, { error: userMessage, message: errorMessage })
  }
}
