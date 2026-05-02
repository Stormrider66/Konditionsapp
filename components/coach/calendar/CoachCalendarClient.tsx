'use client'

/**
 * Coach Calendar Client Component
 *
 * Interactive calendar overview with athlete filtering and quick navigation.
 */

import { useState } from 'react'
import Link from 'next/link'
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { sv } from 'date-fns/locale'
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
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
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

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Löpning',
  CYCLING: 'Cykling',
  SKIING: 'Längdskidåkning',
  SWIMMING: 'Simning',
  TRIATHLON: 'Triathlon',
  HYROX: 'HYROX',
  GENERAL_FITNESS: 'Allmän fitness',
  FUNCTIONAL_FITNESS: 'Funktionell träning',
  STRENGTH: 'Styrka',
  TEAM_FOOTBALL: 'Fotboll',
  TEAM_ICE_HOCKEY: 'Ishockey',
  TEAM_HANDBALL: 'Handboll',
  TEAM_FLOORBALL: 'Innebandy',
  TEAM_BASKETBALL: 'Basket',
  TEAM_VOLLEYBALL: 'Volleyboll',
  TENNIS: 'Tennis',
  PADEL: 'Padel',
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
  todaysWorkouts: WorkoutData[]
  upcomingRaces: CalendarEventData[]
  basePath?: string
  teams?: Team[]
  sports?: string[]
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RACE_A: { label: 'A-Tävling', icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10' },
  RACE_B: { label: 'B-Tävling', icon: Trophy, color: 'text-orange-500 bg-orange-500/10' },
  RACE_C: { label: 'C-Tävling', icon: Trophy, color: 'text-blue-500 bg-blue-500/10' },
  COMPETITION: { label: 'Tävling', icon: Trophy, color: 'text-purple-500 bg-purple-500/10' },
  ALTITUDE_CAMP: { label: 'Höjdläger', icon: Mountain, color: 'text-cyan-500 bg-cyan-500/10' },
  TRAINING_CAMP: { label: 'Träningsläger', icon: MapPin, color: 'text-green-500 bg-green-500/10' },
  TRAVEL: { label: 'Resa', icon: Plane, color: 'text-slate-400 bg-slate-500/10' },
  ILLNESS: { label: 'Sjukdom', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  REST_DAY: { label: 'Vila', icon: Clock, color: 'text-emerald-500 bg-emerald-500/10' },
}

function formatRelativeDate(date: Date): string {
  if (isToday(date)) return 'Idag'
  if (isTomorrow(date)) return 'Imorgon'
  const days = differenceInDays(date, new Date())
  if (days < 7) return format(date, 'EEEE', { locale: sv })
  return format(date, 'd MMM', { locale: sv })
}

export function CoachCalendarClient({
  athletes,
  upcomingEvents,
  todaysWorkouts,
  upcomingRaces,
  basePath = '',
  teams = [],
  sports = [],
}: CoachCalendarClientProps) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            Kalender
          </h1>
          <p className="text-muted-foreground mt-1">
            Överblick av alla atleters schema och händelser
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Team Filter */}
          {teams.length > 0 && (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Lag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla lag</SelectItem>
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
              <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border">
                <Dumbbell className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla sporter</SelectItem>
                {sports.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {SPORT_LABELS[sport] || sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Athlete Filter */}
          <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
            <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrera atlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla atleter</SelectItem>
              {filteredAthletes.map(athlete => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Atleter</p>
                <p className="text-2xl font-bold text-foreground">{athletes.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pass idag</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedWorkouts}/{totalWorkouts}
                </p>
              </div>
              <Dumbbell className="w-8 h-8 text-green-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Kommande händelser</p>
                <p className="text-2xl font-bold text-foreground">{filteredEvents.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tävlingar</p>
                <p className="text-2xl font-bold text-foreground">{filteredRaces.length}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Workouts */}
        <GlassCard className="lg:col-span-1">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Dagens pass
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0">
            {filteredWorkouts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Inga pass schemalagda idag
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredWorkouts.map(workout => (
                  <Link
                    key={workout.id}
                    href={`${basePath}/coach/athletes/${workout.athlete.id}/calendar`}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      workout.completed
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {workout.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {workout.name || workout.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{workout.athlete.name}</p>
                    </div>
                    {workout.intensity && (
                      <Badge variant="outline" className="text-xs border-border">
                        {workout.intensity}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Upcoming Events */}
        <GlassCard className="lg:col-span-2">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              Kommande händelser
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0">
            {filteredEvents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Inga kommande händelser de närmaste 14 dagarna
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredEvents.slice(0, 10).map(event => {
                  const config = EVENT_TYPE_CONFIG[event.type] || {
                    label: event.type,
                    icon: Calendar,
                    color: 'text-muted-foreground bg-muted',
                  }
                  const Icon = config.icon

                  return (
                    <Link
                      key={event.id}
                      href={`${basePath}/coach/athletes/${event.client.id}/calendar`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        config.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {event.title}
                          </p>
                          <Badge variant="outline" className="text-xs border-border shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {event.client.name} • {formatRelativeDate(new Date(event.startDate))}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  )
                })}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Athlete Quick Access */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Snabbåtkomst till kalendrar
            </GlassCardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sök atlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {filteredAthletes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Inga atleter hittades
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAthletes.map(athlete => (
                <Link
                  key={athlete.id}
                  href={`${basePath}/coach/athletes/${athlete.id}/calendar`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted border border-border/50 hover:border-border transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {athlete.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {athlete.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
