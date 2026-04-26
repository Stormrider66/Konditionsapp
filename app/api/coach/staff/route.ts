/**
 * Staff Management API (Sportchef)
 *
 * GET  - List all staff members with their roles and team assignments
 * POST - Invite a new staff member (uses inviteUserToBusiness)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { inviteUserToBusiness } from '@/lib/invite-utils'
import {
  getStaffPermissions,
  ROLE_LABELS,
  roleLabelFor,
  isRoleInvitableFor,
  invitableRolesFor,
} from '@/lib/permissions/assistant-coach'
import { handleApiError } from '@/lib/api/utils'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'ADMIN']),
  teamIds: z.array(z.string().uuid()).optional(),
})

export async function GET() {
  try {
    const user = await requireCoach()
    const permissions = await getStaffPermissions(user.id)

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: 'Ingen behörighet' }, { status: 403 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, business: { select: { type: true } } },
    })

    if (!membership) {
      return NextResponse.json({ staff: [], businessType: null, invitableRoles: [] })
    }

    const businessType = membership.business.type
    const members = await prisma.businessMember.findMany({
      where: {
        businessId: membership.businessId,
        isActive: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch all team assignments for every member in a single query, then
    // group by userId in memory (avoids N+1).
    const memberUserIds = members.map((m) => m.userId)
    const allAssignments = memberUserIds.length
      ? await prisma.teamCoachAssignment.findMany({
          where: { userId: { in: memberUserIds } },
          include: { team: { select: { id: true, name: true } } },
        })
      : []

    const assignmentsByUserId = new Map<
      string,
      Array<{ id: string; name: string }>
    >()
    for (const a of allAssignments) {
      const existing = assignmentsByUserId.get(a.userId) ?? []
      existing.push({ id: a.team.id, name: a.team.name })
      assignmentsByUserId.set(a.userId, existing)
    }

    const staffWithTeams = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      roleLabel: roleLabelFor(m.role, businessType),
      teams: assignmentsByUserId.get(m.userId) ?? [],
      invitedAt: m.invitedAt.toISOString(),
      acceptedAt: m.acceptedAt?.toISOString() ?? null,
    }))

    return NextResponse.json({
      staff: staffWithTeams,
      businessType,
      invitableRoles: invitableRolesFor(businessType),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()
    const permissions = await getStaffPermissions(user.id)

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: 'Ingen behörighet att bjuda in personal' }, { status: 403 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, business: { select: { type: true } } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Ingen verksamhet' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ogiltig indata', details: parsed.error.flatten() }, { status: 400 })
    }

    // Reject roles that aren't valid for this business type (e.g. Sportchef on a GYM).
    if (!isRoleInvitableFor(parsed.data.role, membership.business.type)) {
      return NextResponse.json(
        {
          error: `Rollen "${roleLabelFor(parsed.data.role, membership.business.type)}" är inte tillgänglig för denna typ av verksamhet`,
        },
        { status: 400 },
      )
    }

    // Invite user to business with the specified role
    const result = await inviteUserToBusiness({
      email: parsed.data.email,
      name: parsed.data.name,
      businessId: membership.businessId,
      role: parsed.data.role as any,
      invitedByUserId: user.id,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If team-scoped role, create team assignments
    const teamScopedRoles = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO']
    if (teamScopedRoles.includes(parsed.data.role) && parsed.data.teamIds && result.userId) {
      for (const teamId of parsed.data.teamIds) {
        try {
          await prisma.teamCoachAssignment.create({
            data: {
              teamId,
              userId: result.userId,
              canRunTests: parsed.data.role !== 'PHYSIO',
              canRunIntervals: parsed.data.role !== 'PHYSIO',
              canCreateEvents: true,
            },
          })
        } catch {
          // Duplicate - ignore
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      roleLabel: roleLabelFor(parsed.data.role, membership.business.type),
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
