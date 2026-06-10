import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { User, UserRole, AdminRole } from '@/types'
import {
  canAccessCoachPlatform,
  canAccessPhysioPlatform,
} from '@/lib/user-capabilities'
import { getCurrentUser } from './current-user'

export async function requireRole(role: UserRole): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== role && user.role !== 'ADMIN') {
    throw new Error(`Access denied. Required role: ${role}`)
  }
  return user
}

export async function requireCoach(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const hasCoachAccess = await canAccessCoachPlatform(user.id)
  if (!hasCoachAccess) throw new Error('Access denied. Coach access required.')
  return user
}

export async function requireAthlete(): Promise<User> {
  return requireRole('ATHLETE')
}

/**
 * Require user to be a platform admin (User.role = ADMIN or adminRole set).
 * This is for the platform-level admin panel, not business-level admin.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN' && !user.adminRole) {
    throw new Error('Access denied. Platform admin access required.')
  }
  return user
}

export interface AdminUser extends User {
  adminRole: AdminRole | null
}

export function resolveEffectiveAdminRole(
  role: UserRole | string | null | undefined,
  adminRole: AdminRole | string | null | undefined
): AdminRole | null {
  if (adminRole === 'SUPER_ADMIN' || adminRole === 'ADMIN' || adminRole === 'SUPPORT') {
    return adminRole
  }

  return role === 'ADMIN' ? 'SUPER_ADMIN' : null
}

/**
 * Require user to have an admin role.
 * @param requiredRoles - admin roles that are allowed
 */
export async function requireAdminRole(requiredRoles: AdminRole[]): Promise<AdminUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized: not authenticated')

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminRole: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!fullUser) throw new Error('Unauthorized: user not found')

  // Migration 20260609_backfill_admin_role sets adminRole=SUPER_ADMIN for
  // legacy role=ADMIN users. Keep that same effective role during deploys
  // where the code reaches production before the backfill has completed.
  const effectiveAdminRole = resolveEffectiveAdminRole(fullUser.role, fullUser.adminRole)

  if (effectiveAdminRole === 'SUPER_ADMIN') {
    return { ...user, adminRole: 'SUPER_ADMIN' } as AdminUser
  }

  if (!effectiveAdminRole || !requiredRoles.includes(effectiveAdminRole)) {
    throw new Error(`Forbidden: requires one of these roles: ${requiredRoles.join(', ')}`)
  }

  return { ...user, adminRole: effectiveAdminRole } as AdminUser
}

export async function hasAdminRole(requiredRoles: AdminRole[]): Promise<boolean> {
  try {
    await requireAdminRole(requiredRoles)
    return true
  } catch {
    return false
  }
}

export interface PhysioUser extends User {
  physioAssignments?: {
    id: string
    clientId: string | null
    teamId: string | null
    organizationId: string | null
    businessId: string | null
    locationId: string | null
    role: 'PRIMARY' | 'SECONDARY' | 'CONSULTANT'
    canModifyPrograms: boolean
    canCreateRestrictions: boolean
    canViewFullHistory: boolean
  }[]
}

export async function requirePhysio(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const hasPhysioAccess = await canAccessPhysioPlatform(user.id)
  if (!hasPhysioAccess) throw new Error('Access denied. Physiotherapist access required.')
  return user
}

export async function requirePhysioWithAssignments(): Promise<PhysioUser> {
  const user = await requirePhysio()
  const assignments = await prisma.physioAssignment.findMany({
    where: { physioUserId: user.id, isActive: true },
    select: {
      id: true,
      clientId: true,
      teamId: true,
      organizationId: true,
      businessId: true,
      locationId: true,
      role: true,
      canModifyPrograms: true,
      canCreateRestrictions: true,
      canViewFullHistory: true,
    },
  })

  return {
    ...user,
    physioAssignments: assignments.map(a => ({
      ...a,
      role: a.role as 'PRIMARY' | 'SECONDARY' | 'CONSULTANT',
    })),
  }
}

/** Alias for requirePhysio for call-site clarity. */
export async function requirePhysioOrAdmin(): Promise<User> {
  return requirePhysio()
}
