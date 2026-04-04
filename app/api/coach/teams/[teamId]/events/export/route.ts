/**
 * Team Calendar iCal Export
 *
 * GET - Export team events as .ics file for Google Calendar / Outlook
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, name: true },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const events = await prisma.teamEvent.findMany({
      where: { teamId },
      orderBy: { startDate: 'asc' },
    })

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Trainomics//Team Calendar//EN',
      `X-WR-CALNAME:${escapeICalText(team.name)}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ]

    for (const event of events) {
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${event.id}@trainomics.app`)
      lines.push(`DTSTART:${formatICalDate(event.startDate)}`)
      if (event.endDate) {
        lines.push(`DTEND:${formatICalDate(event.endDate)}`)
      } else {
        // Default 1 hour duration
        const end = new Date(event.startDate.getTime() + 60 * 60 * 1000)
        lines.push(`DTEND:${formatICalDate(end)}`)
      }
      lines.push(`SUMMARY:${escapeICalText(event.title)}`)
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
      }
      if (event.location) {
        lines.push(`LOCATION:${escapeICalText(event.location)}`)
      }
      lines.push(`CATEGORIES:${event.type}`)
      lines.push(`CREATED:${formatICalDate(event.createdAt)}`)
      lines.push(`LAST-MODIFIED:${formatICalDate(event.updatedAt)}`)
      if (event.isRecurring && event.recurrenceRule) {
        lines.push(`RRULE:${event.recurrenceRule}`)
      }
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    const icsContent = lines.join('\r\n')

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${team.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
