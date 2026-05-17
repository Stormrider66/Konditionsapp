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
import { useTranslations } from '@/i18n/client'

interface WODCompletionModalProps {
  title: string
  totalExercises: number
  estimatedDuration: number // minutes, from WOD
  actualDuration: number // minutes, calculated from startTime
  onComplete: (data: { sessionRPE: number; actualDuration: number }) => Promise<void>
  onCancel: () => void
}

export function WODCompletionModal({
  title,
  totalExercises,
  estimatedDuration,
  actualDuration,
  onComplete,
  onCancel,
}: WODCompletionModalProps) {
  const t = useTranslations('components.wodCompletionModal')
  const [sessionRPE, setSessionRPE] = useState(6) // Default to moderate
  const [adjustedDuration, setAdjustedDuration] = useState(actualDuration)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rpeLabels: Record<number, { label: string; color: string; description: string }> = {
    1: { label: t('rpe.1.label'), color: 'text-green-400', description: t('rpe.1.description') },
    2: { label: t('rpe.2.label'), color: 'text-green-500', description: t('rpe.2.description') },
    3: { label: t('rpe.3.label'), color: 'text-green-600', description: t('rpe.3.description') },
    4: { label: t('rpe.4.label'), color: 'text-yellow-500', description: t('rpe.4.description') },
    5: { label: t('rpe.5.label'), color: 'text-yellow-600', description: t('rpe.5.description') },
    6: { label: t('rpe.6.label'), color: 'text-orange-500', description: t('rpe.6.description') },
    7: { label: t('rpe.7.label'), color: 'text-orange-600', description: t('rpe.7.description') },
    8: { label: t('rpe.8.label'), color: 'text-red-500', description: t('rpe.8.description') },
    9: { label: t('rpe.9.label'), color: 'text-red-600', description: t('rpe.9.description') },
    10: { label: t('rpe.10.label'), color: 'text-red-700', description: t('rpe.10.description') },
  }
  const rpeInfo = rpeLabels[sessionRPE]

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
            <h2 className="text-2xl font-bold mb-1">{t('title')}</h2>
            <p className="text-muted-foreground">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('completedExercises', { count: totalExercises })}
            </p>
          </div>

          {/* Duration display */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('durationLabel')}
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
                {t('estimatedDuration', { minutes: estimatedDuration })}
              </p>
            )}
          </div>

          {/* RPE Slider */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              {t('rpeLabel')}
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
                <span>{t('rpeScale.easy')}</span>
                <span>{t('rpeScale.hard')}</span>
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
              <span className="text-sm font-medium">{t('estimatedLoad')}</span>
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
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-[2] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('actions.saving')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('actions.saveAndFinish')}
                </>
              )}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
