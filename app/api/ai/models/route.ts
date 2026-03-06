/**
 * AI Models API
 *
 * GET /api/ai/models - Get available AI models for the current user
 *
 * For athletes: Returns models allowed by their coach (filtered by coach's API keys)
 * For coaches: Returns all models they have valid API keys for
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type { AIModel as PrismaAIModel, AIProvider } from '@prisma/client'
import { INTENT_TIER_LABELS, isModelIntent, legacyModelIdToIntent } from '@/types/ai-models'
import type { ModelIntent } from '@/types/ai-models'
import { getResolvedAiKeys } from '@/lib/user-api-keys'

// Transform database model to match the expected interface
function transformDbModel(dbModel: PrismaAIModel) {
  return {
    id: dbModel.id,
    provider: dbModel.provider,
    modelId: dbModel.modelId,
    displayName: dbModel.displayName,
    name: dbModel.displayName,
    description: dbModel.description,
    capabilities: {
      reasoning: 'excellent' as const,
      speed: 'medium' as const,
      contextWindow: dbModel.maxTokens || 128000,
      maxOutputTokens: dbModel.maxOutputTokens || 8192,
    },
    pricing: {
      // Convert from per 1K tokens to per 1M tokens
      input: (dbModel.inputCostPer1k || 0) * 1000,
      output: (dbModel.outputCostPer1k || 0) * 1000,
    },
    recommended: dbModel.isDefault,
    bestForLongOutput: (dbModel.maxOutputTokens || 0) >= 32000,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:models:list', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Check if user is an athlete (or coach in athlete mode)
    const explicitBusinessSlug = request.headers.get('x-business-slug')

    // When x-business-slug is present the request comes from a coach page
    // (e.g. ModelSelector in AI Studio). Skip athlete-mode resolution so
    // coaches always get the full model list, not the intent-tier response.
    const resolved = explicitBusinessSlug ? null : await resolveAthleteClientId()

    let coachUserId: string
    let effectiveBusinessId: string | null = request.headers.get('x-business-id')
    let isAthlete = false

    if (!effectiveBusinessId && explicitBusinessSlug) {
      const scopedBusiness = await prisma.business.findUnique({
        where: { slug: explicitBusinessSlug },
        select: { id: true },
      })
      effectiveBusinessId = scopedBusiness?.id ?? null
    }

    if (resolved) {
      // User is an athlete or coach in athlete mode - get coach's settings via client
      const client = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { userId: true, businessId: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      coachUserId = client.userId
      effectiveBusinessId = client.businessId
      isAthlete = true
    } else {
      // User is a coach - use their own settings
      coachUserId = user.id
    }

    // Get coach's explicit settings (used for restrictions/defaults)
    const userKeys = await prisma.userApiKey.findUnique({
      where: { userId: coachUserId },
    })

    // Business-level settings (also used for restrictions/defaults)
    const business = effectiveBusinessId
      ? await prisma.business.findUnique({
          where: { id: effectiveBusinessId },
          select: {
            aiKeys: true,
          },
        })
      : null
    const bk = business?.aiKeys

    // Determine providers from resolved key source (user -> business -> admin)
    const resolvedKeys = await getResolvedAiKeys(coachUserId, {
      businessId: effectiveBusinessId,
      disableMembershipFallback: true,
    })
    const validProviders: AIProvider[] = []
    if (resolvedKeys.googleKey) validProviders.push('GOOGLE')
    if (resolvedKeys.anthropicKey) validProviders.push('ANTHROPIC')
    if (resolvedKeys.openaiKey) validProviders.push('OPENAI')

    const businessAllowedModelIds: string[] = bk?.allowedModelIds || []
    const businessAllowedAthleteModelIds: string[] = bk?.allowedAthleteModelIds || []
    const businessAthleteDefaultModelId: string | null = bk?.athleteDefaultModelId || null

    if (validProviders.length === 0) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No API keys configured',
      })
    }

    // Get all active models from database for valid providers
    const dbModels = await prisma.aIModel.findMany({
      where: {
        provider: { in: validProviders },
        isActive: true,
        ...(isAthlete ? { availableForAthletes: true } : {}),
      },
      orderBy: [
        { isDefault: 'desc' },
        { displayName: 'asc' },
      ],
    })

    // Transform to expected format
    let availableModels = dbModels.map(transformDbModel)

    // Apply business-level model restrictions
    if (businessAllowedModelIds.length > 0) {
      const filtered = availableModels.filter(model => businessAllowedModelIds.includes(model.id))
      if (filtered.length > 0) {
        availableModels = filtered
      }
    }

    if (availableModels.length === 0) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No active models found for configured providers',
      })
    }

    // If athlete, return intent-based tiers instead of raw model list
    if (isAthlete) {
      // Determine allowed tiers from coach settings
      // allowedAthleteModelIds may contain tier strings ('fast','balanced','powerful') or legacy model IDs
      const rawAllowed = userKeys?.allowedAthleteModelIds || []
      const businessRawAllowed = businessAllowedAthleteModelIds || []
      const allRawModelRefs = [...new Set([...rawAllowed, ...businessRawAllowed])]
        .filter(v => !isModelIntent(v))

      const modelIntentMap = new Map<string, ModelIntent>()
      if (allRawModelRefs.length > 0) {
        const models = await prisma.aIModel.findMany({
          where: {
            OR: [
              { id: { in: allRawModelRefs } },
              { modelId: { in: allRawModelRefs } },
            ],
          },
          select: {
            id: true,
            modelId: true,
          },
        })
        for (const model of models) {
          const intent = legacyModelIdToIntent(model.modelId)
          modelIntentMap.set(model.id, intent)
          modelIntentMap.set(model.modelId, intent)
        }
      }

      const toIntent = (value: string): ModelIntent | null => {
        if (isModelIntent(value)) return value
        const mapped = modelIntentMap.get(value)
        if (mapped) return mapped
        // Backward compatibility for legacy model-id strings
        if (value.includes('gemini') || value.includes('claude') || value.includes('gpt-')) {
          return legacyModelIdToIntent(value)
        }
        return null
      }

      let allowedTiers: ModelIntent[] = ['fast', 'balanced', 'powerful']

      // Coach-level tier restrictions
      if (rawAllowed.length > 0) {
        const tiers = rawAllowed
          .map(toIntent)
          .filter((v): v is ModelIntent => v !== null)
          .filter((v, i, a) => a.indexOf(v) === i) as ModelIntent[]
        if (tiers.length > 0) {
          allowedTiers = tiers
        }
      }

      // Business-level tier restrictions (intersect)
      if (businessRawAllowed.length > 0) {
        const bizTiers = businessRawAllowed
          .map(toIntent)
          .filter((v): v is ModelIntent => v !== null)
          .filter((v, i, a) => a.indexOf(v) === i) as ModelIntent[]
        if (bizTiers.length > 0) {
          allowedTiers = allowedTiers.filter(t => bizTiers.includes(t))
          if (allowedTiers.length === 0) allowedTiers = bizTiers // fallback
        }
      }

      // Determine default intent
      const rawDefault = userKeys?.athleteDefaultModelId || businessAthleteDefaultModelId
      let defaultIntent: ModelIntent = 'balanced'
      if (rawDefault) {
        const mapped = toIntent(rawDefault)
        if (mapped) defaultIntent = mapped
      }
      if (!allowedTiers.includes(defaultIntent)) {
        defaultIntent = allowedTiers.includes('balanced') ? 'balanced' : allowedTiers[0]
      }

      // Build tier objects for the client
      const tiers = allowedTiers.map(intent => ({
        intent,
        ...INTENT_TIER_LABELS[intent],
      }))

      return NextResponse.json({
        success: true,
        mode: 'intent' as const,
        tiers,
        defaultIntent,
      })
    }

    // Coach - return all available models
    const defaultModel = availableModels.find(m => m.recommended) || availableModels[0]

    return NextResponse.json({
      success: true,
      models: availableModels,
      defaultModelId: defaultModel?.id || null,
    })
  } catch (error) {
    logger.error('GET /api/ai/models error', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    )
  }
}
