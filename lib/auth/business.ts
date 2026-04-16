import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BusinessAdminUser, BusinessMemberRole } from '@/types'
import { ApiError } from '@/lib/api-error'
import { getCurrentUser, type RequestedBusinessScope } from './current-user'

/**
 * Get the business context for a user.
 * Returns null values if user is not a member of any business.
 */
export async function getBusinessContext(
  userId: string,
  scope?: RequestedBusinessScope
): Promise<{
  businessId: string | null
  role: BusinessMemberRole | null
  business: { id: string; name: string; slug: string } | null
}> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(scope?.businessId ? { businessId: scope.businessId } : {}),
      ...(scope?.businessSlug ? { business: { slug: scope.businessSlug } } : {}),
    },
    include: {
      business: { select: { id: true, name: true, slug: true } },
    },
    ...(scope?.businessId || scope?.businessSlug
      ? {}
      : { orderBy: { createdAt: 'asc' as const } }),
  })

  if (!membership) {
    return { businessId: null, role: null, business: null }
  }

  return {
    businessId: membership.businessId,
    role: membership.role as BusinessMemberRole,
    business: membership.business,
  }
}

/**
 * Require user to be a business OWNER or ADMIN.
 * Global ADMINs are allowed through to any business they're a member of.
 */
export async function requireBusinessAdminRole(
  scope?: RequestedBusinessScope
): Promise<BusinessAdminUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let membership = await prisma.businessMember.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      role: { in: ['OWNER', 'ADMIN'] },
      ...(scope?.businessId ? { businessId: scope.businessId } : {}),
      ...(scope?.businessSlug ? { business: { slug: scope.businessSlug } } : {}),
    },
    include: {
      business: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!membership && user.role === 'ADMIN') {
    membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        ...(scope?.businessId ? { businessId: scope.businessId } : {}),
        ...(scope?.businessSlug ? { business: { slug: scope.businessSlug } } : {}),
      },
      include: {
        business: { select: { id: true, name: true, slug: true } },
      },
    })
  }

  if (!membership) {
    throw new Error('Access denied. Business admin role required.')
  }

  return {
    ...user,
    businessId: membership.businessId,
    businessRole: membership.role as 'OWNER' | 'ADMIN',
    business: membership.business,
  }
}

export async function hasBusinessAdminRole(): Promise<boolean> {
  try {
    await requireBusinessAdminRole()
    return true
  } catch {
    return false
  }
}

/**
 * Require that a user is an active member of a specific business.
 * For use in API routes under /api/business/[id]/*.
 * @throws ApiError 403 if user is not a member (or lacks required role)
 */
export async function requireBusinessMembership(
  userId: string,
  businessId: string,
  options?: { roles?: string[] }
): Promise<{ membershipId: string; role: string }> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
      isActive: true,
      ...(options?.roles ? { role: { in: options.roles } } : {}),
    },
    select: { id: true, role: true },
  })

  if (!membership) {
    throw ApiError.forbidden('Not a member of this business')
  }

  return { membershipId: membership.id, role: membership.role }
}
