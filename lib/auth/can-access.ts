import { prisma } from '@/lib/prisma'
import {
  canAccessCoachPlatform,
  canAccessPhysioPlatform,
} from '@/lib/user-capabilities'

const BUSINESS_EXERCISE_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
]

/**
 * Check if current user can access a training program.
 *  - Coaches see programs they created
 *  - Athletes see programs assigned to their client record
 *  - Admins see everything
 */
export async function canAccessProgram(
  userId: string,
  programId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: {
        include: {
          client: {
            include: {
              trainingPrograms: { where: { id: programId } },
            },
          },
        },
      },
    },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  if (await canAccessCoachPlatform(userId)) {
    const program = await prisma.trainingProgram.findFirst({
      where: { id: programId, coachId: userId },
    })
    return program !== null
  }

  if (user.role === 'ATHLETE' && user.athleteAccount) {
    return user.athleteAccount.client.trainingPrograms.some((p) => p.id === programId)
  }

  return false
}

/** Check if current user can access a workout (defers to program owner). */
export async function canAccessWorkout(
  userId: string,
  workoutId: string
): Promise<boolean> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: {
      day: {
        select: {
          week: {
            select: { program: { select: { clientId: true } } },
          },
        },
      },
    },
  })

  if (!workout) return false
  return canAccessClient(userId, workout.day.week.program.clientId)
}

/**
 * Check if current user can access a client.
 * Coach paths: ownership, business membership, direct assignment, team.
 * Athletes only see their own record.
 */
export async function canAccessClient(
  userId: string,
  clientId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteAccount: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  if (user.role === 'ATHLETE' && user.athleteAccount) {
    return user.athleteAccount.clientId === clientId
  }

  const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
    canAccessCoachPlatform(userId),
    canAccessPhysioPlatform(userId),
  ])

  if (hasPhysioAccess) {
    if (await canAccessAthleteAsPhysio(userId, clientId)) return true
  }

  if (hasCoachAccess) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    })
    if (client) return true

    const coachAgreement = prisma.coachAgreement?.findFirst
      ? await prisma.coachAgreement.findFirst({
          where: {
            athleteClientId: clientId,
            coachUserId: userId,
            status: 'ACTIVE',
          },
          select: { id: true },
        })
      : null
    if (coachAgreement) return true

    const [memberships, clientTeam] = await Promise.all([
      prisma.businessMember?.findMany
        ? prisma.businessMember.findMany({
            where: {
              userId,
              isActive: true,
              role: { in: ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH'] },
            },
            select: { businessId: true, role: true },
          })
        : Promise.resolve([]),
      prisma.client.findUnique({
        where: { id: clientId },
        select: { businessId: true, teamId: true },
      }),
    ])

    if (clientTeam?.businessId) {
      const membershipBusinessIds = new Set(
        memberships
          .filter((m) => ['OWNER', 'ADMIN', 'COACH'].includes(m.role))
          .map((m) => m.businessId)
      )
      if (membershipBusinessIds.has(clientTeam.businessId)) return true
    }

    if (clientTeam?.teamId) {
      const team = prisma.team?.findFirst
        ? await prisma.team.findFirst({
            where: { id: clientTeam.teamId, userId },
            select: { id: true },
          })
        : null
      if (team) return true

      const assistantAssignment = await prisma.teamCoachAssignment.findFirst({
        where: { teamId: clientTeam.teamId, userId },
      })
      if (assistantAssignment) return true
    }

    return false
  }

  return false
}

/**
 * Check if current user can access an exercise.
 *  - Public exercises are accessible to everyone
 *  - Coaches see exercises they created
 *  - Athletes see exercises created by their coach
 *  - Admins see everything
 */
