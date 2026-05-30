'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Dumbbell,
  Eye,
  Heart,
  Loader2,
  Timer,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type WorkoutKind = 'strength' | 'cardio' | 'hybrid' | 'agility' | 'interval'
type DetailKind = 'broadcast' | 'interval'
type StatusFilter = 'all' | 'completed' | 'missing' | 'missed'
type KindFilter = 'all' | WorkoutKind

interface MonitorSession {
  id: string
  detailKind: DetailKind
  workoutKind: WorkoutKind
  workoutName: string
  assignedDate: string
  assigned: number
  completed: number
  missed: number
  pending: number
  missing: number
  completionRate: number
  avgRpe: number | null
  avgDurationSeconds: number | null
  notes: string | null
}

interface MonitorPlayer {
  athleteId: string
  name: string
  jerseyNumber: number | null
  position: string | null
  assigned: number
  completed: number
  missed: number
  pending: number
  avgRpe: number | null
  completionRate: number
}

interface ExerciseRow {
  athleteId: string
  athleteName: string
  exerciseName: string
  setNumber: number
  loadKg: number | null
  reps: string | number | null
  rpe: number | null
  meanVelocity: number | null
  peakVelocity: number | null
  meanPower: number | null
  peakPower: number | null
  meanTime: number | null
  peakTime: number | null
  estimated1RM: number | null
  note: string | null
}

interface IntervalRow {
  athleteId: string
  athleteName: string
  label: string
  planned: string | null
  actual: string | null
  pace: string | null
  power: string | null
  heartRate: string | null
  status: string
  note: string | null
}

interface DetailAthlete {
  assignmentId: string
  athleteId: string
  athleteName: string
  jerseyNumber: number | null
  position: string | null
  kind: WorkoutKind
  status: string
  completedAt: string | null
  isCompleted: boolean
  rpe: number | null
  durationSeconds: number | null
  notes: string | null
}

interface MonitorDetail {
  id: string
  kind: DetailKind
  workoutKind: WorkoutKind
  workoutName: string
  assignedDate: string
  overview: {
    assigned: number
    completed: number
    missing: number
    completionRate: number
    avgRpe: number | null
    avgDurationSeconds: number | null
    notes: string | null
  }
  athletes: DetailAthlete[]
  exerciseRows: ExerciseRow[]
  intervalRows: IntervalRow[]
}

interface MonitorData {
  team: { id: string; name: string; memberCount: number }
  days: number
  totals: {
    assigned: number
    completed: number
    missed: number
    missing: number
    pending: number
    completionRate: number
  }
  sessions: MonitorSession[]
  players: MonitorPlayer[]
  detail: MonitorDetail | null
}

interface TeamWorkoutMonitorProps {
  teamId: string
  businessSlug: string
}

const KIND_OPTIONS: Array<{ value: KindFilter; sv: string; en: string }> = [
  { value: 'all', sv: 'Alla', en: 'All' },
  { value: 'strength', sv: 'Styrka', en: 'Strength' },
  { value: 'cardio', sv: 'Kondition', en: 'Cardio' },
  { value: 'hybrid', sv: 'Hybrid', en: 'Hybrid' },
  { value: 'interval', sv: 'Intervall', en: 'Intervals' },
]

const STATUS_OPTIONS: Array<{ value: StatusFilter; sv: string; en: string }> = [
  { value: 'all', sv: 'Alla', en: 'All' },
  { value: 'completed', sv: 'Klara', en: 'Done' },
  { value: 'missing', sv: 'Saknas', en: 'Missing' },
  { value: 'missed', sv: 'Missade', en: 'Missed' },
]

function KindIcon({ kind }: { kind: WorkoutKind }) {
  const className = 'h-4 w-4 text-muted-foreground'
  if (kind === 'strength') return <Dumbbell className={className} />
  if (kind === 'cardio') return <Heart className={className} />
  if (kind === 'hybrid') return <Zap className={className} />
  if (kind === 'interval') return <Timer className={className} />
  return <Activity className={className} />
}

function kindLabel(kind: WorkoutKind, locale: string) {
  const sv: Record<WorkoutKind, string> = {
    strength: 'Styrka',
    cardio: 'Kondition',
    hybrid: 'Hybrid',
    agility: 'Agility',
    interval: 'Intervall',
  }
  const en: Record<WorkoutKind, string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    hybrid: 'Hybrid',
    agility: 'Agility',
    interval: 'Intervals',
  }
  return locale === 'sv' ? sv[kind] : en[kind]
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return '-'
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatNumber(value: number | null, suffix = '', decimals = 1) {
  if (value === null || value === undefined) return '-'
  return `${Number.isInteger(value) ? value : value.toFixed(decimals)}${suffix}`
}

