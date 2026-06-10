// components/athlete/WorkoutLoggingForm.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, Upload, Clock, MapPin, Heart, Zap, Gauge, Mountain, Activity, ChevronDown, ChevronUp, Timer, Trophy, Utensils } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { buildFuelingSessionFeedback } from '@/lib/fueling/session-feedback'
import { buildFuelingInstructionText } from '@/lib/fueling/instructions'
import { summarizeRaceFuelingProductItems } from '@/lib/fueling/product-plan'
import { getOptionalExerciseDisplayName } from '@/lib/exercises/display-name'
import { FormattedWorkoutInstructions } from './workout/FormattedWorkoutInstructions'
import type { RaceContext } from './workout/WorkoutLogClient'
import { useLocale } from '@/i18n/client'
import {
  FIELD_CONFIG,
  FuelingProductCalculator,
  assessGoal,
  buildSegmentLabel,
  extractGoalTime,
  formSchema,
  formatGoalType,
  formatIntensity,
  formatSegmentType,
  formatWorkoutType,
  getDifficultyLabel,
  getEffortBadgeClass,
  getEffortLabel,
  getFeelingOptions,
  getFuelingFeedbackCopy,
  localText,
  parseFinishTime,
  type AppLocale,
  type FormData,
  type WorkoutType,
} from './workout-logging-helpers'


interface WorkoutLoggingFormProps {
  workout: any
  athleteId: string
  existingLog?: any
  basePath?: string
  raceContext?: RaceContext
  onProgramCompletion?: (data: {
    raceResult?: {
      finishTime: string
      finishTimeSeconds: number
      goalTime?: string
      goalAssessment?: 'EXCEEDED' | 'MET' | 'CLOSE' | 'MISSED'
    }
    vdotData?: {
      vdot: number
      trainingPaces: unknown
      equivalentTimes: unknown
    }
  }) => void
}


