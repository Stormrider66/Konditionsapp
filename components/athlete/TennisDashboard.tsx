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
import type { TennisSettings } from '@/components/onboarding/TennisOnboarding'
import {
  TENNIS_PLAYSTYLE_PROFILES,
  TENNIS_SEASON_PHASES,
  TENNIS_BENCHMARKS,
  getPlayStyleRecommendations,
  getSurfaceConsiderations,
} from '@/lib/training-engine/tennis'

interface TennisDashboardProps {
  settings: TennisSettings
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  aggressive_baseliner: 'Aggressiv Baslinjespelare',
  serve_and_volleyer: 'Serve-Volleyspelare',
  all_court: 'Allroundspelare',
  counter_puncher: 'Defensiv Spelare',
  big_server: 'Servkung',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  tournament: 'Turnering',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Motionsspelare',
  club: 'Klubbspelare',
  division_4: 'Division 4',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  elitserien: 'Elitserien',
  atp_wta: 'ATP/WTA',
}

const SURFACE_LABELS: Record<string, string> = {
  hard: 'Hardcourt',
  clay: 'Grus',
  grass: 'Gräs',
  indoor: 'Inomhus',
  all: 'Alla underlag',
}

const STRENGTH_LABELS: Record<string, string> = {
  serve: 'Serve',
  forehand: 'Forehand',
  backhand: 'Backhand',
  volley: 'Volley',
  return: 'Return',
  movement: 'Rörelse/Fotwork',
  mental: 'Mental styrka',
  endurance: 'Uthållighet',
}

export function TennisDashboard({ settings }: TennisDashboardProps) {
  const playStyle = settings.playStyle
  const playStyleProfile = TENNIS_PLAYSTYLE_PROFILES[playStyle]
  const seasonPhase = TENNIS_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = TENNIS_BENCHMARKS[playStyle]

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
  const recommendations = getPlayStyleRecommendations(playStyle)
  const essentialExercises = recommendations.filter((r) => r.priority === 'essential').slice(0, 4)

  // Get surface considerations
  const surfaceConsiderations = settings.preferredSurface !== 'all'
    ? getSurfaceConsiderations(settings.preferredSurface as 'hard' | 'clay' | 'grass' | 'indoor')
    : []

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                {settings.clubName || 'Tennis'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{PLAYSTYLE_LABELS[playStyle]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]}</Badge>
                <Badge className="bg-green-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
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
              <Ruler className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm längd</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.serveSpeed ?? '-'}</div>
              <div className="text-xs text-muted-foreground">km/h serve</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{SURFACE_LABELS[settings.preferredSurface]}</div>
              <div className="text-xs text-muted-foreground">underlag</div>
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

      {/* Speed Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-green-500" />
            Snabbhetstester - {PLAYSTYLE_LABELS[playStyle]}
          </CardTitle>
          <CardDescription>Dina resultat jämfört med elitnivå</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 5m Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>5m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint5m,
                  benchmarks.elite.sprint5m!,
                  benchmarks.good.sprint5m!,
                  true
                ))}>
                  {settings.benchmarks.sprint5m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint5m, benchmarks.elite.sprint5m!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.sprint5m} s</div>
            </div>

            {/* 10m Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>10m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint10m,
                  benchmarks.elite.sprint10m!,
                  benchmarks.good.sprint10m!,
                  true
                ))}>
                  {settings.benchmarks.sprint10m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint10m, benchmarks.elite.sprint10m!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.sprint10m} s</div>
            </div>

            {/* Spider Drill */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Spider drill</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.agilitySpider,
                  benchmarks.elite.agilitySpider!,
                  benchmarks.good.agilitySpider!,
                  true
                ))}>
                  {settings.benchmarks.agilitySpider?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.agilitySpider, benchmarks.elite.agilitySpider!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.agilitySpider} s</div>
            </div>

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

            {/* Medicine Ball */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Medicinboll</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.medicineBallThrow,
                  benchmarks.elite.medicineBallThrow!,
                  benchmarks.good.medicineBallThrow!
                ))}>
                  {settings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.medicineBallThrow, benchmarks.elite.medicineBallThrow!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.medicineBallThrow} m</div>
            </div>

            {/* Yo-Yo */}
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

      {/* Play Style Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Spelstilsprofil: {playStyleProfile.displayName}
          </CardTitle>
          <CardDescription>{playStyleProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Rallys/set</div>
              <div className="font-medium">
                {playStyleProfile.avgRalliesPerSet.min}-{playStyleProfile.avgRalliesPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Poäng/match</div>
              <div className="font-medium">
                {playStyleProfile.avgPointsPerMatch.min}-{playStyleProfile.avgPointsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Bantäckning</div>
              <div className="font-medium capitalize">
                {playStyleProfile.courtCoverage.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Nyckelegenskaper:</div>
            <div className="flex flex-wrap gap-1">
              {playStyleProfile.keyPhysicalAttributes.map((attr, i) => (
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
          <CardDescription>Baserat på din spelstil och skadehistorik</CardDescription>
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

      {/* Surface Considerations */}
      {surfaceConsiderations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-green-500" />
              {SURFACE_LABELS[settings.preferredSurface]} - Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {surfaceConsiderations.map((tip, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-1">-</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {settings.strengthFocus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-green-500" />
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

export default TennisDashboard
