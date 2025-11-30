'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Waves,
  Bike,
  PersonStanding,
  Clock,
  Activity,
  TrendingUp,
  Save,
  Heart,
  Timer,
  Medal,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TriathlonWorkoutLoggingFormProps {
  workout: {
    id: string
    name: string
    description: string | null
    type: string
    duration: number | null
    distance: number | null
    // Triathlon-specific
    workoutDisciplines?: string[] // ['swim', 'bike', 'run'] or subset
    isBrickWorkout?: boolean
  }
  athleteId: string
  existingLog?: {
    id: string
    // Swim data
    swimDuration: number | null
    swimDistance: number | null
    swimPace: number | null
    swimStrokeRate: number | null
    // Bike data
    bikeDuration: number | null
    bikeDistance: number | null
    bikePower: number | null
    bikeNormalizedPower: number | null
    bikeCadence: number | null
    bikeElevation: number | null
    // Run data
    runDuration: number | null
    runDistance: number | null
    runPace: number | null
    runCadence: number | null
    // Transitions
    t1Duration: number | null // Swim to bike
    t2Duration: number | null // Bike to run
    // Heart rate
    avgHR: number | null
    maxHR: number | null
    // Overall
    perceivedEffort: number | null
    feeling: string | null
    notes: string | null
  }
  athleteSettings?: {
    currentCss?: number | null
    currentFtp?: number | null
    currentThresholdPace?: number | null
  }
}

const FEELINGS = [
  { value: 'Great', label: 'Utmärkt', emoji: '😀' },
  { value: 'Good', label: 'Bra', emoji: '🙂' },
  { value: 'Okay', label: 'Okej', emoji: '😐' },
  { value: 'Tired', label: 'Trött', emoji: '😓' },
  { value: 'Struggled', label: 'Kämpigt', emoji: '😩' },
]

const WORKOUT_TYPES = [
  { value: 'swim', label: 'Simning', icon: Waves, color: 'text-blue-500' },
  { value: 'bike', label: 'Cykling', icon: Bike, color: 'text-yellow-500' },
  { value: 'run', label: 'Löpning', icon: PersonStanding, color: 'text-green-500' },
  { value: 'brick', label: 'Brick (Cykel+Löp)', icon: Medal, color: 'text-purple-500' },
  { value: 'full', label: 'Full Triathlon', icon: Medal, color: 'text-orange-500' },
]

// Format seconds to MM:SS
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parse MM:SS to seconds
function parsePace(value: string): number | null {
  const parts = value.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(value) || null
}

