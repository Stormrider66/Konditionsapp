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
  Zap,
  Clock,
  Gauge,
  Mountain,
  Activity,
  TrendingUp,
  Save,
  Heart,
  Target,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface CyclingWorkoutLoggingFormProps {
  workout: {
    id: string
    name: string
    description: string | null
    type: string
    duration: number | null
    distance: number | null
    targetPower?: number | null
    powerZone?: number | null
  }
  athleteId: string
  existingLog?: {
    id: string
    duration: number | null
    distance: number | null
    avgPower: number | null
    normalizedPower: number | null
    maxPower: number | null
    avgCadence: number | null
    avgHR: number | null
    maxHR: number | null
    elevation: number | null
    tss: number | null
    intensityFactor: number | null
    powerZone: number | null
    perceivedEffort: number | null
    feeling: string | null
    notes: string | null
  }
  athleteFtp?: number | null
}

const FEELINGS = [
  { value: 'Great', label: 'Utmärkt', emoji: '😀' },
  { value: 'Good', label: 'Bra', emoji: '🙂' },
  { value: 'Okay', label: 'Okej', emoji: '😐' },
  { value: 'Tired', label: 'Trött', emoji: '😓' },
  { value: 'Struggled', label: 'Kämpigt', emoji: '😩' },
]

const POWER_ZONES = [
  { zone: 1, name: 'Active Recovery', color: 'bg-gray-400' },
  { zone: 2, name: 'Endurance', color: 'bg-blue-400' },
  { zone: 3, name: 'Tempo', color: 'bg-green-400' },
  { zone: 4, name: 'Threshold', color: 'bg-yellow-400' },
  { zone: 5, name: 'VO2max', color: 'bg-orange-400' },
  { zone: 6, name: 'Anaerobic', color: 'bg-red-400' },
  { zone: 7, name: 'Neuromuscular', color: 'bg-purple-500' },
]

