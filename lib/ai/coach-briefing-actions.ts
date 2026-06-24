import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canAccessAthlete } from '@/lib/auth/athlete-access'
import {
  findAccessibleCoachTeam,
  toolText,
  type CoachToolContext,
} from '@/lib/ai/coach-tools/shared'

type AppLocale = 'en' | 'sv'

const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/

export const prepareCoachDailyBriefingInputSchema = z.object({
  date: z.string().regex(yyyyMmDd).optional(),
  teamId: z.string().uuid().optional(),
  teamName: z.string().min(2).max(120).optional(),
  focus: z.enum(['MORNING', 'LOW_READINESS', 'MISSED_WORKOUTS', 'INJURY', 'LOAD']).default('MORNING'),
  limit: z.number().int().min(1).max(12).default(6),
})

export type PrepareCoachDailyBriefingInput = z.infer<typeof prepareCoachDailyBriefingInputSchema>

function dateFromKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function dateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function dayEnd(date: Date): Date {
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

function readinessFromMetrics(value: number | null | undefined): number | null {
  if (typeof value !== 'number') return null
  return value <= 10 ? Math.round(value * 10) : Math.round(value)
}

function secondsToMinutes(value: number | null | undefined): number | null {
  if (!value) return null
  return Math.round(value / 60)
}

function briefingFollowUps(
  locale: AppLocale,
  count: number,
  firstName?: string | null
): string[] {
  if (count <= 0) return []
  const subject = count === 1
    ? (firstName || toolText(locale, 'this athlete', 'den här atleten'))
    : toolText(locale, 'these athletes', 'de här atleterna')
  return [
    toolText(
      locale,
      `Draft a short check-in message to ${subject}.`,
      `Drafta ett kort check-in-meddelande till ${subject}.`
    ),
    toolText(
      locale,
      `Change today's planned cardio for ${subject} to an easy recovery ride.`,
      `Ändra dagens planerade kondition för ${subject} till en lätt återhämtningscykel.`
    ),
    toolText(
      locale,
      count === 1 ? `Open ${subject}'s athlete profile.` : `Open the first athlete in this briefing.`,
      count === 1 ? `Öppna profilen för ${subject}.` : `Öppna första atleten i den här briefingen.`
    ),
    toolText(
      locale,
      `Show recent cardio summary for ${subject}.`,
      `Visa senaste konditionssammanfattning för ${subject}.`
    ),
  ]
}

async function resolveBriefingTeam(ctx: CoachToolContext, input: PrepareCoachDailyBriefingInput) {
  if (!input.teamId && !input.teamName) return { ok: true as const, teamId: null, teamName: null }

  const result = await findAccessibleCoachTeam(ctx.coachUserId, {
    teamId: input.teamId,
    teamName: input.teamName,
    businessSlug: ctx.businessSlug,
  })
  if (!result.team) {
    return {
      ok: false as const,
      error: result.candidates.length > 1
        ? toolText(ctx.locale, 'Several matching teams were found. Ask which team.', 'Flera matchande lag hittades. Fråga vilket lag.')
        : toolText(ctx.locale, 'The team was not found or is outside your access.', 'Laget hittades inte eller ligger utanför din behörighet.'),
      needsClarification: result.candidates.length > 1,
      candidates: result.candidates.map((team) => ({ id: team.id, name: team.name })),
    }
  }

  return { ok: true as const, teamId: result.team.id, teamName: result.team.name }
}

export async function buildCoachDailyBriefingPreview(
  coachUserId: string,
  input: PrepareCoachDailyBriefingInput,
  businessSlug: string | undefined,
  locale: AppLocale
) {
  const ctx: CoachToolContext = { coachUserId, businessSlug, locale }
  const team = await resolveBriefingTeam(ctx, input)
  if (!team.ok) {
    return {
      success: false as const,
      error: team.error,
      needsClarification: team.needsClarification,
      candidates: team.candidates,
    }
  }

  const key = input.date || dateKey()
  const date = dateFromKey(key)
  const end = dayEnd(date)
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setUTCDate(date.getUTCDate() - 7)

  const clients = await prisma.client.findMany({
    where: {
      ...(businessSlug ? { business: { slug: businessSlug } } : {}),
      ...(team.teamId ? { teamId: team.teamId } : {}),
    },
    select: {
      id: true,
      name: true,
      team: { select: { name: true } },
      dailyCheckIns: {
        where: { date: { lte: end } },
        select: { readinessScore: true, readinessDecision: true, sleepHours: true, fatigue: true, soreness: true, date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      dailyMetrics: {
        where: { date: { lte: end } },
        select: { readinessScore: true, recommendedAction: true, injuryPain: true, date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      trainingLoads: {
        where: { date: { lte: end }, source: 'ACWR_SUMMARY' },
        select: { acwr: true, acwrZone: true, injuryRisk: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
      injuryAssessments: {
        where: { status: { in: ['ACTIVE', 'MONITORING'] }, resolved: false },
        select: { bodyPart: true, side: true, painLevel: true, status: true },
        orderBy: { detectedAt: 'desc' },
        take: 1,
      },
      cardioSessionAssignments: {
        where: {
          OR: [
            { assignedDate: date, status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] } },
            { assignedDate: { gte: sevenDaysAgo, lt: date }, status: { in: ['PENDING', 'SCHEDULED', 'SKIPPED'] } },
          ],
        },
        select: { assignedDate: true, status: true, session: { select: { name: true, totalDuration: true } } },
        take: 6,
      },
      strengthSessionAssignments: {
        where: { assignedDate: date, status: { in: ['PENDING', 'SCHEDULED', 'MODIFIED'] } },
        select: { status: true, session: { select: { name: true, estimatedDuration: true } } },
        take: 4,
      },
    },
    orderBy: { name: 'asc' },
    take: 100,
  })

  const accessible = []
  for (const client of clients) {
    const access = await canAccessAthlete(coachUserId, client.id)
    if (access.allowed) accessible.push(client)
  }

  const rows = accessible.map((client) => {
    const checkIn = client.dailyCheckIns[0] ?? null
    const metrics = client.dailyMetrics[0] ?? null
    const load = client.trainingLoads[0] ?? null
    const injury = client.injuryAssessments[0] ?? null
    const readiness = checkIn?.readinessScore ?? readinessFromMetrics(metrics?.readinessScore)
    const plannedToday =
      client.cardioSessionAssignments.filter((assignment) => dateKey(assignment.assignedDate) === key).length +
      client.strengthSessionAssignments.length
    const missedRecent = client.cardioSessionAssignments.filter((assignment) => dateKey(assignment.assignedDate) !== key).length
    const acwrFlag = load?.acwrZone && ['CAUTION', 'DANGER', 'CRITICAL'].includes(load.acwrZone)
    const injuryPain = injury?.painLevel ?? metrics?.injuryPain ?? null
    const score =
      (injury ? 1000 : 0) +
      (typeof injuryPain === 'number' && injuryPain >= 4 ? 500 : 0) +
      (typeof readiness === 'number' ? Math.max(0, 100 - readiness) * 5 : 100) +
      (checkIn?.readinessDecision && !['PROCEED', 'TRAIN'].includes(checkIn.readinessDecision) ? 250 : 0) +
      (metrics?.recommendedAction && !['PROCEED', 'TRAIN'].includes(metrics.recommendedAction) ? 250 : 0) +
      (acwrFlag ? 220 : 0) +
      (missedRecent * 80) +
      (plannedToday > 1 ? 100 : 0)

    const reasons = [
      typeof readiness === 'number' && readiness < 50 ? `readiness ${readiness}/100` : null,
      checkIn?.readinessDecision && !['PROCEED', 'TRAIN'].includes(checkIn.readinessDecision) ? checkIn.readinessDecision : null,
      metrics?.recommendedAction && !['PROCEED', 'TRAIN'].includes(metrics.recommendedAction) ? metrics.recommendedAction : null,
      injury ? `${toolText(locale, 'injury', 'skada')} ${[injury.side, injury.bodyPart].filter(Boolean).join(' ')} pain ${injury.painLevel}/10` : null,
      !injury && typeof metrics?.injuryPain === 'number' && metrics.injuryPain >= 4 ? `pain ${metrics.injuryPain}/10` : null,
      acwrFlag ? `ACWR ${load?.acwrZone}${typeof load?.acwr === 'number' ? ` ${load.acwr.toFixed(2)}` : ''}` : null,
      missedRecent > 0 ? `${missedRecent} ${toolText(locale, 'missed/recent unfinished', 'missade/ej klara')}` : null,
      plannedToday > 1 ? `${plannedToday} ${toolText(locale, 'planned today', 'planerade idag')}` : null,
    ].filter((reason): reason is string => Boolean(reason))

    return {
      clientId: client.id,
      name: client.name,
      teamName: client.team?.name ?? null,
      readiness,
      plannedToday,
      missedRecent,
      firstPlanned: client.cardioSessionAssignments[0]?.session.name ?? client.strengthSessionAssignments[0]?.session.name ?? null,
      firstPlannedMinutes: secondsToMinutes(client.cardioSessionAssignments[0]?.session.totalDuration) ?? client.strengthSessionAssignments[0]?.session.estimatedDuration ?? null,
      score,
      reasons,
    }
  })

  const filtered = rows
    .filter((row) => {
      if (input.focus === 'LOW_READINESS') return typeof row.readiness === 'number' && row.readiness < 55
      if (input.focus === 'MISSED_WORKOUTS') return row.missedRecent > 0
      if (input.focus === 'INJURY') return row.reasons.some((reason) => reason.includes('pain') || reason.includes('injury') || reason.includes('skada'))
      if (input.focus === 'LOAD') return row.reasons.some((reason) => reason.includes('ACWR')) || row.plannedToday > 1
      return row.score >= 120 || row.plannedToday > 0
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, input.limit)

  const details = filtered.length > 0
    ? filtered.flatMap((row) => [
        `${row.name}: ${row.reasons.length ? row.reasons.join(', ') : toolText(locale, 'planned work only', 'endast planerat pass')}`,
        row.firstPlanned ? `  ${toolText(locale, 'Planned', 'Planerat')}: ${row.firstPlanned}${row.firstPlannedMinutes ? ` (${row.firstPlannedMinutes} min)` : ''}` : null,
      ].filter((detail): detail is string => Boolean(detail)))
    : [toolText(locale, 'No obvious attention flags found for this briefing.', 'Inga tydliga uppmärksamhetsflaggor hittades för den här briefen.')]

  const targetLabel = team.teamName || toolText(locale, 'All accessible athletes', 'Alla tillgängliga atleter')

  return {
    success: true as const,
    preview: {
      title: toolText(locale, `Coach briefing - ${key}`, `Coachbriefing - ${key}`),
      description: toolText(
        locale,
        `Review ${filtered.length} athlete(s) needing attention before sending messages or changing sessions.`,
        `Granska ${filtered.length} atlet(er) som behöver uppmärksamhet innan meddelanden skickas eller pass ändras.`
      ),
      targetLabel,
      details: [
        `${toolText(locale, 'Date', 'Datum')}: ${key}`,
        `${toolText(locale, 'Focus', 'Fokus')}: ${input.focus}`,
        `${toolText(locale, 'Athletes reviewed', 'Atleter granskade')}: ${accessible.length}`,
        `${toolText(locale, 'Attention list', 'Uppmärksamhetslista')}: ${filtered.length}`,
        ...details,
      ],
      recipients: filtered.map((row) => ({ clientId: row.clientId, name: row.name, teamName: row.teamName })),
      recipientCount: filtered.length,
      suggestedFollowUps: briefingFollowUps(locale, filtered.length, filtered[0]?.name),
      followUpContext: {
        selectedClientIds: filtered.map((row) => row.clientId),
        selectedNames: filtered.map((row) => row.name),
        targetLabel,
        hints: [
          toolText(locale, 'For messages, use recipientType TEAM with teamTarget SELECTED and these clientIds.', 'För meddelanden, använd recipientType TEAM med teamTarget SELECTED och dessa clientIds.'),
          toolText(locale, 'For group workout changes, use modifyTeamCardioAssignments with targetType SELECTED and these clientIds.', 'För gruppändringar av pass, använd modifyTeamCardioAssignments med targetType SELECTED och dessa clientIds.'),
        ],
      },
      confirmLabel: toolText(locale, 'Mark reviewed', 'Markera granskad'),
      reviewHref: '/coach/dashboard',
    },
  }
}

export async function executeCoachDailyBriefingReview(
  _coachUserId: string,
  input: PrepareCoachDailyBriefingInput,
  _businessSlug: string | undefined,
  locale: AppLocale
) {
  return {
    success: true,
    reviewedDate: input.date || dateKey(),
    focus: input.focus,
    message: toolText(locale, 'Briefing marked as reviewed.', 'Briefingen markerades som granskad.'),
    startPath: '/coach/dashboard',
  }
}
