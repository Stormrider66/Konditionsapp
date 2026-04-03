'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { IntervalLapData, RestMode } from '@/lib/interval-session/types'

interface AthleteTimingButtonProps {
  clientId: string
  clientName: string
  color: string
  laps: IntervalLapData[]
  currentInterval: number
  disabled: boolean
  onTap: (clientId: string) => void
  onUndo: (clientId: string, intervalNumber: number) => void
  restMode?: RestMode
  restDurationSeconds?: number | null
  restStartedAt?: string | null
  athleteCurrentInterval?: number
  allIntervalsCompleted?: boolean
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AthleteTimingButton({
  clientId,
  clientName,
  color,
  laps,
  currentInterval,
  disabled,
  onTap,
  onUndo,
  restMode = 'NONE',
  restDurationSeconds,
  restStartedAt,
  athleteCurrentInterval,
  allIntervalsCompleted = false,
}: AthleteTimingButtonProps) {
  // In INDIVIDUAL mode, use per-athlete interval; otherwise session-wide
  const effectiveInterval = restMode === 'INDIVIDUAL' && athleteCurrentInterval
    ? athleteCurrentInterval
    : currentInterval

  const currentLap = laps.find((l) => l.intervalNumber === effectiveInterval)
  // In INDIVIDUAL mode, check if they have a lap for their current interval
  const tapped = !!currentLap
  // Latest lap for showing split time during rest
  const latestLap = laps.length > 0 ? laps[laps.length - 1] : undefined

  const [restRemaining, setRestRemaining] = useState<number | null>(null)

  // Rest countdown (for INDIVIDUAL mode)
  useEffect(() => {
    if (restMode !== 'INDIVIDUAL' || !restStartedAt || !restDurationSeconds) {
      setRestRemaining(null)
      return
    }

    // Only show countdown if the athlete has been tapped (has a latest lap)
    if (!latestLap) {
      setRestRemaining(null)
      return
    }

    const restEndMs = new Date(restStartedAt).getTime() + restDurationSeconds * 1000

    const tick = () => {
      const remaining = Math.max(0, (restEndMs - Date.now()) / 1000)
      setRestRemaining(remaining <= 0 ? 0 : remaining)
    }

    tick()
    const interval = setInterval(tick, 200)

    return () => clearInterval(interval)
  }, [restMode, restStartedAt, restDurationSeconds, latestLap])

  // Rest state: athlete has completed a lap and is waiting for rest to end
  const hasCompletedALap = latestLap !== undefined && laps.length > 0
  const isResting = restMode === 'INDIVIDUAL' && restRemaining !== null && restRemaining > 0 && hasCompletedALap && !tapped
  const restDone = restMode === 'INDIVIDUAL' && restRemaining === 0 && hasCompletedALap && !tapped && !allIntervalsCompleted
  const restAlmostDone = isResting && restRemaining < 5 // Last 5 seconds

  // In INDIVIDUAL mode, athlete is tappable when:
  // - Not currently tapped for this interval, AND
  // - Not currently resting (rest is done or no rest needed), AND
  // - Not all intervals completed
  const individualReady = restMode === 'INDIVIDUAL' && !tapped && !isResting && !allIntervalsCompleted
  const isDisabled = restMode === 'INDIVIDUAL'
    ? !individualReady
    : (disabled || tapped)

  const handleClick = () => {
    if (isDisabled) return
    onTap(clientId)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (tapped && latestLap) {
      onUndo(clientId, latestLap.intervalNumber)
    }
  }

  // First name only for compact display
  const displayName = clientName.split(' ')[0]

  // Rest progress ring (0 to 1)
  const restProgress = isResting && restDurationSeconds
    ? 1 - restRemaining / restDurationSeconds
    : 0

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      disabled={isDisabled && !tapped}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl transition-all',
        'min-h-[100px] min-w-[100px] w-full select-none',
        'touch-manipulation',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        // Completed all intervals
        allIntervalsCompleted && 'opacity-60',
        // Disabled (non-individual mode)
        isDisabled && !tapped && !isResting && !restDone && !allIntervalsCompleted && 'opacity-40 cursor-not-allowed',
        // Tapped (solid color)
        tapped && !isResting && !restDone
          ? 'text-white shadow-lg scale-[0.97]'
          : isResting
            ? 'border-2 shadow-md'
            : restDone
              ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950 animate-pulse'
              : 'border-2 hover:scale-[1.02] active:scale-[0.95] cursor-pointer',
        // Almost done resting - pulsing glow
        restAlmostDone && 'ring-2 ring-green-400 ring-offset-1 animate-pulse',
      )}
      style={
        tapped && !isResting && !restDone
          ? { backgroundColor: color }
          : isResting
            ? { borderColor: color, color: color }
            : restDone
              ? {}
              : allIntervalsCompleted
                ? { borderColor: '#9ca3af' }
                : { borderColor: color, color: color }
      }
    >
      {/* Pulsing indicator when waiting to be tapped */}
      {!tapped && !isResting && !restDone && !allIntervalsCompleted && !isDisabled && (
        <span
          className="absolute inset-0 rounded-xl animate-pulse opacity-10"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Rest countdown ring overlay */}
      {isResting && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <rect
            x="2" y="2" width="96" height="96" rx="12" ry="12"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeOpacity="0.15"
          />
          <rect
            x="2" y="2" width="96" height="96" rx="12" ry="12"
            fill="none"
            stroke={restAlmostDone ? '#22c55e' : color}
            strokeWidth="3"
            strokeDasharray={`${restProgress * 384} 384`}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Tapped checkmark */}
      {tapped && !isResting && !restDone && (
        <Check className="absolute top-2 right-2 h-4 w-4 text-white/80" />
      )}

      {/* Interval badge (INDIVIDUAL mode) */}
      {restMode === 'INDIVIDUAL' && (
        <span className={cn(
          'absolute top-1 left-2 text-[10px] font-medium',
          tapped && !isResting && !restDone ? 'text-white/70' : 'opacity-50',
        )}>
          Int {restDone || (!tapped && !isResting) ? effectiveInterval : effectiveInterval}
        </span>
      )}

      {/* Name */}
      <span className={cn(
        'font-bold text-lg',
        tapped && !isResting && !restDone && 'text-white',
        restDone && 'text-green-700 dark:text-green-300',
        allIntervalsCompleted && !tapped && 'text-muted-foreground',
      )}>
        {displayName}
      </span>

      {/* Content area */}
      {allIntervalsCompleted && !tapped && !isResting ? (
        <span className="text-xs text-muted-foreground mt-1">Klar</span>
      ) : isResting ? (
        <>
          <span className={cn(
            'font-mono text-xl font-bold mt-0.5',
            restAlmostDone && 'text-green-600 dark:text-green-400',
          )} style={restAlmostDone ? {} : { color }}>
            {formatCountdown(restRemaining)}
          </span>
          <span className="text-[10px] opacity-60 mt-0.5">vila</span>
        </>
      ) : restDone ? (
        <>
          <span className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
            Redo
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {latestLap ? formatSplit(latestLap.splitTimeMs) : ''}
          </span>
        </>
      ) : tapped ? (
        <span className="font-mono text-sm text-white/90 mt-1">
          {currentLap ? formatSplit(currentLap.splitTimeMs) : ''}
        </span>
      ) : (
        <span className={cn('text-xs mt-1', isDisabled ? 'text-muted-foreground' : 'opacity-60')}>
          {isDisabled ? '-' : 'Vantar'}
        </span>
      )}

      {/* Lap count badge */}
      {laps.length > 0 && (
        <span className={cn(
          'absolute bottom-1 left-2 text-[10px] opacity-60',
          restDone && 'text-green-700 dark:text-green-300',
        )}>
          {laps.length} varv
        </span>
      )}
    </button>
  )
}
