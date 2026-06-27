'use client'

/**
 * Coach Calendar Client Component
 *
 * Interactive calendar overview with athlete filtering and quick navigation.
 */

import { useState } from 'react'
import Link from 'next/link'
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import {
  Calendar,
  CalendarDays,
  Trophy,
  MapPin,
  ChevronRight,
  Clock,
  Dumbbell,
  Users,
  Filter,
  Search,
  Zap,
  CheckCircle2,
  Circle,
  Plane,
  Mountain,
  AlertTriangle,
} from 'lucide-react'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from '@/i18n/client'

interface Athlete {
  id: string
  name: string
  email: string | null
  teamId: string | null
  sportProfile: {
    primarySport: string
  } | null
}

interface Team {
  id: string
  name: string
}

const SPORT_LABEL_KEYS: Record<string, string> = {
  RUNNING: 'sports.running',
  CYCLING: 'sports.cycling',
  SKIING: 'sports.skiing',
  SWIMMING: 'sports.swimming',
  TRIATHLON: 'sports.triathlon',
  HYROX: 'sports.hyrox',
  GENERAL_FITNESS: 'sports.generalFitness',
  FUNCTIONAL_FITNESS: 'sports.functionalFitness',
  STRENGTH: 'sports.strength',
  TEAM_FOOTBALL: 'sports.football',
  TEAM_ICE_HOCKEY: 'sports.iceHockey',
  TEAM_HANDBALL: 'sports.handball',
  TEAM_FLOORBALL: 'sports.floorball',
  TEAM_BASKETBALL: 'sports.basketball',
  TEAM_VOLLEYBALL: 'sports.volleyball',
  TENNIS: 'sports.tennis',
  PADEL: 'sports.padel',
}

interface CalendarEventData {
  id: string
  title: string
  type: string
  startDate: Date
  endDate: Date | null
  trainingImpact: string | null
  client: {
    id: string
    name: string
  }
}

interface AssignedTeamEventData {
  id: string
  title: string
  type: string
  startDate: Date
  endDate: Date | null
  location: string | null
  team: {
    id: string
    name: string
  }
}

interface WorkoutData {
  id: string
  name: string
  type: string
  intensity: string
  completed: boolean
  athlete: {
    id: string
    name: string
  }
}

interface CoachCalendarClientProps {
  athletes: Athlete[]
  upcomingEvents: CalendarEventData[]
  assignedTeamEvents?: AssignedTeamEventData[]
  todaysWorkouts: WorkoutData[]
  upcomingRaces: CalendarEventData[]
  basePath?: string
  teams?: Team[]
  sports?: string[]
}

