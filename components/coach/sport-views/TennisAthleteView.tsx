'use client'

import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import {
  Trophy,
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
  TENNIS_PLAYSTYLE_PROFILES,
  TENNIS_SEASON_PHASES,
  TENNIS_BENCHMARKS,
  getPlayStyleRecommendations,
  getSurfaceConsiderations,
  type TennisPlayStyle,
} from '@/lib/training-engine/tennis'
import { SportTestHistory } from '@/components/tests/shared'

interface TennisSettings {
  playStyle: TennisPlayStyle
  clubName: string
  leagueLevel: string
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'tournament'
  matchesPerWeek: number
  yearsPlaying: number
  preferredSurface: string
  benchmarks: {
    sprint5m: number | null
    sprint10m: number | null
    sprint20m: number | null
    agilitySpider: number | null
    agility505: number | null
    verticalJump: number | null
    medicineBallThrow: number | null
    yoyoIR1Level: number | null
    shoulderStrengthRatio: number | null
    gripStrength: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: string
  height: number | null
  serveSpeed: number | null
  forehandGrip: string
  backhandType: string
}

interface TennisAthleteViewProps {
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

const PLAYSTYLE_LABELS: Record<string, LocalizedText> = {
  aggressive_baseliner: { sv: 'Aggressiv Baslinjespelare', en: 'Aggressive baseliner' },
  serve_and_volleyer: { sv: 'Serve-Volleyspelare', en: 'Serve-and-volley player' },
  all_court: { sv: 'Allroundspelare', en: 'All-court player' },
  counter_puncher: { sv: 'Defensiv Spelare', en: 'Counterpuncher' },
  big_server: { sv: 'Servkung', en: 'Big server' },
}

const PHASE_LABELS: Record<string, LocalizedText> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  tournament: { sv: 'Turnering', en: 'Tournament' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Motionsspelare', en: 'Recreational player' },
  club: { sv: 'Klubbspelare', en: 'Club player' },
  division_4: { sv: 'Division 4', en: 'Division 4' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  elitserien: { sv: 'Elitserien', en: 'Elitserien' },
  atp_wta: { sv: 'ATP/WTA', en: 'ATP/WTA' },
}

const SURFACE_LABELS: Record<string, LocalizedText> = {
  hard: { sv: 'Hardcourt', en: 'Hard court' },
  clay: { sv: 'Grus', en: 'Clay' },
  grass: { sv: 'Gräs', en: 'Grass' },
  indoor: { sv: 'Inomhus', en: 'Indoor' },
  all: { sv: 'Alla underlag', en: 'All surfaces' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  serve: { sv: 'Serve', en: 'Serve' },
  forehand: { sv: 'Forehand', en: 'Forehand' },
  backhand: { sv: 'Backhand', en: 'Backhand' },
  volley: { sv: 'Volley', en: 'Volley' },
  return: { sv: 'Return', en: 'Return' },
  movement: { sv: 'Rörelse/Fotwork', en: 'Movement/footwork' },
  mental: { sv: 'Mental styrka', en: 'Mental strength' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  shoulder: { sv: 'Axelskada', en: 'Shoulder injury' },
  elbow: { sv: 'Tennisarmbåge', en: 'Tennis elbow' },
  wrist: { sv: 'Handledsbesvär', en: 'Wrist issue' },
  back: { sv: 'Ryggproblem', en: 'Back issue' },
  knee: { sv: 'Knäskada', en: 'Knee injury' },
  ankle: { sv: 'Fotledsskada', en: 'Ankle injury' },
  hip: { sv: 'Höftproblem', en: 'Hip issue' },
  abdominal: { sv: 'Magbesvär', en: 'Abdominal issue' },
}

const GRIP_LABELS: Record<string, string> = {
  eastern: 'Eastern',
  semi_western: 'Semi-Western',
  western: 'Western',
  continental: 'Continental',
}

const BACKHAND_LABELS: Record<string, LocalizedText> = {
  one_handed: { sv: 'Enhands', en: 'One-handed' },
  two_handed: { sv: 'Tvåhands', en: 'Two-handed' },
}

export function TennisAthleteView({
  clientId,
  clientName,
  settings: rawSettings,
}: TennisAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Tennis</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Ingen tennisprofil hittades för', 'No tennis profile found for')} {clientName}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const settings = rawSettings as unknown as TennisSettings
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
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Trophy className="h-5 w-5 text-green-500" />
                {clientName} - {settings.clubName || 'Tennis'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{labelFor(PLAYSTYLE_LABELS, playStyle, locale)}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, settings.leagueLevel, locale)}</Badge>
                <Badge className="bg-green-500">{labelFor(PHASE_LABELS, settings.seasonPhase, locale)}</Badge>
                <Badge variant="outline">{labelFor(SURFACE_LABELS, settings.preferredSurface, locale)}</Badge>
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
              <Ruler className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'cm längd', 'cm height')}</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.serveSpeed ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>km/h serve</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{GRIP_LABELS[settings.forehandGrip] || '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>FH-grepp</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.matchesPerWeek}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'matcher/v', 'matches/wk')}</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyTrainingSessions}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'träning/v', 'training/wk')}</div>
            </div>
          </div>
          <div className="mt-3 text-center text-sm" style={{ color: theme.colors.textMuted }}>
            {settings.dominantHand === 'right' ? t(locale, 'Högerhänt', 'Right-handed') : t(locale, 'Vänsterhänt', 'Left-handed')} |{' '}
            {BACKHAND_LABELS[settings.backhandType] ? localized(locale, BACKHAND_LABELS[settings.backhandType]) : settings.backhandType} backhand
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

      {/* Speed Benchmarks */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-green-500" />
            {t(locale, 'Fysiska tester', 'Physical tests')} - {labelFor(PLAYSTYLE_LABELS, playStyle, locale)}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Resultat jämfört med elitnivå', 'Results compared with elite level')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 5m Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>5m sprint</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint5m} s</div>
            </div>

            {/* Spider Drill */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Spider drill</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.agilitySpider} s</div>
            </div>

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

            {/* Medicine Ball */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Medicinbollkast', 'Medicine ball throw')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.medicineBallThrow} m</div>
            </div>

            {/* Grip Strength */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Greppstyrka', 'Grip strength')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.gripStrength,
                  benchmarks.elite.gripStrength!,
                  benchmarks.good.gripStrength!
                ))}>
                  {settings.benchmarks.gripStrength ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.gripStrength, benchmarks.elite.gripStrength!) ?? 0}
                className="h-2"
              />
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.gripStrength} kg</div>
            </div>

