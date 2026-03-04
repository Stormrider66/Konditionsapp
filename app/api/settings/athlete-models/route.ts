/**
 * Coach Athlete Model Settings API
 *
 * GET  /api/settings/athlete-models - Get coach's athlete tier restrictions
 * PUT  /api/settings/athlete-models - Update allowed tiers and default for athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'
import { isModelIntent, legacyModelIdToIntent } from '@/types/ai-models'
import type { ModelIntent } from '@/types/ai-models'

// GET - Get current tier restrictions
export async function GET() {
  try {
    const user = await requireCoach()

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

    const hasKeys =
      userKeys?.anthropicKeyValid ||
      userKeys?.googleKeyValid ||
      userKeys?.openaiKeyValid ||
      false

    // Convert stored values to tiers (handles both tier strings and legacy model IDs)
    const rawAllowed = userKeys?.allowedAthleteModelIds || []
    const allowedTiers: ModelIntent[] = rawAllowed.length > 0
      ? rawAllowed
          .map(id => isModelIntent(id) ? id : legacyModelIdToIntent(id))
          .filter((v, i, a) => a.indexOf(v) === i) as ModelIntent[]
      : []

    const rawDefault = userKeys?.athleteDefaultModelId
    const defaultTier: ModelIntent | null = rawDefault
      ? (isModelIntent(rawDefault) ? rawDefault : legacyModelIdToIntent(rawDefault))
      : null

    return NextResponse.json({
      success: true,
      data: {
        allowedTiers,
        defaultTier,
        hasKeys,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/settings/athlete-models')
  }
}

const updateSchema = z.object({
  allowedTiers: z.array(z.enum(['fast', 'balanced', 'powerful'])),
  defaultTier: z.enum(['fast', 'balanced', 'powerful']).nullable(),
})

// PUT - Update athlete tier restrictions
export async function PUT(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const { allowedTiers, defaultTier } = updateSchema.parse(body)

    // If default is set, make sure it's in allowed list (or allowed is empty)
    if (defaultTier && allowedTiers.length > 0 && !allowedTiers.includes(defaultTier)) {
      return NextResponse.json(
        { error: 'Default tier must be in the allowed tiers list' },
        { status: 400 }
      )
    }

    // Store tier strings in the existing DB fields
    await prisma.userApiKey.upsert({
      where: { userId: user.id },
      update: {
        allowedAthleteModelIds: allowedTiers,
        athleteDefaultModelId: defaultTier,
      },
      create: {
        userId: user.id,
        allowedAthleteModelIds: allowedTiers,
        athleteDefaultModelId: defaultTier,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'PUT /api/settings/athlete-models')
  }
}
