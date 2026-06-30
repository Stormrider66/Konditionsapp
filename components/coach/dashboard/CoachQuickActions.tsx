'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Target,
  Sparkles,
  Video,
  Dumbbell,
  Timer,
  Users,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { VoiceWorkoutButton } from '@/components/coach/voice-workout'
import type { DashboardMode } from '@/lib/coach/dashboard-mode'
import {
  TeamCoachActionDialog,
  type TeamCoachAction,
} from '@/components/coach/dashboard/TeamCoachActionDialog'
import type { TeamDashboardData } from '@/components/coach/dashboard/TeamDashboardLayout'
import { useTranslations } from '@/i18n/client'

interface CoachQuickActionsProps {
  mode: DashboardMode
  basePath: string
  pendingFeedbackCount: number
  teams?: TeamDashboardData['teams']
}

type TeamQuickActionItem =
  | {
      action: TeamCoachAction
      label: string
      icon: typeof Timer
      className: string
    }
  | {
      href: string
      label: string
      icon: typeof Timer
      className: string
    }

const neutralActionTileClass = 'flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-900'
const actionLabelClass = 'text-xs font-medium text-zinc-700 dark:text-zinc-300'

export function CoachQuickActions({ mode, basePath, pendingFeedbackCount, teams = [] }: CoachQuickActionsProps) {
  const t = useTranslations('components.coachQuickActions')
  const [activeAction, setActiveAction] = useState<TeamCoachAction | null>(null)

  if (mode === 'TEAM') {
    const actions: TeamQuickActionItem[] = [
      {
        action: 'workout' as const,
        label: t('team.createWorkout'),
        icon: Timer,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-950/40',
      },
      {
        action: 'test' as const,
        label: t('team.bookTest'),
        icon: ClipboardList,
        className: 'bg-cyan-50 text-cyan-700 border-cyan-200/70 hover:bg-cyan-100 dark:bg-cyan-950/25 dark:text-cyan-300 dark:border-cyan-800/40 dark:hover:bg-cyan-950/40',
      },
      {
        action: 'message' as const,
        label: t('team.message'),
        icon: MessageSquare,
        className: 'bg-blue-50 text-blue-700 border-blue-200/70 hover:bg-blue-100 dark:bg-blue-950/25 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-950/40',
      },
      {
        href: `${basePath}/coach/programs/new`,
        label: t('team.program'),
        icon: Target,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-950/40',
      },
      {
        href: `${basePath}/coach/clients/new`,
        label: t('team.newAthlete'),
        icon: UserPlus,
        className: 'bg-blue-50 text-blue-700 border-blue-200/70 hover:bg-blue-100 dark:bg-blue-950/25 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-950/40',
      },
      {
        href: `${basePath}/coach/teams`,
        label: t('team.roster'),
        icon: Users,
        className: 'bg-slate-50 text-slate-700 border-slate-200/70 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10',
      },
    ]

    return (
      <>
        <DashboardCard>
          <DashboardCardHeader className="pb-3">
            <DashboardCardTitle className="text-base">{t('team.title')}</DashboardCardTitle>
          </DashboardCardHeader>
          <DashboardCardContent className="grid grid-cols-2 gap-2">
            {actions.map(action => {
              const Icon = action.icon
              if ('href' in action) {
                return (
                  <Link key={action.href} href={action.href} className="block">
                    <div className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition ${action.className}`}>
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                  </Link>
                )
              }

              return (
                <button
                  key={action.action}
                  type="button"
                  onClick={() => setActiveAction(action.action)}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition ${action.className}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              )
            })}
            {pendingFeedbackCount > 0 && (
              <Link href={`${basePath}/coach/clients`} className="block col-span-2">
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition text-center">
                  <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {t('reviewWorkouts')}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                    {pendingFeedbackCount}
                  </Badge>
                </div>
              </Link>
            )}
          </DashboardCardContent>
        </DashboardCard>
        <TeamCoachActionDialog
          action={activeAction}
          basePath={basePath}
          teams={teams}
          open={activeAction !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setActiveAction(null)
          }}
        />
      </>
    )
  }

  // GYM mode — strength-focused quick links
  if (mode === 'GYM') {
    return (
      <DashboardCard>
        <DashboardCardHeader className="pb-3">
          <DashboardCardTitle className="text-base">{t('quickLinks')}</DashboardCardTitle>
        </DashboardCardHeader>
        <DashboardCardContent className="grid grid-cols-2 gap-2">
          <Link href={`${basePath}/coach/clients/new`} className="block">
            <div className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50 p-3 text-center transition hover:bg-emerald-100 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30">
              <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t('gym.newMember')}</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/strength`} className="block">
            <div className={neutralActionTileClass}>
              <Dumbbell className="h-5 w-5 text-blue-500" />
              <span className={actionLabelClass}>{t('gym.strengthWorkout')}</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/strength`} className="block">
            <div className={neutralActionTileClass}>
              <Target className="h-5 w-5 text-amber-500" />
              <span className={actionLabelClass}>{t('gym.logPr')}</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/strength`} className="block">
            <div className={neutralActionTileClass}>
              <ClipboardList className="h-5 w-5 text-cyan-500" />
              <span className={actionLabelClass}>{t('gym.exercises')}</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/clients`} className="block">
            <div className={neutralActionTileClass}>
              <Users className="h-5 w-5 text-blue-500" />
              <span className={actionLabelClass}>{t('gym.bodyMeasurement')}</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/ai-studio`} className="block">
            <div className={neutralActionTileClass}>
              <Sparkles className="h-5 w-5 text-cyan-500" />
              <span className={actionLabelClass}>AI Studio</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/strength`} className="block">
            <div className={neutralActionTileClass}>
              <Timer className="h-5 w-5 text-emerald-500" />
              <span className={actionLabelClass}>{t('gym.assignWorkout')}</span>
            </div>
          </Link>
        </DashboardCardContent>
      </DashboardCard>
    )
  }

  // PT mode — 7 links
  return (
    <DashboardCard>
      <DashboardCardHeader className="pb-3">
        <DashboardCardTitle className="text-base">{t('quickLinks')}</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardContent className="grid grid-cols-2 gap-2">
        <Link href={`${basePath}/coach/clients/new`} className="block">
          <div className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50 p-3 text-center transition hover:bg-emerald-100 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30">
            <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{t('pt.newClient')}</span>
          </div>
        </Link>
        <VoiceWorkoutButton variant="card" basePath={basePath} />
        <Link href={`${basePath}/coach/test`} className="block">
          <div className={neutralActionTileClass}>
            <ClipboardList className="h-5 w-5 text-cyan-500" />
            <span className={actionLabelClass}>{t('pt.newTest')}</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/programs/new`} className="block">
          <div className={neutralActionTileClass}>
            <Target className="h-5 w-5 text-emerald-500" />
            <span className={actionLabelClass}>Program</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/ai-studio`} className="block">
          <div className={neutralActionTileClass}>
            <Sparkles className="h-5 w-5 text-cyan-500" />
            <span className={actionLabelClass}>AI Studio</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/video-analysis`} className="block">
          <div className={neutralActionTileClass}>
            <Video className="h-5 w-5 text-red-500" />
            <span className={actionLabelClass}>Video</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/strength`} className="block">
          <div className={neutralActionTileClass}>
            <Dumbbell className="h-5 w-5 text-blue-500" />
            <span className={actionLabelClass}>{t('pt.strength')}</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/interval-sessions`} className="block">
          <div className={neutralActionTileClass}>
            <Timer className="h-5 w-5 text-emerald-500" />
            <span className={actionLabelClass}>{t('pt.intervals')}</span>
          </div>
        </Link>
      </DashboardCardContent>
    </DashboardCard>
  )
}
