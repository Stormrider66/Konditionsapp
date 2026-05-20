'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, FlaskConical, Loader2, PackageCheck, Printer, Save, TrendingUp, Utensils } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  buildRaceFuelingProductTiming,
  normalizeRaceFuelingProductItems,
  normalizeRaceFuelingProductPlan,
  summarizeRaceFuelingProductItems,
  summarizeRaceFuelingProductPlan,
  type RaceFuelingProductPlan,
} from '@/lib/fueling/product-plan'
import { buildFuelingCoachingRecommendation } from '@/lib/fueling/coaching-recommendation'
import { buildFuelingBuildUpPlan, type FuelingBuildUpPlan } from '@/lib/fueling/build-up-plan'
import { extractSavedFuelingProductPlanNote } from '@/lib/fueling/product-plan-note'
import { formatFuelingPlanContext } from '@/lib/fueling/plan-context'
import { buildFuelingSyncResultCopy } from '@/lib/fueling/sync-result'
import { extractApiErrorMessage } from '@/lib/fueling/api-error'
import { useLocale } from '@/i18n/client'

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
  targetSpeedKmh: number | null
  targetPowerWatts: number | null
  targetPaceMinKm: number | null
  raceDate: string | null
  estimatedCarbDemandGPerHour: number | null
  estimatedCarbDemandTotalG: number | null
  recommendedCarbsGPerHour: number | null
  recommendedCarbsTotalG: number | null
  confidence: string
  scenarios: unknown
  assumptions: unknown
  warnings: unknown
  productPlan: unknown
  status: string
  coachNotes: string | null
  athleteNotes: string | null
  raceDayPlan: RaceDayPlan | null
  workoutPrescriptions: Array<{
    id: string
    targetCarbsGPerHour: number
    targetCarbsTotalG: number | null
    hydrationMl: number | null
    sodiumMg: number | null
    instructionsSv: string | null
    workout: {
      id: string
      name: string
      duration: number | null
      distance: number | null
      status: string
      day: { date: string | null }
      logs: Array<{
        completedAt: string | null
        fuelingLog: {
          actualCarbsGPerHour: number | null
          productsUsed: unknown
          stomachRating: number | null
          energyRating: number | null
        } | null
      }>
    }
  }>
}

