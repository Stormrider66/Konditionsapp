'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Play, Radio, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { buildTeamCaptureLanePlan, type TeamCaptureMemberInput } from '@/lib/team-capture/schedule'

interface ExistingSession {
  id: string
  name: string
  status: string
  createdAt: Date | string
  masterStartedAt: Date | string | null
  _count: { participants: number }
}

interface TeamCaptureLauncherProps {
  businessSlug: string
  teamId: string
  teamName: string
  locale: 'en' | 'sv'
  members: TeamCaptureMemberInput[]
  existingSessions: ExistingSession[]
}

function text(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function TeamCaptureLauncher({
  businessSlug,
  teamId,
  teamName,
  locale,
  members,
  existingSessions,
}: TeamCaptureLauncherProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const plan = useMemo(() => buildTeamCaptureLanePlan(members), [members])
  const heatNumbers = Array.from(new Set(plan.participants.map((item) => item.heatNumber)))
  const lanes = Array.from({ length: 6 }, (_, index) => index + 1)

  const createSession = async () => {
    setCreating(true)
    try {
      const response = await fetch(`/api/coach/teams/${teamId}/capture-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: `${teamName} hybrid capture`,
          workoutType: 'HYBRID',
          workoutName: '10 rounds - BikeErg / RowErg / Run',
          participantIds: members.map((member) => member.id),
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      router.push(`/${businessSlug}/coach/teams/${teamId}/capture/${payload.data.id}`)
    } catch {
      toast.error(text(locale, 'Could not create capture session', 'Kunde inte skapa fångstpass'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold dark:text-white">
            <Radio className="h-6 w-6 text-blue-600" />
            {text(locale, 'Team capture', 'Lagfångst')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text(locale, '10 rounds: 20 cal BikeErg, 20 cal RowErg, 200 m run, 1:00 rest.', '10 rundor: 20 cal BikeErg, 20 cal RowErg, 200 m löpning, 1:00 vila.')}
          </p>
        </div>
        <Button onClick={createSession} disabled={creating || members.length === 0}>
          <Play className="mr-2 h-4 w-4" />
          {creating ? text(locale, 'Creating...', 'Skapar...') : text(locale, 'Create capture session', 'Skapa fångstpass')}
        </Button>
      </div>

      {existingSessions.length > 0 && (
        <div className="mb-4 rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="border-b px-4 py-3 font-medium dark:border-white/10 dark:text-white">
            {text(locale, 'Recent capture sessions', 'Senaste fångstpass')}
          </div>
          <div className="divide-y dark:divide-white/10">
            {existingSessions.map((session) => (
              <Link
                key={session.id}
                href={`/${businessSlug}/coach/teams/${teamId}/capture/${session.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 dark:hover:bg-white/5"
              >
                <div>
                  <p className="font-medium dark:text-white">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session._count.participants} {text(locale, 'players', 'spelare')}
                  </p>
                </div>
                <Badge variant={session.status === 'ACTIVE' ? 'default' : 'outline'}>
                  {session.status}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2 font-medium dark:text-white">
              <Users className="h-4 w-4" />
              {text(locale, 'Startlist by lane', 'Startlista per bana')}
            </div>
            <Badge variant="secondary">6 {text(locale, 'lanes', 'banor')}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground dark:border-white/10">
                <tr>
                  <th className="px-4 py-2 text-left">{text(locale, 'Lane', 'Bana')}</th>
                  {heatNumbers.map((heat) => (
                    <th key={heat} className="px-4 py-2 text-left">
                      {text(locale, 'Heat', 'Heat')} {heat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/10">
                {lanes.map((lane) => (
                  <tr key={lane}>
                    <td className="px-4 py-3 font-medium dark:text-white">{lane}</td>
                    {heatNumbers.map((heat) => {
                      const athlete = plan.participants.find((item) => item.laneNumber === lane && item.heatNumber === heat)
                      return (
                        <td key={heat} className="px-4 py-3">
                          {athlete ? (
                            <span className="dark:text-slate-100">
                              {athlete.jerseyNumber != null ? `#${athlete.jerseyNumber} ` : ''}
                              {athlete.displayName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 font-medium dark:text-white">
            <Activity className="h-4 w-4 text-emerald-600" />
            {text(locale, 'Session setup', 'Passupplägg')}
          </div>
          <div className="space-y-3 text-sm">
            <SetupRow label={text(locale, 'Players', 'Spelare')} value={String(members.length)} />
            <SetupRow label={text(locale, 'Heats', 'Heat')} value={String(heatNumbers.length)} />
            <SetupRow label={text(locale, 'BikeErgs', 'BikeErgs')} value="6" />
            <SetupRow label={text(locale, 'RowErgs', 'RowErgs')} value="6" />
            <SetupRow label={text(locale, 'Planned time per heat', 'Planerad tid per heat')} value={`${Math.round(plan.heatDurationSec / 60)} min`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SetupRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 dark:border-white/10">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium dark:text-white">{value}</span>
    </div>
  )
}
