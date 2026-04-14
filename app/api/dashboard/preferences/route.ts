/**
 * Dashboard Preferences API
 *
 * Per-user widget visibility/order overrides. Used by both athletes and
 * coaches to customize their own dashboard.
 *
 * GET    /api/dashboard/preferences?role=ATHLETE
 * GET    /api/dashboard/preferences?role=COACH&mode=PT
 * PUT    /api/dashboard/preferences           — bulk replace user's prefs for (role, mode, sport)
 * DELETE /api/dashboard/preferences?role=ATHLETE  — reset to defaults
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { updatePreferencesSchema } from '@/lib/validations/dashboard-preferences'
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry'
import type { Prisma, SportType } from '@prisma/client'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const role = url.searchParams.get('role')
  const mode = url.searchParams.get('mode')
  const sport = url.searchParams.get('sport')

  if (role !== 'ATHLETE' && role !== 'COACH') {
    return NextResponse.json({ error: 'role must be ATHLETE or COACH' }, { status: 400 })
  }

  const where: Prisma.DashboardPreferenceWhereInput = {
    userId: user.id,
    role,
  }
  if (mode) where.mode = mode
  if (sport) where.sport = sport as SportType

  const preferences = await prisma.dashboardPreference.findMany({ where })
  return NextResponse.json({ preferences })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updatePreferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { role, mode, sport, preferences } = parsed.data

  // Bulk replace: delete existing matching rows, then insert fresh.
  // This keeps the API simple — caller sends the full desired set.
  await prisma.$transaction([
    prisma.dashboardPreference.deleteMany({
      where: {
        userId: user.id,
        role,
        mode: mode ?? null,
        sport: (sport as SportType | null) ?? null,
      },
    }),
    prisma.dashboardPreference.createMany({
      data: preferences.map((p, idx) => ({
        userId: user.id,
        role,
        mode: mode ?? null,
        sport: (sport as SportType | null) ?? null,
        widgetKey: p.widgetKey,
        // Server-side enforcement: required widgets are always visible
        // regardless of what the client sends.
        visible: WIDGET_REGISTRY[p.widgetKey]?.required ? true : p.visible,
        order: p.order ?? idx * 10,
      })),
    }),
  ])

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const role = url.searchParams.get('role')
  const mode = url.searchParams.get('mode')
  const sport = url.searchParams.get('sport')

  if (role !== 'ATHLETE' && role !== 'COACH') {
    return NextResponse.json({ error: 'role must be ATHLETE or COACH' }, { status: 400 })
  }

  await prisma.dashboardPreference.deleteMany({
    where: {
      userId: user.id,
      role,
      ...(mode ? { mode } : {}),
      ...(sport ? { sport: sport as SportType } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
