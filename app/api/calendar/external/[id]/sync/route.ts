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
import { decryptIntegrationSecret, encryptIntegrationSecret } from '@/lib/integrations/crypto'

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

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      logger.error('Google Calendar OAuth not configured: missing GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CALENDAR_CLIENT_SECRET')
      return NextResponse.json(
        { error: 'Google Calendar integration not configured' },
        { status: 500 }
      )
    }

    // Refresh the token using Google OAuth
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      logger.error('Google token refresh failed', { status: tokenResponse.status, error: errorData })
      await prisma.externalCalendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncError: `Token refresh failed: ${errorData.error_description || tokenResponse.statusText}`,
          syncEnabled: false,
        },
      })
      return NextResponse.json(
        { error: 'Failed to refresh access token. Please reconnect your Google Calendar.' },
        { status: 401 }
      )
    }

    const tokenData = await tokenResponse.json()
    accessToken = tokenData.access_token

    // Store the new encrypted token and expiry
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000)
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptIntegrationSecret(accessToken),
        expiresAt: newExpiresAt,
        // Google may issue a new refresh token
        ...(tokenData.refresh_token
          ? { refreshToken: encryptIntegrationSecret(tokenData.refresh_token) }
          : {}),
      },
    })
  }

  // Fetch events from Google Calendar API
  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ahead

  const eventsUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events`
  )
  eventsUrl.searchParams.set('timeMin', timeMin)
  eventsUrl.searchParams.set('timeMax', timeMax)
  eventsUrl.searchParams.set('singleEvents', 'true')
  eventsUrl.searchParams.set('orderBy', 'startTime')
  eventsUrl.searchParams.set('maxResults', '250')

  const eventsResponse = await fetch(eventsUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!eventsResponse.ok) {
    const errorData = await eventsResponse.json().catch(() => ({}))
    logger.error('Google Calendar events fetch failed', { status: eventsResponse.status, error: errorData })
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: `Events fetch failed: ${errorData.error?.message || eventsResponse.statusText}` },
    })
    return NextResponse.json(
      { error: 'Failed to fetch events from Google Calendar' },
      { status: 502 }
    )
  }

  const eventsData = await eventsResponse.json()
  const googleEvents: Array<{
    id: string
    summary?: string
    description?: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
  }> = eventsData.items || []

  // Track sync stats
  let created = 0
  let updated = 0
  let deleted = 0

  // Get existing events for this connection
  const existingEvents = await prisma.calendarEvent.findMany({
    where: {
      clientId: connection.clientId,
      externalCalendarType: 'GOOGLE',
      externalCalendarName: connection.calendarName,
      isReadOnly: true,
    },
    select: { id: true, externalCalendarId: true },
  })

  const existingEventMap = new Map(
    existingEvents.map((e) => [e.externalCalendarId, e.id])
  )
  const processedIds = new Set<string>()

  // Upsert events
  for (const gEvent of googleEvents) {
    if (!gEvent.id) continue
    processedIds.add(gEvent.id)

    const isAllDay = !gEvent.start.dateTime
    const startDate = new Date(gEvent.start.dateTime || gEvent.start.date || now)
    const endDate = new Date(gEvent.end.dateTime || gEvent.end.date || now)

    const existingId = existingEventMap.get(gEvent.id)

    if (existingId) {
      await prisma.calendarEvent.update({
        where: { id: existingId },
        data: {
          title: gEvent.summary || 'Untitled',
          description: gEvent.description || null,
          startDate,
          endDate,
          allDay: isAllDay,
          lastSyncedAt: new Date(),
        },
      })
      updated++
    } else {
      await prisma.calendarEvent.create({
        data: {
          clientId: connection.clientId,
          type: connection.importAsType,
          title: gEvent.summary || 'Untitled',
          description: gEvent.description || null,
          startDate,
          endDate,
          allDay: isAllDay,
          trainingImpact: connection.defaultImpact,
          isReadOnly: true,
          externalCalendarId: gEvent.id,
          externalCalendarType: 'GOOGLE',
          externalCalendarName: connection.calendarName,
          lastSyncedAt: new Date(),
          color: connection.color,
          createdById: userId,
        },
      })
      created++
    }
  }

  // Delete events no longer in Google Calendar
  for (const [uid, eventId] of existingEventMap) {
    if (uid && !processedIds.has(uid)) {
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
      total: googleEvents.length,
      created,
      updated,
      deleted,
    },
  })
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
