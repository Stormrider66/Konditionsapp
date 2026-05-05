/**
 * Coach Permissions API
 *
 * GET - Get current user's permissions (used by UI to show/hide features)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const previewRole = await getStaffRolePreview(user.id)
    const permissions = await getStaffPermissions(user.id, scope.businessSlug, { roleOverride: previewRole })
    return NextResponse.json(permissions)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
