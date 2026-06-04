/**
 * GET/PUT /api/business/[id]/calendar-settings
 *
 * Business owners manage how their calendar appears in cross-org views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params

    // Verify the user is a member of this business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, businessId: id, isActive: true },
    })
    if (!membership) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Förbjudet') }, { status: 403 })
    }

    const settings = await prisma.businessCalendarSettings.findUnique({
      where: { businessId: id },
    })

    return NextResponse.json({
      settings: settings || {
        calendarVisibility: 'FULL_DETAILS',
        shareTeamEvents: true,
        shareAthleteEvents: false,
      },
      isOwner: membership.role === 'OWNER' || membership.role === 'ADMIN',
    })
  } catch (error) {
    console.error('[GET /api/business/[id]/calendar-settings]', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params

    // Only OWNER or ADMIN can change calendar settings
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        businessId: id,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })
    if (!membership) {
      return NextResponse.json({ error: t(locale, 'Forbidden - only owners/admins can change calendar settings', 'Förbjudet - endast ägare/administratörer kan ändra kalenderinställningar') }, { status: 403 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: t(locale, 'Invalid JSON body', 'Ogiltig JSON-kropp') }, { status: 400 })
    }
    const { calendarVisibility, shareTeamEvents, shareAthleteEvents } = body as {
      calendarVisibility?: 'FULL_DETAILS' | 'BUSY_ONLY' | 'HIDDEN'
      shareTeamEvents?: boolean
      shareAthleteEvents?: boolean
    }

    const settings = await prisma.businessCalendarSettings.upsert({
      where: { businessId: id },
      create: {
        businessId: id,
        calendarVisibility: calendarVisibility || 'FULL_DETAILS',
        shareTeamEvents: shareTeamEvents ?? true,
        shareAthleteEvents: shareAthleteEvents ?? false,
      },
      update: {
        ...(calendarVisibility !== undefined && { calendarVisibility }),
        ...(shareTeamEvents !== undefined && { shareTeamEvents }),
        ...(shareAthleteEvents !== undefined && { shareAthleteEvents }),
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[PUT /api/business/[id]/calendar-settings]', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
