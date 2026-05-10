'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Activity, CalendarDays, Flame, PackageCheck, Timer, Utensils } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface RaceFuelingPlanSummary {
  id: string
  name: string | null
  sport: string
  distanceKm: number | null
  durationMinutes: number | null
  raceDate: string | null
  estimatedCarbDemandGPerHour: number | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  confidence: string
  status: string
  warnings?: unknown
  raceDayPlan?: {
    intakeEvery20Min: number
    gelEquivalentCount: number | null
    bottleMixCount: number | null
    timing: Array<{ minute: number; carbs: number; label: string }>
    notesSv: string[]
  } | null
}

interface RaceFuelingCardProps {
  clientId?: string
  variant?: 'default' | 'glass'
  basePath?: string
  showDetailLink?: boolean
}

export function RaceFuelingCard({ clientId, variant = 'default', basePath = '', showDetailLink = true }: RaceFuelingCardProps) {
  const [plan, setPlan] = useState<RaceFuelingPlanSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: '1' })
    if (clientId) params.set('clientId', clientId)

    fetch(`/api/fueling/plans?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPlan(data?.plans?.[0] ?? null))
      .catch((error) => {
        if (error?.name !== 'AbortError') setPlan(null)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [clientId])

  const isGlass = variant === 'glass'

  return (
    <Card className={isGlass ? 'bg-white/80 dark:bg-slate-900/70 backdrop-blur border-white/20' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-600" />
              Tävlingsenergi
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Kolhydratsplan för nästa mål
            </p>
          </div>
          {plan && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {confidenceLabel(plan.confidence)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ) : plan ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm text-slate-900 dark:text-white">
                {plan.name ?? sportLabel(plan.sport)}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                {plan.distanceKm && <span>{formatDistance(plan.distanceKm)}</span>}
                {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
                {plan.raceDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(plan.raceDate), 'd MMM', { locale: sv })}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Metric
                icon={<Flame className="h-4 w-4 text-orange-600" />}
                label="Beräknat behov"
                value={plan.estimatedCarbDemandGPerHour ? `${Math.round(plan.estimatedCarbDemandGPerHour)} g/h` : 'Saknas'}
              />
              <Metric
                icon={<Activity className="h-4 w-4 text-emerald-600" />}
                label="Rekommenderat"
                value={plan.recommendedCarbsGPerHour ? `${Math.round(plan.recommendedCarbsGPerHour)} g/h` : 'Saknas'}
              />
            </div>

            {plan.recommendedCarbsTotalG && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Planera cirka <span className="font-semibold">{Math.round(plan.recommendedCarbsTotalG)} g kolhydrater</span> under tävlingen.
              </p>
            )}

            {plan.raceDayPlan && (
              <div className="rounded-lg border bg-orange-50/70 p-3 dark:bg-orange-900/10 dark:border-orange-900/30">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-300">
                  <PackageCheck className="h-4 w-4" />
                  Packa för race
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3 text-orange-600" />
                    {plan.raceDayPlan.intakeEvery20Min} g var 20:e min
                  </span>
                  {plan.raceDayPlan.gelEquivalentCount && (
                    <span>{plan.raceDayPlan.gelEquivalentCount} gel à 25 g</span>
                  )}
                  {plan.raceDayPlan.bottleMixCount && (
                    <span>{plan.raceDayPlan.bottleMixCount} flaskor à 40 g</span>
                  )}
                </div>
                {plan.raceDayPlan.timing.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Första intag efter {plan.raceDayPlan.timing[0].label}, fortsätt jämnt genom loppet.
                  </p>
                )}
              </div>
            )}

            {showDetailLink && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${basePath}/athlete/fueling/${plan.id}`}>
                    Visa planen
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${basePath}/athlete/fueling`}>
                    Alla planer
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Ingen tävlingsplan sparad ännu. Skapa en från testrapporten när atleten har ett mål för lopp eller tävling.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/60 dark:border-white/10 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-semibold mt-1 text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'HIGH') return 'Hög säkerhet'
  if (confidence === 'MEDIUM') return 'Medel'
  return 'Låg'
}

function sportLabel(sport: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
  }
  return labels[sport] ?? 'Tävlingsplan'
}

function formatDistance(distanceKm: number): string {
  if (Math.abs(distanceKm - 42.195) < 0.1) return 'Marathon'
  if (Math.abs(distanceKm - 21.0975) < 0.1) return 'Halvmarathon'
  return `${distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}
