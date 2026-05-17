'use client'

import Link from 'next/link'
import { Dumbbell, Flame, Heart, Play, TrendingUp, Clock, MapPin, Timer, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { DashboardVisualLayer } from './DashboardVisualLayer'
import { getAssignmentVisual } from './dashboard-visuals'
import {
  DashboardAssignment,
  getAssignmentRoute,
  getAssignmentTypeBadgeStyle,
} from '@/types/dashboard-items'
import { useTranslations } from '@/i18n/client'

interface AssignmentHeroCardProps {
  assignment: DashboardAssignment
  athleteName?: string
  basePath?: string
  onRemove?: () => void
}

function renderAssignmentTypeIcon(type: DashboardAssignment['assignmentType'], className: string) {
  switch (type) {
    case 'strength':
      return <Dumbbell className={className} />
    case 'cardio':
      return <Heart className={className} />
    case 'hybrid':
      return <Flame className={className} />
    case 'agility':
      return <Zap className={className} />
  }
}

export function AssignmentHeroCard({ assignment, basePath = '', onRemove }: AssignmentHeroCardProps) {
  const t = useTranslations('components.assignmentHeroCard')
  const isCompleted = assignment.status === 'COMPLETED'
  const typeLabel = (() => {
    switch (assignment.assignmentType) {
      case 'strength': return t('types.strength')
      case 'cardio': return t('types.cardio')
      case 'hybrid': return t('types.hybrid')
      case 'agility': return t('types.agility')
    }
  })()
  const badgeStyle = getAssignmentTypeBadgeStyle(assignment.assignmentType)
  const route = getAssignmentRoute(assignment, basePath)
  const visual = getAssignmentVisual(assignment.assignmentType, assignment.sport || assignment.name)

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group bg-white/95 text-slate-950 ring-slate-900/10 dark:bg-slate-950 dark:text-white dark:ring-white/10 transition-all">
      <DashboardVisualLayer visual={visual} priority />

      {/* Remove button */}
      {!isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 text-slate-600 opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 transition-all"
          aria-label={t('actions.remove')}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Hover gradient overlay */}
      <div className={`absolute -right-24 -top-24 h-56 w-56 rounded-full ${visual.glowClass} opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100 pointer-events-none`} />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* Type Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur transition-colors ${badgeStyle}`}>
            {renderAssignmentTypeIcon(assignment.assignmentType, 'w-3 h-3')}
            {typeLabel}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white mb-2 max-w-md transition-colors">
            {assignment.name}
          </h2>

          {/* Description / Notes */}
          {(assignment.description || assignment.notes) && (
            <p className="text-slate-600 dark:text-slate-200 max-w-sm text-sm md:text-base transition-colors">
              {assignment.notes || assignment.description}
            </p>
          )}

          {/* Scheduling info */}
          {(assignment.startTime || assignment.locationName) && (
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-300">
              {assignment.startTime && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 backdrop-blur dark:text-emerald-200">
                  <Clock className="h-3.5 w-3.5" />
                  {assignment.startTime}
                </span>
              )}
              {assignment.locationName && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 backdrop-blur dark:text-blue-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {assignment.locationName}
                </span>
              )}
            </div>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-200 text-emerald-700 dark:border-emerald-300/20 dark:text-emerald-200 text-xs font-medium backdrop-blur transition-colors">
              <TrendingUp className="w-3 h-3" />
              {t('completed')}
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          {assignment.duration && (
            <div>
              <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">{t('metrics.duration')}</div>
              <div className="text-lg md:text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 transition-colors">
                <Timer className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                {assignment.duration} min
              </div>
            </div>
          )}

          {/* Type-specific badge */}
          {(assignment.phase || assignment.format || assignment.sport) && (
            <div>
              <div className="text-slate-500 dark:text-slate-300/70 text-xs uppercase tracking-wider mb-1">
                {assignment.phase ? t('metrics.phase') : assignment.sport ? t('metrics.sport') : t('metrics.format')}
              </div>
              <div className="text-lg md:text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 transition-colors">
                {renderAssignmentTypeIcon(assignment.assignmentType, 'w-4 h-4 md:w-5 md:h-5 text-orange-400')}
                {assignment.phase || assignment.format || assignment.sport}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {isCompleted ? (
            <Link href={route}>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] border-slate-300 bg-white/70 text-slate-900 hover:bg-white hover:border-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {t('actions.viewResults')}
              </Button>
            </Link>
          ) : (
            <Link href={route}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 border-0 transition-all">
                <Play className="w-4 h-4 mr-2" />
                {t('actions.startWorkout')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
