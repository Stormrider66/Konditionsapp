'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Loader2,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type FuelingStatus = 'NO_DATA' | 'READY_TO_PROGRESS' | 'HOLD' | 'REDUCE' | 'ON_TRACK'

interface FuelingFeedbackSummary {
  count: number
  averageActualCarbsGPerHour: number | null
  averagePlannedCarbsGPerHour: number | null
  averageStomachRating: number | null
  averageEnergyRating: number | null
  bestToleratedCarbsGPerHour: number | null
  latestActualCarbsGPerHour: number | null
  status: FuelingStatus
}

interface FuelingPlanSummary {
  recommendedCarbsGPerHour: number | null
}

interface FuelingLogSummary {
  id: string
  workoutName: string
  completedAt: string
  plannedCarbsGPerHour: number | null
  actualCarbsGPerHour: number | null
  stomachRating: number | null
  energyRating: number | null
}

interface FuelingSummaryResponse {
  summary: FuelingFeedbackSummary
  latestPlan: FuelingPlanSummary | null
  recentLogs: FuelingLogSummary[]
}

interface FuelingTrainingProgressCardProps {
  clientId: string
  variant?: 'default' | 'glass'
}

const STATUS_META: Record<FuelingStatus, {
  label: string
  body: string
  badgeClass: string
  icon: LucideIcon
}> = {
  READY_TO_PROGRESS: {
    label: 'Redo att höja',
    body: 'Din senaste nivå verkar fungera. Nästa långpass kan testa en liten höjning.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
  },
  HOLD: {
    label: 'Behåll nivån',
    body: 'Upprepa samma nivå tills intaget känns stabilt innan du höjer igen.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Flame,
  },
  REDUCE: {
    label: 'Backa lite',
    body: 'Magen verkar ha protesterat. Sänk nästa mål och bygg upp igen stegvis.',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  ON_TRACK: {
    label: 'På rätt väg',
    body: 'Du ligger nära planen. Fortsätt logga intag, mage och energi efter långpassen.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  NO_DATA: {
    label: 'Börja logga',
    body: 'Efter nästa långpass, fyll i kolhydrater per timme och magkänsla så byggs planen upp.',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: Utensils,
  },
}

export function FuelingTrainingProgressCard({
  clientId,
  variant = 'default',
}: FuelingTrainingProgressCardProps) {
  const [data, setData] = useState<FuelingSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSummary() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/clients/${clientId}/fueling-summary`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (body.success) setData(body.data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Kunde inte hämta magträning')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadSummary()

    return () => controller.abort()
  }, [clientId])

  const isGlass = variant === 'glass'
  const summary = data?.summary
  const status = summary?.status ?? 'NO_DATA'
  const meta = STATUS_META[status]
  const StatusIcon = meta.icon
  const target = summary?.averagePlannedCarbsGPerHour ?? data?.latestPlan?.recommendedCarbsGPerHour ?? null
  const latestLog = data?.recentLogs[0] ?? null

  return (
    <Card className={isGlass ? 'bg-white/80 dark:bg-slate-900/70 backdrop-blur border-white/20' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-600" />
              Magträning
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Bygg tolerans mot tävlingsmålet
            </p>
          </div>
          {!isLoading && (
            <Badge variant="outline" className={meta.badgeClass}>
              {meta.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border bg-orange-50/70 p-3 dark:bg-orange-900/10 dark:border-orange-900/30">
              <StatusIcon className="h-4 w-4 mt-0.5 text-orange-700 dark:text-orange-400" />
              <p className="text-sm text-slate-700 dark:text-slate-200">{meta.body}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Mål" value={formatGramHour(target)} />
              <Metric label="Senast" value={formatGramHour(summary?.latestActualCarbsGPerHour)} />
              <Metric label="Mage" value={formatRating(summary?.averageStomachRating)} />
            </div>

            {latestLog ? (
              <div className="rounded-md border px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-medium text-slate-900 dark:text-white">
                    {latestLog.workoutName}
                  </p>
                  <span className="text-muted-foreground">
                    {new Date(latestLog.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">
                  Loggat: {formatGramHour(latestLog.actualCarbsGPerHour)}
                  {latestLog.energyRating ? `, energi ${latestLog.energyRating}/5` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tips: välj samma produkter som du tänker använda på tävling och logga responsen direkt efter passet.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-white/10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function formatGramHour(value: number | null | undefined): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatRating(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}/5`
}
