import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface ConnectOptions {
  assignedByUserId?: string
  businessId?: string | null
}

/**
 * Auto-connect a client to the coach who owns the team.
 *
 * Steps (all in a transaction):
 * 1. Look up the team's coach (Team.userId)
 * 2. Skip if client already belongs to that coach
 * 3. If client has a different active CoachAgreement, end it
 * 4. Update Client.userId to the team coach
 * 5. Create a new CoachAgreement
 * 6. Update AthleteSubscription.assignedCoachId if exists
 *
 * Design: Removing an athlete from a team does NOT auto-disconnect
 * from the coach — that must be done explicitly.
 */
export async function connectTeamMemberToCoach(
  clientId: string,
  teamId: string,
  options?: ConnectOptions
): Promise<{ connected: boolean; coachUserId?: string }> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { userId: true },
  })

  if (!team) {
    logger.warn('connectTeamMemberToCoach: team not found', { teamId })
    return { connected: false }
  }

  const teamCoachId = team.userId

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true, businessId: true },
  })

  if (!client) {
    logger.warn('connectTeamMemberToCoach: client not found', { clientId })
    return { connected: false }
  }

  // Already connected to this coach — nothing to do
  if (client.userId === teamCoachId) {
    return { connected: true, coachUserId: teamCoachId }
  }

  const businessId = options?.businessId ?? client.businessId

  await prisma.$transaction(async (tx) => {
    // End any existing active CoachAgreement for this client
    await tx.coachAgreement.updateMany({
      where: {
        athleteClientId: clientId,
        status: 'ACTIVE',
      },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
        endReason: 'TEAM_REASSIGNMENT',
      },
    })

    // Update client's coach
    await tx.client.update({
      where: { id: clientId },
      data: { userId: teamCoachId },
    })

    // Create new CoachAgreement (upsert to handle unique constraint)
    await tx.coachAgreement.upsert({
      where: {
        athleteClientId_coachUserId: {
          athleteClientId: clientId,
          coachUserId: teamCoachId,
        },
      },
      create: {
        athleteClientId: clientId,
        coachUserId: teamCoachId,
        businessId: businessId ?? undefined,
        assignedByUserId: options?.assignedByUserId ?? undefined,
        revenueSharePercent: 0,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        startedAt: new Date(),
        endedAt: null,
        endReason: null,
        assignedByUserId: options?.assignedByUserId ?? undefined,
      },
    })

    // Update AthleteSubscription.assignedCoachId if it exists
    await tx.athleteSubscription.updateMany({
      where: { clientId },
      data: { assignedCoachId: teamCoachId },
    })
  })

  logger.info('connectTeamMemberToCoach: client reassigned to team coach', {
    clientId,
    teamId,
    previousCoachId: client.userId,
    newCoachId: teamCoachId,
  })

  return { connected: true, coachUserId: teamCoachId }
}

/**
 * Bulk-reconnect all team members to a new coach.
 * Useful when a team's coach changes (Team.userId is updated).
 *
 * Not yet hooked up — the team update API doesn't currently allow
 * changing userId. Ready for future use.
 */
export async function reassignTeamMembersToNewCoach(
  teamId: string,
  newCoachUserId: string,
  options?: { assignedByUserId?: string; businessId?: string | null }
): Promise<{ reconnected: number }> {
  const members = await prisma.client.findMany({
    where: { teamId },
    select: { id: true },
  })

  let reconnected = 0
  for (const member of members) {
    const result = await connectTeamMemberToCoach(member.id, teamId, {
      assignedByUserId: options?.assignedByUserId,
      businessId: options?.businessId,
    })
    if (result.connected) reconnected++
  }

  return { reconnected }
}
