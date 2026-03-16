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

export function DashboardStatCards({
  basePath,
  clientsCount,
  activeProgramsCount,
  completedLogsThisWeek,
  logsNeedingFeedbackCount,
  mode,
  readinessDistribution,
  gymStats,
  t,
}: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Link href={`${basePath}/coach/clients`}>
        <GlassCard className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 dark:ring-0 hover:scale-[1.02] transition-transform cursor-pointer">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">{t('athletes')}</p>
                <p className="text-3xl font-bold">{clientsCount}</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-blue-100 flex items-center gap-1 mt-2">
              {t('viewAll')} <ArrowRight className="h-3 w-3" />
            </p>
          </GlassCardContent>
        </GlassCard>
      </Link>

      {/* Card 2: GYM = Aktiva pass, others = Active programs */}
      {mode === 'GYM' && gymStats ? (
        <GlassCard className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 dark:ring-0">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Aktiva pass</p>
                <p className="text-3xl font-bold">{gymStats.activeAssignments}</p>
              </div>
              <Dumbbell className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-green-100 mt-2">Schemalagda & väntande</p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <Link href={`${basePath}/coach/programs`}>
          <GlassCard className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 dark:ring-0 hover:scale-[1.02] transition-transform cursor-pointer">
            <GlassCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">{t('activePrograms')}</p>
                  <p className="text-3xl font-bold">{activeProgramsCount}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
              <p className="text-xs text-green-100 flex items-center gap-1 mt-2">
                {t('viewPrograms')} <ArrowRight className="h-3 w-3" />
              </p>
            </GlassCardContent>
          </GlassCard>
        </Link>
      )}

      {/* Card 3: GYM = PRs denna vecka, others = Completed workouts */}
      {mode === 'GYM' && gymStats ? (
        <GlassCard className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-0 dark:ring-0">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">PRs denna vecka</p>
                <p className="text-3xl font-bold">{gymStats.prsThisWeek}</p>
              </div>
              <Trophy className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-yellow-100 mt-2">Nya personliga rekord</p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <GlassCard className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 dark:ring-0">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">{t('workoutsThisWeek')}</p>
                <p className="text-3xl font-bold">{completedLogsThisWeek}</p>
              </div>
              <Activity className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-purple-100 mt-2">{t('completedByAthletes')}</p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Card 4: TEAM = readiness, GYM = plateaus, PT = needs feedback */}
      {mode === 'TEAM' && readinessDistribution ? (
        <GlassCard className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 dark:ring-0">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Beredskap</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-300" />
                    <span className="text-lg font-bold">{readinessDistribution.high}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-300" />
                    <span className="text-lg font-bold">{readinessDistribution.medium}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-300" />
                    <span className="text-lg font-bold">{readinessDistribution.low}</span>
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-teal-100 mt-2">Lagets beredskap idag</p>
          </GlassCardContent>
        </GlassCard>
      ) : mode === 'GYM' && gymStats ? (
        <GlassCard className={cn(
          'border-0 dark:ring-0',
          gymStats.plateauCount > 0
            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
            : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
        )}>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={gymStats.plateauCount > 0 ? 'text-amber-100 text-sm' : 'text-slate-100 text-sm'}>
                  Platåer
                </p>
                <p className="text-3xl font-bold">{gymStats.plateauCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 opacity-80" />
            </div>
            <p className={`text-xs mt-2 ${gymStats.plateauCount > 0 ? 'text-amber-100' : 'text-slate-100'}`}>
              Övningar som stagnerat
            </p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <GlassCard className={cn(
          'border-0 dark:ring-0',
          logsNeedingFeedbackCount > 0
            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
            : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
        )}>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={logsNeedingFeedbackCount > 0 ? 'text-amber-100 text-sm' : 'text-slate-100 text-sm'}>
                  {t('needsFeedback')}
                </p>
                <p className="text-3xl font-bold">{logsNeedingFeedbackCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 opacity-80" />
            </div>
            <p className={`text-xs mt-2 ${logsNeedingFeedbackCount > 0 ? 'text-amber-100' : 'text-slate-100'}`}>
              {t('workoutsWithoutFeedback')}
            </p>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}
