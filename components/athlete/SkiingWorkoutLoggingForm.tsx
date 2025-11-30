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
  Snowflake,
  Clock,
  Gauge,
  Mountain,
  Activity,
  TrendingUp,
  Save,
  Heart,
  Target,
  Timer,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SkiingWorkoutLoggingFormProps {
  workout: {
    id: string
    name: string
    description: string | null
    type: string
    duration: number | null
    distance: number | null
    targetPace?: number | null
    paceZone?: number | null
  }
  athleteId: string
  existingLog?: {
    id: string
    duration: number | null
    distance: number | null
    avgPace: number | null
    maxPace: number | null
    avgHR: number | null
    maxHR: number | null
    elevation: number | null
    technique: string | null
    surface: string | null
    paceZone: number | null
    perceivedEffort: number | null
    feeling: string | null
    notes: string | null
  }
  athleteThresholdPace?: number | null
}

const FEELINGS = [
  { value: 'Great', label: 'Utmärkt', emoji: '😀' },
  { value: 'Good', label: 'Bra', emoji: '🙂' },
  { value: 'Okay', label: 'Okej', emoji: '😐' },
  { value: 'Tired', label: 'Trött', emoji: '😓' },
  { value: 'Struggled', label: 'Kämpigt', emoji: '😩' },
]

const PACE_ZONES = [
  { zone: 1, name: 'Återhämtning', color: 'bg-gray-400' },
  { zone: 2, name: 'Grunduthållighet', color: 'bg-blue-400' },
  { zone: 3, name: 'Tempo', color: 'bg-green-400' },
  { zone: 4, name: 'Tröskel', color: 'bg-yellow-400' },
  { zone: 5, name: 'VO2max', color: 'bg-red-500' },
]

const TECHNIQUES = [
  { value: 'classic', label: 'Klassisk', icon: '⛷️' },
  { value: 'skating', label: 'Skate', icon: '🎿' },
  { value: 'mixed', label: 'Blandad', icon: '⛷️🎿' },
]

const SURFACES = [
  { value: 'snow', label: 'Snö', icon: '❄️' },
  { value: 'roller_ski', label: 'Rullskidor', icon: '🛼' },
  { value: 'ski_treadmill', label: 'Skidergometer', icon: '🏃' },
  { value: 'running', label: 'Löpning (alternativ)', icon: '🏃‍♂️' },
]

