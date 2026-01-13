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
  Users,
} from 'lucide-react'
import type { PadelSettings } from '@/components/onboarding/PadelOnboarding'
import {
  PADEL_POSITION_PROFILES,
  PADEL_SEASON_PHASES,
  PADEL_BENCHMARKS,
  getPositionRecommendations,
  getPartnerSynergyTips,
} from '@/lib/training-engine/padel'

interface PadelDashboardProps {
  settings: PadelSettings
}

const POSITION_LABELS: Record<string, string> = {
  right_side: 'Högersida',
  left_side: 'Vänstersida',
  all_court: 'Allround',
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
  padel_tour: 'Padel Tour',
  wpt: 'World Padel Tour',
}

const STRENGTH_LABELS: Record<string, string> = {
  smash: 'Smash',
  bandeja: 'Bandeja',
  vibora: 'Víbora',
  lob: 'Lobb',
  forehand: 'Forehand',
  backhand: 'Backhand',
  volley: 'Volley',
  movement: 'Rörelse/Fotwork',
  wall_play: 'Väggspel',
  mental: 'Mental styrka',
}

export function PadelDashboard({ settings }: PadelDashboardProps) {
  const position = settings.position
  const positionProfile = PADEL_POSITION_PROFILES[position]
  const seasonPhase = PADEL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = PADEL_BENCHMARKS[position]

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

  // Get partner synergy tips
  const partnerTips = getPartnerSynergyTips(position)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-500" />
                {settings.clubName || 'Padel'}
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
              <Ruler className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm längd</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.smashSpeed ?? '-'}</div>
              <div className="text-xs text-muted-foreground">km/h smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.matchesPerWeek}</div>
              <div className="text-xs text-muted-foreground">matcher/v</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">träning/v</div>
            </div>
          </div>
          {settings.preferredPartner && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Partner: {settings.preferredPartner}</span>
            </div>
          )}
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
            <Activity className="h-4 w-4 text-blue-500" />
            Fysiska tester - {POSITION_LABELS[position]}
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

            {/* Lateral Shuffle */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lateral shuffle</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.lateralShuffle,
                  benchmarks.elite.lateralShuffle!,
                  benchmarks.good.lateralShuffle!,
                  true
                ))}>
                  {settings.benchmarks.lateralShuffle?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.lateralShuffle, benchmarks.elite.lateralShuffle!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.lateralShuffle} s</div>
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

            {/* Reaction Time */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reaktionstid</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.reactionTime,
                  benchmarks.elite.reactionTime!,
                  benchmarks.good.reactionTime!,
                  true
                ))}>
                  {settings.benchmarks.reactionTime ?? '-'} ms
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.reactionTime, benchmarks.elite.reactionTime!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">Elit: {benchmarks.elite.reactionTime} ms</div>
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
              <div className="text-sm text-muted-foreground mb-1">Rallys/set</div>
              <div className="font-medium">
                {positionProfile.avgRalliesPerSet.min}-{positionProfile.avgRalliesPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Poäng/match</div>
              <div className="font-medium">
                {positionProfile.avgPointsPerMatch.min}-{positionProfile.avgPointsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Bantäckning</div>
              <div className="font-medium text-sm">
                {positionProfile.courtCoverage}
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

      {/* Partner Synergy Tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-500" />
            Partnerspelets tips
          </CardTitle>
          <CardDescription>Tips för bättre samspel med din partner</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {partnerTips.map((tip, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-500 mt-1">-</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
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
              <Zap className="h-4 w-4 text-blue-500" />
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

export default PadelDashboard
