/**
 * Coach Permissions API
 *
 * GET - Get current user's permissions (used by UI to show/hide features)
 */

import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'

export async function GET() {
  try {
    const user = await requireCoach()
    const permissions = await getStaffPermissions(user.id)
    return NextResponse.json(permissions)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
