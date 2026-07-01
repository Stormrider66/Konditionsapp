'use client'

/**
 * Week View
 *
 * A mobile-first, single-week list: the seven days of the anchor's week
 * (Mon–Sun) rendered as a vertical column, each day showing its workouts and
 * events as readable cards. This is the easiest surface for reading "what's on
 * this week" on a small screen, where month-grid cells are too cramped for
 * titles. Tapping a day opens the day sheet; tapping an item opens the item.
 *
 * Colours use semantic theme tokens (bg-card / text-foreground / …) so it is
 * readable in both light and dark themes — the calendar's glass wrapper is
 * white in light mode, so hard-coded white text would be invisible.
 */

import { useMemo } from 'react'
import { startOfWeek, addDays, format, isToday, isSameDay, isSameMonth } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UnifiedCalendarItem } from './types'

interface WeekViewProps {
  anchor: Date
  items: UnifiedCalendarItem[]
  onDayClick: (date: Date) => void
  onItemClick: (item: UnifiedCalendarItem) => void
  selectedDate: Date | null
  locale: 'en' | 'sv'
}

const DOT_COLORS: Record<string, string> = {
  WORKOUT: 'bg-blue-500',
  RACE: 'bg-red-500',
  FIELD_TEST: 'bg-green-500',
  CALENDAR_EVENT: 'bg-purple-500',
  CHECK_IN: 'bg-gray-500',
  AD_HOC: 'bg-teal-500',
  WOD: 'bg-emerald-500',
  GARMIN: 'bg-cyan-500',
  QUICK_ERG: 'bg-lime-500',
}

const BORDER_COLORS: Record<string, string> = {
  WORKOUT: 'border-l-blue-500',
  RACE: 'border-l-red-500',
  FIELD_TEST: 'border-l-green-500',
  CALENDAR_EVENT: 'border-l-purple-500',
  CHECK_IN: 'border-l-gray-500',
  AD_HOC: 'border-l-teal-500',
  WOD: 'border-l-emerald-500',
  GARMIN: 'border-l-cyan-500',
  QUICK_ERG: 'border-l-lime-500',
}

function isCompleted(item: UnifiedCalendarItem): boolean {
  const src = item.metadata.scheduledWorkoutSource as
    | { isCompleted?: boolean; completedAt?: string | Date | null; status?: string }
    | undefined
  return Boolean(
    item.metadata.isCompleted ||
      src?.isCompleted ||
      src?.completedAt ||
      src?.status === 'COMPLETED'
  )
}

function getMeta(item: UnifiedCalendarItem, locale: 'en' | 'sv'): string {
  switch (item.type) {
    case 'WORKOUT':
      return (item.metadata.workoutType as string)?.replace(/_/g, ' ').toLowerCase() || (locale === 'sv' ? 'pass' : 'workout')
    case 'RACE':
      return String(item.metadata.classification || (locale === 'sv' ? 'tävling' : 'race'))
    case 'CALENDAR_EVENT':
      return (item.metadata.eventType as string)?.replace(/_/g, ' ').toLowerCase() || (locale === 'sv' ? 'händelse' : 'event')
    case 'AD_HOC':
      return 'ad-hoc'
    case 'WOD':
      return locale === 'sv' ? 'ai-pass' : 'ai workout'
    case 'QUICK_ERG':
      return 'quick erg'
    case 'FIELD_TEST':
      return locale === 'sv' ? 'test' : 'field test'
    case 'GARMIN':
      return item.metadata.deviceName ? `garmin ${item.metadata.deviceName as string}` : 'garmin'
    default:
      return ''
  }
}

function getPreview(item: UnifiedCalendarItem): string | null {
  if (typeof item.metadata.distance === 'number' && item.metadata.distance > 0) {
    return `${item.metadata.distance} km`
  }
  if (typeof item.metadata.duration === 'number' && item.metadata.duration > 0) {
    return `${item.metadata.duration} min`
  }
  return null
}

export function WeekView({
  anchor,
  items,
  onDayClick,
  onItemClick,
  selectedDate,
  locale,
}: WeekViewProps) {
  const dateLocale = locale === 'sv' ? sv : enUS

  const days = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchor])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>()
    for (const item of items) {
      const key = format(new Date(item.date), 'yyyy-MM-dd')
      const arr = map.get(key) || []
      arr.push(item)
      map.set(key, arr)
    }
    return map
  }, [items])

  return (
    <div className="space-y-2.5">
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const dayItems = itemsByDay.get(key) || []
        const today = isToday(day)
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

        return (
          <div
            key={key}
            className={cn(
              'rounded-2xl border bg-card border-border transition-colors',
              today && 'border-orange-400/70 dark:border-orange-500/40 bg-orange-50/60 dark:bg-orange-500/[0.06]',
              isSelected && 'ring-2 ring-primary'
            )}
          >
            {/* Day header — tap to open the day */}
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left rounded-t-2xl',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                'active:bg-muted/40'
              )}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className={cn(
                    'text-sm font-black capitalize truncate',
                    today ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'
                  )}
                >
                  {format(day, 'EEEE', { locale: dateLocale })}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  {format(day, isSameMonth(day, anchor) ? 'd' : 'd MMM', { locale: dateLocale })}
                </span>
                {today && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 shrink-0">
                    {locale === 'sv' ? 'Idag' : 'Today'}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-2 shrink-0">
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {dayItems.length}
                  </span>
                )}
                <Plus className="h-4 w-4 text-muted-foreground" />
              </span>
            </button>

            {/* Items */}
            {dayItems.length > 0 ? (
              <div className="px-3 pb-3 pt-0.5 space-y-2">
                {dayItems.map((item) => {
                  const completed = isCompleted(item)
                  const preview = getPreview(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={cn(
                        'w-full text-left rounded-xl border-l-4 border-y border-r border-border bg-muted/40 p-3 transition-all active:scale-[0.99] hover:bg-muted/70',
                        BORDER_COLORS[item.type] || 'border-l-blue-500'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', DOT_COLORS[item.type])} />
                          <span className="font-semibold text-sm truncate text-foreground">
                            {item.title}
                          </span>
                          {completed && (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        {preview && (
                          <span className="text-xs font-medium text-muted-foreground shrink-0">{preview}</span>
                        )}
                      </div>
                      <span className="block text-xs text-muted-foreground capitalize truncate mt-0.5 pl-4">
                        {getMeta(item, locale)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className="w-full px-4 pb-3 pt-0 text-left text-xs text-muted-foreground/70 italic"
              >
                {locale === 'sv' ? 'Vila / inget planerat' : 'Rest / nothing planned'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
