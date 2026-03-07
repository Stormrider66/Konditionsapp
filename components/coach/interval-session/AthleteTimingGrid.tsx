'use client'

import { AthleteTimingButton } from './AthleteTimingButton'
import type { IntervalParticipantData } from '@/lib/interval-session/types'

interface AthleteTimingGridProps {
  participants: IntervalParticipantData[]
  currentInterval: number
  disabled: boolean
  onTap: (clientId: string) => void
  onUndo: (clientId: string, intervalNumber: number) => void
}

export function AthleteTimingGrid({
  participants,
  currentInterval,
  disabled,
  onTap,
  onUndo,
}: AthleteTimingGridProps) {
  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Inga atleter tillagda. Lagg till atleter for att borja.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {participants.map((p) => (
        <AthleteTimingButton
          key={p.clientId}
          clientId={p.clientId}
          clientName={p.clientName}
          color={p.color}
          laps={p.laps}
          currentInterval={currentInterval}
          disabled={disabled}
          onTap={onTap}
          onUndo={onUndo}
        />
      ))}
    </div>
  )
}
