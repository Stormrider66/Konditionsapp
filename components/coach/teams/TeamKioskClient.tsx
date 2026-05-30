'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Dumbbell,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TeamKioskWorkoutPanel } from './kiosk/TeamKioskWorkoutPanel'
import {
  formatToday,
  IDLE_TIMEOUT_MS,
  type KioskApiResponse,
  type KioskMember,
  type Locale,
  statusTone,
  text,
} from './kiosk/shared'

interface TeamKioskClientProps {
  teamId: string
  teamName: string
  businessSlug: string
  locale: Locale
}

export function TeamKioskClient({
  teamId,
  teamName,
  businessSlug,
  locale,
}: TeamKioskClientProps) {
  const [members, setMembers] = useState<KioskMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [hasUnsavedSet, setHasUnsavedSet] = useState(false)
  const [activityKey, setActivityKey] = useState(0)

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessSlug })
      const response = await fetch(`/api/coach/teams/${teamId}/kiosk?${params}`, {
        headers: { 'x-business-slug': businessSlug },
      })
      const result = (await response.json()) as KioskApiResponse
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || text(locale, 'Kunde inte ladda laget.', 'Could not load the team.'))
      }
      setMembers(result.data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : text(locale, 'Kunde inte ladda laget.', 'Could not load the team.'))
    } finally {
      setLoading(false)
    }
  }, [businessSlug, locale, teamId])

  useEffect(() => {
    void Promise.resolve().then(loadRoster)
  }, [loadRoster])

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  )

  const filteredMembers = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return members
    return members.filter((member) =>
      [
        member.name,
        member.position ?? '',
        member.jerseyNumber?.toString() ?? '',
        member.assignment?.session.name ?? '',
      ].some((value) => value.toLowerCase().includes(q))
    )
  }, [filter, members])

  const activeCount = members.filter((member) => member.assignment && member.assignment.status !== 'COMPLETED').length
  const doneCount = members.filter((member) => member.assignment?.status === 'COMPLETED').length

  const registerActivity = useCallback(() => {
    setActivityKey((key) => key + 1)
  }, [])

  useEffect(() => {
    if (!selectedMemberId || hasUnsavedSet) return
    const timer = window.setTimeout(() => {
      setSelectedMemberId(null)
    }, IDLE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [activityKey, hasUnsavedSet, selectedMemberId])

  const handleSelectMember = (member: KioskMember) => {
    if (hasUnsavedSet && member.id !== selectedMemberId) {
      toast.warning(
        text(
          locale,
          'Spara eller avbryt det aktiva setet innan du byter spelare.',
          'Save or cancel the active set before switching players.'
        )
      )
      return
    }
    setSelectedMemberId(member.id)
    registerActivity()
  }

  const handleReturnToRoster = () => {
    if (hasUnsavedSet) {
      toast.warning(
        text(
          locale,
          'Spara eller avbryt det aktiva setet först.',
          'Save or cancel the active set first.'
        )
      )
      return
    }
    setSelectedMemberId(null)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0 text-slate-200 hover:bg-white/10 hover:text-white">
            <Link href={`/${businessSlug}/coach/teams/${teamId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{teamName}</p>
            <p className="text-xs text-slate-400">{formatToday(locale)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden bg-blue-500/15 text-blue-100 sm:inline-flex">
            {activeCount} {text(locale, 'aktiva', 'active')}
          </Badge>
          <Badge variant="secondary" className="hidden bg-emerald-500/15 text-emerald-100 sm:inline-flex">
            {doneCount} {text(locale, 'klara', 'done')}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            onClick={() => void loadRoster()}
          >
            <RefreshCw className="h-4 w-4" />
            {text(locale, 'Uppdatera', 'Refresh')}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[286px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-white/10 bg-slate-900 md:border-b-0 md:border-r">
          <div className="shrink-0 space-y-3 border-b border-white/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-blue-300" />
              {text(locale, 'Spelare', 'Players')}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={text(locale, 'Sök spelare', 'Search players')}
                className="h-10 border-white/10 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {text(locale, 'Laddar...', 'Loading...')}
              </div>
            ) : error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>
            ) : filteredMembers.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {text(locale, 'Inga spelare hittades.', 'No players found.')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredMembers.map((member) => (
                  <PlayerRailButton
                    key={member.id}
                    member={member}
                    selected={member.id === selectedMemberId}
                    locale={locale}
                    onClick={() => handleSelectMember(member)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="min-h-0 overflow-hidden bg-slate-100 text-slate-950">
          {!selectedMember ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <Dumbbell className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">
                  {text(locale, 'Välj spelare', 'Select a player')}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {text(
                    locale,
                    'Spelaren trycker på sitt namn i listan och loggar dagens styrkepass här.',
                    'The player taps their name in the list and logs today’s strength workout here.'
                  )}
                </p>
              </div>
            </div>
          ) : !selectedMember.assignment ? (
            <EmptyPlayerState
              member={selectedMember}
              locale={locale}
              onReturn={handleReturnToRoster}
            />
          ) : (
            <TeamKioskWorkoutPanel
              key={selectedMember.assignment.id}
              assignment={selectedMember.assignment}
              athleteName={selectedMember.name}
              teamId={teamId}
              businessSlug={businessSlug}
              locale={locale}
              onDirtyChange={setHasUnsavedSet}
              onActivity={registerActivity}
              onReturn={handleReturnToRoster}
              onLogged={() => void loadRoster()}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function PlayerRailButton({
  member,
  selected,
  locale,
  onClick,
}: {
  member: KioskMember
  selected: boolean
  locale: Locale
  onClick: () => void
}) {
  const assignment = member.assignment
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition',
        selected
          ? 'border-blue-400 bg-blue-500/20 text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-100 hover:border-blue-400/50 hover:bg-white/[0.06]'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-bold ring-1 ring-white/10">
        {member.jerseyNumber ?? <UserRound className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{member.name}</p>
        <p className="truncate text-xs text-slate-400">
          {assignment?.session.name ?? text(locale, 'Inget styrkepass idag', 'No strength today')}
        </p>
      </div>
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', assignment ? statusTone(assignment.status) : 'bg-slate-600')} />
    </button>
  )
}

function EmptyPlayerState({
  member,
  locale,
  onReturn,
}: {
  member: KioskMember
  locale: Locale
  onReturn: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
          <UserRound className="h-6 w-6 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold">{member.name}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {text(locale, 'Inget styrkepass är tilldelat för idag.', 'No strength workout is assigned for today.')}
        </p>
        <Button type="button" className="mt-4" onClick={onReturn}>
          {text(locale, 'Tillbaka till listan', 'Back to list')}
        </Button>
      </div>
    </div>
  )
}
