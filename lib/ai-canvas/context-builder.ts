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

export type CanvasAnalyticsBlock =
  | {
      type: 'metric-row'
      title: string
      metrics: Array<{
        label: string
        value: string
        detail?: string
        tone?: 'neutral' | 'positive' | 'warning' | 'danger'
      }>
      source: 'analytics'
    }
  | {
      type: 'risk-list'
      title: string
      risks: Array<{
        title: string
        description: string
        priority: 'low' | 'medium' | 'high'
        meta?: string
      }>
      source: 'analytics'
    }
  | {
      type: 'trend-summary'
      title: string
      trends: Array<{
        label: string
        value: string
        direction: 'up' | 'down' | 'flat'
        detail?: string
      }>
      source: 'analytics'
    }
  | {
      type: 'chart'
      title: string
      content?: string
      chartType: 'bar' | 'line'
      unit?: string
      points: Array<{
        label: string
        value: number
        detail?: string
      }>
      source: 'analytics'
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

export async function buildCanvasAnalyticsBlocks({
  userId,
  businessSlug,
  businessId,
  role,
  selection,
  now = new Date(),
}: BuildCanvasContextParams): Promise<CanvasAnalyticsBlock[]> {
  if (!selection || selection.scope === 'none') return []

  const dataKeys = uniqueDataKeys(selection.dataKeys)
  if (dataKeys.length === 0) return []

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

  if (!clientWhere) return []

  const clients = await prisma.client.findMany({
    where: clientWhere,
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
    take: selection.scope === 'athlete' ? 1 : 80,
  })

  if (clients.length === 0) return []

  const clientIds = clients.map((client) => client.id)
  const clientNames = new Map(clients.map((client) => [client.id, client.name]))
  const [testAnalytics, programAnalytics, sessionAnalytics, readinessAnalytics, noteAnalytics] = await Promise.all([
    dataKeys.includes('tests') ? getTestAnalytics(clientIds, clientNames, now) : Promise.resolve(null),
    dataKeys.includes('programs') ? getProgramAnalytics(clientIds, clientNames, now) : Promise.resolve(null),
    dataKeys.includes('sessions') ? getSessionAnalytics(clientIds, clientNames, window.start, window.end, window.future) : Promise.resolve(null),
    dataKeys.includes('readiness') ? getReadinessAnalytics(clientIds, clientNames, window.start, window.end) : Promise.resolve(null),
    dataKeys.includes('notes') ? getNoteAnalytics(clientIds) : Promise.resolve(null),
  ])

  const metrics: Extract<CanvasAnalyticsBlock, { type: 'metric-row' }>['metrics'] = [
    {
      label: selection.scope === 'athlete' ? 'Atlet' : 'Atleter',
      value: String(clients.length),
      detail: selection.scope === 'athlete' ? clients[0].name : 'i valt urval',
      tone: 'neutral',
    },
  ]

  if (testAnalytics) metrics.push(testAnalytics.metric)
  if (programAnalytics) metrics.push(programAnalytics.metric)
  if (sessionAnalytics) metrics.push(sessionAnalytics.metric)
  if (readinessAnalytics) metrics.push(readinessAnalytics.metric)
  if (noteAnalytics) metrics.push(noteAnalytics.metric)

  const risks = [
    ...(testAnalytics?.risks ?? []),
    ...(programAnalytics?.risks ?? []),
    ...(sessionAnalytics?.risks ?? []),
    ...(readinessAnalytics?.risks ?? []),
  ].slice(0, 8)

  const trends = [
    ...(testAnalytics?.trends ?? []),
    ...(programAnalytics?.trends ?? []),
    ...(sessionAnalytics?.trends ?? []),
    ...(readinessAnalytics?.trends ?? []),
    ...(noteAnalytics?.trends ?? []),
  ].slice(0, 8)
  const charts = [
    ...(testAnalytics?.charts ?? []),
    ...(programAnalytics?.charts ?? []),
    ...(sessionAnalytics?.charts ?? []),
    ...(readinessAnalytics?.charts ?? []),
  ].slice(0, 2)

  const blocks: CanvasAnalyticsBlock[] = [
    {
      type: 'metric-row',
      title: 'Datadriven översikt',
      metrics,
      source: 'analytics',
    },
  ]

  if (risks.length > 0) {
    blocks.push({
      type: 'risk-list',
      title: 'Risker och uppföljningar',
      risks,
      source: 'analytics',
    })
  }

  if (trends.length > 0) {
    blocks.push({
      type: 'trend-summary',
      title: 'Trendbild',
      trends,
      source: 'analytics',
    })
  }

  blocks.push(...charts)

  return blocks
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

interface AnalyticsResult {
  metric: Extract<CanvasAnalyticsBlock, { type: 'metric-row' }>['metrics'][number]
  risks: Extract<CanvasAnalyticsBlock, { type: 'risk-list' }>['risks']
  trends: Extract<CanvasAnalyticsBlock, { type: 'trend-summary' }>['trends']
  charts: Extract<CanvasAnalyticsBlock, { type: 'chart' }>[]
}

async function getTestAnalytics(
  clientIds: string[],
  clientNames: Map<string, string>,
  now: Date
): Promise<AnalyticsResult> {
  const tests = await prisma.test.findMany({
    where: {
      clientId: { in: clientIds },
      status: 'COMPLETED',
    },
    select: {
      clientId: true,
      testDate: true,
    },
    orderBy: { testDate: 'desc' },
  })

  const latestByClient = new Map<string, Date>()
  tests.forEach((test) => {
    if (!latestByClient.has(test.clientId)) latestByClient.set(test.clientId, test.testDate)
  })

  const missingNames = clientIds
    .filter((clientId) => !latestByClient.has(clientId))
    .map((clientId) => clientNames.get(clientId) ?? 'Okänd atlet')

  const staleNames = Array.from(latestByClient.entries())
    .filter(([, testDate]) => differenceInCalendarDays(now, testDate) > 120)
    .map(([clientId]) => clientNames.get(clientId) ?? 'Okänd atlet')
  const testAgePoints = Array.from(latestByClient.entries())
    .map(([clientId, testDate]) => ({
      label: (clientNames.get(clientId) ?? 'Okänd').slice(0, 18),
      value: differenceInCalendarDays(now, testDate),
      detail: fmtDate(testDate),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const coveragePercent = Math.round((latestByClient.size / Math.max(clientIds.length, 1)) * 100)
  const risks: AnalyticsResult['risks'] = []

  if (staleNames.length > 0) {
    risks.push({
      title: 'Gammal testdata',
      description: `${staleNames.slice(0, 4).join(', ')}${staleNames.length > 4 ? ` +${staleNames.length - 4}` : ''}`,
      priority: staleNames.length >= 3 ? 'high' : 'medium',
      meta: 'Senaste test äldre än 120 dagar',
    })
  }

  if (missingNames.length > 0) {
    risks.push({
      title: 'Saknar slutförd test',
      description: `${missingNames.slice(0, 4).join(', ')}${missingNames.length > 4 ? ` +${missingNames.length - 4}` : ''}`,
      priority: missingNames.length >= 3 ? 'high' : 'medium',
      meta: 'Ingen completed test hittades',
    })
  }

  return {
    metric: {
      label: 'Testtäckning',
      value: `${coveragePercent}%`,
      detail: `${latestByClient.size}/${clientIds.length} har test`,
      tone: coveragePercent >= 80 ? 'positive' : coveragePercent >= 50 ? 'warning' : 'danger',
    },
    risks,
    trends: [
      {
        label: 'Teststatus',
        value: `${staleNames.length + missingNames.length} behöver kontroll`,
        direction: staleNames.length + missingNames.length > 0 ? 'down' : 'flat',
        detail: 'Baserat på completed tests',
      },
    ],
    charts: testAgePoints.length > 1
      ? [{
          type: 'chart',
          title: 'Testålder per atlet',
          content: 'Antal dagar sedan senaste slutförda test för atleter med testdata.',
          chartType: 'bar',
          unit: 'dagar',
          points: testAgePoints,
          source: 'analytics',
        }]
      : [],
  }
}

async function getProgramAnalytics(
  clientIds: string[],
  clientNames: Map<string, string>,
  now: Date
): Promise<AnalyticsResult> {
  const programs = await prisma.trainingProgram.findMany({
    where: {
      clientId: { in: clientIds },
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: {
      clientId: true,
      endDate: true,
    },
    orderBy: { endDate: 'asc' },
  })

  const programClientIds = new Set(programs.map((program) => program.clientId))
  const missingProgramNames = clientIds
    .filter((clientId) => !programClientIds.has(clientId))
    .map((clientId) => clientNames.get(clientId) ?? 'Okänd atlet')
  const endingSoon = programs.filter((program) => differenceInCalendarDays(program.endDate, now) <= 14)

  const risks: AnalyticsResult['risks'] = []
  if (missingProgramNames.length > 0) {
    risks.push({
      title: 'Saknar aktivt program',
      description: `${missingProgramNames.slice(0, 4).join(', ')}${missingProgramNames.length > 4 ? ` +${missingProgramNames.length - 4}` : ''}`,
      priority: missingProgramNames.length >= 3 ? 'high' : 'medium',
      meta: 'Inget aktivt program i dag',
    })
  }
  if (endingSoon.length > 0) {
    risks.push({
      title: 'Program slutar snart',
      description: `${endingSoon.length} program slutar inom 14 dagar`,
      priority: 'medium',
      meta: 'Bra läge att planera nästa block',
    })
  }

  return {
    metric: {
      label: 'Aktiva program',
      value: String(programs.length),
      detail: `${programClientIds.size}/${clientIds.length} atleter täckta`,
      tone: programClientIds.size === clientIds.length ? 'positive' : 'warning',
    },
    risks,
    trends: [
      {
        label: 'Programtäckning',
        value: `${Math.round((programClientIds.size / Math.max(clientIds.length, 1)) * 100)}%`,
        direction: programClientIds.size === clientIds.length ? 'flat' : 'down',
        detail: 'Aktiva program just nu',
      },
    ],
    charts: [],
  }
}

async function getSessionAnalytics(
  clientIds: string[],
  clientNames: Map<string, string>,
  start: Date,
  end: Date,
  future: boolean
): Promise<AnalyticsResult> {
  if (future) {
    const planned = await prisma.workout.count({
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
    })

    return {
      metric: {
        label: 'Planerade pass',
        value: String(planned),
        detail: 'kommande period',
        tone: planned > 0 ? 'positive' : 'warning',
      },
      risks: planned === 0
        ? [{
            title: 'Inga kommande pass',
            description: 'Valt urval saknar planerade pass i perioden.',
            priority: 'medium',
            meta: 'Kontrollera program eller kalender',
          }]
        : [],
      trends: [{
        label: 'Planering framåt',
        value: planned > 0 ? `${planned} pass` : 'saknas',
        direction: planned > 0 ? 'flat' : 'down',
        detail: 'Baserat på programmens kommande träningsdagar',
      }],
      charts: [],
    }
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
      perceivedEffort: true,
      workout: {
        select: {
          day: {
            select: {
              week: {
                select: {
                  program: {
                    select: { clientId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const completed = logs.filter((log) => log.completed).length
  const activeClientIds = new Set(logs.map((log) => log.workout.day.week.program.clientId))
  const logsByClient = logs.reduce((acc, log) => {
    const clientId = log.workout.day.week.program.clientId
    const current = acc.get(clientId) ?? { total: 0, completed: 0 }
    current.total += 1
    if (log.completed) current.completed += 1
    acc.set(clientId, current)
    return acc
  }, new Map<string, { total: number; completed: number }>())
  const inactiveNames = clientIds
    .filter((clientId) => !activeClientIds.has(clientId))
    .map((clientId) => clientNames.get(clientId) ?? 'Okänd atlet')
  const rpeScores = logs.map((log) => log.perceivedEffort).filter((value): value is number => typeof value === 'number')
  const avgRpe = rpeScores.length ? rpeScores.reduce((sum, value) => sum + value, 0) / rpeScores.length : null

  return {
    metric: {
      label: 'Loggade pass',
      value: String(completed),
      detail: avgRpe ? `snitt-RPE ${numberText(avgRpe)}` : 'RPE saknas',
      tone: completed > 0 ? 'positive' : 'warning',
    },
    risks: inactiveNames.length > 0
      ? [{
          title: 'Ingen passlogg i perioden',
          description: `${inactiveNames.slice(0, 4).join(', ')}${inactiveNames.length > 4 ? ` +${inactiveNames.length - 4}` : ''}`,
          priority: inactiveNames.length >= 3 ? 'high' : 'medium',
          meta: 'Baserat på workout logs',
        }]
      : [],
    trends: [{
      label: 'Träningsaktivitet',
      value: `${activeClientIds.size}/${clientIds.length} aktiva`,
      direction: activeClientIds.size === clientIds.length ? 'flat' : 'down',
      detail: 'Atleter med loggade pass i perioden',
    }],
    charts: logsByClient.size > 1
      ? [{
          type: 'chart',
          title: 'Genomförda pass per atlet',
          content: 'Antal genomförda pass i vald period baserat på workout logs.',
          chartType: 'bar',
          unit: 'pass',
          points: Array.from(logsByClient.entries())
            .map(([clientId, item]) => ({
              label: (clientNames.get(clientId) ?? 'Okänd').slice(0, 18),
              value: item.completed,
              detail: `${item.completed}/${item.total} loggar`,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8),
          source: 'analytics',
        }]
      : [],
  }
}

async function getReadinessAnalytics(
  clientIds: string[],
  clientNames: Map<string, string>,
  start: Date,
  end: Date
): Promise<AnalyticsResult> {
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
    },
    orderBy: { date: 'desc' },
  })

  const latestByClient = new Map<string, typeof metrics[number]>()
  metrics.forEach((metric) => {
    if (!latestByClient.has(metric.clientId)) latestByClient.set(metric.clientId, metric)
  })

  const scores = metrics.map((metric) => metric.readinessScore).filter((value): value is number => typeof value === 'number')
  const avgScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null
  const lowReadiness = Array.from(latestByClient.values()).filter((metric) =>
    (metric.readinessScore ?? 10) <= 5 ||
    ['MODIFY_MODERATE', 'MODIFY_SIGNIFICANT', 'REST_REQUIRED'].includes(metric.recommendedAction ?? '')
  )
  const painFlags = Array.from(latestByClient.values()).filter((metric) => (metric.injuryPain ?? 0) >= 4)
  const readinessPoints = Array.from(latestByClient.values())
    .filter((metric) => typeof metric.readinessScore === 'number')
    .map((metric) => ({
      label: (clientNames.get(metric.clientId) ?? 'Okänd').slice(0, 18),
      value: metric.readinessScore ?? 0,
      detail: fmtDate(metric.date),
    }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 8)

  const risks: AnalyticsResult['risks'] = []
  if (lowReadiness.length > 0) {
    risks.push({
      title: 'Låg readiness',
      description: lowReadiness
        .slice(0, 4)
        .map((metric) => clientNames.get(metric.clientId) ?? 'Okänd atlet')
        .join(', '),
      priority: lowReadiness.length >= 3 ? 'high' : 'medium',
      meta: 'Readinessscore låg eller rekommenderad modifiering',
    })
  }
  if (painFlags.length > 0) {
    risks.push({
      title: 'Smärtflaggor',
      description: `${painFlags.length} senaste readinessposter har smärta 4+`,
      priority: 'high',
      meta: 'Kontrollera belastning och uppföljning',
    })
  }

  return {
    metric: {
      label: 'Readiness',
      value: numberText(avgScore),
      detail: `${latestByClient.size}/${clientIds.length} med data`,
      tone: avgScore === null ? 'warning' : avgScore >= 7 ? 'positive' : avgScore >= 5 ? 'warning' : 'danger',
    },
    risks,
    trends: [{
      label: 'Readinessläge',
      value: avgScore === null ? 'saknas' : numberText(avgScore),
      direction: avgScore === null ? 'flat' : avgScore >= 7 ? 'up' : avgScore >= 5 ? 'flat' : 'down',
      detail: 'Genomsnitt i vald period',
    }],
    charts: readinessPoints.length > 1
      ? [{
          type: 'chart',
          title: 'Senaste readiness per atlet',
          content: 'Senaste readinessscore per atlet i valt urval.',
          chartType: 'bar',
          unit: 'score',
          points: readinessPoints,
          source: 'analytics',
        }]
      : [],
  }
}

async function getNoteAnalytics(clientIds: string[]): Promise<AnalyticsResult> {
  const notesCount = await prisma.client.count({
    where: {
      id: { in: clientIds },
      notes: { not: null },
    },
  })

  return {
    metric: {
      label: 'Coachnoteringar',
      value: String(notesCount),
      detail: `${notesCount}/${clientIds.length} atleter`,
      tone: notesCount > 0 ? 'neutral' : 'warning',
    },
    risks: [],
    trends: [{
      label: 'Anteckningsunderlag',
      value: notesCount > 0 ? `${notesCount} finns` : 'saknas',
      direction: notesCount > 0 ? 'flat' : 'down',
      detail: 'Baserat på klientanteckningar',
    }],
    charts: [],
  }
}
