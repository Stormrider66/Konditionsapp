'use client'

import { Button } from '@/components/ui/button'
import { Pause, Play, SkipForward, Timer as TimerIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import type { ActiveRest } from './useRestTimer'

interface FloatingRestTimerProps {
  active: ActiveRest
  remaining: number
  isPaused: boolean
  onSkip: () => void
  onTogglePause: () => void
  onOpenExercise?: (exerciseId: string) => void
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  rest: string
  resume: string
  pause: string
  skip: string
}> = {
  en: {
    rest: 'Rest',
    resume: 'Resume',
    pause: 'Pause',
    skip: 'Skip',
  },
  sv: {
    rest: 'Vila',
    resume: 'Återuppta',
    pause: 'Pausa',
    skip: 'Hoppa över',
  },
}

export function FloatingRestTimer({
  active,
  remaining,
  isPaused,
  onSkip,
  onTogglePause,
  onOpenExercise,
}: FloatingRestTimerProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const urgent = remaining <= 10

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-3">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur',
          urgent ? 'border-red-500/60' : 'border-primary/40',
        )}
      >
        <button
          type="button"
          onClick={() => onOpenExercise?.(active.exerciseId)}
          className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-sm font-semibold hover:bg-muted"
        >
          <TimerIcon className={cn('h-4 w-4', urgent ? 'text-red-500' : 'text-primary')} />
          <span className={cn('tabular-nums', urgent && 'text-red-500')}>
            {mm}:{ss.toString().padStart(2, '0')}
          </span>
          <span className="text-xs font-normal text-muted-foreground">{copy.rest}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onTogglePause}
          aria-label={isPaused ? copy.resume : copy.pause}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSkip}
          aria-label={copy.skip}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default FloatingRestTimer
