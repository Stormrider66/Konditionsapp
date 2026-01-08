// components/athlete/WorkoutLoggingForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2, Upload, Clock, MapPin, Heart, Zap, Gauge, Mountain, Activity, Waves } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { FormattedWorkoutInstructions } from './workout/FormattedWorkoutInstructions'

// Extended schema with cycling fields
const formSchema = z.object({
  completed: z.boolean().optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  avgPace: z.string().optional(),
  avgHR: z.number().min(0).max(220).optional(),
  maxHR: z.number().min(0).max(220).optional(),
  // Cycling-specific
  avgPower: z.number().min(0).optional(),
  normalizedPower: z.number().min(0).optional(),
  maxPower: z.number().min(0).optional(),
  avgCadence: z.number().min(0).optional(),
  elevation: z.number().min(0).optional(),
  tss: z.number().min(0).optional(),
  // Subjective
  perceivedEffort: z.number().min(1).max(10).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  feeling: z.string().optional(),
  notes: z.string().optional(),
  // External
  dataFileUrl: z.string().optional(),
  stravaUrl: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface WorkoutLoggingFormProps {
  workout: any
  athleteId: string
  existingLog?: any
}

// Define which fields are shown for each workout type
type WorkoutType = 'RUNNING' | 'CYCLING' | 'STRENGTH' | 'CORE' | 'PLYOMETRIC' | 'RECOVERY' | 'HYROX' | 'SWIMMING' | 'SKIING' | 'OTHER'

interface FieldConfig {
  duration: boolean
  distance: boolean
  pace: boolean
  hr: boolean
  power: boolean
  elevation: boolean
  rpe: boolean
  difficulty: boolean
  feeling: boolean
  strava: boolean
}

const FIELD_CONFIG: Record<WorkoutType, FieldConfig> = {
  RUNNING: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  CYCLING: {
    duration: true,
    distance: true,
    pace: false,
    hr: true,
    power: true,
    elevation: true,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  STRENGTH: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  CORE: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  PLYOMETRIC: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  HYROX: {
    duration: true,
    distance: false,
    pace: false,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  RECOVERY: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: false,
    difficulty: false,
    feeling: true,
    strava: false,
  },
  SWIMMING: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  SKIING: {
    duration: true,
    distance: true,
    pace: false,
    hr: true,
    power: false,
    elevation: true,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  OTHER: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: true,
  },
}

export function WorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
}: WorkoutLoggingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get field config for this workout type
  const workoutType = (workout.type as WorkoutType) || 'OTHER'
  const fieldConfig = FIELD_CONFIG[workoutType] || FIELD_CONFIG.OTHER

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
    },
  })

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const method = existingLog ? 'PUT' : 'POST'
      const url = existingLog
        ? `/api/workouts/${workout.id}/logs/${existingLog.id}`
        : `/api/workouts/${workout.id}/logs`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          workoutId: workout.id,
          athleteId,
          completedAt: new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att spara logg')
      }

      toast({
        title: existingLog ? 'Logg uppdaterad!' : 'Pass loggat!',
        description: 'Din träningslogg har sparats.',
      })

      // Gap 7: Refresh to revalidate dashboard data before navigation
      router.refresh()
      router.push(`/athlete/dashboard`)
    } catch (error: any) {
      console.error('Error saving workout log:', error)
      toast({
        title: 'Något gick fel',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const perceivedEffort = form.watch('perceivedEffort')
  const difficulty = form.watch('difficulty')

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
            <CardTitle>Pass information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{workout.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{formatWorkoutType(workout.type)}</Badge>
                <Badge variant="outline">{formatIntensity(workout.intensity)}</Badge>
              </div>
              {workout.instructions && (
                <FormattedWorkoutInstructions
                  instructions={workout.instructions}
                  variant="expanded"
                  maxItems={5}
                />
              )}
            </div>

            {/* Planned values */}
            {(workout.duration || workout.distance) && (
              <div className="flex gap-4 text-sm">
                {workout.duration && (
                  <div>
                    <span className="text-muted-foreground">Planerad tid:</span>{' '}
                    <span className="font-medium">{workout.duration} min</span>
                  </div>
                )}
                {workout.distance && fieldConfig.distance && (
                  <div>
                    <span className="text-muted-foreground">Planerad distans:</span>{' '}
                    <span className="font-medium">{workout.distance} km</span>
                  </div>
                )}
              </div>
            )}

            {/* Workout segments */}
            {workout.segments && workout.segments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Pass-struktur:</h4>
                <div className="space-y-1">
                  {workout.segments.map((segment: any) => (
                    <div
                      key={segment.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Badge variant="secondary" className="text-xs">
                        {formatSegmentType(segment.type)}
                      </Badge>
                      <span>
                        {segment.exercise?.nameSv || segment.exercise?.name || segment.description}
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
                    <FormLabel>Jag har slutfört detta pass</FormLabel>
                    <FormDescription>
                      Markera som slutfört när du har genomfört passet
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
                  ? 'Genomförande'
                  : workoutType === 'CYCLING'
                  ? 'Prestation'
                  : 'Genomförande'}
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
                        Faktisk tid (minuter)
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
                              Höjdmeter (m)
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
                        Höjdmeter (m)
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

        {/* Subjective Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Hur kändes det?</CardTitle>
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
                        RPE (Upplevd ansträngning)
                      </FormLabel>
                      <Badge variant="outline" className={getEffortBadgeClass(perceivedEffort || 5)}>
                        {perceivedEffort || 5}/10 - {getEffortLabel(perceivedEffort || 5)}
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
                      1 = Mycket lätt, 10 = Maximalt
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
                      <FormLabel>Svårighetsgrad</FormLabel>
                      <Badge variant="outline">
                        {difficulty || 5}/10 - {getDifficultyLabel(difficulty || 5)}
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
                      Hur svårt var passet jämfört med förväntan?
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
                    <FormLabel>Känsla</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {['Stark', 'Bra', 'Okej', 'Trött', 'Tung'].map((option) => (
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

            {/* Notes - always shown */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anteckningar</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        workoutType === 'STRENGTH' || workoutType === 'CORE' || workoutType === 'PLYOMETRIC'
                          ? 'Hur gick övningarna? Några problem eller framsteg?'
                          : 'Detaljer om passet, hur det gick, eventuella problem...'
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
                Externa länkar (valfritt)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="stravaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strava-länk</FormLabel>
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
                      Länk till ditt pass på Strava
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
                    <FormLabel>Datafil-länk</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="Länk till GPX, FIT eller TCX-fil..."
                        className="h-12"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Länk till träningsfil (Google Drive, Dropbox, etc.)
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
            Avbryt
          </Button>
          <Button type="submit" disabled={isSubmitting} className="h-12 px-8">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingLog ? 'Uppdatera logg' : 'Spara logg'}
          </Button>
        </div>
      </form>
    </Form>
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
    SWIMMING: 'Simning',
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

function formatSegmentType(type: string): string {
  const types: Record<string, string> = {
    warmup: 'Uppvärmning',
    interval: 'Intervall',
    cooldown: 'Nedvärmning',
    work: 'Arbete',
    rest: 'Vila',
    exercise: 'Övning',
    WARMUP: 'Uppvärmning',
    MAIN: 'Arbete',
    CORE: 'Core',
    COOLDOWN: 'Nedvärmning',
  }
  return types[type] || type
}

function getEffortLabel(effort: number): string {
  if (effort <= 2) return 'Mycket lätt'
  if (effort <= 4) return 'Lätt'
  if (effort <= 6) return 'Måttlig'
  if (effort <= 8) return 'Hård'
  return 'Maximal'
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Lättare än förväntat'
  if (difficulty <= 5) return 'Som förväntat'
  if (difficulty <= 7) return 'Svårare än förväntat'
  return 'Mycket svårt'
}

function getEffortBadgeClass(effort: number): string {
  if (effort <= 3) return 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
  if (effort <= 5) return 'bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400'
  if (effort <= 7) return 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400'
  return 'bg-red-100 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
}
