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
import { useLocale } from '@/i18n/client'

interface SkiingPerformanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const EVENT_TYPES = [
  { value: 'RACE', label: { sv: 'Tävling', en: 'Race' } },
  { value: 'VASALOPPET', label: { sv: 'Vasaloppet (90km)', en: 'Vasaloppet (90km)' } },
  { value: 'HALF_VASA', label: { sv: 'Halvvasan (45km)', en: 'Halvvasan (45km)' } },
  { value: 'TJEJVASAN', label: { sv: 'Tjejvasan (30km)', en: 'Tjejvasan (30km)' } },
  { value: 'OPEN_TRACK', label: { sv: 'Öppet spår', en: 'Open track' } },
  { value: 'TIME_TRIAL', label: { sv: 'Tempo/Test', en: 'Time trial/test' } },
  { value: 'INTERVAL_TEST', label: { sv: 'Intervalltest', en: 'Interval test' } },
  { value: 'TRAINING', label: { sv: 'Träningspass', en: 'Training session' } },
]

const TECHNIQUES = [
  { value: 'CLASSIC', label: { sv: 'Klassisk', en: 'Classic' } },
  { value: 'SKATE', label: { sv: 'Fristil (skating)', en: 'Skate' } },
  { value: 'BOTH', label: { sv: 'Dubbeljakt', en: 'Skiathlon' } },
]

const TERRAIN_TYPES = [
  { value: 'FLAT', label: { sv: 'Platt', en: 'Flat' } },
  { value: 'ROLLING', label: { sv: 'Lätt kuperat', en: 'Rolling' } },
  { value: 'HILLY', label: { sv: 'Kuperat', en: 'Hilly' } },
  { value: 'MOUNTAINOUS', label: { sv: 'Fjäll', en: 'Mountainous' } },
]

const SNOW_CONDITIONS = [
  { value: 'HARD', label: { sv: 'Hårt/Isigt', en: 'Hard/icy' } },
  { value: 'FAST', label: { sv: 'Snabbt/Kallt', en: 'Fast/cold' } },
  { value: 'MEDIUM', label: { sv: 'Normalt', en: 'Normal' } },
  { value: 'SOFT', label: { sv: 'Mjukt/Varmt', en: 'Soft/warm' } },
  { value: 'WET', label: { sv: 'Blött/Klister', en: 'Wet/klister' } },
  { value: 'FRESH', label: { sv: 'Nysnö', en: 'Fresh snow' } },
]

export function SkiingPerformanceForm({
  clientId,
  onSuccess,
  onCancel,
}: SkiingPerformanceFormProps) {
  const locale = getAppLocale(useLocale())
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
      setError(text(locale, 'Ange datum', 'Enter a date'))
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
        throw new Error(data.error || text(locale, 'Kunde inte spara', 'Could not save'))
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : text(locale, 'Ett fel uppstod', 'An error occurred'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 text-sky-600 mb-4">
        <Mountain className="h-5 w-5" />
        <span className="font-medium">{text(locale, 'Längdskidåkning - Prestationslogg', 'Cross-country skiing - Performance log')}</span>
      </div>

      {/* Event Type & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{text(locale, 'Typ av lopp *', 'Event type *')}</Label>
          <Select value={eventType} onValueChange={handleEventTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Datum *', 'Date *')}</Label>
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
          <Label>{text(locale, 'Loppnamn', 'Event name')}</Label>
          <Input
            placeholder="Vasaloppet, Marcialonga..."
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Distans (km) *', 'Distance (km) *')}</Label>
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
          <Label>{text(locale, 'Teknik', 'Technique')}</Label>
          <Select value={technique} onValueChange={setTechnique}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TECHNIQUES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Terräng', 'Terrain')}</Label>
          <Select value={terrain} onValueChange={setTerrain}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERRAIN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time */}
      <div className="p-4 bg-sky-50 rounded-lg space-y-3">
        <Label className="text-sky-800 font-medium">{text(locale, '⏱️ Tid', '⏱️ Time')}</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Timmar', 'Hours')}</Label>
            <Input
              type="number"
              min="0"
              placeholder="4"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Minuter', 'Minutes')}</Label>
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
            <Label className="text-xs text-muted-foreground">{text(locale, 'Sekunder', 'Seconds')}</Label>
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
            {calculatePace() && <span>{text(locale, 'Tempo', 'Pace')}: <strong>{calculatePace()}</strong></span>}
            {calculateSpeed() && <span>{text(locale, 'Fart', 'Speed')}: <strong>{calculateSpeed()}</strong></span>}
          </div>
        )}
      </div>

      {/* Snow & Weather */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{text(locale, 'Snöförhållanden', 'Snow conditions')}</Label>
          <Select value={snowConditions} onValueChange={setSnowConditions}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SNOW_CONDITIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Temperatur (°C)', 'Temperature (°C)')}</Label>
          <Input
            type="number"
            placeholder="-5"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value ? parseFloat(e.target.value) : '')}
          />
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Höjd (m.ö.h.)', 'Altitude (m.a.s.l.)')}</Label>
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
          <Label>{text(locale, 'Snitt puls', 'Average heart rate')}</Label>
          <Input
            type="number"
            placeholder="155"
            value={avgHR}
            onChange={(e) => setAvgHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="space-y-2">
          <Label>{text(locale, 'Max puls', 'Max heart rate')}</Label>
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
        <Label>{text(locale, 'Anteckningar', 'Notes')}</Label>
        <Textarea
          placeholder={text(locale, 'Känsla, valla, utrustning, taktik...', 'Feeling, wax, equipment, tactics...')}
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
            {text(locale, 'Avbryt', 'Cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {text(locale, 'Sparar...', 'Saving...')}
            </>
          ) : (
            text(locale, 'Spara resultat', 'Save result')
          )}
        </Button>
      </div>
    </form>
  )
}
