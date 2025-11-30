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
import {
  Waves,
  Clock,
  Ruler,
  Activity,
  TrendingUp,
  Save,
  Heart,
  Droplets,
  Timer,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

const FEELINGS = [
  { value: 'Great', label: 'Utmärkt', emoji: '😀' },
  { value: 'Good', label: 'Bra', emoji: '🙂' },
  { value: 'Okay', label: 'Okej', emoji: '😐' },
  { value: 'Tired', label: 'Trött', emoji: '😓' },
  { value: 'Struggled', label: 'Kämpigt', emoji: '😩' },
]

const SWIM_ZONES = [
  { zone: 1, name: 'Återhämtning', color: 'bg-blue-400', description: '74-83% CSS' },
  { zone: 2, name: 'Uthållighet', color: 'bg-green-400', description: '83-93% CSS' },
  { zone: 3, name: 'Tröskel (CSS)', color: 'bg-yellow-400', description: '93-102% CSS' },
  { zone: 4, name: 'VO2max', color: 'bg-orange-400', description: '102-111% CSS' },
  { zone: 5, name: 'Sprint', color: 'bg-red-400', description: '111%+ CSS' },
]

const STROKE_TYPES = [
  { value: 'freestyle', label: 'Frisim (Crawl)' },
  { value: 'backstroke', label: 'Ryggsim' },
  { value: 'breaststroke', label: 'Bröstsim' },
  { value: 'butterfly', label: 'Fjärilsim' },
  { value: 'im', label: 'Medley (IM)' },
  { value: 'mixed', label: 'Blandat' },
]

const POOL_LENGTHS = [
  { value: '25', label: '25m (kort bana)' },
  { value: '50', label: '50m (lång bana)' },
  { value: '0', label: 'Öppet vatten' },
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

export function SwimmingWorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  athleteCss,
}: SwimmingWorkoutLoggingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
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

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate SWOLF when relevant fields change
      if (field === 'avgStrokeCount' || field === 'avgPace' || field === 'poolLength') {
        updated.swolf = calculateSwolf(
          field === 'avgStrokeCount' ? value : updated.avgStrokeCount,
          field === 'avgPace' ? value : updated.avgPace,
          field === 'poolLength' ? value : updated.poolLength
        )
      }

      // Auto-calculate zone from pace
      if (field === 'avgPace') {
        updated.swimZone = calculateSwimZone(value)
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
        title: existingLog ? 'Pass uppdaterat!' : 'Pass loggat!',
        description: 'Din simträning har sparats.',
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
              <Waves className="h-4 w-4 mr-1" />
              Simning
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Duration & Distance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tid & Distans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tid (minuter)</Label>
              <Input
                type="number"
                value={formData.duration || ''}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || null)}
                placeholder="60"
              />
              {workout.duration && (
                <p className="text-xs text-muted-foreground mt-1">Planerad: {workout.duration} min</p>
              )}
            </div>
            <div>
              <Label>Distans (meter)</Label>
              <Input
                type="number"
                step="25"
                value={formData.distance || ''}
                onChange={(e) => updateField('distance', parseInt(e.target.value) || null)}
                placeholder="3000"
              />
              {workout.distance && (
                <p className="text-xs text-muted-foreground mt-1">Planerad: {workout.distance}m</p>
              )}
            </div>
          </div>

          {/* Pool & Stroke */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bassänglängd</Label>
              <Select
                value={formData.poolLength?.toString() || '25'}
                onValueChange={(v) => updateField('poolLength', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj längd" />
                </SelectTrigger>
                <SelectContent>
                  {POOL_LENGTHS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Simtag</Label>
              <Select
                value={formData.strokeType || 'freestyle'}
                onValueChange={(v) => updateField('strokeType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj simtag" />
                </SelectTrigger>
                <SelectContent>
                  {STROKE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
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
            Tempo
          </CardTitle>
          {athleteCss && (
            <CardDescription>Din CSS: {formatPace(athleteCss)}/100m</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Snitttempo (/100m)</Label>
              <Input
                type="text"
                value={avgPaceInput}
                onChange={(e) => handlePaceChange('avg', e.target.value)}
                placeholder="1:45"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: M:SS</p>
            </div>
            <div>
              <Label>Bästa tempo (/100m)</Label>
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
            <Label>Primär träningszon</Label>
            <Select
              value={formData.swimZone?.toString() || ''}
              onValueChange={(v) => updateField('swimZone', parseInt(v) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj zon" />
              </SelectTrigger>
              <SelectContent>
                {SWIM_ZONES.map((z) => (
                  <SelectItem key={z.zone} value={z.zone.toString()}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${z.color}`} />
                      Z{z.zone} - {z.name} ({z.description})
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
            Simeffektivitet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Simtagsfrekvens (spm)</Label>
              <Input
                type="number"
                value={formData.avgStrokeRate || ''}
                onChange={(e) => updateField('avgStrokeRate', parseInt(e.target.value) || null)}
                placeholder="28"
              />
              <p className="text-xs text-muted-foreground mt-1">Simtag per minut</p>
            </div>
            <div>
              <Label>Simtag per längd</Label>
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
                  {formData.swolf < 30 ? 'Utmärkt' : formData.swolf < 40 ? 'Bra' : formData.swolf < 50 ? 'Genomsnitt' : 'Kan förbättras'}
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
            Pulsdata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {/* RPE Slider */}
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

          {/* Feeling */}
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
            placeholder="Hur gick passet? Hur var vattentemperaturen? Något speciellt att notera?"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {(formData.avgPace || formData.distance) && (
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sammanfattning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              {formData.duration && (
                <div>
                  <p className="text-2xl font-bold">{formData.duration}</p>
                  <p className="text-xs text-muted-foreground">minuter</p>
                </div>
              )}
              {formData.distance && (
                <div>
                  <p className="text-2xl font-bold">{formData.distance}m</p>
                  <p className="text-xs text-muted-foreground">distans</p>
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
