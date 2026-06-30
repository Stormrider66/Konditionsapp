'use client'

/**
 * Live HR Grid
 *
 * Responsive grid of athlete HR cards.
 */

import { LiveHRParticipantData, LiveHRWorkflowAssignment, LiveHRWorkflowBlock } from '@/lib/live-hr/types'
import { AthleteHRCard } from './AthleteHRCard'
import { Users } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface LiveHRGridProps {
  participants: LiveHRParticipantData[]
  assignments?: Record<string, LiveHRWorkflowAssignment>
  activeBlockForClient?: (clientId: string) => LiveHRWorkflowBlock | null
  nowMs?: number
  onRemoveParticipant?: (clientId: string) => void
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  emptyTitle: string
  emptyHint: string
}> = {
  en: {
    emptyTitle: 'No athletes in the session',
    emptyHint: 'Add athletes to start monitoring their heart rate',
  },
  sv: {
    emptyTitle: 'Inga atleter i sessionen',
    emptyHint: 'Lägg till atleter för att börja övervaka deras puls',
  },
}

export function LiveHRGrid({ participants, assignments = {}, activeBlockForClient, nowMs, onRemoveParticipant }: LiveHRGridProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">{copy.emptyTitle}</p>
        <p className="text-sm">{copy.emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {participants.map((participant) => (
        <AthleteHRCard
          key={participant.id}
          participant={participant}
          assignment={assignments[participant.clientId]}
          activeBlock={activeBlockForClient?.(participant.clientId) ?? null}
          nowMs={nowMs}
          onRemove={onRemoveParticipant}
        />
      ))}
    </div>
  )
}
