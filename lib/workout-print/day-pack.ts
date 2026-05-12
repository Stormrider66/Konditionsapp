import { prisma } from '@/lib/prisma'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import {
  normalizePrintableWorkout,
  type PrintableWorkout,
  type PrintableWorkoutKind,
} from '@/lib/workout-print/normalize'

export interface DayPrintWorkoutItem {
  id: string
  kind: PrintableWorkoutKind
  workoutId: string
  workoutTitle: string
  date: string
  dateLabel: string
  scheduleLabel: string | null
  startTime: string | null
  endTime: string | null
  locationName: string | null
  notes: string | null
  totalAssigned: number
  defaultCopies: number
  team: {
    id: string
    name: string
    memberCount: number
  }
  organization: {
    id: string
    name: string
  } | null
  workout: PrintableWorkout
}

function parseDateOnly(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date')
  }
  return new Date(`${date}T00:00:00.000Z`)
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDateValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatScheduleLabel({
  startTime,
  endTime,
  locationName,
}: {
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
}) {
  const time = startTime && endTime ? `${startTime}-${endTime}` : startTime || null
  return [time, locationName].filter(Boolean).join(' · ') || null
}

type BroadcastWithWorkout = Awaited<ReturnType<typeof fetchBroadcasts>>[number]

function getBroadcastWorkout(
  broadcast: BroadcastWithWorkout
): { kind: PrintableWorkoutKind; workoutId: string; workout: Record<string, unknown> } | null {
  if (broadcast.strengthSessionId && broadcast.strengthSession) {
    return { kind: 'strength', workoutId: broadcast.strengthSessionId, workout: broadcast.strengthSession as Record<string, unknown> }
  }
  if (broadcast.cardioSessionId && broadcast.cardioSession) {
    return { kind: 'cardio', workoutId: broadcast.cardioSessionId, workout: broadcast.cardioSession as Record<string, unknown> }
  }
  if (broadcast.hybridWorkoutId && broadcast.hybridWorkout) {
    return { kind: 'hybrid', workoutId: broadcast.hybridWorkoutId, workout: broadcast.hybridWorkout as Record<string, unknown> }
  }
  if (broadcast.agilityWorkoutId && broadcast.agilityWorkout) {
    return { kind: 'agility', workoutId: broadcast.agilityWorkoutId, workout: broadcast.agilityWorkout as Record<string, unknown> }
  }
  return null
}

async function fetchBroadcasts({
  userId,
  businessSlug,
  date,
  organizationId,
  ids,
}: {
  userId: string
  businessSlug?: string
  date: Date
  organizationId?: string | null
  ids?: string[]
}) {
  const accessibleTeamWhere = await getAccessibleTeamWhere(userId, businessSlug)

  return prisma.teamWorkoutBroadcast.findMany({
    where: {
      assignedDate: date,
      ...(ids?.length ? { id: { in: ids } } : {}),
      team: {
        AND: [
          accessibleTeamWhere,
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          members: { select: { id: true } },
          organization: { select: { id: true, name: true } },
        },
      },
      location: { select: { name: true } },
      strengthSession: true,
      cardioSession: true,
      hybridWorkout: {
        include: {
          movements: {
            orderBy: { order: 'asc' },
            include: { exercise: true },
          },
        },
      },
      agilityWorkout: {
        include: {
          drills: {
            orderBy: { order: 'asc' },
            include: { drill: true },
          },
        },
      },
    },
    orderBy: [
      { startTime: 'asc' },
      { team: { name: 'asc' } },
      { createdAt: 'asc' },
    ],
  })
}

export async function getOrganizationDayPrintItems({
  userId,
  businessSlug,
  date,
  organizationId,
  ids,
}: {
  userId: string
  businessSlug?: string
  date: string
  organizationId?: string | null
  ids?: string[]
}): Promise<DayPrintWorkoutItem[]> {
  const parsedDate = parseDateOnly(date)
  const dateLabel = formatDateLabel(parsedDate)
  const broadcasts = await fetchBroadcasts({
    userId,
    businessSlug,
    date: parsedDate,
    organizationId,
    ids,
  })

  return broadcasts.flatMap((broadcast) => {
    const details = getBroadcastWorkout(broadcast)
    if (!details) return []

    const locationName = broadcast.location?.name || broadcast.locationName || null
    const scheduleLabel = formatScheduleLabel({
      startTime: broadcast.startTime,
      endTime: broadcast.endTime,
      locationName,
    })
    const normalizedWorkout = normalizePrintableWorkout(details.kind, details.workout, {
      dateLabel,
    })
    const workout: PrintableWorkout = {
      ...normalizedWorkout,
      teamName: broadcast.team.name,
      organizationName: broadcast.team.organization?.name || null,
      scheduleLabel,
      assignmentNotes: broadcast.notes,
    }

    return [{
      id: broadcast.id,
      kind: details.kind,
      workoutId: details.workoutId,
      workoutTitle: workout.title,
      date: formatDateValue(broadcast.assignedDate),
      dateLabel,
      scheduleLabel,
      startTime: broadcast.startTime,
      endTime: broadcast.endTime,
      locationName,
      notes: broadcast.notes,
      totalAssigned: broadcast.totalAssigned,
      defaultCopies: Math.max(1, broadcast.totalAssigned || broadcast.team.members.length || 1),
      team: {
        id: broadcast.team.id,
        name: broadcast.team.name,
        memberCount: broadcast.team.members.length,
      },
      organization: broadcast.team.organization,
      workout,
    }]
  })
}

export function parseDayPrintSelection(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value.join(',') : value
  if (!raw) return new Map<string, number>()

  const selection = new Map<string, number>()
  raw.split(',').forEach((entry) => {
    const [id, copiesValue] = entry.split(':')
    const copies = Number.parseInt(copiesValue || '1', 10)
    if (id && Number.isFinite(copies) && copies > 0) {
      selection.set(id, Math.min(copies, 200))
    }
  })

  return selection
}
