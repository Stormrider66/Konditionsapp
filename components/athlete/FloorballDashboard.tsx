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
} from 'lucide-react'
import type { FloorballSettings } from '@/components/onboarding/FloorballOnboarding'
import {
  FLOORBALL_POSITION_PROFILES,
  FLOORBALL_SEASON_PHASES,
  FLOORBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/floorball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface FloorballDashboardProps {
  settings: FloorballSettings
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  defender: 'Back',
  center: 'Center',
  forward: 'Forward',
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
  allsvenskan: 'Allsvenskan',
  ssl: 'Svenska Superligan',
}

const STRENGTH_LABELS: Record<string, string> = {
  sprint_speed: 'Sprintsnabbhet',
  acceleration: 'Acceleration',
  endurance: 'Uthållighet',
  agility: 'Kvickhet',
  shooting_power: 'Skottstyrka',
  core_stability: 'Core-stabilitet',
  leg_strength: 'Benstyrka',
  low_position: 'Låg position',
}

export function FloorballDashboard({ settings }: FloorballDashboardProps) {
  const position = settings.position
  const positionProfile = FLOORBALL_POSITION_PROFILES[position]
  const seasonPhase = FLOORBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = FLOORBALL_BENCHMARKS[position]

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
                <Trophy className="h-5 w-5 text-blue-500" />
                {settings.teamName || 'Innebandy'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
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
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
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
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.stickHand === 'right' ? 'Höger' : 'Vänster'}</div>
              <div className="text-xs text-muted-foreground">klubbhand</div>
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
            {/* Yo-Yo IR1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Yo-Yo IR1</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.yoyoIR1Level,
                  benchmarks.elite.yoyoIR1Level,
                  benchmarks.good.yoyoIR1Level
                ))}>
                  {settings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.yoyoIR1Level, benchmarks.elite.yoyoIR1Level) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.yoyoIR1Level}</div>
            </div>

            {/* Beep Test */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Beep-test</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.beepTestLevel,
                  benchmarks.elite.beepTestLevel,
                  benchmarks.good.beepTestLevel
                ))}>
                  {settings.benchmarks.beepTestLevel?.toFixed(1) ?? '-'}
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.beepTestLevel, benchmarks.elite.beepTestLevel) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.beepTestLevel}</div>
            </div>

            {/* Sprint 20m */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>20m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint20m,
                  benchmarks.elite.sprint20m,
                  benchmarks.good.sprint20m,
                  true
                ))}>
                  {settings.benchmarks.sprint20m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint20m, benchmarks.elite.sprint20m, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.sprint20m} s</div>
            </div>

            {/* Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>5-10-5 agility</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.agilityTest,
                  benchmarks.elite.agilityTest,
                  benchmarks.good.agilityTest,
                  true
                ))}>
                  {settings.benchmarks.agilityTest?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.agilityTest, benchmarks.elite.agilityTest, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.agilityTest} s</div>
            </div>

            {/* Standing Long Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Längdhopp</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.standingLongJump,
                  benchmarks.elite.standingLongJump,
                  benchmarks.good.standingLongJump
                ))}>
                  {settings.benchmarks.standingLongJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.standingLongJump, benchmarks.elite.standingLongJump) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.standingLongJump} cm</div>
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
              <div className="text-sm text-muted-foreground mb-1">Byten/match</div>
              <div className="font-medium">
                {positionProfile.avgShiftsPerMatch.min}-{positionProfile.avgShiftsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Byteslängd</div>
              <div className="font-medium">
                {positionProfile.avgShiftLengthSec.min}-{positionProfile.avgShiftLengthSec.max} sek
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

      {/* Match Schedule */}
      <MatchScheduleWidget />
    </div>
  )
}

export default FloorballDashboard
