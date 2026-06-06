/**
 * Staff Permission System (server)
 *
 * Server-only helpers that resolve permissions and team access against the
 * database. The pure role constants/labels/matrix live in `./staff-roles`
 * (client-safe, no Prisma) and are re-exported here so existing imports of
 * `@/lib/permissions/assistant-coach` keep working.
 *
 * IMPORTANT: This module imports Prisma — do NOT import it from a client
 * component. Client components must import role helpers from `./staff-roles`.
 */

import { prisma } from '@/lib/prisma'
import {
  ROLE_LABELS,
  PERMISSION_MATRIX,
  type StaffRole,
  type AppLocale,
  type StaffPermissions,
} from './staff-roles'

// Re-export the client-safe role API for backwards compatibility.
export {
  ROLE_LABELS,
  roleLabelFor,
  invitableRolesFor,
  isRoleInvitableFor,
  INVITABLE_ROLES,
  PERMISSION_MATRIX,
} from './staff-roles'
export type { StaffRole, AppLocale, BusinessType, InvitableRole, StaffPermissions } from './staff-roles'

/**
 * Get permissions for a user in a business context.
 */
export async function getStaffPermissions(
  userId: string,
  businessSlug?: string,
  options?: { locale?: AppLocale; roleOverride?: StaffRole | null }
): Promise<StaffPermissions> {
  const locale = options?.locale ?? 'en'
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: { role: true },
  })

  const directAssignments = await prisma.teamCoachAssignment.findMany({
    where: { userId },
    select: { teamId: true },
  })
  const hasDirectTeamAssignment = directAssignments.length > 0
  const actualRole = (membership?.role || (hasDirectTeamAssignment ? 'ASSISTANT_COACH' : 'MEMBER')) as StaffRole
  const previewRole = options?.roleOverride ?? null
  const role = previewRole ?? actualRole

  // Check if user is a direct COACH (no business membership)
  if (!membership) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (user?.role === 'COACH' || user?.role === 'ADMIN') {
      return {
        ...PERMISSION_MATRIX.COACH,
        role: 'COACH',
        roleLabel: ROLE_LABELS[locale].COACH,
        assignedTeamIds: [],
      }
    }
  }

  const perms = PERMISSION_MATRIX[role] || PERMISSION_MATRIX.MEMBER

  // Get team assignments for team-scoped roles
  const assignedTeamIds = perms.isTeamScoped ? directAssignments.map((a) => a.teamId) : []

  return {
    ...perms,
    role,
    roleLabel: ROLE_LABELS[locale][role] || role,
    assignedTeamIds,
  }
}

/**
 * Check if a user can access a specific team.
 */
export async function canAccessTeam(userId: string, teamId: string): Promise<boolean> {
  // Check if user owns the team
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId },
  })
  if (team) return true

  // Check if user has a non-team-scoped role (OWNER, ADMIN, COACH)
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: ['OWNER', 'ADMIN', 'COACH'] },
    },
  })
  if (membership) return true

  // Check team-scoped assignment
  const assignment = await prisma.teamCoachAssignment.findFirst({
    where: { teamId, userId },
  })
  return assignment !== null
}

/**
 * Check if user can access a specific client (athlete).
 */
export async function canStaffAccessClient(userId: string, clientId: string): Promise<boolean> {
  const assignments = await prisma.teamCoachAssignment.findMany({
    where: { userId },
    select: { teamId: true },
  })

  if (assignments.length === 0) return false

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      teamId: { in: assignments.map((a) => a.teamId) },
    },
  })

  return client !== null
}