const EVENT_TYPE_CONFIG: Record<string, { labelKey: string; icon: React.ElementType; color: string }> = {
  RACE_A: { labelKey: 'events.raceA', icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10' },
  RACE_B: { labelKey: 'events.raceB', icon: Trophy, color: 'text-orange-500 bg-orange-500/10' },
  RACE_C: { labelKey: 'events.raceC', icon: Trophy, color: 'text-blue-500 bg-blue-500/10' },
  COMPETITION: { labelKey: 'events.competition', icon: Trophy, color: 'text-purple-500 bg-purple-500/10' },
  ALTITUDE_CAMP: { labelKey: 'events.altitudeCamp', icon: Mountain, color: 'text-cyan-500 bg-cyan-500/10' },
  TRAINING_CAMP: { labelKey: 'events.trainingCamp', icon: MapPin, color: 'text-green-500 bg-green-500/10' },
  TRAVEL: { labelKey: 'events.travel', icon: Plane, color: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300' },
  ILLNESS: { labelKey: 'events.illness', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  REST_DAY: { labelKey: 'events.restDay', icon: Clock, color: 'text-emerald-500 bg-emerald-500/10' },
}

function formatRelativeDate(date: Date, localeCode: 'sv' | 'en'): string {
  const locale = localeCode === 'en' ? enUS : sv
  if (isToday(date)) return localeCode === 'en' ? 'Today' : 'Idag'
  if (isTomorrow(date)) return localeCode === 'en' ? 'Tomorrow' : 'Imorgon'
  const days = differenceInDays(date, new Date())
  if (days < 7) return format(date, 'EEEE', { locale })
  return format(date, 'd MMM', { locale })
}

export function CoachCalendarClient({
  athletes,
  upcomingEvents,
  assignedTeamEvents = [],
  todaysWorkouts,
  upcomingRaces,
  basePath = '',
  teams = [],
  sports = [],
}: CoachCalendarClientProps) {
  const t = useTranslations('components.coachCalendar')
  const locale = useLocale()
  const localeCode = locale === 'en' ? 'en' : 'sv'

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [selectedSport, setSelectedSport] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get athlete IDs matching the team and sport filters
  const getFilteredAthleteIds = () => {
    let filtered = athletes

    if (selectedTeamId !== 'all') {
      filtered = filtered.filter(a => a.teamId === selectedTeamId)
    }

    if (selectedSport !== 'all') {
      filtered = filtered.filter(a => a.sportProfile?.primarySport === selectedSport)
    }

    return filtered.map(a => a.id)
  }

  const filteredAthleteIds = getFilteredAthleteIds()

  // Filter athletes by search and team/sport filters
  const filteredAthletes = athletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTeam = selectedTeamId === 'all' || a.teamId === selectedTeamId
    const matchesSport = selectedSport === 'all' || a.sportProfile?.primarySport === selectedSport
    return matchesSearch && matchesTeam && matchesSport
  })

  // Filter events by selected athlete, team, and sport
  const filteredEvents = upcomingEvents.filter(e => {
    if (selectedAthleteId !== 'all') {
      return e.client.id === selectedAthleteId
    }
    return filteredAthleteIds.includes(e.client.id)
  })

  const filteredTeamEvents = selectedAthleteId === 'all'
    ? assignedTeamEvents.filter(event => selectedTeamId === 'all' || event.team.id === selectedTeamId)
    : []

  const filteredWorkouts = todaysWorkouts.filter(w => {
    if (selectedAthleteId !== 'all') {
      return w.athlete.id === selectedAthleteId
    }
    return filteredAthleteIds.includes(w.athlete.id)
  })

  const filteredRaces = upcomingRaces.filter(r => {
    if (selectedAthleteId !== 'all') {
      return r.client.id === selectedAthleteId
    }
    return filteredAthleteIds.includes(r.client.id)
  })

  const completedWorkouts = filteredWorkouts.filter(w => w.completed).length
  const totalWorkouts = filteredWorkouts.length

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('subtitle')}
        actions={
          <>
            {/* Team Filter */}
            {teams.length > 0 && (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[160px] border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60">
                  <Users className="h-4 w-4 text-zinc-500" />
                  <SelectValue placeholder={t('filters.teamPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allTeams')}</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sport Filter */}
            {sports.length > 0 && (
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-[160px] border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60">
                  <Dumbbell className="h-4 w-4 text-zinc-500" />
                  <SelectValue placeholder={t('filters.sportPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allSports')}</SelectItem>
                  {sports.map(sport => (
                    <SelectItem key={sport} value={sport}>
                      {SPORT_LABEL_KEYS[sport] ? t(SPORT_LABEL_KEYS[sport]) : sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Athlete Filter */}
            <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="w-[180px] border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60">
                <Filter className="h-4 w-4 text-zinc-500" />
                <SelectValue placeholder={t('filters.athletePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allAthletes')}</SelectItem>
                {filteredAthletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <RolePanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('stats.athletes')}</p>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{athletes.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('stats.todaysWorkouts')}</p>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {completedWorkouts}/{totalWorkouts}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Dumbbell className="h-5 w-5" />
              </div>
            </div>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('stats.upcomingEvents')}</p>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{filteredEvents.length + filteredTeamEvents.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </RolePanel>

          <RolePanel className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('stats.races')}</p>
                <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{filteredRaces.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
          </RolePanel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's Workouts */}
          <RolePanel className="lg:col-span-1">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <Zap className="h-5 w-5 text-amber-500" />
                {t('sections.todayWorkouts')}
              </h2>
            </div>
            <div className="p-0">
              {filteredWorkouts.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                  {t('workouts.empty')}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/10">
                  {filteredWorkouts.map(workout => (
                    <Link
                      key={workout.id}
                      href={`${basePath}/coach/athletes/${workout.athlete.id}/calendar`}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md border',
                        workout.completed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                      )}>
                        {workout.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {workout.name || workout.type}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{workout.athlete.name}</p>
                      </div>
                      {workout.intensity && (
                        <Badge variant="outline" className="border-zinc-200 text-xs dark:border-white/10">
                          {workout.intensity}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </RolePanel>

          {/* Upcoming Events */}
          <RolePanel className="lg:col-span-2">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                {t('sections.upcomingEvents')}
              </h2>
            </div>
            <div className="p-0">
              {filteredEvents.length === 0 && filteredTeamEvents.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                  {t('events.empty')}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/10">
                  {filteredTeamEvents.slice(0, 10).map(event => (
                    <Link
                      key={`team-${event.id}`}
                      href={`${basePath}/coach/teams/${event.team.id}/calendar`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                            {event.title}
                          </p>
                          <Badge variant="outline" className="shrink-0 border-zinc-200 text-xs dark:border-white/10">
                            {localeCode === 'sv' ? 'Lagpass' : 'Team session'}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {event.team.name} • {formatRelativeDate(new Date(event.startDate), localeCode)}
                          {event.location ? ` • ${event.location}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </Link>
                  ))}
                  {filteredEvents.slice(0, 10).map(event => {
                    const config = EVENT_TYPE_CONFIG[event.type] || {
                      labelKey: 'events.unknown',
                      icon: Calendar,
                      color: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
                    }
                    const Icon = config.icon

                    return (
                      <Link
                        key={event.id}
                        href={`${basePath}/coach/athletes/${event.client.id}/calendar`}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      >
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-md border',
                          config.color
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                              {event.title}
                            </p>
                            <Badge variant="outline" className="shrink-0 border-zinc-200 text-xs dark:border-white/10">
                              {config.labelKey === 'events.unknown' ? event.type : t(config.labelKey)}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {event.client.name} • {formatRelativeDate(new Date(event.startDate), localeCode)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </RolePanel>
        </div>

        {/* Athlete Quick Access */}
        <RolePanel>
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <Users className="h-5 w-5 text-violet-500" />
                {t('sections.quickAccess')}
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-zinc-200 bg-white pl-9 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-950/60"
                />
              </div>
            </div>
          </div>
          <div className="p-5">
            {filteredAthletes.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                {t('athletes.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredAthletes.map(athlete => (
                  <Link
                    key={athlete.id}
                    href={`${basePath}/coach/athletes/${athlete.id}/calendar`}
                    className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                      {athlete.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950 transition-colors group-hover:text-blue-700 dark:text-zinc-50 dark:group-hover:text-blue-300">
                        {athlete.name}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </RolePanel>
      </div>
    </RolePageFrame>
  )
}