interface RaceFuelingPlanDetailProps {
  planId: string
  backHref: string
  noteMode?: 'athlete' | 'coach'
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function RaceFuelingPlanDetail({ planId, backHref, noteMode = 'athlete' }: RaceFuelingPlanDetailProps) {
  const locale = getAppLocale(useLocale())
  const [plan, setPlan] = useState<FuelingPlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied' | 'error'>('idle')
  const [appliedCount, setAppliedCount] = useState<number | null>(null)
  const [editableNotes, setEditableNotes] = useState('')
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planRaceDate, setPlanRaceDate] = useState('')
  const [planDistanceKm, setPlanDistanceKm] = useState('')
  const [planDurationMinutes, setPlanDurationMinutes] = useState('')
  const [planCarbsPerHour, setPlanCarbsPerHour] = useState('')
  const [planStatus, setPlanStatus] = useState('DRAFT')
  const [planSaveState, setPlanSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [planSaveError, setPlanSaveError] = useState<string | null>(null)
  const [gelCount, setGelCount] = useState('')
  const [gelCarbs, setGelCarbs] = useState('25')
  const [bottleCount, setBottleCount] = useState('')
  const [bottleCarbs, setBottleCarbs] = useState('40')
  const [chewCount, setChewCount] = useState('')
  const [chewCarbs, setChewCarbs] = useState('20')
  const [productPlanSaveState, setProductPlanSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [productPlanSaveError, setProductPlanSaveError] = useState<string | null>(null)

  const loadPlan = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/fueling/plans/${planId}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (body.success) setPlan(body.plan)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : text(locale, 'Kunde inte hämta planen', 'Could not load the plan'))
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }, [locale, planId])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => void loadPlan(controller.signal))
    return () => controller.abort()
  }, [loadPlan])

  useEffect(() => {
    if (!plan) return
    queueMicrotask(() => setEditableNotes(noteMode === 'coach' ? (plan.coachNotes ?? '') : (plan.athleteNotes ?? '')))
  }, [noteMode, plan])

  useEffect(() => {
    if (!plan) return
    queueMicrotask(() => {
      setPlanName(plan.name ?? '')
      setPlanRaceDate(plan.raceDate ? toDateInputValue(plan.raceDate) : '')
      setPlanDistanceKm(plan.distanceKm != null ? String(plan.distanceKm) : '')
      setPlanDurationMinutes(plan.durationMinutes != null ? String(Math.round(plan.durationMinutes)) : '')
      setPlanCarbsPerHour(plan.recommendedCarbsGPerHour != null ? String(Math.round(plan.recommendedCarbsGPerHour)) : '')
      setPlanStatus(plan.status)
    })
  }, [plan])

  useEffect(() => {
    const storedProductPlan = normalizeRaceFuelingProductPlan(plan?.productPlan)
    if (!storedProductPlan) return

    const gel = storedProductPlan.items.find((item) => item.label === 'Gel')
    const bottle = storedProductPlan.items.find((item) => item.label === 'Flaskor sportdryck')
    const chew = storedProductPlan.items.find((item) => item.label === 'Chews / bars')

    queueMicrotask(() => {
      setGelCount(gel?.count ? String(gel.count) : '')
      setGelCarbs(gel?.carbsPerItemG ? String(gel.carbsPerItemG) : '25')
      setBottleCount(bottle?.count ? String(bottle.count) : '')
      setBottleCarbs(bottle?.carbsPerItemG ? String(bottle.carbsPerItemG) : '40')
      setChewCount(chew?.count ? String(chew.count) : '')
      setChewCarbs(chew?.carbsPerItemG ? String(chew.carbsPerItemG) : '20')
    })
  }, [plan?.productPlan])

  async function applyToProgram() {
    setApplyState('applying')
    try {
      const response = await fetch(`/api/fueling/plans/${planId}/apply`, { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      setAppliedCount(body.updatedCount ?? 0)
      setApplyState('applied')
      await loadPlan()
    } catch {
      setApplyState('error')
    }
  }

  async function saveNotes() {
    setNotesState('saving')
    setNotesError(null)
    try {
      const response = await fetch(`/api/fueling/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [noteMode === 'coach' ? 'coachNotes' : 'athleteNotes']: editableNotes || null,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? text(locale, 'Kunde inte spara.', 'Could not save.'))
      setPlan((current) => current ? {
        ...current,
        coachNotes: body.plan.coachNotes,
        athleteNotes: body.plan.athleteNotes,
      } : current)
      setNotesState('saved')
    } catch (err) {
      setNotesState('error')
      setNotesError(err instanceof Error ? err.message : text(locale, 'Kunde inte spara.', 'Could not save.'))
    }
  }

  async function savePlanSettings() {
    setPlanSaveState('saving')
    setPlanSaveError(null)
    try {
      const response = await fetch(`/api/fueling/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName || null,
          raceDate: planRaceDate ? new Date(planRaceDate).toISOString() : null,
          distanceKm: planDistanceKm ? Number(planDistanceKm) : null,
          durationMinutes: planDurationMinutes ? Number(planDurationMinutes) : undefined,
          recommendedCarbsGPerHour: planCarbsPerHour ? Number(planCarbsPerHour) : undefined,
          status: planStatus,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? text(locale, 'Kunde inte spara planen.', 'Could not save the plan.'))
      setPlan((current) => current ? { ...current, ...body.plan } : current)
      setPlanSaveState('saved')
    } catch (err) {
      setPlanSaveState('error')
      setPlanSaveError(err instanceof Error ? err.message : text(locale, 'Kunde inte spara planen.', 'Could not save the plan.'))
    }
  }

  async function saveProductPlan() {
    setProductPlanSaveState('saving')
    setProductPlanSaveError(null)
    const nextProductPlan = toStoredProductPlan(productPlan)

    try {
      const response = await fetch(`/api/fueling/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPlan: nextProductPlan }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? text(locale, 'Kunde inte spara produktplan.', 'Could not save product plan.'))
      setPlan((current) => current ? { ...current, productPlan: nextProductPlan } : current)
      setProductPlanSaveState('saved')
    } catch (err) {
      setProductPlanSaveState('error')
      setProductPlanSaveError(err instanceof Error ? err.message : text(locale, 'Kunde inte spara produktplan.', 'Could not save product plan.'))
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
            {text(locale, 'Tillbaka', 'Back')}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-sm text-destructive">
            {error ?? text(locale, 'Planen kunde inte hittas.', 'The plan could not be found.')}
          </CardContent>
        </Card>
      </div>
    )
  }

  const raceDayPlan = plan.raceDayPlan
  const assumptions = normalizeStringList(plan.assumptions)
  const warnings = normalizeStringList(plan.warnings)
  const isCoachMode = noteMode === 'coach'
  const editableNoteTitle = isCoachMode ? text(locale, 'Coachanteckningar', 'Coach notes') : text(locale, 'Mina produkter och noteringar', 'My products and notes')
  const editableNotePlaceholder = isCoachMode
    ? text(locale, 'Ex: Öka från 70 till 85 g/h över tre långpass. Följ mage/energi efter varje pass...', 'Ex: Increase from 70 to 85 g/h over three long sessions. Track gut/energy after each session...')
    : text(locale, 'Ex: Maurten gel vid 20, 60 och 100 min. Sportdryck i flaska 1 och 2...', 'Ex: Maurten gel at 20, 60, and 100 min. Sports drink in bottles 1 and 2...')
  const buildUp = buildFuelingBuildUp(plan.workoutPrescriptions, plan.recommendedCarbsGPerHour, locale)
  const plannedBuildUp = buildFuelingBuildUpPlan({
    raceTargetGPerHour: plan.recommendedCarbsGPerHour,
    currentGutToleranceGPerHour: estimateCurrentGutTolerance(plan.workoutPrescriptions),
    weeksAvailable: plan.raceDate ? weeksUntilDate(plan.raceDate) : null,
  })
  const buildUpRecommendation = buildFuelingCoachingRecommendation({
    logs: plan.workoutPrescriptions
      .map((prescription) => {
        const latestLog = prescription.workout.logs[0]?.fuelingLog ?? null
        return {
          plannedCarbsGPerHour: prescription.targetCarbsGPerHour,
          actualCarbsGPerHour: latestLog?.actualCarbsGPerHour ?? null,
          stomachRating: latestLog?.stomachRating ?? null,
          energyRating: latestLog?.energyRating ?? null,
          productsUsed: latestLog?.productsUsed,
        }
      })
      .filter((log) => log.actualCarbsGPerHour != null || log.stomachRating != null || log.energyRating != null),
    raceTargetGPerHour: plan.recommendedCarbsGPerHour,
  })
  const storedProductPlan = normalizeRaceFuelingProductPlan(plan.productPlan)
  const planContext = formatFuelingPlanContext(plan, { includeRaceDate: true, locale })
  const productPlan = buildProductPlan({
    targetCarbs: raceDayPlan?.totalCarbs ?? plan.recommendedCarbsTotalG,
    gelCount,
    gelCarbs,
    bottleCount,
    bottleCarbs,
    chewCount,
    chewCarbs,
  }, locale)
  const timingProductPlan = storedProductPlan ?? (productPlan.totalCarbs > 0 ? toStoredProductPlan(productPlan) : null)
  const productTiming = buildRaceFuelingProductTiming(timingProductPlan, raceDayPlan?.durationMinutes ?? plan.durationMinutes)
  const savedProductPlanNote = extractSavedFuelingProductPlanNote(isCoachMode ? plan.coachNotes : plan.athleteNotes)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 print:max-w-none print:px-0">
      <Button asChild variant="ghost">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          {text(locale, 'Tillbaka', 'Back')}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {plan.name ?? text(locale, 'Tävlingsenergi', 'Race fueling')}
            </h1>
            <Badge variant="outline">{statusLabel(plan.status, locale)}</Badge>
            <Badge variant="outline">{confidenceLabel(plan.confidence, locale)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {plan.durationMinutes && <span>{formatDuration(plan.durationMinutes)}</span>}
            {planContext && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {planContext}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {text(locale, 'Skriv ut', 'Print')}
          </Button>
          <Button onClick={() => void applyToProgram()} disabled={applyState === 'applying'}>
            {applyState === 'applying' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {applyState === 'applied'
              ? text(locale, `${appliedCount ?? 0} pass uppdaterade`, `${appliedCount ?? 0} sessions updated`)
              : text(locale, 'Uppdatera kommande pass', 'Update upcoming sessions')}
          </Button>
        </div>
      </div>

      {applyState === 'error' && (
        <p className="text-sm text-destructive">{text(locale, 'Kunde inte uppdatera kommande pass.', 'Could not update upcoming sessions.')}</p>
      )}

      {applyState === 'applied' && (
        <SyncResultNotice count={appliedCount ?? 0} locale={locale} />
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label={text(locale, 'Beräknat behov', 'Estimated need')} value={formatGramHour(plan.estimatedCarbDemandGPerHour)} />
        <Metric label={text(locale, 'Rekommenderat', 'Recommended')} value={formatGramHour(plan.recommendedCarbsGPerHour)} />
        <Metric label={text(locale, 'Totalt intag', 'Total intake')} value={plan.recommendedCarbsTotalG ? `${Math.round(plan.recommendedCarbsTotalG)} g` : '-'} />
        <Metric label={text(locale, 'Intagsrytm', 'Intake rhythm')} value={raceDayPlan ? `${raceDayPlan.intakeEvery20Min} g / 20 min` : '-'} />
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            {text(locale, 'Planinställningar', 'Plan settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-muted-foreground md:col-span-2">
              {text(locale, 'Namn', 'Name')}
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={planName}
                onChange={(event) => {
                  setPlanName(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {text(locale, 'Status', 'Status')}
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={planStatus}
                onChange={(event) => {
                  setPlanStatus(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              >
                <option value="DRAFT">{text(locale, 'Utkast', 'Draft')}</option>
                <option value="APPROVED">{text(locale, 'Godkänd', 'Approved')}</option>
                <option value="ARCHIVED">{text(locale, 'Arkiverad', 'Archived')}</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              {text(locale, 'Race datum', 'Race date')}
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                type="date"
                value={planRaceDate}
                onChange={(event) => {
                  setPlanRaceDate(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {text(locale, 'Distans (km)', 'Distance (km)')}
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                inputMode="decimal"
                min="0"
                step="0.1"
                type="number"
                value={planDistanceKm}
                onChange={(event) => {
                  setPlanDistanceKm(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {text(locale, 'Förväntad tid (min)', 'Expected time (min)')}
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                inputMode="numeric"
                min="1"
                type="number"
                value={planDurationMinutes}
                onChange={(event) => {
                  setPlanDurationMinutes(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {text(locale, 'Rek. intag (g/h)', 'Rec. intake (g/h)')}
              <input
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                inputMode="numeric"
                min="20"
                max="150"
                type="number"
                value={planCarbsPerHour}
                onChange={(event) => {
                  setPlanCarbsPerHour(event.target.value)
                  setPlanSaveState('idle')
                  setPlanSaveError(null)
                }}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void savePlanSettings()} disabled={planSaveState === 'saving'}>
              {planSaveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {planSaveState === 'saved' ? text(locale, 'Plan sparad', 'Plan saved') : text(locale, 'Spara plan', 'Save plan')}
            </Button>
            {planSaveState === 'error' && (
              <span className="text-xs text-destructive">{planSaveError ?? text(locale, 'Kunde inte spara planen.', 'Could not save the plan.')}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 print:break-inside-avoid">
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
                  <PackItem label={text(locale, 'Sportdryck', 'Sports drink')} value={raceDayPlan.bottleMixCount ? `${raceDayPlan.bottleMixCount} ${text(locale, 'flaskor à 40 g', 'bottles at 40 g')}` : '-'} />
                </div>

                {raceDayPlan.timing.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-2">Timing</h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {raceDayPlan.timing.map((point) => (
                        <div key={point.minute} className="rounded-md border px-3 py-2 text-sm">
                          <span className="font-medium">{point.label}</span>
                          <span className="text-muted-foreground">: {point.carbs} g {text(locale, 'kolhydrater', 'carbohydrates')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {raceDayPlan.notesSv.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {raceDayPlan.notesSv.map((note) => <li key={note}>{raceDayNote(note, locale)}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{text(locale, 'Sätt ett rekommenderat kolhydratmål för att skapa raceplanen.', 'Set a recommended carbohydrate target to create the race plan.')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-amber-600" />
              {text(locale, 'Anteckningar', 'Notes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!isCoachMode && <NoteBlock title="Coach" value={plan.coachNotes} locale={locale} />}
            <div className="space-y-2 print:hidden">
              <p className="font-medium">{editableNoteTitle}</p>
              <Textarea
                value={editableNotes}
                onChange={(event) => {
                  setEditableNotes(event.target.value)
                  setNotesState('idle')
                  setNotesError(null)
                }}
                placeholder={editableNotePlaceholder}
                className="min-h-[120px]"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void saveNotes()} disabled={notesState === 'saving'}>
                  {notesState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {notesState === 'saved' ? text(locale, 'Sparat', 'Saved') : text(locale, 'Spara', 'Save')}
                </Button>
                {notesState === 'error' && (
                  <span className="text-xs text-destructive">{notesError ?? text(locale, 'Kunde inte spara.', 'Could not save.')}</span>
                )}
              </div>
            </div>
            {isCoachMode && <NoteBlock title={text(locale, 'Atlet', 'Athlete')} value={plan.athleteNotes} locale={locale} />}
            <div className="hidden print:block">
              <NoteBlock title={isCoachMode ? 'Coach' : text(locale, 'Atlet', 'Athlete')} value={editableNotes || (isCoachMode ? plan.coachNotes : plan.athleteNotes)} locale={locale} />
            </div>
            {(assumptions.length > 0 || warnings.length > 0) && (
              <div>
                <p className="font-medium">{text(locale, 'Antaganden', 'Assumptions')}</p>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                  {[...assumptions, ...warnings].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            {text(locale, 'Race week checklista', 'Race week checklist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {buildChecklist(raceDayPlan, locale).map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                <span className="mt-0.5 h-4 w-4 rounded border border-slate-300 bg-white print:border-black" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4 text-amber-600" />
            {text(locale, 'Produktplan', 'Product plan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {storedProductPlan ? (
            <div className="rounded-lg border bg-emerald-50/70 p-3 text-sm text-emerald-950 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-100">
              <p className="font-medium">{text(locale, 'Sparad produktplan', 'Saved product plan')}</p>
              <p className="mt-1">{formatProductSummary(summarizeRaceFuelingProductPlan(storedProductPlan), locale) ?? text(locale, 'Produkter sparade.', 'Products saved.')}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span>{text(locale, 'Packat', 'Packed')} {formatGrams(storedProductPlan.totalCarbsG)}</span>
                <span>{text(locale, 'Mål', 'Target')} {formatGrams(storedProductPlan.targetCarbsG)}</span>
                <span>{text(locale, 'Skillnad', 'Difference')} {formatSignedGrams(storedProductPlan.differenceG)}</span>
              </div>
            </div>
          ) : savedProductPlanNote && (
            <div className="rounded-lg border bg-emerald-50/70 p-3 text-sm text-emerald-950 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-100">
              <p className="font-medium">{text(locale, 'Sparad produktplan i anteckning', 'Saved product plan in note')}</p>
              <p className="mt-1">{formatProductSummary(savedProductPlanNote.summary, locale) ?? text(locale, 'Produkter sparade i anteckning.', 'Products saved in note.')}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span>{text(locale, 'Packat', 'Packed')} {formatGrams(savedProductPlanNote.packedCarbsG)}</span>
                <span>{text(locale, 'Mål', 'Target')} {formatGrams(savedProductPlanNote.targetCarbsG)}</span>
                <span>{text(locale, 'Skillnad', 'Difference')} {formatSignedGrams(savedProductPlanNote.differenceG)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <ProductInput
              label="Gel"
              locale={locale}
              count={gelCount}
              carbs={gelCarbs}
              suggestedCount={raceDayPlan?.gelEquivalentCount ?? null}
              onCountChange={(value) => {
                setGelCount(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
              onCarbsChange={(value) => {
                setGelCarbs(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
            />
            <ProductInput
              label={text(locale, 'Flaskor sportdryck', 'Sports drink bottles')}
              locale={locale}
              count={bottleCount}
              carbs={bottleCarbs}
              suggestedCount={raceDayPlan?.bottleMixCount ?? null}
              onCountChange={(value) => {
                setBottleCount(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
              onCarbsChange={(value) => {
                setBottleCarbs(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
            />
            <ProductInput
              label="Chews / bars"
              locale={locale}
              count={chewCount}
              carbs={chewCarbs}
              suggestedCount={null}
              onCountChange={(value) => {
                setChewCount(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
              onCarbsChange={(value) => {
                setChewCarbs(value)
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <CompactMetric label={text(locale, 'Planmål', 'Plan target')} value={productPlan.targetCarbs ? `${productPlan.targetCarbs} g` : '-'} />
            <CompactMetric label={text(locale, 'Packat', 'Packed')} value={`${productPlan.totalCarbs} g`} />
            <CompactMetric label={text(locale, 'Skillnad', 'Difference')} value={formatSignedGrams(productPlan.difference)} />
            <CompactMetric label={text(locale, 'Säkerhetsmarginal', 'Safety margin')} value={productPlan.marginLabel} />
          </div>

          <div className="rounded-lg border bg-amber-50/70 p-3 text-sm text-amber-950 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-100">
            <p className="font-medium">{text(locale, 'Förslag', 'Suggestion')}</p>
            <p className="mt-1">{productPlan.feedback}</p>
            {productPlan.note.length > 0 && (
              <p className="mt-2 text-xs opacity-80">{productPlan.note}</p>
            )}
          </div>

          {productTiming.length > 0 && (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">{text(locale, 'Produkttiming', 'Product timing')}</p>
                <p className="text-xs text-muted-foreground">
                  {text(locale, 'Fördelar sparade eller ifyllda produkter över loppets intagsrytm.', 'Distributes saved or entered products across the race intake rhythm.')}
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {productTiming.map((point) => (
                  <div key={point.minute} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{point.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{Math.round(point.carbsG)} g</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{point.products.join(' + ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setGelCount(raceDayPlan?.gelEquivalentCount ? String(raceDayPlan.gelEquivalentCount) : '')
                setBottleCount(raceDayPlan?.bottleMixCount ? String(raceDayPlan.bottleMixCount) : '')
                setChewCount('')
                setProductPlanSaveState('idle')
                setProductPlanSaveError(null)
              }}
            >
              {text(locale, 'Använd standardförslag', 'Use default suggestion')}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => void saveProductPlan()}
              disabled={productPlanSaveState === 'saving'}
            >
              {productPlanSaveState === 'saving' ? text(locale, 'Sparar...', 'Saving...') : productPlanSaveState === 'saved' ? text(locale, 'Produktplan sparad', 'Product plan saved') : text(locale, 'Spara produktplan', 'Save product plan')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextNote = formatProductPlanNote(productPlan, locale)
                setEditableNotes((current) => current ? `${current}\n\n${nextNote}` : nextNote)
                setNotesState('idle')
              }}
            >
              {text(locale, 'Lägg i anteckning', 'Add to note')}
            </Button>
            {productPlanSaveState === 'error' && (
              <span className="text-xs text-destructive">{productPlanSaveError ?? text(locale, 'Kunde inte spara produktplan.', 'Could not save product plan.')}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                {text(locale, 'Carb-träning mot tävling', 'Carb training toward race day')}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {text(locale, 'Kommande pass som bygger upp intaget mot raceplanens mål.', 'Upcoming sessions that build intake toward the race plan target.')}
              </p>
            </div>
            {buildUp.totalCount > 0 && (
              <Badge variant="outline" className="w-fit">
                {buildUp.totalCount} {text(locale, 'pass', 'sessions')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {plannedBuildUp && (
              <FuelingBuildUpPreview plan={plannedBuildUp} hasLinkedWorkouts={plan.workoutPrescriptions.length > 0} locale={locale} />
            )}

            {plan.workoutPrescriptions.length > 0 ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <CompactMetric label={text(locale, 'Första mål', 'First target')} value={formatGramHour(buildUp.firstTarget)} />
                  <CompactMetric label={text(locale, 'Högsta mål', 'Highest target')} value={formatGramHour(buildUp.peakTarget)} />
                  <CompactMetric label={text(locale, 'Racemål', 'Race target')} value={formatGramHour(plan.recommendedCarbsGPerHour)} />
                  <CompactMetric label={text(locale, 'Loggat', 'Logged')} value={`${buildUp.loggedCount}/${buildUp.totalCount}`} />
                </div>

                <div className="rounded-lg border bg-blue-50/70 p-4 dark:bg-blue-900/10 dark:border-blue-900/30">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                    <TrendingUp className="h-4 w-4" />
                    Progression
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${buildUp.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {text(locale, 'Högsta kommande passmål är', 'Highest upcoming session target is')} {formatGramHour(buildUp.peakTarget)} {text(locale, 'jämfört med raceplanens', 'compared with the race plan target of')} {formatGramHour(plan.recommendedCarbsGPerHour)}.
                  </p>
                </div>

                <div className="rounded-lg border bg-emerald-50/70 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{localizeRecommendation(buildUpRecommendation, locale).label}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{localizeRecommendation(buildUpRecommendation, locale).action}</p>
                    </div>
                    {buildUpRecommendation.nextTargetGPerHour && (
                      <Badge variant="outline" className="w-fit bg-white/70 dark:bg-slate-950/40">
                        {buildUpRecommendation.nextTargetGPerHour} g/h
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{localizeRecommendation(buildUpRecommendation, locale).reason}</p>
                  {buildUpRecommendation.productSv && (
                    <p className="mt-1 text-xs text-muted-foreground">{localizeRecommendation(buildUpRecommendation, locale).product}</p>
                  )}
                </div>

                <div className="space-y-4">
                  {buildUp.groups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <h2 className="text-sm font-semibold">{group.label}</h2>
                      <div className="space-y-2">
                        {group.items.map((prescription) => (
                          <FuelingPrescriptionRow key={prescription.id} prescription={prescription} raceDate={plan.raceDate} locale={locale} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {text(locale, 'Inga kommande pass är kopplade ännu. Använd knappen ovan för att uppdatera aktiva program.', 'No upcoming sessions are linked yet. Use the button above to update active programs.')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type WorkoutPrescription = FuelingPlanDetail['workoutPrescriptions'][number]

interface ProductPlanInput {
  targetCarbs: number | null | undefined
  gelCount: string
  gelCarbs: string
  bottleCount: string
  bottleCarbs: string
  chewCount: string
  chewCarbs: string
}

interface ProductPlanSummary {
  targetCarbs: number | null
  gelCount: number
  gelCarbs: number
  bottleCount: number
  bottleCarbs: number
  chewCount: number
  chewCarbs: number
  totalCarbs: number
  difference: number | null
  marginLabel: string
  items: RaceFuelingProductPlan['items']
  feedback: string
  note: string
}

function ProductInput({
  label,
  locale,
  count,
  carbs,
  suggestedCount,
  onCountChange,
  onCarbsChange,
}: {
  label: string
  locale: AppLocale
  count: string
  carbs: string
  suggestedCount: number | null
  onCountChange: (value: string) => void
  onCarbsChange: (value: string) => void
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {suggestedCount != null && (
          <span className="text-[10px] text-muted-foreground">{text(locale, 'förslag', 'suggested')} {suggestedCount} {text(locale, 'st', 'pcs')}</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          {text(locale, 'Antal', 'Count')}
          <input
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            inputMode="numeric"
            min="0"
            type="number"
            value={count}
            onChange={(event) => onCountChange(event.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          g/st
          <input
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            inputMode="numeric"
            min="0"
            type="number"
            value={carbs}
            onChange={(event) => onCarbsChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function FuelingPrescriptionRow({ prescription, raceDate, locale }: { prescription: WorkoutPrescription; raceDate: string | null; locale: AppLocale }) {
  const latestLog = prescription.workout.logs[0]?.fuelingLog ?? null
  const productsUsed = normalizeRaceFuelingProductItems(latestLog?.productsUsed)
  const workoutDate = prescription.workout.day.date ? new Date(prescription.workout.day.date) : null
  const daysToRace = workoutDate && raceDate ? differenceInDays(new Date(raceDate), workoutDate) : null

  return (
    <div className="rounded-md border px-3 py-3 text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{prescription.workout.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {prescription.workout.status === 'COMPLETED' ? text(locale, 'Loggat', 'Logged') : text(locale, 'Planerat', 'Planned')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {workoutDate
              ? workoutDate.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })
              : text(locale, 'Datum saknas', 'Date missing')}
            {prescription.workout.duration ? `, ${prescription.workout.duration} min` : ''}
            {prescription.workout.distance ? `, ${prescription.workout.distance.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', { maximumFractionDigits: 1 })} km` : ''}
            {daysToRace != null && daysToRace >= 0 ? `, ${daysToRace} ${text(locale, 'dagar till race', 'days to race')}` : ''}
          </p>
        </div>
        <div className="text-left tabular-nums md:text-right">
          <p className="font-medium">{Math.round(prescription.targetCarbsGPerHour)} g/h</p>
          <p className="text-xs text-muted-foreground">
            {prescription.targetCarbsTotalG ? `${Math.round(prescription.targetCarbsTotalG)} g ${text(locale, 'totalt', 'total')}` : text(locale, 'total saknas', 'total missing')}
            {prescription.hydrationMl ? `, ${prescription.hydrationMl} ml` : ''}
          </p>
        </div>
      </div>

      {prescription.instructionsSv && (
        <p className="mt-2 text-xs text-muted-foreground">{prescription.instructionsSv}</p>
      )}

      {latestLog && (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
          <div className="grid gap-2 sm:grid-cols-3">
            <span>{text(locale, 'Utfört', 'Done')}: {formatGramHour(latestLog.actualCarbsGPerHour)}</span>
            <span>{text(locale, 'Mage', 'Gut')}: {formatRating(latestLog.stomachRating)}</span>
            <span>{text(locale, 'Energi', 'Energy')}: {formatRating(latestLog.energyRating)}</span>
          </div>
          {productsUsed.length > 0 && (
            <p className="mt-2 text-muted-foreground">
              {text(locale, 'Produkter', 'Products')}: {formatProductSummary(summarizeRaceFuelingProductItems(productsUsed), locale)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FuelingBuildUpPreview({
  plan,
  hasLinkedWorkouts,
  locale,
}: {
  plan: FuelingBuildUpPlan
  hasLinkedWorkouts: boolean
  locale: AppLocale
}) {
  return (
    <div className="rounded-lg border bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{text(locale, 'Planerad magträning', 'Planned gut training')}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            {text(locale, 'Bygg från', 'Build from')} {plan.startCarbsGPerHour} {text(locale, 'till', 'to')} {plan.raceTargetGPerHour} g/h {text(locale, 'över', 'over')} {plan.sessions.length} {text(locale, 'tävlingslika långpass.', 'race-like long sessions.')}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-white/70 dark:bg-slate-950/40">
          {hasLinkedWorkouts ? text(locale, 'Synkad med program', 'Synced with program') : text(locale, 'Redo att synka', 'Ready to sync')}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {plan.sessions.slice(0, 6).map((session) => (
          <div key={session.week} className="rounded-md border bg-white/70 p-3 dark:bg-slate-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {text(locale, 'Vecka', 'Week')} {session.week}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
              {session.targetCarbsGPerHour} g/h
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{locale === 'sv' ? session.focusSv : session.focusSv.replace('Gradvis ökning', 'Gradual increase').replace('Race-specifikt intag', 'Race-specific intake').replace('Stabilisera intaget', 'Stabilize intake')}</p>
          </div>
        ))}
      </div>

      {plan.sessions.length > 6 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {text(locale, 'Visar de första 6 stegen. Resterande steg följer samma progression mot racemålet.', 'Showing the first 6 steps. Remaining steps follow the same progression toward the race target.')}
        </p>
      )}
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

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-800/60 dark:border-white/10">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function buildProductPlan(input: ProductPlanInput, locale: AppLocale): ProductPlanSummary {
  const targetCarbs = input.targetCarbs != null ? Math.round(input.targetCarbs) : null
  const gelCount = parseNonNegativeNumber(input.gelCount)
  const gelCarbs = parseNonNegativeNumber(input.gelCarbs)
  const bottleCount = parseNonNegativeNumber(input.bottleCount)
  const bottleCarbs = parseNonNegativeNumber(input.bottleCarbs)
  const chewCount = parseNonNegativeNumber(input.chewCount)
  const chewCarbs = parseNonNegativeNumber(input.chewCarbs)
  const totalCarbs = Math.round(gelCount * gelCarbs + bottleCount * bottleCarbs + chewCount * chewCarbs)
  const difference = targetCarbs != null ? totalCarbs - targetCarbs : null
  const items = [
    productPlanItem('Gel', gelCount, gelCarbs),
    productPlanItem('Flaskor sportdryck', bottleCount, bottleCarbs),
    productPlanItem('Chews / bars', chewCount, chewCarbs),
  ]
  const marginLabel = difference == null
    ? '-'
    : difference >= 20
      ? text(locale, 'God', 'Good')
      : difference >= 0
        ? 'Tight'
        : text(locale, 'Saknas', 'Missing')

  return {
    targetCarbs,
    gelCount,
    gelCarbs,
    bottleCount,
    bottleCarbs,
    chewCount,
    chewCarbs,
    totalCarbs,
    difference,
    marginLabel,
    items,
    feedback: buildProductPlanFeedback(targetCarbs, totalCarbs, difference, locale),
    note: buildProductPlanShortNote(gelCount, gelCarbs, bottleCount, bottleCarbs, chewCount, chewCarbs, locale),
  }
}

function productPlanItem(label: string, count: number, carbsPerItemG: number): RaceFuelingProductPlan['items'][number] {
  return {
    label,
    count,
    carbsPerItemG,
    totalCarbsG: Math.round(count * carbsPerItemG),
  }
}

function toStoredProductPlan(plan: ProductPlanSummary): RaceFuelingProductPlan {
  return {
    version: 1,
    targetCarbsG: plan.targetCarbs,
    totalCarbsG: plan.totalCarbs,
    differenceG: plan.difference,
    marginLabel: plan.marginLabel,
    items: plan.items,
    updatedAt: new Date().toISOString(),
  }
}

function buildProductPlanFeedback(targetCarbs: number | null, totalCarbs: number, difference: number | null, locale: AppLocale): string {
  if (targetCarbs == null) return text(locale, 'Sätt tävlingstid och rekommenderat intag för att jämföra produkterna mot planmålet.', 'Set race time and recommended intake to compare products against the plan target.')
  if (totalCarbs === 0) return text(locale, `Planmålet är ${targetCarbs} g. Lägg in produkterna atleten faktiskt tänker använda.`, `The plan target is ${targetCarbs} g. Enter the products the athlete actually plans to use.`)
  if (difference == null) return text(locale, 'Produktplanen är ifylld.', 'The product plan is filled in.')
  if (difference < 0) return text(locale, `Det saknas cirka ${Math.abs(difference)} g kolhydrater jämfört med planmålet. Lägg till extra gel, sportdryck eller langning.`, `About ${Math.abs(difference)} g carbohydrates are missing compared with the plan target. Add an extra gel, sports drink, or handoff.`)
  if (difference < 20) return text(locale, 'Produktplanen matchar planmålet, men marginalen är liten. Kontrollera stationer och reservprodukt.', 'The product plan matches the plan target, but the margin is small. Check aid stations and backup products.')
  return text(locale, 'Produktplanen täcker planmålet med marginal. Bestäm vilka produkter som är reserv och vilka som ska tas enligt timing.', 'The product plan covers the plan target with margin. Decide which products are backups and which are taken according to timing.')
}

function buildProductPlanShortNote(
  gelCount: number,
  gelCarbs: number,
  bottleCount: number,
  bottleCarbs: number,
  chewCount: number,
  chewCarbs: number,
  locale: AppLocale
): string {
  return [
    gelCount > 0 ? `${gelCount} gel ${text(locale, 'à', 'at')} ${gelCarbs} g` : null,
    bottleCount > 0 ? `${bottleCount} ${text(locale, 'flaskor sportdryck', 'sports drink bottles')} ${text(locale, 'à', 'at')} ${bottleCarbs} g` : null,
    chewCount > 0 ? `${chewCount} chews/bars ${text(locale, 'à', 'at')} ${chewCarbs} g` : null,
  ].filter(Boolean).join(', ')
}

function formatProductPlanNote(plan: ProductPlanSummary, locale: AppLocale): string {
  return [
    text(locale, 'Produktplan:', 'Product plan:'),
    plan.note || text(locale, 'Produkter ej valda ännu.', 'No products selected yet.'),
    text(locale, `Packat: ${plan.totalCarbs} g kolhydrater${plan.targetCarbs ? ` mot planmål ${plan.targetCarbs} g` : ''}.`, `Packed: ${plan.totalCarbs} g carbohydrates${plan.targetCarbs ? ` against plan target ${plan.targetCarbs} g` : ''}.`),
    plan.difference != null ? `${text(locale, 'Skillnad', 'Difference')}: ${formatSignedGrams(plan.difference)}.` : null,
  ].filter(Boolean).join('\n')
}

function parseNonNegativeNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function buildFuelingBuildUp(
  prescriptions: WorkoutPrescription[],
  raceTarget: number | null,
  locale: AppLocale
): {
  firstTarget: number | null
  peakTarget: number | null
  totalCount: number
  loggedCount: number
  progressPercent: number
  groups: Array<{ label: string; items: WorkoutPrescription[] }>
} {
  const sorted = [...prescriptions].sort((a, b) => {
    const dateA = a.workout.day.date ? new Date(a.workout.day.date).getTime() : Number.MAX_SAFE_INTEGER
    const dateB = b.workout.day.date ? new Date(b.workout.day.date).getTime() : Number.MAX_SAFE_INTEGER
    return dateA - dateB
  })
  const targets = sorted.map((item) => item.targetCarbsGPerHour)
  const peakTarget = targets.length > 0 ? Math.max(...targets) : null
  const loggedCount = sorted.filter((item) => item.workout.logs.some((log) => log.fuelingLog)).length
  const progressPercent = raceTarget && peakTarget
    ? Math.max(6, Math.min(100, Math.round((peakTarget / raceTarget) * 100)))
    : 0

  return {
    firstTarget: targets[0] ?? null,
    peakTarget,
    totalCount: sorted.length,
    loggedCount,
    progressPercent,
    groups: groupPrescriptionsByMonth(sorted, locale),
  }
}

function estimateCurrentGutTolerance(prescriptions: WorkoutPrescription[]): number | null {
  const toleratedValues = prescriptions
    .flatMap((prescription) => prescription.workout.logs)
    .map((log) => log.fuelingLog)
    .filter((log): log is NonNullable<typeof log> => Boolean(log))
    .filter((log) => (log.stomachRating ?? 0) >= 4 && (log.energyRating ?? 0) >= 3)
    .map((log) => log.actualCarbsGPerHour)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (toleratedValues.length === 0) return null
  return Math.max(...toleratedValues)
}

function groupPrescriptionsByMonth(prescriptions: WorkoutPrescription[], locale: AppLocale): Array<{ label: string; items: WorkoutPrescription[] }> {
  const groups = new Map<string, WorkoutPrescription[]>()

  for (const prescription of prescriptions) {
    const date = prescription.workout.day.date ? new Date(prescription.workout.day.date) : null
    const label = date
      ? date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { month: 'long', year: 'numeric' })
      : text(locale, 'Datum saknas', 'Date missing')
    groups.set(label, [...(groups.get(label) ?? []), prescription])
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function weeksUntilDate(value: string): number | null {
  const targetDate = new Date(value)
  if (Number.isNaN(targetDate.getTime())) return null

  const days = differenceInDays(targetDate, new Date())
  return days > 0 ? Math.ceil(days / 7) : null
}

function differenceInDays(later: Date, earlier: Date): number {
  const dayMs = 24 * 60 * 60 * 1000
  const laterDay = new Date(later)
  const earlierDay = new Date(earlier)
  laterDay.setHours(0, 0, 0, 0)
  earlierDay.setHours(0, 0, 0, 0)
  return Math.round((laterDay.getTime() - earlierDay.getTime()) / dayMs)
}

function PackItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-orange-50/70 p-4 dark:bg-orange-900/10 dark:border-orange-900/30">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function NoteBlock({ title, value, locale }: { title: string; value: string | null; locale: AppLocale }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{value || text(locale, 'Ingen anteckning ännu.', 'No note yet.')}</p>
    </div>
  )
}

function buildChecklist(plan: RaceDayPlan | null, locale: AppLocale): string[] {
  const items = [
    text(locale, 'Testa exakt samma produkter på minst ett långpass.', 'Test the exact same products during at least one long session.'),
    text(locale, 'Bestäm var produkterna ska ligga: ficka, bälte, flaskor eller langning.', 'Decide where products go: pocket, belt, bottles, or handoff.'),
    text(locale, 'Skriv ned första tre intagen och följ rytmen tidigt i loppet.', 'Write down the first three intakes and follow the rhythm early in the race.'),
    text(locale, 'Planera vätska efter väder, törst och tillgängliga stationer.', 'Plan fluids based on weather, thirst, and available stations.'),
  ]

  if (plan?.gelEquivalentCount) {
    items.unshift(text(locale, `Packa minst ${plan.gelEquivalentCount} gel eller motsvarande mängd kolhydrater.`, `Pack at least ${plan.gelEquivalentCount} gels or an equivalent amount of carbohydrates.`))
  }

  if (plan?.bottleMixCount) {
    items.push(text(locale, `Förbered sportdryck motsvarande cirka ${plan.bottleMixCount} flaskor à 40 g kolhydrater.`, `Prepare sports drink equivalent to about ${plan.bottleMixCount} bottles at 40 g carbohydrates.`))
  }

  return items
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function formatGramHour(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g/h`
}

function formatRating(value: number | null | undefined): string {
  return value == null ? '-' : `${value}/5`
}

function formatGrams(value: number | null): string {
  return value == null ? '-' : `${Math.round(value)} g`
}

function formatSignedGrams(value: number | null): string {
  if (value == null) return '-'
  if (value > 0) return `+${value} g`
  return `${value} g`
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

function toDateInputValue(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function statusLabel(status: string, locale: AppLocale): string {
  if (status === 'APPROVED') return text(locale, 'Godkänd', 'Approved')
  if (status === 'ARCHIVED') return text(locale, 'Arkiverad', 'Archived')
  return text(locale, 'Utkast', 'Draft')
}

function SyncResultNotice({ count, locale }: { count: number; locale: AppLocale }) {
  const copy = buildFuelingSyncResultCopy(count)
  const hasUpdates = copy.tone === 'success'
  return (
    <div className={`rounded-lg border p-3 text-sm ${
      hasUpdates
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-100'
        : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-100'
    }`}>
      <p className="font-medium">
        {locale === 'sv' ? copy.titleSv : copy.tone === 'success' ? `${count} upcoming sessions updated.` : 'No upcoming sessions were updated.'}
      </p>
      <p className="mt-1 text-xs opacity-80">
        {locale === 'sv' ? copy.bodySv : copy.tone === 'success' ? 'The athlete now sees carb targets on sessions that match the plan.' : 'There are no active upcoming sessions that match length, sport, and intensity yet.'}
      </p>
    </div>
  )
}

function confidenceLabel(confidence: string, locale: AppLocale): string {
  if (confidence === 'HIGH') return text(locale, 'Hög säkerhet', 'High confidence')
  if (confidence === 'MEDIUM') return text(locale, 'Medel säkerhet', 'Medium confidence')
  return text(locale, 'Låg säkerhet', 'Low confidence')
}

function raceDayNote(note: string, locale: AppLocale): string {
  if (locale === 'sv') return note
  const notes: Record<string, string> = {
    'Testa alltid planen på långpass innan tävling.': 'Always test the plan during long sessions before race day.',
    'Drick efter törst och väder, men undvik att skölja ned stora kolhydratdoser utan vätska.': 'Drink according to thirst and weather, but avoid taking large carbohydrate doses without fluid.',
    'Vid över 60 g/timme bör produkterna innehålla flera kolhydrattyper, till exempel glukos/fruktos.': 'Above 60 g/hour, products should include multiple carbohydrate types, such as glucose/fructose.',
    'För lopp över tre timmar: planera även salt/vätska separat utifrån värme och svettförlust.': 'For races over three hours, also plan sodium/fluid separately based on heat and sweat loss.',
  }
  return notes[note] ?? note
}

function formatProductSummary(summary: string | null | undefined, locale: AppLocale): string | null {
  if (!summary) return null
  return locale === 'en' ? summary.replaceAll(' à ', ' at ') : summary
}

function localizeRecommendation(
  recommendation: ReturnType<typeof buildFuelingCoachingRecommendation>,
  locale: AppLocale
): { label: string; action: string; reason: string; product: string | null } {
  if (locale === 'sv') {
    return {
      label: recommendation.labelSv,
      action: recommendation.actionSv,
      reason: recommendation.reasonSv,
      product: recommendation.productSv,
    }
  }

  const nextTarget = recommendation.nextTargetGPerHour
  const product = recommendation.productSv
    ?.replace('Produkt/timing att justera:', 'Product/timing to adjust:')
    .replace('Fungerande produkter att repetera:', 'Working products to repeat:')
    .replace('Produkter från senaste logg:', 'Products from latest log:')
    .replaceAll(' à ', ' at ') ?? null

  switch (recommendation.status) {
    case 'NO_DATA':
      return { label: 'No clear recommendation yet', action: 'Log carbohydrates, gut feel, and energy after the next long session.', reason: 'The recommendation needs at least one fueling log.', product }
    case 'REDUCE':
      return { label: 'Back off next session', action: nextTarget ? `Next long session: aim for ${nextTarget} g/h and spread intake more evenly.` : recommendation.actionSv, reason: 'Gut response was low, so the target should be stabilized before increasing again.', product }
    case 'HOLD':
      return { label: recommendation.labelSv === 'Bygg upp till planen' ? 'Build up to the plan' : 'Hold level', action: nextTarget ? `Next long session: repeat ${nextTarget} g/h before increasing.` : recommendation.actionSv, reason: 'Gut response was acceptable but not stable enough for a clear progression.', product }
    case 'RACE_READY':
      return { label: 'Ready for race target', action: nextTarget ? `Keep the race target at ${nextTarget} g/h and repeat with race products.` : recommendation.actionSv, reason: 'Multiple sessions show stable gut feel and energy close to target intake.', product }
    case 'PROGRESS':
      return { label: 'Increase carefully', action: nextTarget ? `Next long session: test ${nextTarget} g/h if the session is race-like.` : recommendation.actionSv, reason: 'The latest log shows stable gut feel and energy.', product }
    case 'ON_TRACK':
    default:
      return { label: 'Follow up', action: nextTarget ? `Next long session: continue with ${nextTarget} g/h and log the response.` : recommendation.actionSv, reason: 'There is data, but not a clear enough signal to increase or reduce.', product }
  }
}
