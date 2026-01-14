'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  Ruler,
} from 'lucide-react'
import type { VolleyballSettings } from '@/components/onboarding/VolleyballOnboarding'
import {
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/volleyball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface VolleyballDashboardProps {
  settings: VolleyballSettings
}

const POSITION_LABELS: Record<string, string> = {
  setter: 'Passare',
  outside_hitter: 'Vänsterspiker',
  opposite_hitter: 'Diagonal',
  middle_blocker: 'Centerblockare',
  libero: 'Libero',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Korpen/Motion',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  elitserien: 'Elitserien',
  ssl: 'Svenska Superligan',
}

const STRENGTH_LABELS: Record<string, string> = {
  vertical_jump: 'Vertikal hoppförmåga',
  spike_power: 'Slagstyrka',
  blocking: 'Blockteknik',
  serving: 'Serve',
  reception: 'Mottagning',
  defense: 'Försvarsspel',
  court_vision: 'Spelförståelse',
  agility: 'Kvickhet',
}

export function VolleyballDashboard({ settings }: VolleyballDashboardProps) {
  const position = settings.position
  const positionProfile = VOLLEYBALL_POSITION_PROFILES[position]
  const seasonPhase = VOLLEYBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = VOLLEYBALL_BENCHMARKS[position]

  // Calculate benchmark percentage
  const getBenchmarkPercentage = (actual: number | null, elite: number, lowerIsBetter = false): number | null => {
    if (actual === null) return null
    if (lowerIsBetter) {
      return Math.min(100, Math.round((elite / actual) * 100))
    }
    return Math.min(100, Math.round((actual / elite) * 100))
  }

  // Get benchmark rating
  const getBenchmarkRating = (
    actual: number | null,
    elite: number,
    good: number,
    lowerIsBetter = false
  ): 'elite' | 'good' | 'developing' | null => {
    if (actual === null) return null
    if (lowerIsBetter) {
      if (actual <= elite) return 'elite'
      if (actual <= good) return 'good'
      return 'developing'
    } else {
      if (actual >= elite) return 'elite'
      if (actual >= good) return 'good'
      return 'developing'
    }
  }

  const getRatingColor = (rating: 'elite' | 'good' | 'developing' | null) => {
    switch (rating) {
      case 'elite':
        return 'text-green-500'
      case 'good':
        return 'text-blue-500'
      case 'developing':
        return 'text-orange-500'
      default:
        return 'text-muted-foreground'
    }
  }

  // Get recommended exercises
  const recommendations = getPositionRecommendations(position)
  const essentialExercises = recommendations.filter((r) => r.priority === 'essential').slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {settings.teamName || 'Volleyboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]}</Badge>
                <Badge className="bg-yellow-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-xs text-muted-foreground">års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm längd</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.spikeHeight ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{settings.blockHeight ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm block</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">träning/v</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {PHASE_LABELS[settings.seasonPhase]} - Träningsfokus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Fokusområden:</h4>
              <div className="flex flex-wrap gap-1">
                {seasonPhase.focus.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Styrka</div>
                <div className="text-sm">{seasonPhase.strengthEmphasis}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Kondition</div>
                <div className="text-sm">{seasonPhase.conditioningEmphasis}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jump Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-red-500" />
            Hopptester - {POSITION_LABELS[position]}
          </CardTitle>
          <CardDescription>Dina resultat jämfört med elitnivå</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Vertikalhopp</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.verticalJump,
                  benchmarks.elite.verticalJump!,
                  benchmarks.good.verticalJump!
                ))}>
                  {settings.benchmarks.verticalJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.verticalJump, benchmarks.elite.verticalJump!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.verticalJump} cm</div>
            </div>

            {/* Spike Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Smash-hopp</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.spikeJump,
                  benchmarks.elite.spikeJump!,
                  benchmarks.good.spikeJump!
                ))}>
                  {settings.benchmarks.spikeJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.spikeJump, benchmarks.elite.spikeJump!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.spikeJump} cm</div>
            </div>

            {/* Block Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Block-hopp</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.blockJump,
                  benchmarks.elite.blockJump!,
                  benchmarks.good.blockJump!
                ))}>
                  {settings.benchmarks.blockJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.blockJump, benchmarks.elite.blockJump!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.blockJump} cm</div>
            </div>

            {/* T-Test Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>T-test agility</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.agilityTTest,
                  benchmarks.elite.agilityTTest!,
                  benchmarks.good.agilityTTest!,
                  true
                ))}>
                  {settings.benchmarks.agilityTTest?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.agilityTTest, benchmarks.elite.agilityTTest!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.agilityTTest} s</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Knäböj</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.squat,
                  benchmarks.elite.squat!,
                  benchmarks.good.squat!
                ))}>
                  {settings.benchmarks.squat ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.squat, benchmarks.elite.squat!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.squat} kg</div>
            </div>

            {/* Power Clean */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Power clean</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.powerClean,
                  benchmarks.elite.powerClean!,
                  benchmarks.good.powerClean!
                ))}>
                  {settings.benchmarks.powerClean ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.powerClean, benchmarks.elite.powerClean!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.powerClean} kg</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Positionsprofil: {positionProfile.displayName}
          </CardTitle>
          <CardDescription>{positionProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Hopp/set</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerSet.min}-{positionProfile.avgJumpsPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Hopp/match</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            {position !== 'libero' && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Smash-höjd</div>
                <div className="font-medium">
                  +{positionProfile.avgSpikeHeight.min}-{positionProfile.avgSpikeHeight.max} cm
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Nyckelegenskaper:</div>
            <div className="flex flex-wrap gap-1">
              {positionProfile.keyPhysicalAttributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {attr}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Exercises */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            Rekommenderade övningar
          </CardTitle>
          <CardDescription>Baserat på din position och skadehistorik</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialExercises.map((exercise, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{exercise.name}</div>
                    <div className="text-xs text-muted-foreground">{exercise.setsReps}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {exercise.category}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{exercise.notes}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {settings.strengthFocus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-500" />
              Dina styrkor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.strengthFocus.map((strength) => (
                <Badge key={strength} variant="secondary">
                  {STRENGTH_LABELS[strength] || strength}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Schedule */}
      <MatchScheduleWidget />
    </div>
  )
}

export default VolleyballDashboard
