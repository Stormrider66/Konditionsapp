'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  HeartPulse,
  ListFilter,
  ShieldAlert,
  Timer,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardioSessionSummaryView } from '@/components/athlete/cardio/CardioSessionSummaryView'
import { cn } from '@/lib/utils'
import type {
  CoachCardioReviewInboxData,
  CoachCardioReviewInboxItem,
  CoachCardioReviewPriority,
} from '@/lib/coach/cardio-review-inbox'

type AppLocale = 'en' | 'sv'
type FilterMode = 'needsReview' | 'urgent' | 'all' | 'clear'

interface CardioReviewInboxClientProps {
  businessSlug: string
  data: CoachCardioReviewInboxData
  locale: AppLocale
}

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDate(value: string, locale: AppLocale): string {
  return new Date(value).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function priorityLabel(priority: CoachCardioReviewPriority, locale: AppLocale): string {
  if (priority === 'urgent') return text(locale, 'Urgent', 'Akut')
  if (priority === 'review') return text(locale, 'Review', 'Granska')
  return text(locale, 'Clear', 'Okej')
}

function priorityClasses(priority: CoachCardioReviewPriority): string {
  if (priority === 'urgent') return 'border-red-500/40 bg-red-50 text-red-950 dark:bg-red-950/20 dark:text-red-100'
  if (priority === 'review') return 'border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100'
  return 'border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100'
}

function flagClasses(severity: CoachCardioReviewInboxItem['flags'][number]['severity']): string {
  if (severity === 'urgent') return 'bg-red-600 text-white'
  if (severity === 'warning') return 'bg-amber-500 text-white'
  return 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-950'
}

function metricValue(value: number | null, suffix = ''): string {
  return value == null ? '–' : `${value}${suffix}`
}

function filterItems(items: CoachCardioReviewInboxItem[], mode: FilterMode): CoachCardioReviewInboxItem[] {
  if (mode === 'urgent') return items.filter((item) => item.priority === 'urgent')
  if (mode === 'clear') return items.filter((item) => item.priority === 'clear')
  if (mode === 'all') return items
  return items.filter((item) => item.needsAttention)
}

export function CardioReviewInboxClient({
  businessSlug,
  data,
  locale,
}: CardioReviewInboxClientProps) {
  const [filter, setFilter] = useState<FilterMode>('needsReview')
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null)
  const visibleItems = useMemo(() => filterItems(data.items, filter), [data.items, filter])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-wider">
              {text(locale, 'Coach workflow', 'Coachflöde')}
            </span>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            {text(locale, 'Cardio Review Inbox', 'Kondition: Granskningsinkorg')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">
            {text(
              locale,
              `Recent completed cardio sessions from the last ${data.windowDays} days, sorted by the ones most likely to need follow-up.`,
              `Senaste slutförda konditionspassen från de senaste ${data.windowDays} dagarna, sorterade efter störst behov av uppföljning.`,
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${businessSlug}/coach/cardio`}>
            <Timer className="mr-2 h-4 w-4" />
            {text(locale, 'Open Cardio Studio', 'Öppna Cardio Studio')}
          </Link>
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InboxStat
          icon={ShieldAlert}
          label={text(locale, 'Urgent', 'Akut')}
          value={`${data.urgentCount}`}
          tone="urgent"
        />
        <InboxStat
          icon={AlertTriangle}
          label={text(locale, 'To review', 'Att granska')}
          value={`${data.reviewCount}`}
          tone="review"
        />
        <InboxStat
          icon={CheckCircle2}
          label={text(locale, 'Clear', 'Okej')}
          value={`${data.clearCount}`}
          tone="clear"
        />
        <InboxStat
          icon={ClipboardCheck}
          label={text(locale, 'Sessions', 'Pass')}
          value={`${data.totalSessions}`}
          tone="neutral"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterMode)}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="needsReview">{text(locale, 'Needs review', 'Behöver granskning')}</TabsTrigger>
            <TabsTrigger value="urgent">{text(locale, 'Urgent', 'Akut')}</TabsTrigger>
            <TabsTrigger value="all">{text(locale, 'All', 'Alla')}</TabsTrigger>
            <TabsTrigger value="clear">{text(locale, 'Clear', 'Okej')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          {visibleItems.length} {text(locale, 'shown', 'visas')}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
          <h2 className="text-lg font-black">
            {text(locale, 'Nothing waiting here', 'Inget väntar här')}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {text(
              locale,
              'No completed cardio sessions match this filter.',
              'Inga slutförda konditionspass matchar filtret.',
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <InboxRow
              key={`${item.assignmentId}-${item.logId}`}
              item={item}
              businessSlug={businessSlug}
              locale={locale}
              onOpen={() => setOpenAssignmentId(item.assignmentId)}
            />
          ))}
        </div>
      )}

      {openAssignmentId && (
        <CardioSessionSummaryView
          assignmentId={openAssignmentId}
          showAthleteName
          onClose={() => setOpenAssignmentId(null)}
        />
      )}
    </div>
  )
}

function InboxStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ClipboardCheck
  label: string
  value: string
  tone: 'urgent' | 'review' | 'clear' | 'neutral'
}) {
  const toneClass = tone === 'urgent'
    ? 'text-red-600 dark:text-red-400'
    : tone === 'review'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'clear'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-muted-foreground'
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={cn('mb-2 flex items-center gap-1.5', toneClass)}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
    </div>
  )
}

function InboxRow({
  item,
  businessSlug,
  locale,
  onOpen,
}: {
  item: CoachCardioReviewInboxItem
  businessSlug: string
  locale: AppLocale
  onOpen: () => void
}) {
  const score = item.executionScore == null ? '–' : `${item.executionScore}`
  const targetText = item.analyzedWindows != null && item.onTargetWindows != null
    ? `${item.onTargetWindows}/${item.analyzedWindows}`
    : '–'
  return (
    <div className={cn('rounded-xl border p-4', priorityClasses(item.priority))}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="font-black">
              {priorityLabel(item.priority, locale)}
            </Badge>
            {item.flags.slice(0, 4).map((flag) => (
              <Badge key={flag.id} className={cn('font-bold', flagClasses(flag.severity))}>
                {flag.label}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="text-lg font-black leading-tight">{item.athlete.name}</h2>
            <p className="truncate text-sm font-bold text-muted-foreground">
              {item.session.name}
            </p>
          </div>
          <p className="mt-1 text-sm font-semibold">{item.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>

          {item.keyFindings.length > 0 && (
            <div className="mt-3 grid gap-1 text-sm font-medium sm:grid-cols-2">
              {item.keyFindings.slice(0, 4).map((finding) => (
                <div key={finding} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 rounded-lg bg-white/60 p-3 text-sm font-bold leading-snug dark:bg-black/20">
            {item.suggestedAction}
          </p>
        </div>

        <div className="grid min-w-[260px] gap-3">
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric icon={Gauge} label={text(locale, 'Score', 'Score')} value={score} />
            <MiniMetric icon={ClipboardCheck} label={text(locale, 'On target', 'På mål')} value={targetText} />
            <MiniMetric icon={Timer} label={text(locale, 'Date', 'Datum')} value={formatDate(item.completedAt, locale)} />
            <MiniMetric icon={HeartPulse} label={text(locale, 'HR drop', 'Pulsfall')} value={metricValue(item.avgRecoveryDropBpm)} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
            {item.sessionRPE != null && <span>RPE {item.sessionRPE}/10</span>}
            {item.avgCadence != null && <span>{item.avgCadence} rpm</span>}
            {item.avgStrokeRate != null && <span>{item.avgStrokeRate} spm</span>}
            {item.missedWindows > 0 && (
              <span>{item.missedWindows} {text(locale, 'missed', 'missade')}</span>
            )}
            {item.watchWindows > 0 && (
              <span>{item.watchWindows} {text(locale, 'watch', 'bevaka')}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link href={`/${businessSlug}/coach/clients/${item.athlete.id}`}>
                <UserRound className="mr-2 h-4 w-4" />
                {text(locale, 'Athlete', 'Atlet')}
              </Link>
            </Button>
            <Button onClick={onOpen}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {text(locale, 'Open review', 'Öppna granskning')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardCheck
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-white/60 p-2 dark:bg-black/20">
      <div className="mb-1 flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-black tabular-nums">{value}</p>
    </div>
  )
}
