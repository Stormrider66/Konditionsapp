/**
 * Business AI Model Restrictions
 *
 * GET /api/coach/admin/ai-keys/models - Get model restrictions
 * PUT /api/coach/admin/ai-keys/models - Update model restrictions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateModelsSchema = z.object({
  allowedModelIds: z.array(z.string()).optional(),
  allowedAthleteModelIds: z.array(z.string()).optional(),
  athleteDefaultModelId: z.string().nullable().optional(),
  defaultModelId: z.string().nullable().optional(),
})

// GET - Get model restrictions
export async function GET() {
  try {
    const admin = await requireBusinessAdminRole()

    const aiKeys = await prisma.businessAiKeys.findUnique({
      where: { businessId: admin.businessId },
      select: {
        allowedModelIds: true,
        allowedAthleteModelIds: true,
        athleteDefaultModelId: true,
        defaultModelId: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        allowedModelIds: aiKeys?.allowedModelIds ?? [],
        allowedAthleteModelIds: aiKeys?.allowedAthleteModelIds ?? [],
        athleteDefaultModelId: aiKeys?.athleteDefaultModelId ?? null,
        defaultModelId: aiKeys?.defaultModelId ?? null,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/ai-keys/models')
  }
}

// PUT - Update model restrictions
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()

    const body = await request.json()
    const data = updateModelsSchema.parse(body)

    // Ensure BusinessAiKeys record exists
    const existing = await prisma.businessAiKeys.findUnique({
      where: { businessId: admin.businessId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Business AI keys must be configured before setting model restrictions' },
        { status: 400 }
      )
    }

    const updated = await prisma.businessAiKeys.update({
      where: { businessId: admin.businessId },
      data: {
        ...(data.allowedModelIds !== undefined ? { allowedModelIds: data.allowedModelIds } : {}),
        ...(data.allowedAthleteModelIds !== undefined ? { allowedAthleteModelIds: data.allowedAthleteModelIds } : {}),
        ...(data.athleteDefaultModelId !== undefined ? { athleteDefaultModelId: data.athleteDefaultModelId } : {}),
        ...(data.defaultModelId !== undefined ? { defaultModelId: data.defaultModelId } : {}),
      },
      select: {
        allowedModelIds: true,
        allowedAthleteModelIds: true,
        athleteDefaultModelId: true,
        defaultModelId: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/ai-keys/models')
  }
}
