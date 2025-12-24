'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Trophy, Medal, Dumbbell, TrendingUp, Clock, Zap, Plus, Bike, Waves, Mountain, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RaceResultForm } from '@/components/coach/race-results/RaceResultForm'
import { StrengthPRForm } from '@/components/coach/strength/StrengthPRForm'
import { CyclingPerformanceForm } from '@/components/athlete/performance/CyclingPerformanceForm'
import { SwimmingPerformanceForm } from '@/components/athlete/performance/SwimmingPerformanceForm'
import { TriathlonPerformanceForm } from '@/components/athlete/performance/TriathlonPerformanceForm'
import { HYROXPerformanceForm } from '@/components/athlete/performance/HYROXPerformanceForm'
import { SkiingPerformanceForm } from '@/components/athlete/performance/SkiingPerformanceForm'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface PerformanceTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function PerformanceTab({ data, viewMode }: PerformanceTabProps) {
  const router = useRouter()
  const [isRaceDialogOpen, setIsRaceDialogOpen] = useState(false)
  const [isStrengthDialogOpen, setIsStrengthDialogOpen] = useState(false)
  const [isCyclingDialogOpen, setIsCyclingDialogOpen] = useState(false)
  const [isSwimmingDialogOpen, setIsSwimmingDialogOpen] = useState(false)
  const [isTriathlonDialogOpen, setIsTriathlonDialogOpen] = useState(false)
  const [isHyroxDialogOpen, setIsHyroxDialogOpen] = useState(false)
  const [isSkiingDialogOpen, setIsSkiingDialogOpen] = useState(false)

  const { raceResults, progressionTracking, oneRepMaxHistory } = data.performance
  const clientId = data.identity.client?.id
  const clientName = data.identity.client?.name || 'Atlet'
  const primarySport = data.identity.sportProfile?.primarySport || 'RUNNING'
  const secondarySports = data.identity.sportProfile?.secondarySports || []
  const athleteWeight = data.identity.client?.weight

  // Combine primary and secondary sports, ensuring no duplicates
  const allAthleteSports = [primarySport, ...secondarySports.filter(s => s !== primarySport)]

  // Group race results by distance for PRs
  const prsByDistance = getPRsByDistance(raceResults)

  // Get best VDOT
  const bestVdot = Math.max(...raceResults.filter((r) => r.vdot).map((r) => r.vdot!), 0)

  // Get unique exercises from progression tracking
  const strengthPRs = getStrengthPRs(progressionTracking, oneRepMaxHistory)

  const hasData = raceResults.length > 0 || progressionTracking.length > 0

  const handleRaceResultSuccess = () => {
    setIsRaceDialogOpen(false)
    router.refresh()
  }

  const handleStrengthPRSuccess = () => {
    setIsStrengthDialogOpen(false)
    router.refresh()
  }

  const handleCyclingSuccess = () => {
    setIsCyclingDialogOpen(false)
    router.refresh()
  }

  const handleSwimmingSuccess = () => {
    setIsSwimmingDialogOpen(false)
    router.refresh()
  }

  const handleTriathlonSuccess = () => {
    setIsTriathlonDialogOpen(false)
    router.refresh()
  }

  const handleHyroxSuccess = () => {
    setIsHyroxDialogOpen(false)
    router.refresh()
  }

  const handleSkiingSuccess = () => {
    setIsSkiingDialogOpen(false)
    router.refresh()
  }

  // Get button config for a specific sport
  const getSportButtonConfig = (sport: string) => {
    switch (sport) {
      case 'CYCLING':
        return { sport, label: 'Cykel', icon: Bike, onClick: () => setIsCyclingDialogOpen(true), color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' }
      case 'SWIMMING':
        return { sport, label: 'Simning', icon: Waves, onClick: () => setIsSwimmingDialogOpen(true), color: 'text-cyan-600', bgColor: 'bg-cyan-50 hover:bg-cyan-100' }
      case 'TRIATHLON':
        return { sport, label: 'Triathlon', icon: Trophy, onClick: () => setIsTriathlonDialogOpen(true), color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' }
      case 'HYROX':
        return { sport, label: 'HYROX', icon: Flame, onClick: () => setIsHyroxDialogOpen(true), color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' }
      case 'SKIING':
        return { sport, label: 'Skidor', icon: Mountain, onClick: () => setIsSkiingDialogOpen(true), color: 'text-sky-600', bgColor: 'bg-sky-50 hover:bg-sky-100' }
      case 'RUNNING':
      default:
        return { sport, label: 'Löpning', icon: Trophy, onClick: () => setIsRaceDialogOpen(true), color: 'text-yellow-600', bgColor: 'bg-yellow-50 hover:bg-yellow-100' }
    }
  }

  // Get button configs for all athlete's sports (excluding GENERAL_FITNESS)
  const sportButtons = allAthleteSports
    .filter(sport => sport !== 'GENERAL_FITNESS')
    .map(sport => getSportButtonConfig(sport))

  if (!hasData) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen prestationsdata</h3>
            <p className="text-gray-500 mb-4">
              Registrera tävlingsresultat eller logga styrketräning för att se PRs.
            </p>
            {clientId && (
              <div className="flex flex-col gap-4 items-center">
                {/* Sport-specific PR buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {sportButtons.map((btn) => {
                    const Icon = btn.icon
                    return (
                      <Button
                        key={btn.sport}
                        variant="outline"
                        onClick={btn.onClick}
                        className={`${btn.bgColor} border-0`}
                      >
                        <Icon className={`h-4 w-4 mr-2 ${btn.color}`} />
                        {btn.label}
                      </Button>
                    )
                  })}
                </div>
                {/* Strength PR button */}
                <Button variant="outline" onClick={() => setIsStrengthDialogOpen(true)}>
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Lägg till styrke-PR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Race Result Dialog */}
        <Dialog open={isRaceDialogOpen} onOpenChange={setIsRaceDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lägg till tävlingsresultat</DialogTitle>
            </DialogHeader>
            {clientId && (
              <RaceResultForm
                clientId={clientId}
                clientName={clientName}
                onSuccess={handleRaceResultSuccess}
                onCancel={() => setIsRaceDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Strength PR Dialog */}
        <Dialog open={isStrengthDialogOpen} onOpenChange={setIsStrengthDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Lägg till styrke-PR</DialogTitle>
            </DialogHeader>
            {clientId && (
              <StrengthPRForm
                clientId={clientId}
                clientName={clientName}
                onSuccess={handleStrengthPRSuccess}
                onCancel={() => setIsStrengthDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Cycling Dialog */}
        <Dialog open={isCyclingDialogOpen} onOpenChange={setIsCyclingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logga cykelprestation</DialogTitle>
            </DialogHeader>
            {clientId && (
              <CyclingPerformanceForm
                clientId={clientId}
                athleteWeight={athleteWeight}
                onSuccess={handleCyclingSuccess}
                onCancel={() => setIsCyclingDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Swimming Dialog */}
        <Dialog open={isSwimmingDialogOpen} onOpenChange={setIsSwimmingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logga simprestation</DialogTitle>
            </DialogHeader>
            {clientId && (
              <SwimmingPerformanceForm
                clientId={clientId}
                onSuccess={handleSwimmingSuccess}
                onCancel={() => setIsSwimmingDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Triathlon Dialog */}
        <Dialog open={isTriathlonDialogOpen} onOpenChange={setIsTriathlonDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logga triathlonresultat</DialogTitle>
            </DialogHeader>
            {clientId && (
              <TriathlonPerformanceForm
                clientId={clientId}
                onSuccess={handleTriathlonSuccess}
                onCancel={() => setIsTriathlonDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* HYROX Dialog */}
        <Dialog open={isHyroxDialogOpen} onOpenChange={setIsHyroxDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logga HYROX-resultat</DialogTitle>
            </DialogHeader>
            {clientId && (
              <HYROXPerformanceForm
                clientId={clientId}
                onSuccess={handleHyroxSuccess}
                onCancel={() => setIsHyroxDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Skiing Dialog */}
        <Dialog open={isSkiingDialogOpen} onOpenChange={setIsSkiingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Logga skidresultat</DialogTitle>
            </DialogHeader>
            {clientId && (
              <SkiingPerformanceForm
                clientId={clientId}
                onSuccess={handleSkiingSuccess}
                onCancel={() => setIsSkiingDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Sport-Specific Quick Add - Row of buttons for all athlete's sports */}
        {clientId && sportButtons.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="text-sm text-gray-600 font-medium">
                  Logga prestationer
                </span>
                <div className="flex gap-2 flex-wrap">
                  {sportButtons.map((btn) => {
                    const Icon = btn.icon
                    return (
                      <Button
                        key={btn.sport}
                        size="sm"
                        variant="outline"
                        onClick={btn.onClick}
                        className={`${btn.bgColor} border-0`}
                      >
                        <Icon className={`h-4 w-4 mr-1 ${btn.color}`} />
                        {btn.label}
                      </Button>
                    )
                  })}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsStrengthDialogOpen(true)}
                  >
                    <Dumbbell className="h-4 w-4 mr-1" />
                    Styrka
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Race PRs Summary */}
        {Object.keys(prsByDistance).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-500" />
                    Personliga rekord - Löpning
                  </CardTitle>
                  {bestVdot > 0 && (
                    <CardDescription>Bästa VDOT: {bestVdot.toFixed(1)}</CardDescription>
                  )}
                </div>
                {clientId && (
                  <Button size="sm" variant="outline" onClick={() => setIsRaceDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Lägg till
                  </Button>
                )}
              </div>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(prsByDistance).map(([distance, pr]) => (
                <PRCard key={distance} distance={distance} pr={pr} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Race History Table */}
      {raceResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tävlingshistorik</CardTitle>
                <CardDescription>{raceResults.length} tävlingar registrerade</CardDescription>
              </div>
              {clientId && Object.keys(prsByDistance).length === 0 && (
                <Button size="sm" variant="outline" onClick={() => setIsRaceDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Lägg till
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Tävling</TableHead>
                    <TableHead>Distans</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>VDOT</TableHead>
                    <TableHead className="hidden md:table-cell">Mål</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raceResults.slice(0, 15).map((race) => (
                    <TableRow key={race.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(race.raceDate), 'd MMM yyyy', { locale: sv })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {race.raceName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDistanceLabel(race.distance)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{race.timeFormatted || '-'}</TableCell>
                      <TableCell className="text-gray-500">
                        {race.avgPace || calculatePace(race.timeMinutes, race.distance, race.customDistanceKm)}/km
                      </TableCell>
                      <TableCell>
                        {race.vdot ? (
                          <span className="font-medium">{race.vdot.toFixed(1)}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {race.goalAchieved ? (
                          <Badge variant="default">Mål uppnått</Badge>
                        ) : race.goalTime ? (
                          <Badge variant="outline">Ej uppnått</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strength PRs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-red-500" />
                Styrke-PRs (Estimerad 1RM)
              </CardTitle>
              <CardDescription>
                Baserat på loggade set och estimerad 1RM
              </CardDescription>
            </div>
            {clientId && (
              <Button size="sm" variant="outline" onClick={() => setIsStrengthDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Lägg till
              </Button>
            )}
          </div>
        </CardHeader>
        {strengthPRs.length > 0 ? (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strengthPRs.map((pr) => (
                <StrengthPRCard key={pr.exerciseId} pr={pr} />
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-center text-gray-500 py-6">
              Inga styrke-PRs registrerade ännu
            </p>
          </CardContent>
        )}
      </Card>

      {/* Progression Status */}
      {progressionTracking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Progressionsstatus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Övning</TableHead>
                    <TableHead>Senaste set</TableHead>
                    <TableHead>Est. 1RM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Nästa belastning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getUniqueExerciseProgressions(progressionTracking)
                    .slice(0, 10)
                    .map((prog) => (
                      <TableRow key={prog.id}>
                        <TableCell className="font-medium">
                          {prog.exercise.nameSv || prog.exercise.name}
                        </TableCell>
                        <TableCell>
                          {prog.sets}x{prog.repsCompleted} @ {prog.actualLoad} kg
                        </TableCell>
                        <TableCell>
                          {prog.estimated1RM ? `${prog.estimated1RM.toFixed(1)} kg` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getProgressionStatusVariant(prog.progressionStatus)}>
                            {getProgressionStatusLabel(prog.progressionStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {prog.nextRecommendedLoad
                            ? `${prog.nextRecommendedLoad} kg`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

      {/* Race Result Dialog */}
      <Dialog open={isRaceDialogOpen} onOpenChange={setIsRaceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lägg till tävlingsresultat</DialogTitle>
          </DialogHeader>
          {clientId && (
            <RaceResultForm
              clientId={clientId}
              clientName={clientName}
              onSuccess={handleRaceResultSuccess}
              onCancel={() => setIsRaceDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Strength PR Dialog */}
      <Dialog open={isStrengthDialogOpen} onOpenChange={setIsStrengthDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lägg till styrke-PR</DialogTitle>
          </DialogHeader>
          {clientId && (
            <StrengthPRForm
              clientId={clientId}
              clientName={clientName}
              onSuccess={handleStrengthPRSuccess}
              onCancel={() => setIsStrengthDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Cycling Dialog */}
      <Dialog open={isCyclingDialogOpen} onOpenChange={setIsCyclingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logga cykelprestation</DialogTitle>
          </DialogHeader>
          {clientId && (
            <CyclingPerformanceForm
              clientId={clientId}
              athleteWeight={athleteWeight}
              onSuccess={handleCyclingSuccess}
              onCancel={() => setIsCyclingDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Swimming Dialog */}
      <Dialog open={isSwimmingDialogOpen} onOpenChange={setIsSwimmingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logga simprestation</DialogTitle>
          </DialogHeader>
          {clientId && (
            <SwimmingPerformanceForm
              clientId={clientId}
              onSuccess={handleSwimmingSuccess}
              onCancel={() => setIsSwimmingDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Triathlon Dialog */}
      <Dialog open={isTriathlonDialogOpen} onOpenChange={setIsTriathlonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logga triathlonresultat</DialogTitle>
          </DialogHeader>
          {clientId && (
            <TriathlonPerformanceForm
              clientId={clientId}
              onSuccess={handleTriathlonSuccess}
              onCancel={() => setIsTriathlonDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* HYROX Dialog */}
      <Dialog open={isHyroxDialogOpen} onOpenChange={setIsHyroxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logga HYROX-resultat</DialogTitle>
          </DialogHeader>
          {clientId && (
            <HYROXPerformanceForm
              clientId={clientId}
              onSuccess={handleHyroxSuccess}
              onCancel={() => setIsHyroxDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Skiing Dialog */}
      <Dialog open={isSkiingDialogOpen} onOpenChange={setIsSkiingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logga skidresultat</DialogTitle>
          </DialogHeader>
          {clientId && (
            <SkiingPerformanceForm
              clientId={clientId}
              onSuccess={handleSkiingSuccess}
              onCancel={() => setIsSkiingDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper components
function PRCard({
  distance,
  pr,
}: {
  distance: string
  pr: { timeFormatted: string; date: Date; vdot: number | null; avgPace: string | null; timeMinutes: number; distance: string; customDistanceKm: number | null }
}) {
  const pace = pr.avgPace || calculatePace(pr.timeMinutes, pr.distance, pr.customDistanceKm)

  return (
    <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-yellow-800">{getDistanceLabel(distance)}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{pr.timeFormatted}</p>
      <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
        <span>{format(new Date(pr.date), 'd MMM yyyy', { locale: sv })}</span>
        {pr.vdot && <span>VDOT {pr.vdot.toFixed(1)}</span>}
      </div>
      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {pace}/km
      </p>
    </div>
  )
}

function StrengthPRCard({
  pr,
}: {
  pr: {
    exerciseId: string
    exerciseName: string
    exerciseNameSv: string | null
    estimated1RM: number
    date: Date
    pillar: string
  }
}) {
  return (
    <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-red-600" />
        <span className="font-medium text-red-800">
          {pr.exerciseNameSv || pr.exerciseName}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{pr.estimated1RM.toFixed(1)} kg</p>
      <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
        <span>{format(new Date(pr.date), 'd MMM yyyy', { locale: sv })}</span>
        <Badge variant="outline" className="text-xs">
          {getPillarLabel(pr.pillar)}
        </Badge>
      </div>
    </div>
  )
}

// Helper functions
function getPRsByDistance(
  races: AthleteProfileData['performance']['raceResults']
): Record<string, { timeFormatted: string; date: Date; vdot: number | null; avgPace: string | null; timeMinutes: number; distance: string; customDistanceKm: number | null }> {
  const prs: Record<string, { timeFormatted: string; date: Date; vdot: number | null; avgPace: string | null; timeMinutes: number; distance: string; customDistanceKm: number | null }> = {}

  for (const race of races) {
    if (!race.timeFormatted) continue

    const existing = prs[race.distance]
    if (!existing || race.timeMinutes < existing.timeMinutes) {
      prs[race.distance] = {
        timeFormatted: race.timeFormatted,
        date: race.raceDate,
        vdot: race.vdot,
        avgPace: race.avgPace,
        timeMinutes: race.timeMinutes,
        distance: race.distance,
        customDistanceKm: race.customDistanceKm,
      }
    }
  }

  return prs
}

function getStrengthPRs(
  progressions: AthleteProfileData['performance']['progressionTracking'],
  history: AthleteProfileData['performance']['oneRepMaxHistory']
): Array<{
  exerciseId: string
  exerciseName: string
  exerciseNameSv: string | null
  estimated1RM: number
  date: Date
  pillar: string
}> {
  const prs: Map<string, {
    exerciseId: string
    exerciseName: string
    exerciseNameSv: string | null
    estimated1RM: number
    date: Date
    pillar: string
  }> = new Map()

  // Get from progression tracking
  for (const prog of progressions) {
    if (!prog.estimated1RM) continue

    const existing = prs.get(prog.exercise.id)
    if (!existing || prog.estimated1RM > existing.estimated1RM) {
      prs.set(prog.exercise.id, {
        exerciseId: prog.exercise.id,
        exerciseName: prog.exercise.name,
        exerciseNameSv: prog.exercise.nameSv,
        estimated1RM: prog.estimated1RM,
        date: prog.date,
        pillar: prog.exercise.biomechanicalPillar,
      })
    }
  }

  // Also check history
  for (const rec of history) {
    const existing = prs.get(rec.exercise.id)
    if (!existing || rec.oneRepMax > existing.estimated1RM) {
      prs.set(rec.exercise.id, {
        exerciseId: rec.exercise.id,
        exerciseName: rec.exercise.name,
        exerciseNameSv: rec.exercise.nameSv,
        estimated1RM: rec.oneRepMax,
        date: rec.date,
        pillar: '', // history doesn't have pillar
      })
    }
  }

  return Array.from(prs.values()).sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, 9)
}

function getUniqueExerciseProgressions(
  progressions: AthleteProfileData['performance']['progressionTracking']
) {
  const seen = new Set<string>()
  const unique: typeof progressions = []

  for (const prog of progressions) {
    if (!seen.has(prog.exercise.id)) {
      seen.add(prog.exercise.id)
      unique.push(prog)
    }
  }

  return unique
}

function getDistanceLabel(distance: string): string {
  const labels: Record<string, string> = {
    '5K': '5 km',
    '10K': '10 km',
    HALF_MARATHON: 'Halvmaraton',
    MARATHON: 'Maraton',
    CUSTOM: 'Annan',
  }
  return labels[distance] || distance
}

function getProgressionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ON_TRACK: 'På rätt spår',
    PLATEAU: 'Platå',
    REGRESSING: 'Tillbakagång',
    DELOAD_NEEDED: 'Deload behövs',
  }
  return labels[status] || status
}

function getProgressionStatusVariant(
  status: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'ON_TRACK':
      return 'default'
    case 'PLATEAU':
      return 'secondary'
    case 'REGRESSING':
    case 'DELOAD_NEEDED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getPillarLabel(pillar: string): string {
  const labels: Record<string, string> = {
    POSTERIOR_CHAIN: 'Bakkedja',
    KNEE_DOMINANCE: 'Knädominant',
    UNILATERAL: 'Unilateral',
    FOOT_ANKLE: 'Fot/Ankel',
    CORE: 'Core',
    UPPER_BODY: 'Överkropp',
  }
  return labels[pillar] || pillar
}

function getSportName(sport: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykel',
    SWIMMING: 'Sim',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Skid',
    GENERAL_FITNESS: 'Fitness',
  }
  return labels[sport] || sport
}

/**
 * Get distance in kilometers for a race distance type
 */
function getDistanceKm(distance: string, customDistanceKm?: number | null): number {
  switch (distance) {
    case '5K':
      return 5
    case '10K':
      return 10
    case 'HALF_MARATHON':
      return 21.0975
    case 'MARATHON':
      return 42.195
    case 'CUSTOM':
      return customDistanceKm || 10
    default:
      return 10
  }
}

/**
 * Calculate average pace from time in minutes and distance
 * Returns formatted pace as MM:SS/km
 */
function calculatePace(timeMinutes: number, distance: string, customDistanceKm?: number | null): string {
  const distanceKm = getDistanceKm(distance, customDistanceKm)
  const paceMinutes = timeMinutes / distanceKm

  const minutes = Math.floor(paceMinutes)
  const seconds = Math.round((paceMinutes - minutes) * 60)

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
