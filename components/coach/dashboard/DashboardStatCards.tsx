import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
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
    blue: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5 hover:border-blue-500/30 hover:shadow-blue-500/15',
    emerald: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5 hover:border-emerald-500/30 hover:shadow-emerald-500/15',
    purple: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5 hover:border-purple-500/30 hover:shadow-purple-500/15',
    amber: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5 hover:border-amber-500/30 hover:shadow-amber-500/15',
    red: 'text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/5 hover:border-red-500/30 hover:shadow-red-500/15',
    teal: 'text-teal-500 dark:text-teal-400 bg-teal-500/10 border-teal-500/20 shadow-teal-500/5 hover:border-teal-500/30 hover:shadow-teal-500/15',
    slate: 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20 shadow-slate-500/5 hover:border-slate-500/30 hover:shadow-slate-500/15',
  }

  const cardContent = (
    <GlassCard
      glow={accentColor}
      className="group hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-2xl flex flex-col h-full min-h-[150px]"
    >
      <div className="relative flex flex-col p-6 h-full w-full">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4 w-full relative z-10">
          <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest transition-colors">
            {title}
          </span>
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 shadow-sm",
            accentClasses[accentColor].split(' ').slice(0, 3).join(' ')
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Value */}
        <div className="mb-4 relative z-10 flex items-baseline">
          {typeof value === 'string' || typeof value === 'number' ? (
            <span className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none transition-colors">
              {value}
            </span>
          ) : (
            value
          )}
        </div>

        {/* Bottom Subtext */}
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-auto pt-3 border-t border-slate-100/50 dark:border-white/5 w-full flex items-center justify-between">
          <span className="truncate pr-2">{subtext}</span>
          {linkHref && <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />}
        </div>
      </div>
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
