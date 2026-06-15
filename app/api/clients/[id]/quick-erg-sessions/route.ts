import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'

import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  asQuickErgCoachPlannedMatch,
  buildQuickErgCoachSignals,
  resolveQuickErgDisplayMachineType,
  sortQuickErgCoachSignals,
} from '@/lib/quick-erg/coach-summary'
import {
  buildQuickErgPlannedCardioSuggestions,
  type QuickErgPlannedCardioCandidate,
} from '@/lib/quick-erg/planned-match'
import { findQuickErgSessionPrBadges } from '@/lib/quick-erg/progress'
import {
  formatMachineName,
  inferActivityType,
  type QuickErgBestEffort,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const HISTORY_LIMIT = 240

function t(locale: AppLocale, en: string, sv: string): string {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Atkomst nekad') }, { status: 403 })
    }

    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), MAX_LIMIT)
      : DEFAULT_LIMIT
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [historyRows, thirtyDayRows] = await Promise.all([
      prisma.quickErgSession.findMany({
        where: { clientId },
        orderBy: { startedAt: 'desc' },
        take: HISTORY_LIMIT,
        select: {
          id: true,
          machineType: true,
          machineKind: true,
          source: true,
          deviceName: true,
          startedAt: true,
          completedAt: true,
          durationSec: true,
          distanceMeters: true,
          calories: true,
          avgPower: true,
          maxPower: true,
          normalizedPower: true,
          avgHeartRate: true,
          maxHeartRate: true,
          rpe: true,
          notes: true,
          bestEfforts: true,
          trainingLoadId: true,
          externalMatch: true,
        },
      }),
      prisma.quickErgSession.findMany({
        where: { clientId, startedAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          durationSec: true,
          distanceMeters: true,
          trainingLoadId: true,
        },
      }),
    ])

    if (historyRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalSessions: 0,
            last30Sessions: 0,
            last30DurationSec: 0,
            last30DistanceMeters: 0,
            last30TrainingLoad: 0,
            latestAt: null,
          },
          sessions: [],
          signals: [],
        },
      })
    }

    const trainingLoadIds = [...new Set(
      [...historyRows, ...thirtyDayRows]
        .map((session) => session.trainingLoadId)
        .filter((id): id is string => Boolean(id))
    )]
    const trainingLoads = trainingLoadIds.length > 0
      ? await prisma.trainingLoad.findMany({
          where: { id: { in: trainingLoadIds }, clientId },
          select: { id: true, dailyLoad: true, intensity: true, workoutType: true },
        })
      : []
    const trainingLoadById = new Map(trainingLoads.map((load) => [load.id, load]))

    const returnRows = historyRows.slice(0, limit)
    const unmatchedRows = returnRows.filter((session) => !asQuickErgCoachPlannedMatch(session.externalMatch))
    const sessionDayTimes = unmatchedRows.map((session) => startOfDay(session.startedAt).getTime())
    const candidateAssignments = sessionDayTimes.length > 0
      ? await prisma.cardioSessionAssignment.findMany({
          where: {
            athleteId: clientId,
            assignedDate: {
              gte: addDays(new Date(Math.min(...sessionDayTimes)), -1),
              lt: addDays(new Date(Math.max(...sessionDayTimes)), 2),
            },
            status: { in: ['PENDING', 'SCHEDULED'] },
          },
          orderBy: { assignedDate: 'asc' },
          take: 50,
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
        })
      : []
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

    const progressSessions = [...historyRows]
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map((session) => {
        const machineType = resolveQuickErgDisplayMachineType({
          machineType: session.machineType as QuickErgMachineType,
          machineKind: session.machineKind,
          deviceName: session.deviceName,
        })

        return {
          id: session.id,
          machineType,
          startedAt: session.startedAt,
          durationSec: session.durationSec,
          distanceMeters: session.distanceMeters,
          avgPower: session.avgPower,
          maxPower: session.maxPower,
          normalizedPower: session.normalizedPower,
          bestEfforts: asBestEfforts(session.bestEfforts),
        }
      })
    const progressById = new Map(progressSessions.map((session) => [session.id, session]))

    const sessions = returnRows.map((session) => {
      const progressSession = progressById.get(session.id)
      const previousSessions = progressSessions.filter((previous) => (
        progressSession ? previous.startedAt < progressSession.startedAt : false
      ))
      const prBadges = progressSession
        ? findQuickErgSessionPrBadges(progressSession, previousSessions)
        : []
      const machineType = progressSession?.machineType ?? resolveQuickErgDisplayMachineType({
        machineType: session.machineType as QuickErgMachineType,
        machineKind: session.machineKind,
        deviceName: session.deviceName,
      })
      const machineName = formatMachineName(machineType)
      const trainingLoad = session.trainingLoadId ? trainingLoadById.get(session.trainingLoadId) ?? null : null
      const plannedMatch = asQuickErgCoachPlannedMatch(session.externalMatch)
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
      })

      return {
        id: session.id,
        machineType,
        machineName,
        activityType: inferActivityType(machineType),
        source: session.source,
        deviceName: session.deviceName,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt.toISOString(),
        durationSec: session.durationSec,
        distanceMeters: session.distanceMeters,
        calories: session.calories,
        avgPower: session.avgPower,
        maxPower: session.maxPower,
        normalizedPower: session.normalizedPower,
        avgHeartRate: session.avgHeartRate,
        maxHeartRate: session.maxHeartRate,
        rpe: session.rpe,
        notes: session.notes,
        trainingLoad: trainingLoad
          ? {
              dailyLoad: trainingLoad.dailyLoad,
              intensity: trainingLoad.intensity,
              workoutType: trainingLoad.workoutType,
            }
          : null,
        plannedMatch,
        likelyPlannedMatch: suggestions.length > 0,
        prBadges,
        signals,
      }
    })

    const last30TrainingLoad = thirtyDayRows.reduce((sum, session) => {
      const load = session.trainingLoadId ? trainingLoadById.get(session.trainingLoadId) : null
      return sum + (load?.dailyLoad ?? 0)
    }, 0)
    const signals = sortQuickErgCoachSignals(sessions.flatMap((session) => session.signals)).slice(0, 8)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSessions: historyRows.length,
          last30Sessions: thirtyDayRows.length,
          last30DurationSec: thirtyDayRows.reduce((sum, session) => sum + session.durationSec, 0),
          last30DistanceMeters: thirtyDayRows.reduce((sum, session) => sum + (session.distanceMeters ?? 0), 0),
          last30TrainingLoad,
          latestAt: historyRows[0]?.startedAt.toISOString() ?? null,
        },
        sessions,
        signals,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
