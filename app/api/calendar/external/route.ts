/**
 * External Calendar Connections API
 *
 * POST /api/calendar/external - Create a new external calendar connection
 * GET /api/calendar/external - List all external calendar connections for a client
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  fetchAndParseICalUrl,
  detectCalendarType,
  convertToCalendarEvents,
} from '@/lib/calendar/ical-parser'
import { CalendarEventType, EventImpact } from '@prisma/client'

const createConnectionSchema = z.object({
  clientId: z.string().uuid(),
  provider: z.enum(['GOOGLE', 'OUTLOOK', 'APPLE', 'ICAL_URL']),
  calendarName: z.string().min(1).max(100),
  icalUrl: z.string().url().optional(),
  importAsType: z.enum([
    'ALTITUDE_CAMP',
    'TRAINING_CAMP',
    'TRAVEL',
    'ILLNESS',
    'VACATION',
    'WORK_BLOCKER',
    'PERSONAL_BLOCKER',
    'EXTERNAL_EVENT',
  ]).optional().default('EXTERNAL_EVENT'),
  defaultImpact: z.enum(['NO_TRAINING', 'REDUCED', 'MODIFIED', 'NORMAL']).optional().default('NORMAL'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  syncEnabled: z.boolean().optional().default(true),
})

/**
 * POST /api/calendar/external
 * Create a new external calendar connection
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const validationResult = createConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      include: { athleteAccount: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For iCal URL connections, validate and fetch initial events
    if (data.provider === 'ICAL_URL' || data.provider === 'APPLE') {
      if (!data.icalUrl) {
        return NextResponse.json(
          { error: 'iCal URL is required for this provider' },
          { status: 400 }
        )
      }

      // Validate the URL by fetching it
      const parseResult = await fetchAndParseICalUrl(data.icalUrl)

      if (!parseResult.success && parseResult.events.length === 0) {
        return NextResponse.json(
          {
            error: 'Failed to fetch or parse calendar',
            details: parseResult.errors,
          },
          { status: 400 }
        )
      }

      // Detect calendar type from URL if needed
      const detectedType = detectCalendarType(data.icalUrl)
      const provider = data.provider === 'ICAL_URL' ? detectedType : data.provider

      // Create the connection
      const connection = await prisma.externalCalendarConnection.create({
        data: {
          clientId: data.clientId,
          provider,
          calendarName: data.calendarName || parseResult.calendarName || 'External Calendar',
          calendarId: data.icalUrl, // Use URL as the calendar ID
          icalUrl: data.icalUrl,
          syncEnabled: data.syncEnabled,
          importAsType: data.importAsType as CalendarEventType,
          defaultImpact: data.defaultImpact as EventImpact,
          color: data.color,
          lastSyncAt: new Date(),
        },
      })

      // Import events
      const eventsToImport = convertToCalendarEvents(parseResult.events, {
        clientId: data.clientId,
        calendarName: connection.calendarName,
        calendarType: provider,
        defaultImpact: data.defaultImpact,
        color: data.color,
      })

      // Create calendar events (upsert to avoid duplicates)
      // Note: Prisma `upsert` requires a real unique selector. Using `where: { id: '' }`
      // will always miss and create duplicates. We instead emulate an upsert by mapping
      // existing imported events by their external UID.
      const existingEvents = await prisma.calendarEvent.findMany({
        where: {
          clientId: data.clientId,
          externalCalendarType: provider,
          externalCalendarName: connection.calendarName,
          isReadOnly: true,
        },
        select: { id: true, externalCalendarId: true },
      })

      const existingEventMap = new Map(
        existingEvents.map((e) => [e.externalCalendarId, e.id])
      )
      const processedUids = new Set<string>()

      let importedCount = 0
      for (const event of eventsToImport) {
        // Prevent double-processing if the source contains duplicate UIDs
        if (processedUids.has(event.externalCalendarId)) continue
        processedUids.add(event.externalCalendarId)

        const existingId = existingEventMap.get(event.externalCalendarId)

        if (existingId) {
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
        } else {
          await prisma.calendarEvent.create({
            data: {
              clientId: data.clientId,
              type: data.importAsType as CalendarEventType,
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
              createdById: dbUser.id,
            },
          })
        }

        importedCount++
      }

      return NextResponse.json({
        connection,
        imported: importedCount,
        calendarInfo: {
          name: parseResult.calendarName,
          timezone: parseResult.timezone,
          eventCount: parseResult.events.length,
        },
      }, { status: 201 })
    }

    // For OAuth-based providers (Google, Outlook), create connection placeholder
    // The actual OAuth flow will be handled by separate endpoints
    if (data.provider === 'GOOGLE' || data.provider === 'OUTLOOK') {
      const connection = await prisma.externalCalendarConnection.create({
        data: {
          clientId: data.clientId,
          provider: data.provider,
          calendarName: data.calendarName,
          calendarId: 'pending', // Will be updated after OAuth
          syncEnabled: false, // Disabled until OAuth complete
          importAsType: data.importAsType as CalendarEventType,
          defaultImpact: data.defaultImpact as EventImpact,
          color: data.color,
        },
      })

      // Return OAuth URL for the provider
      const oauthUrl = getOAuthUrl(data.provider, connection.id)

      return NextResponse.json({
        connection,
        oauthRequired: true,
        oauthUrl,
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  } catch (error) {
    console.error('Error creating external calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/calendar/external
 * List all external calendar connections for a client
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { athleteAccount: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connections = await prisma.externalCalendarConnection.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    // Add event counts for each connection
    const connectionsWithCounts = await Promise.all(
      connections.map(async (conn) => {
        const eventCount = await prisma.calendarEvent.count({
          where: {
            clientId,
            externalCalendarType: conn.provider,
            externalCalendarName: conn.calendarName,
          },
        })

        return {
          ...conn,
          eventCount,
        }
      })
    )

    return NextResponse.json(connectionsWithCounts)
  } catch (error) {
    console.error('Error fetching external calendar connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

/**
 * Get OAuth URL for a provider
 */
function getOAuthUrl(provider: string, connectionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (provider) {
    case 'GOOGLE':
      const googleClientId = process.env.GOOGLE_CLIENT_ID
      if (!googleClientId) {
        return `${baseUrl}/settings/calendars?error=google_not_configured`
      }
      const googleParams = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        access_type: 'offline',
        prompt: 'consent',
        state: connectionId,
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams}`

    case 'OUTLOOK':
      const outlookClientId = process.env.OUTLOOK_CLIENT_ID
      if (!outlookClientId) {
        return `${baseUrl}/settings/calendars?error=outlook_not_configured`
      }
      const outlookParams = new URLSearchParams({
        client_id: outlookClientId,
        redirect_uri: `${baseUrl}/api/auth/outlook/callback`,
        response_type: 'code',
        scope: 'Calendars.Read offline_access',
        state: connectionId,
      })
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${outlookParams}`

    default:
      return `${baseUrl}/settings/calendars?error=unknown_provider`
  }
}
