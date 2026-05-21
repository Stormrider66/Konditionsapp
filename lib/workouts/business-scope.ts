import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getWorkoutBusinessTag } from '@/lib/workouts/business-tags'

type BusinessScopedRequest = Parameters<typeof getRequestedBusinessScope>[0]

export interface ResolvedWorkoutBusinessScope {
  requested: boolean
  businessId?: string
}

export async function resolveWorkoutBusinessScope(
  userId: string,
  request: BusinessScopedRequest
): Promise<ResolvedWorkoutBusinessScope | null> {
  const scope = getRequestedBusinessScope(request)
  const requested = Boolean(scope.businessId || scope.businessSlug)

  if (!requested) {
    return { requested: false }
  }

  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(scope.businessId ? { businessId: scope.businessId } : {}),
      business: {
        isActive: true,
        ...(scope.businessSlug ? { slug: scope.businessSlug } : {}),
      },
    },
    select: { businessId: true },
  })

  if (!membership) {
    return null
  }

  return {
    requested: true,
    businessId: membership.businessId,
  }
}

export function cardioBusinessScopeWhere(businessId: string): Prisma.CardioSessionWhereInput {
  return {
    OR: [
      { tags: { has: getWorkoutBusinessTag(businessId) } },
      { assignments: { some: { athlete: { businessId } } } },
      {
        teamWorkoutBroadcasts: {
          some: {
            team: {
              members: {
                some: { businessId },
              },
            },
          },
        },
      },
      {
        tags: { isEmpty: true },
        assignments: { none: {} },
        teamWorkoutBroadcasts: { none: {} },
      },
    ],
  }
}

export function hybridBusinessScopeWhere(businessId: string): Prisma.HybridWorkoutWhereInput {
  return {
    OR: [
      { tags: { has: getWorkoutBusinessTag(businessId) } },
      { assignments: { some: { athlete: { businessId } } } },
      {
        teamWorkoutBroadcasts: {
          some: {
            team: {
              members: {
                some: { businessId },
              },
            },
          },
        },
      },
      {
        tags: { isEmpty: true },
        assignments: { none: {} },
        teamWorkoutBroadcasts: { none: {} },
      },
    ],
  }
}

export function agilityBusinessScopeWhere(businessId: string): Prisma.AgilityWorkoutWhereInput {
  return {
    OR: [
      { tags: { has: getWorkoutBusinessTag(businessId) } },
      { assignments: { some: { athlete: { businessId } } } },
      {
        teamWorkoutBroadcasts: {
          some: {
            team: {
              members: {
                some: { businessId },
              },
            },
          },
        },
      },
      {
        tags: { isEmpty: true },
        assignments: { none: {} },
        teamWorkoutBroadcasts: { none: {} },
      },
    ],
  }
}

export function cardioSessionAccessWhere(
  userId: string,
  businessId?: string
): Prisma.CardioSessionWhereInput {
  const accessWhere: Prisma.CardioSessionWhereInput = {
    OR: [{ coachId: userId }, { isPublic: true }],
  }

  if (!businessId) {
    return accessWhere
  }

  return { AND: [accessWhere, cardioBusinessScopeWhere(businessId)] }
}

export function ownedCardioSessionWhere(
  sessionId: string,
  userId: string,
  businessId?: string
): Prisma.CardioSessionWhereInput {
  const ownerWhere: Prisma.CardioSessionWhereInput = {
    id: sessionId,
    coachId: userId,
  }

  if (!businessId) {
    return ownerWhere
  }

  return { AND: [ownerWhere, cardioBusinessScopeWhere(businessId)] }
}

export function hybridWorkoutAccessWhere(
  userId: string,
  businessId?: string
): Prisma.HybridWorkoutWhereInput {
  const ownedOrSharedWhere: Prisma.HybridWorkoutWhereInput = {
    OR: [{ coachId: userId }, { isPublic: true }],
  }

  if (!businessId) {
    return {
      OR: [
        { coachId: userId },
        { isPublic: true },
        { coachId: null },
      ],
    }
  }

  return {
    OR: [
      { coachId: null },
      { AND: [ownedOrSharedWhere, hybridBusinessScopeWhere(businessId)] },
    ],
  }
}

export function ownedHybridWorkoutWhere(
  workoutId: string,
  userId: string,
  businessId?: string
): Prisma.HybridWorkoutWhereInput {
  const ownerWhere: Prisma.HybridWorkoutWhereInput = {
    id: workoutId,
    coachId: userId,
  }

  if (!businessId) {
    return ownerWhere
  }

  return { AND: [ownerWhere, hybridBusinessScopeWhere(businessId)] }
}

export function agilityWorkoutAccessWhere(
  userId: string,
  businessId?: string
): Prisma.AgilityWorkoutWhereInput {
  const accessWhere: Prisma.AgilityWorkoutWhereInput = {
    OR: [{ coachId: userId }, { isPublic: true }],
  }

  if (!businessId) {
    return accessWhere
  }

  return { AND: [accessWhere, agilityBusinessScopeWhere(businessId)] }
}

export function ownedAgilityWorkoutWhere(
  workoutId: string,
  userId: string,
  businessId?: string
): Prisma.AgilityWorkoutWhereInput {
  const ownerWhere: Prisma.AgilityWorkoutWhereInput = {
    id: workoutId,
    coachId: userId,
  }

  if (!businessId) {
    return ownerWhere
  }

  return { AND: [ownerWhere, agilityBusinessScopeWhere(businessId)] }
}
