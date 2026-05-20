'use client'

/**
 * Cycling Performance Form
 * For logging FTP tests, time trials, and power-based events
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Bike } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface CyclingPerformanceFormProps {
  clientId: string
  athleteWeight?: number
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
  { value: 'FTP_TEST', label: { sv: 'FTP-test (20 min)', en: 'FTP test (20 min)' } },
  { value: 'RAMP_TEST', label: { sv: 'Ramp-test', en: 'Ramp test' } },
  { value: 'TIME_TRIAL', label: { sv: 'Tempo', en: 'Time trial' } },
  { value: 'RACE', label: { sv: 'Tävling', en: 'Race' } },
  { value: 'GRAN_FONDO', label: { sv: 'Gran Fondo / Motionslopp', en: 'Gran Fondo / sportive' } },
]

export function CyclingPerformanceForm({
  clientId,
  athleteWeight,
  onSuccess,
  onCancel,
}: CyclingPerformanceFormProps) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [eventType, setEventType] = useState('FTP_TEST')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [distanceKm, setDistanceKm] = useState<number | ''>('')

  // Time
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')

  // Power
  const [avgPower, setAvgPower] = useState<number | ''>('')
  const [maxPower, setMaxPower] = useState<number | ''>('')
  const [normalizedPower, setNormalizedPower] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>(athleteWeight || '')

  // HR
  const [avgHR, setAvgHR] = useState<number | ''>('')
  const [maxHR, setMaxHR] = useState<number | ''>('')

  // Notes
  const [notes, setNotes] = useState('')

  // Calculate FTP from 20-min test (95% of avg power)
  const calculatedFTP = eventType === 'FTP_TEST' && avgPower
    ? Math.round(Number(avgPower) * 0.95)
    : null

  // Calculate W/kg
  const wattsPerKg = avgPower && weight
    ? (Number(avgPower) / Number(weight)).toFixed(2)
    : null

  const ftpWattsPerKg = calculatedFTP && weight
    ? (calculatedFTP / Number(weight)).toFixed(2)
    : null

  const formatTime = (): string | null => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    if (h === 0 && m === 0 && s === 0) return null
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`
  }

  const getTimeSeconds = (): number | null => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const s = parseInt(seconds) || 0
    if (h === 0 && m === 0 && s === 0) return null
    return h * 3600 + m * 60 + s
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
          sport: 'CYCLING',
          eventType,
          eventName: eventName || undefined,
          eventDate,
          timeSeconds: getTimeSeconds(),
          timeFormatted: formatTime(),
          distanceMeters: distanceKm ? Number(distanceKm) * 1000 : undefined,
          powerWatts: avgPower || undefined,
          powerMax: maxPower || undefined,
          ftp: calculatedFTP || undefined,
          wattsPerKg: wattsPerKg ? parseFloat(wattsPerKg) : undefined,
          normalizedPower: normalizedPower || undefined,
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
      <div className="flex items-center gap-2 text-blue-600 mb-4">
        <Bike className="h-5 w-5" />
        <span className="font-medium">{text(locale, 'Cykling - Prestationslogg', 'Cycling - Performance log')}</span>
      </div>

      {/* Event Type & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{text(locale, 'Typ av test/tävling *', 'Test/race type *')}</Label>
          <Select value={eventType} onValueChange={setEventType}>
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
          <Label>{text(locale, 'Namn (valfritt)', 'Name (optional)')}</Label>
          <Input
            placeholder={text(locale, 'Vätternrundan, Zwift Race...', 'Gran Fondo, Zwift Race...')}
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{text(locale, 'Distans (km)', 'Distance (km)')}</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="40"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value ? parseFloat(e.target.value) : '')}
          />
        </div>
      </div>

      {/* Time */}
      <div className="space-y-2">
        <Label>{text(locale, 'Tid', 'Time')}</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Timmar', 'Hours')}</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
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
              placeholder="20"
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
      </div>

      {/* Power */}
      <div className="space-y-2">
        <Label>{text(locale, 'Effekt (Watt)', 'Power (watts)')}</Label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Snitt *', 'Average *')}</Label>
            <Input
              type="number"
              placeholder="280"
              value={avgPower}
              onChange={(e) => setAvgPower(e.target.value ? parseInt(e.target.value) : '')}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input
              type="number"
              placeholder="450"
              value={maxPower}
              onChange={(e) => setMaxPower(e.target.value ? parseInt(e.target.value) : '')}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">NP</Label>
            <Input
              type="number"
              placeholder="290"
              value={normalizedPower}
              onChange={(e) => setNormalizedPower(e.target.value ? parseInt(e.target.value) : '')}
            />
          </div>
        </div>
      </div>

      {/* Weight for W/kg */}
      <div className="space-y-2">
        <Label>{text(locale, 'Vikt (kg) - för W/kg beräkning', 'Weight (kg) - for W/kg calculation')}</Label>
        <Input
          type="number"
          step="0.1"
          placeholder="75"
          value={weight}
          onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : '')}
        />
      </div>

      {/* Calculated values */}
      {(calculatedFTP || wattsPerKg) && (
        <div className="p-4 bg-blue-50 rounded-lg space-y-2">
          {eventType === 'FTP_TEST' && calculatedFTP && (
            <p className="text-sm">
              <span className="text-muted-foreground">{text(locale, 'Beräknad FTP (95%):', 'Estimated FTP (95%):')}</span>{' '}
              <strong className="text-blue-700">{calculatedFTP} W</strong>
              {ftpWattsPerKg && (
                <span className="text-muted-foreground ml-2">({ftpWattsPerKg} W/kg)</span>
              )}
            </p>
          )}
          {wattsPerKg && (
            <p className="text-sm">
              <span className="text-muted-foreground">{text(locale, 'Snitt W/kg:', 'Average W/kg:')}</span>{' '}
              <strong>{wattsPerKg} W/kg</strong>
            </p>
          )}
        </div>
      )}

      {/* Heart Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{text(locale, 'Snitt puls (bpm)', 'Average heart rate (bpm)')}</Label>
          <Input
            type="number"
            placeholder="165"
            value={avgHR}
            onChange={(e) => setAvgHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="space-y-2">
          <Label>{text(locale, 'Max puls (bpm)', 'Max heart rate (bpm)')}</Label>
          <Input
            type="number"
            placeholder="185"
            value={maxHR}
            onChange={(e) => setMaxHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>{text(locale, 'Anteckningar', 'Notes')}</Label>
        <Textarea
          placeholder={text(locale, 'Känsla, väder, utrustning...', 'Feeling, weather, equipment...')}
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
