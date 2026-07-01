'use client'

import Link from 'next/link'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { useLocale, useTranslations } from '@/i18n/client'
import type { DashboardRecentActivitySummary } from '@/types/dashboard-recent-activity'
import type { DashboardItem } from '@/types/dashboard-items'
import { getItemDate, isItemCompleted } from '@/types/dashboard-items'
import { HeroCardSlider } from './HeroCardSlider'
import { RestDayHeroCard } from './RestDayHeroCard'

interface DashboardDaySwitcherProps {
  items: DashboardItem[]
  dateOptions: string[]
  nextItem: DashboardItem | null
  readinessScore: number | null
  athleteName: string
  basePath: string
  mode: 'rest-day' | 'open-day'
  sportType?: string
  recentActivity?: DashboardRecentActivitySummary | null
  wodRemainingCount: number
  wodIsUnlimited: boolean
}

const kindPriority: Record<DashboardItem['kind'], number> = {
  program: 0,
  assignment: 1,
  wod: 2,
  adhoc: 3,
}

function sortDayItems(items: DashboardItem[]): DashboardItem[] {
  return [...items].sort((a, b) => {
    const aCompleted = isItemCompleted(a)
    const bCompleted = isItemCompleted(b)

    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
    return kindPriority[a.kind] - kindPriority[b.kind]
  })
}

export function DashboardDaySwitcher({
  items,
  dateOptions,
  nextItem,
  readinessScore,
  athleteName,
  basePath,
  mode,
  sportType,
  recentActivity,
  wodRemainingCount,
  wodIsUnlimited,
}: DashboardDaySwitcherProps) {
  const t = useTranslations('components.dashboardDaySwitcher')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedDate = dateOptions[selectedIndex] ?? dateOptions[0]

  const selectedItems = selectedDate
    ? sortDayItems(items.filter((item) => format(getItemDate(item), 'yyyy-MM-dd') === selectedDate))
    : []

  if (!selectedDate) return null

  const dateLabel = selectedIndex === 0
    ? t('today')
    : selectedIndex === 1
      ? t('tomorrow')
      : format(parseISO(selectedDate), 'EEEE', { locale: dateLocale })
  const formattedDate = format(parseISO(selectedDate), 'd MMMM', { locale: dateLocale })
  const isToday = selectedIndex === 0
  const canGoBack = selectedIndex > 0
  const canGoForward = selectedIndex < dateOptions.length - 1

  return (
    <div className="lg:col-span-2">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          onClick={() => setSelectedIndex((index) => Math.max(0, index - 1))}
          disabled={!canGoBack}
          aria-label={t('previousDay')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={!isToday ? () => setSelectedIndex(0) : undefined}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-center"
          aria-label={!isToday ? t('goToToday') : undefined}
          aria-current={isToday ? 'date' : undefined}
        >
          <span className="block truncate text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {dateLabel}
          </span>
          <span className="block truncate text-xs capitalize text-slate-500 dark:text-slate-400">
            {formattedDate}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg"
          onClick={() => setSelectedIndex((index) => Math.min(dateOptions.length - 1, index + 1))}
          disabled={!canGoForward}
          aria-label={t('nextDay')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {selectedItems.length > 0 ? (
        <HeroCardSlider
          key={selectedDate}
          items={selectedItems}
          athleteName={athleteName}
          basePath={basePath}
        />
      ) : isToday ? (
        <RestDayHeroCard
          nextItem={nextItem}
          readinessScore={readinessScore}
          athleteName={athleteName}
          basePath={basePath}
          mode={mode}
          sportType={sportType}
          recentActivity={recentActivity}
          wodRemainingCount={wodRemainingCount}
          wodIsUnlimited={wodIsUnlimited}
        />
      ) : (
        <GlassCard className="overflow-hidden rounded-2xl bg-white/95 text-slate-950 ring-slate-900/10 dark:bg-slate-950 dark:text-white dark:ring-white/10">
          <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center md:min-h-[300px]">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <CalendarDays className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-bold md:text-2xl">{t('empty.title')}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-300">
              {t('empty.description')}
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href={`${basePath}/athlete/calendar`}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {t('viewCalendar')}
              </Link>
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
