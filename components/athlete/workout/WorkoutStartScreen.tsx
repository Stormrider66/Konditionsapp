'use client'

/**
 * WorkoutStartScreen Component
 *
 * Pre-workout overview screen showing sections, equipment, and duration.
 * Serves as the entry point before Focus Mode.
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  Dumbbell,
  Flame,
  ShieldCheck,
  Target,
  Timer,
  ArrowLeft,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface Exercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  sets: number
  repsTarget: number | string
  weight?: number
  restSeconds: number
  notes?: string
}

interface Section {
  type: 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
  name: string
  notes?: string
  duration?: number
  exerciseCount: number
}

interface WorkoutData {
  assignment: {
    id: string
    assignedDate: string
    status: string
    notes?: string
  }
  workout: {
    id: string
    name: string
    description?: string
    phase: string
    estimatedDuration?: number
  }
  sections: Section[]
  exercises: Exercise[]
  progress: {
    currentExerciseIndex: number
    totalExercises: number
    totalSetsTarget: number
    completedSets: number
    percentComplete: number
    isComplete: boolean
  }
}

interface WorkoutStartScreenProps {
  assignmentId: string
  onStart: () => void
  onBack: () => void
}

const SECTION_CONFIG = {
  WARMUP: {
    labelKey: 'sections.warmup',
    icon: Flame,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  MAIN: {
    labelKey: 'sections.main',
    icon: Dumbbell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  PREHAB: {
    labelKey: 'sections.prehab',
    icon: ShieldCheck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  CORE: {
    labelKey: 'sections.core',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  COOLDOWN: {
    labelKey: 'sections.cooldown',
    icon: Timer,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
}

const PHASE_LABELS: Record<string, { labelKey: string; color: string }> = {
  ANATOMICAL_ADAPTATION: { labelKey: 'phases.anatomicalAdaptation', color: 'bg-green-100 text-green-800' },
  MAX_STRENGTH: { labelKey: 'phases.maxStrength', color: 'bg-purple-100 text-purple-800' },
  POWER: { labelKey: 'phases.power', color: 'bg-red-100 text-red-800' },
  MAINTENANCE: { labelKey: 'phases.maintenance', color: 'bg-blue-100 text-blue-800' },
  TAPER: { labelKey: 'phases.taper', color: 'bg-yellow-100 text-yellow-800' },
}

export function WorkoutStartScreen({
  assignmentId,
  onStart,
  onBack,
}: WorkoutStartScreenProps) {
  const t = useTranslations('components.workoutStartScreen')
  const locale = useLocale()
  const [data, setData] = useState<WorkoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Fetch workout data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/strength-sessions/${assignmentId}/focus-mode`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch workout data')
        }

        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.generic'))
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [assignmentId, t])

  // Toggle section expansion
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

  // Get exercises for a section
  const getExercisesForSection = (sectionType: string): Exercise[] => {
    if (!data) return []
    return data.exercises.filter(
      (ex) => (ex as Exercise & { section: string }).section === sectionType
    )
  }

  // Extract unique equipment from exercises
  const getEquipmentList = (): string[] => {
    if (!data) return []

    // Common equipment keywords to look for in exercise names
    const equipmentKeywords: Record<string, string> = {
      'skivstång': 'barbell',
      'barbell': 'barbell',
      'hantel': 'dumbbells',
      'dumbbell': 'dumbbells',
      'kettlebell': 'kettlebell',
      'kabel': 'cableMachine',
      'cable': 'cableMachine',
      'bänk': 'bench',
      'bench': 'bench',
      'låda': 'plyoBox',
      'box': 'plyoBox',
      'band': 'resistanceBand',
      'stång': 'pullupBar',
      'pull-up': 'pullupBar',
      'chinup': 'pullupBar',
      'rack': 'rack',
      'step': 'step',
      'boll': 'exerciseBall',
      'matta': 'exerciseMat',
    }

    const foundEquipment = new Set<string>()

    data.exercises.forEach((ex) => {
      const name = (locale === 'sv' ? ex.nameSv || ex.name : ex.name).toLowerCase()
      Object.entries(equipmentKeywords).forEach(([keyword, equipmentKey]) => {
        if (name.includes(keyword)) {
          foundEquipment.add(t(`equipment.${equipmentKey}`))
        }
      })
    })

    // Always add mat for core/stretching
    if (data.sections.some((s) => s.type === 'PREHAB' || s.type === 'CORE' || s.type === 'COOLDOWN')) {
      foundEquipment.add(t('equipment.exerciseMat'))
    }

    return Array.from(foundEquipment).sort()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <header className="flex items-center gap-3 p-4 border-b">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">{t('errors.loadTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={onBack}>{t('actions.goBack')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const phaseConfig = PHASE_LABELS[data.workout.phase] || {
    labelKey: data.workout.phase,
    color: 'bg-gray-100 text-gray-800',
  }

  const equipment = getEquipmentList()

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg truncate">{data.workout.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={phaseConfig.color} variant="secondary">
              {PHASE_LABELS[data.workout.phase] ? t(phaseConfig.labelKey) : phaseConfig.labelKey}
            </Badge>
            {data.workout.estimatedDuration && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{data.workout.estimatedDuration} min
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-4">
          {/* Description */}
          {data.workout.description && (
            <p className="text-sm text-muted-foreground">
              {data.workout.description}
            </p>
          )}

          {/* Coach notes */}
          {data.assignment.notes && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-3">
                <p className="text-xs font-medium text-yellow-800 mb-1">
                  {t('coachNote')}
                </p>
                <p className="text-sm text-yellow-900">{data.assignment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{data.progress.totalExercises}</p>
              <p className="text-xs text-muted-foreground">{t('metrics.exercises')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{data.progress.totalSetsTarget}</p>
              <p className="text-xs text-muted-foreground">Set</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">
                {data.workout.estimatedDuration || '—'}
              </p>
              <p className="text-xs text-muted-foreground">min</p>
            </div>
          </div>

          {/* Resume progress if any */}
          {data.progress.completedSets > 0 && !data.progress.isComplete && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    {t('resume.title')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {t('resume.description', {
                      completed: data.progress.completedSets,
                      total: data.progress.totalSetsTarget,
                      percent: data.progress.percentComplete,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment needed */}
          {equipment.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('equipment.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {equipment.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections with exercises */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('overview.title')}
            </h3>

            {data.sections.map((section) => {
              const config = SECTION_CONFIG[section.type] || SECTION_CONFIG.MAIN
              const Icon = config.icon
              const exercises = getExercisesForSection(section.type)
              const isExpanded = expandedSections.has(section.type)

              return (
                <Collapsible
                  key={section.type}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.type)}
                >
                  <Card className={`${config.borderColor} border`}>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader
                        className={`${config.bgColor} py-3 flex flex-row items-center justify-between cursor-pointer`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center`}
                          >
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{t(config.labelKey)}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('overview.exerciseCount', { count: section.exerciseCount })}
                              {section.duration && ` • ~${section.duration} min`}
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
                        {section.notes && (
                          <p className="text-sm text-muted-foreground italic mb-3">
                            {section.notes}
                          </p>
                        )}
                        <ul className="space-y-2">
                          {exercises.map((exercise, idx) => {
                            const exerciseWithSection = exercise as Exercise & { completedSets?: number }
                            const isCompleted = (exerciseWithSection.completedSets || 0) >= exercise.sets

                            return (
                              <li
                                key={exercise.id}
                                className="flex items-center gap-3 py-2 border-b last:border-0"
                              >
                                <span className="text-sm text-muted-foreground w-6">
                                  {idx + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isCompleted ? 'text-green-600' : ''}`}>
                                    {locale === 'sv' ? exercise.nameSv || exercise.name : exercise.name}
                                    {isCompleted && (
                                      <Check className="inline h-4 w-4 ml-1" />
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {exercise.sets} × {exercise.repsTarget}
                                    {exercise.weight && ` @ ${exercise.weight} kg`}
                                    {exercise.restSeconds && ` • ${t('overview.restSeconds', { seconds: exercise.restSeconds })}`}
                                  </p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <Button
          className="w-full h-14 text-lg"
          size="lg"
          onClick={onStart}
        >
          <Play className="h-6 w-6 mr-2" />
          {data.progress.completedSets > 0 ? t('actions.continueWorkout') : t('actions.startWorkout')}
        </Button>
      </div>
    </div>
  )
}

export default WorkoutStartScreen
