'use client'

/**
 * HYROX Performance Form
 * For logging HYROX race times with station splits
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Flame } from 'lucide-react'

interface HYROXPerformanceFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const DIVISIONS = [
  { value: 'OPEN_WOMEN', label: 'Open Women' },
  { value: 'OPEN_MEN', label: 'Open Men' },
  { value: 'PRO_WOMEN', label: 'Pro Women' },
  { value: 'PRO_MEN', label: 'Pro Men' },
  { value: 'DOUBLES_WOMEN', label: 'Doubles Women' },
  { value: 'DOUBLES_MEN', label: 'Doubles Men' },
  { value: 'DOUBLES_MIXED', label: 'Doubles Mixed' },
  { value: 'RELAY', label: 'Relay' },
]

const STATIONS = [
  { id: 'skiErg', label: '1. SkiErg (1000m)', icon: '⛷️' },
  { id: 'sledPush', label: '2. Sled Push (50m)', icon: '🛷' },
  { id: 'sledPull', label: '3. Sled Pull (50m)', icon: '🪢' },
  { id: 'burpeeBroadJump', label: '4. Burpee Broad Jump (80m)', icon: '🦘' },
  { id: 'rowing', label: '5. Rowing (1000m)', icon: '🚣' },
  { id: 'farmersCarry', label: '6. Farmers Carry (200m)', icon: '🏋️' },
  { id: 'sandbagLunges', label: '7. Sandbag Lunges (100m)', icon: '🎒' },
  { id: 'wallBalls', label: '8. Wall Balls (100 reps)', icon: '🏐' },
]

export function HYROXPerformanceForm({
  clientId,
  onSuccess,
  onCancel,
}: HYROXPerformanceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [division, setDivision] = useState('OPEN_MEN')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')

  // Total time
  const [totalHours, setTotalHours] = useState('')
  const [totalMin, setTotalMin] = useState('')
  const [totalSec, setTotalSec] = useState('')

  // Station times (in seconds)
  const [stationTimes, setStationTimes] = useState<Record<string, { min: string; sec: string }>>({
    skiErg: { min: '', sec: '' },
    sledPush: { min: '', sec: '' },
    sledPull: { min: '', sec: '' },
    burpeeBroadJump: { min: '', sec: '' },
    rowing: { min: '', sec: '' },
    farmersCarry: { min: '', sec: '' },
    sandbagLunges: { min: '', sec: '' },
    wallBalls: { min: '', sec: '' },
  })

  // Run splits (8 x 1km)
  const [runSplits, setRunSplits] = useState<Array<{ min: string; sec: string }>>(
    Array(8).fill({ min: '', sec: '' })
  )

  // HR
  const [avgHR, setAvgHR] = useState<number | ''>('')
  const [maxHR, setMaxHR] = useState<number | ''>('')

  // Notes
  const [notes, setNotes] = useState('')

  const updateStationTime = (stationId: string, field: 'min' | 'sec', value: string) => {
    setStationTimes(prev => ({
      ...prev,
      [stationId]: { ...prev[stationId], [field]: value }
    }))
  }

  const updateRunSplit = (index: number, field: 'min' | 'sec', value: string) => {
    setRunSplits(prev => prev.map((split, i) =>
      i === index ? { ...split, [field]: value } : split
    ))
  }

  const getTotalSeconds = () => {
    const h = parseInt(totalHours) || 0
    const m = parseInt(totalMin) || 0
    const s = parseInt(totalSec) || 0
    return h * 3600 + m * 60 + s
  }

  const formatTotalTime = () => {
    const total = getTotalSeconds()
    if (total === 0) return null
    const hours = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    const secs = total % 60
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const getStationSeconds = (stationId: string) => {
    const time = stationTimes[stationId]
    return (parseInt(time.min) || 0) * 60 + (parseInt(time.sec) || 0)
  }

  const getStationsJson = () => {
    const result: Record<string, number> = {}
    STATIONS.forEach(station => {
      const seconds = getStationSeconds(station.id)
      if (seconds > 0) {
        result[station.id] = seconds
      }
    })
    return Object.keys(result).length > 0 ? result : null
  }

  const getRunSplitsJson = () => {
    const splits = runSplits.map(split => {
      const seconds = (parseInt(split.min) || 0) * 60 + (parseInt(split.sec) || 0)
      return seconds > 0 ? seconds : null
    })
    return splits.some(s => s !== null) ? splits : null
  }

  // Calculate total station time
  const totalStationTime = () => {
    let total = 0
    Object.keys(stationTimes).forEach(id => {
      total += getStationSeconds(id)
    })
    return total
  }

  // Calculate total run time
  const totalRunTime = () => {
    return runSplits.reduce((sum, split) => {
      return sum + (parseInt(split.min) || 0) * 60 + (parseInt(split.sec) || 0)
    }, 0)
  }

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
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
          sport: 'HYROX',
          eventType: 'HYROX_RACE',
          eventName: eventName || undefined,
          eventDate,
          hyroxDivision: division,
          hyroxTotalTime: getTotalSeconds() || undefined,
          hyroxStations: getStationsJson(),
          hyroxRunSplits: getRunSplitsJson(),
          timeSeconds: getTotalSeconds() || undefined,
          timeFormatted: formatTotalTime(),
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
        <Flame className="h-5 w-5" />
        <span className="font-medium">HYROX - Prestationslogg</span>
      </div>

      {/* Division & Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Division *</Label>
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIVISIONS.map((d) => (
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
          placeholder="HYROX Stockholm, HYROX World Championships..."
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      {/* Total Time */}
      <div className="p-4 bg-orange-50 rounded-lg space-y-3">
        <Label className="text-orange-800 font-medium">⏱️ Total tid</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Timmar</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Minuter</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="15"
              value={totalMin}
              onChange={(e) => setTotalMin(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sekunder</Label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="30"
              value={totalSec}
              onChange={(e) => setTotalSec(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Station Times */}
      <div className="space-y-3">
        <Label className="font-medium">Stationstider (valfritt)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STATIONS.map((station) => (
            <div key={station.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <span className="text-sm w-40 truncate">{station.icon} {station.label.split('.')[1]}</span>
              <Input
                type="number"
                min="0"
                placeholder="min"
                className="w-16 h-8 text-sm"
                value={stationTimes[station.id].min}
                onChange={(e) => updateStationTime(station.id, 'min', e.target.value)}
              />
              <span>:</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="sek"
                className="w-16 h-8 text-sm"
                value={stationTimes[station.id].sec}
                onChange={(e) => updateStationTime(station.id, 'sec', e.target.value)}
              />
            </div>
          ))}
        </div>
        {totalStationTime() > 0 && (
          <p className="text-sm text-muted-foreground">
            Total stationstid: <strong>{formatTime(totalStationTime())}</strong>
          </p>
        )}
      </div>

      {/* Run Splits */}
      <div className="space-y-3">
        <Label className="font-medium">Löpsplits 8 x 1km (valfritt)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {runSplits.map((split, index) => (
            <div key={index} className="flex items-center gap-1 p-2 bg-green-50 rounded">
              <span className="text-xs text-green-700 w-8">#{index + 1}</span>
              <Input
                type="number"
                min="0"
                placeholder="m"
                className="w-12 h-8 text-sm"
                value={split.min}
                onChange={(e) => updateRunSplit(index, 'min', e.target.value)}
              />
              <span>:</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="s"
                className="w-12 h-8 text-sm"
                value={split.sec}
                onChange={(e) => updateRunSplit(index, 'sec', e.target.value)}
              />
            </div>
          ))}
        </div>
        {totalRunTime() > 0 && (
          <p className="text-sm text-muted-foreground">
            Total löptid: <strong>{formatTime(totalRunTime())}</strong>
            {' '}(snitt {formatTime(Math.round(totalRunTime() / 8))}/km)
          </p>
        )}
      </div>

      {/* Heart Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Snitt puls</Label>
          <Input
            type="number"
            placeholder="165"
            value={avgHR}
            onChange={(e) => setAvgHR(e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="space-y-2">
          <Label>Max puls</Label>
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
          placeholder="Svaga stationer, taktik, förbättringar..."
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
