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
    titleKey: 'actions.workout.title',
    descriptionKey: 'actions.workout.description',
    icon: Dumbbell,
  },
  test: {
    titleKey: 'actions.test.title',
    descriptionKey: 'actions.test.description',
    icon: CalendarClock,
  },
  message: {
    titleKey: 'actions.message.title',
    descriptionKey: 'actions.message.description',
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
  const [workoutType, setWorkoutType] = useState('cardio')
  const [testTitle, setTestTitle] = useState(t('defaults.testTitle'))
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
    const timeoutId = window.setTimeout(() => {
      setTeamId(initialTeamId || teams[0]?.id || '')
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
    (action === 'message' && messageText.trim().length === 0) ||
    (action === 'test' && testTitle.trim().length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {copy ? t(copy.titleKey) : t('fallbackTitle')}
          </DialogTitle>
          <DialogDescription>{copy ? t(copy.descriptionKey) : undefined}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('fields.team')}</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
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
            <div className="space-y-2">
              <Label>{t('fields.workoutType')}</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">{t('workoutTypes.cardio')}</SelectItem>
                  <SelectItem value="strength">{t('workoutTypes.strength')}</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <Input id="team-test-date" type="date" value={date} onChange={event => setDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-test-time">{t('fields.time')}</Label>
                  <Input id="team-test-time" type="time" value={time} onChange={event => setTime(event.target.value)} />
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
                  <SelectTrigger>
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
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : action === 'message' ? (
              <Send className="h-4 w-4 mr-2" />
            ) : null}
            {action === 'workout' ? t('actions.continue') : action === 'test' ? t('actions.book') : t('actions.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
