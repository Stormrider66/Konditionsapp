/**
 * Athlete Access Authorization Helper
 *
 * Provides proper authorization checks for accessing athlete data.
 * Verifies coach-athlete relationships through:
 * - Direct client ownership (coach created the client)
 * - Business membership (both belong to same business)
 * - Team assignment (coach assigned to athlete's team)
 * - Assigned coaches relationship
 */

import { prisma } from '@/lib/prisma'

export interface AthleteAccessResult {
  allowed: boolean
  reason?: string
  clientId?: string
}

/**
 * Check if a user can access an athlete's data
 *
 * @param userId - The user attempting to access the data
 * @param clientId - The client/athlete whose data is being accessed
 * @returns Whether access is allowed and the reason
 */
export async function canAccessAthlete(
  userId: string,
  clientId: string
): Promise<AthleteAccessResult> {
  // Get the user making the request
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      athleteAccount: {
        select: { clientId: true }
      }
    }
  })

  if (!user) {
    return { allowed: false, reason: 'User not found' }
  }

  // Admins can access everything
  if (user.role === 'ADMIN') {
    return { allowed: true, reason: 'Admin access', clientId }
  }

  // Athletes can only access their own data
  if (user.role === 'ATHLETE') {
    if (user.athleteAccount?.clientId === clientId) {
      return { allowed: true, reason: 'Own data', clientId }
    }
    return { allowed: false, reason: 'Cannot access other athlete data' }
  }

  // For coaches, check various relationships
  if (user.role === 'COACH') {
    // Check 1: Direct client ownership (coach created this client)
    const ownedClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: userId
      }
    })

    if (ownedClient) {
      return { allowed: true, reason: 'Client owner', clientId }
    }

    // Check 2: Assigned coach relationship
    const assignedCoach = await prisma.assignedCoach.findFirst({
      where: {
        clientId,
        coachId: userId,
        isActive: true
      }
    })

    if (assignedCoach) {
      return { allowed: true, reason: 'Assigned coach', clientId }
    }

    // Check 3: Same business membership
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true }
    })

    if (client) {
      // Get both users' business memberships
      const [coachMemberships, clientOwnerMemberships] = await Promise.all([
        prisma.businessMember.findMany({
          where: { userId, isActive: true },
          select: { businessId: true }
        }),
        prisma.businessMember.findMany({
          where: { userId: client.userId, isActive: true },
          select: { businessId: true }
        })
      ])

      const coachBusinessIds = new Set(coachMemberships.map(m => m.businessId))
      const sharedBusiness = clientOwnerMemberships.some(m => coachBusinessIds.has(m.businessId))

      if (sharedBusiness) {
        return { allowed: true, reason: 'Same business', clientId }
      }
    }

    // Check 4: Team assignment (coach assigned to manage athlete's team)
    const clientWithTeam = await prisma.client.findUnique({
      where: { id: clientId },
      select: { teamId: true }
    })

    if (clientWithTeam?.teamId) {
      const teamCoach = await prisma.teamCoach.findFirst({
        where: {
          teamId: clientWithTeam.teamId,
          coachId: userId,
          isActive: true
        }
      })

      if (teamCoach) {
        return { allowed: true, reason: 'Team coach', clientId }
      }
    }

    return { allowed: false, reason: 'No coach-athlete relationship' }
  }

  // For physios, delegate to physio access checks
  if (user.role === 'PHYSIO') {
    const { canAccessAthleteAsPhysio } = await import('@/lib/auth-utils')
    const canAccess = await canAccessAthleteAsPhysio(userId, clientId)

    if (canAccess) {
      return { allowed: true, reason: 'Physio assignment', clientId }
    }
    return { allowed: false, reason: 'No physio assignment' }
  }

  return { allowed: false, reason: 'Unknown role' }
}

/**
 * Verify athlete data ownership for deletion/modification operations
 * Only the athlete themselves can delete their own data
 *
 * @param userId - The user attempting the operation
 * @param clientId - The client whose data is being modified
 * @returns Whether the user owns this athlete data
 */
export async function verifyAthleteDataOwnership(
  userId: string,
  clientId: string
): Promise<AthleteAccessResult> {
  // Get the athlete account for this user
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true }
  })

  if (!athleteAccount) {
    return { allowed: false, reason: 'No athlete account' }
  }

  if (athleteAccount.clientId !== clientId) {
    return { allowed: false, reason: 'Cannot modify another athlete\'s data' }
  }

  return { allowed: true, reason: 'Data owner', clientId: athleteAccount.clientId }
}

/**
 * Get the clientId for an authenticated user (for athletes)
 * This ensures we always use the user's actual clientId, not one from request body
 *
 * @param userId - The authenticated user's ID
 * @returns The clientId or null if user is not an athlete
 */
export async function getAuthenticatedAthleteClientId(
  userId: string
): Promise<string | null> {
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId },
    select: { clientId: true }
  })

  return athleteAccount?.clientId ?? null
}
