'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL_VALUE = 'all'
const NONE_VALUE = 'none'

export interface WorkoutLibraryTeamOption {
  id: string
  name: string
}

interface TeamsResponse {
  success?: boolean
  data?: Array<{
    id: string
    name: string
  }>
}

export function getDefaultTrainingYear() {
  return new Date().getFullYear()
}

export function getTrainingYearOptions(anchorYear = getDefaultTrainingYear()) {
  return Array.from({ length: 10 }, (_, index) => anchorYear + 1 - index)
}

export function useWorkoutLibraryTeams(headers?: HeadersInit) {
  const [teams, setTeams] = useState<WorkoutLibraryTeamOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTeams() {
      setLoading(true)
      try {
        const response = await fetch('/api/teams', {
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          setTeams([])
          return
        }

        const data = (await response.json()) as TeamsResponse
        setTeams(
          (data.data ?? []).map((team) => ({
            id: team.id,
            name: team.name,
          }))
        )
      } catch {
        if (!controller.signal.aborted) {
          setTeams([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadTeams()

    return () => controller.abort()
  }, [headers])

  return { teams, loading }
}

export function useTeamNameLookup(teams: WorkoutLibraryTeamOption[]) {
  return useMemo(() => {
    const names = new Map<string, string>()
    teams.forEach((team) => names.set(team.id, team.name))
    return names
  }, [teams])
}

interface WorkoutTeamYearFieldsProps {
  teams: WorkoutLibraryTeamOption[]
  teamId: string | null
  trainingYear: number | null
  onTeamIdChange: (teamId: string | null) => void
  onTrainingYearChange: (year: number | null) => void
  className?: string
  labels?: {
    team?: string
    year?: string
    noTeam?: string
    noYear?: string
  }
}

export function WorkoutTeamYearFields({
  teams,
  teamId,
  trainingYear,
  onTeamIdChange,
  onTrainingYearChange,
  className,
  labels,
}: WorkoutTeamYearFieldsProps) {
  const copy = {
    team: labels?.team ?? 'Lag',
    year: labels?.year ?? 'År',
    noTeam: labels?.noTeam ?? 'Inget lag',
    noYear: labels?.noYear ?? 'Inget år',
  }

  return (
    <div className={className ?? 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
      <div className="space-y-2">
        <Label>{copy.team}</Label>
        <Select
          value={teamId ?? NONE_VALUE}
          onValueChange={(value) => onTeamIdChange(value === NONE_VALUE ? null : value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{copy.noTeam}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{copy.year}</Label>
        <Select
          value={trainingYear == null ? NONE_VALUE : String(trainingYear)}
          onValueChange={(value) => onTrainingYearChange(value === NONE_VALUE ? null : Number(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>{copy.noYear}</SelectItem>
            {getTrainingYearOptions().map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface WorkoutTeamYearFiltersProps {
  teams: WorkoutLibraryTeamOption[]
  teamFilter: string
  yearFilter: string
  onTeamFilterChange: (teamId: string) => void
  onYearFilterChange: (year: string) => void
  className?: string
  labels?: {
    allTeams?: string
    allYears?: string
  }
}

export function WorkoutTeamYearFilters({
  teams,
  teamFilter,
  yearFilter,
  onTeamFilterChange,
  onYearFilterChange,
  className,
  labels,
}: WorkoutTeamYearFiltersProps) {
  const allTeams = labels?.allTeams ?? 'Alla lag'
  const allYears = labels?.allYears ?? 'Alla år'

  return (
    <div className={className ?? 'flex flex-col gap-3 sm:flex-row'}>
      <Select value={teamFilter} onValueChange={onTeamFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={allTeams} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allTeams}</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={yearFilter} onValueChange={onYearFilterChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder={allYears} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allYears}</SelectItem>
          {getTrainingYearOptions().map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface WorkoutTeamYearBadgesProps {
  teamName?: string | null
  trainingYear?: number | null
  className?: string
}

export function WorkoutTeamYearBadges({
  teamName,
  trainingYear,
  className,
}: WorkoutTeamYearBadgesProps) {
  if (!teamName && !trainingYear) {
    return null
  }

  return (
    <div className={className ?? 'flex flex-wrap gap-1'}>
      {teamName && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          {teamName}
        </Badge>
      )}
      {trainingYear && (
        <Badge variant="outline" className="gap-1 text-xs">
          <CalendarDays className="h-3 w-3" />
          {trainingYear}
        </Badge>
      )}
    </div>
  )
}
