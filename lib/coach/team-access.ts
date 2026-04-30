import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'

const BUSINESS_WIDE_ROLES = ['OWNER', 'ADMIN', 'COACH'] as const
const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'] as const

export async function getPrimaryBusinessMembership(userId: string) {
  return prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    select: {
      businessId: true,
      role: true,
      business: { select: { id: true, slug: true, type: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getBusinessTeamOwnerIds(userId: string, businessSlug?: string) {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: { businessId: true, role: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership || !BUSINESS_WIDE_ROLES.includes(membership.role as any)) {
    return []
  }

  const owners = await prisma.businessMember.findMany({
    where: {
      businessId: membership.businessId,
      isActive: true,
      role: { in: [...BUSINESS_WIDE_ROLES, ...TEAM_SCOPED_ROLES] },
    },
    select: { userId: true },
  })

  return owners.map((owner) => owner.userId)
}

export async function getAccessibleTeamWhere(
  userId: string,
  businessSlug?: string
): Promise<Prisma.TeamWhereInput> {
  const permissions = await getStaffPermissions(userId, businessSlug)
  const assignedTeamIds = permissions.assignedTeamIds
  const businessOwnerIds = await getBusinessTeamOwnerIds(userId, businessSlug)

  return {
    OR: [
      { userId },
      ...(assignedTeamIds.length > 0 ? [{ id: { in: assignedTeamIds } }] : []),
      ...(businessOwnerIds.length > 0 ? [{ userId: { in: businessOwnerIds } }] : []),
    ],
  }
}

export async function getAccessibleTeam(
  userId: string,
  teamId: string,
  businessSlug?: string
) {
  const where = await getAccessibleTeamWhere(userId, businessSlug)
  return prisma.team.findFirst({
    where: {
      id: teamId,
      AND: [where],
    },
    select: {
      id: true,
      name: true,
      userId: true,
      sportType: true,
      organizationId: true,
    },
  })
}

export async function getWritableTeam(
  userId: string,
  teamId: string,
  businessSlug?: string,
  action: 'roster' | 'tests' | 'events' | 'programs' = 'roster'
) {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!team) return null

  if (team.userId === userId) return team

  const permissions = await getStaffPermissions(userId, businessSlug)
  const isAssigned = permissions.assignedTeamIds.includes(teamId)

  if (action === 'tests' && permissions.canRunTests && (!permissions.isTeamScoped || isAssigned)) {
    return team
  }
  if (action === 'events' && permissions.canCreateEvents && (!permissions.isTeamScoped || isAssigned)) {
    return team
  }
  if (action === 'programs' && permissions.canEditPrograms && (!permissions.isTeamScoped || isAssigned)) {
    return team
  }
  if (action === 'roster' && permissions.canViewAthletes && (!permissions.isTeamScoped || isAssigned)) {
    return team
  }

  return null
}

export async function canAccessClientInTeam(
  userId: string,
  clientId: string,
  teamId: string,
  businessSlug?: string
) {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!team) return false

  const membership = await getPrimaryBusinessMembership(userId)
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      teamId,
      OR: [
        { userId: team.userId },
        { userId },
        ...(membership?.businessId ? [{ businessId: membership.businessId }] : []),
      ],
    },
    select: { id: true },
  })

  return !!client
}
