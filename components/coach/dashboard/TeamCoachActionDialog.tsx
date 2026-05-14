'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Dumbbell, Loader2, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { TeamDashboardData } from '@/components/coach/dashboard/TeamDashboardLayout'

export type TeamCoachAction = 'workout' | 'test' | 'message'

type TeamSummary = TeamDashboardData['teams'][number]

interface TeamCoachActionDialogProps {
  action: TeamCoachAction | null
  basePath: string
  teams: TeamSummary[]
  initialTeamId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const actionCopy = {
  workout: {
    title: 'Skapa lagpass',
    description: 'Välj lag och vilken typ av pass du vill bygga.',
    icon: Dumbbell,
  },
  test: {
    title: 'Boka lagtest',
    description: 'Lägg in ett test i lagets kalender.',
    icon: CalendarClock,
  },
  message: {
    title: 'Skicka lagmeddelande',
    description: 'Skicka ett snabbt meddelande till hela laget eller en smart grupp.',
    icon: MessageSquare,
  },
}

function todayValue() {
  return new Date().toISOString().split('T')[0]
}

export function TeamCoachActionDialog({
  action,
  basePath,
  teams,
  initialTeamId,
  open,
  onOpenChange,
}: TeamCoachActionDialogProps) {
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
  const [workoutType, setWorkoutType] = useState('cardio')
  const [testTitle, setTestTitle] = useState('Lagtest')
  const [date, setDate] = useState(todayValue())
  const [time, setTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [messageTarget, setMessageTarget] = useState('ALL')
  const [messageText, setMessageText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = useMemo(() => teams.find(team => team.id === teamId), [teams, teamId])
  const copy = action ? actionCopy[action] : null
  const Icon = copy?.icon ?? Dumbbell

  useEffect(() => {
    if (!open) return
    setTeamId(initialTeamId || teams[0]?.id || '')
    setWorkoutType('cardio')
    setTestTitle('Lagtest')
    setDate(todayValue())
    setTime('09:00')
    setLocation('')
    setMessageTarget('ALL')
    setMessageText('')
  }, [initialTeamId, open, teams])

  async function handleSubmit() {
    if (!action || !teamId) return

    if (action === 'workout') {
      const destination =
        workoutType === 'strength'
          ? `${basePath}/coach/strength`
          : workoutType === 'hybrid'
            ? `${basePath}/coach/hybrid-studio`
            : `${basePath}/coach/cardio`
      onOpenChange(false)
      router.push(`${destination}?teamId=${teamId}&quickCreate=1`)
      return
    }

    setSubmitting(true)
    try {
      const businessSlug = basePath.split('/').filter(Boolean)[0]
      if (action === 'test') {
        const startDate = new Date(`${date}T${time || '09:00'}:00`)
        const response = await fetch(`/api/coach/teams/${teamId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify({
            title: testTitle,
            type: 'TEST',
            location: location || undefined,
            startDate: startDate.toISOString(),
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Kunde inte boka testet')
        toast.success('Test bokat', {
          description: `${testTitle} lades till för ${selectedTeam?.name ?? 'laget'}.`,
        })
      } else {
        const response = await fetch(`/api/coach/teams/${teamId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify({
            target: messageTarget,
            content: messageText.trim(),
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Kunde inte skicka meddelandet')
        toast.success('Meddelande skickat', {
          description: `${result.sent} mottagare i ${result.teamName}.`,
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(action === 'test' ? 'Testet kunde inte bokas' : 'Meddelandet kunde inte skickas', {
        description: error instanceof Error ? error.message : 'Ett oväntat fel inträffade.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const disabled =
    !teamId ||
    submitting ||
    (action === 'message' && messageText.trim().length === 0) ||
    (action === 'test' && testTitle.trim().length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {copy?.title ?? 'Snabbåtgärd'}
          </DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Lag</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj lag" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {action === 'workout' && (
            <div className="space-y-2">
              <Label>Typ av pass</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">Kondition</SelectItem>
                  <SelectItem value="strength">Styrka</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {action === 'test' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="team-test-title">Testnamn</Label>
                <Input id="team-test-title" value={testTitle} onChange={event => setTestTitle(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="team-test-date">Datum</Label>
                  <Input id="team-test-date" type="date" value={date} onChange={event => setDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-test-time">Tid</Label>
                  <Input id="team-test-time" type="time" value={time} onChange={event => setTime(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-test-location">Plats</Label>
                <Input id="team-test-location" value={location} onChange={event => setLocation(event.target.value)} placeholder="t.ex. Hall A" />
              </div>
            </>
          )}

          {action === 'message' && (
            <>
              <div className="space-y-2">
                <Label>Mottagare</Label>
                <Select value={messageTarget} onValueChange={setMessageTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Hela laget</SelectItem>
                    <SelectItem value="LOW_READINESS">Låg beredskap</SelectItem>
                    <SelectItem value="MISSED_WORKOUTS">Missade pass</SelectItem>
                    <SelectItem value="INJURED">Skadeflaggor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-message">Meddelande</Label>
                <Textarea
                  id="team-message"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  placeholder="Skriv ett kort meddelande..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{messageText.length}/1000</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : action === 'message' ? (
              <Send className="h-4 w-4 mr-2" />
            ) : null}
            {action === 'workout' ? 'Fortsätt' : action === 'test' ? 'Boka' : 'Skicka'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
