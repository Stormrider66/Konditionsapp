'use client'

/**
 * Live HR Grid
 *
 * Responsive grid of athlete HR cards.
 */

import { LiveHRParticipantData } from '@/lib/live-hr/types'
import { AthleteHRCard } from './AthleteHRCard'
import { Users } from 'lucide-react'

interface LiveHRGridProps {
  participants: LiveHRParticipantData[]
  onRemoveParticipant?: (clientId: string) => void
}

export function LiveHRGrid({ participants, onRemoveParticipant }: LiveHRGridProps) {
  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Inga atleter i sessionen</p>
        <p className="text-sm">Lägg till atleter för att börja övervaka deras puls</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {participants.map((participant) => (
        <AthleteHRCard
          key={participant.id}
          participant={participant}
          onRemove={onRemoveParticipant}
        />
      ))}
    </div>
  )
}
