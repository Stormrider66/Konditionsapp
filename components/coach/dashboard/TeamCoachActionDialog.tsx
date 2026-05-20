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
import { useTranslations } from '@/i18n/client'

export type TeamCoachAction = 'workout' | 'test' | 'message'

type TeamSummary = TeamDashboardData['teams'][number]
type WorkoutScope = 'team' | 'personal'

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
    titleKey: 'actionDetails.workout.title',
    descriptionKey: 'actionDetails.workout.description',
    icon: Dumbbell,
  },
  test: {
    titleKey: 'actionDetails.test.title',
    descriptionKey: 'actionDetails.test.description',
    icon: CalendarClock,
  },
  message: {
    titleKey: 'actionDetails.message.title',
    descriptionKey: 'actionDetails.message.description',
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
  const t = useTranslations('components.teamCoachActionDialog')
  const router = useRouter()
  const [teamId, setTeamId] = useState('')
  const [workoutScope, setWorkoutScope] = useState<WorkoutScope>('team')
  const [athleteId, setAthleteId] = useState('')
  const [workoutType, setWorkoutType] = useState('cardio')
  const [testTitle, setTestTitle] = useState(t('defaults.testTitle'))
  const [date, setDate] = useState(todayValue())
  const [time, setTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [messageTarget, setMessageTarget] = useState('ALL')
  const [messageText, setMessageText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = useMemo(() => teams.find(team => team.id === teamId), [teams, teamId])
  const selectedTeamMembers = useMemo(() => selectedTeam?.members ?? [], [selectedTeam])
  const copy = action ? actionCopy[action] : null
  const Icon = copy?.icon ?? Dumbbell

  useEffect(() => {
    if (!open) return
    const timeoutId = window.setTimeout(() => {
      setTeamId(initialTeamId || teams[0]?.id || '')
      setWorkoutScope('team')
      setAthleteId('')
      setWorkoutType('cardio')
      setTestTitle(t('defaults.testTitle'))
      setDate(todayValue())
      setTime('09:00')
      setLocation('')
      setMessageTarget('ALL')
      setMessageText('')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initialTeamId, open, teams, t])

  function handleTeamChange(nextTeamId: string) {
    setTeamId(nextTeamId)
    if (workoutScope === 'personal') {
      const nextTeam = teams.find(team => team.id === nextTeamId)
      setAthleteId(nextTeam?.members[0]?.id ?? '')
    }
  }

  function handleWorkoutScopeChange(nextScope: WorkoutScope) {
    setWorkoutScope(nextScope)
    if (nextScope === 'personal' && !athleteId) {
      setAthleteId(selectedTeamMembers[0]?.id ?? '')
    }
  }

  async function handleSubmit() {
    if (!action || !teamId) return

    if (action === 'workout') {
      const destination =
        workoutType === 'strength'
          ? `${basePath}/coach/strength`
          : workoutType === 'hybrid'
            ? `${basePath}/coach/hybrid-studio`
            : `${basePath}/coach/cardio`
      const params = new URLSearchParams({ quickCreate: '1' })

      if (workoutScope === 'personal' && athleteId) {
        params.set('fromCalendar', 'true')
        params.set('clientId', athleteId)
        params.set('date', todayValue())
      } else {
        params.set('teamId', teamId)
      }

      onOpenChange(false)
      router.push(`${destination}?${params.toString()}`)
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
        if (!response.ok) throw new Error(result.error || t('errors.bookTestFailed'))
        toast.success(t('toasts.testBooked'), {
          description: t('toasts.testBookedDescription', {
            testTitle,
            teamName: selectedTeam?.name ?? t('defaults.teamFallback'),
          }),
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
        if (!response.ok) throw new Error(result.error || t('errors.sendMessageFailed'))
        toast.success(t('toasts.messageSent'), {
          description: t('toasts.messageSentDescription', {
            count: result.sent,
            teamName: result.teamName,
          }),
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(action === 'test' ? t('toasts.testBookFailed') : t('toasts.messageSendFailed'), {
        description: error instanceof Error ? error.message : t('errors.unexpected'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const disabled =
    !teamId ||
    submitting ||
    (action === 'workout' && workoutScope === 'personal' && !athleteId) ||
    (action === 'message' && messageText.trim().length === 0) ||
    (action === 'test' && testTitle.trim().length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 items-center gap-2 pr-6">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate">{copy ? t(copy.titleKey) : t('fallbackTitle')}</span>
          </DialogTitle>
          <DialogDescription>{copy ? t(copy.descriptionKey) : undefined}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('fields.team')}</Label>
            <Select value={teamId} onValueChange={handleTeamChange}>
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder={t('fields.teamPlaceholder')} />
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
            <>
              <div className="space-y-2">
                <Label>{t('fields.workoutScope')}</Label>
                <Select value={workoutScope} onValueChange={value => handleWorkoutScopeChange(value as WorkoutScope)}>
                  <SelectTrigger className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">{t('workoutScopes.team')}</SelectItem>
                    <SelectItem value="personal">{t('workoutScopes.personal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {workoutScope === 'personal' && (
                <div className="space-y-2">
                  <Label>{t('fields.athlete')}</Label>
                  <Select value={athleteId} onValueChange={setAthleteId} disabled={selectedTeamMembers.length === 0}>
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder={t('fields.athletePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTeamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.jerseyNumber ? `#${member.jerseyNumber} ` : ''}
                          {member.name}
                          {member.position ? ` · ${member.position}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTeamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t('fields.noAthletes')}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('fields.workoutType')}</Label>
                <Select value={workoutType} onValueChange={setWorkoutType}>
                  <SelectTrigger className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">{t('workoutTypes.cardio')}</SelectItem>
                    <SelectItem value="strength">{t('workoutTypes.strength')}</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {action === 'test' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="team-test-title">{t('fields.testName')}</Label>
                <Input id="team-test-title" value={testTitle} onChange={event => setTestTitle(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="team-test-date">{t('fields.date')}</Label>
                  <Input id="team-test-date" className="min-w-0" type="date" value={date} onChange={event => setDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-test-time">{t('fields.time')}</Label>
                  <Input id="team-test-time" className="min-w-0" type="time" value={time} onChange={event => setTime(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-test-location">{t('fields.location')}</Label>
                <Input id="team-test-location" value={location} onChange={event => setLocation(event.target.value)} placeholder={t('fields.locationPlaceholder')} />
              </div>
            </>
          )}

          {action === 'message' && (
            <>
              <div className="space-y-2">
                <Label>{t('fields.recipients')}</Label>
                <Select value={messageTarget} onValueChange={setMessageTarget}>
                  <SelectTrigger className="min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('messageTargets.all')}</SelectItem>
                    <SelectItem value="LOW_READINESS">{t('messageTargets.lowReadiness')}</SelectItem>
                    <SelectItem value="MISSED_WORKOUTS">{t('messageTargets.missedWorkouts')}</SelectItem>
                    <SelectItem value="INJURED">{t('messageTargets.injured')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-message">{t('fields.message')}</Label>
                <Textarea
                  id="team-message"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  placeholder={t('fields.messagePlaceholder')}
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
            {t('buttons.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : action === 'message' ? (
              <Send className="h-4 w-4 mr-2" />
            ) : null}
            {action === 'workout' ? t('buttons.continue') : action === 'test' ? t('buttons.book') : t('buttons.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
