import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

// Validation schema for updating an API key
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  requestsPerMinute: z.number().int().min(1).max(1000).optional(),
  requestsPerDay: z.number().int().min(1).max(100000).optional(),
  scopes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

// PUT /api/admin/businesses/[id]/api-keys/[keyId] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId, keyId } = await params

    const body = await request.json()
    const validatedData = updateApiKeySchema.parse(body)

    // Verify the API key exists and belongs to this business
    const existingKey = await prisma.businessApiKey.findFirst({
      where: {
        id: keyId,
        businessId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not found',
      }, { status: 404 })
    }

    const apiKey = await prisma.businessApiKey.update({
      where: { id: keyId },
      data: {
        ...validatedData,
        expiresAt: validatedData.expiresAt === null
          ? null
          : validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : undefined,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        requestsPerMinute: true,
        requestsPerDay: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: apiKey,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/businesses/[id]/api-keys/[keyId]')
  }
}

// DELETE /api/admin/businesses/[id]/api-keys/[keyId] - Revoke/delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId, keyId } = await params

    // Verify the API key exists and belongs to this business
    const existingKey = await prisma.businessApiKey.findFirst({
      where: {
        id: keyId,
        businessId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not found',
      }, { status: 404 })
    }

    await prisma.businessApiKey.delete({
      where: { id: keyId },
    })

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/businesses/[id]/api-keys/[keyId]')
  }
}
