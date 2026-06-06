/**
 * Staff Role Definitions (client-safe)
 *
 * Pure role constants, labels, and the permission matrix — NO Prisma / server
 * imports — so this module is safe to import from client components.
 *
 * Server-only helpers that touch the database (getStaffPermissions,
 * canAccessTeam, canStaffAccessClient) live in `./assistant-coach`, which
 * re-exports everything here for backwards compatibility.
 *
 * Role Hierarchy:
 * - OWNER:             Full access, billing
 * - ADMIN (Sport director): Full view, staff management, no billing
 * - COACH (Head coach): Full coaching, programs, AI, tests
 * - PHYSICAL_TRAINER (Physical trainer): Programs, tests, intervals, studios (team-scoped)
 * - ASSISTANT_COACH (Assistant coach): Run tests/intervals, view only (team-scoped)
 * - PHYSIO (Physiotherapist): Medical, restrictions, injury (team-scoped)
 */

export type StaffRole = 'OWNER' | 'ADMIN' | 'COACH' | 'PHYSICAL_TRAINER' | 'ASSISTANT_COACH' | 'PHYSIO' | 'MEMBER'
export type AppLocale = 'en' | 'sv'

/** Mirrors prisma BusinessType enum. Kept as a string union to avoid importing @prisma/client into client components. */
export type BusinessType = 'INDEPENDENT_COACH' | 'GYM' | 'CLUB'

export const ROLE_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    OWNER: 'Owner',
    ADMIN: 'Sport director',
    COACH: 'Head coach',
    PHYSICAL_TRAINER: 'Physical trainer',
    ASSISTANT_COACH: 'Assistant coach',
    PHYSIO: 'Physiotherapist',
    MEMBER: 'Member',
  },
  sv: {
    OWNER: 'Ägare',
    ADMIN: 'Sportchef',
    COACH: 'Huvudtränare',
    PHYSICAL_TRAINER: 'Fystränare',
    ASSISTANT_COACH: 'Assisterande tränare',
    PHYSIO: 'Fysioterapeut',
    MEMBER: 'Medlem',
  },
}

/**
 * Role label that respects business type. The DB role `ADMIN` means
 * "business administrator" everywhere — but we surface it as "Sportchef"
 * only for sport clubs. Gyms and independent coaches get the neutral
 * "Administratör" so they never see club-specific framing.
 */
export function roleLabelFor(
  role: StaffRole | string,
  businessType: BusinessType | string | null | undefined,
  locale: AppLocale = 'en',
): string {
  if (role === 'ADMIN' && businessType !== 'CLUB') {
    return locale === 'sv' ? 'Administratör' : 'Administrator'
  }
  return ROLE_LABELS[locale][role] || role
}

export interface InvitableRole {
  value: StaffRole
  label: string
  description: string
}

const ROLE_DEFINITIONS: Record<AppLocale, Record<Exclude<StaffRole, 'OWNER' | 'MEMBER'>, InvitableRole>> = {
  en: {
    COACH: { value: 'COACH', label: 'Head coach', description: 'Full access to coaching, programs, and AI' },
    PHYSICAL_TRAINER: { value: 'PHYSICAL_TRAINER', label: 'Physical trainer', description: 'Training programs, tests, and intervals for assigned teams' },
    ASSISTANT_COACH: { value: 'ASSISTANT_COACH', label: 'Assistant coach', description: 'Run tests and intervals, view results' },
    PHYSIO: { value: 'PHYSIO', label: 'Physiotherapist', description: 'Injury management and rehabilitation' },
    ADMIN: { value: 'ADMIN', label: 'Sport director', description: 'Staff management, full overview, calendar' },
  },
  sv: {
    COACH: { value: 'COACH', label: 'Huvudtränare', description: 'Full tillgång till coaching, program och AI' },
    PHYSICAL_TRAINER: { value: 'PHYSICAL_TRAINER', label: 'Fystränare', description: 'Träningsprogram, tester, intervaller för tilldelade lag' },
    ASSISTANT_COACH: { value: 'ASSISTANT_COACH', label: 'Assisterande tränare', description: 'Köra tester och intervaller, visa resultat' },
    PHYSIO: { value: 'PHYSIO', label: 'Fysioterapeut', description: 'Skadehantering och rehabilitering' },
    ADMIN: { value: 'ADMIN', label: 'Sportchef', description: 'Personalhantering, full översikt, kalender' },
  },
}

/**
 * Roles that can be invited per business type.
 * - CLUB: full team-staff lineup (head coach, physical trainer, assistant coach, physio, sport director)
 * - GYM: gym/studio crew — head coach, physical trainer, physio (no club-specific roles)
 * - INDEPENDENT_COACH: solo PT — minimal collaborator surface (lead coach + physio)
 */
const ROLES_BY_BUSINESS_TYPE: Record<BusinessType, StaffRole[]> = {
  CLUB: ['COACH', 'PHYSICAL_TRAINER', 'ASSISTANT_COACH', 'PHYSIO', 'ADMIN'],
  GYM: ['COACH', 'PHYSICAL_TRAINER', 'PHYSIO'],
  INDEPENDENT_COACH: ['COACH', 'PHYSIO'],
}

export function invitableRolesFor(businessType: BusinessType | string | null | undefined, locale: AppLocale = 'en'): InvitableRole[] {
  const type = (businessType ?? 'CLUB') as BusinessType
  const allowed = ROLES_BY_BUSINESS_TYPE[type] ?? ROLES_BY_BUSINESS_TYPE.CLUB
  return allowed.map((r) => ROLE_DEFINITIONS[locale][r as keyof typeof ROLE_DEFINITIONS.en]).filter(Boolean)
}

export function isRoleInvitableFor(role: StaffRole, businessType: BusinessType | string | null | undefined): boolean {
  return invitableRolesFor(businessType).some((r) => r.value === role)
}

/** @deprecated Prefer `invitableRolesFor(businessType)`. Kept for backwards compat — returns the CLUB lineup. */
export const INVITABLE_ROLES: InvitableRole[] = invitableRolesFor('CLUB')

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

export const PERMISSION_MATRIX: Record<string, Omit<StaffPermissions, 'role' | 'roleLabel' | 'assignedTeamIds'>> = {
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
    canEditPrograms: false, canRunIntervals: false, canRunTests: true, canAccessStudios: false, canAccessAI: false,
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
