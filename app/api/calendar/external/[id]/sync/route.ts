/**
 * External Calendar Sync API
 *
 * POST /api/calendar/external/[id]/sync - Trigger a sync for a calendar connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { CalendarEventType, EventImpact } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  fetchAndParseICalUrl,
  convertToCalendarEvents,
} from '@/lib/calendar/ical-parser'
import { decryptIntegrationSecret } from '@/lib/integrations/crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/calendar/external/[id]/sync
 * Trigger a sync for a calendar connection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        client: {
          include: { athleteAccount: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (!connection.client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, connection.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!connection.syncEnabled) {
      return NextResponse.json(
        { error: 'Sync is disabled for this connection' },
        { status: 400 }
      )
    }

    // Prepare connection with verified clientId
    const syncConnection = {
      ...connection,
      clientId: connection.client.id, // Use verified client id
    }

    // Handle iCal URL sync
    if (connection.icalUrl) {
      return await syncICalConnection(syncConnection, dbUser.id)
    }

    // Handle Google Calendar sync (requires OAuth token)
    if (connection.provider === 'GOOGLE' && connection.accessToken) {
      return await syncGoogleCalendar(syncConnection, dbUser.id)
    }

    // Handle Outlook Calendar sync (requires OAuth token)
    if (connection.provider === 'OUTLOOK' && connection.accessToken) {
      return await syncOutlookCalendar(syncConnection, dbUser.id)
    }

    return NextResponse.json(
      { error: 'Cannot sync this connection type or OAuth not completed' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error syncing external calendar', {}, error)
    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    )
  }
}

/**
 * Sync an iCal URL connection
 */
async function syncICalConnection(
  connection: {
    id: string
    clientId: string
    provider: string
    calendarName: string
    icalUrl: string | null
    importAsType: CalendarEventType
    defaultImpact: EventImpact
    color: string | null
  },
  userId: string
) {
  if (!connection.icalUrl) {
    return NextResponse.json(
      { error: 'No iCal URL configured' },
      { status: 400 }
    )
  }

  const parseResult = await fetchAndParseICalUrl(connection.icalUrl)

  if (!parseResult.success && parseResult.events.length === 0) {
    // Update connection with error
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncError: parseResult.errors.join(', '),
      },
    })

    return NextResponse.json(
      { error: 'Failed to fetch or parse calendar', details: parseResult.errors },
      { status: 400 }
    )
  }

  const eventsToImport = convertToCalendarEvents(parseResult.events, {
    clientId: connection.clientId,
    calendarName: connection.calendarName,
    calendarType: connection.provider,
    defaultImpact: connection.defaultImpact,
    color: connection.color || undefined,
  })

  // Track sync stats
  let created = 0
  let updated = 0
  let deleted = 0

  // Get existing events for this connection
  const existingEvents = await prisma.calendarEvent.findMany({
    where: {
      clientId: connection.clientId,
      externalCalendarType: connection.provider,
      externalCalendarName: connection.calendarName,
      isReadOnly: true,
    },
    select: { id: true, externalCalendarId: true },
  })

  const existingEventMap = new Map(
    existingEvents.map((e) => [e.externalCalendarId, e.id])
  )
  const processedUids = new Set<string>()

  // Upsert events
  for (const event of eventsToImport) {
    processedUids.add(event.externalCalendarId)
    const existingId = existingEventMap.get(event.externalCalendarId)

    if (existingId) {
      // Update existing event
      await prisma.calendarEvent.update({
        where: { id: existingId },
        data: {
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: event.allDay,
          lastSyncedAt: new Date(),
        },
      })
      updated++
    } else {
      // Create new event
      await prisma.calendarEvent.create({
        data: {
          clientId: connection.clientId,
          type: connection.importAsType,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: event.allDay,
          trainingImpact: event.trainingImpact as EventImpact,
          isReadOnly: true,
          externalCalendarId: event.externalCalendarId,
          externalCalendarType: event.externalCalendarType,
          externalCalendarName: event.externalCalendarName,
          lastSyncedAt: new Date(),
          color: event.color,
          createdById: userId,
        },
      })
      created++
    }
  }

  // Delete events that no longer exist in the source
  for (const [uid, eventId] of existingEventMap) {
    if (uid && !processedUids.has(uid)) {
      await prisma.calendarEvent.delete({ where: { id: eventId } })
      deleted++
    }
  }

  // Update connection sync status
  await prisma.externalCalendarConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: null,
    },
  })

  return NextResponse.json({
    success: true,
    stats: {
      total: parseResult.events.length,
      created,
      updated,
      deleted,
    },
    calendarInfo: {
      name: parseResult.calendarName,
      timezone: parseResult.timezone,
    },
  })
}