export function WorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  basePath: basePathProp = '',
  raceContext,
  onProgramCompletion,
}: WorkoutLoggingFormProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const router = useRouter()
  const { toast } = useToast()
  const contextBasePath = useBasePath()
  const basePath = basePathProp || contextBasePath
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [intervalOpen, setIntervalOpen] = useState(true)

  // Get field config for this workout type
  const workoutType = (workout.type as WorkoutType) || 'OTHER'
  const fieldConfig = FIELD_CONFIG[workoutType] || FIELD_CONFIG.OTHER

  // Derive interval segments that qualify for per-rep logging
  const intervalSegments = (workout.segments || []).filter((seg: any) => {
    const type = seg.type?.toLowerCase()
    const isIntervalType = type === 'interval' || type === 'work'
    const reps = seg.sets || seg.reps || seg.repsCount || 0
    return isIntervalType && reps >= 2
  })

  // Build default interval results from existing log or empty reps
  function buildDefaultIntervalResults() {
    if (existingLog?.intervalResults && Array.isArray(existingLog.intervalResults)) {
      return existingLog.intervalResults
    }
    return intervalSegments.map((seg: any) => {
      const reps = seg.sets || seg.reps || seg.repsCount || 2
      const label = buildSegmentLabel(seg, locale)
      return {
        segmentId: seg.id,
        segmentLabel: label,
        workoutType: workoutType,
        reps: Array.from({ length: reps }, (_, i) => ({
          repNumber: i + 1,
          pace: '',
          avgHR: undefined,
          maxHR: undefined,
          duration: undefined,
          distance: undefined,
          avgPower: undefined,
          notes: '',
        })),
      }
    })
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      completed: existingLog?.completed ?? true,
      duration: existingLog?.duration || workout.duration || undefined,
      distance: existingLog?.distance || workout.distance || undefined,
      avgPace: existingLog?.avgPace || '',
      avgHR: existingLog?.avgHR || undefined,
      maxHR: existingLog?.maxHR || undefined,
      avgPower: existingLog?.avgPower || undefined,
      normalizedPower: existingLog?.normalizedPower || undefined,
      maxPower: existingLog?.maxPower || undefined,
      avgCadence: existingLog?.avgCadence || undefined,
      elevation: existingLog?.elevation || undefined,
      tss: existingLog?.tss || undefined,
      perceivedEffort: existingLog?.perceivedEffort || undefined,
      difficulty: existingLog?.difficulty || undefined,
      feeling: existingLog?.feeling || '',
      notes: existingLog?.notes || '',
      dataFileUrl: existingLog?.dataFileUrl || '',
      stravaUrl: existingLog?.stravaUrl || '',
      intervalResults: intervalSegments.length > 0 ? buildDefaultIntervalResults() : undefined,
      raceFinishTime: '',
      actualCarbsGPerHour: existingLog?.fuelingLog?.actualCarbsGPerHour ?? workout.fuelingPrescription?.targetCarbsGPerHour ?? undefined,
      actualCarbsTotalG: existingLog?.fuelingLog?.actualCarbsTotalG ?? workout.fuelingPrescription?.targetCarbsTotalG ?? undefined,
      hydrationMl: existingLog?.fuelingLog?.hydrationMl ?? workout.fuelingPrescription?.hydrationMl ?? undefined,
      sodiumMg: existingLog?.fuelingLog?.sodiumMg ?? undefined,
      stomachRating: existingLog?.fuelingLog?.stomachRating ?? undefined,
      energyRating: existingLog?.fuelingLog?.energyRating ?? undefined,
      fuelingNotes: existingLog?.fuelingLog?.notes || '',
      fuelingProductsUsed: Array.isArray(existingLog?.fuelingLog?.productsUsed)
        ? existingLog.fuelingLog.productsUsed
        : undefined,
    },
  })

  // Helper to update a specific rep field
  const updateIntervalRep = useCallback((segmentIndex: number, repIndex: number, field: string, value: any) => {
    const current = form.getValues('intervalResults') || []
    const updated = [...current]
    if (updated[segmentIndex] && updated[segmentIndex].reps[repIndex]) {
      updated[segmentIndex] = {
        ...updated[segmentIndex],
        reps: updated[segmentIndex].reps.map((rep, ri) =>
          ri === repIndex ? { ...rep, [field]: value } : rep
        ),
      }
      form.setValue('intervalResults', updated)
    }
  }, [form])

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const method = existingLog ? 'PUT' : 'POST'
      const url = existingLog
        ? `/api/workouts/${workout.id}/logs/${existingLog.id}`
        : `/api/workouts/${workout.id}/logs`

      // Clean empty interval data before sending
      let cleanedIntervalResults = data.intervalResults
      if (cleanedIntervalResults && cleanedIntervalResults.length > 0) {
        cleanedIntervalResults = cleanedIntervalResults
          .map((seg) => ({
            ...seg,
            reps: seg.reps.filter((rep) => {
              return rep.pace || rep.avgHR || rep.maxHR || rep.duration || rep.distance || rep.avgPower || rep.notes
            }),
          }))
          .filter((seg) => seg.reps.length > 0)
        if (cleanedIntervalResults.length === 0) {
          cleanedIntervalResults = undefined
        }
      }

      // Build race result data if applicable
      let raceResult: any = undefined
      if (raceContext?.isRaceWorkout && data.raceFinishTime) {
        const finishTimeSeconds = parseFinishTime(data.raceFinishTime)
        if (finishTimeSeconds) {
          const goalTime = extractGoalTime(
            raceContext.programName,
            raceContext.goalRace
          )
          raceResult = {
            finishTime: data.raceFinishTime,
            finishTimeSeconds,
            timeMinutes: finishTimeSeconds / 60,
            goalTime: goalTime || undefined,
            goalAssessment: goalTime
              ? assessGoal(finishTimeSeconds, goalTime)
              : undefined,
            distance: raceContext.goalType || undefined,
            programId: raceContext.programId,
            avgHR: data.avgHR,
            maxHR: data.maxHR,
          }
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          intervalResults: cleanedIntervalResults,
          raceResult,
          fuelingLog: {
            actualCarbsGPerHour: data.actualCarbsGPerHour,
            actualCarbsTotalG: data.actualCarbsTotalG,
            hydrationMl: data.hydrationMl,
            sodiumMg: data.sodiumMg,
            stomachRating: data.stomachRating,
            energyRating: data.energyRating,
            productsUsed: data.fuelingProductsUsed,
            notes: data.fuelingNotes,
          },
          workoutId: workout.id,
          athleteId,
          completedAt: new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || localText(locale, 'Misslyckades med att spara logg', 'Failed to save log'))
      }

      // Check for program completion or race workout celebration
      // Race workouts with a result always celebrate (even if some program workouts were skipped)
      // Non-race programs celebrate when API confirms all workouts are done
      const shouldCelebrate =
        (raceContext?.isRaceWorkout && raceResult) ||
        (result.isProgramCompletion && raceContext?.isProgramFinalWorkout)

      if (shouldCelebrate && raceContext && onProgramCompletion) {
        onProgramCompletion({
          raceResult: raceResult
            ? {
                finishTime: raceResult.finishTime,
                finishTimeSeconds: raceResult.finishTimeSeconds,
                goalTime: raceResult.goalTime,
                goalAssessment: raceResult.goalAssessment,
              }
            : undefined,
          vdotData: result.vdotData || undefined,
        })
        return
      }

      toast({
        title: existingLog ? localText(locale, 'Logg uppdaterad!', 'Log updated!') : localText(locale, 'Pass loggat!', 'Workout logged!'),
        description: localText(locale, 'Din träningslogg har sparats.', 'Your training log has been saved.'),
      })

      // Refresh to revalidate dashboard data before navigation
      router.refresh()
      router.push(`${basePath}/athlete/dashboard`)
    } catch (error: any) {
      console.error('Error saving workout log:', error)
      toast({
        title: localText(locale, 'Något gick fel', 'Something went wrong'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const perceivedEffort = form.watch('perceivedEffort')
  const difficulty = form.watch('difficulty')
  const stomachRating = form.watch('stomachRating')
  const energyRating = form.watch('energyRating')
  const actualCarbsGPerHour = form.watch('actualCarbsGPerHour')
  const actualCarbsTotalG = form.watch('actualCarbsTotalG')
  const loggedDuration = form.watch('duration')
  const fuelingProductsUsed = form.watch('fuelingProductsUsed')
  const fuelingDurationMinutes = loggedDuration ?? workout.duration ?? null
  const fuelingDurationHours = fuelingDurationMinutes && fuelingDurationMinutes > 0 ? fuelingDurationMinutes / 60 : null
  const shouldShowFuelingFeedback = Boolean(workout.fuelingPrescription || existingLog?.fuelingLog)
  const plannedCarbsGPerHour = workout.fuelingPrescription?.targetCarbsGPerHour ?? null
  const plannedCarbsTotalG = workout.fuelingPrescription?.targetCarbsTotalG ?? null
  const fuelingInstructions = workout.fuelingPrescription
    ? buildFuelingInstructionText({
        locale,
        targetCarbsGPerHour: workout.fuelingPrescription.targetCarbsGPerHour,
        targetCarbsTotalG: workout.fuelingPrescription.targetCarbsTotalG,
      })
    : null
  const carbsDelta = actualCarbsTotalG != null && plannedCarbsTotalG != null
    ? Math.round(actualCarbsTotalG - plannedCarbsTotalG)
    : null
  const fuelingSessionFeedback = shouldShowFuelingFeedback
    ? buildFuelingSessionFeedback({
        plannedCarbsGPerHour,
        actualCarbsGPerHour,
        stomachRating,
        energyRating,
      })
    : null

  function calculateFuelingTotalFromHourly() {
    if (!fuelingDurationHours || actualCarbsGPerHour == null) return
    form.setValue('actualCarbsTotalG', Math.round(actualCarbsGPerHour * fuelingDurationHours), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function calculateFuelingHourlyFromTotal() {
    if (!fuelingDurationHours || actualCarbsTotalG == null) return
    form.setValue('actualCarbsGPerHour', Math.round(actualCarbsTotalG / fuelingDurationHours), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  // Check if we have any performance fields to show
  const hasPerformanceFields = fieldConfig.duration || fieldConfig.distance || fieldConfig.pace || fieldConfig.hr || fieldConfig.power || fieldConfig.elevation

  // Check if we have any cycling power fields
  const hasPowerFields = fieldConfig.power

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Workout Info */}
        <Card>
          <CardHeader>
            <CardTitle>{localText(locale, 'Passinformation', 'Workout information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{workout.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{formatWorkoutType(workout.type, locale)}</Badge>
                <Badge variant="outline">{formatIntensity(workout.intensity, locale)}</Badge>
              </div>
              {workout.instructions && (
                <FormattedWorkoutInstructions
                  instructions={workout.instructions}
                  variant="expanded"
                  maxItems={5}
                />
              )}
              {workout.fuelingPrescription && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <div className="flex items-start gap-3">
                    <Utensils className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
                    <div>
                      <p className="font-semibold">{localText(locale, 'Magträning för tävling', 'Race gut training')}</p>
                      <p className="mt-1">
                        {localText(locale, 'Sikta på', 'Aim for')} {Math.round(workout.fuelingPrescription.targetCarbsGPerHour)} {localText(locale, 'g kolhydrater/timme', 'g carbohydrates/hour')}
                        {workout.fuelingPrescription.targetCarbsTotalG
                          ? localText(locale, `, totalt cirka ${Math.round(workout.fuelingPrescription.targetCarbsTotalG)} g under passet.`, `, about ${Math.round(workout.fuelingPrescription.targetCarbsTotalG)} g total during the session.`)
                          : '.'}
                      </p>
                      {fuelingInstructions && (
                        <p className="mt-2 text-amber-900/80 dark:text-amber-100/80">
                          {fuelingInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Planned values */}
            {(workout.duration || workout.distance) && (
              <div className="flex gap-4 text-sm">
                {workout.duration && (
                  <div>
                    <span className="text-muted-foreground">{localText(locale, 'Planerad tid:', 'Planned time:')}</span>{' '}
                    <span className="font-medium">{workout.duration} min</span>
                  </div>
                )}
                {workout.distance && fieldConfig.distance && (
                  <div>
                    <span className="text-muted-foreground">{localText(locale, 'Planerad distans:', 'Planned distance:')}</span>{' '}
                    <span className="font-medium">{workout.distance} km</span>
                  </div>
                )}
              </div>
            )}

            {/* Workout segments */}
            {workout.segments && workout.segments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{localText(locale, 'Pass-struktur:', 'Workout structure:')}</h4>
                <div className="space-y-1">
                  {workout.segments.map((segment: any) => (
                    <div
                      key={segment.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Badge variant="secondary" className="text-xs">
                        {formatSegmentType(segment.type, locale)}
                      </Badge>
                      <span>
                        {getOptionalExerciseDisplayName(segment.exercise, locale) || segment.description}
                        {segment.sets && segment.repsCount && ` (${segment.sets}×${segment.repsCount})`}
                        {segment.duration && !segment.sets && ` (${segment.duration} min)`}
                        {segment.pace && ` @ ${segment.pace}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Race Result Section - shown for race workouts */}
        {raceContext?.isRaceWorkout && (
          <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                {localText(locale, 'Tävlingsresultat', 'Race result')}
                {raceContext.goalType && (
                  <Badge variant="secondary" className="ml-2">
                    {formatGoalType(raceContext.goalType, locale)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="raceFinishTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{localText(locale, 'Sluttid', 'Finish time')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={localText(locale, 't.ex. 39:42 eller 1:45:30', 'e.g. 39:42 or 1:45:30')}
                        className="h-14 text-2xl font-bold text-center"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      MM:SS eller HH:MM:SS
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {raceContext.goalRace && (
                <p className="text-sm text-muted-foreground">
                  {localText(locale, 'Mål:', 'Goal:')} {raceContext.goalRace}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="completed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{localText(locale, 'Jag har slutfört detta pass', 'I completed this workout')}</FormLabel>
                    <FormDescription>
                      {localText(locale, 'Markera som slutfört när du har genomfört passet', 'Mark as completed once you have finished the workout')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Performance Metrics - Only show if relevant for this workout type */}
        {hasPerformanceFields && (
          <Card>
            <CardHeader>
              <CardTitle>
                {workoutType === 'STRENGTH' || workoutType === 'CORE' || workoutType === 'PLYOMETRIC'
                  ? localText(locale, 'Genomförande', 'Execution')
                  : workoutType === 'CYCLING'
                  ? localText(locale, 'Prestation', 'Performance')
                  : localText(locale, 'Genomförande', 'Execution')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration - shown for all types */}
              {fieldConfig.duration && (
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Clock className="inline h-4 w-4 mr-1" />
                        {localText(locale, 'Faktisk tid (minuter)', 'Actual time (minutes)')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-12"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Distance & Pace - for cardio types */}
              {(fieldConfig.distance || fieldConfig.pace) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldConfig.distance && (
                    <FormField
                      control={form.control}
                      name="distance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <MapPin className="inline h-4 w-4 mr-1" />
                            {workoutType === 'SWIMMING' ? 'Distans (meter)' : 'Distans (km)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={workoutType === 'SWIMMING' ? 25 : 0.1}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {fieldConfig.pace && (
                    <FormField
                      control={form.control}
                      name="avgPace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {workoutType === 'SWIMMING'
                              ? 'Tempo (min/100m)'
                              : 'Tempo (min/km)'}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={workoutType === 'SWIMMING' ? 't.ex. 1:45' : 't.ex. 5:30'}
                              className="h-12"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>Format: MM:SS</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Heart Rate - for cardio types and HYROX */}
              {fieldConfig.hr && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="avgHR"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Heart className="inline h-4 w-4 mr-1" />
                          Genomsnittspuls (slag/min)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={220}
                            className="h-12"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxHR"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maxpuls (slag/min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={220}
                            className="h-12"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Cycling Power Metrics */}
              {hasPowerFields && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="avgPower"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Gauge className="inline h-4 w-4 mr-1" />
                            Medeleffekt (W)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="normalizedPower"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NP (W)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>Normaliserad effekt</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxPower"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maxeffekt (W)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="avgCadence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Activity className="inline h-4 w-4 mr-1" />
                            Kadens (RPM)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TSS</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.1}
                              className="h-12"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>Training Stress Score</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {fieldConfig.elevation && (
                      <FormField
                        control={form.control}
                        name="elevation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <Mountain className="inline h-4 w-4 mr-1" />
                              {localText(locale, 'Höjdmeter (m)', 'Elevation gain (m)')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="h-12"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )
                                }
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </>
              )}

              {/* Elevation for non-cycling (skiing) */}
              {fieldConfig.elevation && !hasPowerFields && (
                <FormField
                  control={form.control}
                  name="elevation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Mountain className="inline h-4 w-4 mr-1" />
                        {localText(locale, 'Höjdmeter (m)', 'Elevation gain (m)')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-12"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Per-Interval Results */}
        {intervalSegments.length > 0 && (
          <Card>
            <Collapsible open={intervalOpen} onOpenChange={setIntervalOpen}>
              <CardHeader className="cursor-pointer" onClick={() => setIntervalOpen(!intervalOpen)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      Intervallresultat
                    </CardTitle>
                    {intervalOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {(form.watch('intervalResults') || []).map((segment: any, segIdx: number) => (
                    <div key={segment.segmentId} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{segment.segmentLabel}</Badge>
                      </div>
                      <div className="space-y-3">
                        {segment.reps.map((rep: any, repIdx: number) => (
                          <div
                            key={repIdx}
                            className="border rounded-lg p-3 space-y-2"
                          >
                            <p className="text-sm font-medium text-muted-foreground">
                              Intervall {rep.repNumber} av {segment.reps.length}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {/* Pace field - for running, swimming, other */}
                              {(workoutType === 'RUNNING' || workoutType === 'SWIMMING' || workoutType === 'OTHER') && (
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    {workoutType === 'SWIMMING' ? 'Tempo (min/100m)' : 'Tempo (min/km)'}
                                  </label>
                                  <Input
                                    placeholder={workoutType === 'SWIMMING' ? '1:45' : '4:52'}
                                    className="h-9 text-sm"
                                    value={rep.pace || ''}
                                    onChange={(e) => updateIntervalRep(segIdx, repIdx, 'pace', e.target.value)}
                                  />
                                </div>
                              )}
                              {/* Power field - for cycling */}
                              {workoutType === 'CYCLING' && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Medeleffekt (W)</label>
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    className="h-9 text-sm"
                                    value={rep.avgPower || ''}
                                    onChange={(e) => updateIntervalRep(segIdx, repIdx, 'avgPower', e.target.value ? parseInt(e.target.value) : undefined)}
                                  />
                                </div>
                              )}
                              {/* Avg HR */}
                              <div>
                                <label className="text-xs text-muted-foreground">Snittpuls</label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={220}
                                  className="h-9 text-sm"
                                  value={rep.avgHR || ''}
                                  onChange={(e) => updateIntervalRep(segIdx, repIdx, 'avgHR', e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </div>
                              {/* Max HR */}
                              <div>
                                <label className="text-xs text-muted-foreground">Maxpuls</label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={220}
                                  className="h-9 text-sm"
                                  value={rep.maxHR || ''}
                                  onChange={(e) => updateIntervalRep(segIdx, repIdx, 'maxHR', e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </div>
                              {/* Duration (seconds) */}
                              <div>
                                <label className="text-xs text-muted-foreground">Tid (sek)</label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  className="h-9 text-sm"
                                  value={rep.duration || ''}
                                  onChange={(e) => updateIntervalRep(segIdx, repIdx, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </div>
                              {/* Distance */}
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  {workoutType === 'SWIMMING' ? 'Distans (m)' : 'Distans (km)'}
                                </label>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={workoutType === 'SWIMMING' ? 25 : 0.01}
                                  className="h-9 text-sm"
                                  value={rep.distance || ''}
                                  onChange={(e) => updateIntervalRep(segIdx, repIdx, 'distance', e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Subjective Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>{localText(locale, 'Hur kändes det?', 'How did it feel?')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* RPE - for most workout types */}
            {fieldConfig.rpe && (
              <FormField
                control={form.control}
                name="perceivedEffort"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>
                        <Zap className="inline h-4 w-4 mr-1" />
                        {localText(locale, 'RPE (Upplevd ansträngning)', 'RPE (perceived effort)')}
                      </FormLabel>
                      <Badge variant="outline" className={getEffortBadgeClass(perceivedEffort || 5)}>
                        {perceivedEffort || 5}/10 - {getEffortLabel(perceivedEffort || 5, locale)}
                      </Badge>
                    </div>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value || 5]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="py-4"
                      />
                    </FormControl>
                    <FormDescription>
                      {localText(locale, '1 = Mycket lätt, 10 = Maximalt', '1 = Very easy, 10 = Maximal')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Difficulty - for strength/HYROX types */}
            {fieldConfig.difficulty && (
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>{localText(locale, 'Svårighetsgrad', 'Difficulty')}</FormLabel>
                      <Badge variant="outline">
                        {difficulty || 5}/10 - {getDifficultyLabel(difficulty || 5, locale)}
                      </Badge>
                    </div>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value || 5]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="py-4"
                      />
                    </FormControl>
                    <FormDescription>
                      {localText(locale, 'Hur svårt var passet jämfört med förväntan?', 'How hard was the workout compared with expectations?')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Feeling - for most types */}
            {fieldConfig.feeling && (
              <FormField
                control={form.control}
                name="feeling"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{localText(locale, 'Känsla', 'Feeling')}</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {getFeelingOptions(locale).map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={field.value === option ? 'default' : 'outline'}
                            size="sm"
                            className="h-10"
                            onClick={() => field.onChange(field.value === option ? '' : option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {shouldShowFuelingFeedback && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="mb-4">
                  <h3 className="font-semibold text-amber-950 dark:text-amber-100">{localText(locale, 'Energi under passet', 'Fueling during the workout')}</h3>
                  <p className="text-sm text-amber-900/80 dark:text-amber-100/75">
                    {localText(locale, 'Logga vad du faktiskt fick i dig så kan coachen följa magträningen mot tävling.', 'Log what you actually took in so your coach can track gut training toward race day.')}
                  </p>
                </div>
                <div className="mb-4 grid gap-3 rounded-md border border-amber-200 bg-white/70 p-3 text-sm dark:border-amber-500/20 dark:bg-slate-950/40 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plan</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {plannedCarbsGPerHour ? `${Math.round(plannedCarbsGPerHour)} g/h` : '-'}
                    </p>
                    {plannedCarbsTotalG && (
                      <p className="text-xs text-muted-foreground">{Math.round(plannedCarbsTotalG)} g {localText(locale, 'totalt', 'total')}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{localText(locale, 'Loggat', 'Logged')}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {actualCarbsGPerHour != null ? `${Math.round(actualCarbsGPerHour)} g/h` : '-'}
                    </p>
                    {actualCarbsTotalG != null && (
                      <p className="text-xs text-muted-foreground">{Math.round(actualCarbsTotalG)} g {localText(locale, 'totalt', 'total')}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{localText(locale, 'Skillnad', 'Difference')}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {carbsDelta != null ? `${carbsDelta > 0 ? '+' : ''}${carbsDelta} g` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{localText(locale, 'mot planerad total', 'vs planned total')}</p>
                  </div>
                </div>
                {fuelingDurationHours && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-white/70 p-3 text-xs text-slate-700 dark:border-amber-500/20 dark:bg-slate-950/40 dark:text-slate-200">
                    <span className="font-medium">
                      {localText(locale, 'Beräknar på', 'Calculating from')} {Math.round(fuelingDurationMinutes ?? 0)} min.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actualCarbsGPerHour == null}
                      onClick={calculateFuelingTotalFromHourly}
                    >
                      {localText(locale, 'Räkna total från g/h', 'Calculate total from g/h')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actualCarbsTotalG == null}
                      onClick={calculateFuelingHourlyFromTotal}
                    >
                      {localText(locale, 'Räkna g/h från total', 'Calculate g/h from total')}
                    </Button>
                  </div>
                )}
                <FuelingProductCalculator
                  durationMinutes={fuelingDurationMinutes}
                  locale={locale}
                  onApply={({ totalCarbs, carbsPerHour, productsUsed }) => {
                    form.setValue('actualCarbsTotalG', totalCarbs, { shouldDirty: true, shouldValidate: true })
                    form.setValue('actualCarbsGPerHour', carbsPerHour, { shouldDirty: true, shouldValidate: true })
                    form.setValue('fuelingProductsUsed', productsUsed, { shouldDirty: true, shouldValidate: true })
                  }}
                />
                {fuelingProductsUsed && fuelingProductsUsed.length > 0 && (
                  <div className="mb-4 rounded-md border border-slate-200 bg-white/70 p-3 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200">
                    <p className="mb-1 font-bold uppercase tracking-widest text-muted-foreground">{localText(locale, 'Produkter sparade i loggen', 'Products saved in the log')}</p>
                    <p>{summarizeRaceFuelingProductItems(fuelingProductsUsed, locale)}</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="actualCarbsGPerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{localText(locale, 'Kolhydrater per timme', 'Carbohydrates per hour')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={200}
                            placeholder={localText(locale, 't.ex. 75', 'e.g. 75')}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="actualCarbsTotalG"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{localText(locale, 'Totalt kolhydrater', 'Total carbohydrates')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={1000}
                            placeholder={localText(locale, 't.ex. 120', 'e.g. 120')}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hydrationMl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{localText(locale, 'Vätska', 'Fluid')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={10000}
                            placeholder="ml"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sodiumMg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Natrium</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={10000}
                            placeholder="mg"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="stomachRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>{localText(locale, 'Magkänsla', 'Gut feel')}</FormLabel>
                          <Badge variant="outline">{stomachRating || 3}/5</Badge>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[field.value || 3]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormDescription>{localText(locale, '1 = problem, 5 = helt stabilt', '1 = problems, 5 = fully stable')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="energyRating"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>{localText(locale, 'Energinivå', 'Energy level')}</FormLabel>
                          <Badge variant="outline">{energyRating || 3}/5</Badge>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[field.value || 3]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormDescription>
                          {locale === 'sv' ? '1 = låg energi, 5 = stark hela vägen' : '1 = low energy, 5 = strong all the way'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="fuelingNotes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{locale === 'sv' ? 'Kommentar om energi/mage' : 'Energy/gut comment'}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={locale === 'sv' ? 'Produkt, timing, magrespons, energi...' : 'Product, timing, gut response, energy...'}
                          rows={2}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fuelingSessionFeedback && (
                  <div className="mt-4 rounded-md border bg-white/70 p-3 text-sm dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getFuelingFeedbackCopy(fuelingSessionFeedback, locale).label}
                      </p>
                      {fuelingSessionFeedback.nextTargetGPerHour && (
                        <Badge variant="outline">
                          {locale === 'sv' ? 'Nästa' : 'Next'}: {fuelingSessionFeedback.nextTargetGPerHour} g/h
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {getFuelingFeedbackCopy(fuelingSessionFeedback, locale).message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes - always shown */}
            <FormField
              control={form.control}
              name="notes"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel>{localText(locale, 'Anteckningar', 'Notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        workoutType === 'STRENGTH' || workoutType === 'CORE' || workoutType === 'PLYOMETRIC'
                          ? localText(locale, 'Hur gick övningarna? Några problem eller framsteg?', 'How did the exercises go? Any problems or progress?')
                          : localText(locale, 'Detaljer om passet, hur det gick, eventuella problem...', 'Details about the workout, how it went, any issues...')
                      }
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Data Links - only for cardio types with Strava support */}
        {fieldConfig.strava && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Upload className="inline h-5 w-5 mr-2" />
                {localText(locale, 'Externa länkar (valfritt)', 'External links (optional)')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="stravaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{localText(locale, 'Strava-länk', 'Strava link')}</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://www.strava.com/activities/..."
                        className="h-12"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {localText(locale, 'Länk till ditt pass på Strava', 'Link to your workout on Strava')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataFileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{localText(locale, 'Datafil-länk', 'Data file link')}</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder={localText(locale, 'Länk till GPX, FIT eller TCX-fil...', 'Link to a GPX, FIT, or TCX file...')}
                        className="h-12"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {localText(locale, 'Länk till träningsfil (Google Drive, Dropbox, etc.)', 'Link to training file (Google Drive, Dropbox, etc.)')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="h-12"
          >
            {localText(locale, 'Avbryt', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="h-12 px-8">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingLog ? localText(locale, 'Uppdatera logg', 'Update log') : localText(locale, 'Spara logg', 'Save log')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

