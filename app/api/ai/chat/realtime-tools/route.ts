import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'
import { getConsentStatus } from '@/lib/agent/gdpr/consent-manager'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import {
  GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME,
  GET_READINESS_BRIEFING_TOOL_NAME,
  OPEN_TODAY_WORKOUT_TOOL_NAME,
  PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME,
  getAthleteLiveVoiceDirectSchema,
  isAthleteLiveVoiceDirectToolName,
  stockholmDateKey,
  type AthleteLiveVoiceDirectToolName,
  type GetQuickErgMatchSuggestionsInput,
  type GetReadinessBriefingInput,
  type OpenTodayWorkoutInput,
  type ProposeWorkoutModificationInput,
} from '@/lib/ai/athlete-live-voice-tools'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  asQuickErgStoredPlannedCardioMatch,
  buildQuickErgPlannedCardioSuggestions,
  type QuickErgPlannedCardioCandidate,
} from '@/lib/quick-erg/planned-match'
import {
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  toolName: z.string().min(1).max(120),
  arguments: z.unknown(),
  callId: z.string().max(200).optional(),
})

type WorkoutCandidateKind = 'CARDIO' | 'STRENGTH' | 'WOD'

interface WorkoutNavigationCandidate {
  id: string
  kind: WorkoutCandidateKind
  name: string
  date: string
  status: string
  href: string
  durationMinutes: number | null
  detail: string | null
  startTime?: string | null
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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function secondsToMinutes(seconds: number | null | undefined): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  return Math.round(seconds / 60)
}

