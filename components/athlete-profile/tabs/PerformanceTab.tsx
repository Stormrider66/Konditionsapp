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
  variant?: 'default' | 'glass'
}

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export function PerformanceTab({ data, viewMode, variant = 'default' }: PerformanceTabProps) {
  const router = useRouter()
  const isGlass = variant === 'glass'
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

  // Combine primary and secondary sports
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
        return { sport, label: 'Cykel', icon: Bike, onClick: () => setIsCyclingDialogOpen(true), color: isGlass ? 'text-blue-400' : 'text-blue-600', accent: 'blue' }
      case 'SWIMMING':
        return { sport, label: 'Simning', icon: Waves, onClick: () => setIsSwimmingDialogOpen(true), color: isGlass ? 'text-cyan-400' : 'text-cyan-600', accent: 'cyan' }
      case 'TRIATHLON':
        return { sport, label: 'Triathlon', icon: Trophy, onClick: () => setIsTriathlonDialogOpen(true), color: isGlass ? 'text-orange-400' : 'text-orange-600', accent: 'orange' }
      case 'HYROX':
        return { sport, label: 'HYROX', icon: Flame, onClick: () => setIsHyroxDialogOpen(true), color: isGlass ? 'text-orange-400' : 'text-orange-600', accent: 'orange' }
      case 'SKIING':
        return { sport, label: 'Skidor', icon: Mountain, onClick: () => setIsSkiingDialogOpen(true), color: isGlass ? 'text-sky-400' : 'text-sky-600', accent: 'sky' }
      case 'RUNNING':
      default:
        return { sport, label: 'Löpning', icon: Trophy, onClick: () => setIsRaceDialogOpen(true), color: isGlass ? 'text-yellow-400' : 'text-yellow-600', accent: 'yellow' }
    }
  }

  // Get button configs for all athlete's sports (excluding GENERAL_FITNESS)
  const sportButtons = allAthleteSports
    .filter(sport => sport !== 'GENERAL_FITNESS')
    .map(sport => getSportButtonConfig(sport))

  const CardWrapper = isGlass ? GlassCard : Card;

  if (!hasData) {
    return (
      <>
        <CardWrapper>
          <CardContent className="py-24 text-center">
            <Trophy className={cn("h-16 w-16 mx-auto mb-6", isGlass ? "text-white/10" : "text-gray-300")} />
            <h3 className={cn("text-xl font-black uppercase italic tracking-tight mb-2", isGlass ? "text-white" : "text-gray-900")}>
              Ingen prestationsdata
            </h3>
            <p className={cn("font-medium mb-10 max-w-sm mx-auto", isGlass ? "text-slate-500" : "text-gray-500")}>
              Registrera tävlingsresultat eller logga styrketräning för att se PRs.
            </p>
            {clientId && (
              <div className="flex flex-col gap-6 items-center">
                {/* Sport-specific PR buttons */}
                <div className="flex gap-3 flex-wrap justify-center">
                  {sportButtons.map((btn) => {
                    const Icon = btn.icon
                    return (
                      <Button
                        key={btn.sport}
                        variant="ghost"
                        onClick={btn.onClick}
                        className={cn(
                          "h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                          isGlass ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white border"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 mr-2", btn.color)} />
                        {btn.label}
                      </Button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    onClick={() => setIsStrengthDialogOpen(true)}
                    className={cn(
                      "h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                      isGlass ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white border"
                    )}
                  >
                    <Dumbbell className="h-4 w-4 mr-2 text-slate-400" />
                    Styrke-PR
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CardWrapper>

        {/* Dialogs remain same but could use some glass styling if wanted - skipping for now as they are shared */}
      </>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* Sport-Specific Quick Add */}
        {clientId && sportButtons.length > 0 && (
          <CardWrapper className={isGlass ? "border-white/5 bg-white/5" : "border-dashed"}>
            <CardContent className="py-4 px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isGlass ? "text-slate-500" : "text-gray-600")}>
                  Logga prestationer
                </span>
                <div className="flex gap-2 flex-wrap">
                  {sportButtons.map((btn) => {
                    const Icon = btn.icon
                    return (
                      <Button
                        key={btn.sport}
                        size="sm"
                        variant="ghost"
                        onClick={btn.onClick}
                        className={cn(
                          "h-9 px-4 rounded-lg font-black uppercase tracking-widest text-[9px]",
                          isGlass ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white border"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 mr-1.5", btn.color)} />
                        {btn.label}
                      </Button>
                    )
                  })}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsStrengthDialogOpen(true)}
                    className={cn(
                      "h-9 px-4 rounded-lg font-black uppercase tracking-widest text-[9px]",
                      isGlass ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white border"
                    )}
                  >
                    <Dumbbell className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    Styrka
                  </Button>
                </div>
              </div>
            </CardContent>
          </CardWrapper>
        )}

        {/* Race PRs Summary */}
        {Object.keys(prsByDistance).length > 0 && (
          <CardWrapper>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={cn("flex items-center gap-3 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
                    <Medal className={cn("h-6 w-6", isGlass ? "text-yellow-400" : "text-yellow-500")} />
                    Personliga rekord
                  </CardTitle>
                  {bestVdot > 0 && (
                    <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
                      BÄSTA VDOT: {bestVdot.toFixed(1)}
                    </CardDescription>
                  )}
                </div>
                {clientId && (
                  <Button size="sm" variant="ghost" onClick={() => setIsRaceDialogOpen(true)} className={cn(isGlass ? "bg-white/5 text-white h-9 rounded-lg px-4 font-black uppercase tracking-widest text-[9px]" : "")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nytt PR
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(prsByDistance).map(([distance, pr]) => (
                  <PRCard key={distance} distance={distance} pr={pr} isGlass={isGlass} />
                ))}
              </div>
            </CardContent>
          </CardWrapper>
        )}

        {/* Race History Table */}
        {raceResults.length > 0 && (
          <CardWrapper>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={cn("text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>Tävlingshistorik</CardTitle>
                  <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
                    {raceResults.length} tävlingar registrerade
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={isGlass ? "border-white/5" : ""}>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Datum</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Tävling</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Distans</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Tid</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Tempo</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>VDOT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {raceResults.slice(0, 15).map((race) => (
                      <TableRow key={race.id} className={isGlass ? "border-white/5 hover:bg-white/5" : ""}>
                        <TableCell className={cn("whitespace-nowrap font-black text-xs", isGlass ? "text-slate-400" : "")}>
                          {format(new Date(race.raceDate), 'd MMM yyyy', { locale: sv })}
                        </TableCell>
                        <TableCell className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
                          {race.raceName || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("font-black uppercase tracking-widest text-[9px] h-5 rounded-lg border-0", isGlass ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-800")}>
                            {getDistanceLabel(race.distance)}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("font-black text-sm", isGlass ? "text-white" : "")}>{race.timeFormatted || '-'}</TableCell>
                        <TableCell className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {race.avgPace || calculatePace(race.timeMinutes, race.distance, race.customDistanceKm)}/km
                        </TableCell>
                        <TableCell>
                          {race.vdot ? (
                            <span className={cn("font-black italic text-md", isGlass ? "text-blue-500" : "text-blue-600")}>{race.vdot.toFixed(1)}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CardWrapper>
        )}

        {/* Strength PRs */}
        <CardWrapper>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={cn("flex items-center gap-3 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
                  <Dumbbell className={cn("h-6 w-6", isGlass ? "text-red-500" : "text-red-500")} />
                  Styrke-PRs
                </CardTitle>
                <CardDescription className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>
                  BASERAT PÅ LOGGADE SET OCH ESTIMAL 1RM
                </CardDescription>
              </div>
              {clientId && (
                <Button size="sm" variant="ghost" onClick={() => setIsStrengthDialogOpen(true)} className={cn(isGlass ? "bg-white/5 text-white h-9 rounded-lg px-4 font-black uppercase tracking-widest text-[9px]" : "")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nytt PR
                </Button>
              )}
            </div>
          </CardHeader>
          {strengthPRs.length > 0 ? (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {strengthPRs.map((pr) => (
                  <StrengthPRCard key={pr.exerciseId} pr={pr} isGlass={isGlass} />
                ))}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className={cn("text-center py-10 font-bold uppercase tracking-widest text-[10px]", isGlass ? "text-slate-600" : "text-gray-400")}>
                Inga styrke-PRs registrerade ännu
              </p>
            </CardContent>
          )}
        </CardWrapper>

        {/* Progression Status - Simplified for Glass theme if needed, but keeping for now */}
        {progressionTracking.length > 0 && (
          <CardWrapper>
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-3 text-xl font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
                <TrendingUp className={cn("h-6 w-6", isGlass ? "text-emerald-500" : "text-emerald-500")} />
                Progressionsstatus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={isGlass ? "border-white/5" : ""}>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Övning</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Senaste set</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Est. 1RM</TableHead>
                      <TableHead className={cn("font-black uppercase tracking-widest text-[10px]", isGlass ? "text-slate-500" : "")}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getUniqueExerciseProgressions(progressionTracking)
                      .slice(0, 10)
                      .map((prog) => (
                        <TableRow key={prog.id} className={isGlass ? "border-white/5 hover:bg-white/5" : ""}>
                          <TableCell className={cn("font-black uppercase italic tracking-tight", isGlass ? "text-white" : "")}>
                            {prog.exercise.nameSv || prog.exercise.name}
                          </TableCell>
                          <TableCell className={cn("font-black text-xs", isGlass ? "text-slate-400" : "")}>
                            {prog.sets}x{prog.repsCompleted} @ {prog.actualLoad} kg
                          </TableCell>
                          <TableCell className={cn("font-black text-sm", isGlass ? "text-white" : "text-gray-900")}>
                            {prog.estimated1RM ? `${prog.estimated1RM.toFixed(1)} kg` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "font-black uppercase tracking-widest text-[9px] h-5 px-2 rounded-lg border-0",
                              getProgressionStatusVariant(prog.progressionStatus) === 'default'
                                ? (isGlass ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-500 text-white")
                                : (isGlass ? "bg-slate-500/10 text-slate-400" : "bg-slate-500 text-white")
                            )}>
                              {getProgressionStatusLabel(prog.progressionStatus)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CardWrapper>
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
  isGlass = false,
}: {
  distance: string
  pr: { timeFormatted: string; date: Date; vdot: number | null; avgPace: string | null; timeMinutes: number; distance: string; customDistanceKm: number | null }
  isGlass?: boolean
}) {
  const pace = pr.avgPace || calculatePace(pr.timeMinutes, pr.distance, pr.customDistanceKm)

  return (
    <div className={cn(
      "p-5 rounded-3xl transition-all duration-300",
      isGlass
        ? "bg-white/[0.02] border border-white/5 hover:bg-white/5"
        : "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "font-black uppercase tracking-widest text-[10px]",
          isGlass ? "text-yellow-500" : "text-yellow-800"
        )}>{getDistanceLabel(distance)}</span>
        <Trophy className={cn("h-4 w-4", isGlass ? "text-yellow-500/50" : "text-yellow-600")} />
      </div>
      <p className={cn(
        "text-2xl font-black uppercase italic tracking-tighter mb-4",
        isGlass ? "text-white" : "text-gray-900"
      )}>{pr.timeFormatted}</p>

      <div className="space-y-2 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">{pace}/km</span>
          </div>
          {pr.vdot && (
            <span className={cn("text-[10px] font-black uppercase italic", isGlass ? "text-blue-500" : "text-blue-600")}>VDOT {pr.vdot.toFixed(1)}</span>
          )}
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {format(new Date(pr.date), 'd MMM yyyy', { locale: sv })}
        </p>
      </div>
    </div>
  )
}

function StrengthPRCard({
  pr,
  isGlass = false,
}: {
  pr: {
    exerciseId: string
    exerciseName: string
    exerciseNameSv: string | null
    estimated1RM: number
    date: Date
    pillar: string
  }
  isGlass?: boolean
}) {
  return (
    <div className={cn(
      "p-5 rounded-3xl transition-all duration-300",
      isGlass
        ? "bg-white/[0.02] border border-white/5 hover:bg-white/5"
        : "bg-gradient-to-br from-red-50 to-pink-50 border border-red-200"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "font-black uppercase tracking-widest text-[10px]",
          isGlass ? "text-red-500" : "text-red-800"
        )}>
          {pr.exerciseNameSv || pr.exerciseName}
        </span>
        <Zap className={cn("h-4 w-4", isGlass ? "text-red-500/50" : "text-red-600")} />
      </div>

      <div className="flex items-baseline gap-1 mb-4">
        <span className={cn(
          "text-3xl font-black uppercase italic tracking-tighter",
          isGlass ? "text-white" : "text-gray-900"
        )}>{pr.estimated1RM.toFixed(1)}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">KG</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {format(new Date(pr.date), 'd MMM yyyy', { locale: sv })}
        </span>
        <Badge className={cn("font-black uppercase tracking-widest text-[8px] h-4 px-1.5 rounded-md border-0", isGlass ? "bg-white/5 text-slate-400" : "bg-white border")}>
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
