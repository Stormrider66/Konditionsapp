'use client'

/**
 * Training Load Widget
 *
 * Displays weekly training load (TSS) from:
 * - Strava synced activities
 * - Garmin synced activities
 * - Manual workout logs (if TSS available)
 *
 * Shows:
 * - Weekly TSS total
 * - Daily breakdown
 * - ACWR (Acute:Chronic Workload Ratio)
 * - Activity type distribution
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface TrainingLoadData {
  weeklyTSS: number
  dailyAvgTSS: number
  acuteLoad: number // 7-day
  chronicLoad: number // 28-day
  acwr: number // Acute:Chronic ratio
  byType: Record<string, { count: number; tss: number; distance: number }>
  trend: 'increasing' | 'stable' | 'decreasing'
  riskLevel: 'low' | 'optimal' | 'high' | 'very_high'
}

interface TrainingLoadWidgetProps {
  clientId: string
  variant?: 'default' | 'glass'
}

export function TrainingLoadWidget({ clientId, variant = 'default' }: TrainingLoadWidgetProps) {
  const [data, setData] = useState<TrainingLoadData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrainingLoad() {
      try {
        const response = await fetch(`/api/athlete/training-load?clientId=${clientId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch training load')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching training load:', err)
        setError('Kunde inte ladda träningsbelastning')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrainingLoad()
  }, [clientId])

  if (isLoading) {
    if (variant === 'glass') {
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Träningsbelastning
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <Skeleton className="h-32 w-full bg-white/10" />
          </GlassCardContent>
        </GlassCard>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Träningsbelastning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    if (variant === 'glass') {
      return (
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Träningsbelastning
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-center py-6">
              <Activity className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {error || 'Ingen träningsdata tillgänglig'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Anslut Strava eller Garmin för att se din belastning
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Träningsbelastning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {error || 'Ingen träningsdata tillgänglig'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Anslut Strava eller Garmin för att se din belastning
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'low':
        return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Låg belastning', icon: '💤' }
      case 'optimal':
        return { color: 'text-green-600', bg: 'bg-green-100', label: 'Optimal', icon: '✅' }
      case 'high':
        return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Hög belastning', icon: '⚠️' }
      case 'very_high':
        return { color: 'text-red-600', bg: 'bg-red-100', label: 'Varning!', icon: '🔴' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Okänd', icon: '❓' }
    }
  }

  const riskConfig = getRiskConfig(data.riskLevel)
  const acwrPercent = Math.min(100, (data.acwr / 1.5) * 100)

  if (variant === 'glass') {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Träningsbelastning
              <InfoTooltip conceptKey="tss" />
            </GlassCardTitle>
            <Badge className={`${riskConfig.bg} ${riskConfig.color} border-0`}>
              {riskConfig.icon} {riskConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">Senaste 7 dagarna</p>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          {/* Weekly TSS */}
          <div className="flex items-center justify-between text-slate-900 dark:text-white transition-colors">
            <div>
              <p className="text-3xl font-bold">{data.weeklyTSS}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">TSS denna vecka</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium">{data.dailyAvgTSS}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 transition-colors">snitt/dag</p>
            </div>
          </div>

          {/* ACWR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400 transition-colors">ACWR (Akut:Kronisk)</span>
              <span className="font-medium text-slate-900 dark:text-white transition-colors">{data.acwr.toFixed(2)}</span>
            </div>
            <div className="relative">
              <Progress value={acwrPercent} className="h-2 bg-slate-200 dark:bg-slate-800 transition-colors" indicatorClassName="bg-cyan-600 dark:bg-cyan-500" />
              {/* Optimal zone indicator */}
              <div className="absolute top-0 left-[53%] w-[27%] h-2 border-l-2 border-r-2 border-green-500/50 opacity-50" />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>0.8 (Låg)</span>
              <span className="text-green-600 dark:text-green-500">0.8-1.3 (Optimal)</span>
              <span>1.5+ (Hög)</span>
            </div>
          </div>

          {/* Activity breakdown */}
          {Object.keys(data.byType).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10 transition-colors">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">Per aktivitetstyp</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data.byType).slice(0, 4).map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 capitalize transition-colors">{type.toLowerCase()}</span>
                    <span className="font-medium text-slate-800 dark:text-white transition-colors">{stats.tss} TSS</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load comparison */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10 transition-colors">
            {data.riskLevel === 'optimal' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            ) : data.riskLevel === 'high' || data.riskLevel === 'very_high' ? (
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            ) : (
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            )}
            <p className="text-xs text-slate-500">
              {data.trend === 'increasing'
                ? 'Din belastning ökar - övervaka återhämtning'
                : data.trend === 'decreasing'
                  ? 'Din belastning minskar - bra för återhämtning'
                  : 'Din belastning är stabil'}
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Träningsbelastning
            <InfoTooltip conceptKey="tss" />
          </CardTitle>
          <Badge className={`${riskConfig.bg} ${riskConfig.color}`}>
            {riskConfig.icon} {riskConfig.label}
          </Badge>
        </div>
        <CardDescription>Senaste 7 dagarna</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly TSS */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{data.weeklyTSS}</p>
            <p className="text-sm text-muted-foreground">TSS denna vecka</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-medium">{data.dailyAvgTSS}</p>
            <p className="text-xs text-muted-foreground">snitt/dag</p>
          </div>
        </div>

        {/* ACWR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ACWR (Akut:Kronisk)</span>
            <span className="font-medium">{data.acwr.toFixed(2)}</span>
          </div>
          <div className="relative">
            <Progress value={acwrPercent} className="h-2" />
            {/* Optimal zone indicator */}
            <div className="absolute top-0 left-[53%] w-[27%] h-2 border-l-2 border-r-2 border-green-500 opacity-50" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.8 (Låg)</span>
            <span className="text-green-600">0.8-1.3 (Optimal)</span>
            <span>1.5+ (Hög)</span>
          </div>
        </div>

        {/* Activity breakdown */}
        {Object.keys(data.byType).length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Per aktivitetstyp</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data.byType).slice(0, 4).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{type.toLowerCase()}</span>
                  <span className="font-medium">{stats.tss} TSS</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Load comparison */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {data.riskLevel === 'optimal' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : data.riskLevel === 'high' || data.riskLevel === 'very_high' ? (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          ) : (
            <Activity className="h-4 w-4 text-blue-500" />
          )}
          <p className="text-xs text-muted-foreground">
            {data.trend === 'increasing'
              ? 'Din belastning ökar - övervaka återhämtning'
              : data.trend === 'decreasing'
                ? 'Din belastning minskar - bra för återhämtning'
                : 'Din belastning är stabil'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
