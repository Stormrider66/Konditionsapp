import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Prisma } from '@prisma/client'
import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bike,
  Bluetooth,
  Clock,
  Gauge,
  Heart,
  Link2,
  Route,
  Ship,
  Trophy,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import {
  CoachQuickErgPlanMatchCard,
  type CoachQuickErgPlanMatchView,
  type CoachQuickErgPlanSuggestionView,
} from '@/components/coach/quick-erg/CoachQuickErgPlanMatchCard'
import {
  CoachQuickErgReviewCard,
  type CoachQuickErgReviewState,
} from '@/components/coach/quick-erg/CoachQuickErgReviewCard'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  quickErgCoachAlertSourcePrefix,
  quickErgCoachReviewSourceId,
} from '@/lib/quick-erg/coach-alerts'
import {
  asQuickErgCoachPlannedMatch,
  buildQuickErgCoachSignals,
  resolveQuickErgDisplayMachineType,
  type QuickErgCoachSignal,
  type QuickErgCoachSignalTone,
  type QuickErgCoachSignalType,
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
  type QuickErgDetectedInterval,
  type QuickErgMachineType,
  type QuickErgSessionSummary,
} from '@/lib/quick-erg/session-summary'
import { getLocale } from '@/i18n/server'

interface CoachQuickErgSessionDetailProps {
  businessSlug: string
  clientId: string
  sessionId: string
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function asSummary(value: Prisma.JsonValue | null): QuickErgSessionSummary | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as unknown as QuickErgSessionSummary
    : null
}

function asBestEfforts(value: Prisma.JsonValue | null): QuickErgBestEffort[] {
  return Array.isArray(value) ? value as unknown as QuickErgBestEffort[] : []
}

