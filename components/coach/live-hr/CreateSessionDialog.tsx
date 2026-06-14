'use client'

/**
 * Create Session Dialog
 *
 * Modal for creating a new live HR monitoring session.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Radio } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  name: string
  team?: {
    name: string | null
  } | null
}

interface CreateSessionDialogProps {
  teams: Team[]
  athletes: Athlete[]
  onCreate: (data: { name?: string; teamId?: string; participantIds?: string[] }) => Promise<void>
}

type AppLocale = 'en' | 'sv'
type ParticipantMode = 'none' | 'athlete' | 'team'

const COPY: Record<AppLocale, {
  trigger: string
  title: string
  description: string
  nameLabel: string
  namePlaceholder: string
  participantLabel: string
  participantPlaceholder: string
  athleteMode: string
  teamMode: string
  noneMode: string
  athleteLabel: string
  athletePlaceholder: string
  teamLabel: string
  teamPlaceholder: string
  cancel: string
  starting: string
  start: string
}> = {
  en: {
    trigger: 'Start live session',
    title: 'Start new live HR session',
    description: "Create a session to monitor athletes' heart rate in real time.",
    nameLabel: 'Session name (optional)',
    namePlaceholder: 'e.g. Bike session 2024-01-15',
    participantLabel: 'Participants',
    participantPlaceholder: 'Choose participants',
    athleteMode: 'One athlete',
    teamMode: 'Full team',
    noneMode: 'Add later',
    athleteLabel: 'Athlete',
    athletePlaceholder: 'Select athlete',
    teamLabel: 'Team',
    teamPlaceholder: 'Select team',
    cancel: 'Cancel',
    starting: 'Starting...',
    start: 'Start session',
  },
  sv: {
    trigger: 'Starta live-session',
    title: 'Starta ny live HR-session',
    description: 'Skapa en session för att övervaka atleters puls i realtid.',
    nameLabel: 'Sessionsnamn (valfritt)',
    namePlaceholder: 't.ex. Cykelpass 2024-01-15',
    participantLabel: 'Deltagare',
    participantPlaceholder: 'Välj deltagare',
    athleteMode: 'En atlet',
    teamMode: 'Hela laget',
    noneMode: 'Lägg till senare',
    athleteLabel: 'Atlet',
    athletePlaceholder: 'Välj atlet',
    teamLabel: 'Lag',
    teamPlaceholder: 'Välj lag',
    cancel: 'Avbryt',
    starting: 'Startar...',
    start: 'Starta session',
  },
}

export function CreateSessionDialog({ teams, athletes, onCreate }: CreateSessionDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [participantMode, setParticipantMode] = useState<ParticipantMode>('none')
  const [athleteId, setAthleteId] = useState<string>('')
  const [teamId, setTeamId] = useState<string>('')
  const needsParticipant =
    (participantMode === 'athlete' && !athleteId) ||
    (participantMode === 'team' && !teamId)

  const handleCreate = async () => {
    if (needsParticipant) return

    setIsLoading(true)
    try {
      await onCreate({
        name: name || undefined,
        teamId: participantMode === 'team' ? teamId || undefined : undefined,
        participantIds: participantMode === 'athlete' && athleteId ? [athleteId] : undefined,
      })
      setOpen(false)
      setName('')
      setParticipantMode('none')
      setAthleteId('')
      setTeamId('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Radio className="h-4 w-4 mr-2" />
          {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{copy.nameLabel}</Label>
            <Input
              id="name"
              placeholder={copy.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participant-mode">{copy.participantLabel}</Label>
            <Select
              value={participantMode}
              onValueChange={(value) => {
                setParticipantMode(value as ParticipantMode)
                setAthleteId('')
                setTeamId('')
              }}
            >
              <SelectTrigger id="participant-mode">
                <SelectValue placeholder={copy.participantPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy.noneMode}</SelectItem>
                {athletes.length > 0 && (
                  <SelectItem value="athlete">{copy.athleteMode}</SelectItem>
                )}
                {teams.length > 0 && (
                  <SelectItem value="team">{copy.teamMode}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {participantMode === 'athlete' && (
            <div className="space-y-2">
              <Label htmlFor="athlete">{copy.athleteLabel}</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger id="athlete">
                  <SelectValue placeholder={copy.athletePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.team?.name ? `${athlete.name} · ${athlete.team.name}` : athlete.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {participantMode === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="team">{copy.teamLabel}</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder={copy.teamPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || needsParticipant}>
            {isLoading ? (
              copy.starting
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                {copy.start}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
