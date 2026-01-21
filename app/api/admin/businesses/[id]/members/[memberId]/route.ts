import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

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
      include: {
        business: {
          select: {
            _count: {
              select: { members: { where: { role: 'OWNER' } } },
            },
          },
        },
      },
    })

    if (!existingMember) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    // Don't allow demoting the last owner
    if (
      existingMember.role === 'OWNER' &&
      validatedData.role !== 'OWNER' &&
      existingMember.business._count.members <= 1
    ) {
      return NextResponse.json({
        success: false,
        error: 'Cannot remove the last owner from a business',
      }, { status: 400 })
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

    const member = await prisma.businessMember.update({
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
      include: {
        business: {
          select: {
            _count: {
              select: { members: { where: { role: 'OWNER' } } },
            },
          },
        },
      },
    })

    if (!existingMember) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    // Don't allow removing the last owner
    if (existingMember.role === 'OWNER' && existingMember.business._count.members <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Cannot remove the last owner from a business',
      }, { status: 400 })
    }

    await prisma.businessMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/businesses/[id]/members/[memberId]')
  }
}
