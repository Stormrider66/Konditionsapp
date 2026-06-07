'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, UserRound, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/i18n/client'

const ALL_VALUE = 'all'
const NONE_VALUE = 'none'
type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  athlete: string
  team: string
  year: string
  noAthlete: string
  noTeam: string
  noYear: string
  allAthletes: string
  allTeams: string
  allYears: string
}> = {
  en: {
    athlete: 'Athlete',
    team: 'Team',
    year: 'Year',
    noAthlete: 'No athlete tag',
    noTeam: 'No team',
    noYear: 'No year',
    allAthletes: 'All athletes',
    allTeams: 'All teams',
    allYears: 'All years',
  },
  sv: {
    athlete: 'Atlet',
    team: 'Lag',
    year: 'År',
    noAthlete: 'Ingen atlet',
    noTeam: 'Inget lag',
    noYear: 'Inget år',
    allAthletes: 'Alla atleter',
    allTeams: 'Alla lag',
    allYears: 'Alla år',
  },
}

export interface WorkoutLibraryTeamOption {
  id: string
  name: string
}

export interface WorkoutLibraryAthleteOption {
  id: string
  name: string
  email?: string | null
}

interface TeamsResponse {
  success?: boolean
  data?: Array<{
    id: string
    name: string
  }>
}

interface AthletesResponse {
  clients?: WorkoutLibraryAthleteOption[]
  data?: WorkoutLibraryAthleteOption[]
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

export function useWorkoutLibraryAthletes(headers?: HeadersInit, businessId?: string) {
  const [athletes, setAthletes] = useState<WorkoutLibraryAthleteOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAthletes() {
      setLoading(true)
      try {
        const url = businessId
          ? `/api/business/${businessId}/clients`
          : '/api/clients?limit=500'
        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        })

        if (!response.ok) {
          setAthletes([])
          return
        }

        const data = (await response.json()) as AthletesResponse
        setAthletes(data.clients ?? data.data ?? [])
      } catch {
        if (!controller.signal.aborted) {
          setAthletes([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadAthletes()

    return () => controller.abort()
  }, [businessId, headers])

  return { athletes, loading }
}

export function useTeamNameLookup(teams: WorkoutLibraryTeamOption[]) {
  return useMemo(() => {
    const names = new Map<string, string>()
    teams.forEach((team) => names.set(team.id, team.name))
    return names
  }, [teams])
}

interface WorkoutAthleteTagFieldProps {
  athletes: WorkoutLibraryAthleteOption[]
  athleteId: string | null
  onAthleteIdChange: (athleteId: string | null) => void
  className?: string
  labels?: {
    athlete?: string
    noAthlete?: string
  }
}

export function WorkoutAthleteTagField({
  athletes,
  athleteId,
  onAthleteIdChange,
  className,
  labels,
}: WorkoutAthleteTagFieldProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const defaults = COPY[locale]
  const copy = {
    athlete: labels?.athlete ?? defaults.athlete,
    noAthlete: labels?.noAthlete ?? defaults.noAthlete,
  }

  return (
    <div className={className ?? 'space-y-2'}>
      <Label>{copy.athlete}</Label>
      <Select
        value={athleteId ?? NONE_VALUE}
        onValueChange={(value) => onAthleteIdChange(value === NONE_VALUE ? null : value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{copy.noAthlete}</SelectItem>
          {athletes.map((athlete) => (
            <SelectItem key={athlete.id} value={athlete.id}>
              {athlete.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const defaults = COPY[locale]
  const copy = {
    team: labels?.team ?? defaults.team,
    year: labels?.year ?? defaults.year,
    noTeam: labels?.noTeam ?? defaults.noTeam,
    noYear: labels?.noYear ?? defaults.noYear,
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
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const defaults = COPY[locale]
  const allTeams = labels?.allTeams ?? defaults.allTeams
  const allYears = labels?.allYears ?? defaults.allYears

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

interface WorkoutAthleteTagFilterProps {
  athletes: WorkoutLibraryAthleteOption[]
  athleteFilter: string
  onAthleteFilterChange: (athleteId: string) => void
  className?: string
  labels?: {
    allAthletes?: string
  }
}

export function WorkoutAthleteTagFilter({
  athletes,
  athleteFilter,
  onAthleteFilterChange,
  className,
  labels,
}: WorkoutAthleteTagFilterProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const defaults = COPY[locale]
  const allAthletes = labels?.allAthletes ?? defaults.allAthletes

  return (
    <Select value={athleteFilter} onValueChange={onAthleteFilterChange}>
      <SelectTrigger className={className ?? 'w-full sm:w-[180px]'}>
        <SelectValue placeholder={allAthletes} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allAthletes}</SelectItem>
        {athletes.map((athlete) => (
          <SelectItem key={athlete.id} value={athlete.id}>
            {athlete.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

interface WorkoutAthleteTagBadgeProps {
  athleteName?: string | null
  className?: string
}

export function WorkoutAthleteTagBadge({ athleteName, className }: WorkoutAthleteTagBadgeProps) {
  if (!athleteName) return null

  return (
    <Badge variant="outline" className={className ?? 'gap-1 text-xs'}>
      <UserRound className="h-3 w-3" />
      {athleteName}
    </Badge>
  )
}
