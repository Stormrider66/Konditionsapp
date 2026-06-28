'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Bike,
  Bluetooth,
  ChevronRight,
  Clock,
  Gauge,
  Heart,
  Link2,
  Loader2,
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
import { useLocale } from '@/i18n/client'
import type { QuickErgCoachSignalTone, QuickErgCoachSignalType } from '@/lib/quick-erg/coach-summary'

interface QuickErgCoachSignal {
  id: string
  type: QuickErgCoachSignalType
  tone: QuickErgCoachSignalTone
  sessionId: string
  machineName: string
  startedAt: string
  metric?: string | null
}

interface QuickErgCoachSession {
  id: string
  machineType: string
  machineName: string
  activityType: string
  source: string
  deviceName?: string | null
  startedAt: string
  durationSec: number
  distanceMeters?: number | null
  calories?: number | null
  avgPower?: number | null
  maxPower?: number | null
  normalizedPower?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  rpe?: number | null
  trainingLoad?: {
    dailyLoad: number
    intensity: string
    workoutType?: string | null
  } | null
  plannedMatch?: {
    assignmentId: string
    sessionId: string
    sessionName: string
    assignedDate: string
  } | null
  likelyPlannedMatch: boolean
  prBadges: Array<{ key: string; label: string; value: number; unit: string }>
  signals: QuickErgCoachSignal[]
}

interface QuickErgCoachSummary {
  totalSessions: number
  last30Sessions: number
  last30DurationSec: number
  last30DistanceMeters: number
  last30TrainingLoad: number
  latestAt?: string | null
}

interface QuickErgCoachData {
  summary: QuickErgCoachSummary
  sessions: QuickErgCoachSession[]
  signals: QuickErgCoachSignal[]
}

interface QuickErgWidgetProps {
  clientId: string
  basePath: string
}

