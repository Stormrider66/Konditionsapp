/**
 * Staff Permission System
 *
 * Centralized permission definitions for all business roles.
 * Used by API routes and UI components to enforce access control.
 *
 * Role Hierarchy:
 * - OWNER:             Full access, billing
 * - ADMIN (Sportchef): Full view, staff management, no billing
 * - COACH (Huvudtränare): Full coaching, programs, AI, tests
 * - PHYSICAL_TRAINER (Fystränare): Programs, tests, intervals, studios (team-scoped)
 * - ASSISTANT_COACH (Assisterande tränare): Run tests/intervals, view only (team-scoped)
 * - PHYSIO (Fysioterapeut): Medical, restrictions, injury (team-scoped)
 */

import { prisma } from '@/lib/prisma'

export type StaffRole = 'OWNER' | 'ADMIN' | 'COACH' | 'PHYSICAL_TRAINER' | 'ASSISTANT_COACH' | 'PHYSIO' | 'MEMBER'

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Ägare',
  ADMIN: 'Sportchef',
  COACH: 'Huvudtränare',
  PHYSICAL_TRAINER: 'Fystränare',
  ASSISTANT_COACH: 'Assisterande tränare',
  PHYSIO: 'Fysioterapeut',
  MEMBER: 'Medlem',
}

export const INVITABLE_ROLES: { value: StaffRole; label: string; description: string }[] = [
  { value: 'COACH', label: 'Huvudtränare', description: 'Full tillgång till coaching, program och AI' },
  { value: 'PHYSICAL_TRAINER', label: 'Fystränare', description: 'Träningsprogram, tester, intervaller för tilldelade lag' },
  { value: 'ASSISTANT_COACH', label: 'Assisterande tränare', description: 'Köra tester och intervaller, visa resultat' },
  { value: 'PHYSIO', label: 'Fysioterapeut', description: 'Skadehantering och rehabilitering' },
  { value: 'ADMIN', label: 'Sportchef', description: 'Personalhantering, full översikt, kalender' },
]

export interface StaffPermissions {
  role: StaffRole
  roleLabel: string
  isTeamScoped: boolean

  // Content access
  canViewAthletes: boolean
  canViewTestResults: boolean
  canViewProgress: boolean

  // Training
  canEditPrograms: boolean
  canRunIntervals: boolean
  canRunTests: boolean
  canAccessStudios: boolean
  canAccessAI: boolean

  // Calendar
  canViewCalendar: boolean
  canCreateEvents: boolean

  // Management
  canInviteStaff: boolean
  canAssignTeams: boolean
  canManageBilling: boolean
  canManageSettings: boolean

  // Team scope
  assignedTeamIds: string[]
}

const PERMISSION_MATRIX: Record<string, Omit<StaffPermissions, 'role' | 'roleLabel' | 'assignedTeamIds'>> = {
  OWNER: {
    isTeamScoped: false,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: true, canRunIntervals: true, canRunTests: true, canAccessStudios: true, canAccessAI: true,
    canViewCalendar: true, canCreateEvents: true,
    canInviteStaff: true, canAssignTeams: true, canManageBilling: true, canManageSettings: true,
  },
  ADMIN: {
    isTeamScoped: false,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: false, canRunIntervals: false, canRunTests: false, canAccessStudios: false, canAccessAI: false,
    canViewCalendar: true, canCreateEvents: true,
    canInviteStaff: true, canAssignTeams: true, canManageBilling: false, canManageSettings: true,
  },
  COACH: {
    isTeamScoped: false,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: true, canRunIntervals: true, canRunTests: true, canAccessStudios: true, canAccessAI: true,
    canViewCalendar: true, canCreateEvents: true,
    canInviteStaff: false, canAssignTeams: false, canManageBilling: false, canManageSettings: false,
  },
  PHYSICAL_TRAINER: {
    isTeamScoped: true,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: true, canRunIntervals: true, canRunTests: true, canAccessStudios: true, canAccessAI: true,
    canViewCalendar: true, canCreateEvents: true,
    canInviteStaff: false, canAssignTeams: false, canManageBilling: false, canManageSettings: false,
  },
  ASSISTANT_COACH: {
    isTeamScoped: true,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: false, canRunIntervals: true, canRunTests: true, canAccessStudios: false, canAccessAI: false,
    canViewCalendar: true, canCreateEvents: true,
    canInviteStaff: false, canAssignTeams: false, canManageBilling: false, canManageSettings: false,
  },
  PHYSIO: {
    isTeamScoped: true,
    canViewAthletes: true, canViewTestResults: true, canViewProgress: true,
    canEditPrograms: false, canRunIntervals: false, canRunTests: false, canAccessStudios: false, canAccessAI: false,
    canViewCalendar: true, canCreateEvents: false,
    canInviteStaff: false, canAssignTeams: false, canManageBilling: false, canManageSettings: false,
  },
  MEMBER: {
    isTeamScoped: false,
    canViewAthletes: false, canViewTestResults: false, canViewProgress: false,
    canEditPrograms: false, canRunIntervals: false, canRunTests: false, canAccessStudios: false, canAccessAI: false,
    canViewCalendar: false, canCreateEvents: false,
    canInviteStaff: false, canAssignTeams: false, canManageBilling: false, canManageSettings: false,
  },
}

/**
 * Get permissions for a user in a business context.
 */
export async function getStaffPermissions(
  userId: string,
  businessSlug?: string
): Promise<StaffPermissions> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      isActive: true,
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
    },
    select: { role: true },
  })

  const role = (membership?.role || 'MEMBER') as StaffRole

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
        roleLabel: ROLE_LABELS.COACH,
        assignedTeamIds: [],
      }
    }
  }

  const perms = PERMISSION_MATRIX[role] || PERMISSION_MATRIX.MEMBER

  // Get team assignments for team-scoped roles
  let assignedTeamIds: string[] = []
  if (perms.isTeamScoped) {
    const assignments = await prisma.teamCoachAssignment.findMany({
      where: { userId },
      select: { teamId: true },
    })
    assignedTeamIds = assignments.map((a) => a.teamId)
  }

  return {
    ...perms,
    role,
    roleLabel: ROLE_LABELS[role] || role,
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
