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
import type { HandballSettings } from '@/components/onboarding/HandballOnboarding'
import {
  HANDBALL_POSITION_PROFILES,
  HANDBALL_SEASON_PHASES,
  HANDBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/handball'

interface HandballDashboardProps {
  settings: HandballSettings
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  wing: 'Ytter',
  back: 'Vänster-/Högernia',
  center_back: 'Mittnia',
  pivot: 'Lansen',
}

const SIDE_LABELS: Record<string, string> = {
  left: 'Vänster',
  right: 'Höger',
  both: 'Båda',
  center: '',
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
  handbollsligan: 'Handbollsligan',
}

const STRENGTH_LABELS: Record<string, string> = {
  throwing_power: 'Skottstyrka',
  sprint_speed: 'Sprintsnabbhet',
  jumping: 'Hoppkraft',
  agility: 'Kvickhet',
  endurance: 'Uthållighet',
  upper_body: 'Överkroppsstyrka',
  core_stability: 'Core-stabilitet',
  contact_strength: 'Kontaktstyrka',
}

export function HandballDashboard({ settings }: HandballDashboardProps) {
  const position = settings.position
  const positionProfile = HANDBALL_POSITION_PROFILES[position]
  const seasonPhase = HANDBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = HANDBALL_BENCHMARKS[position]

  // Get position display name with side
  const getPositionDisplay = () => {
    if (settings.positionSide && settings.positionSide !== 'center') {
      return `${SIDE_LABELS[settings.positionSide]}${POSITION_LABELS[position].toLowerCase()}`
    }
    return POSITION_LABELS[position]
  }

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

  // Get recommended exercises for position
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
                {settings.teamName || 'Handboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{getPositionDisplay()}</Badge>
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
              <div className="text-lg font-bold">{settings.throwingArm === 'right' ? 'Höger' : 'Vänster'}</div>
              <div className="text-xs text-muted-foreground">kastararm</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-xs text-muted-foreground">
                Elit: {benchmarks.elite.yoyoIR1Level}
              </div>
            </div>

            {/* Sprint 10m */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>10m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint10m,
                  benchmarks.elite.sprint10m,
                  benchmarks.good.sprint10m,
                  true
                ))}>
                  {settings.benchmarks.sprint10m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint10m, benchmarks.elite.sprint10m, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Elit: {benchmarks.elite.sprint10m} s
              </div>
            </div>

            {/* CMJ */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CMJ hopp</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.cmjHeight,
                  benchmarks.elite.cmjHeight,
                  benchmarks.good.cmjHeight
                ))}>
                  {settings.benchmarks.cmjHeight ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.cmjHeight, benchmarks.elite.cmjHeight) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Elit: {benchmarks.elite.cmjHeight} cm
              </div>
            </div>

            {/* Medicine Ball */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Medicinboll</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.medicineBallThrow,
                  benchmarks.elite.medicineBallThrow,
                  benchmarks.good.medicineBallThrow
                ))}>
                  {settings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.medicineBallThrow, benchmarks.elite.medicineBallThrow) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                Elit: {benchmarks.elite.medicineBallThrow} m
              </div>
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

export default HandballDashboard
