import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { AppLocale } from '@/lib/i18n/request-locale'
import {
  asQuickErgCoachPlannedMatch,
  buildQuickErgCoachSignals,
  resolveQuickErgDisplayMachineType,
  type QuickErgCoachSignal,
  type QuickErgCoachSignalType,
} from '@/lib/quick-erg/coach-summary'
import {
  buildQuickErgPlannedCardioSuggestions,
  type QuickErgPlannedCardioCandidate,
} from '@/lib/quick-erg/planned-match'
import { findQuickErgSessionPrBadges } from '@/lib/quick-erg/progress'
import {
  formatMachineName,
  type QuickErgBestEffort,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'

export type QuickErgCoachAlertType =
  | 'QUICK_ERG_NEW_SESSION'
  | 'QUICK_ERG_PERSONAL_BEST'
  | 'QUICK_ERG_HIGH_LOAD'
  | 'QUICK_ERG_UNMATCHED_PLAN'

type CoachAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface QuickErgAlertPayloadInput {
  coachId: string
  clientId: string
  clientName: string
  signal: QuickErgCoachSignal
  durationSec: number
  distanceMeters?: number | null
  rpe?: number | null
  trainingLoad?: number | null
  now?: Date
  locale?: AppLocale
}

interface QuickErgCoachAlertPayload {
  coachId: string
  clientId: string
  alertType: QuickErgCoachAlertType
  severity: CoachAlertSeverity
  title: string
  message: string
  sourceId: string
  contextData: Record<string, unknown>
  expiresAt: Date
}

const QUICK_ERG_SIGNAL_TO_ALERT_TYPE: Record<QuickErgCoachSignalType, QuickErgCoachAlertType> = {
  NEW_SESSION: 'QUICK_ERG_NEW_SESSION',
  PERSONAL_BEST: 'QUICK_ERG_PERSONAL_BEST',
  HIGH_LOAD: 'QUICK_ERG_HIGH_LOAD',
  UNMATCHED_PLAN: 'QUICK_ERG_UNMATCHED_PLAN',
}

const QUICK_ERG_ALERT_TYPES = Object.values(QUICK_ERG_SIGNAL_TO_ALERT_TYPE)
const QUICK_ERG_SIGNAL_RESOLVED_NOTE = 'Auto-resolved because the Quick Erg signal is no longer active.'
const QUICK_ERG_SESSION_REMOVED_NOTE = 'Auto-resolved because the Quick Erg session was removed.'

function text(locale: AppLocale | undefined, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function asBestEfforts(value: Prisma.JsonValue | null): QuickErgBestEffort[] {
  return Array.isArray(value) ? value as unknown as QuickErgBestEffort[] : []
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysFrom(now: Date, days: number): Date {
  const next = new Date(now)
  next.setDate(next.getDate() + days)
  return next
}

function formatDuration(sec: number): string {
  const minutes = Math.round(sec / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

function formatDistance(meters?: number | null): string | null {
  if (!meters) return null
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function signalMetric(signal: QuickErgCoachSignal): string | null {
  return signal.metric ?? null
}

export function isQuickErgCoachAlertType(value: string): value is QuickErgCoachAlertType {
  return QUICK_ERG_ALERT_TYPES.includes(value as QuickErgCoachAlertType)
}

export function quickErgCoachAlertTypeFromSignal(type: QuickErgCoachSignalType): QuickErgCoachAlertType {
  return QUICK_ERG_SIGNAL_TO_ALERT_TYPE[type]
}

export function quickErgCoachAlertSourceId(sessionId: string, signalType: QuickErgCoachSignalType): string {
  return `quick_erg:${sessionId}:${signalType.toLowerCase()}`
}

export function quickErgCoachAlertSessionHref(basePath: string, clientId: string, sessionId: string): string {
  return `${basePath}/coach/clients/${clientId}/quick-erg/${sessionId}`
}

export function quickErgCoachAlertPayload(input: QuickErgAlertPayloadInput): QuickErgCoachAlertPayload {
  const locale = input.locale
  const now = input.now ?? new Date()
  const alertType = quickErgCoachAlertTypeFromSignal(input.signal.type)
  const metric = signalMetric(input.signal)
  const distance = formatDistance(input.distanceMeters)
  const sessionSummary = [
    input.signal.machineName,
    formatDuration(input.durationSec),
    distance,
  ].filter(Boolean).join(' / ')

  const baseContext = {
    kind: 'quick_erg',
    signalType: input.signal.type,
    sessionId: input.signal.sessionId,
    machineName: input.signal.machineName,
    startedAt: input.signal.startedAt,
    metric,
    durationSec: input.durationSec,
    distanceMeters: input.distanceMeters ?? null,
    rpe: input.rpe ?? null,
    trainingLoad: input.trainingLoad ?? null,
  }

  switch (input.signal.type) {
    case 'HIGH_LOAD': {
      const severity: CoachAlertSeverity =
        (input.rpe ?? 0) >= 10 || (input.trainingLoad ?? 0) >= 100
          ? 'CRITICAL'
          : (input.rpe ?? 0) >= 9 || (input.trainingLoad ?? 0) >= 60
            ? 'HIGH'
            : 'MEDIUM'

      return {
        coachId: input.coachId,
        clientId: input.clientId,
        alertType,
        severity,
        title: text(locale, `${input.clientName}: hard Quick Erg`, `${input.clientName}: hårt Quick Erg-pass`),
        message: text(
          locale,
          `${input.clientName} saved a hard ${sessionSummary}${metric ? ` (${metric})` : ''}. Review recovery and the next planned load.`,
          `${input.clientName} sparade ett hårt ${sessionSummary}${metric ? ` (${metric})` : ''}. Se över återhämtning och nästa planerade belastning.`
        ),
        sourceId: quickErgCoachAlertSourceId(input.signal.sessionId, input.signal.type),
        contextData: baseContext,
        expiresAt: daysFrom(now, 7),
      }
    }
    case 'UNMATCHED_PLAN':
      return {
        coachId: input.coachId,
        clientId: input.clientId,
        alertType,
        severity: 'MEDIUM',
        title: text(locale, `${input.clientName}: Quick Erg may match plan`, `${input.clientName}: Quick Erg kan matcha plan`),
        message: text(
          locale,
          `${input.clientName}'s ${sessionSummary} is close to an open planned session. Ask the athlete to confirm or review the plan.`,
          `${input.clientName}s ${sessionSummary} ligger nära ett öppet planerat pass. Be aktiven bekräfta eller se över planen.`
        ),
        sourceId: quickErgCoachAlertSourceId(input.signal.sessionId, input.signal.type),
        contextData: baseContext,
        expiresAt: daysFrom(now, 7),
      }
    case 'PERSONAL_BEST':
      return {
        coachId: input.coachId,
        clientId: input.clientId,
        alertType,
        severity: 'LOW',
        title: text(locale, `${input.clientName}: Quick Erg personal best`, `${input.clientName}: Quick Erg personbästa`),
        message: text(
          locale,
          `${input.clientName} set ${metric ?? 'a personal best'} on ${sessionSummary}.`,
          `${input.clientName} satte ${metric ?? 'ett personbästa'} på ${sessionSummary}.`
        ),
        sourceId: quickErgCoachAlertSourceId(input.signal.sessionId, input.signal.type),
        contextData: baseContext,
        expiresAt: daysFrom(now, 14),
      }
    case 'NEW_SESSION':
    default:
      return {
        coachId: input.coachId,
        clientId: input.clientId,
        alertType,
        severity: 'LOW',
        title: text(locale, `${input.clientName}: new Quick Erg`, `${input.clientName}: nytt Quick Erg-pass`),
        message: text(
          locale,
          `${input.clientName} saved a free ${sessionSummary}.`,
          `${input.clientName} sparade ett fritt ${sessionSummary}.`
        ),
        sourceId: quickErgCoachAlertSourceId(input.signal.sessionId, input.signal.type),
        contextData: baseContext,
        expiresAt: daysFrom(now, 3),
      }
  }
}

export async function syncQuickErgCoachAlertsForSession(params: {
  sessionId: string
  coachId?: string
  now?: Date
}): Promise<{ created: number; resolved: number; activeSignals: number }> {
  const now = params.now ?? new Date()
  const session = await prisma.quickErgSession.findUnique({
    where: { id: params.sessionId },
    select: {
      id: true,
      clientId: true,
      machineType: true,
      machineKind: true,
      deviceName: true,
      startedAt: true,
      durationSec: true,
      distanceMeters: true,
      rpe: true,
      avgPower: true,
      maxPower: true,
      normalizedPower: true,
      bestEfforts: true,
      trainingLoadId: true,
      externalMatch: true,
      client: {
        select: {
          name: true,
          userId: true,
          user: { select: { language: true } },
        },
      },
    },
  })

  if (!session) {
    return { created: 0, resolved: 0, activeSignals: 0 }
  }

  const coachIds = [...new Set([session.client.userId, params.coachId].filter((id): id is string => Boolean(id)))]
  if (coachIds.length === 0) {
    return { created: 0, resolved: 0, activeSignals: 0 }
  }

  const machineType = resolveQuickErgDisplayMachineType({
    machineType: session.machineType as QuickErgMachineType,
    machineKind: session.machineKind,
    deviceName: session.deviceName,
  })
  const machineName = formatMachineName(machineType)
  const plannedMatch = asQuickErgCoachPlannedMatch(session.externalMatch)
  const sessionDay = startOfDay(session.startedAt)

  const [trainingLoad, previousSessions, candidateAssignments] = await Promise.all([
    session.trainingLoadId
      ? prisma.trainingLoad.findFirst({
          where: { id: session.trainingLoadId, clientId: session.clientId },
          select: { dailyLoad: true },
        })
      : Promise.resolve(null),
    prisma.quickErgSession.findMany({
      where: {
        clientId: session.clientId,
        startedAt: { lt: session.startedAt },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        machineType: true,
        machineKind: true,
        deviceName: true,
        startedAt: true,
        durationSec: true,
        distanceMeters: true,
        avgPower: true,
        maxPower: true,
        normalizedPower: true,
        bestEfforts: true,
      },
    }),
    plannedMatch
      ? Promise.resolve([])
      : prisma.cardioSessionAssignment.findMany({
          where: {
            athleteId: session.clientId,
            assignedDate: {
              gte: addDays(sessionDay, -1),
              lt: addDays(sessionDay, 2),
            },
            status: { in: ['PENDING', 'SCHEDULED'] },
          },
          orderBy: { assignedDate: 'asc' },
          take: 12,
          select: {
            id: true,
            sessionId: true,
            assignedDate: true,
            status: true,
            session: {
              select: {
                name: true,
                sport: true,
                totalDuration: true,
                totalDistance: true,
              },
            },
          },
        }),
  ])

  const previousProgressSessions = previousSessions.map((previous) => ({
    id: previous.id,
    machineType: resolveQuickErgDisplayMachineType({
      machineType: previous.machineType as QuickErgMachineType,
      machineKind: previous.machineKind,
      deviceName: previous.deviceName,
    }),
    startedAt: previous.startedAt,
    durationSec: previous.durationSec,
    distanceMeters: previous.distanceMeters,
    avgPower: previous.avgPower,
    maxPower: previous.maxPower,
    normalizedPower: previous.normalizedPower,
    bestEfforts: asBestEfforts(previous.bestEfforts),
  }))
  const prBadges = findQuickErgSessionPrBadges({
    id: session.id,
    machineType,
    startedAt: session.startedAt,
    durationSec: session.durationSec,
    distanceMeters: session.distanceMeters,
    avgPower: session.avgPower,
    maxPower: session.maxPower,
    normalizedPower: session.normalizedPower,
    bestEfforts: asBestEfforts(session.bestEfforts),
  }, previousProgressSessions)

  const plannedCandidates: QuickErgPlannedCardioCandidate[] = candidateAssignments.map((assignment) => ({
    id: assignment.id,
    sessionId: assignment.sessionId,
    sessionName: assignment.session.name,
    assignedDate: assignment.assignedDate,
    status: assignment.status,
    sport: assignment.session.sport,
    plannedDurationSec: assignment.session.totalDuration,
    plannedDistanceMeters: assignment.session.totalDistance,
  }))
  const suggestions = plannedMatch
    ? []
    : buildQuickErgPlannedCardioSuggestions({
        id: session.id,
        machineType,
        startedAt: session.startedAt,
        durationSec: session.durationSec,
        distanceMeters: session.distanceMeters,
      }, plannedCandidates)
  const signals = buildQuickErgCoachSignals({
    sessionId: session.id,
    machineName,
    startedAt: session.startedAt,
    rpe: session.rpe,
    trainingLoad: trainingLoad?.dailyLoad,
    plannedMatch,
    likelyPlannedMatch: suggestions.length > 0,
    prBadges,
    now,
  })
  const activeSourceIds = new Set(signals.map((signal) => quickErgCoachAlertSourceId(session.id, signal.type)))
  const allSignalSourceIds = (Object.keys(QUICK_ERG_SIGNAL_TO_ALERT_TYPE) as QuickErgCoachSignalType[])
    .map((type) => quickErgCoachAlertSourceId(session.id, type))
  let created = 0
  let resolved = 0

  for (const coachId of coachIds) {
    const staleSourceIds = allSignalSourceIds.filter((sourceId) => !activeSourceIds.has(sourceId))
    if (staleSourceIds.length > 0) {
      const update = await prisma.coachAlert.updateMany({
        where: {
          coachId,
          clientId: session.clientId,
          sourceId: { in: staleSourceIds },
          status: 'ACTIVE',
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          actionNote: QUICK_ERG_SIGNAL_RESOLVED_NOTE,
        },
      })
      resolved += update.count
    }

    for (const signal of signals) {
      const payload = quickErgCoachAlertPayload({
        coachId,
        clientId: session.clientId,
        clientName: session.client.name,
        signal,
        durationSec: session.durationSec,
        distanceMeters: session.distanceMeters,
        rpe: session.rpe,
        trainingLoad: trainingLoad?.dailyLoad,
        now,
        locale: session.client.user.language === 'sv' ? 'sv' : 'en',
      })

      const existing = await prisma.coachAlert.findFirst({
        where: {
          coachId,
          clientId: session.clientId,
          alertType: payload.alertType,
          sourceId: payload.sourceId,
        },
        select: {
          id: true,
          status: true,
          actionNote: true,
        },
      })

      if (existing) {
        if (
          existing.status === 'ACTIVE' ||
          (existing.status === 'RESOLVED' && existing.actionNote === QUICK_ERG_SIGNAL_RESOLVED_NOTE)
        ) {
          await prisma.coachAlert.update({
            where: { id: existing.id },
            data: {
              status: 'ACTIVE',
              severity: payload.severity,
              title: payload.title,
              message: payload.message,
              contextData: payload.contextData as Prisma.InputJsonValue,
              expiresAt: payload.expiresAt,
              resolvedAt: null,
              dismissedAt: null,
              actionedAt: null,
              actionNote: null,
            },
          })
        }

        continue
      }

      await prisma.coachAlert.create({
        data: {
          coachId: payload.coachId,
          clientId: payload.clientId,
          alertType: payload.alertType,
          severity: payload.severity,
          title: payload.title,
          message: payload.message,
          contextData: payload.contextData as Prisma.InputJsonValue,
          sourceId: payload.sourceId,
          expiresAt: payload.expiresAt,
        },
      })
      created++
    }
  }

  return { created, resolved, activeSignals: signals.length }
}

export async function resolveQuickErgCoachAlertsForSession(params: {
  sessionId: string
  clientId?: string
  now?: Date
}): Promise<number> {
  const now = params.now ?? new Date()
  const sourceIds = (Object.keys(QUICK_ERG_SIGNAL_TO_ALERT_TYPE) as QuickErgCoachSignalType[])
    .map((type) => quickErgCoachAlertSourceId(params.sessionId, type))
  const update = await prisma.coachAlert.updateMany({
    where: {
      ...(params.clientId ? { clientId: params.clientId } : {}),
      sourceId: { in: sourceIds },
      status: 'ACTIVE',
    },
    data: {
      status: 'RESOLVED',
      resolvedAt: now,
      actionNote: QUICK_ERG_SESSION_REMOVED_NOTE,
    },
  })

  return update.count
}

export async function syncQuickErgCoachAlertsSafely(params: {
  sessionId: string
  coachId?: string
  now?: Date
}): Promise<void> {
  try {
    await syncQuickErgCoachAlertsForSession(params)
  } catch (error) {
    logger.error('Failed to sync Quick Erg coach alerts', {
      sessionId: params.sessionId,
      coachId: params.coachId ?? null,
    }, error)
  }
}

export async function resolveQuickErgCoachAlertsSafely(params: {
  sessionId: string
  clientId?: string
  now?: Date
}): Promise<void> {
  try {
    await resolveQuickErgCoachAlertsForSession(params)
  } catch (error) {
    logger.error('Failed to resolve Quick Erg coach alerts', {
      sessionId: params.sessionId,
      clientId: params.clientId ?? null,
    }, error)
  }
}
