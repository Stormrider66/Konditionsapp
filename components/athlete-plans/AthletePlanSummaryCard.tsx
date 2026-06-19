import { format, differenceInCalendarDays } from 'date-fns'
import type { ReactNode } from 'react'
import { enUS, sv } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { CalendarDays, Layers3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  blockPlanDescriptionWithActualWeeks,
  blockPlanNameWithActualWeeks,
  blockPlanTotalWeeks,
  displayBlockPlanBlocks,
} from '@/lib/block-plans/duration'
import { cn } from '@/lib/utils'

export interface AthletePlanBlockSummary {
  id: string
  title: string
  focus: string | null
  description: string | null
  order: number
  startDate: string | Date
  endDate: string | Date
}

export interface AthletePlanSummary {
  id: string
  clientId?: string
  coachId?: string
  name: string
  description: string | null
  status: string
  staffPlanNote?: string | null
  staffPlanNoteVisibleToAthlete?: boolean
  staffPlanNoteUpdatedAt?: string | Date | null
  staffPlanNoteAuthorId?: string | null
  staffPlanNoteAuthor?: {
    id: string
    name: string | null
    email: string | null
  } | null
  startDate: string | Date
  endDate: string | Date
  blocks: AthletePlanBlockSummary[]
}

interface AthletePlanSummaryCardProps {
  plan: AthletePlanSummary
  now?: Date
  variant?: 'coach' | 'athlete' | 'team'
  className?: string
  action?: ReactNode
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const PLAN_BLOCK_COLORS = [
  {
    container: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100',
    marker: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-900 dark:bg-blue-400/20 dark:text-blue-100',
    row: 'bg-blue-50/55 dark:bg-blue-400/10',
    rowBorder: 'border-l-blue-300 dark:border-l-blue-400/50',
  },
  {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100',
    marker: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
    row: 'bg-emerald-50/55 dark:bg-emerald-400/10',
    rowBorder: 'border-l-emerald-300 dark:border-l-emerald-400/50',
  },
  {
    container: 'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-100',
    marker: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-400/20 dark:text-violet-100',
    row: 'bg-violet-50/55 dark:bg-violet-400/10',
    rowBorder: 'border-l-violet-300 dark:border-l-violet-400/50',
  },
  {
    container: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100',
    marker: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100',
    row: 'bg-amber-50/55 dark:bg-amber-400/10',
    rowBorder: 'border-l-amber-300 dark:border-l-amber-400/50',
  },
  {
    container: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-100',
    marker: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-900 dark:bg-rose-400/20 dark:text-rose-100',
    row: 'bg-rose-50/55 dark:bg-rose-400/10',
    rowBorder: 'border-l-rose-300 dark:border-l-rose-400/50',
  },
  {
    container: 'border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100',
    marker: 'bg-cyan-500',
    chip: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-400/20 dark:text-cyan-100',
    row: 'bg-cyan-50/55 dark:bg-cyan-400/10',
    rowBorder: 'border-l-cyan-300 dark:border-l-cyan-400/50',
  },
] as const

export function getPlanBlockColor(index: number) {
  return PLAN_BLOCK_COLORS[Math.abs(index) % PLAN_BLOCK_COLORS.length]
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function formatShortDate(value: string | Date, locale: AppLocale) {
  return format(toDate(value), 'd MMM', { locale: locale === 'sv' ? sv : enUS })
}

function getCurrentBlock(plan: AthletePlanSummary, now: Date) {
  return plan.blocks.find((block) => {
    const start = toDate(block.startDate)
    const end = toDate(block.endDate)
    return start <= now && end >= now
  }) ?? plan.blocks.find((block) => toDate(block.startDate) > now) ?? plan.blocks[0] ?? null
}

function progressPercent(startDate: string | Date, endDate: string | Date, now: Date) {
  const start = toDate(startDate)
  const end = toDate(endDate)
  const total = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const elapsed = Math.min(total, Math.max(0, differenceInCalendarDays(now, start) + 1))
  return Math.round((elapsed / total) * 100)
}

export function AthletePlanSummaryCard({
  plan,
  now = new Date(),
  variant = 'coach',
  className,
  action,
}: AthletePlanSummaryCardProps) {
  const locale = getAppLocale(useLocale())
  const displayBlocks = displayBlockPlanBlocks(plan.blocks)
  const displayStartDate = displayBlocks[0]?.startDate ?? plan.startDate
  const displayEndDate = displayBlocks[displayBlocks.length - 1]?.endDate ?? plan.endDate
  const displayName = blockPlanNameWithActualWeeks(plan.name, blockPlanTotalWeeks(displayBlocks))
  const displayDescription = blockPlanDescriptionWithActualWeeks(plan.description, displayBlocks, locale)
  const displayPlan = { ...plan, blocks: displayBlocks }
  const currentBlock = getCurrentBlock(displayPlan, now)
  const currentBlockIndex = currentBlock
    ? Math.max(0, displayBlocks.findIndex((block) => block.id === currentBlock.id))
    : 0
  const currentBlockColor = getPlanBlockColor(currentBlockIndex)
  const planProgress = progressPercent(displayStartDate, displayEndDate, now)
  const currentBlockProgress = currentBlock
    ? progressPercent(currentBlock.startDate, currentBlock.endDate, now)
    : 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-blue-600" />
              <span className="truncate">{displayName}</span>
            </CardTitle>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatShortDate(displayStartDate, locale)} - {formatShortDate(displayEndDate, locale)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {action}
            <Badge variant="outline">
              {variant === 'athlete'
                ? t(locale, 'Min plan', 'My plan')
                : variant === 'team'
                  ? t(locale, 'Lagplan', 'Team plan')
                  : t(locale, 'Blockplan', 'Block plan')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentBlock ? (
          <div className={cn('rounded-lg border p-3', currentBlockColor.container)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-70">{t(locale, 'Nuvarande block', 'Current block')}</p>
                <h3 className="mt-1 text-sm font-semibold">{currentBlock.title}</h3>
                {currentBlock.focus && (
                  <p className="mt-1 text-sm opacity-75">{currentBlock.focus}</p>
                )}
              </div>
              <Badge variant="secondary" className={cn('shrink-0', currentBlockColor.chip)}>
                {currentBlock.order}/{displayBlocks.length}
              </Badge>
            </div>
            <Progress value={currentBlockProgress} className="mt-3 h-1.5" />
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {t(locale, 'Inga block inlagda ännu.', 'No blocks added yet.')}
          </div>
        )}

        {displayDescription && (
          <p className="text-sm text-muted-foreground">{displayDescription}</p>
        )}

        <div className="space-y-2">
          {displayBlocks.map((block, index) => {
            const isCurrent = currentBlock?.id === block.id
            const blockColor = getPlanBlockColor(index)
            return (
              <div
                key={block.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border border-l-4 px-3 py-2 text-sm',
                  isCurrent ? blockColor.container : 'bg-background',
                  !isCurrent && blockColor.rowBorder
                )}
              >
                <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', isCurrent ? blockColor.chip : 'bg-muted')}>
                  {block.order}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', blockColor.marker)} />
                    <p className="truncate font-medium">{block.title}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatShortDate(block.startDate, locale)} - {formatShortDate(block.endDate, locale)}
                    {block.focus ? ` · ${block.focus}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <Progress value={planProgress} className="h-1.5" />
      </CardContent>
    </Card>
  )
}
