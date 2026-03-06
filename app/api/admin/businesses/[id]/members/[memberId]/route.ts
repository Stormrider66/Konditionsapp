import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdminRole } from '@/lib/auth-utils'
import { ApiError, handleApiError } from '@/lib/api-error'
import { z } from 'zod'
import { getLastOwnerGuardError } from '@/lib/business-member-guards'

// Validation schema for updating a member
const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'COACH']).optional(),
  permissions: z.record(z.boolean()).optional().nullable(),
  isActive: z.boolean().optional(),
})

// PUT /api/admin/businesses/[id]/members/[memberId] - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId, memberId } = await params

    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    // Verify the member exists and belongs to this business
    const existingMember = await prisma.businessMember.findFirst({
      where: {
        id: memberId,
        businessId,
      },
    })

    if (!existingMember) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    // Transform permissions for Prisma JSON field (null needs special handling)
    const updateData: Prisma.BusinessMemberUpdateInput = {
      ...(validatedData.role !== undefined && { role: validatedData.role }),
      ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      ...(validatedData.permissions !== undefined && {
        permissions: validatedData.permissions === null
          ? Prisma.JsonNull
          : validatedData.permissions,
      }),
    }

    const member = await prisma.$transaction(async (tx) => {
      const ownerGuardError = await getLastOwnerGuardError(tx, existingMember, {
        nextRole: validatedData.role,
        nextIsActive: validatedData.isActive,
      })

      if (ownerGuardError) {
        throw ApiError.badRequest(ownerGuardError)
      }

      return tx.businessMember.update({
        where: { id: memberId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/businesses/[id]/members/[memberId]')
  }
}

// DELETE /api/admin/businesses/[id]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])
    const { id: businessId, memberId } = await params

    // Verify the member exists and belongs to this business
    const existingMember = await prisma.businessMember.findFirst({
      where: {
        id: memberId,
        businessId,
      },
    })

    if (!existingMember) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const ownerGuardError = await getLastOwnerGuardError(tx, existingMember, { remove: true })
      if (ownerGuardError) {
        throw ApiError.badRequest(ownerGuardError)
      }

      await tx.businessMember.delete({
        where: { id: memberId },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/businesses/[id]/members/[memberId]')
  }
}
