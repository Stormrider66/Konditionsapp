'use client'

import {
  AlertCircle,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { looksLikeTestAction, type CanvasBlock } from './canvas-model'

export function CanvasBlockView({
  block,
  locale,
  onRegenerate,
  onCreateTask,
  onScheduleTest,
  isCreatingTask,
  isRegenerating,
}: {
  block: CanvasBlock
  locale: 'en' | 'sv'
  onRegenerate: () => void
  onCreateTask: (task: { title: string; description?: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' }) => void
  onScheduleTest: (sourceLabel?: string) => void
  isCreatingTask: boolean
  isRegenerating: boolean
}) {
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en

  if (block.type === 'chart') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={BarChart3} title={block.title ?? t('Diagram', 'Chart')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-600">{block.content}</p>}
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {block.chartType === 'line' ? (
              <LineChart data={block.points || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={42} />
                <Tooltip formatter={(value) => [`${value}${block.unit ? ` ${block.unit}` : ''}`, t('Värde', 'Value')]} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <RechartsBarChart data={block.points || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={42} />
                <Tooltip formatter={(value) => [`${value}${block.unit ? ` ${block.unit}` : ''}`, t('Värde', 'Value')]} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            )}
          </ResponsiveContainer>
        </div>
      </article>
    )
  }

  if (block.type === 'metric-row') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={BarChart3} title={block.title ?? t('Mätvärden', 'Metrics')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {block.metrics?.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className={cn(
              'rounded-md border p-3',
              metric.tone === 'positive' && 'border-emerald-200 bg-emerald-50',
              metric.tone === 'warning' && 'border-amber-200 bg-amber-50',
              metric.tone === 'danger' && 'border-red-200 bg-red-50',
              (!metric.tone || metric.tone === 'neutral') && 'border-slate-200 bg-slate-50'
            )}>
              <p className="text-xs font-medium text-slate-500">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
              {metric.detail && <p className="mt-1 text-xs leading-5 text-slate-600">{metric.detail}</p>}
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'risk-list') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={AlertCircle} title={block.title ?? t('Risker', 'Risks')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 space-y-2">
          {block.risks?.map((risk) => (
            <div key={`${risk.title}-${risk.description}`} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{risk.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">{risk.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    risk.priority === 'high' && 'border-red-200 bg-red-50 text-red-700',
                    risk.priority === 'medium' && 'border-amber-200 bg-amber-50 text-amber-700',
                    risk.priority === 'low' && 'border-slate-200 bg-slate-50 text-slate-600'
                  )}
                >
                  {risk.priority}
                </Badge>
              </div>
              {risk.meta && <p className="mt-2 text-xs text-slate-500">{risk.meta}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateTask({
                    title: `${t('Följ upp', 'Follow up')}: ${risk.title}`.slice(0, 160),
                    description: `${risk.description}${risk.meta ? `\n\n${risk.meta}` : ''}`,
                    priority: risk.priority === 'high' ? 'HIGH' : risk.priority === 'medium' ? 'NORMAL' : 'LOW',
                  })}
                  disabled={isCreatingTask}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('Skapa uppgift', 'Create task')}
                </Button>
                {looksLikeTestAction(`${risk.title} ${risk.description} ${risk.meta || ''}`) && (
                  <Button variant="outline" size="sm" onClick={() => onScheduleTest(risk.title)} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    {t('Boka test', 'Book test')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>
    )
  }

  if (block.type === 'trend-summary') {
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={TrendingUp} title={block.title ?? t('Trend', 'Trend')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="mt-3 space-y-2">
          {block.trends?.map((trend) => {
            const TrendIcon = trend.direction === 'down' ? TrendingDown : trend.direction === 'up' ? TrendingUp : BarChart3
            return (
              <div key={`${trend.label}-${trend.value}`} className="flex gap-3 rounded-md border border-slate-200 p-3">
                <TrendIcon className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  trend.direction === 'up' && 'text-emerald-600',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'flat' && 'text-slate-500'
                )} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{trend.label}: {trend.value}</p>
                  {trend.detail && <p className="mt-1 text-sm leading-5 text-slate-600">{trend.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </article>
    )
  }

  if (block.type === 'heading') {
    return (
      <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-2xl font-semibold">{block.title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="shrink-0 border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
          >
            {isRegenerating ? t('Förbättrar...', 'Improving...') : t('Förbättra', 'Improve')}
          </Button>
        </div>
        {block.content && <p className="mt-2 text-sm leading-6 text-slate-300">{block.content}</p>}
      </article>
    )
  }

  if (block.type === 'table') {
    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <BlockHeader icon={Table2} title={block.title ?? t('Tabell', 'Table')} locale={locale} onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {block.columns?.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {block.rows?.map((row) => (
                <tr key={row.join('-')} className="text-slate-700">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    )
  }

  if (block.type === 'checklist' || block.type === 'actions') {
    const Icon = block.type === 'actions' ? ClipboardList : ListChecks
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <BlockHeader icon={Icon} title={block.title ?? t('Lista', 'List')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        <ul className="mt-3 space-y-2">
          {block.items?.map((item) => (
            <li key={item} className="rounded-md border border-slate-200 p-3">
              <div className="flex gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateTask({
                    title: item.slice(0, 160),
                    description: block.title ? `${t('Från canvasblocket', 'From the canvas block')} "${block.title}".` : t('Från AI Canvas.', 'From AI Canvas.'),
                  })}
                  disabled={isCreatingTask}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('Skapa uppgift', 'Create task')}
                </Button>
                {looksLikeTestAction(item) && (
                  <Button variant="outline" size="sm" onClick={() => onScheduleTest(item)} className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    {t('Boka test', 'Book test')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (block.type === 'insight') {
    const toneClass =
      block.tone === 'positive'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
        : block.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-sky-200 bg-sky-50 text-sky-950'

    return (
      <article className={cn('rounded-lg border p-4', toneClass)}>
        <BlockHeader icon={Lightbulb} title={block.title ?? t('Insikt', 'Insight')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
        {block.content && <p className="mt-2 text-sm leading-6">{block.content}</p>}
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <BlockHeader icon={FileText} title={block.title ?? t('Text', 'Text')} locale={locale} compact onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
      {block.content && <p className="mt-2 text-sm leading-6 text-slate-700">{block.content}</p>}
    </article>
  )
}

function BlockHeader({
  icon: Icon,
  title,
  locale,
  compact = false,
  onRegenerate,
  isRegenerating = false,
}: {
  icon: typeof FileText
  title: string
  locale: 'en' | 'sv'
  compact?: boolean
  onRegenerate?: () => void
  isRegenerating?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', compact ? 'text-sm' : 'px-4 py-3')}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        <h3 className="truncate font-semibold text-slate-900">{title}</h3>
      </div>
      {onRegenerate && (
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating} className="shrink-0">
          {isRegenerating
            ? locale === 'sv' ? 'Förbättrar...' : 'Improving...'
            : locale === 'sv' ? 'Förbättra' : 'Improve'}
        </Button>
      )}
    </div>
  )
}
