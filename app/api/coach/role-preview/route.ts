import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAdminRole } from '@/lib/auth-utils'
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
  await requireAdminRole(['SUPER_ADMIN'])
  const cookieStore = await cookies()
  const role = cookieStore.get(STAFF_ROLE_PREVIEW_COOKIE)?.value ?? null

  return NextResponse.json({
    role: isPreviewableStaffRole(role) ? role : null,
  })
}

export async function POST(request: NextRequest) {
  await requireAdminRole(['SUPER_ADMIN'])
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
  await requireAdminRole(['SUPER_ADMIN'])
  const response = NextResponse.json({ role: null })
  response.cookies.set(STAFF_ROLE_PREVIEW_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  })
  return response
}
