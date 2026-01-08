'use client'

/**
 * WOD Completion Modal
 *
 * Collects session RPE (Rate of Perceived Exertion) and duration
 * when an athlete completes an AI-generated Workout of the Day.
 *
 * This data is used to:
 * - Calculate accurate TSS (Training Stress Score)
 * - Track workout duration
 * - Create WorkoutLog entry for activity history
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Slider } from '@/components/ui/slider'
import { CheckCircle2, Clock, Flame, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WODCompletionModalProps {
  title: string
  totalExercises: number
  estimatedDuration: number // minutes, from WOD
  actualDuration: number // minutes, calculated from startTime
  onComplete: (data: { sessionRPE: number; actualDuration: number }) => Promise<void>
  onCancel: () => void
}

// RPE descriptions (Swedish)
const RPE_LABELS: Record<number, { label: string; color: string; description: string }> = {
  1: { label: 'Mycket lätt', color: 'text-green-400', description: 'Vila' },
  2: { label: 'Lätt', color: 'text-green-500', description: 'Kan prata obehindrat' },
  3: { label: 'Lätt', color: 'text-green-600', description: 'Bekväm ansträngning' },
  4: { label: 'Måttligt', color: 'text-yellow-500', description: 'Något andfådd' },
  5: { label: 'Måttligt', color: 'text-yellow-600', description: 'Tydligt andfådd' },
  6: { label: 'Utmanande', color: 'text-orange-500', description: 'Kort av andan' },
  7: { label: 'Tungt', color: 'text-orange-600', description: 'Jobbigt att prata' },
  8: { label: 'Mycket tungt', color: 'text-red-500', description: 'Kan bara säga enstaka ord' },
  9: { label: 'Extremt tungt', color: 'text-red-600', description: 'Nästan maximal ansträngning' },
  10: { label: 'Maximalt', color: 'text-red-700', description: 'Allt du hade' },
}

export function WODCompletionModal({
  title,
  totalExercises,
  estimatedDuration,
  actualDuration,
  onComplete,
  onCancel,
}: WODCompletionModalProps) {
  const [sessionRPE, setSessionRPE] = useState(6) // Default to moderate
  const [adjustedDuration, setAdjustedDuration] = useState(actualDuration)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rpeInfo = RPE_LABELS[sessionRPE]

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onComplete({
        sessionRPE,
        actualDuration: adjustedDuration,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate estimated TSS for display
  const estimatedTSS = Math.round(adjustedDuration * sessionRPE * 0.8)

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full">
        <GlassCardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-1">Bra jobbat!</h2>
            <p className="text-muted-foreground">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalExercises} övningar slutförda
            </p>
          </div>

          {/* Duration display */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Tid för passet
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustedDuration(Math.max(1, adjustedDuration - 5))}
                disabled={adjustedDuration <= 5}
              >
                -5
              </Button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold">{adjustedDuration}</span>
                <span className="text-muted-foreground ml-2">min</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustedDuration(adjustedDuration + 5)}
              >
                +5
              </Button>
            </div>
            {estimatedDuration > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Beräknad tid: {estimatedDuration} min
              </p>
            )}
          </div>

          {/* RPE Slider */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Hur tungt kändes det? (RPE)
            </label>
            <div className="px-2">
              <Slider
                value={[sessionRPE]}
                onValueChange={([value]) => setSessionRPE(value)}
                min={1}
                max={10}
                step={1}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lätt</span>
                <span>Tungt</span>
                <span>Max</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
              <div className={cn('text-xl font-bold', rpeInfo.color)}>
                {sessionRPE}/10 - {rpeInfo.label}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {rpeInfo.description}
              </p>
            </div>
          </div>

          {/* Estimated TSS */}
          <div className="mb-6 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Beräknad träningsbelastning</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {estimatedTSS} TSS
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Spara & avsluta
                </>
              )}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
