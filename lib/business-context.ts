// lib/business-context.ts
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { BusinessMemberRole } from '@/types'

/**
 * Get business by slug
 * Returns null if business not found or inactive
 */
export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      backgroundColor: true,
      fontFamily: true,
      faviconUrl: true,
      pageTitle: true,
      hidePlatformBranding: true,
    },
  })
}

/**
 * Validate that a user is a member of a business
 * Wrapped with React.cache() to deduplicate calls within a single request
 * (business layout + role layout + page all call this with the same args)
 */
export const validateBusinessMembership = cache(async (
  userId: string,
  businessSlug: string
): Promise<{
  businessId: string
  role: BusinessMemberRole
  business: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    backgroundColor: string | null
    fontFamily: string | null
    faviconUrl: string | null
    pageTitle: string | null
    hidePlatformBranding: boolean
  }
} | null> => {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      business: {
        slug: businessSlug,
        isActive: true,
      },
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          backgroundColor: true,
          fontFamily: true,
          faviconUrl: true,
          pageTitle: true,
          hidePlatformBranding: true,
        },
      },
    },
  })

  if (!membership) {
    return null
  }

  return {
    businessId: membership.businessId,
    role: membership.role as BusinessMemberRole,
    business: membership.business,
  }
})

/**
 * Get user's primary business slug for redirects
 * Returns the slug of their first active business membership
 */
export async function getUserPrimaryBusinessSlug(userId: string): Promise<string | null> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      business: {
        isActive: true,
      },
    },
    include: {
      business: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return membership?.business.slug ?? null
}

/**
 * Check if a path segment could be a business slug
 * Used to detect multi-tenant URLs
 */
export function isValidSlugFormat(segment: string): boolean {
  // Business slugs are lowercase alphanumeric with hyphens
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(segment)
}

/**
 * Known top-level routes that are NOT business slugs
 */
export const RESERVED_ROUTES = [
  'api',
  'coach',
  'athlete',
  'admin',
  'login',
  'logout',
  'signup',
  'register',
  'pricing',
  'test',
  'tests',
  'clients',
  'teams',
  'programs',
  'report',
  'simple-test',
  'cycling-test',
  'pdf-demo',
  'design-preview',
  'dev',
  '_next',
]

/**
 * Check if a route path should be treated as a business-scoped route
 */
export function isBusnessRoute(pathname: string): boolean {
  const firstSegment = pathname.split('/')[1]

  // If first segment is reserved, it's not a business route
  if (RESERVED_ROUTES.includes(firstSegment)) {
    return false
  }

  // Check if it looks like a valid slug
  return isValidSlugFormat(firstSegment)
}
