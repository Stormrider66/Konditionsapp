'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Waves,
  Clock,
  Activity,
  TrendingUp,
  Save,
  Heart,
  Droplets,
  Timer,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

interface SwimmingWorkoutLoggingFormProps {
  workout: {
    id: string
    name: string
    description: string | null
    type: string
    duration: number | null
    distance: number | null
    targetPace?: number | null // seconds per 100m
    swimZone?: number | null
  }
  athleteId: string
  existingLog?: {
    id: string
    duration: number | null
    distance: number | null
    avgPace: number | null // seconds per 100m
    bestPace: number | null
    avgStrokeRate: number | null
    avgStrokeCount: number | null
    swolf: number | null
    avgHR: number | null
    maxHR: number | null
    swimZone: number | null
    poolLength: number | null
    strokeType: string | null
    perceivedEffort: number | null
    feeling: string | null
    notes: string | null
  }
  athleteCss?: number | null // Critical Swim Speed in seconds per 100m
}

type AppLocale = 'en' | 'sv'

const FEELINGS = [
  { value: 'Great', label: { en: 'Great', sv: 'Utmärkt' }, emoji: '😀' },
  { value: 'Good', label: { en: 'Good', sv: 'Bra' }, emoji: '🙂' },
  { value: 'Okay', label: { en: 'Okay', sv: 'Okej' }, emoji: '😐' },
  { value: 'Tired', label: { en: 'Tired', sv: 'Trött' }, emoji: '😓' },
  { value: 'Struggled', label: { en: 'Struggled', sv: 'Kämpigt' }, emoji: '😩' },
]

const SWIM_ZONES = [
  { zone: 1, name: { en: 'Recovery', sv: 'Återhämtning' }, color: 'bg-blue-400', description: '74-83% CSS' },
  { zone: 2, name: { en: 'Endurance', sv: 'Uthållighet' }, color: 'bg-green-400', description: '83-93% CSS' },
  { zone: 3, name: { en: 'Threshold (CSS)', sv: 'Tröskel (CSS)' }, color: 'bg-yellow-400', description: '93-102% CSS' },
  { zone: 4, name: { en: 'VO2max', sv: 'VO2max' }, color: 'bg-orange-400', description: '102-111% CSS' },
  { zone: 5, name: { en: 'Sprint', sv: 'Sprint' }, color: 'bg-red-400', description: '111%+ CSS' },
]

const STROKE_TYPES = [
  { value: 'freestyle', label: { en: 'Freestyle (crawl)', sv: 'Frisim (Crawl)' } },
  { value: 'backstroke', label: { en: 'Backstroke', sv: 'Ryggsim' } },
  { value: 'breaststroke', label: { en: 'Breaststroke', sv: 'Bröstsim' } },
  { value: 'butterfly', label: { en: 'Butterfly', sv: 'Fjärilsim' } },
  { value: 'im', label: { en: 'Individual medley (IM)', sv: 'Medley (IM)' } },
  { value: 'mixed', label: { en: 'Mixed', sv: 'Blandat' } },
]

const POOL_LENGTHS = [
  { value: '25', label: { en: '25m (short course)', sv: '25m (kort bana)' } },
  { value: '50', label: { en: '50m (long course)', sv: '50m (lång bana)' } },
  { value: '0', label: { en: 'Open water', sv: 'Öppet vatten' } },
]

