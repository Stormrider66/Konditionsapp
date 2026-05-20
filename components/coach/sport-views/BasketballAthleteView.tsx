'use client'

import { useLocale } from 'next-intl'
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

type LocalizedText = { sv: string; en: string }

function t(locale: string, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function localized(locale: string, text: LocalizedText): string {
  return locale === 'sv' ? text.sv : text.en
}

function labelFor(labels: Record<string, LocalizedText>, key: string, locale: string): string {
  return labels[key] ? localized(locale, labels[key]) : key
}

const POSITION_LABELS: Record<string, LocalizedText> = {
  point_guard: { sv: 'Playmaker (1)', en: 'Point guard (1)' },
  shooting_guard: { sv: 'Shooting Guard (2)', en: 'Shooting guard (2)' },
  small_forward: { sv: 'Small Forward (3)', en: 'Small forward (3)' },
  power_forward: { sv: 'Power Forward (4)', en: 'Power forward (4)' },
  center: { sv: 'Center (5)', en: 'Center (5)' },
}

const PHASE_LABELS: Record<string, LocalizedText> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  basketligan: { sv: 'Basketligan', en: 'Basketligan' },
  sbl: { sv: 'SBL', en: 'SBL' },
}

const PLAY_STYLE_LABELS: Record<string, LocalizedText> = {
  scoring: { sv: 'Poänggörare', en: 'Scorer' },
  playmaking: { sv: 'Speluppbyggare', en: 'Playmaker' },
  defense: { sv: 'Försvarare', en: 'Defender' },
  rebounding: { sv: 'Reboundare', en: 'Rebounder' },
  allround: { sv: 'Allround', en: 'All-round' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  vertical_jump: { sv: 'Vertikal hoppförmåga', en: 'Vertical jump ability' },
  speed: { sv: 'Snabbhet', en: 'Speed' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  strength: { sv: 'Styrka', en: 'Strength' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  shooting: { sv: 'Skottförmåga', en: 'Shooting ability' },
  court_vision: { sv: 'Spelförståelse', en: 'Court vision' },
  defense: { sv: 'Försvarsspel', en: 'Defense' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  ankle: { sv: 'Fotledsskada', en: 'Ankle injury' },
  knee_acl: { sv: 'Knäskada (ACL/MCL)', en: 'Knee injury (ACL/MCL)' },
  patellar: { sv: 'Hopparknä', en: 'Jumper knee' },
  back: { sv: 'Ryggproblem', en: 'Back issue' },
  shoulder: { sv: 'Axelskada', en: 'Shoulder injury' },
  groin: { sv: 'Ljumskskada', en: 'Groin injury' },
  hamstring: { sv: 'Hamstringsskada', en: 'Hamstring injury' },
  finger: { sv: 'Fingerskada', en: 'Finger injury' },
}

export function BasketballAthleteView({
  clientId,
  clientName,
  settings: rawSettings,
}: BasketballAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Basket</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Ingen basketprofil hittades för', 'No basketball profile found for')} {clientName}
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
                <Badge variant="outline">{labelFor(POSITION_LABELS, position, locale)}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, settings.leagueLevel, locale)}</Badge>
                <Badge className="bg-orange-500">{labelFor(PHASE_LABELS, settings.seasonPhase, locale)}</Badge>
                <Badge variant="outline">{labelFor(PLAY_STYLE_LABELS, settings.playStyle, locale)}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.yearsPlaying}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'års erfarenhet', 'years experience')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.avgMinutesPerMatch ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'min/match', 'min/game')}</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.matchesPerWeek}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'matcher/v', 'games/wk')}</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyTrainingSessions}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'träning/v', 'training/wk')}</div>
            </div>
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'cm längd', 'cm height')}</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.shootingHand === 'right' ? t(locale, 'Höger', 'Right') : t(locale, 'Vänster', 'Left')}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'skotthand', 'shooting hand')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            {labelFor(PHASE_LABELS, settings.seasonPhase, locale)} - {t(locale, 'Träningsfokus', 'Training focus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Fokusområden:', 'Focus areas:')}</h4>
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
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Styrka', 'Strength')}</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{seasonPhase.strengthEmphasis}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Kondition', 'Conditioning')}</div>
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
            {t(locale, 'Fysiska tester', 'Physical tests')} - {labelFor(POSITION_LABELS, position, locale)}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Resultat jämfört med elitnivå', 'Results compared with elite level')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Vertikalhopp', 'Vertical jump')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.verticalJump} cm</div>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint3_4Court} s</div>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.laneAgility} s</div>
            </div>

            {/* Bench Press */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Bänkpress', 'Bench press')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.benchPress} kg</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Knäböj', 'Back squat')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.squat} kg</div>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.yoyoIR1Level}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            {t(locale, 'Positionsprofil:', 'Position profile:')} {positionProfile.displayName}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{positionProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Matchdistans', 'Match distance')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgMatchDistanceKm.min}-{positionProfile.avgMatchDistanceKm.max} km
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Sprints/match', 'Sprints/game')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgSprintsPerMatch.min}-{positionProfile.avgSprintsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Hopp/match', 'Jumps/game')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Speltid', 'Playing time')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgMinutesPerMatch.min}-{positionProfile.avgMinutesPerMatch.max} min
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Nyckelegenskaper:', 'Key attributes:')}</div>
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
            {t(locale, 'Rekommenderade övningar', 'Recommended exercises')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Baserat på position och skadehistorik', 'Based on position and injury history')}</CardDescription>
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
                {t(locale, 'Styrkor', 'Strengths')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.strengthFocus.map((strength) => (
                  <Badge key={strength} variant="secondary">
                    {STRENGTH_LABELS[strength] ? localized(locale, STRENGTH_LABELS[strength]) : strength}
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
                {t(locale, 'Utvecklingsområden', 'Development areas')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.weaknesses.map((weakness) => (
                  <Badge key={weakness} variant="outline">
                    {STRENGTH_LABELS[weakness] ? localized(locale, STRENGTH_LABELS[weakness]) : weakness}
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
              {t(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Tidigare skador att ta hänsyn till i träningsplaneringen', 'Previous injuries to account for in training planning')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  {INJURY_LABELS[injury] ? localized(locale, INJURY_LABELS[injury]) : injury}
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
            {t(locale, 'Träningsrekommendationer', 'Training recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Position:', 'Position:')}</strong> {t(locale, 'Som', 'As')} {positionProfile.displayName.toLowerCase()} {t(locale, 'bör', 'should')} {clientName} {t(locale, 'fokusera på', 'focus on')}{' '}
              {positionProfile.keyPhysicalAttributes.slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Säsongsfas:', 'Season phase:')}</strong> {t(locale, 'Under', 'During')} {labelFor(PHASE_LABELS, settings.seasonPhase, locale).toLowerCase()} {t(locale, 'rekommenderas', 'we recommend')}{' '}
              {seasonPhase.weeklyStructure.strengthSessions} {t(locale, 'styrkepass och', 'strength sessions and')} {seasonPhase.weeklyStructure.conditioningSessions} {t(locale, 'konditionspass per vecka.', 'conditioning sessions per week.')}
            </p>
            {settings.injuryHistory.length > 0 && (
              <p>
                <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Skadeprevention:', 'Injury prevention:')}</strong> {t(locale, 'Med tanke på tidigare', 'Given previous')}{' '}
                {settings.injuryHistory.map(i => INJURY_LABELS[i] ? localized(locale, INJURY_LABELS[i]).toLowerCase() : i).join(', ')}, {t(locale, 'inkludera alltid skadeförebyggande övningar.', 'always include preventive exercises.')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_BASKETBALL"
        title={t(locale, 'Testhistorik - Basket', 'Test history - Basketball')}
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
