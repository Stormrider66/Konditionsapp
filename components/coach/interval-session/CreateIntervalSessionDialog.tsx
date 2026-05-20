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
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

const getSportLabels = (locale: AppLocale) => ({
  RUNNING: copy(locale, 'Running', 'Löpning'),
  CYCLING: copy(locale, 'Cycling', 'Cykling'),
  SKIING: copy(locale, 'Skiing', 'Skidåkning'),
  SWIMMING: copy(locale, 'Swimming', 'Simning'),
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
  GENERAL_FITNESS: copy(locale, 'General fitness', 'Allmän fitness'),
  FUNCTIONAL_FITNESS: copy(locale, 'Functional fitness', 'Funktionell fitness'),
  STRENGTH: copy(locale, 'Strength', 'Styrka'),
  FOOTBALL: copy(locale, 'Football', 'Fotboll'),
  ICE_HOCKEY: copy(locale, 'Ice hockey', 'Ishockey'),
  HANDBALL: copy(locale, 'Handball', 'Handboll'),
  FLOORBALL: copy(locale, 'Floorball', 'Innebandy'),
  BASKETBALL: copy(locale, 'Basketball', 'Basket'),
  VOLLEYBALL: copy(locale, 'Volleyball', 'Volleyboll'),
  TENNIS: 'Tennis',
  PADEL: 'Padel',
})

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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const sportLabels = getSportLabels(locale)
  const router = useRouter()
  const [open, setOpen] = useState(autoOpen)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState<string>(defaultTeamId || '')
  const [sportType, setSportType] = useState<string>('')
  const [intervalCount, setIntervalCount] = useState('')
  const [targetDuration, setTargetDuration] = useState('')
  const [restDuration, setRestDuration] = useState('')
  const [restMode, setRestMode] = useState<'NONE' | 'INDIVIDUAL' | 'GROUP'>('NONE')
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
    toast.success(copy(locale, 'Template applied', 'Mall tillämpad'))
  }

  const handleSaveTemplate = async () => {
    if (!name) {
      toast.error(copy(locale, 'Enter a name for the template', 'Ange ett namn för mallen'))
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
        toast.success(copy(locale, 'Template saved', 'Mall sparad'))
      }
    } catch {
      toast.error(copy(locale, 'Could not save template', 'Kunde inte spara mall'))
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
          restMode: restMode !== 'NONE' ? restMode : undefined,
          protocol,
          scheduledDate: scheduledDate || undefined,
          scheduledTime: scheduledTime || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create session')
      }

      const { session } = await res.json()
      toast.success(copy(locale, 'Session created', 'Session skapad'))
      setOpen(false)
      const base = businessSlug ? `/${businessSlug}` : ''
      router.push(`${base}/coach/interval-sessions/${session.id}`)
    } catch {
      toast.error(copy(locale, 'Could not create session', 'Kunde inte skapa session'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0 whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{copy(locale, 'New interval session', 'Ny intervallsession')}</span>
          <span className="sm:hidden">{copy(locale, 'New session', 'Ny session')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy(locale, 'Create interval session', 'Skapa intervallsession')}</DialogTitle>
        </DialogHeader>

        {/* Template picker */}
        {showTemplates ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {copy(locale, 'No saved templates', 'Inga sparade mallar')}
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
                      {t.protocol.intervalCount && copy(locale, `${t.protocol.intervalCount} intervals`, `${t.protocol.intervalCount} intervaller`)}
                      {t.protocol.targetDurationSeconds &&
                        ` | ${t.protocol.targetDurationSeconds}s`}
                      {t.protocol.restDurationSeconds &&
                        copy(locale, ` | ${t.protocol.restDurationSeconds}s rest`, ` | ${t.protocol.restDurationSeconds}s vila`)}
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
              {copy(locale, 'Back', 'Tillbaka')}
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
                {copy(locale, 'Load template', 'Ladda mall')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleSaveTemplate}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {copy(locale, 'Save as template', 'Spara som mall')}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">{copy(locale, 'Name (optional)', 'Namn (valfritt)')}</Label>
                <Input
                  id="session-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy(locale, 'e.g. 5x1000m intervals', 't.ex. 5x1000m intervaller')}
                />
              </div>

              {teams.length > 0 && (
                <div className="space-y-2">
                  <Label>{copy(locale, 'Team (optional)', 'Lag (valfritt)')}</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder={copy(locale, 'Select team...', 'Välj lag...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{copy(locale, 'No team', 'Inget lag')}</SelectItem>
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
                <Label>{copy(locale, 'Sport (optional)', 'Sport (valfritt)')}</Label>
                <Select value={sportType} onValueChange={setSportType}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy(locale, 'Select sport...', 'Välj sport...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{copy(locale, 'No specific sport', 'Ingen specifik')}</SelectItem>
                    {/* Endurance */}
                    <SelectItem value="RUNNING">{sportLabels.RUNNING}</SelectItem>
                    <SelectItem value="CYCLING">{sportLabels.CYCLING}</SelectItem>
                    <SelectItem value="SKIING">{sportLabels.SKIING}</SelectItem>
                    <SelectItem value="SWIMMING">{sportLabels.SWIMMING}</SelectItem>
                    <SelectItem value="TRIATHLON">{sportLabels.TRIATHLON}</SelectItem>
                    {/* Functional */}
                    <SelectItem value="HYROX">{sportLabels.HYROX}</SelectItem>
                    <SelectItem value="GENERAL_FITNESS">{sportLabels.GENERAL_FITNESS}</SelectItem>
                    <SelectItem value="FUNCTIONAL_FITNESS">{sportLabels.FUNCTIONAL_FITNESS}</SelectItem>
                    <SelectItem value="STRENGTH">{sportLabels.STRENGTH}</SelectItem>
                    {/* Team */}
                    <SelectItem value="FOOTBALL">{sportLabels.FOOTBALL}</SelectItem>
                    <SelectItem value="ICE_HOCKEY">{sportLabels.ICE_HOCKEY}</SelectItem>
                    <SelectItem value="HANDBALL">{sportLabels.HANDBALL}</SelectItem>
                    <SelectItem value="FLOORBALL">{sportLabels.FLOORBALL}</SelectItem>
                    <SelectItem value="BASKETBALL">{sportLabels.BASKETBALL}</SelectItem>
                    <SelectItem value="VOLLEYBALL">{sportLabels.VOLLEYBALL}</SelectItem>
                    {/* Racket */}
                    <SelectItem value="TENNIS">{sportLabels.TENNIS}</SelectItem>
                    <SelectItem value="PADEL">{sportLabels.PADEL}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">{copy(locale, 'Protocol (optional)', 'Protokoll (valfritt)')}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{copy(locale, 'Number of intervals', 'Antal intervaller')}</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={intervalCount}
                      onChange={(e) => setIntervalCount(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{copy(locale, 'Target duration (s)', 'Målduration (s)')}</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={targetDuration}
                      onChange={(e) => setTargetDuration(e.target.value)}
                      placeholder="240"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{copy(locale, 'Rest (s)', 'Vila (s)')}</Label>
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

              {/* Rest mode selector - only show when rest duration is set */}
              {restDuration && parseInt(restDuration) > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">{copy(locale, 'Rest mode', 'Viloläge')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestMode('NONE')}
                      className={`rounded-lg border p-2.5 text-center text-xs transition-colors ${
                        restMode === 'NONE'
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-muted hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium mb-0.5">{copy(locale, 'Manual', 'Manuell')}</div>
                      <div className="text-muted-foreground">{copy(locale, 'No auto-rest', 'Ingen auto-vila')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestMode('INDIVIDUAL')}
                      className={`rounded-lg border p-2.5 text-center text-xs transition-colors ${
                        restMode === 'INDIVIDUAL'
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-muted hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium mb-0.5">{copy(locale, 'Individual', 'Individuell')}</div>
                      <div className="text-muted-foreground">{copy(locale, 'Rest per athlete', 'Vila per atlet')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestMode('GROUP')}
                      className={`rounded-lg border p-2.5 text-center text-xs transition-colors ${
                        restMode === 'GROUP'
                          ? 'border-primary bg-primary/10 font-medium'
                          : 'border-muted hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-medium mb-0.5">{copy(locale, 'Group', 'Grupp')}</div>
                      <div className="text-muted-foreground">{copy(locale, 'Shared rest', 'Gemensam vila')}</div>
                    </button>
                  </div>
                  {restMode === 'INDIVIDUAL' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {copy(locale, 'Rest starts for each athlete when they are registered. The next interval starts automatically when everyone has finished resting.', 'Vila startar för varje atlet när de registreras. Nästa intervall startar automatiskt när alla vilat klart.')}
                    </p>
                  )}
                  {restMode === 'GROUP' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {copy(locale, 'Shared rest starts when the last athlete is registered or manually. The next interval starts automatically.', 'Gemensam vila startar när sista atleten registreras eller manuellt. Nästa intervall startar automatiskt.')}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">{copy(locale, 'Schedule (optional)', 'Schemalägg (valfritt)')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{copy(locale, 'Date', 'Datum')}</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{copy(locale, 'Time', 'Tid')}</Label>
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
                {copy(locale, 'Cancel', 'Avbryt')}
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? copy(locale, 'Creating...', 'Skapar...') : copy(locale, 'Create session', 'Skapa session')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
