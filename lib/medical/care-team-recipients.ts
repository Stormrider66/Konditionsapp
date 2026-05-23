import { prisma } from '@/lib/prisma'

const MEDICAL_STAFF_BUSINESS_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
] as const

async function getClientMedicalScope(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      userId: true,
      businessId: true,
      teamId: true,
      team: { select: { organizationId: true } },
      athleteAccount: { select: { preferredLocationId: true } },
    },
  })

  if (!client) return null

  const businessIds = new Set<string>()
  if (client.businessId) businessIds.add(client.businessId)

  if (client.userId) {
    const coachBusinesses = await prisma.businessMember.findMany({
      where: { userId: client.userId, isActive: true },
      select: { businessId: true },
    })
    coachBusinesses.forEach((membership) => businessIds.add(membership.businessId))
  }

  return {
    ...client,
    businessIds: Array.from(businessIds),
  }
}

export async function getAssignedPhysioUserIdsForClient(clientId: string): Promise<string[]> {
  const scope = await getClientMedicalScope(clientId)
  if (!scope) return []

  const assignmentScopes = [
    { clientId },
    ...(scope.teamId ? [{ teamId: scope.teamId }] : []),
    ...(scope.team?.organizationId ? [{ organizationId: scope.team.organizationId }] : []),
    ...(scope.businessIds.length > 0 ? [{ businessId: { in: scope.businessIds } }] : []),
    ...(scope.athleteAccount?.preferredLocationId
      ? [{ locationId: scope.athleteAccount.preferredLocationId }]
      : []),
  ]

  const assignments = await prisma.physioAssignment.findMany({
    where: {
      isActive: true,
      OR: assignmentScopes,
    },
    select: { physioUserId: true },
  })

  return Array.from(new Set(assignments.map((assignment) => assignment.physioUserId)))
}

export async function getTeamPhysioUserIdsForClient(clientId: string): Promise<string[]> {
  const scope = await getClientMedicalScope(clientId)
  if (!scope?.teamId) return []

  const now = new Date()
  const assignments = await prisma.physioAssignment.findMany({
    where: {
      isActive: true,
      OR: [
        { teamId: scope.teamId },
        ...(scope.team?.organizationId ? [{ organizationId: scope.team.organizationId }] : []),
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    select: { physioUserId: true },
  })

  return Array.from(new Set(assignments.map((assignment) => assignment.physioUserId)))
}

export async function canClientReportInjuryToTeamPhysio(clientId: string): Promise<boolean> {
  const teamPhysioIds = await getTeamPhysioUserIdsForClient(clientId)
  return teamPhysioIds.length > 0
}

export async function getMedicalNotificationRecipientIdsForClient(
  clientId: string,
  excludeUserIds: string[] = []
): Promise<string[]> {
  const scope = await getClientMedicalScope(clientId)
  if (!scope) return []

  const recipients = new Set<string>()
  const excluded = new Set(excludeUserIds)

  if (scope.userId) recipients.add(scope.userId)

  const [assignedPhysios, teamStaff, businessStaff] = await Promise.all([
    getAssignedPhysioUserIdsForClient(clientId),
    scope.teamId
      ? prisma.teamCoachAssignment.findMany({
          where: { teamId: scope.teamId },
          select: { userId: true },
        })
      : Promise.resolve([]),
    scope.businessIds.length > 0
      ? prisma.businessMember.findMany({
          where: {
            businessId: { in: scope.businessIds },
            isActive: true,
            role: { in: [...MEDICAL_STAFF_BUSINESS_ROLES] },
          },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ])

  assignedPhysios.forEach((userId) => recipients.add(userId))
  teamStaff.forEach((assignment) => recipients.add(assignment.userId))
  businessStaff.forEach((membership) => recipients.add(membership.userId))

  excluded.forEach((userId) => recipients.delete(userId))
  return Array.from(recipients)
}
