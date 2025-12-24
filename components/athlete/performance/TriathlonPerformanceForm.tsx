'use client'

/**
 * Triathlon Performance Form
 * For logging triathlon races with per-discipline times
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trophy } from 'lucide-react'

interface TriathlonPerformanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const DISTANCES = [
  { value: 'SUPER_SPRINT', label: 'Super Sprint (400m/10km/2.5km)', swim: 400, bike: 10000, run: 2500 },
  { value: 'SPRINT', label: 'Sprint (750m/20km/5km)', swim: 750, bike: 20000, run: 5000 },
  { value: 'OLYMPIC', label: 'Olympisk (1.5km/40km/10km)', swim: 1500, bike: 40000, run: 10000 },
  { value: 'HALF', label: 'Halv-Ironman (1.9km/90km/21.1km)', swim: 1900, bike: 90000, run: 21100 },
  { value: 'FULL', label: 'Ironman (3.8km/180km/42.2km)', swim: 3800, bike: 180000, run: 42200 },
  { value: 'CUSTOM', label: 'Anpassad distans', swim: 0, bike: 0, run: 0 },
]

export function TriathlonPerformanceForm({
  clientId,
  onSuccess,
  onCancel,
}: TriathlonPerformanceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [distance, setDistance] = useState('OLYMPIC')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')

  // Swim time
  const [swimMin, setSwimMin] = useState('')
  const [swimSec, setSwimSec] = useState('')

  // T1
  const [t1Min, setT1Min] = useState('')
  const [t1Sec, setT1Sec] = useState('')

  // Bike time
  const [bikeHour, setBikeHour] = useState('')
  const [bikeMin, setBikeMin] = useState('')
  const [bikeSec, setBikeSec] = useState('')

  // T2
  const [t2Min, setT2Min] = useState('')
  const [t2Sec, setT2Sec] = useState('')

  // Run time
  const [runHour, setRunHour] = useState('')
  const [runMin, setRunMin] = useState('')
  const [runSec, setRunSec] = useState('')

  // HR
  const [avgHR, setAvgHR] = useState<number | ''>('')
  const [maxHR, setMaxHR] = useState<number | ''>('')

  // Notes
  const [notes, setNotes] = useState('')

  // Calculate times in seconds
  const getSwimSeconds = () => (parseInt(swimMin) || 0) * 60 + (parseInt(swimSec) || 0)
  const getT1Seconds = () => (parseInt(t1Min) || 0) * 60 + (parseInt(t1Sec) || 0)
  const getBikeSeconds = () => (parseInt(bikeHour) || 0) * 3600 + (parseInt(bikeMin) || 0) * 60 + (parseInt(bikeSec) || 0)
  const getT2Seconds = () => (parseInt(t2Min) || 0) * 60 + (parseInt(t2Sec) || 0)
  const getRunSeconds = () => (parseInt(runHour) || 0) * 3600 + (parseInt(runMin) || 0) * 60 + (parseInt(runSec) || 0)

  const getTotalSeconds = () => getSwimSeconds() + getT1Seconds() + getBikeSeconds() + getT2Seconds() + getRunSeconds()

  const formatTotalTime = () => {
    const total = getTotalSeconds()
    if (total === 0) return null
    const hours = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    const secs = total % 60
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Calculate paces
  const selectedDistance = DISTANCES.find(d => d.value === distance)

  const getSwimPace = () => {
    const seconds = getSwimSeconds()
    const dist = selectedDistance?.swim || 0
    if (seconds > 0 && dist > 0) {
      const pacePer100 = (seconds / dist) * 100
      const min = Math.floor(pacePer100 / 60)
      const sec = Math.round(pacePer100 % 60)
      return `${min}:${String(sec).padStart(2, '0')}/100m`
    }
    return null
  }

  const getBikeSpeed = () => {
    const seconds = getBikeSeconds()
    const dist = selectedDistance?.bike || 0
    if (seconds > 0 && dist > 0) {
      const kmh = (dist / 1000) / (seconds / 3600)
      return `${kmh.toFixed(1)} km/h`
    }
    return null
  }

  const getRunPace = () => {
    const seconds = getRunSeconds()
    const dist = selectedDistance?.run || 0
    if (seconds > 0 && dist > 0) {
      const pacePerKm = seconds / (dist / 1000)
      const min = Math.floor(pacePerKm / 60)
      const sec = Math.round(pacePerKm % 60)
      return `${min}:${String(sec).padStart(2, '0')}/km`
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
          sport: 'TRIATHLON',
          eventType: 'RACE',
          eventName: eventName || undefined,
          eventDate,
          timeSeconds: getTotalSeconds() || undefined,
          timeFormatted: formatTotalTime(),
          swimTime: getSwimSeconds() || undefined,
          bikeTime: getBikeSeconds() || undefined,
          runTime: getRunSeconds() || undefined,
          t1Time: getT1Seconds() || undefined,
          t2Time: getT2Seconds() || undefined,
          triathlonDistance: distance,
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
      <div className="flex items-center gap-2 text-orange-600 mb-4">
        <Trophy className="h-5 w-5" />
        <span className="font-medium">Triathlon - Prestationslogg</span>
      </div>

      {/* Distance & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Distans *</Label>
          <Select value={distance} onValueChange={setDistance}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISTANCES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
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

      {/* Event Name */}
      <div className="space-y-2">
        <Label>Tävlingsnamn</Label>
        <Input
          placeholder="Ironman Kalmar, Vansbro Triathlon..."
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      {/* Swim */}
      <div className="p-4 bg-cyan-50 rounded-lg space-y-3">
        <Label className="text-cyan-800 font-medium">🏊 Simning</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Minuter</Label>
            <Input
              type="number"
              min="0"
              placeholder="25"
              value={swimMin}
              onChange={(e) => setSwimMin(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sekunder</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
              value={swimSec}
              onChange={(e) => setSwimSec(e.target.value)}
            />
          </div>
        </div>
        {getSwimPace() && (
          <p className="text-xs text-cyan-700">Tempo: <strong>{getSwimPace()}</strong></p>
        )}
      </div>

      {/* T1 */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">T1 (Växling sim→cykel)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="number"
              min="0"
              placeholder="2"
              value={t1Min}
              onChange={(e) => setT1Min(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sek</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
              value={t1Sec}
              onChange={(e) => setT1Sec(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bike */}
      <div className="p-4 bg-blue-50 rounded-lg space-y-3">
        <Label className="text-blue-800 font-medium">🚴 Cykling</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Timmar</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
              value={bikeHour}
              onChange={(e) => setBikeHour(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Minuter</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="15"
              value={bikeMin}
              onChange={(e) => setBikeMin(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sekunder</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="00"
              value={bikeSec}
              onChange={(e) => setBikeSec(e.target.value)}
            />
          </div>
        </div>
        {getBikeSpeed() && (
          <p className="text-xs text-blue-700">Snitt: <strong>{getBikeSpeed()}</strong></p>
        )}
      </div>

      {/* T2 */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">T2 (Växling cykel→löpning)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
              value={t2Min}
              onChange={(e) => setT2Min(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sek</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
              value={t2Sec}
              onChange={(e) => setT2Sec(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Run */}
      <div className="p-4 bg-green-50 rounded-lg space-y-3">
        <Label className="text-green-800 font-medium">🏃 Löpning</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Timmar</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={runHour}
              onChange={(e) => setRunHour(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Minuter</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="45"
              value={runMin}
              onChange={(e) => setRunMin(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sekunder</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="00"
              value={runSec}
              onChange={(e) => setRunSec(e.target.value)}
            />
          </div>
        </div>
        {getRunPace() && (
          <p className="text-xs text-green-700">Tempo: <strong>{getRunPace()}</strong></p>
        )}
      </div>

      {/* Total Time */}
      {formatTotalTime() && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <p className="text-sm text-orange-700">Total tid</p>
          <p className="text-2xl font-bold text-orange-800">{formatTotalTime()}</p>
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
          placeholder="Känsla, väder, utrustning, nutrition..."
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
