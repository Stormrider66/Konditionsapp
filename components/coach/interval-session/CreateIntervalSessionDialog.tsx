'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Save, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
}

interface Template {
  id: string
  name: string
  sportType: string | null
  protocol: {
    intervalCount?: number
    targetDurationSeconds?: number
    restDurationSeconds?: number
    description?: string
  }
}

interface CreateIntervalSessionDialogProps {
  teams: Team[]
  businessSlug?: string
  defaultTeamId?: string
  autoOpen?: boolean
}

export function CreateIntervalSessionDialog({
  teams,
  businessSlug,
  defaultTeamId,
  autoOpen = false,
}: CreateIntervalSessionDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(autoOpen)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState<string>(defaultTeamId || '')
  const [sportType, setSportType] = useState<string>('')
  const [intervalCount, setIntervalCount] = useState('')
  const [targetDuration, setTargetDuration] = useState('')
  const [restDuration, setRestDuration] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  // Load templates when dialog opens
  useEffect(() => {
    if (open && templates.length === 0) {
      fetch('/api/coach/interval-sessions/templates')
        .then((res) => res.json())
        .then((data) => setTemplates(data.templates || []))
        .catch(() => {})
    }
  }, [open, templates.length])

  const applyTemplate = (template: Template) => {
    setName(template.name)
    if (template.sportType) setSportType(template.sportType)
    const p = template.protocol
    if (p.intervalCount) setIntervalCount(String(p.intervalCount))
    if (p.targetDurationSeconds) setTargetDuration(String(p.targetDurationSeconds))
    if (p.restDurationSeconds) setRestDuration(String(p.restDurationSeconds))
    setShowTemplates(false)
    toast.success('Mall tillampad')
  }

  const handleSaveTemplate = async () => {
    if (!name) {
      toast.error('Ange ett namn for mallen')
      return
    }

    const protocol = {
      ...(intervalCount ? { intervalCount: parseInt(intervalCount) } : {}),
      ...(targetDuration ? { targetDurationSeconds: parseInt(targetDuration) } : {}),
      ...(restDuration ? { restDurationSeconds: parseInt(restDuration) } : {}),
    }

    try {
      const res = await fetch('/api/coach/interval-sessions/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sportType: sportType && sportType !== 'none' ? sportType : undefined,
          protocol,
        }),
      })

      if (res.ok) {
        const { template } = await res.json()
        setTemplates((prev) => [template, ...prev])
        toast.success('Mall sparad')
      }
    } catch {
      toast.error('Kunde inte spara mall')
    }
  }

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
          scheduledDate: scheduledDate || undefined,
          scheduledTime: scheduledTime || undefined,
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

        {/* Template picker */}
        {showTemplates ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Inga sparade mallar
              </p>
            ) : (
              templates.map((t) => (
                <Button
                  key={t.id}
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => applyTemplate(t)}
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.protocol.intervalCount && `${t.protocol.intervalCount} intervaller`}
                      {t.protocol.targetDurationSeconds &&
                        ` | ${t.protocol.targetDurationSeconds}s`}
                      {t.protocol.restDurationSeconds &&
                        ` | ${t.protocol.restDurationSeconds}s vila`}
                    </div>
                  </div>
                </Button>
              ))
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowTemplates(false)}
            >
              Tillbaka
            </Button>
          </div>
        ) : (
          <>
            {/* Template actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowTemplates(true)}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Ladda mall
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleSaveTemplate}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Spara som mall
              </Button>
            </div>

            <div className="space-y-4">
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

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Schemalägg (valfritt)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Datum</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tid</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
