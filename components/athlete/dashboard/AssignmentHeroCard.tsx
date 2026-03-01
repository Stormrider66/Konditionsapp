'use client'

import Link from 'next/link'
import { Play, TrendingUp, Clock, MapPin, Timer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  DashboardAssignment,
  getAssignmentRoute,
  getAssignmentTypeLabel,
  getAssignmentTypeIcon,
  getAssignmentTypeBadgeStyle,
} from '@/types/dashboard-items'

interface AssignmentHeroCardProps {
  assignment: DashboardAssignment
  athleteName?: string
  basePath?: string
  onRemove?: () => void
}

export function AssignmentHeroCard({ assignment, athleteName, basePath = '', onRemove }: AssignmentHeroCardProps) {
  const isCompleted = assignment.status === 'COMPLETED'
  const TypeIcon = getAssignmentTypeIcon(assignment.assignmentType)
  const typeLabel = getAssignmentTypeLabel(assignment.assignmentType)
  const badgeStyle = getAssignmentTypeBadgeStyle(assignment.assignmentType)
  const route = getAssignmentRoute(assignment, basePath)

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group transition-all">
      {/* Remove button */}
      {!isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-300 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/20 dark:hover:bg-white/20 transition-all"
          aria-label="Ta bort pass"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* Type Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 transition-colors ${badgeStyle}`}>
            <TypeIcon className="w-3 h-3" />
            {typeLabel}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 max-w-md transition-colors">
            {assignment.name}
          </h2>

          {/* Description / Notes */}
          {(assignment.description || assignment.notes) && (
            <p className="text-slate-600 dark:text-slate-400 max-w-sm text-sm md:text-base transition-colors">
              {assignment.notes || assignment.description}
            </p>
          )}

          {/* Scheduling info */}
          {(assignment.startTime || assignment.locationName) && (
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-400">
              {assignment.startTime && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Clock className="h-3.5 w-3.5" />
                  {assignment.startTime}
                </span>
              )}
              {assignment.locationName && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {assignment.locationName}
                </span>
              )}
            </div>
          )}

          {/* Completed badge */}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium transition-colors">
              <TrendingUp className="w-3 h-3" />
              Slutfört
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          {assignment.duration && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Längd</div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <Timer className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" />
                {assignment.duration} min
              </div>
            </div>
          )}

          {/* Type-specific badge */}
          {(assignment.phase || assignment.format || assignment.sport) && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                {assignment.phase ? 'Fas' : assignment.sport ? 'Sport' : 'Format'}
              </div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <TypeIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" />
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
                className="w-full sm:w-auto min-h-[48px] border-slate-200 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Visa resultat
              </Button>
            </Link>
          ) : (
            <Link href={route}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 dark:shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0 transition-all">
                <Play className="w-4 h-4 mr-2" />
                Starta pass
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