function asIntervals(value: Prisma.JsonValue | null): QuickErgDetectedInterval[] {
  return Array.isArray(value) ? value as unknown as QuickErgDetectedInterval[] : []
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

function formatDate(value: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value instanceof Date ? value : new Date(value))
}

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '--'
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = Math.round(sec % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatClock(sec?: number | null): string {
  if (!sec || sec <= 0) return '--'
  const minutes = Math.floor(sec / 60)
  const seconds = Math.round(sec % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDistance(meters?: number | null): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatPace500m(seconds?: number | null): string {
  return seconds ? `${formatClock(seconds)} /500m` : '--'
}

function formatSpeed(kmh?: number | null): string {
  return kmh || kmh === 0 ? `${Math.round(kmh * 10) / 10} km/h` : '--'
}

function sourceLabel(source: string, locale: string): string {
  switch (source) {
    case 'BLUETOOTH_PM5':
      return 'Concept2 PM5'
    case 'BLUETOOTH_CPS':
      return 'Power sensor'
    case 'MANUAL_IMPORT':
      return text(locale, 'Manual import', 'Manuell import')
    case 'BLUETOOTH_FTMS':
    default:
      return 'Bluetooth FTMS'
  }
}

function machineIcon(machineType: QuickErgMachineType) {
  if (machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG') return <Ship className="h-5 w-5" />
  if (machineType.includes('BIKE') || machineType === 'WATTBIKE') return <Bike className="h-5 w-5" />
  return <Activity className="h-5 w-5" />
}

function signalIcon(type: QuickErgCoachSignalType) {
  if (type === 'PERSONAL_BEST') return <Trophy className="h-4 w-4" />
  if (type === 'HIGH_LOAD') return <AlertTriangle className="h-4 w-4" />
  if (type === 'UNMATCHED_PLAN') return <Link2 className="h-4 w-4" />
  return <Bluetooth className="h-4 w-4" />
}

function signalClassName(tone: QuickErgCoachSignalTone): string {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200'
}

function signalCopy(signal: QuickErgCoachSignal, locale: string): { title: string; description: string } {
  switch (signal.type) {
    case 'PERSONAL_BEST':
      return {
        title: text(locale, 'Personal best', 'Personbasta'),
        description: signal.metric ?? text(locale, 'New session best', 'Nytt passrekord'),
      }
    case 'HIGH_LOAD':
      return {
        title: text(locale, 'Hard erg session', 'Hart ergpass'),
        description: signal.metric ?? text(locale, 'Review load and recovery', 'Se over belastning och aterhamtning'),
      }
    case 'UNMATCHED_PLAN':
      return {
        title: text(locale, 'May match plan', 'Kan matcha plan'),
        description: text(locale, 'Close to an open planned session.', 'Nara ett oppet planerat pass.'),
      }
    case 'NEW_SESSION':
    default:
      return {
        title: text(locale, 'New free erg session', 'Nytt fritt ergpass'),
        description: text(locale, 'Recorded from Bluetooth.', 'Registrerat via Bluetooth.'),
      }
  }
}

function effortValue(effort: QuickErgBestEffort): string {
  return effort.unit === 'W' ? `${Math.round(effort.value)} W` : formatClock(effort.value)
}

function metric(value: number | null | undefined, unit: string): string {
  return value || value === 0 ? `${Math.round(value)} ${unit}` : '--'
}

function decimalMetric(value: number | null | undefined, unit: string): string {
  return value || value === 0 ? `${Math.round(value * 10) / 10} ${unit}` : '--'
}

function suggestionLabels(locale: string) {
  return locale === 'sv'
    ? {
        sameDay: 'Samma dag',
        nearbyDay: 'Nara dag',
        matchingSport: 'Matchande sport',
        machineNameMatch: 'Maskinmatch',
        similarDuration: 'Liknande tid',
        similarDistance: 'Liknande distans',
        pendingPlan: 'Oppet pass',
      }
    : undefined
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function SignalCard({ signal, locale }: { signal: QuickErgCoachSignal; locale: string }) {
  const copy = signalCopy(signal, locale)

  return (
    <div className={`rounded-lg border p-3 ${signalClassName(signal.tone)}`}>
      <div className="mb-2 flex items-center gap-2">
        {signalIcon(signal.type)}
        <p className="text-sm font-semibold">{copy.title}</p>
      </div>
      <p className="text-sm opacity-80">{copy.description}</p>
    </div>
  )
}

export async function CoachQuickErgSessionDetail({
  businessSlug,
  clientId,
  sessionId,
}: CoachQuickErgSessionDetailProps) {
  const user = await requireCoach()
  const locale = await getLocale()
  const hasAccess = await canAccessClient(user.id, clientId)
  if (!hasAccess) notFound()

  const session = await prisma.quickErgSession.findFirst({
    where: { id: sessionId, clientId },
    select: {
      id: true,
      clientId: true,
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
      avgCadence: true,
      maxCadence: true,
      avgStrokeRate: true,
      maxStrokeRate: true,
      avgPace500m: true,
      rpe: true,
      notes: true,
      summary: true,
      bestEfforts: true,
      detectedIntervals: true,
      trainingLoadId: true,
      externalMatch: true,
      client: { select: { name: true } },
    },
  })

  if (!session) notFound()

  const displayMachineType = resolveQuickErgDisplayMachineType({
    machineType: session.machineType as QuickErgMachineType,
    machineKind: session.machineKind,
    deviceName: session.deviceName,
  })
  const machineName = formatMachineName(displayMachineType)
  const plannedMatch = asQuickErgCoachPlannedMatch(session.externalMatch)
  const sessionDay = startOfDay(session.startedAt)

  const [trainingLoad, previousSessions, candidateAssignments, matchedAssignment, coachReview, openAlertCount] = await Promise.all([
    session.trainingLoadId
      ? prisma.trainingLoad.findFirst({
          where: { id: session.trainingLoadId, clientId },
          select: {
            dailyLoad: true,
            loadType: true,
            duration: true,
            distance: true,
            avgHR: true,
            maxHR: true,
            intensity: true,
            workoutType: true,
          },
        })
      : Promise.resolve(null),
    prisma.quickErgSession.findMany({
      where: {
        clientId,
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
            athleteId: clientId,
            assignedDate: { gte: addDays(sessionDay, -1), lt: addDays(sessionDay, 2) },
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
    plannedMatch
      ? prisma.cardioSessionAssignment.findFirst({
          where: { id: plannedMatch.assignmentId, athleteId: clientId },
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
      : Promise.resolve(null),
    prisma.coachAlert.findFirst({
      where: {
        coachId: user.id,
        clientId,
        sourceId: quickErgCoachReviewSourceId(session.id),
        status: 'ACTIONED',
      },
      select: {
        actionedAt: true,
        actionNote: true,
      },
      orderBy: { actionedAt: 'desc' },
    }),
    prisma.coachAlert.count({
      where: {
        coachId: user.id,
        clientId,
        status: 'ACTIVE',
        sourceId: { startsWith: quickErgCoachAlertSourcePrefix(session.id) },
      },
    }),
  ])

  const prBadges = findQuickErgSessionPrBadges(
    {
      id: session.id,
      machineType: displayMachineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
      avgPower: session.avgPower,
      maxPower: session.maxPower,
      normalizedPower: session.normalizedPower,
      bestEfforts: asBestEfforts(session.bestEfforts),
    },
    previousSessions.map((previous) => ({
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
  )

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
  const suggestions = buildQuickErgPlannedCardioSuggestions(
    {
      id: session.id,
      machineType: displayMachineType,
      startedAt: session.startedAt,
      durationSec: session.durationSec,
      distanceMeters: session.distanceMeters,
    },
    plannedCandidates,
    suggestionLabels(locale)
  ).slice(0, 3)
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
  const summary = asSummary(session.summary)
  const bestEfforts = asBestEfforts(session.bestEfforts)
  const intervals = asIntervals(session.detectedIntervals)
  const isRower = displayMachineType === 'CONCEPT2_ROW' || displayMachineType === 'CONCEPT2_SKIERG'
  const rhythmUnit = isRower ? 'spm' : 'rpm'
  const backHref = `/${businessSlug}/coach/clients/${clientId}?tab=development#quick-erg`
  const planMatch: CoachQuickErgPlanMatchView | null = matchedAssignment
    ? {
        assignmentId: matchedAssignment.id,
        sessionId: matchedAssignment.sessionId,
        sessionName: matchedAssignment.session.name,
        assignedDate: matchedAssignment.assignedDate.toISOString(),
        status: matchedAssignment.status,
        sport: matchedAssignment.session.sport,
        plannedDurationSec: matchedAssignment.session.totalDuration,
        plannedDistanceMeters: matchedAssignment.session.totalDistance,
      }
    : plannedMatch
      ? {
          assignmentId: plannedMatch.assignmentId,
          sessionId: plannedMatch.sessionId,
          sessionName: plannedMatch.sessionName,
          assignedDate: plannedMatch.assignedDate,
        }
      : null
  const planSuggestions: CoachQuickErgPlanSuggestionView[] = suggestions.map((suggestion) => ({
    id: suggestion.id,
    assignmentId: suggestion.id,
    sessionId: suggestion.sessionId,
    sessionName: suggestion.sessionName,
    assignedDate: suggestion.assignedDate instanceof Date
      ? suggestion.assignedDate.toISOString()
      : new Date(suggestion.assignedDate).toISOString(),
    status: suggestion.status,
    sport: suggestion.sport,
    plannedDurationSec: suggestion.plannedDurationSec,
    plannedDistanceMeters: suggestion.plannedDistanceMeters,
    confidence: suggestion.confidence,
    reasons: suggestion.reasons,
  }))
  const reviewState: CoachQuickErgReviewState = {
    reviewedAt: coachReview?.actionedAt?.toISOString() ?? null,
    note: coachReview?.actionNote ?? null,
    openAlertCount,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {text(locale, 'Back to athlete', 'Tillbaka till aktiv')}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {machineIcon(displayMachineType)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">{machineName}</h1>
              <p className="text-sm text-muted-foreground">
                {session.client.name} / {formatDate(session.startedAt, locale)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{inferActivityType(displayMachineType)}</Badge>
          <Badge variant="outline">{sourceLabel(session.source, locale)}</Badge>
          {session.deviceName && <Badge variant="outline">{session.deviceName}</Badge>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={text(locale, 'Duration', 'Tid')} value={formatDuration(session.durationSec)} icon={<Clock className="h-3.5 w-3.5" />} />
        <MetricTile label={text(locale, 'Distance', 'Distans')} value={formatDistance(session.distanceMeters)} icon={<Route className="h-3.5 w-3.5" />} />
        <MetricTile label={text(locale, 'Power', 'Effekt')} value={metric(session.avgPower, 'W')} icon={<Zap className="h-3.5 w-3.5" />} />
        <MetricTile label="TSS" value={trainingLoad ? String(Math.round(trainingLoad.dailyLoad)) : '--'} icon={<Gauge className="h-3.5 w-3.5" />} />
      </div>

      {signals.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} locale={locale} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Session metrics', 'Passdata')}</CardTitle>
              <CardDescription>
                {text(locale, 'Core readings captured from the ergometer and heart rate source.', 'Karnvarden fran ergometer och pulskalla.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile label={text(locale, 'Max power', 'Maxeffekt')} value={metric(session.maxPower, 'W')} icon={<Zap className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Normalized', 'Normaliserad')} value={metric(session.normalizedPower, 'W')} icon={<Gauge className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Heart rate', 'Puls')} value={metric(session.avgHeartRate, 'bpm')} icon={<Heart className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Max HR', 'Maxpuls')} value={metric(session.maxHeartRate, 'bpm')} icon={<Heart className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Cadence', 'Kadens')} value={decimalMetric(session.avgCadence ?? session.avgStrokeRate, rhythmUnit)} icon={<Activity className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Speed', 'Hastighet')} value={formatSpeed(summary?.avgSpeed)} icon={<Gauge className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Pace', 'Tempo')} value={formatPace500m(session.avgPace500m)} icon={<Clock className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Calories', 'Kalorier')} value={metric(session.calories, 'kcal')} icon={<Activity className="h-3.5 w-3.5" />} />
              <MetricTile label="RPE" value={session.rpe ? `${session.rpe}/10` : '--'} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
              <MetricTile label={text(locale, 'Samples', 'Matarpunkter')} value={summary?.sampleCount ? String(summary.sampleCount) : '--'} icon={<Bluetooth className="h-3.5 w-3.5" />} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Best efforts', 'Basta delinsatser')}</CardTitle>
              <CardDescription>
                {text(locale, 'Auto-detected power and distance highlights.', 'Automatiskt hittade effekt- och distanshojdpunkter.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bestEfforts.length > 0 ? (
                <div className="divide-y rounded-md border">
                  {bestEfforts.map((effort) => (
                    <div key={`${effort.label}-${effort.startSec}-${effort.endSec}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{effort.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(effort.startSec)} - {formatDuration(effort.endSec)}
                          {effort.distanceMeters ? ` / ${formatDistance(effort.distanceMeters)}` : ''}
                        </p>
                      </div>
                      <div className="font-semibold tabular-nums">{effortValue(effort)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{text(locale, 'No best efforts detected yet.', 'Inga delinsatser hittades.')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Detected intervals', 'Hittade intervaller')}</CardTitle>
              <CardDescription>
                {text(locale, 'Moving segments separated by rest or stops.', 'Arbetsdelar separerade av vila eller stopp.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {intervals.length > 0 ? (
                <div className="divide-y rounded-md border">
                  {intervals.map((interval) => (
                    <div key={`${interval.index}-${interval.startSec}`} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
                      <Badge variant="secondary" className="w-fit">#{interval.index}</Badge>
                      <div className="min-w-0 text-muted-foreground">
                        {formatDuration(interval.durationSec)}
                        {interval.restAfterSec ? ` / ${text(locale, 'rest', 'vila')} ${formatDuration(interval.restAfterSec)}` : ''}
                        {interval.distanceMeters ? ` / ${formatDistance(interval.distanceMeters)}` : ''}
                      </div>
                      <div className="flex flex-wrap gap-3 font-medium tabular-nums">
                        {interval.avgPower ? <span>{interval.avgPower} W</span> : null}
                        {interval.maxPower ? <span>{interval.maxPower} W max</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{text(locale, 'No intervals detected.', 'Inga intervaller hittades.')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <CoachQuickErgPlanMatchCard
            clientId={clientId}
            sessionId={session.id}
            locale={locale}
            plannedMatch={planMatch}
            suggestions={planSuggestions}
          />

          <CoachQuickErgReviewCard
            clientId={clientId}
            sessionId={session.id}
            locale={locale}
            review={reviewState}
          />

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Athlete review', 'Aktivens review')}</CardTitle>
              <CardDescription>
                {text(locale, 'Subjective feedback saved after the session.', 'Subjektiv feedback sparad efter passet.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MetricTile label="RPE" value={session.rpe ? `${session.rpe}/10` : '--'} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
                <MetricTile label="TSS" value={trainingLoad ? String(Math.round(trainingLoad.dailyLoad)) : '--'} icon={<Gauge className="h-3.5 w-3.5" />} />
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{text(locale, 'Notes', 'Anteckningar')}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{session.notes || text(locale, 'No notes saved.', 'Inga anteckningar sparade.')}</p>
              </div>
              {trainingLoad && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{text(locale, 'Training load', 'Traningsbelastning')}</p>
                  <p className="mt-1 text-muted-foreground">
                    {trainingLoad.intensity}
                    {trainingLoad.workoutType ? ` / ${trainingLoad.workoutType}` : ''}
                    {trainingLoad.duration ? ` / ${Math.round(trainingLoad.duration)} min` : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {prBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{text(locale, 'Personal bests', 'Personbasta')}</CardTitle>
                <CardDescription>
                  {text(locale, 'Detected against previous Quick Erg sessions.', 'Jamfort med tidigare Quick Erg-pass.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {prBadges.map((badge) => (
                  <div key={badge.key} className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <span className="font-medium">{badge.label}</span>
                    <span className="font-semibold tabular-nums">{badge.value} {badge.unit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
