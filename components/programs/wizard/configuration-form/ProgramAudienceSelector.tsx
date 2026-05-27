'use client'

import { useMemo } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import type { SportType } from '@prisma/client'
import { Check, ListChecks, User, Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  Client,
  ConfigFormData,
  ProgramAssignmentScope,
  TeamOption,
} from './schema'
import type { AppLocale } from './helpers'

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const scopeOptions: Array<{
  value: ProgramAssignmentScope
  icon: typeof User
  title: Record<AppLocale, string>
  description: Record<AppLocale, string>
}> = [
  {
    value: 'INDIVIDUAL',
    icon: User,
    title: { sv: 'En atlet', en: 'One athlete' },
    description: { sv: 'Skapa ett individuellt program', en: 'Create one individual program' },
  },
  {
    value: 'TEAM',
    icon: Users2,
    title: { sv: 'Hela laget', en: 'Whole team' },
    description: { sv: 'Skapa ett program per spelare i laget', en: 'Create one program per team member' },
  },
  {
    value: 'SELECTED',
    icon: ListChecks,
    title: { sv: 'Utvalda spelare', en: 'Selected players' },
    description: { sv: 'Välj vilka som ska få programmet', en: 'Choose who should receive the program' },
  },
]

interface ProgramAudienceSelectorProps {
  form: UseFormReturn<ConfigFormData>
  clients: Client[]
  teams: TeamOption[]
  sport: SportType
  locale: AppLocale
  onTeamChange?: (teamId: string) => void
}

export function ProgramAudienceSelector({
  form,
  clients,
  teams,
  sport,
  locale,
  onTeamChange,
}: ProgramAudienceSelectorProps) {
  const scope = useWatch({ control: form.control, name: 'assignmentScope' }) ?? 'INDIVIDUAL'
  const teamId = useWatch({ control: form.control, name: 'teamId' })
  const selectedClientIds = useWatch({ control: form.control, name: 'clientIds' }) ?? []

  const selectedTeam = teams.find((team) => team.id === teamId) ?? teams[0]
  const teamMembers = useMemo(() => {
    if (!selectedTeam) return []
    const clientById = new Map(clients.map((client) => [client.id, client]))
    return selectedTeam.members
      .map((member) => clientById.get(member.id) ?? member)
      .filter((member): member is Client | TeamOption['members'][number] => Boolean(member))
  }, [clients, selectedTeam])

  const supportsTeams = teams.length > 0
  if (!supportsTeams) return null

  const applyScope = (nextScope: ProgramAssignmentScope) => {
    form.setValue('assignmentScope', nextScope, { shouldDirty: true, shouldValidate: true })
    if (!selectedTeam) return

    if (selectedTeam.id !== teamId) {
      form.setValue('teamId', selectedTeam.id, { shouldDirty: true, shouldValidate: true })
      onTeamChange?.(selectedTeam.id)
    }

    if (nextScope === 'TEAM') {
      const ids = selectedTeam.members.map((member) => member.id)
      form.setValue('clientIds', ids, { shouldDirty: true, shouldValidate: true })
      if (ids[0]) form.setValue('clientId', ids[0], { shouldDirty: true, shouldValidate: true })
    }

    if (nextScope === 'SELECTED') {
      const ids = selectedClientIds.length > 0 ? selectedClientIds : selectedTeam.members.slice(0, 1).map((member) => member.id)
      form.setValue('clientIds', ids, { shouldDirty: true, shouldValidate: true })
      if (ids[0]) form.setValue('clientId', ids[0], { shouldDirty: true, shouldValidate: true })
    }
  }

  const applyTeam = (nextTeamId: string) => {
    const nextTeam = teams.find((team) => team.id === nextTeamId)
    form.setValue('teamId', nextTeamId, { shouldDirty: true, shouldValidate: true })
    onTeamChange?.(nextTeamId)

    if (!nextTeam) return
    const ids = nextTeam.members.map((member) => member.id)
    if (scope === 'TEAM') {
      form.setValue('clientIds', ids, { shouldDirty: true, shouldValidate: true })
      if (ids[0]) form.setValue('clientId', ids[0], { shouldDirty: true, shouldValidate: true })
    } else if (scope === 'SELECTED') {
      const firstId = ids[0] ? [ids[0]] : []
      form.setValue('clientIds', firstId, { shouldDirty: true, shouldValidate: true })
      if (firstId[0]) form.setValue('clientId', firstId[0], { shouldDirty: true, shouldValidate: true })
    }
  }

  const toggleMember = (clientId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...selectedClientIds, clientId]))
      : selectedClientIds.filter((id) => id !== clientId)
    form.setValue('clientIds', nextIds, { shouldDirty: true, shouldValidate: true })
    if (nextIds[0]) form.setValue('clientId', nextIds[0], { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-medium">{t(locale, 'Målgrupp', 'Audience')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {sport === 'TEAM_ICE_HOCKEY'
              ? t(locale, 'Skapa hockeyprogram för en spelare, hela laget eller en vald spelargrupp.', 'Create hockey programs for one player, the whole team, or a selected player group.')
              : t(locale, 'Välj om programmet ska skapas individuellt eller för flera atleter.', 'Choose whether the program should be created individually or for multiple athletes.')}
          </p>
        </div>
        <Badge variant="secondary">
          {selectedClientIds.length > 1
            ? t(locale, `${selectedClientIds.length} valda`, `${selectedClientIds.length} selected`)
            : t(locale, 'Individuellt', 'Individual')}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {scopeOptions.map((option) => {
          const Icon = option.icon
          const active = scope === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => applyScope(option.value)}
              className={cn(
                'flex min-h-[112px] flex-col items-start rounded-md border p-4 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-slate-200 bg-background hover:border-primary/50 dark:border-white/10 dark:bg-slate-950/40'
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4" />
                {option.title[locale]}
                {active && <Check className="ml-auto h-4 w-4 text-primary" />}
              </span>
              <span className="mt-2 text-sm text-muted-foreground">{option.description[locale]}</span>
            </button>
          )
        })}
      </div>

      {scope !== 'INDIVIDUAL' && (
        <div className="mt-4 space-y-4">
          <div className="max-w-md">
            <label className="text-sm font-medium">{t(locale, 'Lag', 'Team')}</label>
            <Select value={selectedTeam?.id ?? ''} onValueChange={applyTeam}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t(locale, 'Välj lag', 'Choose team')} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scope === 'SELECTED' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {teamMembers.map((member) => {
                const checked = selectedClientIds.includes(member.id)
                return (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm dark:border-white/10"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleMember(member.id, value === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">{member.name}</span>
                    {'position' in member && member.position && (
                      <span className="text-xs text-muted-foreground">{member.position}</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
