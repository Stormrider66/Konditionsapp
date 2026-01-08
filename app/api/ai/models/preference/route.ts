/**
 * AI Model Preference API
 *
 * POST /api/ai/models/preference - Save athlete's preferred AI model
 * GET /api/ai/models/preference - Get athlete's preferred AI model
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getModelById } from '@/types/ai-models'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete()

    const rateLimited = await rateLimitJsonResponse('ai:model-preference:set', user.id, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { modelId } = await request.json()

    // Validate model exists
    const model = getModelById(modelId)
    if (!model) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    // Get athlete's account and coach info
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

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Validate model is allowed by coach
    const coachSettings = await prisma.userApiKey.findUnique({
      where: { userId: athleteAccount.client.userId },
      select: {
        allowedAthleteModelIds: true,
        anthropicKeyValid: true,
        googleKeyValid: true,
        openaiKeyValid: true,
      },
    })

    // Check if the provider key is valid
    const providerKeyValid =
      (model.provider === 'anthropic' && coachSettings?.anthropicKeyValid) ||
      (model.provider === 'google' && coachSettings?.googleKeyValid) ||
      (model.provider === 'openai' && coachSettings?.openaiKeyValid)

    if (!providerKeyValid) {
      return NextResponse.json(
        { error: 'Model provider not available' },
        { status: 403 }
      )
    }

    // If coach has restricted models, verify this one is allowed
    if (
      coachSettings?.allowedAthleteModelIds?.length &&
      !coachSettings.allowedAthleteModelIds.includes(modelId)
    ) {
      return NextResponse.json(
        { error: 'Model not allowed by coach' },
        { status: 403 }
      )
    }

    // Update sport profile with preference
    await prisma.sportProfile.upsert({
      where: { clientId: athleteAccount.clientId },
      update: { preferredAIModelId: modelId },
      create: {
        clientId: athleteAccount.clientId,
        preferredAIModelId: modelId,
      },
    })

    return NextResponse.json({ success: true, modelId })
  } catch (error) {
    logger.error('POST /api/ai/models/preference error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to save preference' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await requireAthlete()

    const rateLimited = await rateLimitJsonResponse('ai:model-preference:get', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // Get sport profile
    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId: athleteAccount.clientId },
      select: { preferredAIModelId: true },
    })

    return NextResponse.json({
      success: true,
      modelId: sportProfile?.preferredAIModelId || null,
    })
  } catch (error) {
    logger.error('GET /api/ai/models/preference error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get preference' },
      { status: 500 }
    )
  }
}
