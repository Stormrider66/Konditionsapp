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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAthlete()
    const { modelId } = await request.json()

    // Validate model exists
    const model = getModelById(modelId)
    if (!model) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

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
    console.error('POST /api/ai/models/preference error:', error)

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
    console.error('GET /api/ai/models/preference error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get preference' },
      { status: 500 }
    )
  }
}
