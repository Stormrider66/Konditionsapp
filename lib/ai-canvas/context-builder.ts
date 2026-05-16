import { differenceInCalendarDays, subDays, addDays } from 'date-fns'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'

export type CanvasContextDataKey = 'tests' | 'sessions' | 'programs' | 'readiness' | 'notes'

export interface CanvasContextSelectionInput {
  scope: 'none' | 'athlete' | 'team'
  athleteId?: string
  teamId?: string
  dateRange: 'last7' | 'last30' | 'last90' | 'next30'
  dataKeys: CanvasContextDataKey[]
}

interface BuildCanvasContextParams {
  userId: string
  businessSlug: string
  businessId: string
  role: string
  selection?: CanvasContextSelectionInput
  now?: Date
}

const DATA_LABELS: Record<CanvasContextDataKey, string> = {
  tests: 'Tester',
  sessions: 'Träningspass',
  programs: 'Program',
  readiness: 'Readiness',
  notes: 'Anteckningar',
}

const RANGE_LABELS: Record<CanvasContextSelectionInput['dateRange'], string> = {
  last7: 'Senaste 7 dagarna',
  last30: 'Senaste 30 dagarna',
  last90: 'Senaste 90 dagarna',
  next30: 'Kommande 30 dagarna',
}

function resolveDateWindow(range: CanvasContextSelectionInput['dateRange'], now: Date) {
  if (range === 'next30') {
    return { start: now, end: addDays(now, 30), label: RANGE_LABELS[range], future: true }
  }
  const days = range === 'last7' ? 7 : range === 'last90' ? 90 : 30
  return { start: subDays(now, days), end: now, label: RANGE_LABELS[range], future: false }
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return 'okänt datum'
  return date.toISOString().slice(0, 10)
}

function numberText(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'saknas'
  return `${Math.round(value * 10) / 10}${suffix}`
}

function uniqueDataKeys(keys: CanvasContextDataKey[] | undefined): CanvasContextDataKey[] {
  const allowed = new Set<CanvasContextDataKey>(['tests', 'sessions', 'programs', 'readiness', 'notes'])
  return Array.from(new Set(keys ?? [])).filter((key): key is CanvasContextDataKey => allowed.has(key))
}

export async function buildCanvasContextSummary({
  userId,
  businessSlug,
  businessId,
  role,
  selection,
  now = new Date(),
}: BuildCanvasContextParams): Promise<string> {
  if (!selection || selection.scope === 'none') {
    return ''
  }

  const dataKeys = uniqueDataKeys(selection.dataKeys)
  const window = resolveDateWindow(selection.dateRange, now)
  const coachIds = await getCoachScopedIds(userId, businessId, role)

  const baseClientWhere: Prisma.ClientWhereInput = {
    userId: { in: coachIds },
    businessId,
  }

  const clientWhere = await resolveClientWhere({
    userId,
    businessSlug,
    baseClientWhere,
    selection,
  })

  if (!clientWhere) {
    return 'Selected canvas context could not be loaded because the selected athlete or team was not accessible.'
  }

  const clients = await prisma.client.findMany({
    where: clientWhere,
    select: {
      id: true,
      name: true,
      notes: true,
      sportProfile: { select: { primarySport: true } },
      team: { select: { id: true, name: true, sportType: true } },
    },
    orderBy: { name: 'asc' },
    take: selection.scope === 'athlete' ? 1 : 80,
  })

  if (clients.length === 0) {
    return 'Selected canvas context did not match any accessible athletes.'
  }

  const clientIds = clients.map((client) => client.id)
  const lines: string[] = [
    'Selected canvas context with live read-only data:',
    selection.scope === 'athlete'
      ? `Fokus: Atlet - ${clients[0].name}${clients[0].sportProfile?.primarySport ? ` (${clients[0].sportProfile.primarySport})` : ''}`
      : `Fokus: Lag - ${clients[0].team?.name ?? 'valt lag'} (${clients.length} atleter)`,
    `Period: ${window.label}`,
    `Valda dataområden: ${dataKeys.length > 0 ? dataKeys.map((key) => DATA_LABELS[key]).join(', ') : 'inga'}`,
  ]

  if (dataKeys.includes('tests')) {
    lines.push(...await buildTestLines(clientIds, now))
  }

  if (dataKeys.includes('programs')) {
    lines.push(...await buildProgramLines(clientIds, window.start, window.end))
  }

  if (dataKeys.includes('sessions')) {
    lines.push(...await buildSessionLines(clientIds, window.start, window.end, window.future))
  }

  if (dataKeys.includes('readiness')) {
    lines.push(...await buildReadinessLines(clientIds, window.start, window.end))
  }

  if (dataKeys.includes('notes')) {
    lines.push(...buildNoteLines(clients))
  }

  return lines.join('\n')
}

