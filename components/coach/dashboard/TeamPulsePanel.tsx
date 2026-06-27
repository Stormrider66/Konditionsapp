'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, HeartPulse, MessageSquare, ShieldAlert, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import type { TeamDashboardData } from '@/components/coach/dashboard/TeamDashboardLayout'
import { useTranslations } from '@/i18n/client'

type TeamSummary = TeamDashboardData['teams'][number]

interface TeamPulsePanelProps {
  basePath: string
  teams: TeamSummary[]
  readinessDistribution: {
    high: number
    medium: number
    low: number
    total: number
  }
  pendingFeedbackCount: number
}

export function TeamPulsePanel({
  basePath,
  teams,
  readinessDistribution,
  pendingFeedbackCount,
}: TeamPulsePanelProps) {
  const t = useTranslations('components.teamPulsePanel')
  const injuredTeams = teams.filter(team => team.injuryCount > 0)
  const lowReadinessTeams = teams.filter(team => team.readiness.low > 0)
  const missedWorkoutTeams = teams.filter(team => team.missedWorkoutCount > 0)
  const unreadMessageCount = teams.reduce((sum, team) => sum + team.unreadMessageCount, 0)
  const topAttentionTeams = [...teams]
    .filter(team => team.attentionCount > 0)
    .sort((a, b) => b.attentionCount - a.attentionCount)
    .slice(0, 3)

  return (
    <GlassCard glow="teal" className="group">
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-emerald-500" />
          {t('title')}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/25">
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{readinessDistribution.high}</p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">{t('readiness.ready')}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-950/25">
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{readinessDistribution.medium}</p>
            <p className="text-[11px] text-yellow-700/80 dark:text-yellow-300/80">{t('readiness.monitor')}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/25">
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{readinessDistribution.low}</p>
            <p className="text-[11px] text-red-700/80 dark:text-red-300/80">{t('readiness.low')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 dark:bg-white/5">
            <span className="flex items-center gap-2 text-sm dark:text-slate-200">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              {t('signals.injuryFlags')}
            </span>
            <Badge variant={injuredTeams.length > 0 ? 'destructive' : 'secondary'}>{injuredTeams.length}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 dark:bg-white/5">
            <span className="flex items-center gap-2 text-sm dark:text-slate-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('signals.lowReadinessTeams')}
            </span>
            <Badge variant={lowReadinessTeams.length > 0 ? 'default' : 'secondary'}>{lowReadinessTeams.length}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 dark:bg-white/5">
            <span className="flex items-center gap-2 text-sm dark:text-slate-200">
              <UserX className="h-4 w-4 text-orange-500" />
              {t('signals.missedWorkoutTeams')}
            </span>
            <Badge variant={missedWorkoutTeams.length > 0 ? 'default' : 'secondary'}>{missedWorkoutTeams.length}</Badge>
          </div>
          <Link href={`${basePath}/coach/messages`} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 transition hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10">
            <span className="flex items-center gap-2 text-sm dark:text-slate-200">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {t('signals.unreadTeamMessages')}
            </span>
            <Badge variant={unreadMessageCount > 0 ? 'default' : 'secondary'}>{unreadMessageCount}</Badge>
          </Link>
          <Link href={`${basePath}/coach/clients`} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 transition hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10">
            <span className="flex items-center gap-2 text-sm dark:text-slate-200">
              <MessageSquare className="h-4 w-4 text-violet-500" />
              {t('signals.workoutsWithoutFeedback')}
            </span>
            <Badge variant={pendingFeedbackCount > 0 ? 'default' : 'secondary'}>{pendingFeedbackCount}</Badge>
          </Link>
        </div>

        {topAttentionTeams.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('needsAction')}</p>
            {topAttentionTeams.map(team => (
              <Link key={team.id} href={`${basePath}/coach/teams/${team.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition hover:bg-muted/40 dark:border-white/10 dark:hover:bg-white/5">
                <span className="truncate font-medium dark:text-slate-200">{team.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t('attentionItems', { count: team.attentionCount })}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300">
            {t('noUrgentAction')}
          </div>
        )}

        <Link href={`${basePath}/coach/messages`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            {t('messageGroup')} <MessageSquare className="h-3 w-3 ml-2" />
          </Button>
        </Link>
      </GlassCardContent>
    </GlassCard>
  )
}
