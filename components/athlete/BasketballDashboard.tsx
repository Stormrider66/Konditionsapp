'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  Ruler,
} from 'lucide-react'
import type { BasketballSettings } from '@/components/onboarding/BasketballOnboarding'
import {
  BASKETBALL_POSITION_PROFILES,
  BASKETBALL_SEASON_PHASES,
  BASKETBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/basketball'

interface BasketballDashboardProps {
  settings: BasketballSettings
}

const POSITION_LABELS: Record<string, string> = {
  point_guard: 'Playmaker (1)',
  shooting_guard: 'Shooting Guard (2)',
  small_forward: 'Small Forward (3)',
  power_forward: 'Power Forward (4)',
  center: 'Center (5)',
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
  basketligan: 'Basketligan',
  sbl: 'SBL',
}

const STRENGTH_LABELS: Record<string, string> = {
  vertical_jump: 'Vertikal hoppförmåga',
  speed: 'Snabbhet',
  agility: 'Kvickhet',
  strength: 'Styrka',
  endurance: 'Uthållighet',
  shooting: 'Skottförmåga',
  court_vision: 'Spelförståelse',
  defense: 'Försvarsspel',
}

export function BasketballDashboard({ settings }: BasketballDashboardProps) {
  const position = settings.position
  const positionProfile = BASKETBALL_POSITION_PROFILES[position]
  const seasonPhase = BASKETBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = BASKETBALL_BENCHMARKS[position]

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
                <Trophy className="h-5 w-5 text-orange-500" />
                {settings.teamName || 'Basket'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]}</Badge>
                <Badge className="bg-orange-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
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
              <Timer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{settings.avgMinutesPerMatch ?? '-'}</div>
              <div className="text-xs text-muted-foreground">min/match</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.matchesPerWeek}</div>
              <div className="text-xs text-muted-foreground">matcher/v</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">träning/v</div>
            </div>
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm längd</div>
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

      {/* Physical Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-red-500" />
            Fysiska tester - {POSITION_LABELS[position]}
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

            {/* 3/4 Court Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>3/4 Court sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint3_4Court,
                  benchmarks.elite.sprint3_4Court!,
                  benchmarks.good.sprint3_4Court!,
                  true
                ))}>
                  {settings.benchmarks.sprint3_4Court?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint3_4Court, benchmarks.elite.sprint3_4Court!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.sprint3_4Court} s</div>
            </div>

            {/* Lane Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lane Agility</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.laneAgility,
                  benchmarks.elite.laneAgility!,
                  benchmarks.good.laneAgility!,
                  true
                ))}>
                  {settings.benchmarks.laneAgility?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.laneAgility, benchmarks.elite.laneAgility!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.laneAgility} s</div>
            </div>

            {/* Bench Press */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bänkpress</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.benchPress,
                  benchmarks.elite.benchPress!,
                  benchmarks.good.benchPress!
                ))}>
                  {settings.benchmarks.benchPress ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.benchPress, benchmarks.elite.benchPress!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.benchPress} kg</div>
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

            {/* Yo-Yo IR1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Yo-Yo IR1</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.yoyoIR1Level,
                  benchmarks.elite.yoyoIR1Level!,
                  benchmarks.good.yoyoIR1Level!
                ))}>
                  {settings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.yoyoIR1Level, benchmarks.elite.yoyoIR1Level!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.yoyoIR1Level}</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Matchdistans</div>
              <div className="font-medium">
                {positionProfile.avgMatchDistanceKm.min}-{positionProfile.avgMatchDistanceKm.max} km
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Sprints/match</div>
              <div className="font-medium">
                {positionProfile.avgSprintsPerMatch.min}-{positionProfile.avgSprintsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Hopp/match</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Speltid</div>
              <div className="font-medium">
                {positionProfile.avgMinutesPerMatch.min}-{positionProfile.avgMinutesPerMatch.max} min
              </div>
            </div>
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
    </div>
  )
}

export default BasketballDashboard
