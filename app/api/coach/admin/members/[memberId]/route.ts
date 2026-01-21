import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { z } from 'zod'

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'COACH']).optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/coach/admin/members/[memberId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { memberId } = await params

    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    // Get the member
    const member = await prisma.businessMember.findFirst({
      where: {
        id: memberId,
        businessId,
      },
    })

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    // Only OWNER can change roles to/from OWNER
    if (validatedData.role) {
      const isChangingOwnerRole = member.role === 'OWNER' || validatedData.role === 'OWNER'
      if (isChangingOwnerRole && admin.businessRole !== 'OWNER') {
        return NextResponse.json({
          success: false,
          error: 'Only owners can change owner roles',
        }, { status: 403 })
      }

      // Prevent removing the last owner
      if (member.role === 'OWNER' && validatedData.role !== 'OWNER') {
        const ownerCount = await prisma.businessMember.count({
          where: {
            businessId,
            role: 'OWNER',
            isActive: true,
          },
        })
        if (ownerCount <= 1) {
          return NextResponse.json({
            success: false,
            error: 'Cannot remove the last owner from a business',
          }, { status: 400 })
        }
      }
    }

    // Update member
    const updatedMember = await prisma.businessMember.update({
      where: { id: memberId },
      data: {
        role: validatedData.role,
        isActive: validatedData.isActive,
      },
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
      data: updatedMember,
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/members/[memberId]')
  }
}

// DELETE /api/coach/admin/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { memberId } = await params

    // Get the member
    const member = await prisma.businessMember.findFirst({
      where: {
        id: memberId,
        businessId,
      },
    })

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found',
      }, { status: 404 })
    }

    // Cannot remove yourself
    if (member.userId === admin.id) {
      return NextResponse.json({
        success: false,
        error: 'Cannot remove yourself from the business',
      }, { status: 400 })
    }

    // Only OWNER can remove another OWNER
    if (member.role === 'OWNER' && admin.businessRole !== 'OWNER') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can remove other owners',
      }, { status: 403 })
    }

    // Prevent removing the last owner
    if (member.role === 'OWNER') {
      const ownerCount = await prisma.businessMember.count({
        where: {
          businessId,
          role: 'OWNER',
          isActive: true,
        },
      })
      if (ownerCount <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Cannot remove the last owner from a business',
        }, { status: 400 })
      }
    }

    // Delete member
    await prisma.businessMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/coach/admin/members/[memberId]')
  }
}
