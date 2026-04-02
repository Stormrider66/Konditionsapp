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
}: AthleteTimingButtonProps) {
  const currentLap = laps.find((l) => l.intervalNumber === currentInterval)
  const tapped = !!currentLap
  const [restRemaining, setRestRemaining] = useState<number | null>(null)

  // Individual rest countdown
  useEffect(() => {
    if (restMode !== 'INDIVIDUAL' || !tapped || !restStartedAt || !restDurationSeconds) {
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
  }, [restMode, tapped, restStartedAt, restDurationSeconds])

  const isResting = restMode === 'INDIVIDUAL' && restRemaining !== null && restRemaining > 0
  const restDone = restMode === 'INDIVIDUAL' && restRemaining === 0

  const handleClick = () => {
    if (disabled || tapped) return
    onTap(clientId)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (tapped) {
      onUndo(clientId, currentInterval)
    }
  }

  // First name only for compact display
  const displayName = clientName.split(' ')[0]

  // Rest progress for ring animation (0 to 1)
  const restProgress = isResting && restDurationSeconds
    ? 1 - restRemaining / restDurationSeconds
    : 0

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      disabled={disabled && !tapped}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl transition-all',
        'min-h-[100px] min-w-[100px] w-full select-none',
        'touch-manipulation',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        disabled && !tapped && 'opacity-40 cursor-not-allowed',
        tapped && !isResting && !restDone
          ? 'text-white shadow-lg scale-[0.97]'
          : isResting
            ? 'border-2 shadow-md'
            : restDone
              ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950'
              : 'border-2 hover:scale-[1.02] active:scale-[0.95] cursor-pointer'
      )}
      style={
        tapped && !isResting && !restDone
          ? { backgroundColor: color }
          : isResting
            ? { borderColor: color, color: color }
            : restDone
              ? {}
              : { borderColor: color, color: color }
      }
    >
      {/* Pulsing indicator when waiting */}
      {!tapped && !disabled && (
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
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${restProgress * 384} 384`}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Tapped checkmark */}
      {tapped && !isResting && (
        <Check className={cn(
          'absolute top-2 right-2 h-4 w-4',
          restDone ? 'text-green-600 dark:text-green-400' : 'text-white/80'
        )} />
      )}

      {/* Name */}
      <span className={cn(
        'font-bold text-lg',
        tapped && !isResting && !restDone && 'text-white',
        restDone && 'text-green-700 dark:text-green-300',
      )}>
        {displayName}
      </span>

      {/* Content area */}
      {isResting ? (
        <>
          <span className="font-mono text-xl font-bold mt-0.5" style={{ color }}>
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
            {formatSplit(currentLap!.splitTimeMs)}
          </span>
        </>
      ) : tapped ? (
        <span className="font-mono text-sm text-white/90 mt-1">
          {formatSplit(currentLap.splitTimeMs)}
        </span>
      ) : (
        <span className={cn('text-xs mt-1', disabled ? 'text-muted-foreground' : 'opacity-60')}>
          {disabled ? '-' : 'Vantar'}
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