const COPY: Record<AppLocale, {
  saveError: string
  errorTitle: string
  updatedTitle: string
  loggedTitle: string
  savedDescription: string
  rpeLabels: string[]
  swimming: string
  durationDistance: string
  duration: string
  distance: string
  planned: string
  poolLength: string
  poolLengthPlaceholder: string
  stroke: string
  strokePlaceholder: string
  pace: string
  css: string
  averagePace: string
  bestPace: string
  primaryTrainingZone: string
  zonePlaceholder: string
  swimEfficiency: string
  strokeRate: string
  strokesPerMinute: string
  strokesPerLength: string
  swolfExcellent: string
  swolfGood: string
  swolfAverage: string
  swolfCanImprove: string
  heartRateData: string
  averageHeartRate: string
  maxHeartRate: string
  feelingEffort: string
  rpe: string
  easy: string
  moderate: string
  hard: string
  feelingPrompt: string
  notes: string
  notesPlaceholder: string
  summary: string
  minutes: string
  distanceUnit: string
  cancel: string
  saving: string
  updateWorkout: string
  saveWorkout: string
}> = {
  en: {
    saveError: 'Could not save the workout. Try again.',
    errorTitle: 'Error',
    updatedTitle: 'Workout updated!',
    loggedTitle: 'Workout logged!',
    savedDescription: 'Your swim workout has been saved.',
    rpeLabels: ['', 'Very easy', 'Easy', 'Moderate', 'Somewhat hard', 'Hard', 'Very hard', 'Very very hard', 'Near max', 'Maximal', 'Max+'],
    swimming: 'Swimming',
    durationDistance: 'Time & Distance',
    duration: 'Time (minutes)',
    distance: 'Distance (meters)',
    planned: 'Planned',
    poolLength: 'Pool length',
    poolLengthPlaceholder: 'Select length',
    stroke: 'Stroke',
    strokePlaceholder: 'Select stroke',
    pace: 'Pace',
    css: 'Your CSS',
    averagePace: 'Average pace (/100m)',
    bestPace: 'Best pace (/100m)',
    primaryTrainingZone: 'Primary training zone',
    zonePlaceholder: 'Select zone',
    swimEfficiency: 'Swim efficiency',
    strokeRate: 'Stroke rate (spm)',
    strokesPerMinute: 'Strokes per minute',
    strokesPerLength: 'Strokes per length',
    swolfExcellent: 'Excellent',
    swolfGood: 'Good',
    swolfAverage: 'Average',
    swolfCanImprove: 'Can improve',
    heartRateData: 'Heart rate data',
    averageHeartRate: 'Average HR (bpm)',
    maxHeartRate: 'Max HR (bpm)',
    feelingEffort: 'Feeling & Effort',
    rpe: 'RPE (perceived effort)',
    easy: 'Easy',
    moderate: 'Moderate',
    hard: 'Hard',
    feelingPrompt: 'How did the workout feel?',
    notes: 'Notes',
    notesPlaceholder: 'How did the workout go? How was the water temperature? Anything special to note?',
    summary: 'Summary',
    minutes: 'minutes',
    distanceUnit: 'distance',
    cancel: 'Cancel',
    saving: 'Saving...',
    updateWorkout: 'Update workout',
    saveWorkout: 'Save workout',
  },
  sv: {
    saveError: 'Kunde inte spara träningspasset. Försök igen.',
    errorTitle: 'Fel',
    updatedTitle: 'Pass uppdaterat!',
    loggedTitle: 'Pass loggat!',
    savedDescription: 'Din simträning har sparats.',
    rpeLabels: ['', 'Mycket lätt', 'Lätt', 'Måttlig', 'Något hård', 'Hård', 'Mycket hård', 'Mycket mycket hård', 'Nära max', 'Maximal', 'Max+'],
    swimming: 'Simning',
    durationDistance: 'Tid & Distans',
    duration: 'Tid (minuter)',
    distance: 'Distans (meter)',
    planned: 'Planerad',
    poolLength: 'Bassänglängd',
    poolLengthPlaceholder: 'Välj längd',
    stroke: 'Simtag',
    strokePlaceholder: 'Välj simtag',
    pace: 'Tempo',
    css: 'Din CSS',
    averagePace: 'Snitttempo (/100m)',
    bestPace: 'Bästa tempo (/100m)',
    primaryTrainingZone: 'Primär träningszon',
    zonePlaceholder: 'Välj zon',
    swimEfficiency: 'Simeffektivitet',
    strokeRate: 'Simtagsfrekvens (spm)',
    strokesPerMinute: 'Simtag per minut',
    strokesPerLength: 'Simtag per längd',
    swolfExcellent: 'Utmärkt',
    swolfGood: 'Bra',
    swolfAverage: 'Genomsnitt',
    swolfCanImprove: 'Kan förbättras',
    heartRateData: 'Pulsdata',
    averageHeartRate: 'Snittpuls (bpm)',
    maxHeartRate: 'Maxpuls (bpm)',
    feelingEffort: 'Känsla & Ansträngning',
    rpe: 'RPE (upplevd ansträngning)',
    easy: 'Lätt',
    moderate: 'Måttlig',
    hard: 'Hård',
    feelingPrompt: 'Hur kändes passet?',
    notes: 'Anteckningar',
    notesPlaceholder: 'Hur gick passet? Hur var vattentemperaturen? Något speciellt att notera?',
    summary: 'Sammanfattning',
    minutes: 'minuter',
    distanceUnit: 'distans',
    cancel: 'Avbryt',
    saving: 'Sparar...',
    updateWorkout: 'Uppdatera pass',
    saveWorkout: 'Spara pass',
  },
}

