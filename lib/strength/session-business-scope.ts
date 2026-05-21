import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getStrengthBusinessTag } from '@/lib/strength/session-business-tags'

type BusinessScopedRequest = Parameters<typeof getRequestedBusinessScope>[0]

export interface ResolvedStrengthBusinessScope {
  requested: boolean
  businessId?: string
}

export async function resolveStrengthBusinessScope(
  userId: string,
  request: BusinessScopedRequest
): Promise<ResolvedStrengthBusinessScope | null> {
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

export function strengthBusinessScopeWhere(businessId: string): Prisma.StrengthSessionWhereInput {
  return {
    OR: [
      { tags: { has: getStrengthBusinessTag(businessId) } },
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
      // Legacy drafts created before business scoping had no reliable business
      // marker until they were assigned. Keep unassigned, untagged drafts visible
      // so coaches can open and save them into the current business.
      {
        tags: { isEmpty: true },
        assignments: { none: {} },
        teamWorkoutBroadcasts: { none: {} },
      },
    ],
  }
}

export function strengthSessionAccessWhere(
  userId: string,
  businessId?: string
): Prisma.StrengthSessionWhereInput {
  const ownerWhere: Prisma.StrengthSessionWhereInput = {
    OR: [{ coachId: userId }, { isPublic: true }],
  }

  if (!businessId) {
    return ownerWhere
  }

  return {
    AND: [ownerWhere, strengthBusinessScopeWhere(businessId)],
  }
}

export function ownedStrengthSessionWhere(
  sessionId: string,
  userId: string,
  businessId?: string
): Prisma.StrengthSessionWhereInput {
  const ownerWhere: Prisma.StrengthSessionWhereInput = {
    id: sessionId,
    coachId: userId,
  }

  if (!businessId) {
    return ownerWhere
  }

  return {
    AND: [ownerWhere, strengthBusinessScopeWhere(businessId)],
  }
}
