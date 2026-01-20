import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  requestsPerMinute: z.number().int().min(1).max(1000).optional(),
  requestsPerDay: z.number().int().min(1).max(100000).optional(),
  scopes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/coach/admin/api-keys/[keyId] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { keyId } = await params

    const body = await request.json()
    const validatedData = updateApiKeySchema.parse(body)

    // Get the API key
    const apiKey = await prisma.businessApiKey.findFirst({
      where: {
        id: keyId,
        businessId,
      },
    })

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not found',
      }, { status: 404 })
    }

    // Update API key
    const updatedKey = await prisma.businessApiKey.update({
      where: { id: keyId },
      data: {
        name: validatedData.name,
        requestsPerMinute: validatedData.requestsPerMinute,
        requestsPerDay: validatedData.requestsPerDay,
        scopes: validatedData.scopes,
        isActive: validatedData.isActive,
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
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedKey,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/api-keys/[keyId]')
  }
}

// DELETE /api/coach/admin/api-keys/[keyId] - Delete (revoke) API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { keyId } = await params

    // Get the API key
    const apiKey = await prisma.businessApiKey.findFirst({
      where: {
        id: keyId,
        businessId,
      },
    })

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not found',
      }, { status: 404 })
    }

    // Delete API key
    await prisma.businessApiKey.delete({
      where: { id: keyId },
    })

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/coach/admin/api-keys/[keyId]')
  }
}
