'use client'

/**
 * Swimming Performance Form
 * For logging CSS tests, race times, and swim PRs
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Waves } from 'lucide-react'

interface SwimmingPerformanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const EVENT_TYPES = [
  { value: 'CSS_TEST', label: 'CSS-test (400m + 200m)' },
  { value: '50M', label: '50m' },
  { value: '100M', label: '100m' },
  { value: '200M', label: '200m' },
  { value: '400M', label: '400m' },
  { value: '800M', label: '800m' },
  { value: '1500M', label: '1500m' },
  { value: 'OPEN_WATER', label: 'Öppet vatten' },
  { value: 'RACE', label: 'Tävling' },
]

const STROKE_TYPES = [
  { value: 'FREESTYLE', label: 'Frisim' },
  { value: 'BACKSTROKE', label: 'Ryggsim' },
  { value: 'BREASTSTROKE', label: 'Bröstsim' },
  { value: 'BUTTERFLY', label: 'Fjärilsim' },
  { value: 'IM', label: 'Medley' },
]

export function SwimmingPerformanceForm({
  clientId,
  onSuccess,
  onCancel,
}: SwimmingPerformanceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [eventType, setEventType] = useState('CSS_TEST')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [strokeType, setStrokeType] = useState('FREESTYLE')
  const [poolLength, setPoolLength] = useState<'25' | '50'>('25')
  const [customDistance, setCustomDistance] = useState<number | ''>('')

  // Time
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [hundredths, setHundredths] = useState('')

  // CSS Test specific (need both 400m and 200m times)
  const [time400min, setTime400min] = useState('')
  const [time400sec, setTime400sec] = useState('')
  const [time200min, setTime200min] = useState('')
  const [time200sec, setTime200sec] = useState('')

  // HR
  const [avgHR, setAvgHR] = useState<number | ''>('')
  const [maxHR, setMaxHR] = useState<number | ''>('')

  // Notes
  const [notes, setNotes] = useState('')

  // Calculate CSS from 400m and 200m times
  const calculateCSS = () => {
    const t400 = (parseInt(time400min) || 0) * 60 + (parseInt(time400sec) || 0)
    const t200 = (parseInt(time200min) || 0) * 60 + (parseInt(time200sec) || 0)

    if (t400 > 0 && t200 > 0) {
      // CSS = (400 - 200) / (T400 - T200) in m/s
      const css = 200 / (t400 - t200)
      // Pace per 100m
      const paceSeconds = 100 / css
      const paceMin = Math.floor(paceSeconds / 60)
      const paceSec = Math.round(paceSeconds % 60)
      return {
        css: css.toFixed(2),
        pace: `${paceMin}:${String(paceSec).padStart(2, '0')}/100m`,
        paceSeconds,
      }
    }
    return null
  }

  const cssResult = eventType === 'CSS_TEST' ? calculateCSS() : null

  const getTimeSeconds = (): number | null => {
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    const h = parseInt(hundredths) || 0
    if (m === 0 && s === 0) return null
    return m * 60 + s + h / 100
  }

  const formatTime = (): string | null => {
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    const h = parseInt(hundredths) || 0
    if (m === 0 && s === 0) return null
    return `${m}:${String(s).padStart(2, '0')}.${String(h).padStart(2, '0')}`
  }

  const getDistanceMeters = (): number => {
    switch (eventType) {
      case '50M': return 50
      case '100M': return 100
      case '200M': return 200
      case '400M': return 400
      case '800M': return 800
      case '1500M': return 1500
      case 'CSS_TEST': return 400 // Primary distance
      case 'OPEN_WATER':
      case 'RACE':
        return customDistance ? Number(customDistance) : 0
      default: return 0
    }
  }

  // Calculate pace per 100m
  const calculatePace = () => {
    const time = getTimeSeconds()
    const dist = getDistanceMeters()
    if (time && dist > 0) {
      const pacePer100 = (time / dist) * 100
      const paceMin = Math.floor(pacePer100 / 60)
      const paceSec = Math.round(pacePer100 % 60)
      return `${paceMin}:${String(paceSec).padStart(2, '0')}/100m`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!eventDate) {
      setError('Ange datum')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/sport-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          sport: 'SWIMMING',
          eventType,
          eventName: eventName || undefined,
          eventDate,
          timeSeconds: eventType === 'CSS_TEST'
            ? (parseInt(time400min) || 0) * 60 + (parseInt(time400sec) || 0)
            : getTimeSeconds(),
          timeFormatted: eventType === 'CSS_TEST'
            ? `400m: ${time400min}:${time400sec}, 200m: ${time200min}:${time200sec}`
            : formatTime(),
          distanceMeters: getDistanceMeters(),
          pacePerHundred: cssResult?.paceSeconds || undefined,
          css: cssResult ? parseFloat(cssResult.css) : undefined,
          strokeType,
          poolLength: parseInt(poolLength),
          avgHeartRate: avgHR || undefined,
          maxHeartRate: maxHR || undefined,
          athleteNotes: notes || undefined,
          isPR: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte spara')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 text-cyan-600 mb-4">
        <Waves className="h-5 w-5" />
        <span className="font-medium">Simning - Prestationslogg</span>
      </div>

      {/* Event Type & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Typ av test/distans *</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Datum *</Label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Stroke & Pool */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Simsätt</Label>
          <Select value={strokeType} onValueChange={setStrokeType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STROKE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bassänglängd</Label>
          <Select value={poolLength} onValueChange={(v) => setPoolLength(v as '25' | '50')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25m (kortbana)</SelectItem>
              <SelectItem value="50">50m (långbana)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom distance for open water/race */}
      {(eventType === 'OPEN_WATER' || eventType === 'RACE') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Distans (meter) *</Label>
            <Input
              type="number"
              placeholder="1500"
              value={customDistance}
              onChange={(e) => setCustomDistance(e.target.value ? parseInt(e.target.value) : '')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Namn</Label>
            <Input
              placeholder="Vansbrosimningen..."
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* CSS Test - Two times needed */}
      {eventType === 'CSS_TEST' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>400m tid *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Minuter</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="6"
                  value={time400min}
                  onChange={(e) => setTime400min(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sekunder</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  value={time400sec}
                  onChange={(e) => setTime400sec(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>200m tid *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Minuter</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="3"
                  value={time200min}
                  onChange={(e) => setTime200min(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sekunder</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="00"
                  value={time200sec}
                  onChange={(e) => setTime200sec(e.target.value)}
                />
              </div>
            </div>
          </div>

          {cssResult && (
            <div className="p-4 bg-cyan-50 rounded-lg">
              <p className="text-sm font-medium text-cyan-800">
                CSS: <strong>{cssResult.css} m/s</strong>
              </p>
              <p className="text-sm text-cyan-700">
                Tröskeltempo: <strong>{cssResult.pace}</strong>
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Regular time input */
        <div className="space-y-2">
          <Label>Tid *</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Minuter</Label>
              <Input
                type="number"
                min="0"
                placeholder="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sekunder</Label>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="30"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hundradelar</Label>
              <Input
                type="number"
                min="0"
                max="99"
                placeholder="00"
                value={hundredths}
                onChange={(e) => setHundredths(e.target.value)}
              />
            </div>
          </div>
          {calculatePace() && (
            <p className="text-sm text-muted-foreground mt-2">
              Tempo: <strong>{calculatePace()}</strong>
            </p>
          )}
        </div>
      )}

      {/* Heart Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Snitt puls</Label>
          <Input
            type="number"
            placeholder="155"
            value={avgHR}
            onChange={(e) => setAvgHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="space-y-2">
          <Label>Max puls</Label>
          <Input
            type="number"
            placeholder="175"
            value={maxHR}
            onChange={(e) => setMaxHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Anteckningar</Label>
        <Textarea
          placeholder="Känsla, teknik, utrustning..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sparar...
            </>
          ) : (
            'Spara resultat'
          )}
        </Button>
      </div>
    </form>
  )
}
