'use client'

/**
 * MovementCheckCard Component
 *
 * Card for tracking movement completion within a round.
 */

import { Badge } from '@/components/ui/badge'
import { Check, Dumbbell, Flame, Route, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MovementCheckCardProps {
  name: string
  nameSv?: string
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weight?: number
  completed: boolean
  onToggle: () => void
  disabled?: boolean
}

export function MovementCheckCard({
  name,
  nameSv,
  reps,
  calories,
  distance,
  duration,
  weight,
  completed,
  onToggle,
  disabled = false,
}: MovementCheckCardProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-lg border-2 transition-all text-left',
        'active:scale-[0.98] touch-manipulation',
        completed
          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
          : 'border-muted hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Movement info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className={cn('font-medium truncate', completed && 'line-through')}>
              {nameSv || name}
            </span>
          </div>

          {/* Prescription */}
          <div className="flex flex-wrap gap-2 mt-2">
            {reps && (
              <Badge variant="secondary" className="text-xs">
                {reps} reps
              </Badge>
            )}
            {calories && (
              <Badge variant="secondary" className="text-xs">
                <Flame className="h-3 w-3 mr-1" />
                {calories} cal
              </Badge>
            )}
            {distance && (
              <Badge variant="secondary" className="text-xs">
                <Route className="h-3 w-3 mr-1" />
                {distance}m
              </Badge>
            )}
            {duration && (
              <Badge variant="secondary" className="text-xs">
                <Timer className="h-3 w-3 mr-1" />
                {duration}s
              </Badge>
            )}
            {weight && (
              <Badge variant="outline" className="text-xs">
                {weight}kg
              </Badge>
            )}
          </div>
        </div>

        {/* Check indicator */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
            completed
              ? 'bg-green-500 text-white'
              : 'border-2 border-muted'
          )}
        >
          {completed && <Check className="h-5 w-5" />}
        </div>
      </div>
    </button>
  )
}

export default MovementCheckCard
