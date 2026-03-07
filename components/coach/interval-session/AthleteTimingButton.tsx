'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { IntervalLapData } from '@/lib/interval-session/types'

interface AthleteTimingButtonProps {
  clientId: string
  clientName: string
  color: string
  laps: IntervalLapData[]
  currentInterval: number
  disabled: boolean
  onTap: (clientId: string) => void
  onUndo: (clientId: string, intervalNumber: number) => void
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
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
}: AthleteTimingButtonProps) {
  const currentLap = laps.find((l) => l.intervalNumber === currentInterval)
  const tapped = !!currentLap

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
        tapped
          ? 'text-white shadow-lg scale-[0.97]'
          : 'border-2 hover:scale-[1.02] active:scale-[0.95] cursor-pointer'
      )}
      style={
        tapped
          ? { backgroundColor: color }
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

      {/* Tapped checkmark */}
      {tapped && (
        <Check className="absolute top-2 right-2 h-4 w-4 text-white/80" />
      )}

      {/* Name */}
      <span className={cn('font-bold text-lg', tapped && 'text-white')}>
        {displayName}
      </span>

      {/* Split time or waiting text */}
      {tapped ? (
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
        <span className="absolute bottom-1 left-2 text-[10px] opacity-60">
          {laps.length} varv
        </span>
      )}
    </button>
  )
}
