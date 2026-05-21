import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getStaffPermissions, type StaffPermissions, type StaffRole } from '@/lib/permissions/assistant-coach'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_TYPES,
  isTeamEventType,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'

type TeamCalendarAction = 'create' | 'update' | 'delete' | 'assignContent'

const PLANNER_ROLES = new Set(['OWNER', 'ADMIN', 'COACH', 'ASSISTANT_COACH'])
const CONTENT_ROLES = new Set(['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER'])
const WORKOUT_AND_TEST_PLANNING_TYPES = new Set<TeamEventType>([
  ...PHYSICAL_TEAM_EVENT_TYPES,
  'TEST',
])

function hasTeamScope(
  userId: string,
  team: { userId: string; id: string },
  permissions: StaffPermissions
) {
  if (team.userId === userId) return true
  if (!permissions.isTeamScoped) return true
  return permissions.assignedTeamIds.includes(team.id)
}

function canWriteType(role: string, eventType: string, action: TeamCalendarAction) {
  if (!isTeamEventType(eventType)) return false

  if (action === 'assignContent') {
    if (!PHYSICAL_TEAM_EVENT_TYPES.includes(eventType)) return false
    if (CONTENT_ROLES.has(role)) return true
    return role === 'PHYSIO' && eventType === 'PREHAB'
  }

  if (PLANNER_ROLES.has(role)) return true
  if (role === 'PHYSICAL_TRAINER') return WORKOUT_AND_TEST_PLANNING_TYPES.has(eventType)
  if (role === 'PHYSIO') return eventType === 'PREHAB'
  return false
}

export async function getTeamCalendarPermissionProfile(
  userId: string,
  teamId: string,
  businessSlug?: string,
  options?: { roleOverride?: StaffRole | null }
) {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!team) return null

  const permissions = await getStaffPermissions(userId, businessSlug, options)
  const isRolePreview = Boolean(options?.roleOverride)
  const hasScope = isRolePreview || hasTeamScope(userId, team, permissions)

  return {
    role: permissions.role,
    roleLabel: permissions.roleLabel,
    canView: hasScope && permissions.canViewCalendar,
    creatableTypes: hasScope
      ? TEAM_EVENT_TYPES.filter((eventType) => canWriteType(permissions.role, eventType, 'create'))
      : [],
    assignableContentTypes: hasScope
      ? TEAM_EVENT_TYPES.filter((eventType) => canWriteType(permissions.role, eventType, 'assignContent'))
      : [],
  }
}

export async function getTeamCalendarWritableTeam(
  userId: string,
  teamId: string,
  businessSlug: string | undefined,
  eventType: string,
  action: TeamCalendarAction
) {
  const team = await getAccessibleTeam(userId, teamId, businessSlug)
  if (!team) return null

  const permissions = await getStaffPermissions(userId, businessSlug)
  if (!hasTeamScope(userId, team, permissions)) return null
  if (!canWriteType(permissions.role, eventType, action)) return null

  return team
}
