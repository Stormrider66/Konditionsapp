'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  type FocusModeExercise,
  type Locale,
  parseTargetReps,
  text,
} from './shared'

interface KioskSetLoggerProps {
  assignmentId: string
  query: string
  businessSlug: string
  locale: Locale
  exercise: FocusModeExercise
  setNumber: number
  targetWeight?: number
  targetReps: number | string
  previousLog: FocusModeExercise['setLogs'][number] | null
  lastSession?: FocusModeExercise['lastPerformance']
  preferTargetWeight?: boolean
  onDirtyChange: (dirty: boolean) => void
  onActivity: () => void
  onSaved: () => Promise<void>
}

export function KioskSetLogger({
  assignmentId,
  query,
  businessSlug,
  locale,
  exercise,
  setNumber,
  targetWeight,
  targetReps,
  previousLog,
  lastSession,
  preferTargetWeight = false,
  onDirtyChange,
  onActivity,
  onSaved,
}: KioskSetLoggerProps) {
  const defaultWeight = preferTargetWeight
    ? targetWeight ?? previousLog?.weight ?? lastSession?.weight ?? 0
    : previousLog?.weight ?? lastSession?.weight ?? targetWeight ?? 0
  const defaultReps = parseTargetReps(targetReps)
  const [weight, setWeight] = useState(defaultWeight)
  const [reps, setReps] = useState(defaultReps)
  const [rpe, setRpe] = useState(6)
  const [rpeTouched, setRpeTouched] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [meanVelocity, setMeanVelocity] = useState('')
  const [peakVelocity, setPeakVelocity] = useState('')
  const [meanPower, setMeanPower] = useState('')
  const [peakPower, setPeakPower] = useState('')
  const [meanTime, setMeanTime] = useState('')
  const [peakTime, setPeakTime] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty =
    weight !== defaultWeight ||
    reps !== defaultReps ||
    rpeTouched ||
    meanVelocity !== '' ||
    peakVelocity !== '' ||
    meanPower !== '' ||
    peakPower !== '' ||
    meanTime !== '' ||
    peakTime !== ''

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const reset = () => {
    setWeight(defaultWeight)
    setReps(defaultReps)
    setRpe(6)
    setRpeTouched(false)
    setMeanVelocity('')
    setPeakVelocity('')
    setMeanPower('')
    setPeakPower('')
    setMeanTime('')
    setPeakTime('')
    onDirtyChange(false)
    onActivity()
  }

  const submit = async () => {
    if (saving || reps <= 0) return
    setSaving(true)
    try {
      const payload: Record<string, string | number | undefined> = {
        exerciseId: exercise.exerciseId,
        setNumber,
        weight,
        repsCompleted: reps,
        repsTarget: typeof targetReps === 'number' ? targetReps : defaultReps,
        rpe: rpeTouched ? rpe : undefined,
        meanVelocity: meanVelocity ? Number(meanVelocity) : undefined,
        peakVelocity: peakVelocity ? Number(peakVelocity) : undefined,
        meanPower: meanPower ? Number(meanPower) : undefined,
        peakPower: peakPower ? Number(peakPower) : undefined,
        meanTime: meanTime ? Number(meanTime) : undefined,
        peakTime: peakTime ? Number(peakTime) : undefined,
      }
      const response = await fetch(`/api/strength-sessions/${assignmentId}/sets?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-business-slug': businessSlug },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(text(locale, 'Kunde inte spara setet.', 'Could not save the set.'))
      toast.success(text(locale, 'Set sparat.', 'Set saved.'))
      onDirtyChange(false)
      await onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text(locale, 'Kunde inte spara setet.', 'Could not save the set.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">
            {text(locale, 'Logga set', 'Log set')} {setNumber}
          </h3>
          <p className="text-sm text-slate-600">
            {targetWeight ? `${targetWeight} kg · ` : ''}{targetReps} reps
          </p>
          {lastSession && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {text(locale, 'Förra passet', 'Last time')}: {lastSession.weight} kg × {lastSession.reps}
              {!lastSession.sameScheme && lastSession.repsTarget ? ` (${lastSession.repsTarget} reps)` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={reset} disabled={!dirty || saving}>
            {text(locale, 'Avbryt', 'Cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || reps <= 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {text(locale, 'Spara set', 'Save set')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StepperField
          label={text(locale, 'Vikt', 'Weight')}
          value={weight}
          unit="kg"
          step={2.5}
          min={0}
          onChange={(value) => {
            setWeight(value)
            onActivity()
          }}
        />
        <StepperField
          label={text(locale, 'Reps', 'Reps')}
          value={reps}
          unit="reps"
          step={1}
          min={0}
          onChange={(value) => {
            setReps(value)
            onActivity()
          }}
        />
      </div>

      <Separator className="my-5" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">RPE</p>
          <Badge variant={rpeTouched ? 'default' : 'outline'}>{rpe}/10</Badge>
        </div>
        <Slider
          value={[rpe]}
          min={1}
          max={10}
          step={1}
          onValueChange={([value]) => {
            setRpe(value)
            setRpeTouched(true)
            onActivity()
          }}
        />
      </div>

      <div className="mt-5">
        <Button type="button" variant="outline" onClick={() => setShowMetrics((value) => !value)}>
          {showMetrics ? text(locale, 'Dölj mätvärden', 'Hide metrics') : text(locale, 'Lägg till mätvärden', 'Add metrics')}
        </Button>
        {showMetrics && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricInput label="Mean velocity" value={meanVelocity} onChange={setMeanVelocity} onActivity={onActivity} />
            <MetricInput label="Peak velocity" value={peakVelocity} onChange={setPeakVelocity} onActivity={onActivity} />
            <MetricInput label="Mean power" value={meanPower} onChange={setMeanPower} onActivity={onActivity} />
            <MetricInput label="Peak power" value={peakPower} onChange={setPeakPower} onActivity={onActivity} />
            <MetricInput label="Mean time" value={meanTime} onChange={setMeanTime} onActivity={onActivity} />
            <MetricInput label="Peak time" value={peakTime} onChange={setPeakTime} onActivity={onActivity} />
          </div>
        )}
      </div>
    </div>
  )
}

function StepperField({
  label,
  value,
  unit,
  step,
  min,
  onChange,
}: {
  label: string
  value: number
  unit: string
  step: number
  min: number
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="icon" onClick={() => onChange(Math.max(min, value - step))}>
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value === 0 ? '' : value}
          placeholder="0"
          inputMode="decimal"
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="h-14 text-center text-2xl font-bold"
        />
        <span className="w-10 text-sm font-medium text-slate-500">{unit}</span>
        <Button type="button" variant="secondary" size="icon" onClick={() => onChange(value + step)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function MetricInput({
  label,
  value,
  onChange,
  onActivity,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onActivity: () => void
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <Input
        type="number"
        value={value}
        inputMode="decimal"
        onChange={(event) => {
          onChange(event.target.value)
          onActivity()
        }}
      />
    </label>
  )
}
