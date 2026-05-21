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

interface CreateSessionDialogProps {
  teams: Team[]
  onCreate: (data: { name?: string; teamId?: string }) => Promise<void>
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  trigger: string
  title: string
  description: string
  nameLabel: string
  namePlaceholder: string
  teamLabel: string
  teamPlaceholder: string
  noTeam: string
  teamHelp: string
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
    teamLabel: 'Add team (optional)',
    teamPlaceholder: 'Select team to monitor',
    noTeam: 'No team',
    teamHelp: 'All team members are automatically added to the session.',
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
    teamLabel: 'Lägg till lag (valfritt)',
    teamPlaceholder: 'Välj lag att övervaka',
    noTeam: 'Inget lag',
    teamHelp: 'Alla lagmedlemmar läggs automatiskt till i sessionen.',
    cancel: 'Avbryt',
    starting: 'Startar...',
    start: 'Starta session',
  },
}

export function CreateSessionDialog({ teams, onCreate }: CreateSessionDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState<string>('')

  const handleCreate = async () => {
    setIsLoading(true)
    try {
      await onCreate({
        name: name || undefined,
        teamId: teamId || undefined,
      })
      setOpen(false)
      setName('')
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

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="team">{copy.teamLabel}</Label>
              <Select value={teamId || '__none__'} onValueChange={(v) => setTeamId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={copy.teamPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{copy.noTeam}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {copy.teamHelp}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
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
