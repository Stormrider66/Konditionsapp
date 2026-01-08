/**
 * Athlete AI Configuration
 *
 * GET /api/athlete/ai-config - Get AI config for athlete use
 *
 * Athletes use their coach's API keys but can select their own preferred model.
 * Priority: Athlete preference > Coach default > First available provider
 */

import { NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getModelById, getDefaultModel, AI_MODELS } from '@/types/ai-models'
import { logError } from '@/lib/logger-console'

export async function GET() {
  try {
    const user = await requireAthlete()

    // Get athlete's account with sport profile and linked client -> coach
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      include: {
        client: {
          select: {
            id: true,
            userId: true, // This is the coach's user ID
            sportProfile: {
              select: {
                preferredAIModelId: true,
              },
            },
          },
        },
      },
    })

    if (!athleteAccount?.client?.userId) {
      return NextResponse.json(
        { error: 'Athlete account not properly linked to coach' },
        { status: 400 }
      )
    }

    const coachId = athleteAccount.client.userId
    const athletePreferredModelId = athleteAccount.client.sportProfile?.preferredAIModelId

    // Fetch coach's API keys
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: coachId },
      select: {
        anthropicKeyValid: true,
        googleKeyValid: true,
        openaiKeyValid: true,
      },
    })

    // Check if coach has any valid AI keys
    const hasAIAccess =
      apiKeys?.anthropicKeyValid ||
      apiKeys?.googleKeyValid ||
      apiKeys?.openaiKeyValid ||
      false

    // Build keys object for model selection
    const keys = {
      anthropicKey: apiKeys?.anthropicKeyValid ? 'valid' : null,
      googleKey: apiKeys?.googleKeyValid ? 'valid' : null,
      openaiKey: apiKeys?.openaiKeyValid ? 'valid' : null,
    }

    // Determine which model to use
    let provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI' = 'GOOGLE'
    let model = 'gemini-3-flash-preview'
    let displayName = 'Gemini 3 Flash'

    // Priority 1: Athlete's preferred model (if valid and available)
    if (athletePreferredModelId) {
      const preferredModel = getModelById(athletePreferredModelId)
      if (preferredModel) {
        // Check if the provider key is valid
        const providerKeyValid =
          (preferredModel.provider === 'anthropic' && apiKeys?.anthropicKeyValid) ||
          (preferredModel.provider === 'google' && apiKeys?.googleKeyValid) ||
          (preferredModel.provider === 'openai' && apiKeys?.openaiKeyValid)

        if (providerKeyValid) {
          provider = preferredModel.provider.toUpperCase() as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
          model = preferredModel.modelId
          displayName = preferredModel.name
        }
      }
    }

    // Priority 2: Default model from AI_MODELS (if no preference or preference invalid)
    if (!athletePreferredModelId || model === 'gemini-3-flash-preview') {
      const defaultModel = getDefaultModel(keys)
      if (defaultModel) {
        provider = defaultModel.provider.toUpperCase() as 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
        model = defaultModel.modelId
        displayName = defaultModel.name
      }
    }

    return NextResponse.json({
      success: true,
      hasAIAccess,
      model,
      provider,
      displayName,
      clientId: athleteAccount.client.id,
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
