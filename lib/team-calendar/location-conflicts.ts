import { addHours } from 'date-fns'
import { prisma } from '@/lib/prisma'

export interface TeamCalendarLocationConflict {
  id: string
  title: string
  location: string
  startDate: Date
  endDate: Date | null
  type: string
}

function normalizeLocationName(location: string | null | undefined) {
  return location?.trim().replace(/\s+/g, ' ').toLowerCase() ?? ''
}

function effectiveEndDate(startDate: Date, endDate: Date | null, allDay: boolean) {
  if (endDate) return endDate
  if (allDay) {
    const endOfDay = new Date(startDate)
    endOfDay.setHours(23, 59, 59, 999)
    return endOfDay
  }
  return addHours(startDate, 1)
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB
}

export async function findTeamCalendarLocationConflicts({
  teamId,
  location,
  startDate,
  endDate,
  allDay,
  excludeEventId,
}: {
  teamId: string
  location: string | null | undefined
  startDate: Date
  endDate: Date | null
  allDay: boolean
  excludeEventId?: string
}): Promise<TeamCalendarLocationConflict[]> {
  const normalizedLocation = normalizeLocationName(location)
  if (!normalizedLocation) return []

  const proposedEnd = effectiveEndDate(startDate, endDate, allDay)

  const candidates = await prisma.teamEvent.findMany({
    where: {
      teamId,
      location: { not: null },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      startDate: { lt: proposedEnd },
      OR: [
        { endDate: null },
        { endDate: { gt: startDate } },
      ],
    },
    select: {
      id: true,
      title: true,
      location: true,
      startDate: true,
      endDate: true,
      allDay: true,
      type: true,
    },
    orderBy: { startDate: 'asc' },
  })

  return candidates
    .filter((event) => normalizeLocationName(event.location) === normalizedLocation)
    .filter((event) => rangesOverlap(
      event.startDate,
      effectiveEndDate(event.startDate, event.endDate, event.allDay),
      startDate,
      proposedEnd
    ))
    .map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location ?? location ?? '',
      startDate: event.startDate,
      endDate: event.endDate,
      type: event.type,
    }))
}

export function formatLocationConflictMessage(conflicts: TeamCalendarLocationConflict[]) {
  const first = conflicts[0]
  if (!first) return 'Platsen är redan bokad under den tiden.'

  const time = first.startDate.toLocaleString('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const suffix = conflicts.length > 1 ? ` och ${conflicts.length - 1} till` : ''
  return `${first.location} är redan bokad ${time} (${first.title})${suffix}.`
}