export function CyclingWorkoutLoggingForm({
  workout,
  athleteId,
  existingLog,
  athleteFtp,
}: CyclingWorkoutLoggingFormProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    duration: existingLog?.duration ?? workout.duration ?? 60,
    distance: existingLog?.distance ?? workout.distance ?? 0,
    avgPower: existingLog?.avgPower ?? null,
    normalizedPower: existingLog?.normalizedPower ?? null,
    maxPower: existingLog?.maxPower ?? null,
    avgCadence: existingLog?.avgCadence ?? null,
    avgHR: existingLog?.avgHR ?? null,
    maxHR: existingLog?.maxHR ?? null,
    elevation: existingLog?.elevation ?? null,
    tss: existingLog?.tss ?? null,
    intensityFactor: existingLog?.intensityFactor ?? null,
    powerZone: existingLog?.powerZone ?? workout.powerZone ?? null,
    perceivedEffort: existingLog?.perceivedEffort ?? 5,
    feeling: existingLog?.feeling ?? 'Good',
    notes: existingLog?.notes ?? '',
  })

  // Calculate TSS and IF automatically if we have power and FTP
  const calculateMetrics = (avgPower: number | null, np: number | null, duration: number) => {
    if (!athleteFtp || !duration) return { tss: null, intensityFactor: null }

    const power = np ?? avgPower
    if (!power) return { tss: null, intensityFactor: null }

    const intensityFactor = power / athleteFtp
    const tss = ((duration * 60 * power * intensityFactor) / (athleteFtp * 3600)) * 100

    return {
      tss: Math.round(tss * 10) / 10,
      intensityFactor: Math.round(intensityFactor * 100) / 100
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate TSS/IF when power changes
      if (field === 'avgPower' || field === 'normalizedPower' || field === 'duration') {
        const metrics = calculateMetrics(
          field === 'avgPower' ? value : updated.avgPower,
          field === 'normalizedPower' ? value : updated.normalizedPower,
          field === 'duration' ? value : updated.duration
        )
        updated.tss = metrics.tss
        updated.intensityFactor = metrics.intensityFactor
      }

      return updated
    })
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
        avgPower: formData.avgPower || null,
        normalizedPower: formData.normalizedPower || null,
        maxPower: formData.maxPower || null,
        avgCadence: formData.avgCadence || null,
        avgHR: formData.avgHR || null,
        maxHR: formData.maxHR || null,
        elevation: formData.elevation || null,
        tss: formData.tss || null,
        intensityFactor: formData.intensityFactor || null,
        powerZone: formData.powerZone || null,
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
        description: 'Din cykelträning har sparats.',
      })

      router.push(`${basePath}/athlete/programs/${workout.id}`)
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
              <Zap className="h-4 w-4 mr-1" />
              Cykling
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
              <Label>Distans (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.distance || ''}
                onChange={(e) => updateField('distance', parseFloat(e.target.value) || null)}
                placeholder="40"
              />
              {workout.distance && (
                <p className="text-xs text-muted-foreground mt-1">Planerad: {workout.distance} km</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Power Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Effektdata
          </CardTitle>
          {athleteFtp && (
            <CardDescription>Din FTP: {athleteFtp}W</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Snitt watt</Label>
              <Input
                type="number"
                value={formData.avgPower || ''}
                onChange={(e) => updateField('avgPower', parseInt(e.target.value) || null)}
                placeholder="180"
              />
            </div>
            <div>
              <Label>NP (Normalized Power)</Label>
              <Input
                type="number"
                value={formData.normalizedPower || ''}
                onChange={(e) => updateField('normalizedPower', parseInt(e.target.value) || null)}
                placeholder="200"
              />
            </div>
            <div>
              <Label>Max watt</Label>
              <Input
                type="number"
                value={formData.maxPower || ''}
                onChange={(e) => updateField('maxPower', parseInt(e.target.value) || null)}
                placeholder="450"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-1.5">Kadens (snitt RPM) <InfoTooltip conceptKey="cadence" /></Label>
              <Input
                type="number"
                value={formData.avgCadence || ''}
                onChange={(e) => updateField('avgCadence', parseInt(e.target.value) || null)}
                placeholder="85"
              />
            </div>
            <div>
              <Label>TSS</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.tss || ''}
                onChange={(e) => updateField('tss', parseFloat(e.target.value) || null)}
                placeholder="75"
              />
              {formData.tss && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.tss < 50 ? 'Lätt pass' : formData.tss < 100 ? 'Måttligt' : formData.tss < 150 ? 'Tungt' : 'Mycket tungt'}
                </p>
              )}
            </div>
            <div>
              <Label>IF (Intensity Factor)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.intensityFactor || ''}
                onChange={(e) => updateField('intensityFactor', parseFloat(e.target.value) || null)}
                placeholder="0.75"
              />
            </div>
          </div>

          {/* Power Zone */}
          <div>
            <Label>Primär träningszon</Label>
            <Select
              value={formData.powerZone?.toString() || ''}
              onValueChange={(v) => updateField('powerZone', parseInt(v) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj zon" />
              </SelectTrigger>
              <SelectContent>
                {POWER_ZONES.map((z) => (
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
                placeholder="500"
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
            placeholder="Hur gick passet? Hur var vädret? Något speciellt att notera?"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {(formData.avgPower || formData.tss) && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200">
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
              {formData.avgPower && (
                <div>
                  <p className="text-2xl font-bold">{formData.avgPower}W</p>
                  <p className="text-xs text-muted-foreground">snitt</p>
                </div>
              )}
              {formData.tss && (
                <div>
                  <p className="text-2xl font-bold">{formData.tss}</p>
                  <p className="text-xs text-muted-foreground">TSS</p>
                </div>
              )}
              {formData.intensityFactor && (
                <div>
                  <p className="text-2xl font-bold">{formData.intensityFactor}</p>
                  <p className="text-xs text-muted-foreground">IF</p>
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