async function resolveClientWhere({
  userId,
  businessSlug,
  baseClientWhere,
  selection,
}: {
  userId: string
  businessSlug: string
  baseClientWhere: Prisma.ClientWhereInput
  selection: CanvasContextSelectionInput
}): Promise<Prisma.ClientWhereInput | null> {
  if (selection.scope === 'athlete') {
    if (!selection.athleteId) return null
    return {
      ...baseClientWhere,
      id: selection.athleteId,
    }
  }

  if (selection.scope === 'team') {
    if (!selection.teamId) return null
    const teamWhere = await getAccessibleTeamWhere(userId, businessSlug)
    const team = await prisma.team.findFirst({
      where: {
        id: selection.teamId,
        AND: [teamWhere],
      },
      select: { id: true },
    })
    if (!team) return null
    return {
      ...baseClientWhere,
      teamId: selection.teamId,
    }
  }

  return null
}

async function buildTestLines(clientIds: string[], now: Date): Promise<string[]> {
  const tests = await prisma.test.findMany({
    where: {
      clientId: { in: clientIds },
      status: 'COMPLETED',
    },
    select: {
      clientId: true,
      testDate: true,
      testType: true,
      vo2max: true,
      maxHR: true,
      manualLT1Intensity: true,
      manualLT2Intensity: true,
      client: { select: { name: true } },
    },
    orderBy: { testDate: 'desc' },
    take: Math.min(clientIds.length * 2, 20),
  })

  if (tests.length === 0) return ['Tester: ingen slutförd testdata hittades.']

  const latestByClient = new Map<string, typeof tests[number]>()
  tests.forEach((test) => {
    if (!latestByClient.has(test.clientId)) latestByClient.set(test.clientId, test)
  })

  const staleCount = Array.from(latestByClient.values()).filter(
    (test) => differenceInCalendarDays(now, test.testDate) > 120
  ).length

  return [
    `Tester: ${latestByClient.size}/${clientIds.length} atleter har slutförd testdata. ${staleCount} senaste tester är äldre än 120 dagar.`,
    ...Array.from(latestByClient.values()).slice(0, 6).map((test) =>
      `- ${test.client.name}: ${test.testType} ${fmtDate(test.testDate)}, VO2max ${numberText(test.vo2max)}, maxHR ${numberText(test.maxHR)}, LT1 ${numberText(test.manualLT1Intensity)}, LT2 ${numberText(test.manualLT2Intensity)}`
    ),
  ]
}

async function buildProgramLines(clientIds: string[], start: Date, end: Date): Promise<string[]> {
  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId: { in: clientIds },
      OR: [
        { isActive: true },
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
    select: {
      name: true,
      clientId: true,
      startDate: true,
      endDate: true,
      goalRace: true,
      goalDate: true,
      isActive: true,
      client: { select: { name: true } },
    },
    orderBy: { endDate: 'asc' },
    take: 15,
  })

  if (programs.length === 0) return ['Program: inga aktiva eller periodrelevanta program hittades.']

  return [
    `Program: ${programs.filter((program) => program.isActive).length} aktiva program hittades.`,
    ...programs.slice(0, 6).map((program) =>
      `- ${program.client.name}: ${program.name}, ${fmtDate(program.startDate)} till ${fmtDate(program.endDate)}${program.goalRace ? `, mål ${program.goalRace}` : ''}${program.goalDate ? ` ${fmtDate(program.goalDate)}` : ''}`
    ),
  ]
}

