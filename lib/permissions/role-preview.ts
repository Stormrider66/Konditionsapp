import type { StaffRole } from '@/lib/permissions/assistant-coach'

export const STAFF_ROLE_PREVIEW_COOKIE = 'trainomics_staff_role_preview'

export const PREVIEWABLE_STAFF_ROLES: StaffRole[] = [
  'OWNER',
  'ADMIN',
  'COACH',
  'PHYSICAL_TRAINER',
  'ASSISTANT_COACH',
  'PHYSIO',
  'MEMBER',
]

export function isPreviewableStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && PREVIEWABLE_STAFF_ROLES.includes(value as StaffRole)
}
