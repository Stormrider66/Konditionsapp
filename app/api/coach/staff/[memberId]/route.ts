/**
 * Single Staff Member API (Sportchef)
 *
 * PATCH  - Edit a staff member: change role, reconcile team connections, and
 *          (PHYSIO only) reconcile individual-athlete assignments.
 * DELETE - Remove/deactivate a staff member.
 *
 * NOTE: The staff hub writes to two parallel access systems on purpose.
 *   - TeamCoachAssignment: team-scope access for PHYSICAL_TRAINER / ASSISTANT_COACH / PHYSIO.
 *   - PhysioAssignment (clientId): individual-athlete access for PHYSIO only.
 * These don't cross-reference each other — `canStaffAccessClient` resolves team
 * scope only and will NOT reflect a physio's individual-athlete assignments (by design).
 * Individual-athlete scope for non-physio roles is intentionally out of scope here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  getStaffPermissions,
  roleLabelFor,
} from '@/lib/permissions/assistant-coach'
import { TEAM_STAFF_ROLE_VALUES } from '@/lib/permissions/staff-roles'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { handleApiError } from '@/lib/api/utils'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ memberId: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// `role` excludes OWNER: nobody can be promoted to owner via this endpoint.
// MEMBER is the "player" role (Spelare) on a team roster.
const patchSchema = z.object({
  role: z.enum(['COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'ADMIN', 'MEMBER']),
  teamIds: z.array(z.string().uuid()).optional(),
  clientIds: z.array(z.string().uuid()).optional(),
})

const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'] as const

function uniqueIds(ids: string[] | undefined) {
  return Array.from(new Set(ids ?? []))
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const scope = getRequestedBusinessScope(req)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { locale, roleOverride: previewRole })

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: t(locale, 'No permission to manage staff', 'Ingen behörighet att hantera personal') }, { status: 403 })
    }

    const requesterMembership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        ...(scope.businessSlug
          ? { business: { slug: scope.businessSlug, isActive: true } }
          : {}),
      },
      select: { businessId: true, business: { select: { type: true } } },
      orderBy: { createdAt: 'asc' },
    })

    if (!requesterMembership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet') }, { status: 400 })
    }

    // Staff/role management is a team feature (mirror the page gate): allow when
    // the requester is in TEAM dashboard mode, or the business is a club.
    const requesterProfile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
      select: { dashboardMode: true },
    })
    const isTeamContext = requesterProfile?.dashboardMode === 'TEAM' || requesterMembership.business.type === 'CLUB'
    if (!isTeamContext) {
      return NextResponse.json({ error: t(locale, 'Staff management is only available for team organizations', 'Personalhantering är endast tillgänglig för lagorganisationer') }, { status: 400 })
    }

    const { memberId } = await context.params

    const member = await prisma.businessMember.findUnique({
      where: { id: memberId },
      select: { userId: true, role: true, businessId: true },
    })

    // Tenant isolation: the member must belong to the requester's business.
    if (!member || member.businessId !== requesterMembership.businessId) {
      return NextResponse.json({ error: t(locale, 'Member not found', 'Medlem hittades inte') }, { status: 404 })
    }

    if (member.role === 'OWNER') {
      return NextResponse.json({ error: t(locale, 'Cannot edit the owner', 'Kan inte redigera ägaren') }, { status: 400 })
    }

    if (member.userId === user.id) {
      return NextResponse.json({ error: t(locale, 'Cannot change your own role', 'Kan inte ändra din egen roll') }, { status: 400 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid input', 'Ogiltig indata'), details: parsed.error.flatten() }, { status: 400 })
    }

    const newRole = parsed.data.role

    // The hub is team-gated above, so the full team lineup (incl. the player
    // role) is allowed regardless of business type.
    if (!TEAM_STAFF_ROLE_VALUES.includes(newRole)) {
      return NextResponse.json(
        { error: t(locale, 'Role not allowed', 'Rollen är inte tillåten') },
        { status: 400 },
      )
    }

    const teamScoped = TEAM_SCOPED_ROLES.includes(newRole as typeof TEAM_SCOPED_ROLES[number])
    const desiredTeamIds = teamScoped ? uniqueIds(parsed.data.teamIds) : []

    if (teamScoped && desiredTeamIds.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'Team-scoped roles must be assigned to at least one team', 'Team-bundna roller måste kopplas till minst ett lag') },
        { status: 400 },
      )
    }

    // Validate desired teams belong to the business (mirrors the invite route).
    if (desiredTeamIds.length > 0) {
      const businessUserIds = await prisma.businessMember.findMany({
        where: { businessId: requesterMembership.businessId, isActive: true },
        select: { userId: true },
      })
      const validTeams = await prisma.team.findMany({
        where: {
          id: { in: desiredTeamIds },
          OR: [
            { members: { some: { businessId: requesterMembership.businessId } } },
            { userId: { in: businessUserIds.map((m) => m.userId) } },
          ],
        },
        select: { id: true },
      })
      const validTeamIds = new Set(validTeams.map((team) => team.id))
      const invalidTeamIds = desiredTeamIds.filter((teamId) => !validTeamIds.has(teamId))

      if (invalidTeamIds.length > 0) {
        return NextResponse.json(
          { error: t(locale, 'One or more teams do not belong to this business', 'Ett eller flera lag tillhör inte denna verksamhet') },
          { status: 400 },
        )
      }
    }

    // Validate desired individual athletes (PHYSIO only) belong to the business.
    const desiredClientIds = newRole === 'PHYSIO' ? uniqueIds(parsed.data.clientIds) : []
    if (desiredClientIds.length > 0) {
      const validClients = await prisma.client.findMany({
        where: { id: { in: desiredClientIds }, businessId: requesterMembership.businessId },
        select: { id: true },
      })
      const validClientIds = new Set(validClients.map((c) => c.id))
      const invalidClientIds = desiredClientIds.filter((id) => !validClientIds.has(id))

      if (invalidClientIds.length > 0) {
        return NextResponse.json(
          { error: t(locale, 'One or more athletes do not belong to this business', 'En eller flera atleter tillhör inte denna verksamhet') },
          { status: 400 },
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Role
      if (newRole !== member.role) {
        await tx.businessMember.update({ where: { id: memberId }, data: { role: newRole } })
      }

      // 2. Team connections — reconcile against existing assignments.
      const existing = await tx.teamCoachAssignment.findMany({
        where: { userId: member.userId },
        select: { teamId: true },
      })
      const existingTeamIds = new Set(existing.map((a) => a.teamId))

      if (!teamScoped) {
        // Moved to a non-team-scoped role (e.g. COACH / ADMIN): drop all team rows.
        if (existingTeamIds.size > 0) {
          await tx.teamCoachAssignment.deleteMany({ where: { userId: member.userId } })
        }
      } else {
        const desiredSet = new Set(desiredTeamIds)
        const toRemove = [...existingTeamIds].filter((id) => !desiredSet.has(id))
        const toAdd = desiredTeamIds.filter((id) => !existingTeamIds.has(id))
        const kept = desiredTeamIds.filter((id) => existingTeamIds.has(id))

        const canRun = newRole !== 'PHYSIO'

        if (toRemove.length > 0) {
          await tx.teamCoachAssignment.deleteMany({ where: { userId: member.userId, teamId: { in: toRemove } } })
        }
        for (const teamId of toAdd) {
          await tx.teamCoachAssignment.create({
            data: {
              teamId,
              userId: member.userId,
              canRunTests: canRun,
              canRunIntervals: canRun,
              canCreateEvents: true,
            },
          })
        }
        // Role changed but team kept: refresh permission flags to match the new role.
        if (newRole !== member.role && kept.length > 0) {
          await tx.teamCoachAssignment.updateMany({
            where: { userId: member.userId, teamId: { in: kept } },
            data: { canRunTests: canRun, canRunIntervals: canRun, canCreateEvents: true },
          })
        }
      }

      // 3. Individual athletes — PHYSIO only (PhysioAssignment.clientId scope).
      if (newRole === 'PHYSIO') {
        if (parsed.data.clientIds !== undefined) {
          const existingPa = await tx.physioAssignment.findMany({
            where: { physioUserId: member.userId, clientId: { not: null }, isActive: true },
            select: { id: true, clientId: true },
          })
          const existingClientSet = new Set(existingPa.map((a) => a.clientId))
          const desiredClientSet = new Set(desiredClientIds)
          const paToRemove = existingPa
            .filter((a) => a.clientId && !desiredClientSet.has(a.clientId))
            .map((a) => a.id)
          const paToAdd = desiredClientIds.filter((id) => !existingClientSet.has(id))

          if (paToRemove.length > 0) {
            await tx.physioAssignment.updateMany({ where: { id: { in: paToRemove } }, data: { isActive: false } })
          }
          for (const clientId of paToAdd) {
            await tx.physioAssignment.create({
              data: {
                physioUserId: member.userId,
                clientId,
                role: 'PRIMARY',
                canCreateRestrictions: true,
                canViewFullHistory: true,
                isActive: true,
              },
            })
          }
        }
      } else {
        // Role moved away from PHYSIO: deactivate any individual physio assignments.
        await tx.physioAssignment.updateMany({
          where: { physioUserId: member.userId, clientId: { not: null }, isActive: true },
          data: { isActive: false },
        })
      }
    })

    return NextResponse.json({
      success: true,
      roleLabel: roleLabelFor(newRole, requesterMembership.business.type, locale),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const scope = getRequestedBusinessScope(req)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { roleOverride: previewRole })

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: t(locale, 'No permission', 'Ingen behörighet') }, { status: 403 })
    }

    const { memberId } = await context.params

    // Get the member to deactivate
    const member = await prisma.businessMember.findUnique({
      where: { id: memberId },
      select: { userId: true, role: true, businessId: true },
    })

    if (!member) {
      return NextResponse.json({ error: t(locale, 'Member not found', 'Medlem hittades inte') }, { status: 404 })
    }

    // Can't remove OWNER
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: t(locale, 'Cannot remove the owner', 'Kan inte ta bort ägaren') }, { status: 400 })
    }

    // Can't remove yourself
    if (member.userId === user.id) {
      return NextResponse.json({ error: t(locale, 'Cannot remove yourself', 'Kan inte ta bort dig själv') }, { status: 400 })
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
        return NextResponse.json({ error: t(locale, 'Member not found', 'Medlem hittades inte') }, { status: 404 })
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

    // Deactivate any individual-athlete physio assignments so a removed
    // physio loses access to those athletes too.
    await prisma.physioAssignment.updateMany({
      where: { physioUserId: member.userId, isActive: true },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