async function buildSessionLines(clientIds: string[], start: Date, end: Date, future: boolean): Promise<string[]> {
  if (future) {
    const workouts = await prisma.workout.findMany({
      where: {
        day: {
          date: { gte: start, lte: end },
          week: {
            program: {
              clientId: { in: clientIds },
            },
          },
        },
        status: { not: 'CANCELLED' },
      },
      select: {
        type: true,
        intensity: true,
        duration: true,
        day: {
          select: {
            date: true,
            week: {
              select: {
                program: {
                  select: { client: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { day: { date: 'asc' } },
      take: 30,
    })

    if (workouts.length === 0) return ['Träningspass: inga kommande planerade pass hittades i vald period.']
    return [
      `Träningspass: ${workouts.length} kommande planerade pass hittades i vald period.`,
      ...workouts.slice(0, 8).map((workout) =>
        `- ${workout.day.week.program.client.name}: ${fmtDate(workout.day.date)} ${workout.type}, ${workout.intensity}, ${workout.duration ?? '?'} min`
      ),
    ]
  }

  const logs = await prisma.workoutLog.findMany({
    where: {
      completedAt: { gte: start, lte: end },
      workout: {
        day: {
          week: {
            program: {
              clientId: { in: clientIds },
            },
          },
        },
      },
    },
    select: {
      completed: true,
      completedAt: true,
      duration: true,
      perceivedEffort: true,
      feeling: true,
      workout: {
        select: {
          type: true,
          day: {
            select: {
              week: {
                select: {
                  program: {
                    select: { client: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: 40,
  })

  if (logs.length === 0) return ['Träningspass: inga loggade pass hittades i vald period.']
  const completed = logs.filter((log) => log.completed).length
  const avgRpe = logs.filter((log) => log.perceivedEffort !== null).reduce((sum, log, _, arr) => sum + (log.perceivedEffort ?? 0) / arr.length, 0)

  return [
    `Träningspass: ${completed}/${logs.length} loggade pass markerade som genomförda. Snitt-RPE ${avgRpe ? numberText(avgRpe) : 'saknas'}.`,
    ...logs.slice(0, 8).map((log) =>
      `- ${log.workout.day.week.program.client.name}: ${fmtDate(log.completedAt)}, ${log.workout.type}, ${log.duration ?? '?'} min${log.feeling ? `, känsla ${log.feeling}` : ''}`
    ),
  ]
}

async function buildReadinessLines(clientIds: string[], start: Date, end: Date): Promise<string[]> {
  const metrics = await prisma.dailyMetrics.findMany({
    where: {
      clientId: { in: clientIds },
      date: { gte: start, lte: end },
    },
    select: {
      clientId: true,
      date: true,
      readinessScore: true,
      readinessLevel: true,
      recommendedAction: true,
      injuryPain: true,
      sleepHours: true,
      energyLevel: true,
      stress: true,
      client: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: Math.min(clientIds.length * 4, 40),
  })

  if (metrics.length === 0) return ['Readiness: ingen readinessdata hittades i vald period.']

  const latestByClient = new Map<string, typeof metrics[number]>()
  metrics.forEach((metric) => {
    if (!latestByClient.has(metric.clientId)) latestByClient.set(metric.clientId, metric)
  })
  const scores = metrics.map((metric) => metric.readinessScore).filter((score): score is number => typeof score === 'number')
  const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
  const painFlags = metrics.filter((metric) => (metric.injuryPain ?? 0) >= 4).length

  return [
    `Readiness: ${latestByClient.size}/${clientIds.length} atleter har readinessdata. Snittscore ${numberText(avgScore)}, smärtflaggor ${painFlags}.`,
    ...Array.from(latestByClient.values()).slice(0, 8).map((metric) =>
      `- ${metric.client.name}: ${fmtDate(metric.date)}, readiness ${numberText(metric.readinessScore)}, nivå ${metric.readinessLevel ?? 'saknas'}, åtgärd ${metric.recommendedAction ?? 'saknas'}`
    ),
  ]
}

function buildNoteLines(clients: Array<{ name: string; notes: string | null }>): string[] {
  const withNotes = clients.filter((client) => client.notes?.trim())
  if (withNotes.length === 0) return ['Anteckningar: inga coachanteckningar hittades för valt urval.']

  return [
    `Anteckningar: ${withNotes.length} atleter har coachanteckningar.`,
    ...withNotes.slice(0, 6).map((client) => {
      const note = client.notes?.trim().replace(/\s+/g, ' ').slice(0, 220)
      return `- ${client.name}: ${note}`
    }),
  ]
}
