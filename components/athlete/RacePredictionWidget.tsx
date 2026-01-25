'use client'

/**
 * RacePredictionWidget
 *
 * Shows predicted race times based on recent training,
 * compares to goal times, and indicates improvement trends.
 */

import { useState, useEffect, useCallback } from 'react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface RacePrediction {
  distance: '5K' | '10K' | 'HALF' | 'MARATHON'
  currentVDOT: number
  projectedVDOT: number
  currentPrediction: string
  trainedPrediction: string
  improvementPercent: number
  confidence: number
}

interface GoalPrediction {
  distance: string
  predictedTime: string
  predictedPace: string
  confidence: number
  achievableIn: string
  confidenceInterval: {
    lower: string
    upper: string
  }
}

interface PredictionResponse {
  success: boolean
  clientId: string
  racePredictions?: RacePrediction[]
  goalPrediction?: GoalPrediction
  trainingReadiness?: {
    currentFitness: number
    fitnessTrajectory: 'improving' | 'maintaining' | 'declining'
    form: number
  }
  error?: string
}

interface RacePredictionWidgetProps {
  clientId?: string
  goalDistance?: string
  goalTime?: string
  variant?: 'default' | 'compact'
  className?: string
}

const DISTANCE_LABELS: Record<string, string> = {
  '5K': '5 km',
  '10K': '10 km',
  'HALF': 'Halvmaraton',
  'MARATHON': 'Maraton',
}

function formatPace(timeStr: string, distanceKm: number): string {
  // Parse HH:MM:SS or MM:SS
  const parts = timeStr.split(':').map(Number)
  let totalSeconds: number

  if (parts.length === 3) {
    totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    totalSeconds = parts[0] * 60 + parts[1]
  } else {
    return '-'
  }

  const paceSeconds = totalSeconds / distanceKm
  const paceMin = Math.floor(paceSeconds / 60)
  const paceSec = Math.round(paceSeconds % 60)

  return `${paceMin}:${paceSec.toString().padStart(2, '0')}/km`
}

function getDistanceKm(distance: string): number {
  switch (distance) {
    case '5K': return 5
    case '10K': return 10
    case 'HALF': return 21.0975
    case 'MARATHON': return 42.195
    default: return 10
  }
}

export function RacePredictionWidget({
  clientId,
  goalDistance,
  goalTime,
  variant = 'default',
  className,
}: RacePredictionWidgetProps) {
  const [data, setData] = useState<PredictionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchPredictions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ type: 'all' })
      if (clientId) params.set('clientId', clientId)
      if (goalDistance) params.set('distance', goalDistance)

      const response = await fetch(`/api/ai/advanced-intelligence/predictions?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Kunde inte hämta prediktioner')
      }
    } catch (err) {
      setError('Nätverksfel')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [clientId, goalDistance])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions])

  if (isLoading) {
    return (
      <GlassCard className={className}>
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            Tävlingsprediktioner
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className={className}>
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            Tävlingsprediktioner
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mb-2 text-orange-500" />
            <p className="text-sm text-center">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchPredictions()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Försök igen
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const predictions = data?.racePredictions || []
  const readiness = data?.trainingReadiness
  const goal = data?.goalPrediction

  // Find the prediction that matches goalDistance if provided
  const goalPrediction = goalDistance
    ? predictions.find((p) => p.distance === goalDistance)
    : predictions[1] // Default to 10K

  return (
    <GlassCard className={className}>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-500" />
            Tävlingsprediktioner
          </GlassCardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => fetchPredictions(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4 pt-0">
        {/* Goal comparison if goal is set */}
        {goalPrediction && goalTime && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {DISTANCE_LABELS[goalPrediction.distance]} Mål
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Ditt mål</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{goalTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Predicerad tid</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {goalPrediction.currentPrediction}
                </p>
              </div>
            </div>
            {goalPrediction.improvementPercent !== 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {goalPrediction.improvementPercent > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      {goalPrediction.improvementPercent.toFixed(1)}% förbättring möjlig med fortsatt träning
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-600 dark:text-orange-400">
                      Trendanalys indikerar behov av anpassning
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Race predictions grid */}
        {variant === 'default' && predictions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Predicerade tider</p>
            <div className="grid grid-cols-2 gap-2">
              {predictions.slice(0, 4).map((pred) => (
                <div
                  key={pred.distance}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    goalDistance === pred.distance
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {DISTANCE_LABELS[pred.distance]}
                    </span>
                    {pred.improvementPercent > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        <TrendingUp className="h-2 w-2 mr-0.5" />
                        {pred.improvementPercent.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {pred.currentPrediction}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatPace(pred.currentPrediction, getDistanceKm(pred.distance))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compact variant - just show primary prediction */}
        {variant === 'compact' && goalPrediction && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{DISTANCE_LABELS[goalPrediction.distance]}</p>
              <p className="text-lg font-bold">{goalPrediction.currentPrediction}</p>
            </div>
            {goalPrediction.improvementPercent > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">
                  +{goalPrediction.improvementPercent.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fitness trajectory */}
        {readiness && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Konditionstrend</span>
            <div className="flex items-center gap-1">
              {readiness.fitnessTrajectory === 'improving' && (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Förbättras</span>
                </>
              )}
              {readiness.fitnessTrajectory === 'maintaining' && (
                <>
                  <Minus className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Stabil</span>
                </>
              )}
              {readiness.fitnessTrajectory === 'declining' && (
                <>
                  <TrendingDown className="h-3 w-3 text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium">Avtagande</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* VDOT indicator */}
        {predictions[0] && (
          <div className="flex items-center justify-between text-xs border-t pt-2">
            <span className="text-muted-foreground">VDOT (konditionsnivå)</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {predictions[0].currentVDOT.toFixed(1)}
              </span>
              {predictions[0].projectedVDOT > predictions[0].currentVDOT && (
                <span className="text-green-600 dark:text-green-400">
                  → {predictions[0].projectedVDOT.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* No data state */}
        {predictions.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inte tillräckligt med träningsdata</p>
            <p className="text-xs">Logga fler pass för att se prediktioner</p>
          </div>
        )}

        {/* Link to full view */}
        {predictions.length > 0 && (
          <Link href="/athlete/predictions" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span>Visa detaljerad analys</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
