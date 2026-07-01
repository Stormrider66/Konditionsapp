'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Play, Radio, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { roleSurfaceClass, roleTableHeadClass } from '@/components/layouts/role-shell/RolePage'
import {
  buildDefaultTeamCaptureTemplate,
  buildTeamCaptureLanePlan,
  type TeamCaptureMemberInput,
  type TeamCaptureTemplate,
} from '@/lib/team-capture/schedule'

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
  workoutOptions: Array<{
    id: string
    type: 'CARDIO' | 'HYBRID'
    name: string
    template: TeamCaptureTemplate
    plannedFor?: Array<{
      id: string
      name: string
    }>
  }>
  initialWorkoutType?: string
  initialWorkoutId?: string
  initialTeamEventId?: string
  plannedWorkoutRequested?: boolean
}

function text(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatShortDuration(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} min`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')} min` : `${seconds} s`
}

function formatPlannedAthletes(athletes: Array<{ name: string }>): string {
  const names = athletes.map((athlete) => athlete.name)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

export function TeamCaptureLauncher({
  businessSlug,
  teamId,
  teamName,
  locale,
  members,
  existingSessions,
  workoutOptions,
  initialWorkoutType,
  initialWorkoutId,
  initialTeamEventId,
  plannedWorkoutRequested = false,
}: TeamCaptureLauncherProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [laneCount, setLaneCount] = useState(6)
  const defaultTemplate = useMemo(() => buildDefaultTeamCaptureTemplate(), [])
  const initialSelection = useMemo(() => {
    const matched = workoutOptions.find((option) =>
      option.id === initialWorkoutId &&
      (!initialWorkoutType || option.type === initialWorkoutType.toUpperCase())
    )
    return matched ? `${matched.type}:${matched.id}` : 'NONE'
  }, [initialWorkoutId, initialWorkoutType, workoutOptions])
  const [selectedWorkoutKey, setSelectedWorkoutKey] = useState(initialSelection)
  const selectedWorkout = useMemo(
    () => workoutOptions.find((option) => `${option.type}:${option.id}` === selectedWorkoutKey),
    [selectedWorkoutKey, workoutOptions]
  )
  const plannedWorkoutOptions = workoutOptions.filter((option) => (option.plannedFor?.length ?? 0) > 0)
  const savedWorkoutOptions = workoutOptions.filter((option) => !option.plannedFor?.length)
  const template = selectedWorkout?.template ?? (selectedWorkoutKey === 'DEFAULT' ? defaultTemplate : null)
  const plan = useMemo(
    () => (template ? buildTeamCaptureLanePlan(members, { template, laneCount }) : null),
    [laneCount, members, template]
  )
  const heatNumbers = plan ? Array.from(new Set(plan.participants.map((item) => item.heatNumber))) : []
  const plannedLanes = plan ? Array.from(new Set(plan.participants.map((item) => item.laneNumber))) : []
  const lanes = plannedLanes.length > 0 ? plannedLanes : Array.from({ length: 6 }, (_, index) => index + 1)
  const receiverLaneCount = plan ? new Set(plan.stations.map((station) => station.laneNumber)).size || lanes.length || 6 : lanes.length || 6
  const receiverStations = template?.stations.filter((station) => station.captureMethod === 'BLUETOOTH_STATION') ?? []
  const runOrManualStations = template?.stations.filter((station) => station.captureMethod !== 'BLUETOOTH_STATION') ?? []
  const plannedWorkoutMissing = plannedWorkoutRequested && !selectedWorkout
  const selectedWorkoutMatchesInitial =
    Boolean(
      selectedWorkout &&
      initialWorkoutId &&
      selectedWorkout.id === initialWorkoutId &&
      (!initialWorkoutType || selectedWorkout.type === initialWorkoutType.toUpperCase())
    )

  const createSession = async () => {
    if (!template) {
      toast.error(text(locale, 'Choose a Team cardio workout first', 'Välj ett lagkonditionspass först'))
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/coach/teams/${teamId}/capture-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: `${teamName} ${template.name}`,
          teamEventId: selectedWorkoutMatchesInitial ? initialTeamEventId ?? null : null,
          workoutType: selectedWorkout?.type ?? template.workoutType ?? 'HYBRID',
          workoutId: selectedWorkout?.id ?? null,
          workoutName: selectedWorkout?.name ?? template.workoutName ?? template.name,
          participantIds: members.map((member) => member.id),
          laneCount,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      router.push(`/${businessSlug}/coach/teams/${teamId}/capture/${payload.data.id}`)
    } catch {
      toast.error(text(locale, 'Could not create team cardio session', 'Kunde inte skapa lagkondition'))
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
            {text(locale, 'Team cardio', 'Lagkondition')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text(locale, 'Pick a saved Cardio/Hybrid workout, then start the lane-based team clock.', 'Välj ett sparat konditions-/hybridpass och starta sedan lagets klocka.')}
          </p>
        </div>
        <Button onClick={createSession} disabled={creating || members.length === 0 || !template}>
          <Play className="mr-2 h-4 w-4" />
          {creating ? text(locale, 'Creating...', 'Skapar...') : text(locale, 'Create team cardio', 'Skapa lagkondition')}
        </Button>
      </div>

      {existingSessions.length > 0 && (
        <div className={roleSurfaceClass('mb-4')}>
          <div className="border-b px-4 py-3 font-medium dark:border-white/10 dark:text-white">
            {text(locale, 'Recent team cardio sessions', 'Senaste lagkonditionspass')}
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

      <div className={roleSurfaceClass('mb-4 p-4')}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_2fr]">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium dark:text-white">
              {text(locale, 'Workout template', 'Passmall')}
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm dark:border-white/10"
              value={selectedWorkoutKey}
              onChange={(event) => setSelectedWorkoutKey(event.target.value)}
            >
              <option value="NONE">
                {plannedWorkoutMissing
                  ? text(locale, 'Planned workout is not Team cardio-ready', 'Planerat pass passar inte för lagkondition')
                  : text(locale, 'No Team cardio workout selected', 'Inget lagkonditionspass valt')}
              </option>
              <option value="DEFAULT">{text(locale, 'Manual default: BikeErg + RowErg + Run', 'Manuell standard: BikeErg + RowErg + löpning')}</option>
              {plannedWorkoutOptions.length > 0 && (
                <optgroup label={text(locale, 'Planned for this day', 'Planerat för dagen')}>
                  {plannedWorkoutOptions.map((option) => (
                    <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                      {option.type} · {option.name} — {formatPlannedAthletes(option.plannedFor ?? [])}
                    </option>
                  ))}
                </optgroup>
              )}
              {savedWorkoutOptions.length > 0 && (
                <optgroup label={text(locale, 'Saved workouts', 'Sparade pass')}>
                  {savedWorkoutOptions.map((option) => (
                    <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                      {option.type} · {option.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedWorkout?.plannedFor?.length ? (
              <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                {text(locale, 'Planned for', 'Planerat för')}: {formatPlannedAthletes(selectedWorkout.plannedFor)}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium dark:text-white">
              {text(locale, 'Start group', 'Startgrupp')}
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm dark:border-white/10"
              value={laneCount}
              onChange={(event) => setLaneCount(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {text(locale, 'lanes', 'banor')}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <PreflightBox label={text(locale, 'Rounds', 'Rundor')} value={template ? String(template.roundCount) : '-'} />
            <PreflightBox label={text(locale, 'Stations / lane', 'Stationer / bana')} value={template ? String(template.stations.length) : '-'} />
            <PreflightBox label={text(locale, 'Start delay', 'Startfördröjning')} value={plan ? formatShortDuration(plan.startIntervalSeconds) : '-'} />
            <PreflightBox label={text(locale, 'Per player', 'Per spelare')} value={plan ? `${Math.round(plan.heatDurationSec / 60)} min` : '-'} />
          </div>
        </div>

        {!template && (
          <div className="mt-4 rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground dark:border-white/10">
            {plannedWorkoutMissing
              ? text(locale, 'The planned workout for this day cannot be converted into Team cardio stations yet. Pick another Cardio/Hybrid workout or edit the plan.', 'Det planerade passet för dagen kan inte byggas om till lagkonditionsstationer ännu. Välj ett annat konditions-/hybridpass eller justera planen.')
              : text(locale, 'No Team cardio workout is loaded for this day. Pick a capture-ready Cardio/Hybrid workout to build lanes and stations.', 'Inget lagkonditionspass är laddat för den här dagen. Välj ett capture-ready konditions-/hybridpass för att bygga banor och stationer.')}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3 dark:border-white/10">
            <div className="mb-2 text-sm font-medium dark:text-white">
              {text(locale, 'Receiver needs', 'Mottagare som behövs')}
            </div>
            <div className="flex flex-wrap gap-2">
              {receiverStations.length > 0 ? receiverStations.map((station) => (
                <Badge key={station.stationIndex} variant="secondary">
                  {receiverLaneCount} x {station.label}
                </Badge>
              )) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
          <div className="rounded-md border p-3 dark:border-white/10">
            <div className="mb-2 text-sm font-medium dark:text-white">
              {text(locale, 'Garmin / manual segments', 'Garmin / manuella segment')}
            </div>
            <div className="flex flex-wrap gap-2">
              {runOrManualStations.length > 0 ? runOrManualStations.map((station) => (
                <Badge key={station.stationIndex} variant="outline">
                  {station.label}
                </Badge>
              )) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {template && plan ? (
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className={roleSurfaceClass()}>
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2 font-medium dark:text-white">
              <Users className="h-4 w-4" />
              {text(locale, 'Startlist by lane', 'Startlista per bana')}
            </div>
            <Badge variant="secondary">{laneCount} {text(locale, 'lanes', 'banor')}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className={roleTableHeadClass()}>
                <tr>
                  <th className="px-4 py-2 text-left">{text(locale, 'Lane', 'Bana')}</th>
                  {heatNumbers.map((heat) => (
                    <th key={heat} className="px-4 py-2 text-left">
                      {text(locale, 'Start', 'Start')} {heat}
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

        <div className={roleSurfaceClass('p-4')}>
          <div className="mb-3 flex items-center gap-2 font-medium dark:text-white">
            <Activity className="h-4 w-4 text-emerald-600" />
            {text(locale, 'Session setup', 'Passupplägg')}
          </div>
          <div className="space-y-3 text-sm">
            <SetupRow label={text(locale, 'Players', 'Spelare')} value={String(members.length)} />
            <SetupRow label={text(locale, 'Start groups', 'Startgrupper')} value={String(heatNumbers.length)} />
            <SetupRow label={text(locale, 'Bluetooth receivers', 'Bluetoothmottagare')} value={String(receiverStations.length * laneCount)} />
            <SetupRow label={text(locale, 'Workout', 'Pass')} value={template.name} />
            <SetupRow label={text(locale, 'Total planned time', 'Total planerad tid')} value={`${Math.round(plan.totalPlannedDurationSec / 60)} min`} />
          </div>
        </div>
      </div>
      ) : null}
    </div>
  )
}

function PreflightBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2 dark:border-white/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold dark:text-white">{value}</p>
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
