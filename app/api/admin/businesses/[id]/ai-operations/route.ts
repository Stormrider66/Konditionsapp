import { NextRequest, NextResponse } from 'next/server'
import { FeatureFlag } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

const updateAiOperationsSchema = z.object({
  enabled: z.boolean(),
})

// PATCH /api/admin/businesses/[id]/ai-operations - Enable/disable the internal AI operations beta
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id } = await params
    const body = await request.json()
    const { enabled } = updateAiOperationsSchema.parse(body)

    const business = await prisma.business.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    const now = new Date()
    const feature = await prisma.businessFeature.upsert({
      where: {
        businessId_feature: {
          businessId: id,
          feature: FeatureFlag.AI_ASSISTANT_OPERATIONS,
        },
      },
      update: {
        isEnabled: enabled,
        enabledAt: enabled ? now : null,
        expiresAt: null,
      },
      create: {
        businessId: id,
        feature: FeatureFlag.AI_ASSISTANT_OPERATIONS,
        isEnabled: enabled,
        enabledAt: enabled ? now : null,
        expiresAt: null,
      },
      select: {
        id: true,
        feature: true,
        isEnabled: true,
        enabledAt: true,
        expiresAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        business,
        feature,
        enabled: feature.isEnabled,
      },
    })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/businesses/[id]/ai-operations')
  }
}
