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
}

interface CalendarEventData {
  id: string
  title: string
  eventType: string
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
  title: string | null
  type: string
  intensity: string | null
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
}: CoachCalendarClientProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter athletes by search
  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter events by selected athlete
  const filteredEvents = selectedAthleteId === 'all'
    ? upcomingEvents
    : upcomingEvents.filter(e => e.client.id === selectedAthleteId)

  const filteredWorkouts = selectedAthleteId === 'all'
    ? todaysWorkouts
    : todaysWorkouts.filter(w => w.athlete.id === selectedAthleteId)

  const completedWorkouts = filteredWorkouts.filter(w => w.completed).length
  const totalWorkouts = filteredWorkouts.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-400" />
            </div>
            Kalender
          </h1>
          <p className="text-slate-400 mt-1">
            Överblick av alla atleters schema och händelser
          </p>
        </div>

        {/* Athlete Filter */}
        <div className="flex items-center gap-3">
          <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
            <SelectTrigger className="w-[200px] bg-slate-900 border-white/10 text-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filtrera atlet" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all" className="text-white">Alla atleter</SelectItem>
              {athletes.map(athlete => (
                <SelectItem key={athlete.id} value={athlete.id} className="text-white">
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="bg-slate-900/50">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Atleter</p>
                <p className="text-2xl font-bold text-white">{athletes.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="bg-slate-900/50">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Pass idag</p>
                <p className="text-2xl font-bold text-white">
                  {completedWorkouts}/{totalWorkouts}
                </p>
              </div>
              <Dumbbell className="w-8 h-8 text-green-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="bg-slate-900/50">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Kommande händelser</p>
                <p className="text-2xl font-bold text-white">{filteredEvents.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500/50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="bg-slate-900/50">
          <GlassCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Tävlingar</p>
                <p className="text-2xl font-bold text-white">{upcomingRaces.length}</p>
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
            <GlassCardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-yellow-500" />
              Dagens pass
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0">
            {filteredWorkouts.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Inga pass schemalagda idag
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredWorkouts.map(workout => (
                  <Link
                    key={workout.id}
                    href={`/coach/athletes/${workout.athlete.id}/calendar`}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      workout.completed
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    )}>
                      {workout.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {workout.title || workout.type}
                      </p>
                      <p className="text-xs text-slate-400">{workout.athlete.name}</p>
                    </div>
                    {workout.intensity && (
                      <Badge variant="outline" className="text-xs border-white/10">
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
            <GlassCardTitle className="flex items-center gap-2 text-white">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              Kommande händelser
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="p-0">
            {filteredEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Inga kommande händelser de närmaste 14 dagarna
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredEvents.slice(0, 10).map(event => {
                  const config = EVENT_TYPE_CONFIG[event.eventType] || {
                    label: event.eventType,
                    icon: Calendar,
                    color: 'text-slate-400 bg-slate-500/10',
                  }
                  const Icon = config.icon

                  return (
                    <Link
                      key={event.id}
                      href={`/coach/athletes/${event.client.id}/calendar`}
                      className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        config.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {event.title}
                          </p>
                          <Badge variant="outline" className="text-xs border-white/10 shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {event.client.name} • {formatRelativeDate(new Date(event.startDate))}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
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
            <GlassCardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-purple-500" />
              Snabbåtkomst till kalendrar
            </GlassCardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Sök atlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {filteredAthletes.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Inga atleter hittades
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAthletes.map(athlete => (
                <Link
                  key={athlete.id}
                  href={`/coach/athletes/${athlete.id}/calendar`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {athlete.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                      {athlete.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
