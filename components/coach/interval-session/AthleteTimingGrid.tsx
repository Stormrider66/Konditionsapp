'use client'

import { AthleteTimingButton } from './AthleteTimingButton'
import type { IntervalParticipantData, RestMode } from '@/lib/interval-session/types'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface AthleteTimingGridProps {
  participants: IntervalParticipantData[]
  currentInterval: number
  disabled: boolean
  onTap: (clientId: string) => void
  onUndo: (clientId: string, intervalNumber: number) => void
  restMode?: RestMode
  restDurationSeconds?: number | null
}

export function AthleteTimingGrid({
  participants,
  currentInterval,
  disabled,
  onTap,
  onUndo,
  restMode = 'NONE',
  restDurationSeconds,
}: AthleteTimingGridProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {copy(locale, 'No athletes added. Add athletes to get started.', 'Inga atleter tillagda. Lägg till atleter för att börja.')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
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
          restMode={restMode}
          restDurationSeconds={restDurationSeconds}
          restStartedAt={p.restStartedAt}
          athleteCurrentInterval={p.athleteCurrentInterval}
          allIntervalsCompleted={p.allIntervalsCompleted}
        />
      ))}
    </div>
  )
}
