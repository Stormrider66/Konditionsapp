import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import { getAccessibleTeam, getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { getStaffPermissions, type StaffPermissions } from '@/lib/permissions/assistant-coach'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { stockholmDateKey } from '@/lib/ai/cardio-workout-action'
import {
  GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME,
  GET_COACH_READINESS_OVERVIEW_TOOL_NAME,
  getCoachLiveVoiceDirectSchema,
  isCoachLiveVoiceDirectToolName,
  type CoachAthleteCardioSummaryInput,
  type CoachLiveVoiceDirectToolName,
  type CoachReadinessOverviewInput,
} from '@/lib/ai/coach-live-voice-tools'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  toolName: z.string().min(1).max(120),
  arguments: z.unknown(),
  callId: z.string().max(200).optional(),
  businessSlug: z.string().trim().min(1).max(120).optional(),
})

type CoachRealtimeToolContext = {
  coachUserId: string
  businessSlug?: string
  staffPermissions: StaffPermissions
  locale: AppLocale
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}

function dateKey(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : stockholmDateKey()
}

function dayBounds(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

function secondsToMinutes(seconds: number | null | undefined): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  return Math.round(seconds / 60)
}

function formatValue(value: number | null | undefined, unit: string, digits = 0): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${value.toFixed(digits)} ${unit}`
}

function baseClientWhere(ctx: CoachRealtimeToolContext): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {
    ...(ctx.businessSlug ? { business: { slug: ctx.businessSlug } } : { userId: ctx.coachUserId }),
  }

  if (ctx.staffPermissions.isTeamScoped) {
    where.teamId = ctx.staffPermissions.assignedTeamIds.length > 0
      ? { in: ctx.staffPermissions.assignedTeamIds }
      : '__no_team_access__'
  }

  return where
}

async function resolveTeamFilter(
  ctx: CoachRealtimeToolContext,
  input: { teamId?: string; teamName?: string }
): Promise<
  | { ok: true; teamId?: string; teamLabel?: string }
  | { ok: false; response: Record<string, unknown> }
> {
  if (input.teamId) {
    const team = await getAccessibleTeam(ctx.coachUserId, input.teamId, ctx.businessSlug)
    if (!team) {
      return {
        ok: false,
        response: {
          success: false,
          error: t(ctx.locale, 'The team was not found or is outside your access.', 'Laget hittades inte eller ligger utanför din behörighet.'),
        },
      }
    }
    return { ok: true, teamId: team.id, teamLabel: team.name }
  }

  if (!input.teamName) return { ok: true }

  const where = await getAccessibleTeamWhere(ctx.coachUserId, ctx.businessSlug)
  const teams = await prisma.team.findMany({
    where: {
      AND: [
        where,
        { name: { contains: input.teamName, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, sportType: true },
    orderBy: { name: 'asc' },
    take: 6,
  })
  const exact = teams.filter((team) => team.name.toLowerCase() === input.teamName?.toLowerCase())
  const selected = exact.length === 1 ? exact[0] : teams.length === 1 ? teams[0] : null

  if (!selected) {
    return {
      ok: false,
      response: {
        success: false,
        needsClarification: teams.length > 1,
        error: teams.length > 1
          ? t(ctx.locale, 'Several matching teams were found. Ask which team.', 'Flera matchande lag hittades. Fråga vilket lag.')
          : t(ctx.locale, 'The team was not found or is outside your access.', 'Laget hittades inte eller ligger utanför din behörighet.'),
        candidates: teams.map((team) => ({ id: team.id, name: team.name, sportType: team.sportType })),
      },
    }
  }

  return { ok: true, teamId: selected.id, teamLabel: selected.name }
}

type AccessibleClient = {
  id: string
  name: string
  team: { id: string; name: string } | null
}

async function resolveAccessibleClient(
  ctx: CoachRealtimeToolContext,
  input: { clientId?: string; athleteName?: string }
): Promise<
  | { ok: true; client: AccessibleClient }
  | { ok: false; response: Record<string, unknown> }
> {
  const where: Prisma.ClientWhereInput = {
    ...baseClientWhere(ctx),
    ...(input.clientId ? { id: input.clientId } : {}),
    ...(input.athleteName ? { name: { contains: input.athleteName, mode: 'insensitive' } } : {}),
  }
  const candidates = await prisma.client.findMany({
    where,
    select: {
      id: true,
      name: true,
      team: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
    take: 8,
  })

  const accessible: AccessibleClient[] = []
  for (const candidate of candidates) {
    const access = await canAccessAthlete(ctx.coachUserId, candidate.id)
    if (!access.allowed) continue
    accessible.push(candidate)
  }

  const exact = input.athleteName
    ? accessible.filter((candidate) => candidate.name.toLowerCase() === input.athleteName?.toLowerCase())
    : []
  const client = input.clientId
    ? accessible[0] ?? null
    : exact.length === 1 ? exact[0] : accessible.length === 1 ? accessible[0] : null

  if (!client) {
    return {
      ok: false,
      response: {
        success: false,
        needsClarification: accessible.length > 1,
        error: accessible.length > 1
          ? t(ctx.locale, 'Several matching athletes were found. Ask which athlete.', 'Flera matchande atleter hittades. Fråga vilken atlet.')
          : t(ctx.locale, 'The athlete was not found or is outside your access.', 'Atleten hittades inte eller ligger utanför din behörighet.'),
        candidates: accessible.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          team: candidate.team?.name ?? null,
        })),
      },
    }
  }

  return { ok: true, client }
}

async function getCoachReadinessOverview(
  ctx: CoachRealtimeToolContext,
  input: CoachReadinessOverviewInput
) {
  const key = dateKey(input.date)
  const { start, end } = dayBounds(key)
  const teamFilter = await resolveTeamFilter(ctx, input)
  if (!teamFilter.ok) return teamFilter.response

  const where: Prisma.ClientWhereInput = {
    ...baseClientWhere(ctx),
    ...(teamFilter.teamId ? { teamId: teamFilter.teamId } : {}),
  }
  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      name: true,
      team: { select: { name: true } },
      dailyCheckIns: {
        where: { date: { lte: end } },
        select: {
          date: true,
          readinessScore: true,
          readinessDecision: true,
          sleepHours: true,
          soreness: true,
          fatigue: true,
          stress: true,
          notes: true,
        },
        orderBy: { date: 'desc' },
        take: 1,
      },
      injuryAssessments: {
        where: {
          status: { in: ['ACTIVE', 'MONITORING'] },
          resolved: false,
        },
        select: { bodyPart: true, side: true, painLevel: true, status: true },
        orderBy: { detectedAt: 'desc' },
        take: 1,
      },
      cardioSessionAssignments: {
        where: { assignedDate: { gte: start, lte: end } },
        select: { status: true, session: { select: { name: true, sport: true, totalDuration: true } } },
        take: 3,
      },
      strengthSessionAssignments: {
        where: { assignedDate: { gte: start, lte: end } },
        select: { status: true, session: { select: { name: true, estimatedDuration: true } } },
        take: 3,
      },
    },
    orderBy: { name: 'asc' },
    take: 80,
  })

  const accessible = []
  for (const client of clients) {
    const access = await canAccessAthlete(ctx.coachUserId, client.id)
    if (access.allowed) accessible.push(client)
  }

  const rows = accessible.map((client) => {
    const checkIn = client.dailyCheckIns[0] ?? null
    const injury = client.injuryAssessments[0] ?? null
    const readiness = checkIn?.readinessScore ?? null
    const hasCheckInToday = checkIn ? checkIn.date >= start && checkIn.date <= end : false
    const plannedCount = client.cardioSessionAssignments.length + client.strengthSessionAssignments.length
    const attentionScore =
      (injury ? 1000 : 0) +
      (!hasCheckInToday ? 500 : 0) +
      (typeof readiness === 'number' ? Math.max(0, 100 - readiness) : 80) +
      (checkIn?.readinessDecision && checkIn.readinessDecision !== 'PROCEED' && checkIn.readinessDecision !== 'TRAIN' ? 80 : 0)

    return {
      clientId: client.id,
      name: client.name,
      teamName: client.team?.name ?? null,
      readinessScore: readiness,
      readinessDecision: checkIn?.readinessDecision ?? null,
      hasCheckInToday,
      soreness: checkIn?.soreness ?? null,
      fatigue: checkIn?.fatigue ?? null,
      stress: checkIn?.stress ?? null,
      sleepHours: checkIn?.sleepHours ?? null,
      injury: injury
        ? {
            bodyPart: injury.bodyPart,
            side: injury.side,
            painLevel: injury.painLevel,
            status: injury.status,
          }
        : null,
      plannedCount,
      planned: [
        ...client.cardioSessionAssignments.map((assignment) => ({
          type: 'CARDIO',
          name: assignment.session.name,
          detail: assignment.session.sport,
          durationMinutes: secondsToMinutes(assignment.session.totalDuration),
          status: assignment.status,
        })),
        ...client.strengthSessionAssignments.map((assignment) => ({
          type: 'STRENGTH',
          name: assignment.session.name,
          detail: null,
          durationMinutes: assignment.session.estimatedDuration,
          status: assignment.status,
        })),
      ],
      attentionScore,
    }
  }).sort((a, b) => b.attentionScore - a.attentionScore || a.name.localeCompare(b.name))

  const limit = input.limit ?? 6
  const attentionRows = rows
    .filter((row) => row.attentionScore >= 80 || row.plannedCount > 0)
    .slice(0, limit)

  const topLine = attentionRows.slice(0, 4).map((row) => {
    const readiness = typeof row.readinessScore === 'number' ? `${row.readinessScore}/100` : t(ctx.locale, 'no readiness', 'ingen readiness')
    const injury = row.injury ? `, ${t(ctx.locale, 'injury', 'skada')} ${row.injury.bodyPart ?? ''}${row.injury.painLevel != null ? ` pain ${row.injury.painLevel}/10` : ''}` : ''
    const checkIn = row.hasCheckInToday ? '' : `, ${t(ctx.locale, 'no check-in today', 'ingen check-in idag')}`
    return `${row.name}: ${readiness}${checkIn}${injury}`
  }).join(' | ')

  return {
    success: true,
    message: attentionRows.length > 0
      ? t(
          ctx.locale,
          `${attentionRows.length} athletes need a look${teamFilter.teamLabel ? ` in ${teamFilter.teamLabel}` : ''}: ${topLine}.`,
          `${attentionRows.length} atleter behöver en titt${teamFilter.teamLabel ? ` i ${teamFilter.teamLabel}` : ''}: ${topLine}.`
        )
      : t(ctx.locale, `No obvious readiness flags for ${key}.`, `Inga tydliga readinessflaggor för ${key}.`),
    overview: {
      date: key,
      teamName: teamFilter.teamLabel ?? null,
      totalAthletes: rows.length,
      attentionCount: attentionRows.length,
      athletes: attentionRows.map(({ attentionScore: _attentionScore, ...row }) => row),
    },
  }
}

async function getCoachAthleteCardioSummary(
  ctx: CoachRealtimeToolContext,
  input: CoachAthleteCardioSummaryInput
) {
  const resolved = await resolveAccessibleClient(ctx, input)
  if (!resolved.ok) return resolved.response

  const days = input.days ?? 21
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const today = dayBounds(stockholmDateKey())

  const [logs, planned] = await Promise.all([
    prisma.cardioSessionLog.findMany({
      where: {
        athleteId: resolved.client.id,
        startedAt: { gte: since },
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        status: true,
        actualDuration: true,
        actualDistance: true,
        avgHeartRate: true,
        maxHeartRate: true,
        avgPower: true,
        maxPower: true,
        sessionRPE: true,
        notes: true,
        session: { select: { name: true, sport: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
    prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: resolved.client.id,
        assignedDate: { gte: today.start, lte: today.end },
        status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] },
      },
      select: {
        id: true,
        status: true,
        session: { select: { name: true, sport: true, totalDuration: true } },
      },
      take: 3,
    }),
  ])

  const avgPowerRows = logs.filter((log) => typeof log.avgPower === 'number')
  const avgHrRows = logs.filter((log) => typeof log.avgHeartRate === 'number')
  const latest = logs[0] ?? null
  const avgPower = avgPowerRows.length
    ? Math.round(avgPowerRows.reduce((sum, log) => sum + (log.avgPower ?? 0), 0) / avgPowerRows.length)
    : null
  const avgHr = avgHrRows.length
    ? Math.round(avgHrRows.reduce((sum, log) => sum + (log.avgHeartRate ?? 0), 0) / avgHrRows.length)
    : null

  const latestBits = latest
    ? [
        latest.session.name,
        secondsToMinutes(latest.actualDuration) != null ? `${secondsToMinutes(latest.actualDuration)} min` : null,
        formatValue(latest.actualDistance, 'km', 1),
        formatValue(latest.avgPower, 'W'),
        latest.sessionRPE != null ? `RPE ${latest.sessionRPE}/10` : null,
      ].filter(Boolean).join(', ')
    : null
  const plannedText = planned.length
    ? planned.map((assignment) => `${assignment.session.name} (${secondsToMinutes(assignment.session.totalDuration) ?? '?'} min)`).join(', ')
    : null

  return {
    success: true,
    message: logs.length > 0
      ? t(
          ctx.locale,
          `${resolved.client.name} has ${logs.length} cardio logs in the last ${days} days. Latest: ${latestBits}. Averages where available: ${avgPower ?? 'no'} W, ${avgHr ?? 'no'} bpm.${plannedText ? ` Planned today: ${plannedText}.` : ''}`,
          `${resolved.client.name} har ${logs.length} konditionsloggar de senaste ${days} dagarna. Senast: ${latestBits}. Snitt där det finns data: ${avgPower ?? 'ingen'} W, ${avgHr ?? 'ingen'} bpm.${plannedText ? ` Planerat idag: ${plannedText}.` : ''}`
        )
      : t(
          ctx.locale,
          `${resolved.client.name} has no cardio logs in the last ${days} days.${plannedText ? ` Planned today: ${plannedText}.` : ''}`,
          `${resolved.client.name} har inga konditionsloggar de senaste ${days} dagarna.${plannedText ? ` Planerat idag: ${plannedText}.` : ''}`
        ),
    summary: {
      athlete: resolved.client,
      days,
      logCount: logs.length,
      averagePower: avgPower,
      averageHeartRate: avgHr,
      latestLog: latest,
      plannedToday: planned,
    },
  }
}

async function executeDirectTool(
  toolName: CoachLiveVoiceDirectToolName,
  ctx: CoachRealtimeToolContext,
  input: unknown,
) {
  switch (toolName) {
    case GET_COACH_READINESS_OVERVIEW_TOOL_NAME:
      return getCoachReadinessOverview(ctx, input as CoachReadinessOverviewInput)
    case GET_COACH_ATHLETE_CARDIO_SUMMARY_TOOL_NAME:
      return getCoachAthleteCardioSummary(ctx, input as CoachAthleteCardioSummaryInput)
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ success: false, error: t(locale, 'Coach access required', 'Coachbehörighet krävs') }, { status: 403 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-coach-tools', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success || !isCoachLiveVoiceDirectToolName(parsedRequest.data.toolName)) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unsupported coach live voice tool.', 'Coachens live voice-verktyg stöds inte.') },
        { status: 400 }
      )
    }

    const scope = getRequestedBusinessScope(request)
    const businessSlug = parsedRequest.data.businessSlug || scope.businessSlug
    const staffPermissions = await getStaffPermissions(user.id, businessSlug, { locale })
    if (!staffPermissions.canViewAthletes) {
      return NextResponse.json(
        { success: false, error: t(locale, 'You do not have permission to view athletes.', 'Du har inte behörighet att se atleter.') },
        { status: 403 }
      )
    }

    let rawArguments: unknown
    try {
      rawArguments = parseToolArguments(parsedRequest.data.arguments)
    } catch {
      return NextResponse.json(
        { success: false, error: t(locale, 'The tool arguments were not valid JSON.', 'Verktygsargumenten var inte giltig JSON.') },
        { status: 400 }
      )
    }

    const toolName = parsedRequest.data.toolName
    const parsedInput = getCoachLiveVoiceDirectSchema(toolName).safeParse(rawArguments)
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'The tool details were incomplete or invalid.', 'Verktygsdetaljerna var ofullständiga eller ogiltiga.'),
          details: parsedInput.error.flatten(),
        },
        { status: 400 }
      )
    }

    const result = await executeDirectTool(
      toolName,
      {
        coachUserId: user.id,
        businessSlug,
        staffPermissions,
        locale,
      },
      parsedInput.data,
    )
    return NextResponse.json({
      ...result,
      callId: parsedRequest.data.callId,
      toolName,
    })
  } catch (error) {
    logger.error('Realtime coach direct tool error', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not run the coach live voice tool.', 'Kunde inte köra coachens live voice-verktyg.') },
      { status: 500 }
    )
  }
}
