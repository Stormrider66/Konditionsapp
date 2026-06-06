/**
 * Staff Management API (Sportchef)
 *
 * GET  - List all staff members with their roles and team assignments
 * POST - Invite a new staff member (uses inviteUserToBusiness)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { inviteUserToBusiness } from '@/lib/invite-utils'
import {
  getStaffPermissions,
  roleLabelFor,
  isRoleInvitableFor,
  invitableRolesFor,
} from '@/lib/permissions/assistant-coach'
import { TEAM_STAFF_ROLE_VALUES } from '@/lib/permissions/staff-roles'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { handleApiError } from '@/lib/api/utils'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  // MEMBER is the "player" role (Spelare) on a team roster.
  role: z.enum(['COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'ADMIN', 'MEMBER']),
  teamIds: z.array(z.string().uuid()).optional(),
})

const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'] as const

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function uniqueTeamIds(teamIds: string[] | undefined) {
  return Array.from(new Set(teamIds ?? []))
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const scope = getRequestedBusinessScope(req)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { locale, roleOverride: previewRole })

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: t(locale, 'No permission', 'Ingen behörighet') }, { status: 403 })
    }

    const membership = await prisma.businessMember.findFirst({
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
          where: {
            userId: { in: memberUserIds },
            team: {
              OR: [
                { members: { some: { businessId: membership.businessId } } },
                ...(scope.businessSlug ? [{ organization: { id: `${scope.businessSlug}-org` } }] : []),
              ],
            },
          },
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

    // Individual-athlete assignments for PHYSIO members (PhysioAssignment.clientId scope).
    // Batched + grouped in memory to avoid N+1.
    const physioUserIds = members.filter((m) => m.role === 'PHYSIO').map((m) => m.userId)
    const physioAthleteRows = physioUserIds.length
      ? await prisma.physioAssignment.findMany({
          where: {
            physioUserId: { in: physioUserIds },
            clientId: { not: null },
            isActive: true,
            client: { businessId: membership.businessId },
          },
          include: { client: { select: { id: true, name: true } } },
        })
      : []

    const athletesByUserId = new Map<string, Array<{ id: string; name: string }>>()
    for (const a of physioAthleteRows) {
      if (!a.client) continue
      const existing = athletesByUserId.get(a.physioUserId) ?? []
      existing.push({ id: a.client.id, name: a.client.name })
      athletesByUserId.set(a.physioUserId, existing)
    }

    const staffWithTeams = members.map((m) => {
      const clients = athletesByUserId.get(m.userId) ?? []
      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        roleLabel: roleLabelFor(m.role, businessType, locale),
        teams: assignmentsByUserId.get(m.userId) ?? [],
        clients,
        clientIds: clients.map((c) => c.id),
        invitedAt: m.invitedAt.toISOString(),
        acceptedAt: m.acceptedAt?.toISOString() ?? null,
      }
    })

    return NextResponse.json({
      staff: staffWithTeams,
      businessType,
      invitableRoles: invitableRolesFor(businessType, locale),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const scope = getRequestedBusinessScope(req)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { locale, roleOverride: previewRole })

    if (!permissions.canInviteStaff) {
      return NextResponse.json({ error: t(locale, 'No permission to invite staff', 'Ingen behörighet att bjuda in personal') }, { status: 403 })
    }

    const membership = await prisma.businessMember.findFirst({
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

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet') }, { status: 400 })
    }

    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: t(locale, 'Invalid input', 'Ogiltig indata'), details: parsed.error.flatten() }, { status: 400 })
    }

    // Team organizations get the full staff lineup (incl. player) regardless of
    // business type; mirror the page/nav gate via the requester's dashboard mode.
    const requesterProfile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
      select: { dashboardMode: true },
    })
    const isTeamContext = requesterProfile?.dashboardMode === 'TEAM' || membership.business.type === 'CLUB'
    const roleAllowed = isTeamContext
      ? TEAM_STAFF_ROLE_VALUES.includes(parsed.data.role)
      : isRoleInvitableFor(parsed.data.role, membership.business.type)
    if (!roleAllowed) {
      return NextResponse.json(
        {
          error: t(
            locale,
            `The role "${roleLabelFor(parsed.data.role, membership.business.type, 'en')}" is not available for this business type`,
            `Rollen "${roleLabelFor(parsed.data.role, membership.business.type, 'sv')}" är inte tillgänglig för denna typ av verksamhet`
          ),
        },
        { status: 400 },
      )
    }

    const teamScopedRole = TEAM_SCOPED_ROLES.includes(parsed.data.role as typeof TEAM_SCOPED_ROLES[number])
    const teamIds = uniqueTeamIds(parsed.data.teamIds)

    if (teamScopedRole && teamIds.length === 0) {
      return NextResponse.json(
        { error: t(locale, 'Team-scoped roles must be assigned to at least one team', 'Team-bundna roller måste kopplas till minst ett lag') },
        { status: 400 },
      )
    }

    if (teamIds.length > 0) {
      const businessUserIds = await prisma.businessMember.findMany({
        where: {
          businessId: membership.businessId,
          isActive: true,
        },
        select: { userId: true },
      })
      const validTeams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          OR: [
            { members: { some: { businessId: membership.businessId } } },
            { userId: { in: businessUserIds.map((member) => member.userId) } },
          ],
        },
        select: { id: true },
      })
      const validTeamIds = new Set(validTeams.map((team) => team.id))
      const invalidTeamIds = teamIds.filter((teamId) => !validTeamIds.has(teamId))

      if (invalidTeamIds.length > 0) {
        return NextResponse.json(
          { error: t(locale, 'One or more teams do not belong to this business', 'Ett eller flera lag tillhör inte denna verksamhet') },
          { status: 400 },
        )
      }
    }

    // Invite user to business with the specified role
    const result = await inviteUserToBusiness({
      email: parsed.data.email,
      name: parsed.data.name,
      businessId: membership.businessId,
      role: parsed.data.role,
      invitedByUserId: user.id,
      locale,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If team-scoped role, create team assignments
    if (teamScopedRole && result.userId) {
      for (const teamId of teamIds) {
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
      roleLabel: roleLabelFor(parsed.data.role, membership.business.type, locale),
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
