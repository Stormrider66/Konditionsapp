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
import type { AIProvider } from '@prisma/client'

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
    const coachId = isCoachInAthleteMode ? user.id : client?.userId

    if (!coachId) {
      return NextResponse.json(
        { error: 'Athlete account not properly linked to coach' },
        { status: 400 }
      )
    }

    const athletePreferredModelId = client?.sportProfile?.preferredAIModelId

    // Fetch coach's API keys and athlete model settings
    const apiKeys = await prisma.userApiKey.findUnique({
      where: { userId: coachId },
      select: {
        anthropicKeyValid: true,
        googleKeyValid: true,
        openaiKeyValid: true,
        allowedAthleteModelIds: true,
        athleteDefaultModelId: true,
      },
    })

    // Check if coach has any valid AI keys
    const hasAIAccess =
      apiKeys?.anthropicKeyValid ||
      apiKeys?.googleKeyValid ||
      apiKeys?.openaiKeyValid ||
      false

    if (!hasAIAccess) {
      return NextResponse.json({
        success: true,
        hasAIAccess: false,
        model: null,
        provider: null,
        displayName: null,
        clientId,
        availableModels: [],
      })
    }

    // Build list of valid providers from coach's keys
    const validProviders: AIProvider[] = []
    if (apiKeys?.anthropicKeyValid) validProviders.push('ANTHROPIC')
    if (apiKeys?.googleKeyValid) validProviders.push('GOOGLE')
    if (apiKeys?.openaiKeyValid) validProviders.push('OPENAI')

    // Fetch DB models: active + available for athletes + valid provider
    let dbModels = await prisma.aIModel.findMany({
      where: {
        isActive: true,
        availableForAthletes: true,
        provider: { in: validProviders },
      },
      orderBy: [{ isDefault: 'desc' }, { displayName: 'asc' }],
    })

    // Apply coach's allowedAthleteModelIds filter (empty array = all allowed)
    if (apiKeys?.allowedAthleteModelIds?.length) {
      const allowedIds = apiKeys.allowedAthleteModelIds
      const filtered = dbModels.filter(m => allowedIds.includes(m.id))
      if (filtered.length > 0) {
        dbModels = filtered
      }
    }

    if (dbModels.length === 0) {
      return NextResponse.json({
        success: true,
        hasAIAccess: false,
        model: null,
        provider: null,
        displayName: null,
        clientId,
        availableModels: [],
      })
    }

    // Determine selected model via priority chain
    let selectedModel = dbModels[0] // fallback: first available

    // Priority 1: Athlete's preference (if still in allowed set)
    if (athletePreferredModelId) {
      const preferred = dbModels.find(m => m.id === athletePreferredModelId || m.modelId === athletePreferredModelId)
      if (preferred) {
        selectedModel = preferred
      }
    }

    // Priority 2: Coach's athlete default (if athlete has no preference or preference not available)
    if (!athletePreferredModelId && apiKeys?.athleteDefaultModelId) {
      const coachDefault = dbModels.find(m => m.id === apiKeys.athleteDefaultModelId)
      if (coachDefault) {
        selectedModel = coachDefault
      }
    }

    // Priority 3: First default model, or first available
    if (!athletePreferredModelId && !apiKeys?.athleteDefaultModelId) {
      const defaultModel = dbModels.find(m => m.isDefault)
      if (defaultModel) {
        selectedModel = defaultModel
      }
    }

    // Build available models list for the model picker
    const availableModels = dbModels.map(m => ({
      id: m.id,
      modelId: m.modelId,
      provider: m.provider,
      displayName: m.displayName,
      isDefault: m.isDefault,
    }))

    return NextResponse.json({
      success: true,
      hasAIAccess: true,
      model: selectedModel.modelId,
      provider: selectedModel.provider,
      displayName: selectedModel.displayName,
      clientId,
      availableModels,
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
