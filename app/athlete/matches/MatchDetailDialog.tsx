'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Home,
  Plane,
  Calendar,
  MapPin,
  Trophy,
  Trash2,
  Clock,
  Target,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

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

interface MatchDetailDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
  onMatchUpdated: (match: Match) => void
  onMatchDeleted: (matchId: string) => void
  sportType?: string
}

export function MatchDetailDialog({
  match,
  open,
  onOpenChange,
  onMatchUpdated,
  onMatchDeleted,
  sportType,
}: MatchDetailDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(match.result ? 'stats' : 'result')

  // Form state for result logging
  const [result, setResult] = useState(match.result || '')
  const [minutesPlayed, setMinutesPlayed] = useState(match.minutesPlayed?.toString() || '')
  const [goals, setGoals] = useState(match.goals?.toString() || '')
  const [assists, setAssists] = useState(match.assists?.toString() || '')
  const [plusMinus, setPlusMinus] = useState(match.plusMinus?.toString() || '')
  const [penaltyMinutes, setPenaltyMinutes] = useState(match.penaltyMinutes?.toString() || '')
  const [distanceKm, setDistanceKm] = useState(match.distanceKm?.toString() || '')
  const [sprintDistance, setSprintDistance] = useState(match.sprintDistance?.toString() || '')
  const [maxSpeed, setMaxSpeed] = useState(match.maxSpeed?.toString() || '')

  const isHockey = sportType === 'TEAM_ICE_HOCKEY'
  const isFootball = sportType === 'TEAM_FOOTBALL'
  const matchDate = new Date(match.scheduledDate)

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/match-schedule/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: result || null,
          minutesPlayed: minutesPlayed ? parseFloat(minutesPlayed) : null,
          goals: goals ? parseInt(goals) : null,
          assists: assists ? parseInt(assists) : null,
          plusMinus: plusMinus ? parseInt(plusMinus) : null,
          penaltyMinutes: penaltyMinutes ? parseInt(penaltyMinutes) : null,
          distanceKm: distanceKm ? parseFloat(distanceKm) : null,
          sprintDistance: sprintDistance ? parseFloat(sprintDistance) : null,
          maxSpeed: maxSpeed ? parseFloat(maxSpeed) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte spara ändringar')
      }

      onMatchUpdated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/match-schedule/${match.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte ta bort match')
      }

      onMatchDeleted(match.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
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
              <Badge variant="outline">{match.competition}</Badge>
            )}
          </div>
          <DialogTitle className="text-xl">
            {match.isHome ? 'vs' : '@'} {match.opponent}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(matchDate, 'EEEE d MMMM HH:mm', { locale: sv })}
            </span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {match.venue}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="result" className="gap-2">
              <Trophy className="h-4 w-4" />
              Resultat
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Activity className="h-4 w-4" />
              Statistik
            </TabsTrigger>
          </TabsList>

          {/* Result Tab */}
          <TabsContent value="result" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="result">Matchresultat</Label>
              <Input
                id="result"
                placeholder="t.ex. 3-2, V 2-1"
                value={result}
                onChange={(e) => setResult(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ange slutresultat, t.ex. &quot;3-2&quot; eller &quot;V 2-1&quot;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goals">Mål</Label>
                <Input
                  id="goals"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assists">Assist</Label>
                <Input
                  id="assists"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={assists}
                  onChange={(e) => setAssists(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutesPlayed">Speltid (minuter)</Label>
              <Input
                id="minutesPlayed"
                type="number"
                min="0"
                step="0.5"
                placeholder="t.ex. 90"
                value={minutesPlayed}
                onChange={(e) => setMinutesPlayed(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 pt-4">
            {/* Hockey-specific stats */}
            {isHockey && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plusMinus">+/-</Label>
                    <Input
                      id="plusMinus"
                      type="number"
                      placeholder="0"
                      value={plusMinus}
                      onChange={(e) => setPlusMinus(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="penaltyMinutes">Utvisningsminuter</Label>
                    <Input
                      id="penaltyMinutes"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={penaltyMinutes}
                      onChange={(e) => setPenaltyMinutes(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Football GPS stats */}
            {isFootball && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Total distans (km)</Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="t.ex. 10.5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sprintDistance">Sprintdistans (m)</Label>
                    <Input
                      id="sprintDistance"
                      type="number"
                      min="0"
                      placeholder="t.ex. 850"
                      value={sprintDistance}
                      onChange={(e) => setSprintDistance(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxSpeed">Max hastighet (km/h)</Label>
                    <Input
                      id="maxSpeed"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="t.ex. 32.5"
                      value={maxSpeed}
                      onChange={(e) => setMaxSpeed(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Generic stats for other sports */}
            {!isHockey && !isFootball && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Grundläggande statistik (mål, assist, speltid) loggas under &quot;Resultat&quot;-fliken.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        <DialogFooter className="flex justify-between sm:justify-between mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Ta bort
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort match?</AlertDialogTitle>
                <AlertDialogDescription>
                  Är du säker på att du vill ta bort matchen mot {match.opponent}?
                  Detta kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Ta bort
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Spara
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
