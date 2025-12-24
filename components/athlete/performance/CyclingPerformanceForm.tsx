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

interface CyclingPerformanceFormProps {
  clientId: string
  athleteWeight?: number
  onSuccess?: () => void
  onCancel?: () => void
}

const EVENT_TYPES = [
  { value: 'FTP_TEST', label: 'FTP-test (20 min)' },
  { value: 'RAMP_TEST', label: 'Ramp-test' },
  { value: 'TIME_TRIAL', label: 'Tempo' },
  { value: 'RACE', label: 'Tävling' },
  { value: 'GRAN_FONDO', label: 'Gran Fondo / Motionslopp' },
]

export function CyclingPerformanceForm({
  clientId,
  athleteWeight,
  onSuccess,
  onCancel,
}: CyclingPerformanceFormProps) {
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
      <div className="flex items-center gap-2 text-blue-600 mb-4">
        <Bike className="h-5 w-5" />
        <span className="font-medium">Cykling - Prestationslogg</span>
      </div>

      {/* Event Type & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Typ av test/tävling *</Label>
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

      {/* Event Name & Distance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Namn (valfritt)</Label>
          <Input
            placeholder="Vätternrundan, Zwift Race..."
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Distans (km)</Label>
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
        <Label>Tid</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Timmar</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
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
              placeholder="20"
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
      </div>

      {/* Power */}
      <div className="space-y-2">
        <Label>Effekt (Watt)</Label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Snitt *</Label>
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
        <Label>Vikt (kg) - för W/kg beräkning</Label>
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
              <span className="text-muted-foreground">Beräknad FTP (95%):</span>{' '}
              <strong className="text-blue-700">{calculatedFTP} W</strong>
              {ftpWattsPerKg && (
                <span className="text-muted-foreground ml-2">({ftpWattsPerKg} W/kg)</span>
              )}
            </p>
          )}
          {wattsPerKg && (
            <p className="text-sm">
              <span className="text-muted-foreground">Snitt W/kg:</span>{' '}
              <strong>{wattsPerKg} W/kg</strong>
            </p>
          )}
        </div>
      )}

      {/* Heart Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Snitt puls (bpm)</Label>
          <Input
            type="number"
            placeholder="165"
            value={avgHR}
            onChange={(e) => setAvgHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="space-y-2">
          <Label>Max puls (bpm)</Label>
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
        <Label>Anteckningar</Label>
        <Textarea
          placeholder="Känsla, väder, utrustning..."
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