// Format duration (seconds) to HH:MM:SS or MM:SS
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TriathlonWorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  athleteSettings,
}: TriathlonWorkoutLoggingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Determine workout type from disciplines
  const defaultWorkoutType = workout.isBrickWorkout
    ? 'brick'
    : workout.workoutDisciplines?.length === 3
      ? 'full'
      : workout.workoutDisciplines?.[0] || 'swim'

  const [workoutType, setWorkoutType] = useState(defaultWorkoutType)

  // Form state
  const [formData, setFormData] = useState({
    // Swim
    swimDuration: existingLog?.swimDuration ?? 0,
    swimDistance: existingLog?.swimDistance ?? 0,
    swimPace: existingLog?.swimPace ?? null,
    swimStrokeRate: existingLog?.swimStrokeRate ?? null,
    includeSwim: ['swim', 'full'].includes(defaultWorkoutType),

    // Bike
    bikeDuration: existingLog?.bikeDuration ?? 0,
    bikeDistance: existingLog?.bikeDistance ?? 0,
    bikePower: existingLog?.bikePower ?? null,
    bikeNormalizedPower: existingLog?.bikeNormalizedPower ?? null,
    bikeCadence: existingLog?.bikeCadence ?? null,
    bikeElevation: existingLog?.bikeElevation ?? null,
    includeBike: ['bike', 'brick', 'full'].includes(defaultWorkoutType),

    // Run
    runDuration: existingLog?.runDuration ?? 0,
    runDistance: existingLog?.runDistance ?? 0,
    runPace: existingLog?.runPace ?? null,
    runCadence: existingLog?.runCadence ?? null,
    includeRun: ['run', 'brick', 'full'].includes(defaultWorkoutType),

    // Transitions
    t1Duration: existingLog?.t1Duration ?? null,
    t2Duration: existingLog?.t2Duration ?? null,

    // Heart rate
    avgHR: existingLog?.avgHR ?? null,
    maxHR: existingLog?.maxHR ?? null,

    // Overall
    perceivedEffort: existingLog?.perceivedEffort ?? 5,
    feeling: existingLog?.feeling ?? 'Good',
    notes: existingLog?.notes ?? '',
  })

  // Pace inputs as strings
  const [swimPaceInput, setSwimPaceInput] = useState(
    formData.swimPace ? formatPace(formData.swimPace) : ''
  )
  const [runPaceInput, setRunPaceInput] = useState(
    formData.runPace ? formatPace(formData.runPace) : ''
  )

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleWorkoutTypeChange = (type: string) => {
    setWorkoutType(type)
    // Update which disciplines are included
    updateField('includeSwim', ['swim', 'full'].includes(type))
    updateField('includeBike', ['bike', 'brick', 'full'].includes(type))
    updateField('includeRun', ['run', 'brick', 'full'].includes(type))
  }

  const handlePaceChange = (type: 'swim' | 'run', value: string) => {
    if (type === 'swim') {
      setSwimPaceInput(value)
      updateField('swimPace', parsePace(value))
    } else {
      setRunPaceInput(value)
      updateField('runPace', parsePace(value))
    }
  }

  // Calculate total duration
  const totalDuration =
    (formData.includeSwim ? formData.swimDuration * 60 : 0) +
    (formData.includeBike ? formData.bikeDuration * 60 : 0) +
    (formData.includeRun ? formData.runDuration * 60 : 0) +
    (formData.t1Duration || 0) +
    (formData.t2Duration || 0)

  // Calculate total distance (normalized to km)
  const totalDistanceKm =
    (formData.includeSwim ? (formData.swimDistance || 0) / 1000 : 0) +
    (formData.includeBike ? formData.bikeDistance || 0 : 0) +
    (formData.includeRun ? formData.runDistance || 0 : 0)

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const logData = {
        workoutId: workout.id,
        athleteId,
        completed: true,
        completedAt: new Date().toISOString(),
        // Swim data
        swimDuration: formData.includeSwim ? formData.swimDuration : null,
        swimDistance: formData.includeSwim ? formData.swimDistance : null,
        swimPace: formData.includeSwim ? formData.swimPace : null,
        swimStrokeRate: formData.includeSwim ? formData.swimStrokeRate : null,
        // Bike data
        bikeDuration: formData.includeBike ? formData.bikeDuration : null,
        bikeDistance: formData.includeBike ? formData.bikeDistance : null,
        bikePower: formData.includeBike ? formData.bikePower : null,
        bikeNormalizedPower: formData.includeBike ? formData.bikeNormalizedPower : null,
        bikeCadence: formData.includeBike ? formData.bikeCadence : null,
        bikeElevation: formData.includeBike ? formData.bikeElevation : null,
        // Run data
        runDuration: formData.includeRun ? formData.runDuration : null,
        runDistance: formData.includeRun ? formData.runDistance : null,
        runPace: formData.includeRun ? formData.runPace : null,
        runCadence: formData.includeRun ? formData.runCadence : null,
        // Transitions
        t1Duration: formData.t1Duration,
        t2Duration: formData.t2Duration,
        // Heart rate
        avgHR: formData.avgHR,
        maxHR: formData.maxHR,
        // Overall
        totalDuration: Math.round(totalDuration / 60), // in minutes
        totalDistance: totalDistanceKm,
        perceivedEffort: formData.perceivedEffort,
        feeling: formData.feeling,
        notes: formData.notes || null,
        workoutType,
      }

      const method = existingLog ? 'PUT' : 'POST'
      const url = existingLog
        ? `/api/workouts/${workout.id}/logs/${existingLog.id}`
        : `/api/workouts/${workout.id}/log`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      })

      if (!response.ok) {
        throw new Error('Failed to save workout log')
      }

      toast({
        title: existingLog ? 'Pass uppdaterat!' : 'Pass loggat!',
        description: 'Din triathlonträning har sparats.',
      })

      router.push(`/athlete/programs/${workout.id}`)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara träningspasset. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRPELabel = (rpe: number) => {
    const labels = ['', 'Mycket lätt', 'Lätt', 'Måttlig', 'Något hård', 'Hård', 'Mycket hård', 'Mycket mycket hård', 'Nära max', 'Maximal', 'Max+']
    return labels[rpe] || ''
  }

  return (
    <div className="space-y-6">
      {/* Workout Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{workout.name}</CardTitle>
              {workout.description && (
                <CardDescription className="mt-1">{workout.description}</CardDescription>
              )}
            </div>
            <Badge variant="secondary" className="text-lg">
              <Medal className="h-4 w-4 mr-1" />
              Triathlon
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Workout Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Välj passtyp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WORKOUT_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={workoutType === type.value ? 'default' : 'outline'}
                onClick={() => handleWorkoutTypeChange(type.value)}
                className="flex flex-col h-auto py-3 gap-1"
              >
                <type.icon className={`h-5 w-5 ${workoutType === type.value ? '' : type.color}`} />
                <span className="text-xs">{type.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Discipline Tabs */}
      <Tabs defaultValue={formData.includeSwim ? 'swim' : formData.includeBike ? 'bike' : 'run'} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="swim" disabled={!formData.includeSwim} className="flex items-center gap-1">
            <Waves className="h-4 w-4" />
            Sim
          </TabsTrigger>
          <TabsTrigger value="bike" disabled={!formData.includeBike} className="flex items-center gap-1">
            <Bike className="h-4 w-4" />
            Cykel
          </TabsTrigger>
          <TabsTrigger value="run" disabled={!formData.includeRun} className="flex items-center gap-1">
            <PersonStanding className="h-4 w-4" />
            Löp
          </TabsTrigger>
        </TabsList>

        {/* Swimming Tab */}
        <TabsContent value="swim">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Waves className="h-4 w-4 text-blue-500" />
                Simdata
                {athleteSettings?.currentCss && (
                  <Badge variant="outline" className="ml-auto">
                    CSS: {formatPace(athleteSettings.currentCss)}/100m
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tid (minuter)</Label>
                  <Input
                    type="number"
                    value={formData.swimDuration || ''}
                    onChange={(e) => updateField('swimDuration', parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label>Distans (meter)</Label>
                  <Input
                    type="number"
                    step="25"
                    value={formData.swimDistance || ''}
                    onChange={(e) => updateField('swimDistance', parseInt(e.target.value) || 0)}
                    placeholder="1500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo (/100m)</Label>
                  <Input
                    type="text"
                    value={swimPaceInput}
                    onChange={(e) => handlePaceChange('swim', e.target.value)}
                    placeholder="1:45"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: M:SS</p>
                </div>
                <div>
                  <Label>Simtagsfrekvens (spm)</Label>
                  <Input
                    type="number"
                    value={formData.swimStrokeRate || ''}
                    onChange={(e) => updateField('swimStrokeRate', parseInt(e.target.value) || null)}
                    placeholder="28"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cycling Tab */}
        <TabsContent value="bike">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className="h-4 w-4 text-yellow-500" />
                Cykeldata
                {athleteSettings?.currentFtp && (
                  <Badge variant="outline" className="ml-auto">
                    FTP: {athleteSettings.currentFtp}W
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tid (minuter)</Label>
                  <Input
                    type="number"
                    value={formData.bikeDuration || ''}
                    onChange={(e) => updateField('bikeDuration', parseInt(e.target.value) || 0)}
                    placeholder="60"
                  />
                </div>
                <div>
                  <Label>Distans (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.bikeDistance || ''}
                    onChange={(e) => updateField('bikeDistance', parseFloat(e.target.value) || 0)}
                    placeholder="40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Snitt watt</Label>
                  <Input
                    type="number"
                    value={formData.bikePower || ''}
                    onChange={(e) => updateField('bikePower', parseInt(e.target.value) || null)}
                    placeholder="180"
                  />
                </div>
                <div>
                  <Label>NP (Normalized)</Label>
                  <Input
                    type="number"
                    value={formData.bikeNormalizedPower || ''}
                    onChange={(e) => updateField('bikeNormalizedPower', parseInt(e.target.value) || null)}
                    placeholder="200"
                  />
                </div>
                <div>
                  <Label>Kadens (rpm)</Label>
                  <Input
                    type="number"
                    value={formData.bikeCadence || ''}
                    onChange={(e) => updateField('bikeCadence', parseInt(e.target.value) || null)}
                    placeholder="85"
                  />
                </div>
              </div>
              <div>
                <Label>Höjdmeter (m)</Label>
                <Input
                  type="number"
                  className="max-w-[150px]"
                  value={formData.bikeElevation || ''}
                  onChange={(e) => updateField('bikeElevation', parseInt(e.target.value) || null)}
                  placeholder="500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Running Tab */}
        <TabsContent value="run">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PersonStanding className="h-4 w-4 text-green-500" />
                Löpdata
                {athleteSettings?.currentThresholdPace && (
                  <Badge variant="outline" className="ml-auto">
                    Tröskel: {formatPace(athleteSettings.currentThresholdPace)}/km
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tid (minuter)</Label>
                  <Input
                    type="number"
                    value={formData.runDuration || ''}
                    onChange={(e) => updateField('runDuration', parseInt(e.target.value) || 0)}
                    placeholder="45"
                  />
                </div>
                <div>
                  <Label>Distans (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.runDistance || ''}
                    onChange={(e) => updateField('runDistance', parseFloat(e.target.value) || 0)}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo (/km)</Label>
                  <Input
                    type="text"
                    value={runPaceInput}
                    onChange={(e) => handlePaceChange('run', e.target.value)}
                    placeholder="5:00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: M:SS</p>
                </div>
                <div>
                  <Label>Kadens (spm)</Label>
                  <Input
                    type="number"
                    value={formData.runCadence || ''}
                    onChange={(e) => updateField('runCadence', parseInt(e.target.value) || null)}
                    placeholder="180"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transitions (for brick/full workouts) */}
      {(workoutType === 'brick' || workoutType === 'full') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Övergångar (Transitions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {workoutType === 'full' && (
                <div>
                  <Label>T1: Sim → Cykel (sekunder)</Label>
                  <Input
                    type="number"
                    value={formData.t1Duration || ''}
                    onChange={(e) => updateField('t1Duration', parseInt(e.target.value) || null)}
                    placeholder="90"
                  />
                </div>
              )}
              <div>
                <Label>T2: Cykel → Löp (sekunder)</Label>
                <Input
                  type="number"
                  value={formData.t2Duration || ''}
                  onChange={(e) => updateField('t2Duration', parseInt(e.target.value) || null)}
                  placeholder="60"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heart Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Pulsdata (övergripande)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Snittpuls (bpm)</Label>
              <Input
                type="number"
                value={formData.avgHR || ''}
                onChange={(e) => updateField('avgHR', parseInt(e.target.value) || null)}
                placeholder="145"
              />
            </div>
            <div>
              <Label>Maxpuls (bpm)</Label>
              <Input
                type="number"
                value={formData.maxHR || ''}
                onChange={(e) => updateField('maxHR', parseInt(e.target.value) || null)}
                placeholder="175"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RPE & Feeling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Känsla & Ansträngning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>RPE (upplevd ansträngning)</Label>
              <Badge variant="secondary">
                {formData.perceivedEffort} - {getRPELabel(formData.perceivedEffort || 5)}
              </Badge>
            </div>
            <Slider
              value={[formData.perceivedEffort || 5]}
              onValueChange={([value]) => updateField('perceivedEffort', value)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Lätt</span>
              <span>Måttlig</span>
              <span>Hård</span>
              <span>Max</span>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Hur kändes passet?</Label>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant={formData.feeling === f.value ? 'default' : 'outline'}
                  onClick={() => updateField('feeling', f.value)}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">{f.emoji}</span>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Anteckningar</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={4}
            placeholder="Hur gick passet? Hur funkade övergångarna? Något speciellt att notera?"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {totalDuration > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 via-yellow-50 to-green-50 dark:from-blue-950/20 dark:via-yellow-950/20 dark:to-green-950/20 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sammanfattning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 text-center">
              {formData.includeSwim && formData.swimDistance > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <Waves className="h-4 w-4 text-blue-500 mb-1" />
                    <p className="font-bold">{formData.swimDistance}m</p>
                    <p className="text-xs text-muted-foreground">{formData.swimDuration}min</p>
                  </div>
                  {(formData.includeBike || formData.includeRun) && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </>
              )}
              {formData.includeBike && formData.bikeDistance > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <Bike className="h-4 w-4 text-yellow-500 mb-1" />
                    <p className="font-bold">{formData.bikeDistance}km</p>
                    <p className="text-xs text-muted-foreground">{formData.bikeDuration}min</p>
                  </div>
                  {formData.includeRun && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </>
              )}
              {formData.includeRun && formData.runDistance > 0 && (
                <div className="flex flex-col items-center">
                  <PersonStanding className="h-4 w-4 text-green-500 mb-1" />
                  <p className="font-bold">{formData.runDistance}km</p>
                  <p className="text-xs text-muted-foreground">{formData.runDuration}min</p>
                </div>
              )}
              <div className="border-l pl-4 ml-2 flex flex-col items-center">
                <Timer className="h-4 w-4 text-primary mb-1" />
                <p className="font-bold text-primary">{formatDuration(totalDuration)}</p>
                <p className="text-xs text-muted-foreground">Totalt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
          disabled={isSubmitting}
        >
          Avbryt
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Sparar...' : existingLog ? 'Uppdatera pass' : 'Spara pass'}
        </Button>
      </div>
    </div>
  )
}
