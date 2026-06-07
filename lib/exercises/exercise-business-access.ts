import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { STAR_EXERCISE_LIBRARY_SLUGS, isStarExerciseLibrarySlug } from '@/lib/exercises/star-exercise-library'

export const BUSINESS_EXERCISE_ROLES = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
]

interface BusinessScope {
  businessId?: string | null
  businessSlug?: string | null
}

export interface ExerciseShareScope {
  businessIds: string[]
  primaryBusinessId: string
}

export async function getActiveExerciseBusinessIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      business: { isActive: true },
    },
    select: { businessId: true },
  })

  return memberships.map((membership) => membership.businessId)
}

export function getBusinessExerciseAccessClauses(businessIds: string[]): Prisma.ExerciseWhereInput[] {
  if (businessIds.length === 0) return []
  return [
    { businessId: { in: businessIds } },
    { businessShares: { some: { businessId: { in: businessIds } } } },
  ]
}

export async function resolveExerciseBusinessMembershipId(
  userId: string,
  scope: BusinessScope
): Promise<string | null> {
  if (!scope.businessId && !scope.businessSlug) return null

  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      ...(scope.businessId ? { businessId: scope.businessId } : {}),
      business: {
        isActive: true,
        ...(scope.businessSlug ? { slug: scope.businessSlug } : {}),
      },
    },
    select: { businessId: true },
  })

  return membership?.businessId ?? null
}

export async function resolveStarExerciseShareScope(
  userId: string,
  scope: BusinessScope,
  options: { isAdmin?: boolean } = {}
): Promise<ExerciseShareScope | null> {
  const businesses = await prisma.business.findMany({
    where: {
      slug: { in: Array.from(STAR_EXERCISE_LIBRARY_SLUGS) },
      isActive: true,
    },
    select: { id: true, slug: true },
  })
  if (businesses.length !== STAR_EXERCISE_LIBRARY_SLUGS.length) return null

  const businessBySlug = new Map(businesses.map((business) => [business.slug, business]))
  const businessById = new Map(businesses.map((business) => [business.id, business]))
  const businessIds = STAR_EXERCISE_LIBRARY_SLUGS
    .map((slug) => businessBySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id))

  if (options.isAdmin) {
    const scopedBusiness =
      (scope.businessSlug && businessBySlug.get(scope.businessSlug)) ||
      (scope.businessId && businessById.get(scope.businessId)) ||
      businessBySlug.get('star-by-th') ||
      businesses[0]

    return { businessIds, primaryBusinessId: scopedBusiness.id }
  }

  const memberships = await prisma.businessMember.findMany({
    where: {
      userId,
      isActive: true,
      role: { in: BUSINESS_EXERCISE_ROLES },
      business: {
        isActive: true,
        slug: { in: Array.from(STAR_EXERCISE_LIBRARY_SLUGS) },
      },
    },
    select: {
      businessId: true,
      business: { select: { slug: true } },
    },
  })
  if (memberships.length === 0) return null

  const memberBusinessIds = new Set(memberships.map((membership) => membership.businessId))
  const scopedMembership = memberships.find((membership) => {
    if (scope.businessId) return membership.businessId === scope.businessId
    if (scope.businessSlug) return membership.business.slug === scope.businessSlug
    return false
  })
  const fallbackMembership = STAR_EXERCISE_LIBRARY_SLUGS
    .map((slug) => memberships.find((membership) => membership.business.slug === slug))
    .find(Boolean)

  const primaryBusinessId = scopedMembership?.businessId ?? fallbackMembership?.businessId
  if (!primaryBusinessId || !memberBusinessIds.has(primaryBusinessId)) return null

  return { businessIds, primaryBusinessId }
}

export function isStarExerciseShareRequest(value: unknown): value is 'STAR_NETWORK' {
  return value === 'STAR_NETWORK'
}

export function isStarExerciseBusinessSlug(slug?: string | null): boolean {
  return isStarExerciseLibrarySlug(slug)
}
