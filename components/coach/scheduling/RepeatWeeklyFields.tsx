'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Repeat } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const DEFAULT_OCCURRENCES = 4
export const MIN_OCCURRENCES = 2
export const MAX_OCCURRENCES = 12

type AppLocale = 'en' | 'sv'

const labels: Record<AppLocale, { repeatWeekly: string; totalSessions: string }> = {
  en: {
    repeatWeekly: 'Repeat weekly',
    totalSessions: 'Total sessions',
  },
  sv: {
    repeatWeekly: 'Upprepa varje vecka',
    totalSessions: 'Antal pass totalt',
  },
}

export function computeWeeklyDates(baseDate: Date, occurrences: number): Date[] {
  const dates: Date[] = []
  const count = Math.max(1, occurrences)
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i * 7)
    dates.push(d)
  }
  return dates
}

interface RepeatWeeklyFieldsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  occurrences: number
  onOccurrencesChange: (n: number) => void
  baseDate: Date | null
  max?: number
  /** Unique suffix so multiple instances can live on the same page */
  idSuffix?: string
}

export function RepeatWeeklyFields({
  enabled,
  onEnabledChange,
  occurrences,
  onOccurrencesChange,
  baseDate,
  max = MAX_OCCURRENCES,
  idSuffix = '',
}: RepeatWeeklyFieldsProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const copy = labels[locale]
  const previewDates = useMemo(
    () => (enabled && baseDate ? computeWeeklyDates(baseDate, occurrences) : []),
    [enabled, baseDate, occurrences]
  )

  const weekdayLabel = baseDate
    ? format(baseDate, 'EEEE', { locale: dateLocale })
    : ''

  const checkboxId = `repeat-weekly${idSuffix}`
  const inputId = `repeat-occurrences${idSuffix}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={enabled}
          onCheckedChange={(c) => onEnabledChange(!!c)}
        />
        <Label htmlFor={checkboxId} className="flex items-center gap-1.5 cursor-pointer">
          <Repeat className="h-3.5 w-3.5" />
          {copy.repeatWeekly}
          {weekdayLabel && (
            <span className="text-muted-foreground font-normal capitalize">
              ({weekdayLabel})
            </span>
          )}
        </Label>
      </div>

      {enabled && (
        <div className="pl-6 space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={inputId} className="text-sm">
              {copy.totalSessions}
            </Label>
            <Input
              id={inputId}
              type="number"
              min={MIN_OCCURRENCES}
              max={max}
              value={occurrences}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isNaN(v)) return
                onOccurrencesChange(Math.max(MIN_OCCURRENCES, Math.min(max, v)))
              }}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground">
              ({MIN_OCCURRENCES}–{max})
            </span>
          </div>

          {previewDates.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground max-h-32 overflow-y-auto">
              {previewDates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-right tabular-nums">{i + 1}.</span>
                  <span className="capitalize">
                    {format(d, 'EEE d MMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
