/**
 * Athlete AI Configuration
 *
 * GET /api/athlete/ai-config - Get AI config for athlete use
 *
 * Athletes use their coach's API keys but can select their own preferred model.
 * Models are filtered by: admin availability → coach restrictions → athlete preference.
 *
 * Returns list of available models so the athlete can pick in the floating chat.
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger-console'
import { isModelIntent, legacyModelIdToIntent, INTENT_TIER_LABELS } from '@/types/ai-models'
import type { ModelIntent } from '@/types/ai-models'
import { getPlatformAiKeyOwnerId, getResolvedAiKeys } from '@/lib/user-api-keys'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, clientId, isCoachInAthleteMode } = resolved

    // Get the client with sport profile and coach link
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true, // This is the coach's user ID (null for self-athletes)
        businessId: true,
        sportProfile: {
          select: {
            preferredAIModelId: true,
          },
        },
      },
    })

    // Determine the coach whose API keys to use
    // For coach-in-athlete-mode: the coach IS the user
    // For regular athletes: the coach is client.userId
    let effectiveCoachId = isCoachInAthleteMode ? user.id : client?.userId
    const effectiveBusinessId = client?.businessId ?? null

    // Direct athlete: client.userId is the athlete themselves → fall back to platform admin
    if (effectiveCoachId && effectiveCoachId === user.id && !isCoachInAthleteMode) {
      const platformKeyOwnerId = await getPlatformAiKeyOwnerId()
      if (platformKeyOwnerId) {
        effectiveCoachId = platformKeyOwnerId
      }
    }

    if (!effectiveCoachId) {
      return NextResponse.json(
        { error: 'Athlete account not properly linked to coach' },
        { status: 400 }
      )
    }

    const athletePreferredModelId = client?.sportProfile?.preferredAIModelId

    // Fetch coach-level AI settings (if present)
    const coachApiSettings = await prisma.userApiKey.findUnique({
      where: { userId: effectiveCoachId },
      select: {
        anthropicKeyValid: true,
        googleKeyValid: true,
        openaiKeyValid: true,
        allowedAthleteModelIds: true,
        athleteDefaultModelId: true,
      },
    })

    // Fetch business-level AI settings (used when coach relies on business keys)
    const businessSettings = effectiveBusinessId
      ? await prisma.business.findUnique({
          where: { id: effectiveBusinessId },
          select: {
            aiKeys: {
              select: {
                anthropicKeyValid: true,
                googleKeyValid: true,
                openaiKeyValid: true,
                allowedAthleteModelIds: true,
                athleteDefaultModelId: true,
              },
            },
          },
        })
      : null

    // Resolve effective keys exactly like AI runtime routes (user -> business -> admin)
    const resolvedKeys = await getResolvedAiKeys(effectiveCoachId, {
      businessId: effectiveBusinessId,
      disableMembershipFallback: true,
    })
    const hasAIAccess = !!(resolvedKeys.anthropicKey || resolvedKeys.googleKey || resolvedKeys.openaiKey)

    if (!hasAIAccess) {
      return NextResponse.json({
        success: true,
        hasAIAccess: false,
        intent: null,
        clientId,
        availableIntents: [],
        configuredProviders: {
          hasAnthropic: false,
          hasGoogle: false,
          hasOpenai: false,
        },
      })
    }

    // Build configured providers flags
    const configuredProviders = {
      hasAnthropic: !!resolvedKeys.anthropicKey,
      hasGoogle: !!resolvedKeys.googleKey,
      hasOpenai: !!resolvedKeys.openaiKey,
    }

    // Determine allowed intents from coach + business settings
    const rawAllowed = coachApiSettings?.allowedAthleteModelIds || []
    const businessRawAllowed = businessSettings?.aiKeys?.allowedAthleteModelIds || []
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

    let availableIntents: ModelIntent[] = ['fast', 'balanced', 'powerful']

    if (rawAllowed.length > 0) {
      const tiers = rawAllowed
        .map(toIntent)
        .filter((v): v is ModelIntent => v !== null)
        .filter((v, i, a) => a.indexOf(v) === i) as ModelIntent[]
      if (tiers.length > 0) {
        availableIntents = tiers
      }
    }

    if (businessRawAllowed.length > 0) {
      const businessTiers = businessRawAllowed
        .map(toIntent)
        .filter((v): v is ModelIntent => v !== null)
        .filter((v, i, a) => a.indexOf(v) === i) as ModelIntent[]
      if (businessTiers.length > 0) {
        availableIntents = availableIntents.filter(intent => businessTiers.includes(intent))
        if (availableIntents.length === 0) {
          availableIntents = businessTiers
        }
      }
    }

    // Determine selected intent via priority chain
    let selectedIntent: ModelIntent = 'balanced'

    // Priority 1: Athlete's preference
    if (athletePreferredModelId) {
      selectedIntent = isModelIntent(athletePreferredModelId)
        ? athletePreferredModelId
        : legacyModelIdToIntent(athletePreferredModelId)
    }
    // Priority 2: Coach's athlete default
    else if (coachApiSettings?.athleteDefaultModelId) {
      const mapped = toIntent(coachApiSettings.athleteDefaultModelId)
      if (mapped) selectedIntent = mapped
    }
    // Priority 3: Business athlete default
    else if (businessSettings?.aiKeys?.athleteDefaultModelId) {
      const mapped = toIntent(businessSettings.aiKeys.athleteDefaultModelId)
      if (mapped) selectedIntent = mapped
    }

    // Ensure selected intent is in available set
    if (!availableIntents.includes(selectedIntent)) {
      selectedIntent = availableIntents.includes('balanced') ? 'balanced' : availableIntents[0]
    }

    return NextResponse.json({
      success: true,
      hasAIAccess: true,
      intent: selectedIntent,
      clientId,
      availableIntents: availableIntents.map(intent => ({
        intent,
        ...INTENT_TIER_LABELS[intent],
      })),
      configuredProviders,
    })
  } catch (error) {
    logError('Get athlete AI config error:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get AI configuration' },
      { status: 500 }
    )
  }
}
