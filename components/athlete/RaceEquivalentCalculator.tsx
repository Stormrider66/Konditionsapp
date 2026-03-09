'use client'

/**
 * RaceEquivalentCalculator
 *
 * Interactive "what-if" calculator: enter a time for one distance,
 * instantly see VDOT and predicted equivalent times for all other distances.
 * Uses Jack Daniels' VDOT method via lib/calculations/race-predictions.ts
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  ArrowRight,
  TrendingUp,
  Timer,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  calculateVDOT,
  predictTimeFromVDOT,
  formatTime,
  RACE_DISTANCES,
  calculateTrainingPaces,
} from '@/lib/calculations/race-predictions'

type SourceDistance = '5K' | '10K' | 'Half Marathon' | 'Marathon'

const SOURCE_OPTIONS: { value: SourceDistance; label: string; km: number }[] = [
  { value: '5K', label: '5 km', km: 5 },
  { value: '10K', label: '10 km', km: 10 },
  { value: 'Half Marathon', label: 'Halvmaraton', km: 21.0975 },
  { value: 'Marathon', label: 'Maraton', km: 42.195 },
]

const PREDICTION_DISTANCES: { key: keyof typeof RACE_DISTANCES; label: string; km: number }[] = [
  { key: '1500m', label: '1 500 m', km: 1.5 },
  { key: 'Mile', label: 'Mile', km: 1.609 },
  { key: '3K', label: '3 km', km: 3 },
  { key: '5K', label: '5 km', km: 5 },
  { key: '10K', label: '10 km', km: 10 },
  { key: '15K', label: '15 km', km: 15 },
  { key: '10 Mile', label: '10 miles', km: 16.093 },
  { key: 'Half Marathon', label: 'Halvmaraton', km: 21.0975 },
  { key: 'Marathon', label: 'Maraton', km: 42.195 },
]

function categorizeVDOT(vdot: number): { label: string; color: string } {
  if (vdot >= 75) return { label: 'Världsklass', color: 'bg-purple-500 text-white' }
  if (vdot >= 65) return { label: 'Elit', color: 'bg-red-500 text-white' }
  if (vdot >= 55) return { label: 'Avancerad', color: 'bg-orange-500 text-white' }
  if (vdot >= 45) return { label: 'Medel', color: 'bg-blue-500 text-white' }
  if (vdot >= 35) return { label: 'Motionär', color: 'bg-green-500 text-white' }
  return { label: 'Nybörjare', color: 'bg-slate-500 text-white' }
}

function parseTimeInput(value: string): number | null {
  // Accept MM:SS or HH:MM:SS
  const parts = value.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    const [min, sec] = parts
    if (min < 0 || sec < 0 || sec >= 60) return null
    return min * 60 + sec
  }
  if (parts.length === 3) {
    const [hours, min, sec] = parts
    if (hours < 0 || min < 0 || min >= 60 || sec < 0 || sec >= 60) return null
    return hours * 3600 + min * 60 + sec
  }
  return null
}

function formatPacePerKm(totalSeconds: number, km: number): string {
  const paceSeconds = totalSeconds / km
  const min = Math.floor(paceSeconds / 60)
  const sec = Math.round(paceSeconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}/km`
}

interface RaceEquivalentCalculatorProps {
  currentVDOT?: number
  className?: string
}

export function RaceEquivalentCalculator({
  currentVDOT,
  className,
}: RaceEquivalentCalculatorProps) {
  const [sourceDistance, setSourceDistance] = useState<SourceDistance>('10K')
  const [timeInput, setTimeInput] = useState('')

  const sourceDistanceMeters = RACE_DISTANCES[sourceDistance]
  const timeSeconds = useMemo(() => parseTimeInput(timeInput), [timeInput])

  const result = useMemo(() => {
    if (!timeSeconds || timeSeconds < 60) return null

    const vdot = calculateVDOT(sourceDistanceMeters, timeSeconds)
    if (vdot < 10 || vdot > 95) return null // Sanity check

    const predictions = PREDICTION_DISTANCES
      .filter((d) => d.key !== sourceDistance)
      .map((d) => {
        const distMeters = RACE_DISTANCES[d.key]
        const predicted = predictTimeFromVDOT(vdot, distMeters)
        return {
          ...d,
          time: formatTime(predicted),
          pace: formatPacePerKm(predicted, d.km),
          seconds: predicted,
        }
      })

    const paces = calculateTrainingPaces(vdot)
    const category = categorizeVDOT(vdot)

    return { vdot, predictions, paces, category }
  }, [timeSeconds, sourceDistanceMeters, sourceDistance])

  const vdotDelta = result && currentVDOT ? result.vdot - currentVDOT : null

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-500" />
          Tävlingskalkylator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ange en tid och se hur den motsvarar andra distanser
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input section */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Distans
            </Label>
            <Select
              value={sourceDistance}
              onValueChange={(v) => setSourceDistance(v as SourceDistance)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Tid (MM:SS eller HH:MM:SS)
            </Label>
            <Input
              placeholder={sourceDistance === 'Marathon' || sourceDistance === 'Half Marathon' ? 'H:MM:SS' : 'MM:SS'}
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {/* VDOT result */}
        {result && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
              <div>
                <p className="text-xs text-muted-foreground">VDOT</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{result.vdot.toFixed(1)}</span>
                  {vdotDelta !== null && vdotDelta !== 0 && (
                    <span
                      className={cn(
                        'text-sm font-medium flex items-center gap-0.5',
                        vdotDelta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-500 dark:text-red-400'
                      )}
                    >
                      <TrendingUp
                        className={cn('h-3 w-3', vdotDelta < 0 && 'rotate-180')}
                      />
                      {vdotDelta > 0 ? '+' : ''}
                      {vdotDelta.toFixed(1)} vs nuvarande
                    </span>
                  )}
                </div>
              </div>
              <Badge className={result.category.color}>
                {result.category.label}
              </Badge>
            </div>

            {/* Predicted times table */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                Ekvivalenta tider
              </p>
              <div className="space-y-1">
                {result.predictions.map((pred) => (
                  <div
                    key={pred.key}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium w-28">{pred.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-24 text-right">
                        {pred.pace}
                      </span>
                      <span className="text-sm font-bold font-mono w-20 text-right">
                        {pred.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training paces */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Träningstempo
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Lätt (E)</p>
                  <p className="text-sm font-bold">{result.paces.easy.formatted}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Maraton (M)</p>
                  <p className="text-sm font-bold">{result.paces.marathon.formatted}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Tröskel (T)</p>
                  <p className="text-sm font-bold">{result.paces.threshold.formatted}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Intervall (I)</p>
                  <p className="text-sm font-bold">{result.paces.interval.formatted}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!result && timeInput && (
          <div className="text-center py-4 text-muted-foreground">
            <Timer className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Ange en giltig tid (t.ex.{' '}
              {sourceDistance === 'Marathon'
                ? '3:30:00'
                : sourceDistance === 'Half Marathon'
                  ? '1:45:00'
                  : sourceDistance === '10K'
                    ? '45:00'
                    : '22:00'}
              )
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
