import { format, differenceInCalendarDays } from 'date-fns'
import type { ReactNode } from 'react'
import { enUS, sv } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import { CalendarDays, Layers3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
  name: string
  description: string | null
  status: string
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
  const currentBlock = getCurrentBlock(plan, now)
  const planProgress = progressPercent(plan.startDate, plan.endDate, now)
  const currentBlockProgress = currentBlock
    ? progressPercent(currentBlock.startDate, currentBlock.endDate, now)
    : 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-blue-600" />
              <span className="truncate">{plan.name}</span>
            </CardTitle>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatShortDate(plan.startDate, locale)} - {formatShortDate(plan.endDate, locale)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">
              {variant === 'athlete'
                ? t(locale, 'Min plan', 'My plan')
                : variant === 'team'
                  ? t(locale, 'Lagplan', 'Team plan')
                  : t(locale, 'Blockplan', 'Block plan')}
            </Badge>
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentBlock ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(locale, 'Nuvarande block', 'Current block')}</p>
                <h3 className="mt-1 text-sm font-semibold">{currentBlock.title}</h3>
                {currentBlock.focus && (
                  <p className="mt-1 text-sm text-muted-foreground">{currentBlock.focus}</p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                {currentBlock.order}/{plan.blocks.length}
              </Badge>
            </div>
            <Progress value={currentBlockProgress} className="mt-3 h-1.5" />
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {t(locale, 'Inga block inlagda ännu.', 'No blocks added yet.')}
          </div>
        )}

        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="space-y-2">
          {plan.blocks.map((block) => {
            const isCurrent = currentBlock?.id === block.id
            return (
              <div
                key={block.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
                  isCurrent ? 'border-blue-200 bg-blue-50 text-blue-950' : 'bg-background'
                )}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {block.order}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{block.title}</p>
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
