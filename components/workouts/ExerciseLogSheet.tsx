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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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

interface ExerciseLogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: PreviewExercise | null
  restTimer: UseRestTimerResult
  onLogSet: (payload: LoggedSetPayload) => Promise<PreviewSetLog>
}

type MetricMode = 'avg' | 'top'

function parseTargetReps(reps: number | string): number {
  if (typeof reps === 'number') return reps
  const match = reps.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 8
}

export function ExerciseLogSheet({
  open,
  onOpenChange,
  exercise,
  restTimer,
  onLogSet,
}: ExerciseLogSheetProps) {
  const [localLogs, setLocalLogs] = useState<PreviewSetLog[]>([])
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(0)
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [showMetrics, setShowMetrics] = useState(false)
  const [velocityMode, setVelocityMode] = useState<MetricMode>('avg')
  const [powerMode, setPowerMode] = useState<MetricMode>('avg')
  const [velocityValue, setVelocityValue] = useState('')
  const [powerValue, setPowerValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [timeMode, setTimeMode] = useState<MetricMode>('avg')
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!exercise) return
    setLocalLogs(exercise.setLogs)
    setWeight(exercise.weight ?? exercise.setLogs.at(-1)?.weight ?? 0)
    setReps(parseTargetReps(exercise.repsTarget))
    setRpe(undefined)
    setShowMetrics(false)
    setVelocityValue('')
    setPowerValue('')
    setTimeValue('')
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
      if (rpe !== undefined) payload.rpe = rpe
      const velocity = parseFloat(velocityValue)
      if (!Number.isNaN(velocity) && velocity > 0) {
        if (velocityMode === 'avg') payload.meanVelocity = velocity
        else payload.peakVelocity = velocity
      }
      const power = parseFloat(powerValue)
      if (!Number.isNaN(power) && power > 0) {
        if (powerMode === 'avg') payload.meanPower = power
        else payload.peakPower = power
      }
      const time = parseFloat(timeValue)
      if (!Number.isNaN(time) && time > 0) {
        if (timeMode === 'avg') payload.meanTime = time
        else payload.peakTime = time
      }
      const saved = await onLogSet(payload)
      setLocalLogs((prev) => [...prev, saved])
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
      // Reset metric fields for next set; keep weight/reps as prefill.
      setVelocityValue('')
      setPowerValue('')
      setTimeValue('')
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl p-0 sm:max-w-none"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
          <div className="relative border-b">
            <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-background">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={exercise.nameSv || exercise.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Dumbbell className="h-20 w-20 text-primary/30" strokeWidth={1.25} />
                </div>
              )}
            </div>
            <SheetHeader className="px-4 pb-4 pt-3 text-left sm:px-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  Set {Math.min(nextSetNumber, exercise.sets)} av {exercise.sets}
                </Badge>
                {exercise.tempo && (
                  <Badge variant="outline" className="text-[10px]">
                    Tempo {exercise.tempo}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl">
                {exercise.nameSv || exercise.name}
              </SheetTitle>
              <SheetDescription>
                Mål: {exercise.sets} × {targetRepsText}
                {exercise.weight ? ` · ${exercise.weight} kg` : ''} · vila{' '}
                {exercise.restSeconds}s
              </SheetDescription>
              {exercise.notes && (
                <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  {exercise.notes}
                </p>
              )}
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {localLogs.length > 0 && (
              <div className="mb-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Loggade set
                </p>
                <ul className="divide-y rounded-lg border bg-card">
                  {localLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="font-medium">Set {log.setNumber}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {log.weight} kg × {log.repsCompleted}
                        {log.rpe != null ? ` · RPE ${log.rpe}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {restActiveForThis ? (
              <RestPanel restTimer={restTimer} />
            ) : allSetsDone ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="font-medium">Alla set klara!</p>
                <p className="text-xs text-muted-foreground">
                  Stäng för att gå tillbaka till passet.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Belastning</Label>
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
                    Repetitioner{' '}
                    <span className="text-muted-foreground">(mål: {targetRepsText})</span>
                  </Label>
                  <NumberStepper value={reps} onChange={setReps} step={1} unit="reps" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">RPE</Label>
                    <Badge
                      className={cn(
                        'min-w-[34px] justify-center text-white',
                        rpe === undefined
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
                      {rpe ?? '—'}
                    </Badge>
                  </div>
                  <Slider
                    value={rpe !== undefined ? [rpe] : []}
                    onValueChange={(v) => setRpe(v[0])}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Lätt</span>
                    <span>Max</span>
                  </div>
                </div>

                <Collapsible open={showMetrics} onOpenChange={setShowMetrics}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <Gauge className="mr-2 h-4 w-4" />
                      Hastighet / kraft / tid
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform',
                          showMetrics && 'rotate-180',
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <MetricRow
                      label="Hastighet"
                      unit="m/s"
                      value={velocityValue}
                      onChange={setVelocityValue}
                      mode={velocityMode}
                      onModeChange={setVelocityMode}
                      placeholder="0.75"
                    />
                    <MetricRow
                      label="Effekt"
                      unit="W"
                      value={powerValue}
                      onChange={setPowerValue}
                      mode={powerMode}
                      onModeChange={setPowerMode}
                      placeholder="450"
                    />
                    <MetricRow
                      label="Tid"
                      unit="s"
                      value={timeValue}
                      onChange={setTimeValue}
                      mode={timeMode}
                      onModeChange={setTimeMode}
                      placeholder="1.8"
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

          <div className="border-t bg-background/95 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={handleDone}>
                {allSetsDone ? 'Klar' : 'Stäng'}
              </Button>
              {!allSetsDone && !restActiveForThis && (
                <Button
                  className="h-12 flex-[2]"
                  onClick={handleLog}
                  disabled={isSaving || weight <= 0 || reps <= 0}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : justSaved ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : null}
                  Logga set {nextSetNumber}
                </Button>
              )}
              {restActiveForThis && (
                <Button
                  className="h-12 flex-[2]"
                  variant="secondary"
                  onClick={() => restTimer.skip()}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Hoppa över vila
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function RestPanel({ restTimer }: { restTimer: UseRestTimerResult }) {
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
          <span className="text-xs text-muted-foreground">Vila</span>
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
        variant="outline"
        size="icon"
        className="h-12 w-12"
        onClick={() => onChange(Math.max(0, value - step))}
      >
        <Minus className="h-4 w-4" />
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
        variant="outline"
        size="icon"
        className="h-12 w-12"
        onClick={() => onChange(value + step)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}

function MetricRow({
  label,
  unit,
  value,
  onChange,
  mode,
  onModeChange,
  placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  mode: MetricMode
  onModeChange: (m: MetricMode) => void
  placeholder?: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 bg-muted/40 font-medium text-foreground"
        />
      </div>
      <Select value={mode} onValueChange={(v) => onModeChange(v as MetricMode)}>
        <SelectTrigger className="h-9 w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="avg">Medel</SelectItem>
          <SelectItem value="top">Topp</SelectItem>
        </SelectContent>
      </Select>
      <span className="pb-2 text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

export default ExerciseLogSheet
