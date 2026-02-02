/**
 * Business Access Authorization Helper
 *
 * Provides authorization checks for business-scoped operations.
 * Verifies business membership and role-based access.
 */

import { prisma } from '@/lib/prisma'

export type BusinessRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'COACH' | 'MEMBER'

export interface BusinessAccessResult {
  allowed: boolean
  reason?: string
  businessId?: string
  role?: BusinessRole
}

/**
 * Check if a user is a member of a specific business
 *
 * @param userId - The user to check
 * @param businessId - The business to check membership for
 * @returns Whether the user is a member and their role
 */
export async function requireBusinessMember(
  userId: string,
  businessId: string
): Promise<BusinessAccessResult> {
  // First check if user is a global admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role === 'ADMIN') {
    return { allowed: true, reason: 'Global admin', businessId, role: 'ADMIN' }
  }

  // Check business membership
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      isActive: true
    },
    select: {
      role: true,
      businessId: true
    }
  })

  if (!membership) {
    return { allowed: false, reason: 'Not a member of this business' }
  }

  return {
    allowed: true,
    reason: 'Business member',
    businessId: membership.businessId,
    role: membership.role as BusinessRole
  }
}

/**
 * Check if a user has admin-level access to a business
 * (OWNER or ADMIN role)
 *
 * @param userId - The user to check
 * @param businessId - The business to check admin access for
 * @returns Whether the user has admin access
 */
export async function requireBusinessAdmin(
  userId: string,
  businessId: string
): Promise<BusinessAccessResult> {
  // First check if user is a global admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role === 'ADMIN') {
    return { allowed: true, reason: 'Global admin', businessId, role: 'ADMIN' }
  }

  // Check business membership with admin role
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      isActive: true,
      role: { in: ['OWNER', 'ADMIN'] }
    },
    select: {
      role: true,
      businessId: true
    }
  })

  if (!membership) {
    return { allowed: false, reason: 'Not a business admin' }
  }

  return {
    allowed: true,
    reason: 'Business admin',
    businessId: membership.businessId,
    role: membership.role as BusinessRole
  }
}

/**
 * Check if a user has manager-level access to a business
 * (OWNER, ADMIN, or MANAGER role)
 *
 * @param userId - The user to check
 * @param businessId - The business to check manager access for
 * @returns Whether the user has manager access
 */
export async function requireBusinessManager(
  userId: string,
  businessId: string
): Promise<BusinessAccessResult> {
  // First check if user is a global admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (user?.role === 'ADMIN') {
    return { allowed: true, reason: 'Global admin', businessId, role: 'ADMIN' }
  }

  // Check business membership with manager role or higher
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      isActive: true,
      role: { in: ['OWNER', 'ADMIN', 'MANAGER'] }
    },
    select: {
      role: true,
      businessId: true
    }
  })

  if (!membership) {
    return { allowed: false, reason: 'Not a business manager' }
  }

  return {
    allowed: true,
    reason: 'Business manager',
    businessId: membership.businessId,
    role: membership.role as BusinessRole
  }
}

/**
 * Get all businesses a user belongs to
 *
 * @param userId - The user to get businesses for
 * @returns Array of business memberships
 */
export async function getUserBusinesses(userId: string) {
  return prisma.businessMember.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true
        }
      }
    }
  })
}

/**
 * Validate business ID from request parameters
 * Ensures the business exists and is active
 *
 * @param businessId - The business ID to validate
 * @returns The business if valid, null otherwise
 */
export async function validateBusiness(businessId: string) {
  return prisma.business.findFirst({
    where: {
      id: businessId,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      slug: true
    }
  })
}
