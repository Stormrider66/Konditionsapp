'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageSquareText,
  Radar,
  ShieldAlert,
  Sparkles,
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
import { openCoachFloatingChat } from '@/lib/events/coach-floating-chat'
import { cn } from '@/lib/utils'
import type {
  CoachOperatorBriefData,
  CoachOperatorBriefItem,
} from '@/lib/coach/proactive-operator'

interface CoachOperatorBriefProps {
  data: CoachOperatorBriefData
}

const toneStyles: Record<CoachOperatorBriefData['tone'], {
  shell: string
  icon: string
  badge: string
  accent: string
}> = {
  risk: {
    shell: 'border-red-200 bg-red-50/80 dark:border-red-900/70 dark:bg-red-950/20',
    icon: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200',
    accent: 'text-red-700 dark:text-red-200',
  },
  watch: {
    shell: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/20',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
    accent: 'text-amber-700 dark:text-amber-200',
  },
  steady: {
    shell: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
    accent: 'text-emerald-700 dark:text-emerald-200',
  },
}

const priorityLabel: Record<CoachOperatorBriefItem['priority'], string> = {
  critical: 'Akut',
  high: 'Hög',
  medium: 'Granska',
  low: 'Snart',
}

export function CoachOperatorBrief({ data }: CoachOperatorBriefProps) {
  const tone = toneStyles[data.tone]
  const hasQueue = data.topItems.length > 0

  return (
    <GlassCard className={cn('mt-6 rounded-lg border', tone.shell)} data-ai-operator-brief>
      <GlassCardHeader className="pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-lg p-2', tone.icon)}>
              {data.tone === 'steady' ? <CheckCircle2 className="h-5 w-5" /> : <Radar className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <GlassCardTitle className="text-base">AI coach operator</GlassCardTitle>
                <Badge className={cn('border-0 text-[10px]', tone.badge)}>
                  {data.summary.queueCount > 0 ? `${data.summary.queueCount} ärenden` : 'Stabilt'}
                </Badge>
              </div>
              <GlassCardDescription className={cn('mt-1 text-sm font-medium', tone.accent)}>
                {data.headline}
              </GlassCardDescription>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                {data.subheadline}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[260px]">
            <OperatorMetric label="Akut" value={data.summary.urgentCount} tone={data.tone === 'risk' ? 'risk' : 'neutral'} />
            <OperatorMetric label="Granska" value={data.summary.reviewCount} tone={data.summary.reviewCount > 0 ? 'watch' : 'neutral'} />
            <OperatorMetric label="Alerts" value={data.summary.activeAlerts} tone={data.summary.activeAlerts > 0 ? 'watch' : 'neutral'} />
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent>
        <div className="grid gap-4 xl:grid-cols-5">
          <section className="xl:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <ShieldAlert className="h-4 w-4" />
                Proaktiv kö
              </h2>
              {hasQueue && (
                <Link href={data.topItems[0].href} className="text-xs font-medium text-primary hover:underline">
                  Öppna viktigaste
                </Link>
              )}
            </div>

            {hasQueue ? (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white/70 dark:divide-white/10 dark:border-white/10 dark:bg-slate-950/40">
                {data.topItems.map(item => (
                  <OperatorQueueRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-white/60 p-4 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-slate-950/40 dark:text-emerald-100">
                <CheckCircle2 className="mb-2 h-5 w-5" />
                Inga akuta operatorärenden just nu.
              </div>
            )}
          </section>

          <section className="xl:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nästa drag</h2>
            </div>

            <div className="space-y-2">
              {data.promptSuggestions.map(prompt => (
                <Button
                  key={prompt.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openCoachFloatingChat(prompt.prompt)}
                  className="h-auto min-h-9 w-full justify-between gap-3 whitespace-normal px-3 py-2 text-left text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                    {prompt.label}
                  </span>
                  <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
                </Button>
              ))}
            </div>
          </section>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

function OperatorMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'risk' | 'watch' | 'neutral'
}) {
  const className = {
    risk: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200',
    watch: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    neutral: 'bg-white/70 text-slate-700 dark:bg-slate-950/40 dark:text-slate-200',
  }[tone]

  return (
    <div className={cn('rounded-lg px-3 py-2 text-center', className)}>
      <div className="text-base font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-medium">{label}</div>
    </div>
  )
}

function OperatorQueueRow({ item }: { item: CoachOperatorBriefItem }) {
  const isUrgent = item.priority === 'critical' || item.priority === 'high'

  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className={cn(
          'mt-0.5 rounded-md p-2',
          isUrgent
            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'
        )}>
          {isUrgent ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
            <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-[10px]">
              {priorityLabel[item.priority]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
          {(item.clientName || item.meta) && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {[item.clientName, item.meta].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <Link href={item.href} className="shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-full justify-between gap-2 text-xs sm:w-auto">
          {item.ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  )
}
