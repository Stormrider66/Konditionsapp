'use client'

/**
 * SetLoggingForm Component
 *
 * Compact inline form for logging individual sets.
 * Includes weight, reps, RPE, and optional VBT fields.
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Check,
  ChevronDown,
  Gauge,
  Minus,
  Plus,
} from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useTranslations } from '@/i18n/client'

interface SetLoggingFormProps {
  exerciseId: string
  setNumber: number
  targetWeight?: number
  targetReps: number | string
  previousWeight?: number
  previousReps?: number
  onSubmit: (data: SetLogData) => Promise<void>
  disabled?: boolean
  compact?: boolean
}

export interface SetLogData {
  exerciseId: string
  setNumber: number
  weight: number
  repsCompleted: number
  repsTarget?: number
  rpe?: number
  meanVelocity?: number
  peakVelocity?: number
  meanPower?: number
  peakPower?: number
  meanTime?: number
  peakTime?: number
}

export function SetLoggingForm({
  exerciseId,
  setNumber,
  targetWeight,
  targetReps,
  previousWeight,
  previousReps,
  onSubmit,
  disabled = false,
  compact = false,
}: SetLoggingFormProps) {
  const t = useTranslations('components.setLoggingForm')
  // Parse target reps if it's a range like "8-12"
  const parseTargetReps = (reps: number | string): number => {
    if (typeof reps === 'number') return reps
    const match = reps.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 8
  }

  const defaultReps = parseTargetReps(targetReps)
  const defaultWeight = targetWeight ?? previousWeight ?? 0

  const [weight, setWeight] = useState(defaultWeight)
  const [repsCompleted, setRepsCompleted] = useState(defaultReps)
  const [rpe, setRpe] = useState<number>(6)
  const [rpeTouched, setRpeTouched] = useState(false)
  const [showVBT, setShowVBT] = useState(false)
  const [meanVelocity, setMeanVelocity] = useState<string>('')
  const [peakVelocity, setPeakVelocity] = useState<string>('')
  const [meanPower, setMeanPower] = useState<string>('')
  const [peakPower, setPeakPower] = useState<string>('')
  const [meanTime, setMeanTime] = useState<string>('')
  const [peakTime, setPeakTime] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Weight adjustment
  const adjustWeight = useCallback((amount: number) => {
    setWeight((prev) => Math.max(0, prev + amount))
  }, [])

  // Reps adjustment
  const adjustReps = useCallback((amount: number) => {
    setRepsCompleted((prev) => Math.max(0, prev + amount))
  }, [])

  // Handle submit
  const handleSubmit = async () => {
    if (isSubmitting || disabled) return

    setIsSubmitting(true)
    setIsSuccess(false)

    try {
      const data: SetLogData = {
        exerciseId,
        setNumber,
        weight,
        repsCompleted,
        repsTarget: typeof targetReps === 'number' ? targetReps : defaultReps,
      }

      if (rpeTouched) data.rpe = rpe
      if (meanVelocity) data.meanVelocity = parseFloat(meanVelocity)
      if (peakVelocity) data.peakVelocity = parseFloat(peakVelocity)
      if (meanPower) data.meanPower = parseFloat(meanPower)
      if (peakPower) data.peakPower = parseFloat(peakPower)
      if (meanTime) data.meanTime = parseFloat(meanTime)
      if (peakTime) data.peakTime = parseFloat(peakTime)

      await onSubmit(data)
      setIsSuccess(true)

      // Reset success state after animation
      setTimeout(() => setIsSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to log set:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // RPE color
  const getRPEColor = (value: number) => {
    if (value <= 5) return 'bg-green-500'
    if (value <= 7) return 'bg-yellow-500'
    if (value <= 8) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        {/* Weight */}
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 text-foreground"
            onClick={() => adjustWeight(-2.5)}
            disabled={disabled}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={weight === 0 ? '' : weight}
            placeholder="0"
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-16 h-9 text-center font-semibold text-foreground bg-muted/40"
            inputMode="decimal"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground ml-1">kg</span>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 text-foreground"
            onClick={() => adjustWeight(2.5)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Reps */}
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 text-foreground"
            onClick={() => adjustReps(-1)}
            disabled={disabled}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={repsCompleted === 0 ? '' : repsCompleted}
            placeholder="0"
            onChange={(e) => setRepsCompleted(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-12 h-9 text-center font-semibold text-foreground bg-muted/40"
            inputMode="numeric"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground ml-1">reps</span>
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 text-foreground"
            onClick={() => adjustReps(1)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Submit */}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || disabled || repsCompleted <= 0}
          className="ml-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            t('actions.log')
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Set {setNumber}</h4>
        {previousWeight && previousReps && (
          <Badge variant="outline" className="text-xs">
            {t('previous', { weight: previousWeight, reps: previousReps })}
          </Badge>
        )}
      </div>

      {/* Weight Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">{t('fields.weight')}</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 text-foreground"
            onClick={() => adjustWeight(-2.5)}
            disabled={disabled}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            type="number"
            value={weight === 0 ? '' : weight}
            placeholder="0"
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-14 bg-muted/40 text-center text-2xl font-bold text-foreground"
            inputMode="decimal"
            step="0.5"
            disabled={disabled}
          />
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 text-foreground"
            onClick={() => adjustWeight(2.5)}
            disabled={disabled}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => adjustWeight(-5)} disabled={disabled}>
            -5
          </Button>
          <Button variant="ghost" size="sm" onClick={() => adjustWeight(-1)} disabled={disabled}>
            -1
          </Button>
          <Button variant="ghost" size="sm" onClick={() => adjustWeight(1)} disabled={disabled}>
            +1
          </Button>
          <Button variant="ghost" size="sm" onClick={() => adjustWeight(5)} disabled={disabled}>
            +5
          </Button>
        </div>
      </div>

      {/* Reps Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Repetitioner
          {targetReps && (
            <span className="text-muted-foreground ml-1">
              {t('fields.targetReps', { target: targetReps })}
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 text-foreground"
            onClick={() => adjustReps(-1)}
            disabled={disabled}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            type="number"
            value={repsCompleted === 0 ? '' : repsCompleted}
            placeholder="0"
            onChange={(e) => setRepsCompleted(parseInt(e.target.value) || 0)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-14 bg-muted/40 text-center text-2xl font-bold text-foreground"
            inputMode="numeric"
            disabled={disabled}
          />
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 text-foreground"
            onClick={() => adjustReps(1)}
            disabled={disabled}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* RPE Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">{t('fields.rpe')} <InfoTooltip conceptKey="rpe" /></Label>
          <Badge
            className={
              rpeTouched
                ? `${getRPEColor(rpe)} text-white min-w-[34px] justify-center`
                : 'bg-muted text-muted-foreground min-w-[34px] justify-center'
            }
          >
            {rpeTouched ? rpe : '—'}
          </Badge>
        </div>
        <Slider
          value={[rpe]}
          onValueChange={(value) => {
            setRpe(value[0])
            setRpeTouched(true)
          }}
          min={1}
          max={10}
          step={0.5}
          className="w-full"
          disabled={disabled}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t('rpe.easy')}</span>
          <span>{t('rpe.hard')}</span>
        </div>
      </div>

      {/* VBT Fields — separate Medel / Topp inputs per metric */}
      <div className="rounded-lg border border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setShowVBT((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <Gauge className="h-4 w-4 text-muted-foreground" />
          {t('vbt.toggle')}
          <ChevronDown
            className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
              showVBT ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showVBT && (
          <div className="space-y-4 border-t border-border px-3 pb-3 pt-3">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-sm font-medium text-foreground">{t('vbt.velocity')}</Label>
                <span className="text-xs text-muted-foreground">m/s</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.mean')}
                  </span>
                  <Input
                    type="number"
                    value={meanVelocity}
                    onChange={(e) => setMeanVelocity(e.target.value)}
                    placeholder="0.65"
                    step="0.01"
                    inputMode="decimal"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.peak')}
                  </span>
                  <Input
                    type="number"
                    value={peakVelocity}
                    onChange={(e) => setPeakVelocity(e.target.value)}
                    placeholder="0.85"
                    step="0.01"
                    inputMode="decimal"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-sm font-medium text-foreground">{t('vbt.power')}</Label>
                <span className="text-xs text-muted-foreground">W</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.mean')}
                  </span>
                  <Input
                    type="number"
                    value={meanPower}
                    onChange={(e) => setMeanPower(e.target.value)}
                    placeholder="450"
                    inputMode="numeric"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.peak')}
                  </span>
                  <Input
                    type="number"
                    value={peakPower}
                    onChange={(e) => setPeakPower(e.target.value)}
                    placeholder="520"
                    inputMode="numeric"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-sm font-medium text-foreground">{t('vbt.time')}</Label>
                <span className="text-xs text-muted-foreground">s</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.mean')}
                  </span>
                  <Input
                    type="number"
                    value={meanTime}
                    onChange={(e) => setMeanTime(e.target.value)}
                    placeholder="1.8"
                    step="0.01"
                    inputMode="decimal"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('vbt.peak')}
                  </span>
                  <Input
                    type="number"
                    value={peakTime}
                    onChange={(e) => setPeakTime(e.target.value)}
                    placeholder="2.1"
                    step="0.01"
                    inputMode="decimal"
                    disabled={disabled}
                    className="h-10 bg-muted/40 text-center font-semibold text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        className="w-full h-12"
        onClick={handleSubmit}
        disabled={isSubmitting || disabled || repsCompleted <= 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('actions.saving')}
          </>
        ) : isSuccess ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t('actions.saved')}
          </>
        ) : (
          t('actions.logSet')
        )}
      </Button>
    </div>
  )
}

export default SetLoggingForm
