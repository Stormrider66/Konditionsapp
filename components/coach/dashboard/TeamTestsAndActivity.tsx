'use client'

import Link from 'next/link'
import { format, isToday, isTomorrow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ArrowRight, CalendarClock, ClipboardList, Dumbbell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import type { TeamDashboardData } from '@/components/coach/dashboard/TeamDashboardLayout'

type UpcomingTest = TeamDashboardData['upcomingTests'][number]
type RecentActivity = TeamDashboardData['recentActivity'][number]

function formatEventDate(value: string) {
  const date = new Date(value)
  if (isToday(date)) return 'Idag'
  if (isTomorrow(date)) return 'Imorgon'
  return format(date, 'd MMM', { locale: sv })
}

export function TeamTestsAndActivity({
  basePath,
  upcomingTests,
  recentActivity,
}: {
  basePath: string
  upcomingTests: UpcomingTest[]
  recentActivity: RecentActivity[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-cyan-500" />
              Kommande tester
            </GlassCardTitle>
            <Link href={`${basePath}/coach/test`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Nytt test
              </Button>
            </Link>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {upcomingTests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center dark:border-white/10">
              <p className="text-sm font-medium dark:text-slate-200">Inga tester planerade</p>
              <p className="mt-1 text-xs text-muted-foreground">Planera nästa lagtest när det passar kalendern.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTests.map(test => (
                <Link
                  key={test.id}
                  href={`${basePath}/coach/teams/${test.teamId}/calendar`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 transition hover:bg-muted/40 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium dark:text-slate-200">{test.title}</p>
                    <p className="text-xs text-muted-foreground">{test.teamName}</p>
                  </div>
                  <Badge variant="secondary" className="ml-3 shrink-0">
                    {formatEventDate(test.startDate)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              Senaste lagaktivitet
            </GlassCardTitle>
            <Link href={`${basePath}/coach/programs`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Program <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center dark:border-white/10">
              <p className="text-sm font-medium dark:text-slate-200">Ingen lagaktivitet ännu</p>
              <p className="mt-1 text-xs text-muted-foreground">Tilldelade lagpass visas här.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map(activity => {
                const completion = activity.total > 0 ? Math.round((activity.completed / activity.total) * 100) : 0
                return (
                  <div key={activity.id} className="rounded-lg border px-3 py-2 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium dark:text-slate-200">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.teamName} · {formatEventDate(activity.assignedDate)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">{completion}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
