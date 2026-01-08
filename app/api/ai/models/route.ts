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
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  getAvailableModels,
  getDefaultModel,
} from '@/types/ai-models'

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

    // Get coach's API keys
    let apiKeys: {
      anthropicKey: string | null
      googleKey: string | null
      openaiKey: string | null
    }

    try {
      apiKeys = await getDecryptedUserApiKeys(coachUserId)
    } catch {
      // No API keys configured
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No API keys configured',
      })
    }

    // Get all models available based on API keys
    const availableModels = getAvailableModels(apiKeys)

    if (availableModels.length === 0) {
      return NextResponse.json({
        success: true,
        models: [],
        defaultModelId: null,
        message: 'No API keys with valid credentials',
      })
    }

    // If athlete, filter by coach's allowed models
    let filteredModels = availableModels

    if (isAthlete) {
      // Get coach's athlete settings
      const coachSettings = await prisma.userApiKey.findUnique({
        where: { userId: coachUserId },
        select: {
          allowedAthleteModelIds: true,
          athleteDefaultModelId: true,
        },
      })

      if (coachSettings?.allowedAthleteModelIds?.length) {
        // Filter to only allowed models
        filteredModels = availableModels.filter(model =>
          coachSettings.allowedAthleteModelIds.includes(model.id)
        )
      }

      // If no models allowed after filter, use all available
      if (filteredModels.length === 0) {
        filteredModels = availableModels
      }

      // Determine default model for athlete
      let defaultModelId = coachSettings?.athleteDefaultModelId
      if (!defaultModelId || !filteredModels.find(m => m.id === defaultModelId)) {
        // Use first recommended or first available
        const defaultModel = filteredModels.find(m => m.recommended) || filteredModels[0]
        defaultModelId = defaultModel?.id || null
      }

      return NextResponse.json({
        success: true,
        models: filteredModels,
        defaultModelId,
      })
    }

    // Coach - return all available models
    const defaultModel = getDefaultModel(apiKeys)

    return NextResponse.json({
      success: true,
      models: filteredModels,
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
