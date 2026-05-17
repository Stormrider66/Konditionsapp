'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ClipboardList, HeartPulse, MessageSquare, Timer, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type { TeamDashboardData } from '@/components/coach/dashboard/TeamDashboardLayout'
import {
  TeamCoachActionDialog,
  type TeamCoachAction,
} from '@/components/coach/dashboard/TeamCoachActionDialog'
import { useTranslations } from '@/i18n/client'

type TeamSummary = TeamDashboardData['teams'][number]

const sportLabelKeys: Record<string, string> = {
  TEAM_FOOTBALL: 'football',
  TEAM_ICE_HOCKEY: 'iceHockey',
  TEAM_HANDBALL: 'handball',
  TEAM_FLOORBALL: 'floorball',
  TEAM_BASKETBALL: 'basketball',
  TEAM_VOLLEYBALL: 'volleyball',
  RUNNING: 'running',
  CYCLING: 'cycling',
  SKIING: 'skiing',
  SWIMMING: 'swimming',
  GENERAL_FITNESS: 'fitness',
  STRENGTH: 'strength',
}

function readinessTone(team: TeamSummary) {
  if (team.attentionCount > 0) return 'border-amber-200 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/20'
  if (team.readiness.total > 0 && team.readiness.high >= team.readiness.medium + team.readiness.low) {
    return 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/20'
  }
  return 'border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5'
}

export function TeamQuickAccess({ basePath, teams }: { basePath: string; teams: TeamSummary[] }) {
  const t = useTranslations('components.teamQuickAccess')
  const [activeAction, setActiveAction] = useState<TeamCoachAction | null>(null)
  const [activeTeamId, setActiveTeamId] = useState<string | undefined>()

  function openAction(action: TeamCoachAction, teamId: string) {
    setActiveTeamId(teamId)
    setActiveAction(action)
  }

  return (
    <>
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              {t('title')}
            </GlassCardTitle>
            <Link href={`${basePath}/coach/teams`}>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {t('allTeams')} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {teams.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center dark:border-white/10">
              <p className="text-sm font-medium dark:text-slate-200">{t('empty.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('empty.description')}</p>
              <Link href={`${basePath}/coach/teams`} className="inline-flex mt-4">
                <Button size="sm" variant="outline">{t('empty.manageTeams')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {teams.map(team => (
                <div
                  key={team.id}
                  className={cn(
                    'h-full rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-sm',
                    readinessTone(team),
                  )}
                >
                  <Link href={`${basePath}/coach/teams/${team.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold dark:text-slate-100">{team.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {team.sportType
                          ? sportLabelKeys[team.sportType]
                            ? t(`sports.${sportLabelKeys[team.sportType]}`)
                            : team.sportType
                          : t('teamFallback')}
                      </p>
                    </div>
                    {team.attentionCount > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                        {team.attentionCount}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {team.athleteCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {team.sessionsToday}
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartPulse className="h-3 w-3" />
                      {team.readiness.low}/{team.readiness.total}
                    </span>
                  </div>
                  </Link>

                  <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    {team.readiness.total > 0 ? (
                      <>
                        <span className="bg-emerald-500" style={{ width: `${(team.readiness.high / team.readiness.total) * 100}%` }} />
                        <span className="bg-yellow-500" style={{ width: `${(team.readiness.medium / team.readiness.total) * 100}%` }} />
                        <span className="bg-red-500" style={{ width: `${(team.readiness.low / team.readiness.total) * 100}%` }} />
                      </>
                    ) : (
                      <span className="w-full bg-slate-300 dark:bg-slate-700" />
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <span className="rounded-md bg-white/70 px-2 py-1 text-muted-foreground dark:bg-white/5">
                      {t('missedWorkouts', { count: team.missedWorkoutCount })}
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 text-muted-foreground dark:bg-white/5">
                      {t('unreadMessages', { count: team.unreadMessageCount })}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openAction('workout', team.id)}>
                      <Timer className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openAction('test', team.id)}>
                      <ClipboardList className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openAction('message', team.id)}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
      <TeamCoachActionDialog
        action={activeAction}
        basePath={basePath}
        teams={teams}
        initialTeamId={activeTeamId}
        open={activeAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveAction(null)
        }}
      />
    </>
  )
}