function asMachineKind(value: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function displayMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asMachineKind(session.machineKind ?? null),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

function sortWorkoutCandidates(a: WorkoutNavigationCandidate, b: WorkoutNavigationCandidate): number {
  const startA = a.startTime || '99:99'
  const startB = b.startTime || '99:99'
  if (startA !== startB) return startA.localeCompare(startB)
  const kindRank: Record<WorkoutCandidateKind, number> = { CARDIO: 0, STRENGTH: 1, WOD: 2 }
  return kindRank[a.kind] - kindRank[b.kind]
}

async function findPlannedWorkoutsForDate(
  clientId: string,
  key: string,
  kind: OpenTodayWorkoutInput['kind'] = 'ANY'
): Promise<WorkoutNavigationCandidate[]> {
  const { start, end } = dayBounds(key)
  const wants = (candidateKind: WorkoutCandidateKind) => !kind || kind === 'ANY' || kind === candidateKind

  const [cardio, strength, wods] = await Promise.all([
    wants('CARDIO')
      ? prisma.cardioSessionAssignment.findMany({
          where: {
            athleteId: clientId,
            status: { in: ['PENDING', 'SCHEDULED'] },
            assignedDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            assignedDate: true,
            status: true,
            startTime: true,
            session: { select: { name: true, sport: true, totalDuration: true } },
          },
          take: 5,
        })
      : Promise.resolve([]),
    wants('STRENGTH')
      ? prisma.strengthSessionAssignment.findMany({
          where: {
            athleteId: clientId,
            status: { in: ['PENDING', 'SCHEDULED'] },
            assignedDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            assignedDate: true,
            status: true,
            startTime: true,
            session: { select: { name: true, phase: true, estimatedDuration: true } },
          },
          take: 5,
        })
      : Promise.resolve([]),
    wants('WOD')
      ? prisma.aIGeneratedWOD.findMany({
          where: {
            clientId,
            status: { in: ['GENERATED', 'STARTED'] },
            createdAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            createdAt: true,
            status: true,
            title: true,
            workoutType: true,
            requestedDuration: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
  ])

  return [
    ...cardio.map((assignment): WorkoutNavigationCandidate => ({
      id: assignment.id,
      kind: 'CARDIO',
      name: assignment.session.name,
      date: isoDate(assignment.assignedDate),
      status: assignment.status,
      href: `/athlete/cardio?start=${encodeURIComponent(assignment.id)}`,
      durationMinutes: secondsToMinutes(assignment.session.totalDuration),
      detail: assignment.session.sport,
      startTime: assignment.startTime,
    })),
    ...strength.map((assignment): WorkoutNavigationCandidate => ({
      id: assignment.id,
      kind: 'STRENGTH',
      name: assignment.session.name,
      date: isoDate(assignment.assignedDate),
      status: assignment.status,
      href: `/athlete/strength?start=${encodeURIComponent(assignment.id)}`,
      durationMinutes: assignment.session.estimatedDuration,
      detail: assignment.session.phase,
      startTime: assignment.startTime,
    })),
    ...wods.map((wod): WorkoutNavigationCandidate => ({
      id: wod.id,
      kind: 'WOD',
      name: wod.title,
      date: isoDate(wod.createdAt),
      status: wod.status,
      href: `/athlete/wod/${encodeURIComponent(wod.id)}`,
      durationMinutes: wod.requestedDuration,
      detail: wod.workoutType,
    })),
  ].sort(sortWorkoutCandidates)
}

async function openTodayWorkout(clientId: string, input: OpenTodayWorkoutInput, locale: AppLocale) {
  const key = dateKey(input.date)
  const candidates = await findPlannedWorkoutsForDate(clientId, key, input.kind)

  if (candidates.length === 0) {
    return {
      success: false,
      error: t(locale, 'No pending planned workout was found for that date.', 'Inget väntande planerat pass hittades för det datumet.'),
    }
  }

  if (candidates.length > 1) {
    return {
      success: false,
      needsClarification: true,
      error: t(locale, 'Several workouts are planned. Ask which one to open.', 'Flera pass är planerade. Fråga vilket som ska öppnas.'),
      candidates,
    }
  }

  const workout = candidates[0]
  return {
    success: true,
    message: t(locale, `Opening ${workout.name}.`, `Öppnar ${workout.name}.`),
    workout,
    navigation: {
      href: workout.href,
      label: t(locale, 'Open workout', 'Öppna pass'),
      autoNavigate: true,
    },
  }
}

async function getReadinessBriefing(clientId: string, input: GetReadinessBriefingInput, locale: AppLocale) {
  const key = dateKey(input.date)
  const { start, end } = dayBounds(key)
  const loadSince = new Date(start)
  loadSince.setUTCDate(loadSince.getUTCDate() - 7)

  const [checkIn, latestAcwr, loadRows, injuries, workouts] = await Promise.all([
    prisma.dailyCheckIn.findFirst({
      where: { clientId, date: { lte: end } },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        readinessScore: true,
        readinessDecision: true,
        sleepQuality: true,
        sleepHours: true,
        soreness: true,
        fatigue: true,
        stress: true,
        mood: true,
        motivation: true,
        hrv: true,
        restingHR: true,
      },
    }),
    prisma.trainingLoad.findFirst({
      where: { clientId, source: 'ACWR_SUMMARY', acwr: { not: null } },
      orderBy: { date: 'desc' },
      select: { date: true, acuteLoad: true, chronicLoad: true, acwr: true, acwrZone: true, injuryRisk: true },
    }),
    prisma.trainingLoad.findMany({
      where: { clientId, source: 'WORKOUT', date: { gte: loadSince, lte: end } },
      select: { dailyLoad: true, duration: true },
    }),
    prisma.injuryAssessment.findMany({
      where: { clientId, status: { in: ['ACTIVE', 'MONITORING'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { bodyPart: true, side: true, painLevel: true, phase: true, status: true },
    }),
    findPlannedWorkoutsForDate(clientId, key, 'ANY'),
  ])

  const weeklyLoad = loadRows.reduce((sum, row) => sum + row.dailyLoad, 0)
  const weeklyMinutes = loadRows.reduce((sum, row) => sum + row.duration, 0)
  const readinessLine = checkIn?.readinessScore != null
    ? `${Math.round(checkIn.readinessScore)}/100`
    : t(locale, 'no readiness score', 'ingen readiness-score')
  const loadLine = latestAcwr?.acwr != null
    ? `ACWR ${latestAcwr.acwr.toFixed(2)} (${latestAcwr.acwrZone || t(locale, 'no zone', 'ingen zon')})`
    : t(locale, 'no ACWR yet', 'ingen ACWR ännu')
  const injuryLine = injuries.length
    ? injuries.map((injury) => `${injury.bodyPart}${injury.side ? ` ${injury.side}` : ''}${injury.painLevel != null ? ` pain ${injury.painLevel}/10` : ''}`).join(', ')
    : t(locale, 'no active injuries', 'inga aktiva skador')
  const workoutLine = workouts.length
    ? workouts.map((workout) => `${workout.kind}: ${workout.name}`).join('; ')
    : t(locale, 'no pending workout today', 'inget väntande pass idag')

  return {
    success: true,
    message: t(
      locale,
      `Readiness: ${readinessLine}. Load: ${loadLine}. Last 7 days: ${Math.round(weeklyLoad)} load and ${Math.round(weeklyMinutes)} minutes. Injuries: ${injuryLine}. Today: ${workoutLine}.`,
      `Readiness: ${readinessLine}. Belastning: ${loadLine}. Senaste 7 dagarna: ${Math.round(weeklyLoad)} load och ${Math.round(weeklyMinutes)} minuter. Skador: ${injuryLine}. Idag: ${workoutLine}.`
    ),
    briefing: {
      date: key,
      readiness: checkIn ? { ...checkIn, date: isoDate(checkIn.date) } : null,
      load: {
        last7DaysLoad: Math.round(weeklyLoad),
        last7DaysMinutes: Math.round(weeklyMinutes),
        acwr: latestAcwr ? { ...latestAcwr, date: isoDate(latestAcwr.date) } : null,
      },
      injuries,
      todayWorkouts: workouts,
    },
  }
}

async function proposeWorkoutModification(clientId: string, input: ProposeWorkoutModificationInput, locale: AppLocale) {
  const key = dateKey(input.date)
  const [readiness, workouts, injuries] = await Promise.all([
    prisma.dailyCheckIn.findFirst({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: { readinessScore: true, readinessDecision: true, fatigue: true, soreness: true, sleepHours: true },
    }),
    findPlannedWorkoutsForDate(clientId, key, 'ANY'),
    prisma.injuryAssessment.findMany({
      where: { clientId, status: { in: ['ACTIVE', 'MONITORING'] } },
      take: 3,
      select: { bodyPart: true, painLevel: true, status: true },
    }),
  ])
  const workout = workouts[0]
  if (!workout) {
    return {
      success: false,
      error: t(locale, 'No planned workout was found to modify.', 'Inget planerat pass hittades att justera.'),
    }
  }

  const readinessScore = readiness?.readinessScore ?? null
  const lowReadiness = typeof readinessScore === 'number' && readinessScore < 60
  const injuryCaution = injuries.length > 0
  const goal = input.goal || 'OTHER'
  const minutes = input.minutesAvailable

  let recommendation: string
  if (goal === 'HARDER') {
    recommendation = lowReadiness || injuryCaution
      ? t(locale, 'Do not increase intensity today. Keep the planned session controlled and add quality only if warm-up feels excellent.', 'Öka inte intensiteten idag. Håll passet kontrollerat och lägg bara till kvalitet om uppvärmningen känns mycket bra.')
      : t(locale, 'A small progression is reasonable: add one controlled interval or lift the target slightly, not both.', 'En liten progression är rimlig: lägg till en kontrollerad intervall eller höj målet lite, inte båda.')
  } else if (goal === 'SHORTER' || minutes) {
    recommendation = t(
      locale,
      `Keep the main intent, trim warm-up/cool-down first, then cap the main set at ${minutes ?? Math.max(20, Math.round((workout.durationMinutes ?? 45) * 0.7))} minutes.`,
      `Behåll huvudsyftet, korta uppvärmning/nedvarvning först och begränsa sedan huvuddelen till ${minutes ?? Math.max(20, Math.round((workout.durationMinutes ?? 45) * 0.7))} minuter.`
    )
  } else if (goal === 'SWAP_TO_BIKE') {
    recommendation = t(
      locale,
      'Swap to bike/Wattbike at the same aerobic intent. Keep cadence smooth and match intensity by RPE or zone instead of pace.',
      'Byt till cykel/Wattbike med samma aeroba syfte. Håll kadensen jämn och matcha intensitet via RPE eller zon i stället för fart.'
    )
  } else if (goal === 'RECOVERY' || goal === 'EASIER' || lowReadiness || injuryCaution) {
    recommendation = t(
      locale,
      'Make it easier: reduce total work by 30-40%, stay mostly zone 1-2, and stop if pain or fatigue rises.',
      'Gör det lättare: minska total arbetstid med 30-40 %, håll dig mest i zon 1-2 och avbryt om smärta eller trötthet ökar.'
    )
  } else {
    recommendation = t(
      locale,
      'Keep the planned workout, but use the warm-up as a check: if legs feel flat, reduce one set or one interval.',
      'Behåll det planerade passet, men använd uppvärmningen som check: om benen känns tunga, ta bort ett set eller en intervall.'
    )
  }

  return {
    success: true,
    message: t(
      locale,
      `For ${workout.name}: ${recommendation}`,
      `För ${workout.name}: ${recommendation}`
    ),
    proposal: {
      date: key,
      sourceWorkout: workout,
      readiness,
      activeInjuries: injuries,
      requestedGoal: goal,
      recommendation,
      writePolicy: t(locale, 'This is only a suggestion. Use a confirmation card before creating a replacement workout.', 'Detta är bara ett förslag. Använd ett bekräftelsekort innan ett ersättningspass skapas.'),
    },
  }
}

async function getQuickErgMatchSuggestions(clientId: string, input: GetQuickErgMatchSuggestionsInput, locale: AppLocale) {
  const key = input.date ? dateKey(input.date) : null
  const rangeStart = key ? dayBounds(key).start : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rangeEnd = key ? dayBounds(key).end : new Date()

  const sessions = await prisma.quickErgSession.findMany({
    where: {
      clientId,
      startedAt: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: { startedAt: 'desc' },
    take: input.limit ?? 3,
    select: {
      id: true,
      machineType: true,
      machineKind: true,
      deviceName: true,
      startedAt: true,
      durationSec: true,
      distanceMeters: true,
      externalMatch: true,
    },
  })
  const unmatched = sessions.filter((session) => !asQuickErgStoredPlannedCardioMatch(session.externalMatch))

  if (unmatched.length === 0) {
    return {
      success: true,
      message: t(locale, 'No unmatched Quick Erg sessions were found for that window.', 'Inga omatchade Quick Erg-pass hittades för perioden.'),
      sessions: [],
    }
  }

  const output = []
  for (const session of unmatched) {
    const sessionDay = isoDate(session.startedAt)
    const { start, end } = dayBounds(sessionDay)
    start.setUTCDate(start.getUTCDate() - 1)
    end.setUTCDate(end.getUTCDate() + 1)

    const assignments = await prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: { in: ['PENDING', 'SCHEDULED'] },
        assignedDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        sessionId: true,
        assignedDate: true,
        status: true,
        session: { select: { name: true, sport: true, totalDuration: true, totalDistance: true } },
      },
      take: 10,
    })
    const machineType = displayMachineType({
      machineType: session.machineType as QuickErgMachineType,
      machineKind: session.machineKind,
      deviceName: session.deviceName,
    })
    const candidates: QuickErgPlannedCardioCandidate[] = assignments.map((assignment) => ({
      id: assignment.id,
      sessionId: assignment.sessionId,
      sessionName: assignment.session.name,
      assignedDate: assignment.assignedDate,
      status: assignment.status,
      sport: assignment.session.sport,
      plannedDurationSec: assignment.session.totalDuration,
      plannedDistanceMeters: assignment.session.totalDistance,
    }))
    const suggestions = buildQuickErgPlannedCardioSuggestions({
      id: session.id,
      machineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
    }, candidates)

    output.push({
      sessionId: session.id,
      date: sessionDay,
      machineType,
      durationMinutes: secondsToMinutes(session.durationSec),
      distanceMeters: session.distanceMeters,
      href: `/athlete/quick-erg/${encodeURIComponent(session.id)}`,
      suggestions: suggestions.slice(0, 3),
    })
  }

  const firstWithSuggestion = output.find((item) => item.suggestions.length > 0) ?? output[0]
  const topSuggestion = firstWithSuggestion.suggestions[0]
  return {
    success: true,
    message: topSuggestion
      ? t(locale, `Found a likely match: ${topSuggestion.sessionName}. Opening review.`, `Hittade en trolig matchning: ${topSuggestion.sessionName}. Öppnar granskning.`)
      : t(locale, 'I found unmatched Quick Erg sessions, but no strong planned-session match yet. Opening the latest session.', 'Jag hittade omatchade Quick Erg-pass, men ingen tydlig planerad matchning ännu. Öppnar senaste passet.'),
    sessions: output,
    navigation: {
      href: firstWithSuggestion.href,
      label: t(locale, 'Review Quick Erg match', 'Granska Quick Erg-matchning'),
      autoNavigate: true,
    },
  }
}

async function executeDirectTool(toolName: AthleteLiveVoiceDirectToolName, clientId: string, input: unknown, locale: AppLocale) {
  switch (toolName) {
    case OPEN_TODAY_WORKOUT_TOOL_NAME:
      return openTodayWorkout(clientId, input as OpenTodayWorkoutInput, locale)
    case GET_READINESS_BRIEFING_TOOL_NAME:
      return getReadinessBriefing(clientId, input as GetReadinessBriefingInput, locale)
    case PROPOSE_WORKOUT_MODIFICATION_TOOL_NAME:
      return proposeWorkoutModification(clientId, input as ProposeWorkoutModificationInput, locale)
    case GET_QUICK_ERG_MATCH_SUGGESTIONS_TOOL_NAME:
      return getQuickErgMatchSuggestions(clientId, input as GetQuickErgMatchSuggestionsInput, locale)
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const access = await checkAthleteFeatureAccess(resolved.clientId, 'ai_chat', locale)
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: access.reason || t(locale, 'AI chat requires a subscription', 'AI-chat kräver en prenumeration'),
          code: access.code || 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: access.upgradeUrl,
          currentUsage: access.currentUsage,
          limit: access.limit,
        },
        { status: 403 }
      )
    }

    const rateLimited = await rateLimitJsonResponse('ai:chat-realtime-tools', resolved.user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const allowanceDenied = await requireAiAllowance(resolved.clientId)
    if (allowanceDenied) return allowanceDenied

    const consent = await getConsentStatus(resolved.clientId)
    if (!consent.hasRequiredConsent) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'You must approve data processing before live voice can use athlete tools.',
            'Du måste godkänna databehandling innan live voice kan använda atletverktyg.'
          ),
          code: 'CONSENT_REQUIRED',
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success || !isAthleteLiveVoiceDirectToolName(parsedRequest.data.toolName)) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unsupported live voice tool.', 'Live voice-verktyget stöds inte.') },
        { status: 400 }
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
    const parsedInput = getAthleteLiveVoiceDirectSchema(toolName).safeParse(rawArguments)
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

    const result = await executeDirectTool(toolName, resolved.clientId, parsedInput.data, locale)
    return NextResponse.json({
      ...result,
      callId: parsedRequest.data.callId,
      toolName,
    })
  } catch (error) {
    logger.error('Realtime direct tool error', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not run the live voice tool.', 'Kunde inte köra live voice-verktyget.') },
      { status: 500 }
    )
  }
}