            {/* Yo-Yo */}
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

      {/* Play Style Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            {t(locale, 'Spelstilsprofil:', 'Play-style profile:')} {playStyleProfile.displayName}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{playStyleProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Rallys/set', 'Rallies/set')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.avgRalliesPerSet.min}-{playStyleProfile.avgRalliesPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Poäng/match', 'Points/match')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.avgPointsPerMatch.min}-{playStyleProfile.avgPointsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Bantäckning', 'Court coverage')}</div>
              <div className="font-medium capitalize" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.courtCoverage.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Nyckelegenskaper:', 'Key attributes:')}</div>
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
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Dumbbell className="h-4 w-4" />
            {t(locale, 'Rekommenderade övningar', 'Recommended exercises')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Baserat på spelstil och skadehistorik', 'Based on play style and injury history')}</CardDescription>
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

      {/* Surface Considerations */}
      {surfaceConsiderations.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <Target className="h-4 w-4 text-green-500" />
              {labelFor(SURFACE_LABELS, settings.preferredSurface, locale)} - {t(locale, 'Överväganden', 'Considerations')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {surfaceConsiderations.map((tip, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: theme.colors.textMuted }}>
                  <span className="text-green-500 mt-1">-</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.strengthFocus.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Zap className="h-4 w-4 text-green-500" />
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
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Spelstil:', 'Play style:')}</strong> {t(locale, 'Som', 'As')} {playStyleProfile.displayName.toLowerCase()} {t(locale, 'bör', 'should')} {clientName} {t(locale, 'fokusera på', 'focus on')}{' '}
              {playStyleProfile.keyPhysicalAttributes.slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Matchbelastning:', 'Match load:')}</strong> {t(locale, 'Typisk matchbelastning för spelstilen innebär', 'Typical match load for the play style includes')}{' '}
              {playStyleProfile.avgRalliesPerSet.min}-{playStyleProfile.avgRalliesPerSet.max} {t(locale, 'rallys per set. Längre rallys för defensiva spelare.', 'rallies per set. Defensive players usually have longer rallies.')}
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Säsongsfas:', 'Season phase:')}</strong> {t(locale, 'Under', 'During')} {labelFor(PHASE_LABELS, settings.seasonPhase, locale).toLowerCase()} {t(locale, 'rekommenderas', 'we recommend')}{' '}
              {seasonPhase.weeklyStructure.strengthSessions} {t(locale, 'styrkepass och', 'strength sessions and')} {seasonPhase.weeklyStructure.technicalSessions} {t(locale, 'tekniska pass per vecka.', 'technical sessions per week.')}
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
        sport="TENNIS"
        title={t(locale, 'Testhistorik - Tennis', 'Test history - Tennis')}
        protocolLabels={{
          SERVE_SPEED: t(locale, 'Serve hastighet', 'Serve speed'),
          PRO_AGILITY_5_10_5: '5-10-5 Agility',
          SPRINT_20M: '20m Sprint',
          YOYO_IR1: 'Yo-Yo IR1',
        }}
      />
    </div>
  )
}

export default TennisAthleteView