interface SwimmingFormData {
  duration: number | null
  distance: number | null
  avgPace: number | null
  bestPace: number | null
  avgStrokeRate: number | null
  avgStrokeCount: number | null
  swolf: number | null
  avgHR: number | null
  maxHR: number | null
  swimZone: number | null
  poolLength: number
  strokeType: string
  perceivedEffort: number
  feeling: string
  notes: string
}

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

export function SwimmingWorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  athleteCss,
}: SwimmingWorkoutLoggingFormProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const basePath = useBasePath()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<SwimmingFormData>({
    duration: existingLog?.duration ?? workout.duration ?? 60,
    distance: existingLog?.distance ?? workout.distance ?? 0,
    avgPace: existingLog?.avgPace ?? null,
    bestPace: existingLog?.bestPace ?? null,
    avgStrokeRate: existingLog?.avgStrokeRate ?? null,
    avgStrokeCount: existingLog?.avgStrokeCount ?? null,
    swolf: existingLog?.swolf ?? null,
    avgHR: existingLog?.avgHR ?? null,
    maxHR: existingLog?.maxHR ?? null,
    swimZone: existingLog?.swimZone ?? workout.swimZone ?? null,
    poolLength: existingLog?.poolLength ?? 25,
    strokeType: existingLog?.strokeType ?? 'freestyle',
    perceivedEffort: existingLog?.perceivedEffort ?? 5,
    feeling: existingLog?.feeling ?? 'Good',
    notes: existingLog?.notes ?? '',
  })

  // Pace input as string for formatting
  const [avgPaceInput, setAvgPaceInput] = useState(
    formData.avgPace ? formatPace(formData.avgPace) : ''
  )
  const [bestPaceInput, setBestPaceInput] = useState(
    formData.bestPace ? formatPace(formData.bestPace) : ''
  )

  // Calculate SWOLF automatically if we have stroke count and time
  const calculateSwolf = (strokeCount: number | null, pace: number | null, poolLength: number) => {
    if (!strokeCount || !pace || !poolLength) return null
    // SWOLF = strokes per length + seconds per length
    const secondsPerLength = (pace / 100) * poolLength
    return Math.round(strokeCount + secondsPerLength)
  }

  // Calculate swim zone from pace
  const calculateSwimZone = (pace: number | null): number | null => {
    if (!pace || !athleteCss) return null
    const paceRatio = athleteCss / pace // Higher ratio = faster than CSS
    if (paceRatio < 0.83) return 1 // Recovery
    if (paceRatio < 0.93) return 2 // Endurance
    if (paceRatio < 1.02) return 3 // Threshold
    if (paceRatio < 1.11) return 4 // VO2max
    return 5 // Sprint
  }

  const updateField = <K extends keyof SwimmingFormData>(field: K, value: SwimmingFormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate SWOLF when relevant fields change
      if (field === 'avgStrokeCount' || field === 'avgPace' || field === 'poolLength') {
        const strokeCount = field === 'avgStrokeCount' ? value as number | null : updated.avgStrokeCount
        const avgPace = field === 'avgPace' ? value as number | null : updated.avgPace
        const poolLength = field === 'poolLength' ? value as number : updated.poolLength
        updated.swolf = calculateSwolf(
          strokeCount,
          avgPace,
          poolLength
        )
      }

      // Auto-calculate zone from pace
      if (field === 'avgPace') {
        updated.swimZone = calculateSwimZone(value as number | null)
      }

      return updated
    })
  }

  const handlePaceChange = (type: 'avg' | 'best', value: string) => {
    if (type === 'avg') {
      setAvgPaceInput(value)
      const seconds = parsePace(value)
      updateField('avgPace', seconds)
    } else {
      setBestPaceInput(value)
      const seconds = parsePace(value)
      updateField('bestPace', seconds)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const logData = {
        workoutId: workout.id,
        athleteId,
        completed: true,
        completedAt: new Date().toISOString(),
        duration: formData.duration || null,
        distance: formData.distance || null,
        avgPace: formData.avgPace || null,
        bestPace: formData.bestPace || null,
        avgStrokeRate: formData.avgStrokeRate || null,
        avgStrokeCount: formData.avgStrokeCount || null,
        swolf: formData.swolf || null,
        avgHR: formData.avgHR || null,
        maxHR: formData.maxHR || null,
        swimZone: formData.swimZone || null,
        poolLength: formData.poolLength || null,
        strokeType: formData.strokeType || null,
        perceivedEffort: formData.perceivedEffort,
        feeling: formData.feeling,
        notes: formData.notes || null,
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
        title: existingLog ? copy.updatedTitle : copy.loggedTitle,
        description: copy.savedDescription,
      })

      router.push(`${basePath}/athlete/programs/${workout.id}`)
      router.refresh()
    } catch {
      toast({
        title: copy.errorTitle,
        description: copy.saveError,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRPELabel = (rpe: number) => {
    return copy.rpeLabels[rpe] || ''
  }

  const getSwolfLabel = (swolf: number) => {
    if (swolf < 30) return copy.swolfExcellent
    if (swolf < 40) return copy.swolfGood
    if (swolf < 50) return copy.swolfAverage
    return copy.swolfCanImprove
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
              <Waves className="h-4 w-4 mr-1" />
              {copy.swimming}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Duration & Distance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {copy.durationDistance}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{copy.duration}</Label>
              <Input
                type="number"
                value={formData.duration || ''}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || null)}
                placeholder="60"
              />
              {workout.duration && (
                <p className="text-xs text-muted-foreground mt-1">{copy.planned}: {workout.duration} min</p>
              )}
            </div>
            <div>
              <Label>{copy.distance}</Label>
              <Input
                type="number"
                step="25"
                value={formData.distance || ''}
                onChange={(e) => updateField('distance', parseInt(e.target.value) || null)}
                placeholder="3000"
              />
              {workout.distance && (
                <p className="text-xs text-muted-foreground mt-1">{copy.planned}: {workout.distance}m</p>
              )}
            </div>
          </div>

          {/* Pool & Stroke */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{copy.poolLength}</Label>
              <Select
                value={formData.poolLength?.toString() || '25'}
                onValueChange={(v) => updateField('poolLength', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.poolLengthPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {POOL_LENGTHS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{copy.stroke}</Label>
              <Select
                value={formData.strokeType || 'freestyle'}
                onValueChange={(v) => updateField('strokeType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.strokePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {STROKE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pace Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            {copy.pace}
          </CardTitle>
          {athleteCss && (
            <CardDescription>{copy.css}: {formatPace(athleteCss)}/100m</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{copy.averagePace}</Label>
              <Input
                type="text"
                value={avgPaceInput}
                onChange={(e) => handlePaceChange('avg', e.target.value)}
                placeholder="1:45"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: M:SS</p>
            </div>
            <div>
              <Label>{copy.bestPace}</Label>
              <Input
                type="text"
                value={bestPaceInput}
                onChange={(e) => handlePaceChange('best', e.target.value)}
                placeholder="1:30"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: M:SS</p>
            </div>
          </div>

          {/* Swim Zone */}
          <div>
            <Label>{copy.primaryTrainingZone}</Label>
            <Select
              value={formData.swimZone?.toString() || ''}
              onValueChange={(v) => updateField('swimZone', parseInt(v) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.zonePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {SWIM_ZONES.map((z) => (
                  <SelectItem key={z.zone} value={z.zone.toString()}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${z.color}`} />
                      Z{z.zone} - {z.name[locale]} ({z.description})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stroke Efficiency */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-500" />
            {copy.swimEfficiency}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{copy.strokeRate}</Label>
              <Input
                type="number"
                value={formData.avgStrokeRate || ''}
                onChange={(e) => updateField('avgStrokeRate', parseInt(e.target.value) || null)}
                placeholder="28"
              />
              <p className="text-xs text-muted-foreground mt-1">{copy.strokesPerMinute}</p>
            </div>
            <div>
              <Label>{copy.strokesPerLength}</Label>
              <Input
                type="number"
                value={formData.avgStrokeCount || ''}
                onChange={(e) => updateField('avgStrokeCount', parseInt(e.target.value) || null)}
                placeholder="14"
              />
            </div>
            <div>
              <Label>SWOLF</Label>
              <Input
                type="number"
                value={formData.swolf || ''}
                onChange={(e) => updateField('swolf', parseInt(e.target.value) || null)}
                placeholder="35"
              />
              {formData.swolf && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getSwolfLabel(formData.swolf)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heart Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            {copy.heartRateData}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{copy.averageHeartRate}</Label>
              <Input
                type="number"
                value={formData.avgHR || ''}
                onChange={(e) => updateField('avgHR', parseInt(e.target.value) || null)}
                placeholder="145"
              />
            </div>
            <div>
              <Label>{copy.maxHeartRate}</Label>
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
            {copy.feelingEffort}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RPE Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>{copy.rpe}</Label>
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
              <span>{copy.easy}</span>
              <span>{copy.moderate}</span>
              <span>{copy.hard}</span>
              <span>Max</span>
            </div>
          </div>

          {/* Feeling */}
          <div>
            <Label className="mb-3 block">{copy.feelingPrompt}</Label>
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
                  {f.label[locale]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{copy.notes}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={4}
            placeholder={copy.notesPlaceholder}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {(formData.avgPace || formData.distance) && (
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {copy.summary}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              {formData.duration && (
                <div>
                  <p className="text-2xl font-bold">{formData.duration}</p>
                  <p className="text-xs text-muted-foreground">{copy.minutes}</p>
                </div>
              )}
              {formData.distance && (
                <div>
                  <p className="text-2xl font-bold">{formData.distance}m</p>
                  <p className="text-xs text-muted-foreground">{copy.distanceUnit}</p>
                </div>
              )}
              {formData.avgPace && (
                <div>
                  <p className="text-2xl font-bold">{formatPace(formData.avgPace)}</p>
                  <p className="text-xs text-muted-foreground">/100m</p>
                </div>
              )}
              {formData.swolf && (
                <div>
                  <p className="text-2xl font-bold">{formData.swolf}</p>
                  <p className="text-xs text-muted-foreground">SWOLF</p>
                </div>
              )}
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
          {copy.cancel}
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? copy.saving : existingLog ? copy.updateWorkout : copy.saveWorkout}
        </Button>
      </div>
    </div>
  )
}
