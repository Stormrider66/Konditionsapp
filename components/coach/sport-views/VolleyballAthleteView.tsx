'use client'

import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
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
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  getPositionRecommendations,
  translateVolleyballText,
  type VolleyballPosition,
} from '@/lib/training-engine/volleyball'
import { SportTestHistory } from '@/components/tests/shared'

interface VolleyballSettings {
  position: VolleyballPosition
  teamName: string
  leagueLevel: string
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgSetsPerMatch: number | null
  yearsPlaying: number
  playStyle: string
  benchmarks: {
    verticalJump: number | null
    spikeJump: number | null
    blockJump: number | null
    standingReach: number | null
    agilityTTest: number | null
    sprint5m: number | null
    yoyoIR1Level: number | null
    squat: number | null
    powerClean: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: string
  height: number | null
  spikeHeight: number | null
  blockHeight: number | null
}

interface VolleyballAthleteViewProps {
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
  setter: { sv: 'Passare', en: 'Setter' },
  outside_hitter: { sv: 'Vänsterspiker', en: 'Outside hitter' },
  opposite_hitter: { sv: 'Diagonal', en: 'Opposite hitter' },
  middle_blocker: { sv: 'Centerblockare', en: 'Middle blocker' },
  libero: { sv: 'Libero', en: 'Libero' },
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
  elitserien: { sv: 'Elitserien', en: 'Elitserien' },
  ssl: { sv: 'Svenska Superligan', en: 'Swedish Super League' },
}

const PLAY_STYLE_LABELS: Record<string, LocalizedText> = {
  power: { sv: 'Kraftspelare', en: 'Power player' },
  finesse: { sv: 'Tekniker', en: 'Finesse player' },
  defensive: { sv: 'Försvarare', en: 'Defensive player' },
  allround: { sv: 'Allround', en: 'All-round' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  vertical_jump: { sv: 'Vertikal hoppförmåga', en: 'Vertical jump ability' },
  spike_power: { sv: 'Slagstyrka', en: 'Spike power' },
  blocking: { sv: 'Blockteknik', en: 'Blocking technique' },
  serving: { sv: 'Serve', en: 'Serve' },
  reception: { sv: 'Mottagning', en: 'Reception' },
  defense: { sv: 'Försvarsspel', en: 'Defense' },
  court_vision: { sv: 'Spelförståelse', en: 'Court vision' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  shoulder: { sv: 'Axelskada', en: 'Shoulder injury' },
  knee_patellar: { sv: 'Hopparknä', en: 'Jumper knee' },
  knee_acl: { sv: 'Knäskada (ACL/MCL)', en: 'Knee injury (ACL/MCL)' },
  ankle: { sv: 'Fotledsskada', en: 'Ankle injury' },
  back: { sv: 'Ryggproblem', en: 'Back issue' },
  finger: { sv: 'Fingerskada', en: 'Finger injury' },
  wrist: { sv: 'Handledsbesvär', en: 'Wrist issue' },
}

export function VolleyballAthleteView({
  clientId,
  clientName,
  settings: rawSettings,
}: VolleyballAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Volleyboll</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Ingen volleybollprofil hittades för', 'No volleyball profile found for')} {clientName}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const settings = rawSettings as unknown as VolleyballSettings
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
        return 'text-emerald-500'
      case 'good':
        return 'text-blue-500'
      case 'developing':
        return 'text-amber-500'
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
                <Trophy className="h-5 w-5 text-blue-500" />
                {clientName} - {settings.teamName || 'Volleyboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{labelFor(POSITION_LABELS, position, locale)}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, settings.leagueLevel, locale)}</Badge>
                <Badge className="bg-blue-500">{labelFor(PHASE_LABELS, settings.seasonPhase, locale)}</Badge>
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
              <Ruler className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'cm längd', 'cm height')}</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.spikeHeight ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.blockHeight ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm block</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.matchesPerWeek}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'matcher/v', 'matches/wk')}</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyTrainingSessions}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'träning/v', 'training/wk')}</div>
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
                    {translateVolleyballText(locale, item)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Styrka', 'Strength')}</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{translateVolleyballText(locale, seasonPhase.strengthEmphasis)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Kondition', 'Conditioning')}</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{translateVolleyballText(locale, seasonPhase.conditioningEmphasis)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jump Benchmarks */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4" />
            {t(locale, 'Hopptester', 'Jump tests')} - {labelFor(POSITION_LABELS, position, locale)}
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

            {/* Spike Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Smash-hopp', 'Spike jump')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.spikeJump} cm</div>
            </div>

            {/* Block Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>{t(locale, 'Block-hopp', 'Block jump')}</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.blockJump} cm</div>
            </div>

            {/* T-Test Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>T-test agility</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.agilityTTest} s</div>
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

            {/* Power Clean */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Power clean</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'Elit:', 'Elite:')} {benchmarks.elite.powerClean} kg</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            {t(locale, 'Positionsprofil:', 'Position profile:')} {translateVolleyballText(locale, positionProfile.displayName)}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{translateVolleyballText(locale, positionProfile.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Hopp/set', 'Jumps/set')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerSet.min}-{positionProfile.avgJumpsPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Hopp/match', 'Jumps/match')}</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            {position !== 'libero' && (
              <div>
                <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'Smash-höjd', 'Spike height')}</div>
                <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                  +{positionProfile.avgSpikeHeight.min}-{positionProfile.avgSpikeHeight.max} cm
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Nyckelegenskaper:', 'Key attributes:')}</div>
            <div className="flex flex-wrap gap-1">
              {positionProfile.keyPhysicalAttributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {translateVolleyballText(locale, attr)}
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
                    <div className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{translateVolleyballText(locale, exercise.name)}</div>
                    <div className="text-xs" style={{ color: theme.colors.textMuted }}>{translateVolleyballText(locale, exercise.setsReps)}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {translateVolleyballText(locale, exercise.category)}
                  </Badge>
                </div>
                <div className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>{translateVolleyballText(locale, exercise.notes)}</div>
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
                <Zap className="h-4 w-4 text-emerald-500" />
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
                <Target className="h-4 w-4 text-amber-500" />
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
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Position:', 'Position:')}</strong> {t(locale, 'Som', 'As')} {translateVolleyballText(locale, positionProfile.displayName).toLowerCase()} {t(locale, 'bör', 'should')} {clientName} {t(locale, 'fokusera på', 'focus on')}{' '}
              {positionProfile.keyPhysicalAttributes.map((attr) => translateVolleyballText(locale, attr)).slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>{t(locale, 'Hoppbelastning:', 'Jump load:')}</strong> {t(locale, 'Typisk hoppbelastning för positionen är', 'Typical jump load for the position is')}{' '}
              {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max} {t(locale, 'hopp per match. Övervaka för att undvika överbelastning.', 'jumps per match. Monitor it to avoid overload.')}
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
        sport="TEAM_VOLLEYBALL"
        title={t(locale, 'Testhistorik - Volleyboll', 'Test history - Volleyball')}
        protocolLabels={{
          SPIKE_JUMP: 'Spike Jump',
          VERTICAL_JUMP_CMJ: 'CMJ / Block Jump',
          T_TEST: 'T-Test',
        }}
      />
    </div>
  )
}

export default VolleyballAthleteView
