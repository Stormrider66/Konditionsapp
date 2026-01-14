'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import {
  Trophy,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  AlertTriangle,
  Ruler,
} from 'lucide-react'
import {
  BASKETBALL_POSITION_PROFILES,
  BASKETBALL_SEASON_PHASES,
  BASKETBALL_BENCHMARKS,
  getPositionRecommendations,
  type BasketballPosition,
} from '@/lib/training-engine/basketball'
import { SportTestHistory } from '@/components/tests/shared'

interface BasketballSettings {
  position: BasketballPosition
  teamName: string
  leagueLevel: string
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number
  playStyle: string
  benchmarks: {
    verticalJump: number | null
    standingReach: number | null
    sprint3_4Court: number | null
    laneAgility: number | null
    shuttleRun: number | null
    benchPress: number | null
    squat: number | null
    yoyoIR1Level: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  shootingHand: string
  height: number | null
  wingspan: number | null
}

interface BasketballAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
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

const PLAY_STYLE_LABELS: Record<string, string> = {
  scoring: 'Poänggörare',
  playmaking: 'Speluppbyggare',
  defense: 'Försvarare',
  rebounding: 'Reboundare',
  allround: 'Allround',
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

const INJURY_LABELS: Record<string, string> = {
  ankle: 'Fotledsskada',
  knee_acl: 'Knäskada (ACL/MCL)',
  patellar: 'Hopparknä',
  back: 'Ryggproblem',
  shoulder: 'Axelskada',
  groin: 'Ljumskskada',
  hamstring: 'Hamstringsskada',
  finger: 'Fingerskada',
}

export function BasketballAthleteView({
  clientId,
  clientName,
  settings: rawSettings,
}: BasketballAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Basket</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Ingen basketprofil hittades för {clientName}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const settings = rawSettings as unknown as BasketballSettings
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
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Trophy className="h-5 w-5 text-orange-500" />
                {clientName} - {settings.teamName || 'Basket'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel] || settings.leagueLevel}</Badge>
                <Badge className="bg-orange-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
                <Badge variant="outline">{PLAY_STYLE_LABELS[settings.playStyle] || settings.playStyle}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.yearsPlaying}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.avgMinutesPerMatch ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>min/match</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.matchesPerWeek}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>matcher/v</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyTrainingSessions}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>träning/v</div>
            </div>
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm längd</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.shootingHand === 'right' ? 'Höger' : 'Vänster'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>skotthand</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            {PHASE_LABELS[settings.seasonPhase]} - Träningsfokus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Fokusområden:</h4>
              <div className="flex flex-wrap gap-1">
                {seasonPhase.focus.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>Styrka</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{seasonPhase.strengthEmphasis}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>Kondition</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{seasonPhase.conditioningEmphasis}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            Fysiska tester - {POSITION_LABELS[position]}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Resultat jämfört med elitnivå</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Vertikalhopp</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.verticalJump} cm</div>
            </div>

            {/* 3/4 Court Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>3/4 Court sprint</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.sprint3_4Court} s</div>
            </div>

            {/* Lane Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Lane Agility</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.laneAgility} s</div>
            </div>

            {/* Bench Press */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Bänkpress</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.benchPress} kg</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Knäböj</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.squat} kg</div>
            </div>

            {/* Yo-Yo IR1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Yo-Yo IR1</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.yoyoIR1Level}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            Positionsprofil: {positionProfile.displayName}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{positionProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Matchdistans</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgMatchDistanceKm.min}-{positionProfile.avgMatchDistanceKm.max} km
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Sprints/match</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgSprintsPerMatch.min}-{positionProfile.avgSprintsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Hopp/match</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Speltid</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgMinutesPerMatch.min}-{positionProfile.avgMinutesPerMatch.max} min
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Nyckelegenskaper:</div>
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
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Dumbbell className="h-4 w-4" />
            Rekommenderade övningar
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Baserat på position och skadehistorik</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialExercises.map((exercise, i) => (
              <div key={i} className="p-3 border rounded-lg" style={{ borderColor: theme.colors.border }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{exercise.name}</div>
                    <div className="text-xs" style={{ color: theme.colors.textMuted }}>{exercise.setsReps}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {exercise.category}
                  </Badge>
                </div>
                <div className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>{exercise.notes}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.strengthFocus.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Zap className="h-4 w-4 text-yellow-500" />
                Styrkor
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

        {settings.weaknesses.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Target className="h-4 w-4 text-blue-500" />
                Utvecklingsområden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.weaknesses.map((weakness) => (
                  <Badge key={weakness} variant="outline">
                    {STRENGTH_LABELS[weakness] || weakness}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Injury History */}
      {settings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Skadehistorik
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              Tidigare skador att ta hänsyn till i träningsplaneringen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            Träningsrekommendationer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Position:</strong> Som {positionProfile.displayName.toLowerCase()} bör {clientName} fokusera på{' '}
              {positionProfile.keyPhysicalAttributes.slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Säsongsfas:</strong> Under {PHASE_LABELS[settings.seasonPhase].toLowerCase()} rekommenderas{' '}
              {seasonPhase.weeklyStructure.strengthSessions} styrkepass och {seasonPhase.weeklyStructure.conditioningSessions} konditionspass per vecka.
            </p>
            {settings.injuryHistory.length > 0 && (
              <p>
                <strong style={{ color: theme.colors.textPrimary }}>Skadeprevention:</strong> Med tanke på tidigare{' '}
                {settings.injuryHistory.map(i => INJURY_LABELS[i]?.toLowerCase() || i).join(', ')}, inkludera alltid skadeförebyggande övningar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_BASKETBALL"
        title="Testhistorik - Basket"
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          VERTICAL_JUMP_CMJ: 'CMJ',
          LANE_AGILITY: 'Lane Agility',
          SPRINT_20M: '20m Sprint',
        }}
      />
    </div>
  )
}

export default BasketballAthleteView
