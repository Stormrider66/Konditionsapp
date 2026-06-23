import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildCardioSessionSummary, type CardioSessionSummaryData } from '@/lib/cardio/session-summary'
import type { AppLocale } from '@/lib/cardio/focus-mode-segments'
import { getCoachScopedIds } from '@/lib/coach/scoping'

export type CoachCardioReviewPriority = 'urgent' | 'review' | 'clear'

export interface CoachCardioReviewFlag {
  id: string
  label: string
  severity: 'urgent' | 'warning' | 'info'
}

export interface CoachCardioReviewInboxItem {
  assignmentId: string
  logId: string
  athlete: {
    id: string
    name: string
  }
  session: {
    id: string
    name: string
    sport: string
  }
  completedAt: string
  assignedDate: string | null
  priority: CoachCardioReviewPriority
  priorityScore: number
  needsAttention: boolean
  headline: string
  summary: string
  suggestedAction: string
  executionScore: number | null
  onTargetWindows: number | null
  analyzedWindows: number | null
  missedWindows: number
  watchWindows: number
  avgRecoveryDropBpm: number | null
  avgCadence: number | null
  avgStrokeRate: number | null
  sessionRPE: number | null
  flags: CoachCardioReviewFlag[]
  keyFindings: string[]
}

export interface CoachCardioReviewInboxData {
  generatedAt: string
  windowDays: number
  totalSessions: number
  urgentCount: number
  reviewCount: number
  clearCount: number
  items: CoachCardioReviewInboxItem[]
}

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function isRowingLikeEquipment(equipment: string | null): boolean {
  return equipment === 'ROW' || equipment === 'SKI_ERG'
}

function hasRoundFadeConcern(summary: CardioSessionSummaryData): boolean {
  const fade = summary.roundFade
  if (!fade) return false
  return fade.metric === 'calories' ? fade.percent <= -8 : fade.percent >= 8
}

function hasLowRhythm(summary: CardioSessionSummaryData): boolean {
  return summary.windows.some((window) => {
    if (!window.completed || window.skipped) return false
    if (isRowingLikeEquipment(window.equipment)) {
      return window.avgStrokeRate != null && window.avgStrokeRate < 20
    }
    return window.avgCadence != null && window.avgCadence < 75
  })
}

function addFlag(
  flags: CoachCardioReviewFlag[],
  flag: CoachCardioReviewFlag,
): void {
  if (!flags.some((existing) => existing.id === flag.id)) {
    flags.push(flag)
  }
}

function priorityRank(priority: CoachCardioReviewPriority): number {
  if (priority === 'urgent') return 3
  if (priority === 'review') return 2
  return 1
}

