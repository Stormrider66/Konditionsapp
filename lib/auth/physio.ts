import { prisma } from '@/lib/prisma'
import { canAccessPhysioPlatform } from '@/lib/user-capabilities'

/**
 * Get all athletes accessible by a physio user, unioned across direct /
 * team / organization / business / location assignments.
 */
export async function getPhysioAthletes(physioUserId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: physioUserId },
    select: { role: true },
  })
  if (!user) return []

  const hasPhysioAccess = await canAccessPhysioPlatform(physioUserId)
  if (!hasPhysioAccess && user.role !== 'ADMIN') return []

  const assignments = await prisma.physioAssignment.findMany({
    where: { physioUserId, isActive: true },
  })

  const clientIds = new Set<string>()

  for (const assignment of assignments) {
    if (assignment.clientId) clientIds.add(assignment.clientId)

    if (assignment.teamId) {
      const teamClients = await prisma.client.findMany({
        where: { teamId: assignment.teamId },
        select: { id: true },
      })
      teamClients.forEach(c => clientIds.add(c.id))
    }

    if (assignment.organizationId) {
      const orgClients = await prisma.client.findMany({
        where: { team: { organizationId: assignment.organizationId } },
        select: { id: true },
      })
      orgClients.forEach(c => clientIds.add(c.id))
    }

    if (assignment.businessId) {
      const businessMembers = await prisma.businessMember.findMany({
        where: { businessId: assignment.businessId, isActive: true },
        select: { userId: true },
      })
      const coachIds = businessMembers.map(m => m.userId)

      if (coachIds.length > 0) {
        const businessClients = await prisma.client.findMany({
          where: { userId: { in: coachIds } },
          select: { id: true },
        })
        businessClients.forEach(c => clientIds.add(c.id))
      }
    }

    if (assignment.locationId) {
      const locationClients = await prisma.athleteAccount.findMany({
        where: { preferredLocationId: assignment.locationId },
        select: { clientId: true },
      })
      locationClients.forEach(a => clientIds.add(a.clientId))
    }
  }

  return Array.from(clientIds)
}

/**
 * Get business context for a physio user — prefers direct
 * BusinessMember, falls back to a business-level PhysioAssignment.
 */
export async function getPhysioBusinessContext(userId: string): Promise<{
  businessId: string | null
  business: { id: string; name: string; slug: string } | null
  role: string | null
}> {
  const membership = await prisma.businessMember.findFirst({
    where: { userId, isActive: true },
    include: {
      business: { select: { id: true, name: true, slug: true } },
    },
  })

  if (membership) {
    return {
      businessId: membership.businessId,
      business: membership.business,
      role: membership.role,
    }
  }

  const businessAssignment = await prisma.physioAssignment.findFirst({
    where: {
      physioUserId: userId,
      businessId: { not: null },
      isActive: true,
    },
    include: {
      business: { select: { id: true, name: true, slug: true } },
    },
  })

  if (businessAssignment?.business) {
    return {
      businessId: businessAssignment.businessId!,
      business: businessAssignment.business,
      role: 'PHYSIO',
    }
  }

  return { businessId: null, business: null, role: null }
}