export function SkiingWorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  athleteThresholdPace,
}: SkiingWorkoutLoggingFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    duration: existingLog?.duration ?? workout.duration ?? 60,
    distance: existingLog?.distance ?? workout.distance ?? 0,
    avgPace: existingLog?.avgPace ?? null,
    maxPace: existingLog?.maxPace ?? null,
    avgHR: existingLog?.avgHR ?? null,
    maxHR: existingLog?.maxHR ?? null,
    elevation: existingLog?.elevation ?? null,
    technique: existingLog?.technique ?? 'classic',
    surface: existingLog?.surface ?? 'snow',
    paceZone: existingLog?.paceZone ?? workout.paceZone ?? null,
    perceivedEffort: existingLog?.perceivedEffort ?? 5,
    feeling: existingLog?.feeling ?? 'Good',
    notes: existingLog?.notes ?? '',
  })

  // Calculate training load based on duration and perceived effort
  const calculateTrainingLoad = (duration: number, rpe: number) => {
    if (!duration || !rpe) return null
    // Simple training load calculation (duration * RPE)
    return Math.round(duration * rpe / 10)
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
        maxPace: formData.maxPace || null,
        avgHR: formData.avgHR || null,
        maxHR: formData.maxHR || null,
        elevation: formData.elevation || null,
        technique: formData.technique || null,
        surface: formData.surface || null,
        paceZone: formData.paceZone || null,
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
        description: 'Din skidträning har sparats.',
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

  const formatPace = (paceMinPerKm: number): string => {
    const minutes = Math.floor(paceMinPerKm)
    const seconds = Math.round((paceMinPerKm - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const trainingLoad = calculateTrainingLoad(formData.duration || 0, formData.perceivedEffort || 5)

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
              <Snowflake className="h-4 w-4 mr-1" />
              Skidåkning
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Technique & Surface */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Teknik & Underlag
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Teknik</Label>
              <div className="flex flex-wrap gap-2">
                {TECHNIQUES.map((t) => (
                  <Button
                    key={t.value}
                    type="button"
                    variant={formData.technique === t.value ? 'default' : 'outline'}
                    onClick={() => updateField('technique', t.value)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Underlag</Label>
              <Select
                value={formData.surface}
                onValueChange={(v) => updateField('surface', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj underlag" />
                </SelectTrigger>
                <SelectContent>
                  {SURFACES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
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
                placeholder="90"
              />
              {workout.duration && (
                <p className="text-xs text-muted-foreground mt-1">Planerad: {workout.duration} min</p>
              )}
            </div>
            <div>
              <Label>Distans (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.distance || ''}
                onChange={(e) => updateField('distance', parseFloat(e.target.value) || null)}
                placeholder="25"
              />
              {workout.distance && (
                <p className="text-xs text-muted-foreground mt-1">Planerad: {workout.distance} km</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pace Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            Tempodata
          </CardTitle>
          {athleteThresholdPace && (
            <CardDescription>Ditt tröskeltempo: {formatPace(athleteThresholdPace)} min/km</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Snitttempo (min/km)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.avgPace || ''}
                onChange={(e) => updateField('avgPace', parseFloat(e.target.value) || null)}
                placeholder="4.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                T.ex. 4.5 = 4:30 min/km
              </p>
            </div>
            <div>
              <Label>Bästa tempo (min/km)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.maxPace || ''}
                onChange={(e) => updateField('maxPace', parseFloat(e.target.value) || null)}
                placeholder="3.8"
              />
            </div>
          </div>

          {/* Pace Zone */}
          <div>
            <Label>Primär träningszon</Label>
            <Select
              value={formData.paceZone?.toString() || ''}
              onValueChange={(v) => updateField('paceZone', parseInt(v) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj zon" />
              </SelectTrigger>
              <SelectContent>
                {PACE_ZONES.map((z) => (
                  <SelectItem key={z.zone} value={z.zone.toString()}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${z.color}`} />
                      Z{z.zone} - {z.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Heart Rate & Elevation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            Puls & Höjdmeter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label>Höjdmeter (m)</Label>
              <Input
                type="number"
                value={formData.elevation || ''}
                onChange={(e) => updateField('elevation', parseInt(e.target.value) || null)}
                placeholder="300"
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
            placeholder="Hur gick passet? Hur var snön/förhållandena? Teknikfokus? Något speciellt att notera?"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {(formData.duration || formData.distance) && (
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
                  <p className="text-2xl font-bold">{formData.distance}</p>
                  <p className="text-xs text-muted-foreground">km</p>
                </div>
              )}
              {formData.avgPace && (
                <div>
                  <p className="text-2xl font-bold">{formatPace(formData.avgPace)}</p>
                  <p className="text-xs text-muted-foreground">min/km</p>
                </div>
              )}
              {trainingLoad && (
                <div>
                  <p className="text-2xl font-bold">{trainingLoad}</p>
                  <p className="text-xs text-muted-foreground">träningsbelastning</p>
                </div>
              )}
            </div>
            {formData.technique && (
              <div className="mt-4 text-center">
                <Badge variant="outline" className="text-sm">
                  {TECHNIQUES.find(t => t.value === formData.technique)?.icon}{' '}
                  {TECHNIQUES.find(t => t.value === formData.technique)?.label} på{' '}
                  {SURFACES.find(s => s.value === formData.surface)?.label.toLowerCase()}
                </Badge>
              </div>
            )}
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
