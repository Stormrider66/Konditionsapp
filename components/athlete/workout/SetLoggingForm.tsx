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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [showVBT, setShowVBT] = useState(false)
  const [meanVelocity, setMeanVelocity] = useState<string>('')
  const [peakVelocity, setPeakVelocity] = useState<string>('')
  const [meanPower, setMeanPower] = useState<string>('')
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

      if (rpe !== undefined) data.rpe = rpe
      if (meanVelocity) data.meanVelocity = parseFloat(meanVelocity)
      if (peakVelocity) data.peakVelocity = parseFloat(peakVelocity)
      if (meanPower) data.meanPower = parseFloat(meanPower)

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
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => adjustWeight(-2.5)}
            disabled={disabled}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="w-16 h-8 text-center"
            inputMode="decimal"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground ml-1">kg</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => adjustWeight(2.5)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Reps */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => adjustReps(-1)}
            disabled={disabled}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={repsCompleted}
            onChange={(e) => setRepsCompleted(parseInt(e.target.value) || 0)}
            className="w-12 h-8 text-center"
            inputMode="numeric"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground ml-1">reps</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
          disabled={isSubmitting || disabled}
          className="ml-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            'Logga'
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
            Förra: {previousWeight} kg × {previousReps}
          </Badge>
        )}
      </div>

      {/* Weight Input */}
      <div className="space-y-2">
        <Label className="text-sm">Belastning (kg)</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => adjustWeight(-2.5)}
            disabled={disabled}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="h-12 text-xl text-center font-medium"
            inputMode="decimal"
            step="0.5"
            disabled={disabled}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => adjustWeight(2.5)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustWeight(-5)}
            disabled={disabled}
          >
            -5
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustWeight(-1)}
            disabled={disabled}
          >
            -1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustWeight(1)}
            disabled={disabled}
          >
            +1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustWeight(5)}
            disabled={disabled}
          >
            +5
          </Button>
        </div>
      </div>

      {/* Reps Input */}
      <div className="space-y-2">
        <Label className="text-sm">
          Repetitioner
          {targetReps && (
            <span className="text-muted-foreground ml-1">
              (mål: {targetReps})
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => adjustReps(-1)}
            disabled={disabled}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={repsCompleted}
            onChange={(e) => setRepsCompleted(parseInt(e.target.value) || 0)}
            className="h-12 text-xl text-center font-medium"
            inputMode="numeric"
            disabled={disabled}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => adjustReps(1)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* RPE Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">RPE (svårighetsgrad) <InfoTooltip conceptKey="rpe" /></Label>
          {rpe !== undefined && (
            <Badge className={`${getRPEColor(rpe)} text-white`}>
              {rpe}
            </Badge>
          )}
        </div>
        <Slider
          value={rpe !== undefined ? [rpe] : []}
          onValueChange={(value) => setRpe(value[0])}
          min={1}
          max={10}
          step={0.5}
          className="w-full"
          disabled={disabled}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Lätt</span>
          <span>Svårt</span>
        </div>
      </div>

      {/* VBT Fields (Collapsible) */}
      <Collapsible open={showVBT} onOpenChange={setShowVBT}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
          >
            <Gauge className="h-4 w-4 mr-2" />
            VBT-data
            <ChevronDown
              className={`h-4 w-4 ml-auto transition-transform ${
                showVBT ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Medelhastighet (m/s)</Label>
              <Input
                type="number"
                value={meanVelocity}
                onChange={(e) => setMeanVelocity(e.target.value)}
                placeholder="0.65"
                step="0.01"
                inputMode="decimal"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Topphastighet (m/s)</Label>
              <Input
                type="number"
                value={peakVelocity}
                onChange={(e) => setPeakVelocity(e.target.value)}
                placeholder="0.85"
                step="0.01"
                inputMode="decimal"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Medeleffekt (W)</Label>
            <Input
              type="number"
              value={meanPower}
              onChange={(e) => setMeanPower(e.target.value)}
              placeholder="450"
              inputMode="numeric"
              disabled={disabled}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit Button */}
      <Button
        className="w-full h-12"
        onClick={handleSubmit}
        disabled={isSubmitting || disabled || weight <= 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sparar...
          </>
        ) : isSuccess ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Sparad!
          </>
        ) : (
          'Logga set'
        )}
      </Button>
    </div>
  )
}

export default SetLoggingForm