export async function canAccessExercise(
  userId: string,
  exerciseId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      athleteAccount: { include: { client: { select: { userId: true, businessId: true } } } },
    },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { isPublic: true, coachId: true, businessId: true },
  })

  if (!exercise) return false
  if (exercise.isPublic) return true

  if (await canAccessCoachPlatform(userId)) {
    if (exercise.coachId === userId) return true
    if (!exercise.businessId) return false

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: exercise.businessId,
        isActive: true,
        role: { in: BUSINESS_EXERCISE_ROLES },
      },
      select: { id: true },
    })

    return Boolean(membership)
  }

  if (user.role === 'ATHLETE') {
    const coachId = user.athleteAccount?.client.userId
    if (coachId && exercise.coachId === coachId) return true
    const businessId = user.athleteAccount?.client.businessId
    return Boolean(businessId && exercise.businessId === businessId)
  }

  return false
}

/**
 * Check if a physio user can access a specific athlete through any of their
 * direct / team / organization / business / location assignments.
 */
export async function canAccessAthleteAsPhysio(
  physioUserId: string,
  clientId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: physioUserId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  const hasPhysioAccess = await canAccessPhysioPlatform(physioUserId)
  if (!hasPhysioAccess) return false

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      userId: true,
      teamId: true,
      team: { select: { organizationId: true } },
      athleteAccount: { select: { preferredLocationId: true } },
    },
  })

  if (!client) return false

  const assignments = await prisma.physioAssignment.findMany({
    where: { physioUserId, isActive: true },
  })

  for (const assignment of assignments) {
    if (assignment.clientId && assignment.clientId === clientId) return true
    if (assignment.teamId && client.teamId === assignment.teamId) return true
    if (
      assignment.organizationId &&
      client.team?.organizationId === assignment.organizationId
    ) {
      return true
    }
    if (assignment.businessId) {
      const coachBusiness = await prisma.businessMember.findFirst({
        where: {
          userId: client.userId,
          businessId: assignment.businessId,
          isActive: true,
        },
      })
      if (coachBusiness) return true
    }
    if (
      assignment.locationId &&
      client.athleteAccount?.preferredLocationId === assignment.locationId
    ) {
      return true
    }
  }

  return false
}

/** Get all programs accessible by current user. */
export async function getAccessiblePrograms(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athleteAccount: true },
  })
  if (!user) return []

  if (user.role === 'ADMIN' || await canAccessCoachPlatform(userId)) {
    return prisma.trainingProgram.findMany({
      where: { coachId: userId },
      include: { client: true, test: true },
      orderBy: { startDate: 'desc' },
    })
  }

  if (user.role === 'ATHLETE' && user.athleteAccount) {
    return prisma.trainingProgram.findMany({
      where: { clientId: user.athleteAccount.clientId },
      include: { client: true, test: true },
      orderBy: { startDate: 'desc' },
    })
  }

  return []
}

/**
 * Verify that a client belongs to the given coach (userId).
 * Throws with statusCode=403 on failure — suitable for API-route catch blocks.
 */
export async function requireClientOwnership(
  clientId: string,
  userId: string
): Promise<{ id: string; name: string; userId: string }> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true, name: true, userId: true },
  })

  if (!client) {
    const error = new Error('Client not found or access denied')
    ;(error as Error & { statusCode: number }).statusCode = 403
    throw error
  }

  return client
}

/** Can this user create training restrictions for clientId? */
export async function canCreateRestrictions(
  userId: string,
  clientId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  if (await canAccessCoachPlatform(userId)) {
    if (await canAccessClient(userId, clientId)) return true
  }

  if (await canAccessPhysioPlatform(userId)) {
    if (!(await canAccessAthleteAsPhysio(userId, clientId))) return false
    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: userId,
        isActive: true,
        canCreateRestrictions: true,
      },
    })
    return assignments.length > 0
  }

  return false
}

/** Can this user modify training programs for clientId? */
export async function canModifyProgramsAsPhysio(
  userId: string,
  clientId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true

  if (await canAccessCoachPlatform(userId)) {
    if (await canAccessClient(userId, clientId)) return true
  }

  if (await canAccessPhysioPlatform(userId)) {
    if (!(await canAccessAthleteAsPhysio(userId, clientId))) return false
    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: userId,
        isActive: true,
        canModifyPrograms: true,
      },
    })
    return assignments.length > 0
  }

  return false
}
