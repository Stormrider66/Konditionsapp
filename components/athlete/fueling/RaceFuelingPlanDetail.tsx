'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { ArrowLeft, CalendarDays, CheckCircle2, FlaskConical, Loader2, PackageCheck, Timer, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RaceDayPlan {
  carbsPerHour: number
  durationMinutes: number | null
  totalCarbs: number | null
  intakeEvery20Min: number
  gelEquivalentCount: number | null
  bottleMixCount: number | null
  timing: Array<{ minute: number; carbs: number; label: string }>
  notesSv: string[]
}

interface FuelingPlanDetail {
  id: string
  name: string | null
  sport: string
  distanceKm: number | null
  durationMinutes: number | null
  raceDate: string | null
  estimatedCarbDemandGPerHour: number | null
  estimatedCarbDemandTotalG: number | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  confidence: string
  scenarios: unknown
  assumptions: unknown
  warnings: unknown
  status: string
  coachNotes: string | null
  athleteNotes: string | null
  raceDayPlan: RaceDayPlan | null
  workoutPrescriptions: Array<{
    id: string
    targetCarbsGPerHour: number
    targetCarbsTotalG: number | null
    workout: {
      id: string
      name: string
      duration: number | null
      day: { date: string | null }
    }
  }>
}

interface RaceFuelingPlanDetailProps {
  planId: string
  backHref: string
}

export function RaceFuelingPlanDetail({ planId, backHref }: RaceFuelingPlanDetailProps) {
  const [plan, setPlan] = useState<FuelingPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied' | 'error'>('idle')
  const [appliedCount, setAppliedCount] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlan() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/fueling/plans/${planId}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        if (body.success) setPlan(body.plan)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Kunde inte hämta planen')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadPlan()
    return () => controller.abort()
  }, [planId])

  async function applyToProgram() {
    setApplyState('applying')
    try {
      const response = await fetch(`/api/fueling/plans/${planId}/apply`, { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setAppliedCount(body.updatedCount ?? 0)
      setApplyState('applied')
    } catch {
      setApplyState('error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" className="mb-6">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {error ?? 'Planen kunde inte hittas.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const raceDayPlan = plan.raceDayPlan
  const assumptions = normalizeStringList(plan.assumptions)
  const warnings = normalizeStringList(plan.warnings)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <Button asChild variant="ghost">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Link>
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {plan.name ?? 'Tävlingsenergi'}
            </h1>
            <Badge variant="outline">{statusLabel(plan.status)}</Badge>
            <Badge variant="outline">{confidenceLabel(plan.confidence)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{sportLabel(plan.sport)}</span>
            {plan.distanceKm && <span>{formatDistance(plan.distanceKm)}</span>}
            {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
            {plan.raceDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(plan.raceDate), 'd MMM yyyy', { locale: sv })}
              </span>
            )}
          </div>
        </div>

        <Button onClick={() => void applyToProgram()} disabled={applyState === 'applying'}>
          {applyState === 'applying' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {applyState === 'applied'
            ? `${appliedCount ?? 0} pass uppdaterade`
            : 'Uppdatera kommande pass'}
        </Button>
      </div>

      {applyState === 'error' && (
        <p className="text-sm text-destructive">Kunde inte uppdatera kommande pass.</p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Beräknat behov" value={formatGramHour(plan.estimatedCarbDemandGPerHour)} />
        <Metric label="Rekommenderat" value={formatGramHour(plan.recommendedCarbsGPerHour)} />
        <Metric label="Totalt intag" value={plan.recommendedCarbsTotalG ? `${Math.round(plan.recommendedCarbsTotalG)} g` : '-'} />
        <Metric label="Intagsrytm" value={raceDayPlan ? `${raceDayPlan.intakeEvery20Min} g / 20 min` : '-'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-4 w-4 text-orange-600" />
              Raceplan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {raceDayPlan ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PackItem label="Gel" value={raceDayPlan.gelEquivalentCount ? `${raceDayPlan.gelEquivalentCount} st à 25 g` : '-'} />
                  <PackItem label="Sportdryck" value={raceDayPlan.bottleMixCount ? `${raceDayPlan.bottleMixCount} flaskor à 40 g` : '-'} />
                </div>

                {raceDayPlan.timing.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-2">Timing</h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {raceDayPlan.timing.map((point) => (
                        <div key={point.minute} className="rounded-md border px-3 py-2 text-sm">
                          <span className="font-medium">{point.label}</span>
                          <span className="text-muted-foreground">: {point.carbs} g kolhydrater</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {raceDayPlan.notesSv.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {raceDayPlan.notesSv.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sätt ett rekommenderat kolhydratmål för att skapa raceplanen.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-amber-600" />
              Anteckningar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <NoteBlock title="Coach" value={plan.coachNotes} />
            <NoteBlock title="Atlet" value={plan.athleteNotes} />
            {(assumptions.length > 0 || warnings.length > 0) && (
              <div>
                <p className="font-medium">Antaganden</p>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                  {[...assumptions, ...warnings].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            Kommande pass med carb-träning
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plan.workoutPrescriptions.length > 0 ? (
            <div className="space-y-2">
              {plan.workoutPrescriptions.map((prescription) => (
                <div key={prescription.id} className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{prescription.workout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {prescription.workout.day.date
                        ? new Date(prescription.workout.day.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
                        : 'Datum saknas'}
                      {prescription.workout.duration ? `, ${prescription.workout.duration} min` : ''}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-medium">{Math.round(prescription.targetCarbsGPerHour)} g/h</p>
                    <p className="text-xs text-muted-foreground">
                      {prescription.targetCarbsTotalG ? `${Math.round(prescription.targetCarbsTotalG)} g totalt` : 'total saknas'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inga kommande pass är kopplade ännu. Använd knappen ovan för att uppdatera aktiva program.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      </CardContent>
    </Card>
  )
}

function PackItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-orange-50/70 p-4 dark:bg-orange-900/10 dark:border-orange-900/30">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function NoteBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{value || 'Ingen anteckning ännu.'}</p>
    </div>
  )
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function formatGramHour(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

function formatDistance(distanceKm: number): string {
  if (Math.abs(distanceKm - 42.195) < 0.1) return 'Marathon'
  if (Math.abs(distanceKm - 21.0975) < 0.1) return 'Halvmarathon'
  return `${distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`
}

function statusLabel(status: string): string {
  if (status === 'APPROVED') return 'Godkänd'
  if (status === 'ARCHIVED') return 'Arkiverad'
  return 'Utkast'
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'HIGH') return 'Hög säkerhet'
  if (confidence === 'MEDIUM') return 'Medel säkerhet'
  return 'Låg säkerhet'
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
  return labels[sport] ?? sport
}
