'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
}

interface CreateIntervalSessionDialogProps {
  teams: Team[]
  businessSlug?: string
}

export function CreateIntervalSessionDialog({
  teams,
  businessSlug,
}: CreateIntervalSessionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState<string>('')
  const [sportType, setSportType] = useState<string>('')
  const [intervalCount, setIntervalCount] = useState('')
  const [targetDuration, setTargetDuration] = useState('')
  const [restDuration, setRestDuration] = useState('')

  const handleCreate = async () => {
    setLoading(true)
    try {
      const protocol =
        intervalCount || targetDuration || restDuration
          ? {
              ...(intervalCount ? { intervalCount: parseInt(intervalCount) } : {}),
              ...(targetDuration ? { targetDurationSeconds: parseInt(targetDuration) } : {}),
              ...(restDuration ? { restDurationSeconds: parseInt(restDuration) } : {}),
            }
          : undefined

      const res = await fetch('/api/coach/interval-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          teamId: teamId && teamId !== 'none' ? teamId : undefined,
          sportType: sportType && sportType !== 'none' ? sportType : undefined,
          protocol,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create session')
      }

      const { session } = await res.json()
      toast.success('Session skapad')
      setOpen(false)
      const base = businessSlug ? `/${businessSlug}` : ''
      router.push(`${base}/coach/interval-sessions/${session.id}`)
    } catch {
      toast.error('Kunde inte skapa session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ny intervallsession
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa intervallsession</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Namn (valfritt)</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. 5x1000m intervaller"
            />
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Lag (valfritt)</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Valj lag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget lag</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Sport (valfritt)</Label>
            <Select value={sportType} onValueChange={setSportType}>
              <SelectTrigger>
                <SelectValue placeholder="Valj sport..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen specifik</SelectItem>
                <SelectItem value="RUNNING">Lopning</SelectItem>
                <SelectItem value="CYCLING">Cykling</SelectItem>
                <SelectItem value="SKIING">Skidakning</SelectItem>
                <SelectItem value="SWIMMING">Simning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Protokoll (valfritt)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Antal intervaller</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={intervalCount}
                  onChange={(e) => setIntervalCount(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Malduration (s)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(e.target.value)}
                  placeholder="240"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vila (s)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={restDuration}
                  onChange={(e) => setRestDuration(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Skapar...' : 'Skapa session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
