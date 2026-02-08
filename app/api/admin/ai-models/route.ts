/**
 * Admin AI Models API
 *
 * GET  /api/admin/ai-models - List all AI models (including availability flags)
 * PUT  /api/admin/ai-models - Toggle availableForAthletes for a model
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// GET /api/admin/ai-models - List all AI models
export async function GET() {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const models = await prisma.aIModel.findMany({
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: models,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/ai-models')
  }
}

const updateModelSchema = z.object({
  modelId: z.string().min(1),
  availableForAthletes: z.boolean(),
})

// PUT /api/admin/ai-models - Update model athlete availability
export async function PUT(request: NextRequest) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const body = await request.json()
    const { modelId, availableForAthletes } = updateModelSchema.parse(body)

    const model = await prisma.aIModel.update({
      where: { id: modelId },
      data: { availableForAthletes },
    })

    return NextResponse.json({
      success: true,
      data: model,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/ai-models')
  }
}
