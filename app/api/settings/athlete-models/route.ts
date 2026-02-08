/**
 * Coach Athlete Model Settings API
 *
 * GET  /api/settings/athlete-models - Get coach's athlete model restrictions
 * PUT  /api/settings/athlete-models - Update allowed models and default for athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// GET - Get eligible models and current restrictions
export async function GET() {
  try {
    const user = await requireCoach()

    // Get coach's API keys and current athlete settings
    const userKeys = await prisma.userApiKey.findUnique({
      where: { userId: user.id },
      select: {
        allowedAthleteModelIds: true,
        athleteDefaultModelId: true,
        anthropicKeyValid: true,
        googleKeyValid: true,
        openaiKeyValid: true,
      },
    })

    // Build valid providers
    const validProviders: string[] = []
    if (userKeys?.anthropicKeyValid) validProviders.push('ANTHROPIC')
    if (userKeys?.googleKeyValid) validProviders.push('GOOGLE')
    if (userKeys?.openaiKeyValid) validProviders.push('OPENAI')

    // Get models that are admin-allowed for athletes and have valid provider keys
    const eligibleModels = await prisma.aIModel.findMany({
      where: {
        isActive: true,
        availableForAthletes: true,
        provider: { in: validProviders as ('ANTHROPIC' | 'GOOGLE' | 'OPENAI')[] },
      },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
      select: {
        id: true,
        modelId: true,
        provider: true,
        displayName: true,
        isDefault: true,
        inputCostPer1k: true,
        outputCostPer1k: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        allowedAthleteModelIds: userKeys?.allowedAthleteModelIds ?? [],
        athleteDefaultModelId: userKeys?.athleteDefaultModelId ?? null,
        eligibleModels,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/settings/athlete-models')
  }
}

const updateSchema = z.object({
  allowedModelIds: z.array(z.string()),
  defaultModelId: z.string().nullable(),
})

// PUT - Update athlete model restrictions
export async function PUT(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const { allowedModelIds, defaultModelId } = updateSchema.parse(body)

    // Validate all model IDs exist and are available for athletes
    if (allowedModelIds.length > 0) {
      const validModels = await prisma.aIModel.findMany({
        where: {
          id: { in: allowedModelIds },
          isActive: true,
          availableForAthletes: true,
        },
        select: { id: true },
      })

      const validIds = new Set(validModels.map(m => m.id))
      const invalidIds = allowedModelIds.filter(id => !validIds.has(id))
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid model IDs: ${invalidIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // If default is set, make sure it's in allowed list (or allowed is empty)
    if (defaultModelId && allowedModelIds.length > 0 && !allowedModelIds.includes(defaultModelId)) {
      return NextResponse.json(
        { error: 'Default model must be in the allowed models list' },
        { status: 400 }
      )
    }

    await prisma.userApiKey.upsert({
      where: { userId: user.id },
      update: {
        allowedAthleteModelIds: allowedModelIds,
        athleteDefaultModelId: defaultModelId,
      },
      create: {
        userId: user.id,
        allowedAthleteModelIds: allowedModelIds,
        athleteDefaultModelId: defaultModelId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'PUT /api/settings/athlete-models')
  }
}