function copy(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDuration(sec: number): string {
  const hours = Math.floor(sec / 3600)
  const minutes = Math.round((sec % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatDistance(meters?: number | null): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function signalCopy(signal: QuickErgCoachSignal, locale: string): { title: string; description: string } {
  switch (signal.type) {
    case 'PERSONAL_BEST':
      return {
        title: copy(locale, 'Personal best', 'Personbasta'),
        description: signal.metric
          ? copy(locale, `${signal.machineName}: ${signal.metric}`, `${signal.machineName}: ${signal.metric}`)
          : copy(locale, `${signal.machineName} record`, `${signal.machineName} rekord`),
      }
    case 'HIGH_LOAD':
      return {
        title: copy(locale, 'Hard erg session', 'Hart ergpass'),
        description: signal.metric
          ? copy(locale, `${signal.machineName} flagged ${signal.metric}`, `${signal.machineName} flaggat ${signal.metric}`)
          : copy(locale, `${signal.machineName} had high load`, `${signal.machineName} hade hog belastning`),
      }
    case 'UNMATCHED_PLAN':
      return {
        title: copy(locale, 'May match plan', 'Kan matcha plan'),
        description: copy(
          locale,
          `${signal.machineName} is close to an open planned session.`,
          `${signal.machineName} ligger nara ett oppet planerat pass.`
        ),
      }
    case 'NEW_SESSION':
    default:
      return {
        title: copy(locale, 'New free erg session', 'Nytt fritt ergpass'),
        description: copy(locale, `${signal.machineName} completed`, `${signal.machineName} genomfort`),
      }
  }
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

function machineIcon(machineType: string) {
  if (machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG') return <Ship className="h-4 w-4" />
  if (machineType.includes('BIKE') || machineType === 'WATTBIKE') return <Bike className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

function useQuickErgCoachData(clientId: string, limit: number) {
  const [data, setData] = useState<QuickErgCoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/clients/${clientId}/quick-erg-sessions?limit=${limit}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (!cancelled && body.success) setData(body.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Quick Erg')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [clientId, limit])

  return { data, loading, error }
}

export function CoachQuickErgOverviewCard({ clientId, basePath }: QuickErgWidgetProps) {
  const locale = useLocale()
  const { data, loading, error } = useQuickErgCoachData(clientId, 5)
  const latestSessions = data?.sessions.slice(0, 2) ?? []

  if (!loading && (!data || data.summary.totalSessions === 0)) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bluetooth className="h-4 w-4 text-blue-500" />
              Quick Erg
            </CardTitle>
            <CardDescription>
              {copy(locale, 'Free Bluetooth erg sessions', 'Fria Bluetooth-ergpass')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href={`${basePath}/clients/${clientId}?tab=development#quick-erg`}>
              {copy(locale, 'View', 'Visa')}
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label={copy(locale, '30d sessions', '30d pass')} value={String(data.summary.last30Sessions)} />
              <MiniMetric label={copy(locale, 'Time', 'Tid')} value={formatDuration(data.summary.last30DurationSec)} />
              <MiniMetric label="TSS" value={data.summary.last30TrainingLoad > 0 ? String(Math.round(data.summary.last30TrainingLoad)) : '--'} />
            </div>

            {data.signals.length > 0 && (
              <div className="grid gap-2">
                {data.signals.slice(0, 3).map((signal) => (
                  <SignalPill key={signal.id} signal={signal} clientId={clientId} basePath={basePath} locale={locale} />
                ))}
              </div>
            )}

            <div className="divide-y">
              {latestSessions.map((session) => (
                <SessionRow key={session.id} session={session} clientId={clientId} basePath={basePath} locale={locale} compact />
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CoachQuickErgDevelopmentPanel({ clientId, basePath }: QuickErgWidgetProps) {
  const locale = useLocale()
  const { data, loading, error } = useQuickErgCoachData(clientId, 12)
  const sessions = data?.sessions ?? []
  const signals = useMemo(() => data?.signals.slice(0, 4) ?? [], [data?.signals])

  if (!loading && (!data || data.summary.totalSessions === 0)) return null

  return (
    <Card id="quick-erg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5 text-blue-500" />
              Quick Erg
            </CardTitle>
            <CardDescription>
              {copy(locale, 'Coach view of free Bluetooth erg work, signals, and plan matching.', 'Coachvy for fria Bluetooth-ergpass, signaler och planmatchning.')}
            </CardDescription>
          </div>
          {data && (
            <Badge variant="secondary">
              {copy(locale, `${data.summary.totalSessions} total`, `${data.summary.totalSessions} totalt`)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MiniMetric label={copy(locale, 'Last 30 days', 'Senaste 30 dagar')} value={String(data.summary.last30Sessions)} />
              <MiniMetric label={copy(locale, 'Time', 'Tid')} value={formatDuration(data.summary.last30DurationSec)} />
              <MiniMetric label={copy(locale, 'Distance', 'Distans')} value={formatDistance(data.summary.last30DistanceMeters)} />
              <MiniMetric label="TSS" value={data.summary.last30TrainingLoad > 0 ? String(Math.round(data.summary.last30TrainingLoad)) : '--'} />
            </div>

            {signals.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {signals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} clientId={clientId} basePath={basePath} locale={locale} />
                ))}
              </div>
            )}

            <div className="rounded-lg border">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">{copy(locale, 'Recent sessions', 'Senaste pass')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {copy(locale, 'Open a session for power, HR, notes, intervals, and plan status.', 'Oppna ett pass for effekt, puls, anteckningar, intervaller och planstatus.')}
                  </p>
                </div>
              </div>
              <div className="divide-y">
                {sessions.map((session) => (
                  <SessionRow key={session.id} session={session} clientId={clientId} basePath={basePath} locale={locale} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function SignalPill({
  signal,
  clientId,
  basePath,
  locale,
}: {
  signal: QuickErgCoachSignal
  clientId: string
  basePath: string
  locale: string
}) {
  const text = signalCopy(signal, locale)

  return (
    <Link
      href={`${basePath}/clients/${clientId}/quick-erg/${signal.sessionId}`}
      className={`flex items-start gap-2 rounded-md border p-2 text-xs ${signalClassName(signal.tone)}`}
    >
      <span className="mt-0.5">{signalIcon(signal.type)}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{text.title}</span>
        <span className="block truncate opacity-80">{text.description}</span>
      </span>
    </Link>
  )
}

function SignalCard({
  signal,
  clientId,
  basePath,
  locale,
}: {
  signal: QuickErgCoachSignal
  clientId: string
  basePath: string
  locale: string
}) {
  const text = signalCopy(signal, locale)

  return (
    <Link
      href={`${basePath}/clients/${clientId}/quick-erg/${signal.sessionId}`}
      className={`rounded-lg border p-3 transition hover:shadow-sm ${signalClassName(signal.tone)}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span>{signalIcon(signal.type)}</span>
        <span className="text-xs opacity-75">{formatDate(signal.startedAt, locale)}</span>
      </div>
      <p className="font-semibold">{text.title}</p>
      <p className="mt-1 text-sm opacity-80">{text.description}</p>
    </Link>
  )
}

function SessionRow({
  session,
  clientId,
  basePath,
  locale,
  compact = false,
}: {
  session: QuickErgCoachSession
  clientId: string
  basePath: string
  locale: string
  compact?: boolean
}) {
  return (
    <Link
      href={`${basePath}/clients/${clientId}/quick-erg/${session.id}`}
      className="flex items-center gap-3 px-3 py-3 transition hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {machineIcon(session.machineType)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{session.machineName}</p>
          {session.plannedMatch ? (
            <Badge variant="outline" className="text-[10px]">{copy(locale, 'Matched', 'Matchat')}</Badge>
          ) : session.likelyPlannedMatch ? (
            <Badge variant="secondary" className="text-[10px]">{copy(locale, 'Possible plan', 'Mojlig plan')}</Badge>
          ) : null}
          {session.prBadges.length > 0 && (
            <Badge variant="default" className="text-[10px]">{copy(locale, 'PB', 'PB')}</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDate(session.startedAt, locale)}
          {session.deviceName ? ` / ${session.deviceName}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(session.durationSec)}
        </span>
        {!compact && (
          <span className="hidden sm:inline">{formatDistance(session.distanceMeters)}</span>
        )}
        {session.avgPower && (
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {session.avgPower} W
          </span>
        )}
        {!compact && session.avgHeartRate && (
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Heart className="h-3 w-3" />
            {session.avgHeartRate}
          </span>
        )}
        {!compact && session.trainingLoad && (
          <span className="hidden items-center gap-1 md:inline-flex">
            <Gauge className="h-3 w-3" />
            {Math.round(session.trainingLoad.dailyLoad)}
          </span>
        )}
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  )
}
