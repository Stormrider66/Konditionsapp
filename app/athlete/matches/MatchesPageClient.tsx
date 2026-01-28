'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Plus,
  Trophy,
  Target,
  Clock,
  MapPin,
  Home,
  Plane,
  ChevronRight,
  TrendingUp,
  Activity,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { AddMatchDialog } from './AddMatchDialog'
import { MatchDetailDialog } from './MatchDetailDialog'

interface Match {
  id: string
  opponent: string
  isHome: boolean
  scheduledDate: Date | string
  venue: string | null
  competition: string | null
  matchday: number | null
  result: string | null
  minutesPlayed: number | null
  goals: number | null
  assists: number | null
  plusMinus: number | null
  penaltyMinutes: number | null
  distanceKm: number | null
  sprintDistance: number | null
  maxSpeed: number | null
}

interface SeasonStats {
  totalMatches: number
  completedMatches: number
  upcomingMatches: number
  totalGoals: number
  totalAssists: number
  totalMinutesPlayed: number
  avgDistanceKm: number | null
}

interface MatchesPageClientProps {
  matches: Match[]
  stats: SeasonStats
  clientId: string
  sportType?: string
  basePath?: string
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Idag'
  if (isTomorrow(date)) return 'Imorgon'
  return format(date, 'EEEE d MMMM', { locale: sv })
}

export function MatchesPageClient({
  matches: initialMatches,
  stats,
  clientId,
  sportType,
  basePath = '',
}: MatchesPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [matches, setMatches] = useState(initialMatches)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [activeTab, setActiveTab] = useState('upcoming')

  // Check for action=add in URL
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddDialog(true)
      // Clean up URL
      router.replace(`${basePath}/athlete/matches`)
    }
  }, [searchParams, router, basePath])

  const upcomingMatches = matches.filter(m => !m.result && new Date(m.scheduledDate) >= new Date())
  const pastMatches = matches.filter(m => m.result || new Date(m.scheduledDate) < new Date())

  // Determine which stats to show based on sport
  const isFootball = sportType === 'TEAM_FOOTBALL'
  const isHockey = sportType === 'TEAM_ICE_HOCKEY'

  const handleMatchAdded = (newMatch: Match) => {
    setMatches(prev => [newMatch, ...prev])
    setShowAddDialog(false)
  }

  const handleMatchUpdated = (updatedMatch: Match) => {
    setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m))
    setSelectedMatch(null)
  }

  const handleMatchDeleted = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId))
    setSelectedMatch(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            Matchschema
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Hantera dina matcher och logga resultat
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Lägg till match
        </Button>
      </div>

      {/* Season Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Matcher spelat</p>
                <p className="text-2xl font-bold">{stats.completedMatches}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Kommande</p>
                <p className="text-2xl font-bold">{stats.upcomingMatches}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Mål + Assist</p>
                <p className="text-2xl font-bold">
                  {stats.totalGoals} + {stats.totalAssists}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Speltid</p>
                <p className="text-2xl font-bold">
                  {Math.round(stats.totalMinutesPlayed)}
                  <span className="text-sm font-normal text-muted-foreground"> min</span>
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Matches Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            Kommande ({upcomingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <Trophy className="h-4 w-4" />
            Spelade ({pastMatches.length})
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Matches */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMatches.length === 0 ? (
            <GlassCard>
              <GlassCardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Inga kommande matcher</h3>
                <p className="text-muted-foreground mb-4">
                  Lägg till din nästa match för att hålla koll på schemat
                </p>
                <Button onClick={() => setShowAddDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Lägg till match
                </Button>
              </GlassCardContent>
            </GlassCard>
          ) : (
            upcomingMatches
              .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                  isUpcoming
                />
              ))
          )}
        </TabsContent>

        {/* Past Matches */}
        <TabsContent value="past" className="space-y-4">
          {pastMatches.length === 0 ? (
            <GlassCard>
              <GlassCardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Inga spelade matcher</h3>
                <p className="text-muted-foreground">
                  Logga resultat efter dina matcher
                </p>
              </GlassCardContent>
            </GlassCard>
          ) : (
            pastMatches
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                  showStats={isFootball || isHockey}
                />
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Match Dialog */}
      <AddMatchDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onMatchAdded={handleMatchAdded}
      />

      {/* Match Detail Dialog */}
      {selectedMatch && (
        <MatchDetailDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          onMatchUpdated={handleMatchUpdated}
          onMatchDeleted={handleMatchDeleted}
          sportType={sportType}
        />
      )}
    </div>
  )
}

// Match Card Component
function MatchCard({
  match,
  onClick,
  isUpcoming = false,
  showStats = false,
}: {
  match: Match
  onClick: () => void
  isUpcoming?: boolean
  showStats?: boolean
}) {
  const matchDate = new Date(match.scheduledDate)

  return (
    <GlassCard className="cursor-pointer hover:bg-white/5 transition-colors" onClick={onClick}>
      <GlassCardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {match.isHome ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  <Home className="h-3 w-3 mr-1" />
                  Hemma
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  <Plane className="h-3 w-3 mr-1" />
                  Borta
                </Badge>
              )}
              {match.competition && (
                <span className="text-xs text-muted-foreground">{match.competition}</span>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-1">
              {match.isHome ? 'vs' : '@'} {match.opponent}
            </h3>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {getDateLabel(matchDate)} {format(matchDate, 'HH:mm')}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {match.venue}
                </span>
              )}
            </div>
          </div>

          {/* Right: Result or upcoming indicator */}
          <div className="text-right">
            {match.result ? (
              <div>
                <p className="text-2xl font-bold">{match.result}</p>
                {(match.goals !== null || match.assists !== null) && (
                  <p className="text-sm text-muted-foreground">
                    {match.goals || 0}G {match.assists || 0}A
                  </p>
                )}
              </div>
            ) : isUpcoming ? (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Kommande
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Logga resultat
              </Badge>
            )}
          </div>
        </div>

        {/* Stats row for past matches */}
        {showStats && match.result && (match.minutesPlayed || match.distanceKm) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
            {match.minutesPlayed && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {match.minutesPlayed} min
              </span>
            )}
            {match.distanceKm && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3 w-3" />
                {match.distanceKm.toFixed(1)} km
              </span>
            )}
            {match.maxSpeed && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {match.maxSpeed.toFixed(1)} km/h
              </span>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
