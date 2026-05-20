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
  Activity,
  TrendingUp,
  Save,
  Heart,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useLocale } from '@/i18n/client'

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

type AppLocale = 'en' | 'sv'
type CyclingFormData = {
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
  perceivedEffort: number
  feeling: string
  notes: string
}

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const FEELINGS = [
  { value: 'Great', label: { sv: 'Utmärkt', en: 'Excellent' }, emoji: '😀' },
  { value: 'Good', label: { sv: 'Bra', en: 'Good' }, emoji: '🙂' },
  { value: 'Okay', label: { sv: 'Okej', en: 'Okay' }, emoji: '😐' },
  { value: 'Tired', label: { sv: 'Trött', en: 'Tired' }, emoji: '😓' },
  { value: 'Struggled', label: { sv: 'Kämpigt', en: 'Struggled' }, emoji: '😩' },
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
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const basePath = useBasePath()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CyclingFormData>({
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

  const updateField = <K extends keyof CyclingFormData>(field: K, value: CyclingFormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate TSS/IF when power changes
      if (field === 'avgPower' || field === 'normalizedPower' || field === 'duration') {
        const numericValue = typeof value === 'number' ? value : null
        const metrics = calculateMetrics(
          field === 'avgPower' ? numericValue : updated.avgPower,
          field === 'normalizedPower' ? numericValue : updated.normalizedPower,
          field === 'duration' ? numericValue ?? 0 : updated.duration ?? 0
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
        title: existingLog ? text(locale, 'Pass uppdaterat!', 'Session updated!') : text(locale, 'Pass loggat!', 'Session logged!'),
        description: text(locale, 'Din cykelträning har sparats.', 'Your cycling workout has been saved.'),
      })

      router.push(`${basePath}/athlete/programs/${workout.id}`)
      router.refresh()
    } catch {
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte spara träningspasset. Försök igen.', 'Could not save the training session. Try again.'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRPELabel = (rpe: number) => {
    const labels = locale === 'sv'
      ? ['', 'Mycket lätt', 'Lätt', 'Måttlig', 'Något hård', 'Hård', 'Mycket hård', 'Mycket mycket hård', 'Nära max', 'Maximal', 'Max+']
      : ['', 'Very easy', 'Easy', 'Moderate', 'Somewhat hard', 'Hard', 'Very hard', 'Very very hard', 'Near max', 'Maximal', 'Max+']
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
              {text(locale, 'Cykling', 'Cycling')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Duration & Distance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {text(locale, 'Tid & Distans', 'Time & Distance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{text(locale, 'Tid (minuter)', 'Time (minutes)')}</Label>
              <Input
                type="number"
                value={formData.duration || ''}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || null)}
                placeholder="60"
              />
              {workout.duration && (
                <p className="text-xs text-muted-foreground mt-1">{text(locale, 'Planerad', 'Planned')}: {workout.duration} min</p>
              )}
            </div>
            <div>
              <Label>{text(locale, 'Distans (km)', 'Distance (km)')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.distance || ''}
                onChange={(e) => updateField('distance', parseFloat(e.target.value) || null)}
                placeholder="40"
              />
              {workout.distance && (
                <p className="text-xs text-muted-foreground mt-1">{text(locale, 'Planerad', 'Planned')}: {workout.distance} km</p>
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
            {text(locale, 'Effektdata', 'Power data')}
          </CardTitle>
          {athleteFtp && (
            <CardDescription>{text(locale, 'Din FTP', 'Your FTP')}: {athleteFtp}W</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{text(locale, 'Snitt watt', 'Average watts')}</Label>
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
              <Label>{text(locale, 'Max watt', 'Max watts')}</Label>
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
              <Label className="flex items-center gap-1.5">{text(locale, 'Kadens (snitt RPM)', 'Cadence (avg RPM)')} <InfoTooltip conceptKey="cadence" /></Label>
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
                  {formData.tss < 50
                    ? text(locale, 'Lätt pass', 'Easy session')
                    : formData.tss < 100
                      ? text(locale, 'Måttligt', 'Moderate')
                      : formData.tss < 150
                        ? text(locale, 'Tungt', 'Hard')
                        : text(locale, 'Mycket tungt', 'Very hard')}
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
            <Label>{text(locale, 'Primär träningszon', 'Primary training zone')}</Label>
            <Select
              value={formData.powerZone?.toString() || ''}
              onValueChange={(v) => updateField('powerZone', parseInt(v) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={text(locale, 'Välj zon', 'Select zone')} />
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
            {text(locale, 'Puls & Höjdmeter', 'Heart Rate & Elevation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{text(locale, 'Snittpuls (bpm)', 'Average HR (bpm)')}</Label>
              <Input
                type="number"
                value={formData.avgHR || ''}
                onChange={(e) => updateField('avgHR', parseInt(e.target.value) || null)}
                placeholder="145"
              />
            </div>
            <div>
              <Label>{text(locale, 'Maxpuls (bpm)', 'Max HR (bpm)')}</Label>
              <Input
                type="number"
                value={formData.maxHR || ''}
                onChange={(e) => updateField('maxHR', parseInt(e.target.value) || null)}
                placeholder="175"
              />
            </div>
            <div>
              <Label>{text(locale, 'Höjdmeter (m)', 'Elevation gain (m)')}</Label>
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
            {text(locale, 'Känsla & Ansträngning', 'Feeling & Effort')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RPE Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>{text(locale, 'RPE (upplevd ansträngning)', 'RPE (perceived effort)')}</Label>
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
              <span>{text(locale, 'Lätt', 'Easy')}</span>
              <span>{text(locale, 'Måttlig', 'Moderate')}</span>
              <span>{text(locale, 'Hård', 'Hard')}</span>
              <span>Max</span>
            </div>
          </div>

          {/* Feeling */}
          <div>
            <Label className="mb-3 block">{text(locale, 'Hur kändes passet?', 'How did the session feel?')}</Label>
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
          <CardTitle className="text-base">{text(locale, 'Anteckningar', 'Notes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={4}
            placeholder={text(locale, 'Hur gick passet? Hur var vädret? Något speciellt att notera?', 'How did the session go? How was the weather? Anything special to note?')}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {(formData.avgPower || formData.tss) && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {text(locale, 'Sammanfattning', 'Summary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              {formData.duration && (
                <div>
                  <p className="text-2xl font-bold">{formData.duration}</p>
                  <p className="text-xs text-muted-foreground">{text(locale, 'minuter', 'minutes')}</p>
                </div>
              )}
              {formData.avgPower && (
                <div>
                  <p className="text-2xl font-bold">{formData.avgPower}W</p>
                  <p className="text-xs text-muted-foreground">{text(locale, 'snitt', 'average')}</p>
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
          {text(locale, 'Avbryt', 'Cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? text(locale, 'Sparar...', 'Saving...') : existingLog ? text(locale, 'Uppdatera pass', 'Update session') : text(locale, 'Spara pass', 'Save session')}
        </Button>
      </div>
    </div>
  )
}
