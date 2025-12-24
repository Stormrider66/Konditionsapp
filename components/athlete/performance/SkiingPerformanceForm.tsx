'use client'

/**
 * Skiing Performance Form
 * For logging cross-country skiing race times and PRs
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mountain } from 'lucide-react'

interface SkiingPerformanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const EVENT_TYPES = [
  { value: 'RACE', label: 'Tävling' },
  { value: 'VASALOPPET', label: 'Vasaloppet (90km)' },
  { value: 'HALF_VASA', label: 'Halvvasan (45km)' },
  { value: 'TJEJVASAN', label: 'Tjejvasan (30km)' },
  { value: 'OPEN_TRACK', label: 'Öppet spår' },
  { value: 'TIME_TRIAL', label: 'Tempo/Test' },
  { value: 'INTERVAL_TEST', label: 'Intervalltest' },
  { value: 'TRAINING', label: 'Träningspass' },
]

const TECHNIQUES = [
  { value: 'CLASSIC', label: 'Klassisk' },
  { value: 'SKATE', label: 'Fristil (skating)' },
  { value: 'BOTH', label: 'Dubbeljakt' },
]

const TERRAIN_TYPES = [
  { value: 'FLAT', label: 'Platt' },
  { value: 'ROLLING', label: 'Lätt kuperat' },
  { value: 'HILLY', label: 'Kuperat' },
  { value: 'MOUNTAINOUS', label: 'Fjäll' },
]

const SNOW_CONDITIONS = [
  { value: 'HARD', label: 'Hårt/Isigt' },
  { value: 'FAST', label: 'Snabbt/Kallt' },
  { value: 'MEDIUM', label: 'Normalt' },
  { value: 'SOFT', label: 'Mjukt/Varmt' },
  { value: 'WET', label: 'Blött/Klister' },
  { value: 'FRESH', label: 'Nysnö' },
]

export function SkiingPerformanceForm({
  clientId,
  onSuccess,
  onCancel,
}: SkiingPerformanceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [eventType, setEventType] = useState('RACE')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [technique, setTechnique] = useState('CLASSIC')
  const [terrain, setTerrain] = useState('ROLLING')
  const [snowConditions, setSnowConditions] = useState('MEDIUM')
  const [distanceKm, setDistanceKm] = useState<number | ''>('')

  // Time
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')

  // Environmental
  const [temperature, setTemperature] = useState<number | ''>('')
  const [altitude, setAltitude] = useState<number | ''>('')

  // HR
  const [avgHR, setAvgHR] = useState<number | ''>('')
  const [maxHR, setMaxHR] = useState<number | ''>('')

  // Notes
  const [notes, setNotes] = useState('')

  // Auto-fill distance for known events
  const handleEventTypeChange = (value: string) => {
    setEventType(value)
    switch (value) {
      case 'VASALOPPET':
        setDistanceKm(90)
        setTechnique('CLASSIC')
        break
      case 'HALF_VASA':
        setDistanceKm(45)
        setTechnique('CLASSIC')
        break
      case 'TJEJVASAN':
        setDistanceKm(30)
        setTechnique('CLASSIC')
        break
      default:
        break
    }
  }

  const getTimeSeconds = (): number | null => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    if (h === 0 && m === 0 && s === 0) return null
    return h * 3600 + m * 60 + s
  }

  const formatTime = (): string | null => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    if (h === 0 && m === 0 && s === 0) return null
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`
  }

  // Calculate pace (min/km)
  const calculatePace = () => {
    const time = getTimeSeconds()
    if (time && distanceKm) {
      const paceSeconds = time / Number(distanceKm)
      const paceMin = Math.floor(paceSeconds / 60)
      const paceSec = Math.round(paceSeconds % 60)
      return `${paceMin}:${String(paceSec).padStart(2, '0')}/km`
    }
    return null
  }

  // Calculate speed (km/h)
  const calculateSpeed = () => {
    const time = getTimeSeconds()
    if (time && distanceKm) {
      const speedKmh = (Number(distanceKm) / time) * 3600
      return `${speedKmh.toFixed(1)} km/h`
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
          sport: 'SKIING',
          eventType,
          eventName: eventName || undefined,
          eventDate,
          timeSeconds: getTimeSeconds(),
          timeFormatted: formatTime(),
          distanceMeters: distanceKm ? Number(distanceKm) * 1000 : undefined,
          skiingTechnique: technique,
          skiingTerrain: terrain,
          snowConditions,
          temperature: temperature || undefined,
          altitude: altitude || undefined,
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
      <div className="flex items-center gap-2 text-sky-600 mb-4">
        <Mountain className="h-5 w-5" />
        <span className="font-medium">Längdskidåkning - Prestationslogg</span>
      </div>

      {/* Event Type & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Typ av lopp *</Label>
          <Select value={eventType} onValueChange={handleEventTypeChange}>
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

      {/* Event Name & Distance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Loppnamn</Label>
          <Input
            placeholder="Vasaloppet, Marcialonga..."
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Distans (km) *</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="30"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value ? parseFloat(e.target.value) : '')}
            required
          />
        </div>
      </div>

      {/* Technique & Terrain */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Teknik</Label>
          <Select value={technique} onValueChange={setTechnique}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TECHNIQUES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Terräng</Label>
          <Select value={terrain} onValueChange={setTerrain}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERRAIN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time */}
      <div className="p-4 bg-sky-50 rounded-lg space-y-3">
        <Label className="text-sky-800 font-medium">⏱️ Tid</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Timmar</Label>
            <Input
              type="number"
              min="0"
              placeholder="4"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Minuter</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
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
              placeholder="00"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </div>
        </div>
        {(calculatePace() || calculateSpeed()) && (
          <div className="flex gap-4 text-sm text-sky-700">
            {calculatePace() && <span>Tempo: <strong>{calculatePace()}</strong></span>}
            {calculateSpeed() && <span>Fart: <strong>{calculateSpeed()}</strong></span>}
          </div>
        )}
      </div>

      {/* Snow & Weather */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Snöförhållanden</Label>
          <Select value={snowConditions} onValueChange={setSnowConditions}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SNOW_CONDITIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Temperatur (°C)</Label>
          <Input
            type="number"
            placeholder="-5"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value ? parseFloat(e.target.value) : '')}
          />
        </div>

        <div className="space-y-2">
          <Label>Höjd (m.ö.h.)</Label>
          <Input
            type="number"
            placeholder="400"
            value={altitude}
            onChange={(e) => setAltitude(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
      </div>

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
            placeholder="180"
            value={maxHR}
            onChange={(e) => setMaxHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Anteckningar</Label>
        <Textarea
          placeholder="Känsla, valla, utrustning, taktik..."
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
