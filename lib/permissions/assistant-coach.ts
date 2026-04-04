/**
 * Assistant Coach Permission System
 *
 * Defines what assistant coaches can and cannot do.
 * Used by API routes and UI components to enforce access control.
 */

import { prisma } from '@/lib/prisma'

export interface AssistantCoachPermissions {
  isAssistantCoach: boolean
  /** Can view athletes, test results, programs (read-only) */
  canViewAthletes: boolean
  /** Can run interval timing sessions */
  canRunIntervals: boolean
  /** Can run physiological tests */
  canRunTests: boolean
  /** Can create team calendar events */
  canCreateEvents: boolean
  /** Can create/edit training programs */
  canEditPrograms: boolean
  /** Can access AI Studio features */
  canAccessAI: boolean
  /** Can manage billing/subscription */
  canManageBilling: boolean
  /** Can change business settings */
  canManageSettings: boolean
  /** Team IDs this assistant has access to */
  assignedTeamIds: string[]
}

const FULL_ACCESS: AssistantCoachPermissions = {
  isAssistantCoach: false,
  canViewAthletes: true,
  canRunIntervals: true,
  canRunTests: true,
  canCreateEvents: true,
  canEditPrograms: true,
  canAccessAI: true,
  canManageBilling: true,
  canManageSettings: true,
  assignedTeamIds: [],
}

/**
 * Get permissions for a user in a business context.
 * Returns full access for OWNER/ADMIN/COACH roles.
 * Returns restricted access for ASSISTANT_COACH.
 */
export async function getCoachPermissions(
  userId: string,
  businessSlug?: string
): Promise<AssistantCoachPermissions> {
  // Find the user's business membership
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: { role: true, businessId: true },
  })

  if (!membership) {
    // Check if user is a direct COACH (no business)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (user?.role === 'COACH' || user?.role === 'ADMIN') {
      return FULL_ACCESS
    }
    return { ...FULL_ACCESS, isAssistantCoach: true, canEditPrograms: false, canAccessAI: false, canManageBilling: false, canManageSettings: false, assignedTeamIds: [] }
  }

  // Full access for OWNER, ADMIN, COACH
  if (membership.role !== 'ASSISTANT_COACH') {
    return FULL_ACCESS
  }

  // Assistant coach - get team assignments
  const assignments = await prisma.teamCoachAssignment.findMany({
    where: { userId },
    select: {
      teamId: true,
      canRunTests: true,
      canRunIntervals: true,
      canCreateEvents: true,
    },
  })

  return {
    isAssistantCoach: true,
    canViewAthletes: true,
    canRunIntervals: assignments.some((a) => a.canRunIntervals),
    canRunTests: assignments.some((a) => a.canRunTests),
    canCreateEvents: assignments.some((a) => a.canCreateEvents),
    canEditPrograms: false,
    canAccessAI: false,
    canManageBilling: false,
    canManageSettings: false,
    assignedTeamIds: assignments.map((a) => a.teamId),
  }
}

/**
 * Check if a user can access a specific team (as assistant or coach).
 */
export async function canAccessTeam(userId: string, teamId: string): Promise<boolean> {
  // Check if user owns the team
  const team = await prisma.team.findFirst({
    where: { id: teamId, userId },
  })
  if (team) return true

  // Check assistant coach assignment
  const assignment = await prisma.teamCoachAssignment.findFirst({
    where: { teamId, userId },
  })
  return assignment !== null
}

/**
 * Check if user can access a specific client (athlete).
 * Assistant coaches can access athletes in their assigned teams.
 */
export async function canAssistantAccessClient(userId: string, clientId: string): Promise<boolean> {
  // Get assistant's team assignments
  const assignments = await prisma.teamCoachAssignment.findMany({
    where: { userId },
    select: { teamId: true },
  })

  if (assignments.length === 0) return false

  // Check if the client belongs to any of the assigned teams
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      teamId: { in: assignments.map((a) => a.teamId) },
    },
  })

  return client !== null
}
