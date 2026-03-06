import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireBusinessAdminRole } from '@/lib/auth-utils'
import { ApiError, handleApiError } from '@/lib/api-error'
import { z } from 'zod'
import { getLastOwnerGuardError } from '@/lib/business-member-guards'

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
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
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

    const nextRole = validatedData.role ?? member.role
    const nextIsActive = validatedData.isActive ?? member.isActive
    const isPrivilegedTarget = member.role === 'OWNER' || member.role === 'ADMIN'
    const isPrivilegedDestination = nextRole === 'OWNER' || nextRole === 'ADMIN'

    if (validatedData.role) {
      const isChangingOwnerRole = member.role === 'OWNER' || validatedData.role === 'OWNER'
      if (isChangingOwnerRole && admin.businessRole !== 'OWNER') {
        return NextResponse.json({
          success: false,
          error: 'Only owners can change owner roles',
        }, { status: 403 })
      }
    }

    if (
      admin.businessRole === 'ADMIN' &&
      member.userId !== admin.id &&
      (isPrivilegedTarget || isPrivilegedDestination)
    ) {
      return NextResponse.json({
        success: false,
        error: 'Admins can only manage coaches and members',
      }, { status: 403 })
    }

    const updatedMember = await prisma.$transaction(async (tx) => {
      const ownerGuardError = await getLastOwnerGuardError(tx, member, {
        nextRole,
        nextIsActive,
      })

      if (ownerGuardError) {
        throw ApiError.badRequest(ownerGuardError)
      }

      return tx.businessMember.update({
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
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
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

    if (
      admin.businessRole === 'ADMIN' &&
      (member.role === 'OWNER' || member.role === 'ADMIN')
    ) {
      return NextResponse.json({
        success: false,
        error: 'Admins can only manage coaches and members',
      }, { status: 403 })
    }

    if (member.role === 'OWNER' && admin.businessRole !== 'OWNER') {
      return NextResponse.json({
        success: false,
        error: 'Only owners can remove other owners',
      }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      const ownerGuardError = await getLastOwnerGuardError(tx, member, { remove: true })
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
    return handleApiError(error, 'DELETE /api/coach/admin/members/[memberId]')
  }
}
