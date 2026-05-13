/**
 * Single Staff Member API
 *
 * DELETE - Remove/deactivate a staff member
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'

interface RouteContext {
  params: Promise<{ memberId: string }>
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(req)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { roleOverride: previewRole })

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: 'Ingen behörighet' }, { status: 403 })
    }

    const { memberId } = await context.params

    // Get the member to deactivate
    const member = await prisma.businessMember.findUnique({
      where: { id: memberId },
      select: { userId: true, role: true, businessId: true },
    })

    if (!member) {
      return NextResponse.json({ error: 'Medlem hittades inte' }, { status: 404 })
    }

    // Can't remove OWNER
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'Kan inte ta bort ägaren' }, { status: 400 })
    }

    // Can't remove yourself
    if (member.userId === user.id) {
      return NextResponse.json({ error: 'Kan inte ta bort dig själv' }, { status: 400 })
    }

    if (scope.businessSlug) {
      const requesterMembership = await prisma.businessMember.findFirst({
        where: {
          userId: user.id,
          businessId: member.businessId,
          isActive: true,
          business: { slug: scope.businessSlug, isActive: true },
        },
        select: { id: true },
      })

      if (!requesterMembership) {
        return NextResponse.json({ error: 'Medlem hittades inte' }, { status: 404 })
      }
    }

    // Deactivate the member
    await prisma.businessMember.update({
      where: { id: memberId },
      data: { isActive: false },
    })

    // Remove team assignments
    await prisma.teamCoachAssignment.deleteMany({
      where: { userId: member.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
