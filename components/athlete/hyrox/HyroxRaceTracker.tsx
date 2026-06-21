'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, ChevronDown, FilePenLine, Gauge, Import, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useLocale } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  buildHyroxSegmentDefinitions,
  type HyroxRaceType,
  type HyroxSegmentDefinition,
} from '@/lib/hyrox/race-evaluation'

type AppLocale = 'en' | 'sv'

type JsonRecord = Record<string, unknown>

type HyroxSummary = {
  name?: string
  durationSec?: number
  hyrox?: {
    status?: string
    roxzoneEnabled?: boolean
    expectedLapCount?: number
    performance?: {
      hyroxTotalTime?: number
      roxzoneTime?: number
    }
  }
}

type HyroxFatigueSummary = {
  level?: string
  score?: number
  paceDropPct?: number
  highIntensitySeconds?: number
}

type HyroxEvaluation = {
  id: string
  startedAt: string
  completedAt?: string | null
  summary: HyroxSummary
  segmentEvaluations: ReviewSegment[]
  zoneSummary?: JsonRecord
  fatigueSummary?: HyroxFatigueSummary
  confidence?: string
  primarySource?: string
}

type GarminCandidate = {
  id: string
  garminActivityId: string
  name?: string | null
  type?: string | null
  mappedType?: string | null
  startDate: string
  duration?: number | null
  elapsedTime?: number | null
  distance?: number | null
  calories?: number | null
  averageHeartrate?: number | null
  maxHeartrate?: number | null
  deviceName?: string | null
  lapCount: number
  hasHrStream: boolean
  alreadyImported: boolean
}

type ReviewSegment = {
  segmentIndex: number
  label: string
  planned: {
    durationSec?: number
    distanceMeters?: number
    captureMethod?: string
    equipmentKey?: string
    [key: string]: unknown
  }
  actual: {
    durationSec?: number
    avgHr?: number
    maxHr?: number
    avgPaceSecPerKm?: number
    calories?: number
    zoneSeconds?: Record<1 | 2 | 3 | 4 | 5, number>
    [key: string]: unknown
  }
  compliance?: JsonRecord
}

function appLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function copy(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

function formatSeconds(value?: number | null): string {
  if (!value || value <= 0) return '-'
  const seconds = Math.round(value)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatDate(value: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function definitionToSegment(definition: HyroxSegmentDefinition, durationSec = 0): ReviewSegment {
  return {
    segmentIndex: definition.sequence,
    label: definition.label,
    planned: {
      durationSec,
      distanceMeters: definition.kind === 'RUN' ? 1000 : definition.distanceMeters,
      captureMethod: definition.kind,
      equipmentKey: definition.stationKey,
    },
    actual: {
      durationSec,
      zoneSeconds: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    compliance: { intensityHit: null, targetHit: null, score: durationSec > 0 ? 100 : 0 },
  }
}

function reindexSegments(segments: ReviewSegment[]): ReviewSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    segmentIndex: index + 1,
  }))
}

function segmentDefinitionValue(segment: ReviewSegment): string {
  const method = segment.planned?.captureMethod
  const equipment = segment.planned?.equipmentKey
  if (method === 'RUN') return `RUN:${segment.label}`
  if (method === 'ROXZONE') return `ROXZONE:${segment.label}`
  if (method === 'STATION') return `STATION:${equipment || segment.label}`
  return `CUSTOM:${segment.label}`
}

interface HyroxRaceTrackerProps {
  gender?: 'MALE' | 'FEMALE'
}

