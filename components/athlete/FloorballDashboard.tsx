'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
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
  translateFloorballText,
} from '@/lib/training-engine/floorball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface FloorballDashboardProps {
  settings: FloorballSettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const phrase = (locale: AppLocale, value: string) => (
  translateFloorballText(locale, value)
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  defender: { sv: 'Back', en: 'Defender' },
  center: { sv: 'Center', en: 'Center' },
  forward: { sv: 'Forward', en: 'Forward' },
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const LEAGUE_LABELS: Record<string, Record<AppLocale, string>> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
  ssl: { sv: 'Svenska Superligan', en: 'Swedish Super League' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  shooting_power: { sv: 'Skottstyrka', en: 'Shooting power' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  leg_strength: { sv: 'Benstyrka', en: 'Leg strength' },
  low_position: { sv: 'Låg position', en: 'Low position' },
}

export function FloorballDashboard({ settings }: FloorballDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{text(locale, 'Innebandy', 'Floorball')}</CardTitle>
          <CardDescription>
            {t('floorballNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
                {settings.teamName || text(locale, 'Innebandy', 'Floorball')}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]?.[locale]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]?.[locale]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[settings.seasonPhase]?.[locale]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'års erfarenhet', 'years experience')}</div>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'matcher/v', 'matches/wk')}</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'träning/v', 'sessions/wk')}</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.stickHand === 'right' ? text(locale, 'Höger', 'Right') : text(locale, 'Vänster', 'Left')}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'klubbhand', 'stick hand')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {PHASE_LABELS[settings.seasonPhase]?.[locale]} - {text(locale, 'Träningsfokus', 'Training focus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">{text(locale, 'Fokusområden:', 'Focus areas:')}</h4>
              <div className="flex flex-wrap gap-1">
                {seasonPhase.focus.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {phrase(locale, item)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{text(locale, 'Styrka', 'Strength')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.strengthEmphasis)}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{text(locale, 'Kondition', 'Conditioning')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.conditioningEmphasis)}</div>
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
            {text(locale, 'Fysiska tester', 'Physical tests')} - {POSITION_LABELS[position]?.[locale]}
          </CardTitle>
          <CardDescription>{text(locale, 'Dina resultat jämfört med elitnivå', 'Your results compared with elite level')}</CardDescription>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.yoyoIR1Level}</div>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.beepTestLevel}</div>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint20m} s</div>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.agilityTest} s</div>
            </div>

            {/* Standing Long Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Längdhopp', 'Standing long jump')}</span>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.standingLongJump} cm</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {text(locale, 'Positionsprofil:', 'Position profile:')} {POSITION_LABELS[position]?.[locale]}
          </CardTitle>
          <CardDescription>{phrase(locale, positionProfile.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Matchdistans', 'Match distance')}</div>
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
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Byten/match', 'Shifts/match')}</div>
              <div className="font-medium">
                {positionProfile.avgShiftsPerMatch.min}-{positionProfile.avgShiftsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Byteslängd', 'Shift length')}</div>
              <div className="font-medium">
                {positionProfile.avgShiftLengthSec.min}-{positionProfile.avgShiftLengthSec.max} {text(locale, 'sek', 'sec')}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">{text(locale, 'Nyckelegenskaper:', 'Key attributes:')}</div>
            <div className="flex flex-wrap gap-1">
              {positionProfile.keyPhysicalAttributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {phrase(locale, attr)}
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
            {text(locale, 'Rekommenderade övningar', 'Recommended exercises')}
          </CardTitle>
          <CardDescription>{text(locale, 'Baserat på din position och skadehistorik', 'Based on your position and injury history')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialExercises.map((exercise, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{phrase(locale, exercise.name)}</div>
                    <div className="text-xs text-muted-foreground">{phrase(locale, exercise.setsReps)}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {phrase(locale, exercise.category)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{phrase(locale, exercise.notes)}</div>
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
              {text(locale, 'Dina styrkor', 'Your strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.strengthFocus.map((strength) => (
                <Badge key={strength} variant="secondary">
                  {STRENGTH_LABELS[strength]?.[locale] || strength}
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
