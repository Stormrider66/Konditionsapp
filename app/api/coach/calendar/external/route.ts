/**
 * Coach External Calendar Connections API
 *
 * POST /api/coach/calendar/external - Create a new external calendar connection (Bokadirekt, Zoezi, iCal)
 * GET /api/coach/calendar/external - List all external calendar connections for a coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import {
  fetchAndParseICalUrl,
  detectCalendarType,
} from '@/lib/calendar/ical-parser'
import { logError } from '@/lib/logger-console'

const createConnectionSchema = z.object({
  provider: z.enum(['BOKADIREKT', 'ZOEZI', 'GOOGLE', 'OUTLOOK', 'APPLE', 'ICAL_URL']),
  calendarName: z.string().min(1).max(100),
  icalUrl: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  syncEnabled: z.boolean().optional().default(true),
})

/**
 * POST /api/coach/calendar/external
 * Create a new external calendar connection for a coach
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const validationResult = createConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // For iCal URL connections (Bokadirekt, Zoezi, Apple, generic), validate and test fetch
    if (['BOKADIREKT', 'ZOEZI', 'APPLE', 'ICAL_URL'].includes(data.provider)) {
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

      // Check for existing connection with same URL
      const existing = await prisma.externalCalendarConnection.findFirst({
        where: {
          userId: user.id,
          icalUrl: data.icalUrl,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'A connection with this URL already exists' },
          { status: 409 }
        )
      }

      // Detect calendar type from URL if using generic ICAL_URL
      const provider = data.provider === 'ICAL_URL' ? detectCalendarType(data.icalUrl) : data.provider

      // Create the connection
      const connection = await prisma.externalCalendarConnection.create({
        data: {
          userId: user.id,
          provider,
          calendarName: data.calendarName || parseResult.calendarName || 'External Calendar',
          calendarId: data.icalUrl, // Use URL as the calendar ID
          icalUrl: data.icalUrl,
          syncEnabled: data.syncEnabled,
          color: data.color,
          lastSyncAt: new Date(),
        },
      })

      return NextResponse.json(
        {
          connection: {
            id: connection.id,
            provider: connection.provider,
            calendarName: connection.calendarName,
            syncEnabled: connection.syncEnabled,
            lastSyncAt: connection.lastSyncAt,
            color: connection.color,
          },
          calendarInfo: {
            name: parseResult.calendarName,
            timezone: parseResult.timezone,
            eventCount: parseResult.events.length,
          },
        },
        { status: 201 }
      )
    }

    // For OAuth-based providers (Google, Outlook), create connection placeholder
    if (data.provider === 'GOOGLE' || data.provider === 'OUTLOOK') {
      return NextResponse.json(
        { error: 'OAuth providers not yet supported for coach calendars' },
        { status: 501 }
      )
    }

    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  } catch (error) {
    logError('Error creating coach calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/coach/calendar/external
 * List all external calendar connections for the coach
 */
export async function GET() {
  try {
    const user = await requireCoach()

    const connections = await prisma.externalCalendarConnection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncEnabled: true,
        lastSyncAt: true,
        lastSyncError: true,
        color: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ connections })
  } catch (error) {
    logError('Error fetching coach calendar connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}
