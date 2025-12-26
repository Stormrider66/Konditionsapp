'use client'

/**
 * RoundTracker Component
 *
 * Visual progression of rounds in a workout.
 */

import { cn } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'

interface RoundTrackerProps {
  totalRounds: number
  currentRound: number
  completedRounds: number
  /** Rep scheme array e.g., [21, 15, 9] */
  repScheme?: number[]
  /** For EMOM-style, show minute numbers */
  showMinutes?: boolean
  /** Maximum visible rounds before collapsing */
  maxVisible?: number
  /** Callback when clicking on a round */
  onRoundClick?: (round: number) => void
}

export function RoundTracker({
  totalRounds,
  currentRound,
  completedRounds,
  repScheme,
  showMinutes = false,
  maxVisible = 12,
  onRoundClick,
}: RoundTrackerProps) {
  // Determine which rounds to show
  const shouldCollapse = totalRounds > maxVisible
  const visibleRounds: number[] = []

  if (shouldCollapse) {
    // Show first few, current area, and last few
    const firstCount = 2
    const lastCount = 2
    const aroundCurrent = 2

    for (let i = 1; i <= totalRounds; i++) {
      const isFirst = i <= firstCount
      const isLast = i > totalRounds - lastCount
      const isAroundCurrent = Math.abs(i - currentRound) <= aroundCurrent

      if (isFirst || isLast || isAroundCurrent) {
        if (visibleRounds.length === 0 || visibleRounds[visibleRounds.length - 1] === i - 1) {
          visibleRounds.push(i)
        } else if (visibleRounds[visibleRounds.length - 1] !== -1) {
          // Add ellipsis marker (-1)
          visibleRounds.push(-1)
          visibleRounds.push(i)
        }
      }
    }
  } else {
    for (let i = 1; i <= totalRounds; i++) {
      visibleRounds.push(i)
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {visibleRounds.map((round, idx) => {
        if (round === -1) {
          // Ellipsis
          return (
            <span key={`ellipsis-${idx}`} className="text-muted-foreground px-1">
              ...
            </span>
          )
        }

        const isCompleted = round <= completedRounds
        const isCurrent = round === currentRound
        const reps = repScheme?.[round - 1]

        return (
          <button
            key={round}
            onClick={() => onRoundClick?.(round)}
            disabled={!onRoundClick}
            className={cn(
              'relative flex items-center justify-center transition-all',
              'min-w-8 h-8 rounded-full text-xs font-medium',
              isCompleted && 'bg-green-500 text-white',
              isCurrent && !isCompleted && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
              !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
              onRoundClick && 'hover:scale-110 cursor-pointer',
              !onRoundClick && 'cursor-default'
            )}
          >
            {isCompleted ? (
              <Check className="h-4 w-4" />
            ) : (
              <span>
                {showMinutes ? `${round}` : reps || round}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default RoundTracker
