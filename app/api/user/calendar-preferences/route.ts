/**
 * GET/PUT /api/user/calendar-preferences
 *
 * Manages user preferences for the unified cross-org calendar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prefs = await prisma.userCalendarPreference.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      preferences: prefs || {
        defaultMode: 'PERSONAL',
        hiddenBusinessIds: [],
        colorMapping: {},
      },
    })
  } catch (error) {
    console.error('[GET /api/user/calendar-preferences]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { defaultMode, hiddenBusinessIds, colorMapping } = body as {
      defaultMode?: 'PERSONAL' | 'ALL_TEAMS' | 'PLANNING'
      hiddenBusinessIds?: string[]
      colorMapping?: Record<string, string>
    }

    const prefs = await prisma.userCalendarPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        defaultMode: defaultMode || 'PERSONAL',
        hiddenBusinessIds: hiddenBusinessIds || [],
        colorMapping: colorMapping || {},
      },
      update: {
        ...(defaultMode !== undefined && { defaultMode }),
        ...(hiddenBusinessIds !== undefined && { hiddenBusinessIds }),
        ...(colorMapping !== undefined && { colorMapping }),
      },
    })

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    console.error('[PUT /api/user/calendar-preferences]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
