'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  FileText,
  HeartPulse,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type {
  CoachCommandCenterData,
  CommandCenterPriority,
  CommandCenterQueueItem,
} from '@/lib/coach/command-center'

interface CoachCommandCenterProps {
  data: CoachCommandCenterData
  defaultExpanded?: boolean
}

const priorityConfig: Record<CommandCenterPriority, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-200',
  },
  medium: {
    label: 'Review',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
  },
  low: {
    label: 'Soon',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
}

const categoryIcon: Record<CommandCenterQueueItem['category'], typeof AlertTriangle> = {
  readiness: HeartPulse,
  load: Dumbbell,
  injury: Stethoscope,
  feedback: MessageSquareText,
  program: CalendarClock,
  testing: FileText,
  alert: ShieldAlert,
}

const evidenceTone = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200',
  watch: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200',
  risk: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200',
}

export function CoachCommandCenter({
  data,
  defaultExpanded = false,
}: CoachCommandCenterProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [hiddenQueueIds, setHiddenQueueIds] = useState<Set<string>>(new Set())
  const [pendingAlertIds, setPendingAlertIds] = useState<Set<string>>(new Set())
  const [alertError, setAlertError] = useState<string | null>(null)
  const queueItems = data.queueItems.filter(item => !hiddenQueueIds.has(item.id))
  const hasQueue = queueItems.length > 0

  const updateAlertStatus = async (
    item: CommandCenterQueueItem,
    action: 'dismiss' | 'resolve'
  ) => {
    if (!item.alertId || pendingAlertIds.has(item.alertId)) return

    setAlertError(null)
    setPendingAlertIds(current => new Set(current).add(item.alertId!))

    try {
      const response = await fetch(`/api/coach/alerts/${item.alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error('Failed to update alert')
      }

      setHiddenQueueIds(current => new Set(current).add(item.id))
    } catch {
      setAlertError('Alert could not be updated. Try again from the athlete profile.')
    } finally {
      setPendingAlertIds(current => {
        const next = new Set(current)
        next.delete(item.alertId!)
        return next
      })
    }
  }

  return (
    <GlassCard gradient glow="blue" className="mt-8 group">
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <GlassCardTitle className="text-base">Coach Command Center</GlassCardTitle>
              <GlassCardDescription>
                {expanded
                  ? 'Prioritized work queue with evidence-backed AI recommendations.'
                  : 'Collapsed so your main dashboard stays first.'}
              </GlassCardDescription>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-4 gap-2">
              <MetricPill label="Urgent" value={data.summary.urgentCount} tone="risk" compact />
              <MetricPill label="Review" value={data.summary.reviewCount} tone="watch" compact />
              <MetricPill label="Stable" value={data.summary.stableCount} tone="good" compact />
              <MetricPill label="Alerts" value={data.summary.activeAlerts} tone="neutral" compact />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(value => !value)}
              className="h-9 justify-between gap-2 text-xs sm:w-[132px]"
              aria-expanded={expanded}
            >
              {expanded ? 'Hide queue' : 'Show queue'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </GlassCardHeader>

      {expanded && (
      <GlassCardContent>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <section className="xl:col-span-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Today&apos;s action queue
              </h2>
              <Badge variant="secondary" className="text-xs">
                {queueItems.length}
              </Badge>
            </div>

            {hasQueue ? (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-slate-950/40">
                {alertError && (
                  <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    {alertError}
                  </div>
                )}
                {queueItems.map(item => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    onAlertAction={updateAlertStatus}
                    alertPending={item.alertId ? pendingAlertIds.has(item.alertId) : false}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                <p className="text-sm font-medium">No urgent coach actions right now.</p>
              </div>
            )}
          </section>

          <section className="xl:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                AI recommendations
              </h2>
              <Badge variant="secondary" className="text-xs">
                Explained
              </Badge>
            </div>

            <div className="space-y-3">
              {data.recommendations.map(recommendation => (
                <div
                  key={recommendation.id}
                  className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {recommendation.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {recommendation.recommendation}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {recommendation.confidence}
                    </Badge>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {recommendation.evidence.map(item => (
                      <span
                        key={`${recommendation.id}-${item.label}-${item.value}`}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-medium',
                          evidenceTone[item.tone],
                        )}
                      >
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>

                  {recommendation.why.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {recommendation.why.slice(0, 3).map(reason => (
                        <div
                          key={`${recommendation.id}-${reason}`}
                          className="flex gap-2 text-xs text-slate-600 dark:text-slate-400"
                        >
                          <Bot className="mt-0.5 h-3 w-3 shrink-0 text-cyan-500" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link href={recommendation.href}>
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-between text-xs">
                      {recommendation.ctaLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </GlassCardContent>
      )}
    </GlassCard>
  )
}

function MetricPill({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string
  value: number
  tone: 'risk' | 'watch' | 'good' | 'neutral'
  compact?: boolean
}) {
  const className = {
    risk: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200',
    watch: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  }[tone]

  return (
    <div className={cn('rounded-lg px-3 py-2 text-center', compact && 'min-w-[62px] px-2 py-1.5', className)}>
      <div className={cn('text-lg font-bold leading-none', compact && 'text-sm')}>{value}</div>
      <div className="mt-1 text-[11px] font-medium">{label}</div>
    </div>
  )
}

function QueueRow({
  item,
  onAlertAction,
  alertPending,
}: {
  item: CommandCenterQueueItem
  onAlertAction: (item: CommandCenterQueueItem, action: 'dismiss' | 'resolve') => void
  alertPending: boolean
}) {
  const Icon = categoryIcon[item.category]
  const priority = priorityConfig[item.priority]

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {item.title}
            </p>
            <Badge className={cn('border-0 text-[10px]', priority.className)}>
              {priority.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {item.description}
          </p>
          {(item.clientName || item.meta) && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {[item.clientName, item.meta].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.alertId && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
              onClick={() => onAlertAction(item, 'resolve')}
              disabled={alertPending}
              title="Resolve alert"
              aria-label="Resolve alert"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-300"
              onClick={() => onAlertAction(item, 'dismiss')}
              disabled={alertPending}
              title="Dismiss alert"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Link href={item.href}>
          <Button variant="outline" size="sm" className="h-8 w-full justify-between gap-2 text-xs sm:w-auto">
            {item.ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
