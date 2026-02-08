'use client'

/**
 * WODHistorySection - Shows WOD history in the Training Library
 *
 * Renders a list of AI-generated WOD cards with title, mode, date, duration, status, and RPE.
 * Supports filtering by workout type.
 */

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Sparkles, Clock, CheckCircle2, Play, Star, Dumbbell, Heart, Shuffle, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface WODSummaryItem {
  id: string
  title: string
  mode: string
  workoutType?: string | null
  requestedDuration: number
  actualDuration: number | null
  status: string
  createdAt: Date | string
  completedAt: Date | string | null
  sessionRPE: number | null
}

interface WODHistorySectionProps {
  wodHistory: WODSummaryItem[]
  basePath: string
}

const modeLabels: Record<string, string> = {
  STRUCTURED: 'Strukturerat',
  CASUAL: 'Avslappnat',
  FUN: 'Bara kul!',
}

const statusLabels: Record<string, string> = {
  GENERATED: 'Genererat',
  STARTED: 'Pågår',
  COMPLETED: 'Slutfört',
  ABANDONED: 'Avbrutet',
}

const workoutTypeLabels: Record<string, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  mixed: 'Mixat',
  core: 'Core',
}

const workoutTypeIcons: Record<string, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Heart,
  mixed: Shuffle,
  core: Target,
}

const WORKOUT_TYPE_FILTERS = [
  { value: 'all', label: 'Alla' },
  { value: 'strength', label: 'Styrka' },
  { value: 'cardio', label: 'Kondition' },
  { value: 'mixed', label: 'Mixat' },
  { value: 'core', label: 'Core' },
]

export function WODHistorySection({ wodHistory, basePath }: WODHistorySectionProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredHistory = typeFilter === 'all'
    ? wodHistory
    : wodHistory.filter(w => (w.workoutType || 'strength') === typeFilter)

  if (wodHistory.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
          Inga AI-Pass ännu
        </h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Genererade AI-pass visas här.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Workout type filter */}
      <div className="flex flex-wrap gap-2">
        {WORKOUT_TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              typeFilter === f.value
                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/30'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Inga pass med vald typ.
        </div>
      )}

      {filteredHistory.map((wod) => {
        const isCompleted = wod.status === 'COMPLETED'
        const isStarted = wod.status === 'STARTED'
        const createdDate = new Date(wod.createdAt)

        return (
          <Link
            key={wod.id}
            href={`${basePath}/athlete/wod/${wod.id}`}
            className="block"
          >
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {wod.title}
                  </span>
                  <Badge
                    variant={isCompleted ? 'default' : 'secondary'}
                    className={
                      isCompleted
                        ? 'bg-green-500 text-white text-[10px] px-1.5 py-0'
                        : isStarted
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 text-[10px] px-1.5 py-0'
                          : 'text-[10px] px-1.5 py-0'
                    }
                  >
                    {isCompleted && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                    {isStarted && <Play className="h-3 w-3 mr-0.5" />}
                    {statusLabels[wod.status] || wod.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    <Sparkles className="h-3 w-3" />
                    {modeLabels[wod.mode] || wod.mode}
                  </span>
                  {wod.workoutType && wod.workoutType !== 'strength' && (() => {
                    const TypeIcon = workoutTypeIcons[wod.workoutType] || Dumbbell
                    return (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        <TypeIcon className="h-3 w-3" />
                        {workoutTypeLabels[wod.workoutType] || wod.workoutType}
                      </span>
                    )
                  })()}
                  <span>{format(createdDate, 'd MMM yyyy', { locale: sv })}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {wod.actualDuration || wod.requestedDuration} min
                  </span>
                  {wod.sessionRPE && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      RPE {wod.sessionRPE}/10
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}

      {wodHistory.length >= 50 && (
        <div className="text-center pt-4">
          <Link href={`${basePath}/athlete/wod/history`}>
            <Button variant="outline" size="sm" className="font-bold">
              Visa alla AI-Pass
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
