'use client'

/**
 * WorkoutLogClient - Client component for workout logging with focus mode support
 *
 * Detects if workout has exercises and offers:
 * 1. Focus Mode - exercise-by-exercise guided workout
 * 2. Quick Log - simple form-based logging
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Play,
  ClipboardList,
  Dumbbell,
  Timer,
  Flame,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { WorkoutLoggingForm } from '@/components/athlete/WorkoutLoggingForm'
import { WorkoutFocusMode } from './WorkoutFocusMode'
import { useBasePath } from '@/lib/contexts/BasePathContext'

interface WorkoutLogClientProps {
  workout: any
  athleteId: string
  existingLog?: any
  basePath?: string
}

type ViewMode = 'choosing' | 'focus' | 'quicklog'

const SECTION_CONFIG = {
  WARMUP: {
    label: 'Uppvärmning',
    icon: Flame,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-500/10',
    borderColor: 'border-yellow-200 dark:border-yellow-500/20',
  },
  MAIN: {
    label: 'Huvudpass',
    icon: Dumbbell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-500/20',
  },
  CORE: {
    label: 'Core',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    borderColor: 'border-purple-200 dark:border-purple-500/20',
  },
  COOLDOWN: {
    label: 'Nedvarvning',
    icon: Timer,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-500/20',
  },
}

export function WorkoutLogClient({
  workout,
  athleteId,
  existingLog,
  basePath: basePathProp = '',
}: WorkoutLogClientProps) {
  const router = useRouter()
  const contextBasePath = useBasePath()
  const basePath = basePathProp || contextBasePath
  const [viewMode, setViewMode] = useState<ViewMode>('choosing')
  const [focusModeData, setFocusModeData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Check if workout has exercises for focus mode
  useEffect(() => {
    async function checkFocusMode() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/workouts/${workout.id}/focus-mode`)

        if (!response.ok) {
          throw new Error('Failed to fetch workout data')
        }

        const result = await response.json()
        setFocusModeData(result.data)

        // If no exercises, go directly to quick log mode
        if (!result.data.hasExercises) {
          setViewMode('quicklog')
        }
      } catch (err) {
        console.error('Error checking focus mode:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        // Fallback to quick log on error
        setViewMode('quicklog')
      } finally {
        setIsLoading(false)
      }
    }

    checkFocusMode()
  }, [workout.id])

  const toggleSection = (sectionType: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionType)) {
        newSet.delete(sectionType)
      } else {
        newSet.add(sectionType)
      }
      return newSet
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-32 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  // Focus mode view
  if (viewMode === 'focus' && focusModeData?.hasExercises) {
    return (
      <WorkoutFocusMode
        workoutId={workout.id}
        athleteId={athleteId}
        existingLogId={focusModeData.existingLogId}
        workout={focusModeData.workout}
        sections={focusModeData.sections}
        exercises={focusModeData.exercises}
        progress={focusModeData.progress}
        onClose={() => setViewMode('choosing')}
        onComplete={() => {
          router.push(`${basePath}/athlete/dashboard`)
          router.refresh()
        }}
      />
    )
  }

  // Quick log view
  if (viewMode === 'quicklog') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          {focusModeData?.hasExercises && (
            <Button variant="ghost" onClick={() => setViewMode('choosing')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka
            </Button>
          )}
          {!focusModeData?.hasExercises && (
            <Link href={`${basePath}/athlete/programs/${workout.day?.week?.program?.id || ''}`}>
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till program
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {existingLog ? 'Redigera träningslogg' : 'Logga träningspass'}
          </h1>
          <p className="text-muted-foreground">{workout.name}</p>
        </div>

        {/* Coach Feedback */}
        {existingLog?.coachFeedback && (
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full p-2 mt-1">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Feedback från coach
                    </h3>
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-1 rounded-full">
                      Ny
                    </span>
                  </div>
                  <p className="text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-wrap">
                    {existingLog.coachFeedback}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <WorkoutLoggingForm
          workout={workout}
          athleteId={athleteId}
          existingLog={existingLog}
          basePath={basePath}
        />
      </div>
    )
  }

  // Choice view (choosing between focus mode and quick log)
  const getExercisesForSection = (sectionType: string) => {
    if (!focusModeData?.exercises) return []
    return focusModeData.exercises.filter((ex: any) => ex.section === sectionType)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <Link href={`${basePath}/athlete/programs/${workout.day?.week?.program?.id || ''}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till program
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{workout.name}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{formatWorkoutType(workout.type)}</Badge>
          <Badge variant="outline">{formatIntensity(workout.intensity)}</Badge>
          {workout.duration && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Timer className="h-4 w-4" />
              ~{workout.duration} min
            </span>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-500/20">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Resume progress if any */}
      {focusModeData?.progress?.completedSets > 0 && !focusModeData?.progress?.isComplete && (
        <Card className="mb-6 border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Fortsätt där du slutade
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {focusModeData.progress.completedSets} av {focusModeData.progress.totalSetsTarget} set klara ({focusModeData.progress.percentComplete}%)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout sections preview */}
      {focusModeData?.sections && focusModeData.sections.length > 0 && (
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-medium text-muted-foreground">Passöversikt</h3>

          {focusModeData.sections.map((section: any) => {
            const config = SECTION_CONFIG[section.type as keyof typeof SECTION_CONFIG]
            const Icon = config?.icon || Dumbbell
            const exercises = getExercisesForSection(section.type)
            const isExpanded = expandedSections.has(section.type)

            return (
              <Collapsible
                key={section.type}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.type)}
              >
                <Card className={`${config?.borderColor} border`}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader
                      className={`${config?.bgColor} py-3 flex flex-row items-center justify-between cursor-pointer`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-full ${config?.bgColor} flex items-center justify-center`}
                        >
                          <Icon className={`h-4 w-4 ${config?.color}`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{config?.label || section.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {section.exerciseCount} övningar
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-3 pb-3">
                      <ul className="space-y-2">
                        {exercises.map((exercise: any, idx: number) => (
                          <li
                            key={exercise.id}
                            className="flex items-center gap-3 py-2 border-b last:border-0"
                          >
                            <span className="text-sm text-muted-foreground w-6">
                              {idx + 1}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {exercise.nameSv || exercise.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {exercise.sets} × {exercise.repsTarget}
                                {exercise.weight && ` @ ${exercise.weight}`}
                                {exercise.restSeconds && ` • Vila ${exercise.restSeconds}s`}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* Mode selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Välj loggningsmetod</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Focus Mode option */}
          <button
            onClick={() => setViewMode('focus')}
            className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left"
          >
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Play className="h-6 w-6 text-orange-600 dark:text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Fokusläge</h3>
              <p className="text-sm text-muted-foreground">
                Guidad träning övning för övning. Logga set, se bilder och instruktioner,
                vila-timer mellan set.
              </p>
              <Badge className="mt-2 bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 hover:bg-orange-100">
                Rekommenderas
              </Badge>
            </div>
          </button>

          {/* Quick Log option */}
          <button
            onClick={() => setViewMode('quicklog')}
            className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-4 text-left"
          >
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-500/10 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Snabbloggning</h3>
              <p className="text-sm text-muted-foreground">
                Enkel formulärbaserad loggning. Fyll i tid, distans och
                upplevd ansträngning.
              </p>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    HYROX: 'HYROX',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}
