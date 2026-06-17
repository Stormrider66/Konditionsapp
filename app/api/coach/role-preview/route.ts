import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hasAdminRole, requireAdminRole } from '@/lib/auth-utils'
import {
  isPreviewableStaffRole,
  STAFF_ROLE_PREVIEW_COOKIE,
} from '@/lib/permissions/role-preview'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export async function GET() {
  if (!(await hasAdminRole(['SUPER_ADMIN']))) {
    return NextResponse.json({ role: null })
  }

  const cookieStore = await cookies()
  const role = cookieStore.get(STAFF_ROLE_PREVIEW_COOKIE)?.value ?? null

  return NextResponse.json({
    role: isPreviewableStaffRole(role) ? role : null,
  })
}

async function requirePreviewAdmin() {
  try {
    await requireAdminRole(['SUPER_ADMIN'])
    return null
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  const forbidden = await requirePreviewAdmin()
  if (forbidden) return forbidden

  const body = await request.json().catch(() => null)
  const role = body?.role

  if (!isPreviewableStaffRole(role)) {
    return NextResponse.json({ error: 'Invalid preview role' }, { status: 400 })
  }

  const response = NextResponse.json({ role })
  response.cookies.set(STAFF_ROLE_PREVIEW_COOKIE, role, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 8,
  })
  return response
}

export async function DELETE() {
  const forbidden = await requirePreviewAdmin()
  if (forbidden) return forbidden

  const response = NextResponse.json({ role: null })
  response.cookies.set(STAFF_ROLE_PREVIEW_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  })
  return response
}