export function buildCoachCardioReviewInboxItem(input: {
  summary: CardioSessionSummaryData
  athlete: { id: string; name: string }
  assignment: { id: string; assignedDate: Date | string | null }
  log: { id: string; completedAt: Date | null; startedAt: Date; sessionRPE: number | null }
  locale: AppLocale
}): CoachCardioReviewInboxItem {
  const { summary, athlete, assignment, log, locale } = input
  const planned = summary.plannedVsActual
  const flags: CoachCardioReviewFlag[] = []

  for (const flag of summary.coachReview.flags) {
    addFlag(flags, {
      id: `coach-${flag.label}`,
      label: flag.label,
      severity: flag.severity,
    })
  }

  if (planned?.tone === 'offPlan') {
    addFlag(flags, {
      id: 'off-plan',
      label: text(locale, 'Off plan', 'Avvek från plan'),
      severity: 'warning',
    })
  }

  if ((planned?.missedWindows ?? 0) > 0) {
    addFlag(flags, {
      id: 'missed-intervals',
      label: text(locale, 'Missed intervals', 'Missade intervaller'),
      severity: 'warning',
    })
  }

  if ((planned?.watchWindows ?? 0) > 0) {
    addFlag(flags, {
      id: 'target-drift',
      label: text(locale, 'Target drift', 'Målavvikelse'),
      severity: 'info',
    })
  }

  if (planned?.heartRateRecovery.status === 'slow') {
    addFlag(flags, {
      id: 'slow-hr-recovery',
      label: text(locale, 'Slow HR recovery', 'Långsam pulsåterhämtning'),
      severity: 'warning',
    })
  }

  if (hasRoundFadeConcern(summary)) {
    addFlag(flags, {
      id: 'fade',
      label: text(locale, 'Large fade', 'Stort tapp'),
      severity: 'warning',
    })
  }

  if (hasLowRhythm(summary)) {
    addFlag(flags, {
      id: 'low-rhythm',
      label: text(locale, 'Low rhythm', 'Låg rytm'),
      severity: 'warning',
    })
  }

  if (summary.totals.completedSegments < summary.totals.segments) {
    addFlag(flags, {
      id: 'incomplete',
      label: text(locale, 'Incomplete session', 'Ofullständigt pass'),
      severity: 'warning',
    })
  }

  if (log.sessionRPE != null && log.sessionRPE >= 8 && (planned?.executionScore ?? 100) < 75) {
    addFlag(flags, {
      id: 'high-rpe-low-execution',
      label: text(locale, 'High RPE + missed plan', 'Hög RPE + missad plan'),
      severity: 'warning',
    })
  }

  const priority: CoachCardioReviewPriority = flags.some((flag) => flag.severity === 'urgent')
    ? 'urgent'
    : flags.some((flag) => flag.severity === 'warning') ||
      summary.coachReview.tone === 'watch' ||
      planned?.tone === 'watch'
      ? 'review'
      : 'clear'

  const executionScore = planned?.executionScore ?? null
  const priorityScore =
    priorityRank(priority) * 1000 +
    (planned?.missedWindows ?? 0) * 40 +
    (planned?.watchWindows ?? 0) * 10 +
    (executionScore != null ? Math.max(0, 100 - executionScore) : 0)

  const headline = priority === 'urgent'
    ? text(locale, 'Needs coach attention', 'Behöver coachens uppmärksamhet')
    : priority === 'review'
      ? text(locale, 'Review before next hard dose', 'Granska före nästa hårda dos')
      : text(locale, 'Looks okay', 'Ser okej ut')

  const completedAt = log.completedAt ?? log.startedAt
  const assignedDate = assignment.assignedDate == null
    ? null
    : typeof assignment.assignedDate === 'string'
      ? assignment.assignedDate
      : assignment.assignedDate.toISOString()

  return {
    assignmentId: assignment.id,
    logId: log.id,
    athlete,
    session: {
      id: summary.session.id,
      name: summary.session.name,
      sport: summary.session.sport,
    },
    completedAt: completedAt.toISOString(),
    assignedDate,
    priority,
    priorityScore,
    needsAttention: priority !== 'clear',
    headline,
    summary: planned?.summary ?? summary.coachReview.summary,
    suggestedAction: summary.coachReview.suggestedAdjustment,
    executionScore,
    onTargetWindows: planned?.onTargetWindows ?? null,
    analyzedWindows: planned?.analyzedWindows ?? null,
    missedWindows: planned?.missedWindows ?? 0,
    watchWindows: planned?.watchWindows ?? 0,
    avgRecoveryDropBpm: planned?.heartRateRecovery.avgDropBpm ?? summary.liveData.avgRecoveryHrDrop,
    avgCadence: summary.liveData.avgCadence,
    avgStrokeRate: summary.liveData.avgStrokeRate,
    sessionRPE: log.sessionRPE,
    flags,
    keyFindings: [
      summary.coachReview.painFlag ?? null,
      ...(planned?.keyFindings ?? []),
    ].filter((finding): finding is string => Boolean(finding)).slice(0, 4),
  }
}

export async function getCoachCardioReviewInboxData(input: {
  coachUserId: string
  businessId: string
  memberRole: string
  locale: AppLocale
  windowDays?: number
  take?: number
}): Promise<CoachCardioReviewInboxData> {
  const windowDays = input.windowDays ?? 14
  const take = input.take ?? 80
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const coachIds = await getCoachScopedIds(input.coachUserId, input.businessId, input.memberRole)

  const logs = await prisma.cardioSessionLog.findMany({
    where: {
      assignmentId: { not: null },
      status: 'COMPLETED',
      startedAt: { gte: since },
      athlete: {
        userId: { in: coachIds },
        businessId: input.businessId,
      },
    },
    include: {
      athlete: { select: { id: true, name: true } },
      session: {
        select: {
          id: true,
          name: true,
          description: true,
          sport: true,
          segments: true,
        },
      },
      segmentLogs: { orderBy: { segmentIndex: 'asc' } },
    },
    orderBy: [
      { completedAt: 'desc' },
      { startedAt: 'desc' },
    ],
    take,
  })

  const assignmentIds = logs
    .map((log) => log.assignmentId)
    .filter((id): id is string => typeof id === 'string')
  const assignments = await prisma.cardioSessionAssignment.findMany({
    where: { id: { in: assignmentIds } },
    select: { id: true, assignedDate: true },
  })
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))

  const items = logs.flatMap((log) => {
    if (!log.assignmentId) return []
    const assignment = assignmentById.get(log.assignmentId)
    if (!assignment) return []

    const summary = buildCardioSessionSummary({
      session: log.session,
      log: {
        ...log,
        segmentLogs: log.segmentLogs as Array<typeof log.segmentLogs[number] & { powerSamples?: Prisma.JsonValue | null }>,
      },
      locale: input.locale,
    })

    return buildCoachCardioReviewInboxItem({
      summary,
      athlete: log.athlete,
      assignment,
      log,
      locale: input.locale,
    })
  }).sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  })

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    totalSessions: items.length,
    urgentCount: items.filter((item) => item.priority === 'urgent').length,
    reviewCount: items.filter((item) => item.priority === 'review').length,
    clearCount: items.filter((item) => item.priority === 'clear').length,
    items,
  }
}
