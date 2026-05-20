'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { IntervalLapData, RestMode } from '@/lib/interval-session/types'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

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

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const tenths = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`
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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  // In INDIVIDUAL mode, use per-athlete interval; otherwise session-wide
  const effectiveInterval = restMode === 'INDIVIDUAL' && athleteCurrentInterval
    ? athleteCurrentInterval
    : currentInterval

  const currentLap = laps.find((l) => l.intervalNumber === effectiveInterval)
  const tapped = !!currentLap
  const latestLap = laps.length > 0 ? laps[laps.length - 1] : undefined

  const [restRemaining, setRestRemaining] = useState<number | null>(null)
  const [intervalElapsed, setIntervalElapsed] = useState<number | null>(null)

  // Rest countdown + elapsed timer (for INDIVIDUAL mode)
  useEffect(() => {
    if (restMode !== 'INDIVIDUAL' || !restStartedAt || !restDurationSeconds || disabled || allIntervalsCompleted) {
      setRestRemaining(null)
      setIntervalElapsed(null)
      return
    }

    if (!latestLap) {
      setRestRemaining(null)
      setIntervalElapsed(null)
      return
    }

    const restEndMs = new Date(restStartedAt).getTime() + restDurationSeconds * 1000

    const tick = () => {
      const now = Date.now()
      const rawRemaining = (restEndMs - now) / 1000
      // Cap at restDurationSeconds to prevent showing more than configured
      const remaining = Math.max(0, Math.min(rawRemaining, restDurationSeconds))
      setRestRemaining(remaining)

      // If rest is done, show elapsed time since rest ended (= interval running time)
      if (rawRemaining <= 0) {
        setIntervalElapsed(Math.abs(rawRemaining))
      } else {
        setIntervalElapsed(null)
      }
    }

    tick()
    const interval = setInterval(tick, 100)

    return () => clearInterval(interval)
  }, [restMode, restStartedAt, restDurationSeconds, latestLap, disabled, allIntervalsCompleted])

  // States
  const hasCompletedALap = latestLap !== undefined && laps.length > 0
  const isResting = restMode === 'INDIVIDUAL' && restRemaining !== null && restRemaining > 0 && hasCompletedALap && !tapped
  const restDone = restMode === 'INDIVIDUAL' && restRemaining === 0 && hasCompletedALap && !tapped && !allIntervalsCompleted
  const restAlmostDone = isResting && restRemaining < 5

  // Tappability
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

  const displayName = clientName.split(' ')[0]

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
        allIntervalsCompleted && 'opacity-60',
        isDisabled && !tapped && !isResting && !restDone && !allIntervalsCompleted && 'opacity-40 cursor-not-allowed',
        tapped && !isResting && !restDone
          ? 'text-white shadow-lg scale-[0.97]'
          : isResting
            ? 'border-2 shadow-md'
            : restDone
              ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950'
              : 'border-2 hover:scale-[1.02] active:scale-[0.95] cursor-pointer',
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

      {/* Interval badge - bolder and more visible */}
      {restMode === 'INDIVIDUAL' && (
        <span className={cn(
          'absolute top-1.5 left-2 text-xs font-bold',
          tapped && !isResting && !restDone ? 'text-white/80' : 'opacity-70',
        )}>
          Int {effectiveInterval}
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
        <>
          <span className="text-xs text-muted-foreground mt-1">{copy(locale, 'Done', 'Klar')}</span>
          {latestLap && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatSplit(latestLap.splitTimeMs)}
            </span>
          )}
        </>
      ) : isResting ? (
        <>
          {/* Split time from last interval */}
          <span className="font-mono text-xs opacity-70 mb-0.5" style={{ color }}>
            {latestLap ? formatSplit(latestLap.splitTimeMs) : ''}
          </span>
          {/* Rest countdown */}
          <span className={cn(
            'font-mono text-lg font-bold',
            restAlmostDone && 'text-green-600 dark:text-green-400',
          )} style={restAlmostDone ? {} : { color }}>
            {formatCountdown(restRemaining)}
          </span>
          <span className="text-[10px] opacity-60">{copy(locale, 'rest', 'vila')}</span>
        </>
      ) : restDone ? (
        <>
          {/* Elapsed time since rest ended = how long they've been running */}
          <span className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
            {intervalElapsed !== null ? formatElapsed(intervalElapsed) : ''}
          </span>
          <span className="text-[10px] text-green-600/70 dark:text-green-400/70">{copy(locale, 'running', 'löpande')}</span>
        </>
      ) : tapped ? (
        <span className="font-mono text-sm text-white/90 mt-1">
          {currentLap ? formatSplit(currentLap.splitTimeMs) : ''}
        </span>
      ) : (
        <span className={cn('text-xs mt-1', isDisabled ? 'text-muted-foreground' : 'opacity-60')}>
          {isDisabled ? '-' : copy(locale, 'Waiting', 'Väntar')}
        </span>
      )}

      {/* Lap count badge - bolder */}
      {laps.length > 0 && (
        <span className={cn(
          'absolute bottom-1.5 left-2 text-[11px] font-semibold',
          tapped && !isResting && !restDone ? 'text-white/70' : 'opacity-70',
          restDone && 'text-green-700 dark:text-green-300',
        )}>
          {laps.length} {copy(locale, 'laps', 'varv')}
        </span>
      )}
    </button>
  )
}
