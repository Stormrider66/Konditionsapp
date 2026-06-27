import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/coach/dashboard/DashboardCard'
import { Activity, Users, Calendar, AlertCircle, ArrowRight, Dumbbell, Trophy, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardMode } from '@/lib/coach/dashboard-mode'
import type { getTranslations } from '@/i18n/server'

type CoachTranslator = Awaited<ReturnType<typeof getTranslations>>

interface DashboardStatCardsProps {
  basePath: string
  clientsCount: number
  activeProgramsCount: number
  completedLogsThisWeek: number
  totalActivitiesThisWeek?: number
  logsNeedingFeedbackCount: number
  mode: DashboardMode
  readinessDistribution?: {
    high: number
    medium: number
    low: number
  }
  gymStats?: {
    activeAssignments: number
    prsThisWeek: number
    plateauCount: number
  }
  t: CoachTranslator
}

interface CardLayoutProps {
  title: string
  value: React.ReactNode
  subtext: string
  icon: React.ElementType
  accentColor: 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'teal' | 'slate'
  linkHref?: string
}

function DashboardStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor,
  linkHref
}: CardLayoutProps) {
  const accentClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    purple: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
    amber: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    red: 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    teal: 'border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300',
    slate: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
  }

  const cardContent = (
    <GlassCard
      glow={accentColor}
      className="group flex h-full min-h-[142px] flex-col"
    >
      <GlassCardContent className="flex h-full w-full flex-col p-5">
        <div className="flex w-full items-start justify-between gap-4">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border',
            accentClasses[accentColor]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline">
          {typeof value === 'string' || typeof value === 'number' ? (
            <span className="text-3xl font-semibold leading-none text-zinc-950 dark:text-zinc-50">
              {value}
            </span>
          ) : (
            value
          )}
        </div>

        <div className="mt-auto flex w-full items-center justify-between border-t border-zinc-100 pt-4 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span className="truncate pr-2">{subtext}</span>
          {linkHref && <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />}
        </div>
      </GlassCardContent>
    </GlassCard>
  )

  if (linkHref) {
    return (
      <Link href={linkHref} className="h-full block">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

export function DashboardStatCards({
  basePath,
  clientsCount,
  activeProgramsCount,
  completedLogsThisWeek,
  totalActivitiesThisWeek,
  logsNeedingFeedbackCount,
  mode,
  readinessDistribution,
  gymStats,
  t,
}: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Card 1: Athletes */}
      <DashboardStatCard
        title={t('athletes')}
        value={clientsCount}
        subtext={t('viewAll')}
        icon={Users}
        accentColor="blue"
        linkHref={`${basePath}/coach/clients`}
      />

      {/* Card 2: Programs / Assignments */}
      {mode === 'GYM' && gymStats ? (
        <DashboardStatCard
          title={t('dashboardStats.activeAssignments')}
          value={gymStats.activeAssignments}
          subtext={t('dashboardStats.scheduledAndPending')}
          icon={Dumbbell}
          accentColor="emerald"
        />
      ) : (
        <DashboardStatCard
          title={t('activePrograms')}
          value={activeProgramsCount}
          subtext={t('viewPrograms')}
          icon={Calendar}
          accentColor="emerald"
          linkHref={`${basePath}/coach/programs`}
        />
      )}

      {/* Card 3: Completed Workouts / PRs */}
      {mode === 'GYM' && gymStats ? (
        <DashboardStatCard
          title={t('dashboardStats.prsThisWeek')}
          value={gymStats.prsThisWeek}
          subtext={t('dashboardStats.newPersonalRecords')}
          icon={Trophy}
          accentColor="purple"
        />
      ) : (
        <DashboardStatCard
          title={t('workoutsThisWeek')}
          value={totalActivitiesThisWeek ?? completedLogsThisWeek}
          subtext={
            totalActivitiesThisWeek !== undefined && totalActivitiesThisWeek !== completedLogsThisWeek
              ? t('dashboardStats.allSources')
              : t('completedByAthletes')
          }
          icon={Activity}
          accentColor="purple"
        />
      )}

      {/* Card 4: Needs feedback / Readiness / Plateaus */}
      {mode === 'TEAM' && readinessDistribution ? (
        <DashboardStatCard
          title={t('dashboardStats.readiness')}
          value={
            <div className="w-full mt-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{readinessDistribution.high}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{readinessDistribution.medium}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{readinessDistribution.low}</span>
                </span>
              </div>
              {(() => {
                const total = readinessDistribution.high + readinessDistribution.medium + readinessDistribution.low
                if (total === 0) return null
                return (
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/10">
                    <div className="bg-emerald-500" style={{ width: `${(readinessDistribution.high / total) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(readinessDistribution.medium / total) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${(readinessDistribution.low / total) * 100}%` }} />
                  </div>
                )
              })()}
            </div>
          }
          subtext={t('dashboardStats.teamReadinessToday')}
          icon={Activity}
          accentColor="teal"
        />
      ) : mode === 'GYM' && gymStats ? (
        <DashboardStatCard
          title={t('dashboardStats.plateaus')}
          value={gymStats.plateauCount}
          subtext={t('dashboardStats.stalledExercises')}
          icon={AlertTriangle}
          accentColor={gymStats.plateauCount > 0 ? 'amber' : 'slate'}
        />
      ) : (
        <DashboardStatCard
          title={t('needsFeedback')}
          value={logsNeedingFeedbackCount}
          subtext={t('workoutsWithoutFeedback')}
          icon={AlertCircle}
          accentColor={logsNeedingFeedbackCount > 0 ? 'amber' : 'slate'}
        />
      )}
    </div>
  )
}
