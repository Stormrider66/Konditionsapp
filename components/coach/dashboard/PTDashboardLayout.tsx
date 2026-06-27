import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CalendarDays,
  ArrowRight,
  Trophy,
  Gauge,
} from 'lucide-react'
import { format, type Locale } from 'date-fns'
import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'
import { TodaysAppointmentsCard } from '@/components/coach/dashboard/TodaysAppointmentsCard'
import { CoachQuickActions } from '@/components/coach/dashboard/CoachQuickActions'
import { AthleteAttentionList } from '@/components/coach/dashboard/AthleteAttentionList'
import { ClientStatusGrid } from '@/components/coach/dashboard/ClientStatusGrid'
import { cn } from '@/lib/utils'
import { getTranslations } from '@/i18n/server'

type CoachTranslator = Awaited<ReturnType<typeof getTranslations>>

const listRowClass =
  'rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30 dark:border-white/10 dark:bg-zinc-950/40 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20'

const quietStateClass =
  'rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-muted-foreground dark:border-white/10 dark:bg-zinc-950/40'

interface PTDashboardLayoutProps {
  basePath: string
  dateLocale: Locale
  recentTests: Array<{
    id: string
    testDate: Date
    testType: string
    vo2max: number | null
    client: { id: string; name: string }
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    type: string
    startDate: Date
    client: { id: string; name: string }
  }>
  pendingFeedbackCount: number
  visible?: Set<string>
  orderMap?: Map<string, number>
  t: CoachTranslator
}

export function PTDashboardLayout({
  basePath,
  dateLocale,
  recentTests,
  upcomingEvents,
  pendingFeedbackCount,
  visible,
  orderMap,
  t,
}: PTDashboardLayoutProps) {
  // If no preferences passed, render everything (backwards compat).
  const isVisible = (key: string) => (visible ? visible.has(key) : true)
  const orderOf = (key: string) => orderMap?.get(key) ?? 9999
  const sortByOrder = <T extends { key: string }>(items: T[]) =>
    [...items].sort((a, b) => orderOf(a.key) - orderOf(b.key))

  // Top-of-page widgets, rendered in user order.
  const topWidgets = sortByOrder([
    { key: 'athlete-attention-list', node: <AthleteAttentionList basePath={basePath} /> },
    { key: 'client-status-grid', node: <ClientStatusGrid basePath={basePath} /> },
  ])

  // Left column widgets
  const leftWidgets = sortByOrder([
    { key: 'todays-appointments', node: <TodaysAppointmentsCard basePath={basePath} variant="default" /> },
    { key: 'coach-ai-assistant', node: <CoachAIAssistantPanel basePath={basePath} /> },
  ])

  // Right column widgets
  const rightWidgets = sortByOrder([
    {
      key: 'coach-quick-actions',
      node: (
        <CoachQuickActions
          mode="PT"
          basePath={basePath}
          pendingFeedbackCount={pendingFeedbackCount}
        />
      ),
    },
    {
      key: 'recent-tests',
      node: (
        <GlassCard glow="blue" className="group">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-500" />
              {t('ptDashboard.recentTests.title')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {recentTests.length === 0 ? (
              <p className={quietStateClass}>
                {t('ptDashboard.recentTests.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {recentTests.slice(0, 3).map(test => (
                  <Link
                    key={test.id}
                    href={`${basePath}/coach/tests/${test.id}`}
                    className={`flex items-center justify-between gap-3 ${listRowClass}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-100">
                        {test.client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {test.testType} {'\u2022'} {format(new Date(test.testDate), 'd MMM', { locale: dateLocale })}
                      </p>
                    </div>
                    {test.vo2max && (
                      <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0">
                        {test.vo2max.toFixed(1)} ml/kg
                      </Badge>
                    )}
                  </Link>
                ))}
                <Link href={`${basePath}/coach/test`} className="block text-center">
                  <Button variant="ghost" size="sm" className="text-xs w-full">
                    {t('ptDashboard.recentTests.createNew')} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      ),
    },
    {
      key: 'upcoming-events',
      node: (
        <GlassCard glow="purple" className="group">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-500" />
              {t('ptDashboard.upcomingEvents.title')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {upcomingEvents.length === 0 ? (
              <div className={quietStateClass}>
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('ptDashboard.upcomingEvents.empty')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 5).map(event => {
                  const isRace = ['RACE_A', 'RACE_B', 'RACE_C', 'COMPETITION'].includes(event.type)
                  return (
                    <Link
                      key={event.id}
                      href={`${basePath}/coach/athletes/${event.client.id}/calendar`}
                      className={`flex items-center gap-3 ${listRowClass}`}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isRace
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      )}>
                        {isRace ? <Trophy className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-100">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.client.name} {'\u2022'} {format(new Date(event.startDate), 'd MMM', { locale: dateLocale })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
                <Link href={`${basePath}/coach/calendar`} className="block">
                  <Button variant="ghost" size="sm" className="text-xs w-full">
                    {t('ptDashboard.upcomingEvents.viewCalendar')} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      ),
    },
  ])

  return (
    <>
      {topWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}

      {/* Bottom Row: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {leftWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}
        </div>
        <div className="space-y-6">
          {rightWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}
        </div>
      </div>
    </>
  )
}
