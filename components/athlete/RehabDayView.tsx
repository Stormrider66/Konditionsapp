'use client'

/**
 * Rehab Day View Component
 *
 * Shows today's rehab exercises for the athlete.
 * Allows marking exercises as completed and logging pain.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import {
  Play,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface RehabExercise {
  id: string
  exerciseId: string
  exercise: {
    id: string
    name: string
    nameSv?: string
    nameEn?: string
    videoUrl?: string
    instructions?: string
  }
  sets: number
  reps?: number
  holdSeconds?: number
  frequency: string
  notes?: string
  order: number
}

interface RehabProgram {
  id: string
  name: string
  currentPhase: string
  status: string
  acceptablePainDuring: number
  acceptablePainAfter: number
  exercises: RehabExercise[]
}

interface RehabDayViewProps {
  clientId: string
  onExerciseClick?: (exerciseId: string) => void
  onProgramClick?: (programId: string) => void
  variant?: 'default' | 'glass'
  compact?: boolean
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  ACUTE: { sv: 'Akut', en: 'Acute' },
  SUBACUTE: { sv: 'Subakut', en: 'Subacute' },
  REMODELING: { sv: 'Remodellering', en: 'Remodeling' },
  FUNCTIONAL: { sv: 'Funktionell', en: 'Functional' },
  RETURN_TO_SPORT: { sv: 'Återgång till idrott', en: 'Return to sport' },
}

export function RehabDayView({
  clientId,
  onExerciseClick,
  onProgramClick,
  variant = 'glass',
  compact = false,
}: RehabDayViewProps) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const basePath = useBasePath()
  const isGlass = variant === 'glass'
  const [programs, setPrograms] = useState<RehabProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchPrograms() {
      setIsLoading(true)

      try {
        const response = await fetch(`/api/physio/rehab-programs?clientId=${clientId}&status=ACTIVE`)
        if (!response.ok) {
          throw new Error('Failed to fetch programs')
        }

        const data = await response.json()
        setPrograms(data.programs || [])
      } catch (err) {
        console.error('Error fetching rehab programs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    queueMicrotask(() => void fetchPrograms())
  }, [clientId])

  const handleExerciseComplete = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const handleExerciseClick = (exercise: RehabExercise) => {
    if (onExerciseClick) {
      onExerciseClick(exercise.id)
    } else if (exercise.exercise.videoUrl) {
      window.open(exercise.exercise.videoUrl, '_blank')
    }
  }

  // Don't render if no active programs
  if (!isLoading && programs.length === 0) {
    return null
  }

  // Calculate total and completed exercises
  const totalExercises = programs.reduce((sum, p) => sum + p.exercises.length, 0)
  const completedCount = completedExercises.size
  const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

  if (isLoading) {
    return (
      <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={cn(!isGlass && 'bg-card', 'border-teal-500/20')}>
      <GlassCardHeader className={compact ? 'pb-2' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-500" />
              {text(locale, 'Dagens rehabilitering', "Today's rehabilitation")}
            </GlassCardTitle>
            {!compact && (
              <GlassCardDescription className="text-slate-400">
                {totalExercises} {text(locale, 'övningar att genomföra', 'exercises to complete')}
              </GlassCardDescription>
            )}
          </div>
          {totalExercises > 0 && (
            <div className="text-right">
              <span className="text-2xl font-black text-teal-400 tabular-nums">
                {completedCount}/{totalExercises}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {text(locale, 'Klara', 'Done')}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalExercises > 0 && (
          <div className="mt-4">
            <Progress
              value={progressPercent}
              className="h-2 bg-white/5"
            />
          </div>
        )}
      </GlassCardHeader>

      <GlassCardContent className={cn('space-y-4', compact && 'pt-0')}>
        {programs.map((program) => (
          <div key={program.id} className="space-y-3">
            {/* Program header */}
            <div
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => onProgramClick ? onProgramClick(program.id) : router.push(`${basePath}/athlete/rehab/${program.id}`)}
            >
              <div>
                <p className="font-bold text-white">{program.name}</p>
                <Badge
                  variant="outline"
                  className="text-[10px] border-teal-500/30 text-teal-400 mt-1"
                >
                  {PHASE_LABELS[program.currentPhase]?.[locale] || program.currentPhase}
                </Badge>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </div>

            {/* Exercises */}
            {!compact && (
              <div className="space-y-2 pl-2">
                {program.exercises.map((ex) => {
                  const isCompleted = completedExercises.has(ex.id)
                  return (
                    <div
                      key={ex.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        isCompleted
                          ? 'bg-teal-500/10 border-teal-500/20'
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      )}
                    >
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleExerciseComplete(ex.id)}
                        className="h-5 w-5 border-2 border-teal-500/50 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      />

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleExerciseClick(ex)}
                      >
                        <p className={cn(
                          'font-medium',
                          isCompleted ? 'text-teal-400 line-through' : 'text-white'
                        )}>
                          {locale === 'sv'
                            ? ex.exercise.nameSv || ex.exercise.name
                            : ex.exercise.nameEn || ex.exercise.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{ex.sets} set</span>
                          {ex.reps && <span>× {ex.reps} reps</span>}
                          {ex.holdSeconds && <span>× {ex.holdSeconds}s {text(locale, 'håll', 'hold')}</span>}
                        </div>
                      </div>

                      {ex.exercise.videoUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-teal-500 hover:text-teal-400 hover:bg-teal-500/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(ex.exercise.videoUrl, '_blank')
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Complete all button */}
        {!compact && totalExercises > 0 && completedCount < totalExercises && (
          <Button
            onClick={() => {
              const allIds = new Set<string>()
              programs.forEach(p => p.exercises.forEach(e => allIds.add(e.id)))
              setCompletedExercises(allIds)
            }}
            variant="outline"
            className="w-full border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {text(locale, 'Markera alla som klara', 'Mark all as done')}
          </Button>
        )}

        {/* All done message */}
        {!compact && totalExercises > 0 && completedCount === totalExercises && (
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center">
            <CheckCircle2 className="h-8 w-8 text-teal-500 mx-auto mb-2" />
            <p className="font-bold text-teal-400">{text(locale, 'Bra jobbat!', 'Good work!')}</p>
            <p className="text-sm text-slate-400">{text(locale, 'Du har slutfört alla övningar för idag.', 'You have completed all exercises for today.')}</p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
