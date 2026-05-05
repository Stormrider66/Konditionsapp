import 'server-only'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  isPreviewableStaffRole,
  STAFF_ROLE_PREVIEW_COOKIE,
} from '@/lib/permissions/role-preview'
import type { StaffRole } from '@/lib/permissions/assistant-coach'

export async function canUseStaffRolePreview(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, adminRole: true },
  })

  return user?.role === 'ADMIN' || user?.adminRole === 'SUPER_ADMIN'
}

export async function getStaffRolePreview(userId: string): Promise<StaffRole | null> {
  if (!(await canUseStaffRolePreview(userId))) return null

  const cookieStore = await cookies()
  const value = cookieStore.get(STAFF_ROLE_PREVIEW_COOKIE)?.value
  return isPreviewableStaffRole(value) ? value : null
}