/**
 * Sync Google Calendar (placeholder for OAuth-based sync)
 */
async function syncGoogleCalendar(
  connection: {
    id: string
    clientId: string
    calendarId: string
    calendarName: string
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    importAsType: CalendarEventType
    defaultImpact: EventImpact
    color: string | null
  },
  userId: string
) {
  // Tokens are stored encrypted at rest; decrypt for use
  let accessToken: string | null
  let refreshToken: string | null
  try {
    accessToken = decryptIntegrationSecret(connection.accessToken)
    refreshToken = decryptIntegrationSecret(connection.refreshToken)
  } catch (e) {
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncError:
          e instanceof Error
            ? e.message
            : 'Failed to decrypt calendar tokens. Ensure API_KEY_ENCRYPTION_KEY is configured, then reconnect your calendar.',
        syncEnabled: false,
      },
    })
    return NextResponse.json(
      { error: 'Calendar tokens could not be decrypted. Please reconnect your Google Calendar.' },
      { status: 500 }
    )
  }

  if (!accessToken) {
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: 'Missing access token', syncEnabled: false },
    })
    return NextResponse.json(
      { error: 'Missing access token. Please reconnect your Google Calendar.' },
      { status: 401 }
    )
  }

  // Check if token needs refresh
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    if (!refreshToken) {
      await prisma.externalCalendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncError: 'Access token expired and no refresh token available',
          syncEnabled: false,
        },
      })
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect your Google Calendar.' },
        { status: 401 }
      )
    }

    // TODO: Refresh the token using Google OAuth
    // For now, return an error
    return NextResponse.json(
      { error: 'Token refresh not yet implemented' },
      { status: 501 }
    )
  }

  // TODO: Implement Google Calendar API fetch
  // Use the Google Calendar API to fetch events
  // https://developers.google.com/calendar/api/v3/reference/events/list

  return NextResponse.json(
    { error: 'Google Calendar sync not yet implemented' },
    { status: 501 }
  )
}

/**
 * Sync Outlook Calendar (placeholder for OAuth-based sync)
 */
async function syncOutlookCalendar(
  connection: {
    id: string
    clientId: string
    calendarId: string
    calendarName: string
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    importAsType: CalendarEventType
    defaultImpact: EventImpact
    color: string | null
  },
  userId: string
) {
  // Tokens are stored encrypted at rest; decrypt for use
  let accessToken: string | null
  try {
    accessToken = decryptIntegrationSecret(connection.accessToken)
  } catch (e) {
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncError:
          e instanceof Error
            ? e.message
            : 'Failed to decrypt calendar tokens. Ensure API_KEY_ENCRYPTION_KEY is configured, then reconnect your calendar.',
        syncEnabled: false,
      },
    })
    return NextResponse.json(
      { error: 'Calendar tokens could not be decrypted. Please reconnect your Outlook Calendar.' },
      { status: 500 }
    )
  }

  if (!accessToken) {
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: 'Missing access token', syncEnabled: false },
    })
    return NextResponse.json(
      { error: 'Missing access token. Please reconnect your Outlook Calendar.' },
      { status: 401 }
    )
  }

  // TODO: Implement Outlook Calendar API fetch
  // Use the Microsoft Graph API to fetch events
  // https://learn.microsoft.com/en-us/graph/api/calendar-list-events

  return NextResponse.json(
    { error: 'Outlook Calendar sync not yet implemented' },
    { status: 501 }
  )
}