function statusLabel(status: string, locale: string) {
  const normalized = status.toUpperCase()
  if (normalized === 'COMPLETED') return locale === 'sv' ? 'Klar' : 'Done'
  if (normalized === 'SKIPPED') return locale === 'sv' ? 'Hoppad' : 'Skipped'
  if (normalized === 'ENDED') return locale === 'sv' ? 'Avslutad' : 'Ended'
  if (normalized === 'ACTIVE') return locale === 'sv' ? 'Aktiv' : 'Active'
  return locale === 'sv' ? 'Väntar' : 'Pending'
}

function sessionMatchesStatus(session: MonitorSession, status: StatusFilter) {
  if (status === 'all') return true
  if (status === 'completed') return session.completed > 0
  if (status === 'missing') return session.missing > 0 || session.pending > 0
  return session.missed > 0
}

export function TeamWorkoutMonitor({ teamId, businessSlug }: TeamWorkoutMonitorProps) {
  const locale = useLocale()
  const uiLocale = locale === 'sv' ? 'sv' : 'en'
  const text = useCallback((sv: string, en: string) => uiLocale === 'sv' ? sv : en, [uiLocale])
  const [days, setDays] = useState(30)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [data, setData] = useState<MonitorData | null>(null)
  const [detail, setDetail] = useState<MonitorDetail | null>(null)
  const [selectedSession, setSelectedSession] = useState<MonitorSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'sessions' | 'players'>('sessions')

  // Jump straight from the headline "missed" number to the players behind it:
  // expand the panel, switch to the players tab and apply the missed filter.
  const focusMissedPlayers = useCallback(() => {
    setIsExpanded(true)
    setActiveTab('players')
    setStatusFilter('missed')
  }, [])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        businessSlug,
        days: String(days),
      })
      const response = await fetch(`/api/teams/${teamId}/workout-monitor?${params.toString()}`)
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load monitor')
      }
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitor')
    } finally {
      setLoading(false)
    }
  }, [businessSlug, days, teamId])

  useEffect(() => {
    void Promise.resolve().then(loadSummary)
  }, [loadSummary])

  const loadDetail = useCallback(async (session: MonitorSession) => {
    setSelectedSession(session)
    setDetail(null)
    setDetailLoading(true)
    try {
      const params = new URLSearchParams({
        businessSlug,
        days: String(days),
        detailKind: session.detailKind,
        detailId: session.id,
      })
      const response = await fetch(`/api/teams/${teamId}/workout-monitor?${params.toString()}`)
      const json = await response.json()
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load details')
      }
      setDetail(json.data.detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details')
    } finally {
      setDetailLoading(false)
    }
  }, [businessSlug, days, teamId])

  const filteredSessions = useMemo(() => {
    return (data?.sessions ?? []).filter((session) => (
      (kindFilter === 'all' || session.workoutKind === kindFilter) &&
      sessionMatchesStatus(session, statusFilter)
    ))
  }, [data?.sessions, kindFilter, statusFilter])

  const filteredPlayers = useMemo(() => {
    return (data?.players ?? []).filter((player) => {
      if (statusFilter === 'completed') return player.completed > 0
      if (statusFilter === 'missing') return player.pending > 0
      if (statusFilter === 'missed') return player.missed > 0
      return true
    })
  }, [data?.players, statusFilter])

  const total = data?.totals

  return (
    <GlassCard glow="emerald" className="mb-8">
      <GlassCardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <GlassCardTitle className="flex items-center gap-2 dark:text-white">
              <BarChart3 className="h-5 w-5" />
              {text('Passuppföljning', 'Workout monitor')}
            </GlassCardTitle>
            <GlassCardDescription>
              {text('Följ upp lagpass, spelare och loggade resultat på ett ställe.', 'Review team sessions, players, and logged results in one place.')}
            </GlassCardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={days === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDays(value)}
                >
                  {value} {text('dagar', 'days')}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? (
                <ChevronUp className="mr-2 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-2 h-4 w-4" />
              )}
              {isExpanded ? text('Dölj pass', 'Hide sessions') : text('Visa pass', 'Show sessions')}
            </Button>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {text('Hämtar passuppföljning...', 'Loading workout monitor...')}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <SummaryStat label={text('Tilldelade', 'Assigned')} value={total?.assigned ?? 0} />
              <SummaryStat label={text('Genomförda', 'Completed')} value={total?.completed ?? 0} />
              <SummaryStat
                label={text('Missade', 'Missed')}
                value={total?.missed ?? 0}
                tone={total && total.missed > 0 ? 'warning' : 'default'}
                onClick={total && total.missed > 0 ? focusMissedPlayers : undefined}
              />
              <SummaryStat label={text('Genomförandegrad', 'Completion')} value={`${total?.completionRate ?? 0}%`} progress={total?.completionRate ?? 0} />
            </div>

            {total && total.missed > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="text-sm text-amber-900 dark:text-amber-200">
                  <p className="font-medium">
                    {text(
                      `${total.missed} missade pass den här perioden.`,
                      `${total.missed} missed sessions this period.`
                    )}
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                    {text(
                      'Ofta handlar det om ologgade pass snarare än överhoppad träning – följ upp vilka spelare det gäller.',
                      'Often this is unlogged rather than skipped training — follow up which players it concerns.'
                    )}
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={focusMissedPlayers}>
                  {text('Visa vilka spelare', 'Show which players')}
                </Button>
              </div>
            )}

            {isExpanded ? (
              <>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {KIND_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={kindFilter === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setKindFilter(option.value)}
                      >
                        {uiLocale === 'sv' ? option.sv : option.en}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={statusFilter === option.value ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(option.value)}
                      >
                        {uiLocale === 'sv' ? option.sv : option.en}
                      </Button>
                    ))}
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sessions' | 'players')} className="w-full">
                  <TabsList>
                    <TabsTrigger value="sessions">{text('Pass', 'Sessions')}</TabsTrigger>
                    <TabsTrigger value="players">{text('Spelare', 'Players')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sessions" className="mt-4">
                    {filteredSessions.length === 0 ? (
                      <EmptyState text={text('Inga pass matchar filtret.', 'No sessions match the filter.')} />
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {filteredSessions.map((session) => (
                          <SessionCard
                            key={`${session.detailKind}-${session.id}`}
                            session={session}
                            locale={uiLocale}
                            onOpen={() => void loadDetail(session)}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="players" className="mt-4">
                    {filteredPlayers.length === 0 ? (
                      <EmptyState text={text('Inga spelare matchar filtret.', 'No players match the filter.')} />
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {filteredPlayers.map((player) => (
                          <PlayerCard key={player.athleteId} player={player} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-background/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-950/20">
                <span>
                  {text(
                    `${data?.sessions.length ?? 0} pass dolda. Öppna listan när du vill granska spelare och detaljer.`,
                    `${data?.sessions.length ?? 0} sessions hidden. Open the list when you want to review players and details.`
                  )}
                </span>
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsExpanded(true)}>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  {text('Visa pass', 'Show sessions')}
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassCardContent>

      <Sheet open={!!selectedSession} onOpenChange={(open) => {
        if (!open) {
          setSelectedSession(null)
          setDetail(null)
        }
      }}>
        <SheetContent side="right" className="w-full overflow-hidden sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{detail?.workoutName ?? selectedSession?.workoutName ?? text('Pass', 'Session')}</SheetTitle>
            <SheetDescription>
              {selectedSession ? `${kindLabel(selectedSession.workoutKind, uiLocale)} · ${formatDate(selectedSession.assignedDate, uiLocale)}` : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 h-[calc(100vh-8rem)] min-h-0">
            {detailLoading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {text('Hämtar detaljer...', 'Loading details...')}
              </div>
            ) : detail ? (
              <DetailView detail={detail} locale={uiLocale} />
            ) : (
              <EmptyState text={text('Inga detaljer att visa.', 'No details to show.')} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </GlassCard>
  )
}

function SummaryStat({
  label,
  value,
  progress,
  tone = 'default',
  onClick,
}: {
  label: string
  value: string | number
  progress?: number
  tone?: 'default' | 'warning'
  onClick?: () => void
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
      : 'bg-background/70 dark:border-white/10 dark:bg-slate-950/40'
  const valueClass = tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'dark:text-white'

  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', valueClass)}>{value}</p>
      {progress !== undefined && <Progress value={progress} className="mt-2 h-2" />}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-lg border p-4 text-left transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
          toneClass
        )}
      >
        {body}
      </button>
    )
  }

  return <div className={cn('rounded-lg border p-4', toneClass)}>{body}</div>
}

function SessionCard({ session, locale, onOpen }: { session: MonitorSession; locale: string; onOpen: () => void }) {
  const hasProblem = session.missed > 0 || session.missing > 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg border bg-background/80 p-4 text-left transition-colors hover:bg-accent dark:border-white/10 dark:bg-slate-950/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KindIcon kind={session.workoutKind} />
            <p className="truncate font-semibold dark:text-white">{session.workoutName}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{kindLabel(session.workoutKind, locale)}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(session.assignedDate, locale)}</span>
            {hasProblem && <Badge variant="secondary">{session.missed + session.missing} att följa upp</Badge>}
          </div>
        </div>
        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Klara</span>
          <span className="font-medium">{session.completed}/{session.assigned}</span>
        </div>
        <Progress value={session.completionRate} className="h-2" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <span>RPE {formatNumber(session.avgRpe)}</span>
        <span>{formatDuration(session.avgDurationSeconds)}</span>
        <span>{session.completionRate}%</span>
      </div>
    </button>
  )
}

function PlayerCard({ player }: { player: MonitorPlayer }) {
  return (
    <div className="rounded-lg border bg-background/80 p-4 dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold dark:text-white">
            {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
          </p>
          {player.position && <p className="text-xs text-muted-foreground">{player.position}</p>}
        </div>
        <Badge variant={player.completionRate >= 80 ? 'default' : 'secondary'}>{player.completionRate}%</Badge>
      </div>
      <Progress value={player.completionRate} className="mt-3 h-2" />
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <span>{player.completed}/{player.assigned}</span>
        <span>{player.pending} väntar</span>
        <span>{player.missed} missade</span>
        <span>RPE {formatNumber(player.avgRpe)}</span>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function DetailView({ detail, locale }: { detail: MonitorDetail; locale: string }) {
  return (
    <Tabs defaultValue="overview" className="flex h-full flex-col">
      <TabsList className="shrink-0">
        <TabsTrigger value="overview">Översikt</TabsTrigger>
        <TabsTrigger value="players">Spelare</TabsTrigger>
        <TabsTrigger value="exercises">Övningar</TabsTrigger>
      </TabsList>
      <ScrollArea className="mt-4 min-h-0 flex-1 pr-4">
        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryStat label="Klara" value={`${detail.overview.completed}/${detail.overview.assigned}`} />
            <SummaryStat label="Saknas" value={detail.overview.missing} />
            <SummaryStat label="RPE" value={formatNumber(detail.overview.avgRpe)} />
            <SummaryStat label="Tid" value={formatDuration(detail.overview.avgDurationSeconds)} />
          </div>
          {detail.overview.notes && (
            <div className="rounded-lg border bg-background/70 p-4 text-sm dark:border-white/10">
              {detail.overview.notes}
            </div>
          )}
        </TabsContent>

        <TabsContent value="players" className="mt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spelare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Klar</TableHead>
                <TableHead>RPE</TableHead>
                <TableHead>Tid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.athletes.map((athlete) => (
                <TableRow key={athlete.assignmentId}>
                  <TableCell className="font-medium">
                    {athlete.jerseyNumber ? `#${athlete.jerseyNumber} ` : ''}{athlete.athleteName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={athlete.isCompleted ? 'default' : 'secondary'}>
                      {athlete.isCompleted ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                      {statusLabel(athlete.status, locale)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(athlete.completedAt, locale)}</TableCell>
                  <TableCell>{formatNumber(athlete.rpe)}</TableCell>
                  <TableCell>{formatDuration(athlete.durationSeconds)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="exercises" className="mt-0 space-y-6">
          {detail.exerciseRows.length > 0 && <ExerciseTable rows={detail.exerciseRows} />}
          {detail.intervalRows.length > 0 && <IntervalTable rows={detail.intervalRows} />}
          {detail.exerciseRows.length === 0 && detail.intervalRows.length === 0 && (
            <EmptyState text="Inga detaljerade set eller intervaller är loggade ännu." />
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}

function ExerciseTable({ rows }: { rows: ExerciseRow[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Dumbbell className="h-4 w-4" />
        Styrkeloggar
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spelare</TableHead>
            <TableHead>Övning</TableHead>
            <TableHead>Set</TableHead>
            <TableHead>Vikt/Reps</TableHead>
            <TableHead>Hastighet</TableHead>
            <TableHead>Power</TableHead>
            <TableHead>e1RM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.athleteId}-${row.exerciseName}-${row.setNumber}-${index}`}>
              <TableCell>{row.athleteName}</TableCell>
              <TableCell className="font-medium">{row.exerciseName}</TableCell>
              <TableCell>{row.setNumber}</TableCell>
              <TableCell>{formatNumber(row.loadKg, ' kg')} · {row.reps ?? '-'}</TableCell>
              <TableCell>{formatNumber(row.meanVelocity, ' m/s', 2)} / {formatNumber(row.peakVelocity, ' m/s', 2)}</TableCell>
              <TableCell>{formatNumber(row.meanPower, ' W', 0)} / {formatNumber(row.peakPower, ' W', 0)}</TableCell>
              <TableCell>{formatNumber(row.estimated1RM, ' kg')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function IntervalTable({ rows }: { rows: IntervalRow[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Timer className="h-4 w-4" />
        Intervaller
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spelare</TableHead>
            <TableHead>Del</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Utfall</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead>Puls</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.athleteId}-${row.label}-${index}`}>
              <TableCell>{row.athleteName}</TableCell>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.planned ?? '-'}</TableCell>
              <TableCell>{row.actual ?? '-'}</TableCell>
              <TableCell>{row.pace ?? row.power ?? '-'}</TableCell>
              <TableCell>{row.heartRate ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={row.status === 'COMPLETED' ? 'default' : 'secondary'}>{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