export function HyroxRaceTracker({ gender }: HyroxRaceTrackerProps) {
  const locale = appLocale(useLocale())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluations, setEvaluations] = useState<HyroxEvaluation[]>([])
  const [garminCandidates, setGarminCandidates] = useState<GarminCandidate[]>([])
  const [guideOpen, setGuideOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [raceType, setRaceType] = useState<HyroxRaceType>('SIMULATION')
  const [roxzoneEnabled, setRoxzoneEnabled] = useState(true)
  const [division, setDivision] = useState(gender === 'FEMALE' ? 'WOMEN_OPEN' : 'MEN_OPEN')
  const [selectedGarminId, setSelectedGarminId] = useState('')
  const [reviewEvaluation, setReviewEvaluation] = useState<HyroxEvaluation | null>(null)
  const [reviewSegments, setReviewSegments] = useState<ReviewSegment[]>([])
  const [eventName, setEventName] = useState('')
  const [athleteNotes, setAthleteNotes] = useState('')

  const segmentOptions = useMemo(() => buildHyroxSegmentDefinitions(roxzoneEnabled), [roxzoneEnabled])
  const latestEvaluation = evaluations[0]
  const latestPerformance = latestEvaluation?.summary?.hyrox?.performance

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/athlete/hyrox/evaluations', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed')
      setEvaluations(json.data.evaluations || [])
      setGarminCandidates(json.data.garminCandidates || [])
    } catch {
      setError(copy(locale, 'Kunde inte läsa HYROX-data.', 'Could not load HYROX data.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openGuide = (type: HyroxRaceType) => {
    setRaceType(type)
    setGuideOpen(true)
  }

  const openImport = () => {
    setImportOpen(true)
    if (!selectedGarminId && garminCandidates.length > 0) {
      setSelectedGarminId(garminCandidates[0]?.id ?? '')
    }
  }

  const openReview = (evaluation: HyroxEvaluation) => {
    setReviewEvaluation(evaluation)
    setReviewSegments(reindexSegments(evaluation.segmentEvaluations || []))
    setEventName(evaluation.summary?.name || '')
    setAthleteNotes('')
    setRoxzoneEnabled(Boolean(evaluation.summary?.hyrox?.roxzoneEnabled))
    setReviewOpen(true)
  }

  const handleImport = async () => {
    if (!selectedGarminId) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/athlete/hyrox/import-garmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garminActivityId: selectedGarminId,
          roxzoneEnabled,
          raceType,
          division,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed')
      const imported = json.data as HyroxEvaluation
      setImportOpen(false)
      await fetchData()
      openReview(imported)
    } catch {
      setError(copy(locale, 'Importen misslyckades.', 'Import failed.'))
    } finally {
      setSaving(false)
    }
  }

  const saveSegments = async () => {
    if (!reviewEvaluation) return null
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/athlete/hyrox/evaluations/${reviewEvaluation.id}/segments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: reviewSegments }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed')
      const updated = json.data as HyroxEvaluation
      setReviewEvaluation(updated)
      setReviewSegments(updated.segmentEvaluations || [])
      await fetchData()
      return updated
    } catch {
      setError(copy(locale, 'Kunde inte spara segmenten.', 'Could not save segments.'))
      throw new Error('segment_save_failed')
    } finally {
      setSaving(false)
    }
  }

  const confirmResult = async () => {
    if (!reviewEvaluation) return
    setSaving(true)
    setError(null)
    try {
      await saveSegments()
      const response = await fetch(`/api/athlete/hyrox/evaluations/${reviewEvaluation.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, athleteNotes }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed')
      setReviewOpen(false)
      await fetchData()
    } catch {
      setError(copy(locale, 'Kunde inte bekräfta resultatet.', 'Could not confirm result.'))
    } finally {
      setSaving(false)
    }
  }

  const changeSegmentDefinition = (index: number, value: string) => {
    const definition = segmentOptions.find((option) => {
      if (option.kind === 'RUN') return value === `RUN:${option.label}`
      if (option.kind === 'ROXZONE') return value === `ROXZONE:${option.label}`
      return value === `STATION:${option.stationKey || option.label}`
    })
    if (!definition) return

    setReviewSegments((segments) => reindexSegments(segments.map((segment, segmentIndex) => {
      if (segmentIndex !== index) return segment
      return {
        ...segment,
        label: definition.label,
        planned: {
          ...segment.planned,
          distanceMeters: definition.kind === 'RUN' ? 1000 : definition.distanceMeters,
          captureMethod: definition.kind,
          equipmentKey: definition.stationKey,
        },
      }
    })))
  }

  const mergeWithPrevious = (index: number) => {
    if (index <= 0) return
    setReviewSegments((segments) => {
      const copySegments = [...segments]
      const current = copySegments[index]
      const previous = copySegments[index - 1]
      if (!current || !previous) return segments

      copySegments[index - 1] = {
        ...previous,
        actual: {
          ...previous.actual,
          durationSec: (previous.actual.durationSec ?? 0) + (current.actual.durationSec ?? 0),
          calories: (previous.actual.calories ?? 0) + (current.actual.calories ?? 0),
          maxHr: Math.max(previous.actual.maxHr ?? 0, current.actual.maxHr ?? 0) || previous.actual.maxHr || current.actual.maxHr,
        },
      }
      copySegments.splice(index, 1)
      return reindexSegments(copySegments)
    })
  }

  const insertMissingAfter = (index: number) => {
    const nextDefinition = segmentOptions[Math.min(index + 1, segmentOptions.length - 1)]
    if (!nextDefinition) return
    setReviewSegments((segments) => {
      const copySegments = [...segments]
      copySegments.splice(index + 1, 0, definitionToSegment(nextDefinition, 0))
      return reindexSegments(copySegments)
    })
  }

  const removeSegment = (index: number) => {
    setReviewSegments((segments) => reindexSegments(segments.filter((_, segmentIndex) => segmentIndex !== index)))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-orange-500" />
                {copy(locale, 'HYROX race tracker', 'HYROX race tracker')}
              </CardTitle>
              <CardDescription>
                {copy(locale, 'Importera Garmin-varv och spara stationstider, löpningar och Roxzone.', 'Import Garmin laps and save station times, runs, and Roxzone.')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openGuide('RACE')}>
                <Play className="mr-2 h-4 w-4" />
                {copy(locale, 'Starta race', 'Start race')}
              </Button>
              <Button variant="outline" onClick={() => openGuide('SIMULATION')}>
                <Activity className="mr-2 h-4 w-4" />
                {copy(locale, 'Starta simulering', 'Start simulation')}
              </Button>
              <Button onClick={openImport}>
                <Import className="mr-2 h-4 w-4" />
                {copy(locale, 'Importera Garmin', 'Import Garmin')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {copy(locale, 'Läser HYROX-data...', 'Loading HYROX data...')}
            </div>
          ) : latestEvaluation ? (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{copy(locale, 'Senaste', 'Latest')}</p>
                <p className="font-semibold">{latestEvaluation.summary?.name || 'HYROX'}</p>
                <p className="text-sm text-muted-foreground">{formatDate(latestEvaluation.startedAt, locale)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{copy(locale, 'Total tid', 'Total time')}</p>
                <p className="font-semibold">{formatSeconds(latestPerformance?.hyroxTotalTime || latestEvaluation.summary?.durationSec)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Roxzone</p>
                <p className="font-semibold">{formatSeconds(latestPerformance?.roxzoneTime)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{copy(locale, 'Status', 'Status')}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={latestEvaluation.summary?.hyrox?.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                    {latestEvaluation.summary?.hyrox?.status || 'DRAFT'}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => openReview(latestEvaluation)}>
                    <FilePenLine className="mr-1 h-4 w-4" />
                    {copy(locale, 'Granska', 'Review')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {copy(locale, 'Inga HYROX-race eller simuleringar importerade ännu.', 'No HYROX races or simulations imported yet.')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {raceType === 'RACE'
                ? copy(locale, 'Starta HYROX race', 'Start HYROX race')
                : copy(locale, 'Starta HYROX simulering', 'Start HYROX simulation')}
            </DialogTitle>
            <DialogDescription>
              {copy(locale, 'Starta passet på Garmin-klockan och tryck lap vid varje gräns.', 'Start the workout on the Garmin watch and press lap at each boundary.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>{copy(locale, 'Roxzone-timer', 'Roxzone timers')}</Label>
                <p className="text-sm text-muted-foreground">
                  {copy(locale, 'På: Run → Roxzone → Station. Av: Run → Station.', 'On: Run → Roxzone → Station. Off: Run → Station.')}
                </p>
              </div>
              <Switch checked={roxzoneEnabled} onCheckedChange={setRoxzoneEnabled} />
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{copy(locale, 'Procedur', 'Procedure')}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>{copy(locale, 'Välj HYROX/running/cardio på Garmin och starta när passet börjar.', 'Choose HYROX/running/cardio on Garmin and start when the session begins.')}</li>
                <li>{copy(locale, 'Tryck lap efter varje 1 km löpning.', 'Press lap after each 1 km run.')}</li>
                <li>{roxzoneEnabled
                  ? copy(locale, 'Tryck lap när Roxzone är klar och igen när stationen är klar.', 'Press lap when Roxzone is done and again when the station is done.')
                  : copy(locale, 'Tryck lap när stationen är klar.', 'Press lap when the station is done.')}
                </li>
                <li>{copy(locale, 'Synka Garmin och importera aktiviteten här.', 'Sync Garmin and import the activity here.')}</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuideOpen(false)}>{copy(locale, 'Stäng', 'Close')}</Button>
            <Button onClick={() => { setGuideOpen(false); openImport() }}>
              <ChevronDown className="mr-2 h-4 w-4" />
              {copy(locale, 'Importera efteråt', 'Import after')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy(locale, 'Importera Garmin HYROX', 'Import Garmin HYROX')}</DialogTitle>
            <DialogDescription>
              {copy(locale, 'Välj aktiviteten från klockan och hur lap-knapparna användes.', 'Choose the watch activity and how lap presses were used.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{copy(locale, 'Garmin-aktivitet', 'Garmin activity')}</Label>
              <Select value={selectedGarminId} onValueChange={setSelectedGarminId}>
                <SelectTrigger>
                  <SelectValue placeholder={copy(locale, 'Välj aktivitet', 'Select activity')} />
                </SelectTrigger>
                <SelectContent>
                  {garminCandidates.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.name || activity.type || 'Garmin'} · {formatDate(activity.startDate, locale)} · {activity.lapCount} laps
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy(locale, 'Typ', 'Type')}</Label>
              <Select value={raceType} onValueChange={(value) => setRaceType(value as HyroxRaceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMULATION">{copy(locale, 'Simulering', 'Simulation')}</SelectItem>
                  <SelectItem value="RACE">{copy(locale, 'Race', 'Race')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy(locale, 'Division', 'Division')}</Label>
              <Input value={division} onChange={(event) => setDivision(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
              <div>
                <Label>{copy(locale, 'Med Roxzone-segment', 'With Roxzone segments')}</Label>
                <p className="text-sm text-muted-foreground">
                  {copy(locale, 'Förväntar 24 lap-segment istället för 16.', 'Expects 24 lap segments instead of 16.')}
                </p>
              </div>
              <Switch checked={roxzoneEnabled} onCheckedChange={setRoxzoneEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>{copy(locale, 'Avbryt', 'Cancel')}</Button>
            <Button onClick={handleImport} disabled={saving || !selectedGarminId}>
              <Import className="mr-2 h-4 w-4" />
              {copy(locale, 'Skapa granskning', 'Create review')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy(locale, 'Granska HYROX-segment', 'Review HYROX segments')}</DialogTitle>
            <DialogDescription>
              {copy(locale, 'Rätta eventuella lap-misstag innan resultatet sparas till HYROX-historiken.', 'Fix any lap mistakes before saving the result to HYROX history.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{copy(locale, 'Namn', 'Name')}</Label>
                <Input value={eventName} onChange={(event) => setEventName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{copy(locale, 'Segment', 'Segments')}</Label>
                <div className="rounded-md border px-3 py-2 text-sm">
                  {reviewSegments.length} / {reviewEvaluation?.summary?.hyrox?.expectedLapCount ?? reviewSegments.length}
                </div>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{copy(locale, 'Segment', 'Segment')}</TableHead>
                    <TableHead>{copy(locale, 'Tid', 'Time')}</TableHead>
                    <TableHead>{copy(locale, 'Puls', 'HR')}</TableHead>
                    <TableHead className="text-right">{copy(locale, 'Åtgärd', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewSegments.map((segment, index) => (
                    <TableRow key={`${segment.segmentIndex}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {(() => {
                          const currentValue = segmentDefinitionValue(segment)
                          const optionValues = segmentOptions.map((option) => (
                            option.kind === 'RUN'
                              ? `RUN:${option.label}`
                              : option.kind === 'ROXZONE'
                                ? `ROXZONE:${option.label}`
                                : `STATION:${option.stationKey || option.label}`
                          ))
                          const hasCurrentOption = optionValues.includes(currentValue)
                          return (
                        <Select value={currentValue} onValueChange={(value) => changeSegmentDefinition(index, value)}>
                          <SelectTrigger className="min-w-[190px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {!hasCurrentOption && (
                              <SelectItem value={currentValue}>{segment.label}</SelectItem>
                            )}
                            {segmentOptions.map((option) => {
                              const value = option.kind === 'RUN'
                                ? `RUN:${option.label}`
                                : option.kind === 'ROXZONE'
                                  ? `ROXZONE:${option.label}`
                                  : `STATION:${option.stationKey || option.label}`
                              return (
                                <SelectItem key={`${option.sequence}-${value}`} value={value}>
                                  {option.label}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                          )
                        })()}
                      </TableCell>
                      <TableCell>{formatSeconds(segment.actual?.durationSec)}</TableCell>
                      <TableCell>{segment.actual?.avgHr ? `${Math.round(segment.actual.avgHr)} / ${Math.round(segment.actual.maxHr ?? segment.actual.avgHr)}` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={copy(locale, 'Lägg in missat segment efter', 'Insert missed segment after')} onClick={() => insertMissingAfter(index)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title={copy(locale, 'Slå ihop med föregående', 'Merge with previous')} disabled={index === 0} onClick={() => mergeWithPrevious(index)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title={copy(locale, 'Ta bort extra lap', 'Remove extra lap')} onClick={() => removeSegment(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-2">
              <Label>{copy(locale, 'Kommentar', 'Note')}</Label>
              <Textarea value={athleteNotes} onChange={(event) => setAthleteNotes(event.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>{copy(locale, 'Stäng', 'Close')}</Button>
            <Button variant="outline" onClick={saveSegments} disabled={saving}>{copy(locale, 'Spara ändringar', 'Save changes')}</Button>
            <Button onClick={confirmResult} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {copy(locale, 'Bekräfta resultat', 'Confirm result')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
