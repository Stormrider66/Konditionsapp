/**
 * GET/PUT /api/business/[id]/calendar-settings
 *
 * Business owners manage how their calendar appears in cross-org views.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the user is a member of this business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, businessId: id, isActive: true },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      return NextResponse.json({ error: 'Forbidden — only owners/admins can change calendar settings' }, { status: 403 })
    }

    const body = await request.json()
    const { calendarVisibility, shareTeamEvents, shareAthleteEvents } = body

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
