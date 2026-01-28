/**
 * AI Models API
 *
 * GET /api/ai/models - Get available AI models for the current user
 *
 * For athletes: Returns models allowed by their coach (filtered by coach's API keys)
 * For coaches: Returns all models they have valid API keys for
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
// getDecryptedUserApiKeys no longer needed - using userKeys.xxxKeyValid flags
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import type { AIModel as PrismaAIModel, AIProvider } from '@prisma/client'

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

export async function GET() {
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

    // Check if user is an athlete
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: {
        clientId: true,
        client: {
          select: {
            userId: true, // Coach's user ID
          },
        },
      },
    })

    let coachUserId: string
    let isAthlete = false

    if (athleteAccount) {
      // User is an athlete - get coach's settings
      coachUserId = athleteAccount.client.userId
      isAthlete = true
    } else {
      // User is a coach - use their own settings
      coachUserId = user.id
    }

    // Get coach's API keys and valid providers
    const userKeys = await prisma.userApiKey.findUnique({
      where: { userId: coachUserId },
    })

    if (!userKeys) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No API keys configured',
      })
    }

    // Determine which providers have valid keys
    const validProviders: AIProvider[] = []
    if (userKeys.googleKeyValid) validProviders.push('GOOGLE')
    if (userKeys.anthropicKeyValid) validProviders.push('ANTHROPIC')
    if (userKeys.openaiKeyValid) validProviders.push('OPENAI')

    if (validProviders.length === 0) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No API keys with valid credentials',
      })
    }

    // Get all active models from database for valid providers
    const dbModels = await prisma.aIModel.findMany({
      where: {
        provider: { in: validProviders },
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { displayName: 'asc' },
      ],
    })

    // Transform to expected format
    let availableModels = dbModels.map(transformDbModel)

    if (availableModels.length === 0) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No active models found for configured providers',
      })
    }

    // If athlete, filter by coach's allowed models
    if (isAthlete) {
      if (userKeys.allowedAthleteModelIds?.length) {
        const allowedIds = userKeys.allowedAthleteModelIds
        const filtered = availableModels.filter(model => allowedIds.includes(model.id))
        if (filtered.length > 0) {
          availableModels = filtered
        }
      }

      // Determine default model for athlete
      let defaultModelId = userKeys.athleteDefaultModelId
      if (!defaultModelId || !availableModels.find(m => m.id === defaultModelId)) {
        const defaultModel = availableModels.find(m => m.recommended) || availableModels[0]
        defaultModelId = defaultModel?.id || null
      }

      return NextResponse.json({
        success: true,
        models: availableModels,
        defaultModelId,
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
