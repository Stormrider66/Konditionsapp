import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'

const BUSINESS_WIDE_ROLES = ['OWNER', 'ADMIN', 'COACH'] as const
const TEAM_SCOPED_ROLES = ['PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO'] as const

function isBusinessWideRole(role: string): role is (typeof BUSINESS_WIDE_ROLES)[number] {
  return BUSINESS_WIDE_ROLES.some((businessRole) => businessRole === role)
}

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

export async function getBusinessMembership(userId: string, businessSlug?: string) {
  return prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(businessSlug ? { business: { slug: businessSlug, isActive: true } } : {}),
    },
    select: {
      businessId: true,
      role: true,
      business: { select: { id: true, slug: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getBusinessTeamOwnerIds(userId: string, businessSlug?: string) {
  const membership = await getBusinessMembership(userId, businessSlug)

  if (!membership || !isBusinessWideRole(membership.role)) {
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

async function getBusinessOrganizationIds(userId: string, businessSlug?: string) {
  if (!businessSlug) return []

  const membership = await getBusinessMembership(userId, businessSlug)
  if (!membership || !isBusinessWideRole(membership.role)) {
    return []
  }

  const ownerIds = await getBusinessTeamOwnerIds(userId, businessSlug)
  if (ownerIds.length === 0) return []

  const organizations = await prisma.organization.findMany({
    where: {
      userId: { in: ownerIds },
      OR: [
        { id: `${membership.business.slug}-org` },
        { name: membership.business.name },
      ],
    },
    select: { id: true },
  })

  return organizations.map((organization) => organization.id)
}

export async function ensureBusinessOrganization(userId: string, businessSlug: string) {
  const membership = await getBusinessMembership(userId, businessSlug)
  if (!membership || !isBusinessWideRole(membership.role)) {
    return null
  }

  const ownerIds = await getBusinessTeamOwnerIds(userId, businessSlug)
  const organizationOwnerId = ownerIds.includes(userId) ? userId : ownerIds[0]
  if (!organizationOwnerId) return null

  return prisma.organization.upsert({
    where: { id: `${membership.business.slug}-org` },
    update: {
      name: membership.business.name,
    },
    create: {
      id: `${membership.business.slug}-org`,
      userId: organizationOwnerId,
      name: membership.business.name,
      description: `${membership.business.name} workspace`,
    },
    select: { id: true, userId: true },
  })
}

export async function getAccessibleTeamWhere(
  userId: string,
  businessSlug?: string
): Promise<Prisma.TeamWhereInput> {
  const permissions = await getStaffPermissions(userId, businessSlug)
  const assignedTeamIds = permissions.assignedTeamIds
  const businessOwnerIds = await getBusinessTeamOwnerIds(userId, businessSlug)
  const businessOrganizationIds = await getBusinessOrganizationIds(userId, businessSlug)

  const accessWhere: Prisma.TeamWhereInput = {
    OR: [
      { userId },
      ...(assignedTeamIds.length > 0 ? [{ id: { in: assignedTeamIds } }] : []),
      ...(businessOwnerIds.length > 0 ? [{ userId: { in: businessOwnerIds } }] : []),
    ],
  }

  if (!businessSlug) {
    return accessWhere
  }

  return {
    AND: [
      accessWhere,
      {
        OR: [
          ...(businessOrganizationIds.length > 0
            ? [{ organizationId: { in: businessOrganizationIds } }]
            : []),
          { members: { some: { business: { slug: businessSlug } } } },
        ],
      },
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

export async function getAccessibleOrganization(
  userId: string,
  organizationId: string,
  businessSlug?: string
) {
  const businessOwnerIds = await getBusinessTeamOwnerIds(userId, businessSlug)
  const ownerIds = businessOwnerIds.length ? businessOwnerIds : [userId]

  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      userId: { in: ownerIds },
    },
    include: {
      teams: {
        select: {
          members: {
            select: { businessId: true },
          },
        },
      },
    },
  })

  if (!organization) return null
  if (!businessSlug) return organization

  const membership = await getBusinessMembership(userId, businessSlug)
  if (!membership) return null

  if (organization.id === `${membership.business.slug}-org`) return organization
  if (organization.name === membership.business.name) return organization

  const memberBusinessIds = organization.teams.flatMap((team) =>
    team.members.map((member) => member.businessId).filter(Boolean)
  )

  if (memberBusinessIds.some((businessId) => businessId === membership.businessId)) {
    return organization
  }

  if (memberBusinessIds.some((businessId) => businessId !== membership.businessId)) {
    return null
  }

  const ownerBusinessCount = await prisma.businessMember.count({
    where: {
      userId: organization.userId,
      isActive: true,
    },
  })

  return ownerBusinessCount <= 1 ? organization : null
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

  const membership = await getBusinessMembership(userId, businessSlug)
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
