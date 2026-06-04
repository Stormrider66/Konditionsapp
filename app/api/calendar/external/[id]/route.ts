/**
 * External Calendar Connection Individual API
 *
 * GET /api/calendar/external/[id] - Get a single connection
 * PUT /api/calendar/external/[id] - Update a connection
 * DELETE /api/calendar/external/[id] - Delete a connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { CalendarEventType, EventImpact } from '@prisma/client'
import { z } from 'zod'
import { toPublicExternalCalendarConnection } from '@/lib/calendar/external-calendar-connection'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const updateConnectionSchema = z.object({
  calendarName: z.string().min(1).max(100).optional(),
  syncEnabled: z.boolean().optional(),
  importAsType: z.enum([
    'ALTITUDE_CAMP',
    'TRAINING_CAMP',
    'TRAVEL',
    'ILLNESS',
    'VACATION',
    'WORK_BLOCKER',
    'PERSONAL_BLOCKER',
    'EXTERNAL_EVENT',
  ]).optional(),
  defaultImpact: z.enum(['NO_TRAINING', 'REDUCED', 'MODIFIED', 'NORMAL']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
})

/**
 * GET /api/calendar/external/[id]
 * Get a single external calendar connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.json({ error: t(locale, 'Connection not found', 'Anslutningen hittades inte') }, { status: 404 })
    }

    if (!connection.client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, connection.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    // Get event count
    const eventCount = await prisma.calendarEvent.count({
      where: {
        clientId: connection.client.id,
        externalCalendarType: connection.provider,
        externalCalendarName: connection.calendarName,
      },
    })

    return NextResponse.json({
      ...toPublicExternalCalendarConnection(connection),
      eventCount,
    })
  } catch (error) {
    logError('Error fetching external calendar connection:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch connection', 'Misslyckades med att hämta anslutning') },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/calendar/external/[id]
 * Update an external calendar connection
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.json({ error: t(locale, 'Connection not found', 'Anslutningen hittades inte') }, { status: 404 })
    }

    if (!connection.client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, connection.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = updateConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig begäran'), details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (data.calendarName !== undefined) updateData.calendarName = data.calendarName
    if (data.syncEnabled !== undefined) updateData.syncEnabled = data.syncEnabled
    if (data.importAsType !== undefined) updateData.importAsType = data.importAsType as CalendarEventType
    if (data.defaultImpact !== undefined) updateData.defaultImpact = data.defaultImpact as EventImpact
    if (data.color !== undefined) updateData.color = data.color

    const updatedConnection = await prisma.externalCalendarConnection.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(toPublicExternalCalendarConnection(updatedConnection))
  } catch (error) {
    logError('Error updating external calendar connection:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update connection', 'Misslyckades med att uppdatera anslutning') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar/external/[id]
 * Delete an external calendar connection and its imported events
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.json({ error: t(locale, 'Connection not found', 'Anslutningen hittades inte') }, { status: 404 })
    }

    if (!connection.client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, connection.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    // Delete imported events first
    const deletedEvents = await prisma.calendarEvent.deleteMany({
      where: {
        clientId: connection.client.id,
        externalCalendarType: connection.provider,
        externalCalendarName: connection.calendarName,
        isReadOnly: true,
      },
    })

    // Delete the connection
    await prisma.externalCalendarConnection.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      deletedEvents: deletedEvents.count,
    })
  } catch (error) {
    logError('Error deleting external calendar connection:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete connection', 'Misslyckades med att radera anslutning') },
      { status: 500 }
    )
  }
}
