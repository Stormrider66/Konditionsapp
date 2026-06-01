'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  ChevronDown,
  Dumbbell,
  Gauge,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Timer as TimerIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LoggedSetPayload, PreviewExercise, PreviewSetLog } from './types'
import type { UseRestTimerResult } from './useRestTimer'
import { useLocale } from '@/i18n/client'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

interface ExerciseLogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: PreviewExercise | null
  restTimer: UseRestTimerResult
  onLogSet: (payload: LoggedSetPayload) => Promise<PreviewSetLog>
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function parseTargetReps(reps: number | string): number {
  if (typeof reps === 'number') return reps
  const match = reps.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 8
}

function formatLoggedMetric(value: number | undefined, unit: string, decimals: number) {
  if (value == null || !Number.isFinite(value)) return null
  return `${value.toFixed(decimals)} ${unit}`
}

export function ExerciseLogSheet({
  open,
  onOpenChange,
  exercise,
  restTimer,
  onLogSet,
}: ExerciseLogSheetProps) {
  const locale = getAppLocale(useLocale())
  const [localLogs, setLocalLogs] = useState<PreviewSetLog[]>([])
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(0)
  const [rpe, setRpe] = useState<number>(6)
  const [rpeTouched, setRpeTouched] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [meanVelocityValue, setMeanVelocityValue] = useState('')
  const [peakVelocityValue, setPeakVelocityValue] = useState('')
  const [meanPowerValue, setMeanPowerValue] = useState('')
  const [peakPowerValue, setPeakPowerValue] = useState('')
  const [meanTimeValue, setMeanTimeValue] = useState('')
  const [peakTimeValue, setPeakTimeValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!exercise) return
    setLocalLogs(exercise.setLogs)
    setWeight(exercise.weight ?? exercise.setLogs.at(-1)?.weight ?? 0)
    setReps(parseTargetReps(exercise.repsTarget))
    setRpe(6)
    setRpeTouched(false)
    setShowMetrics(false)
    setMeanVelocityValue('')
    setPeakVelocityValue('')
    setMeanPowerValue('')
    setPeakPowerValue('')
    setMeanTimeValue('')
    setPeakTimeValue('')
  }, [exercise])

  const nextSetNumber = localLogs.length + 1
  const allSetsDone = exercise ? nextSetNumber > exercise.sets : false
  const restActiveForThis =
    exercise && restTimer.active?.exerciseId === exercise.exerciseId
      ? restTimer.active
      : null

  const targetRepsText = useMemo(() => {
    if (!exercise) return ''
    return typeof exercise.repsTarget === 'number'
      ? String(exercise.repsTarget)
      : exercise.repsTarget
  }, [exercise])

  async function handleLog() {
    if (!exercise || isSaving) return
    setIsSaving(true)
    try {
      const payload: LoggedSetPayload = {
        exerciseId: exercise.exerciseId,
        setNumber: nextSetNumber,
        weight,
        repsCompleted: reps,
        repsTarget: parseTargetReps(exercise.repsTarget),
      }
      if (rpeTouched) payload.rpe = rpe
      const assignMetric = (
        raw: string,
        field: keyof Pick<
          LoggedSetPayload,
          'meanVelocity' | 'peakVelocity' | 'meanPower' | 'peakPower' | 'meanTime' | 'peakTime'
        >,
      ) => {
        const parsed = parseFloat(raw)
        if (!Number.isNaN(parsed) && parsed > 0) payload[field] = parsed
      }
      assignMetric(meanVelocityValue, 'meanVelocity')
      assignMetric(peakVelocityValue, 'peakVelocity')
      assignMetric(meanPowerValue, 'meanPower')
      assignMetric(peakPowerValue, 'peakPower')
      assignMetric(meanTimeValue, 'meanTime')
      assignMetric(peakTimeValue, 'peakTime')
      const saved = await onLogSet(payload)
      setLocalLogs((prev) => [...prev, saved])
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
      // Reset metric fields for next set; keep weight/reps as prefill.
      setMeanVelocityValue('')
      setPeakVelocityValue('')
      setMeanPowerValue('')
      setPeakPowerValue('')
      setMeanTimeValue('')
      setPeakTimeValue('')
      // Auto-start rest timer for this exercise unless this was the final set.
      if (nextSetNumber < exercise.sets && exercise.restSeconds > 0) {
        restTimer.start({
          exerciseId: exercise.exerciseId,
          setNumber: nextSetNumber,
          totalSeconds: exercise.restSeconds,
        })
      } else if (nextSetNumber >= exercise.sets) {
        restTimer.skip()
      }
    } finally {
      setIsSaving(false)
    }
  }

  function handleDone() {
    restTimer.skip()
    onOpenChange(false)
  }

  if (!exercise) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[92vh]" />
      </Sheet>
    )
  }

  const heroImage = exercise.imageUrls?.[0]
  const exerciseName = getExerciseDisplayName(exercise, locale)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl p-0 sm:max-w-none"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {heroImage ? (
              <div className="relative w-full overflow-hidden bg-background">
                <img
                  src={heroImage}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                />
                <img
                  src={heroImage}
                  alt={exerciseName}
                  className="relative mx-auto block h-auto max-h-[60vh] w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-background">
                <Dumbbell className="h-20 w-20 text-primary/30" strokeWidth={1.25} />
              </div>
            )}

            <SheetHeader className="border-b px-4 pb-4 pt-3 text-left sm:px-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {text(locale, 'Set', 'Set')} {Math.min(nextSetNumber, exercise.sets)} {text(locale, 'av', 'of')} {exercise.sets}
                </Badge>
                {exercise.tempo && (
                  <Badge variant="outline" className="text-[10px]">
                    Tempo {exercise.tempo}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl">
                {exerciseName}
              </SheetTitle>
              <SheetDescription>
                {text(locale, 'Mål', 'Target')}: {exercise.sets} × {targetRepsText}
                {exercise.weight ? ` · ${exercise.weight} kg` : ''} · {text(locale, 'vila', 'rest')}{' '}
                {exercise.restSeconds}s
              </SheetDescription>
              {exercise.notes && (
                <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  {exercise.notes}
                </p>
              )}
            </SheetHeader>

            <div className="px-4 py-4 sm:px-6">
            {localLogs.length > 0 && (
              <div className="mb-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {text(locale, 'Loggade set', 'Logged sets')}
                </p>
                <ul className="divide-y rounded-lg border bg-card">
                  {localLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center justify-between gap-3 sm:block">
                        <span className="font-medium">Set {log.setNumber}</span>
                        <span className="tabular-nums text-muted-foreground sm:hidden">
                          {log.weight} kg × {log.repsCompleted}
                          {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <span className="hidden tabular-nums text-muted-foreground sm:inline">
                          {log.weight} kg × {log.repsCompleted}
                          {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
                        </span>
                        <LoggedSetMetric label="MV" value={formatLoggedMetric(log.meanVelocity, 'm/s', 2)} />
                        <LoggedSetMetric label="PV" value={formatLoggedMetric(log.peakVelocity, 'm/s', 2)} />
                        <LoggedSetMetric label="MP" value={formatLoggedMetric(log.meanPower, 'W', 0)} />
                        <LoggedSetMetric label="PP" value={formatLoggedMetric(log.peakPower, 'W', 0)} />
                        <LoggedSetMetric label="MT" value={formatLoggedMetric(log.meanTime, 's', 2)} />
                        <LoggedSetMetric label="PT" value={formatLoggedMetric(log.peakTime, 's', 2)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {restActiveForThis ? (
              <RestPanel restTimer={restTimer} locale={locale} />
            ) : allSetsDone ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="font-medium">{text(locale, 'Alla set klara!', 'All sets done!')}</p>
                <p className="text-xs text-muted-foreground">
                  {text(locale, 'Stäng för att gå tillbaka till passet.', 'Close to return to the workout.')}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">{text(locale, 'Belastning', 'Load')}</Label>
                  <NumberStepper
                    value={weight}
                    onChange={setWeight}
                    step={2.5}
                    unit="kg"
                    decimals
                  />
                  <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                    {[-5, -1, 1, 5].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setWeight((v) => Math.max(0, v + d))}
                      >
                        {d > 0 ? `+${d}` : d}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    {text(locale, 'Repetitioner', 'Reps')}{' '}
                    <span className="text-muted-foreground">({text(locale, 'mål', 'target')}: {targetRepsText})</span>
                  </Label>
                  <NumberStepper value={reps} onChange={setReps} step={1} unit="reps" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">RPE</Label>
                    <Badge
                      className={cn(
                        'min-w-[34px] justify-center text-white',
                        !rpeTouched
                          ? 'bg-muted text-muted-foreground'
                          : rpe <= 5
                            ? 'bg-emerald-500'
                            : rpe <= 7
                              ? 'bg-yellow-500'
                              : rpe <= 8
                                ? 'bg-orange-500'
                                : 'bg-red-500',
                      )}
                    >
                      {rpeTouched ? rpe : '—'}
                    </Badge>
                  </div>
                  <Slider
                    value={[rpe]}
                    onValueChange={(v) => {
                      setRpe(v[0])
                      setRpeTouched(true)
                    }}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{text(locale, 'Lätt', 'Easy')}</span>
                    <span>Max</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setShowMetrics((v) => !v)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground"
                  >
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    {text(locale, 'Hastighet / kraft / tid', 'Velocity / power / time')}
                    <ChevronDown
                      className={cn(
                        'ml-auto h-4 w-4 text-muted-foreground transition-transform',
                        showMetrics && 'rotate-180',
                      )}
                    />
                  </button>
                  {showMetrics && (
                    <div className="space-y-4 border-t border-border px-3 pb-3 pt-3">
                      <MetricRow
                        label={text(locale, 'Hastighet', 'Velocity')}
                        unit="m/s"
                        meanValue={meanVelocityValue}
                        onMeanChange={setMeanVelocityValue}
                        peakValue={peakVelocityValue}
                        onPeakChange={setPeakVelocityValue}
                        placeholder="0.75"
                      />
                      <MetricRow
                        label={text(locale, 'Effekt', 'Power')}
                        unit="W"
                        meanValue={meanPowerValue}
                        onMeanChange={setMeanPowerValue}
                        peakValue={peakPowerValue}
                        onPeakChange={setPeakPowerValue}
                        placeholder="450"
                      />
                      <MetricRow
                        label={text(locale, 'Tid', 'Time')}
                        unit="s"
                        meanValue={meanTimeValue}
                        onMeanChange={setMeanTimeValue}
                        peakValue={peakTimeValue}
                        onPeakChange={setPeakTimeValue}
                        placeholder="1.8"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="border-t bg-background/95 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="h-12 flex-1 text-foreground"
                onClick={handleDone}
              >
                {allSetsDone ? text(locale, 'Klar', 'Done') : text(locale, 'Stäng', 'Close')}
              </Button>
              {!allSetsDone && !restActiveForThis && (
                <Button
                  className="h-12 flex-[2]"
                  onClick={handleLog}
                  disabled={isSaving || reps <= 0}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : justSaved ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : null}
                  {text(locale, 'Logga set', 'Log set')} {nextSetNumber}
                </Button>
              )}
              {restActiveForThis && (
                <Button
                  className="h-12 flex-[2]"
                  variant="secondary"
                  onClick={() => restTimer.skip()}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  {text(locale, 'Hoppa över vila', 'Skip rest')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function LoggedSetMetric({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
      {label} {value}
    </span>
  )
}

function RestPanel({ restTimer, locale }: { restTimer: UseRestTimerResult; locale: AppLocale }) {
  const { active, remaining, isPaused, togglePause, adjust } = restTimer
  if (!active) return null
  const pct = active.totalSeconds > 0 ? (remaining / active.totalSeconds) * 100 : 0
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const color = remaining <= 3 ? 'text-red-500' : remaining <= 10 ? 'text-yellow-500' : 'text-primary'
  const stroke = remaining <= 3 ? 'stroke-red-500' : remaining <= 10 ? 'stroke-yellow-500' : 'stroke-primary'
  const C = 2 * Math.PI * 90
  const offset = C - (pct / 100) * C
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative h-44 w-44">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" strokeWidth="8" className="stroke-muted" />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn('transition-all duration-500', stroke)}
            style={{ strokeDasharray: C, strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <TimerIcon className={cn('mb-1 h-5 w-5', color)} />
          <span className={cn('text-4xl font-bold tabular-nums', color)}>
            {mm}:{ss.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">{text(locale, 'Vila', 'Rest')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => adjust(-15)}>
          <Minus className="mr-1 h-3.5 w-3.5" />
          15s
        </Button>
        <Button variant="outline" size="icon" onClick={togglePause}>
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={() => adjust(30)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          30s
        </Button>
      </div>
    </div>
  )
}

function NumberStepper({
  value,
  onChange,
  step,
  unit,
  decimals = false,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  unit: string
  decimals?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-14 w-14 text-foreground"
        onClick={() => onChange(Math.max(0, value - step))}
      >
        <Minus className="h-5 w-5" />
      </Button>
      <div className="relative flex-1">
        <Input
          type="number"
          value={value === 0 ? '' : value}
          placeholder="0"
          inputMode={decimals ? 'decimal' : 'numeric'}
          step={decimals ? '0.5' : '1'}
          className="h-14 bg-muted/40 text-center text-2xl font-bold text-foreground placeholder:text-muted-foreground/50"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(0)
              return
            }
            const parsed = parseFloat(raw)
            onChange(Number.isNaN(parsed) ? 0 : parsed)
          }}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-14 w-14 text-foreground"
        onClick={() => onChange(value + step)}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  )
}

function MetricRow({
  label,
  unit,
  meanValue,
  onMeanChange,
  peakValue,
  onPeakChange,
  placeholder,
}: {
  label: string
  unit: string
  meanValue: string
  onMeanChange: (v: string) => void
  peakValue: string
  onPeakChange: (v: string) => void
  placeholder?: string
}) {
  const locale = getAppLocale(useLocale())
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {text(locale, 'Medel', 'Mean')}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={meanValue}
            onChange={(e) => onMeanChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 bg-muted/40 text-center font-semibold text-foreground"
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {text(locale, 'Topp', 'Peak')}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={peakValue}
            onChange={(e) => onPeakChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 bg-muted/40 text-center font-semibold text-foreground"
          />
        </div>
      </div>
    </div>
  )
}

export default ExerciseLogSheet
