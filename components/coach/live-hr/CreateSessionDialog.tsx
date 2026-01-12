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

interface Team {
  id: string
  name: string
}

interface CreateSessionDialogProps {
  teams: Team[]
  onCreate: (data: { name?: string; teamId?: string }) => Promise<void>
}

export function CreateSessionDialog({ teams, onCreate }: CreateSessionDialogProps) {
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
          Starta live-session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Starta ny live HR-session</DialogTitle>
          <DialogDescription>
            Skapa en session för att övervaka atleters puls i realtid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sessionsnamn (valfritt)</Label>
            <Input
              id="name"
              placeholder="t.ex. Cykelpass 2024-01-15"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="team">Lägg till lag (valfritt)</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj lag att övervaka" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Inget lag</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Alla lagmedlemmar läggs automatiskt till i sessionen.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? (
              'Startar...'
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Starta session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
