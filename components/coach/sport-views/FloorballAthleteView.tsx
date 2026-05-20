'use client'

import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SportTestHistory } from '@/components/tests/shared'
import {
  Trophy,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  Zap,
  Users,
  Calendar,
  Activity,
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { FloorballSettings } from '@/components/onboarding/FloorballOnboarding'

interface FloorballAthleteViewProps {
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
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  defender: { sv: 'Back', en: 'Defender' },
  center: { sv: 'Center', en: 'Center' },
  forward: { sv: 'Forward', en: 'Forward' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
  ssl: { sv: 'Svenska Superligan', en: 'Swedish Super League' },
}

const PHASE_LABELS: Record<string, LocalizedText> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const PLAYSTYLE_LABELS: Record<string, LocalizedText> = {
  offensive: { sv: 'Offensiv', en: 'Offensive' },
  defensive: { sv: 'Defensiv', en: 'Defensive' },
  playmaker: { sv: 'Spelmotor', en: 'Playmaker' },
  physical: { sv: 'Fysisk', en: 'Physical' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  shooting_power: { sv: 'Skottstyrka', en: 'Shot power' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  leg_strength: { sv: 'Benstyrka', en: 'Leg strength' },
  low_position: { sv: 'Låg position', en: 'Low position' },
}

const WEAKNESS_LABELS: Record<string, LocalizedText> = {
  weak_hand: { sv: 'Svaga handen', en: 'Weak hand' },
  finishing: { sv: 'Avslut', en: 'Finishing' },
  defense: { sv: 'Försvarsspel', en: 'Defense' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  stick_handling: { sv: 'Teknik', en: 'Stick handling' },
  passing: { sv: 'Passningar', en: 'Passing' },
  stamina: { sv: 'Uthållighet', en: 'Stamina' },
  game_reading: { sv: 'Spelläsning', en: 'Game reading' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  groin: { sv: 'Ljumske', en: 'Groin' },
  hamstring: { sv: 'Hamstring', en: 'Hamstring' },
  knee: { sv: 'Knä', en: 'Knee' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  hip: { sv: 'Höft', en: 'Hip' },
  back: { sv: 'Rygg', en: 'Back' },
  wrist: { sv: 'Handled', en: 'Wrist' },
  shoulder: { sv: 'Axel', en: 'Shoulder' },
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: LocalizedText[]; avoid: LocalizedText[] }> = {
  off_season: {
    focus: [
      { sv: 'Aerob basträning', en: 'Aerobic base training' },
      { sv: 'Maxstyrka (4-6 rep)', en: 'Max strength (4-6 reps)' },
      { sv: 'Rörlighet', en: 'Mobility' },
      { sv: 'Skaderehabilitering', en: 'Injury rehab' },
    ],
    avoid: [
      { sv: 'Hög-intensiva intervaller', en: 'High-intensity intervals' },
      { sv: 'Maximal matchsimulering', en: 'Maximal match simulation' },
    ],
  },
  pre_season: {
    focus: [
      { sv: 'Explosiv styrka', en: 'Explosive strength' },
      { sv: 'Intervallträning', en: 'Interval training' },
      { sv: 'Snabbhet & agility', en: 'Speed & agility' },
      { sv: 'Matchsimulering', en: 'Match simulation' },
    ],
    avoid: [
      { sv: 'Långdistans steady-state', en: 'Long steady-state distance work' },
      { sv: 'Hög volym styrketräning', en: 'High-volume strength training' },
    ],
  },
  in_season: {
    focus: [
      { sv: 'Underhållsstyrka (2x/v)', en: 'Maintenance strength (2x/week)' },
      { sv: 'Aktiv återhämtning', en: 'Active recovery' },
      { sv: 'Mobilitet', en: 'Mobility' },
      { sv: 'Skadeförebyggande', en: 'Injury prevention' },
    ],
    avoid: [
      { sv: 'Hög volym off-court', en: 'High off-court volume' },
      { sv: 'Nya övningar', en: 'New exercises' },
      { sv: 'Tung styrka nära match', en: 'Heavy strength close to games' },
    ],
  },
  playoffs: {
    focus: [
      { sv: 'Lätt aktivering', en: 'Light activation' },
      { sv: 'Mental skärpa', en: 'Mental sharpness' },
      { sv: 'Sömn & återhämtning', en: 'Sleep & recovery' },
      { sv: 'Lagsammanhållning', en: 'Team cohesion' },
    ],
    avoid: [
      { sv: 'Styrketräning', en: 'Strength training' },
      { sv: 'Konditionsträning', en: 'Conditioning training' },
      { sv: 'Allt som kan orsaka trötthet', en: 'Anything that can create fatigue' },
    ],
  },
}

// Position-specific physical benchmarks (elite level references)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint20m: number; agility: number; longJump: number }> = {
  goalkeeper: { yoyoIR1: 17.0, sprint20m: 3.20, agility: 4.8, longJump: 230 },
  defender: { yoyoIR1: 19.5, sprint20m: 3.05, agility: 4.5, longJump: 260 },
  center: { yoyoIR1: 21.0, sprint20m: 3.00, agility: 4.4, longJump: 265 },
  forward: { yoyoIR1: 20.0, sprint20m: 2.95, agility: 4.3, longJump: 270 },
}

export function FloorballAthleteView({ clientId, clientName: _clientName, settings }: FloorballAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const floorballSettings = settings as FloorballSettings | undefined

  if (!floorballSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Trophy className="h-5 w-5" /> Innebandy
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Ingen data tillgänglig', 'No data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Atleten har inte angett innebandyinställningar ännu.', 'The athlete has not entered floorball settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations =
    PHASE_RECOMMENDATIONS[floorballSettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season
  const positionBenchmarks = POSITION_BENCHMARKS[floorballSettings.position] || POSITION_BENCHMARKS.center

  // Calculate benchmark percentages
  const getBenchmarkPercentage = (actual: number | null, target: number, lowerIsBetter = false): number | null => {
    if (actual === null) return null
    if (lowerIsBetter) {
      return Math.round((target / actual) * 100)
    }
    return Math.round((actual / target) * 100)
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Trophy className="h-5 w-5 text-blue-500" />
                {floorballSettings.teamName || 'Innebandy'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{labelFor(POSITION_LABELS, floorballSettings.position, locale)}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, floorballSettings.leagueLevel, locale)}</Badge>
                <Badge className="bg-blue-500">{labelFor(PHASE_LABELS, floorballSettings.seasonPhase, locale)}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'års erfarenhet', 'years experience')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playing stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.avgMinutesPerMatch ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'min/match', 'min/game')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'matcher/v', 'games/wk')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'träning/v', 'training/wk')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.stickHand === 'right' ? t(locale, 'Höger', 'Right') : t(locale, 'Vänster', 'Left')}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'klubbhand', 'stick hand')}
              </div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Spelstil:', 'Play style:')}
            </span>
            <Badge
              className={
                floorballSettings.playStyle === 'offensive'
                  ? 'bg-red-500'
                  : floorballSettings.playStyle === 'defensive'
                    ? 'bg-blue-500'
                    : floorballSettings.playStyle === 'physical'
                      ? 'bg-orange-500'
                      : 'bg-green-500'
              }
            >
              {labelFor(PLAYSTYLE_LABELS, floorballSettings.playStyle, locale)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            {t(locale, 'Fysiska tester', 'Physical tests')} ({labelFor(POSITION_LABELS, floorballSettings.position, locale)})
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Jämfört med elitreferensvärden för positionen', 'Compared with elite reference values for the position')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Yo-Yo IR1 */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                Yo-Yo IR1
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
              </div>
              {floorballSettings.benchmarks.yoyoIR1Level && (
                <div
                  className={`text-xs mt-1 ${
                    floorballSettings.benchmarks.yoyoIR1Level >= positionBenchmarks.yoyoIR1
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(floorballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* 20m Sprint */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                20m sprint
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.benchmarks.sprint20m?.toFixed(2) ?? '-'} s
              </div>
              {floorballSettings.benchmarks.sprint20m && (
                <div
                  className={`text-xs mt-1 ${
                    floorballSettings.benchmarks.sprint20m <= positionBenchmarks.sprint20m
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(floorballSettings.benchmarks.sprint20m, positionBenchmarks.sprint20m, true)}%
                  {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* Agility */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                5-10-5 agility
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.benchmarks.agilityTest?.toFixed(1) ?? '-'} s
              </div>
              {floorballSettings.benchmarks.agilityTest && (
                <div
                  className={`text-xs mt-1 ${
                    floorballSettings.benchmarks.agilityTest <= positionBenchmarks.agility
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(floorballSettings.benchmarks.agilityTest, positionBenchmarks.agility, true)}%
                  {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* Standing Long Jump */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'Längdhopp', 'Standing long jump')}
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.benchmarks.standingLongJump ?? '-'} cm
              </div>
              {floorballSettings.benchmarks.standingLongJump && (
                <div
                  className={`text-xs mt-1 ${
                    floorballSettings.benchmarks.standingLongJump >= positionBenchmarks.longJump
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(
                    floorballSettings.benchmarks.standingLongJump,
                    positionBenchmarks.longJump
                  )}
                  % {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>
          </div>

          {/* Additional benchmarks */}
          {(floorballSettings.benchmarks.beepTestLevel || floorballSettings.benchmarks.sprint30m) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {floorballSettings.benchmarks.beepTestLevel && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                    Beep-test
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {floorballSettings.benchmarks.beepTestLevel.toFixed(1)}
                  </div>
                </div>
              )}
              {floorballSettings.benchmarks.sprint30m && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                    30m sprint
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {floorballSettings.benchmarks.sprint30m.toFixed(2)} s
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Recommendations for Current Phase */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4" />
            {t(locale, 'Träningsrekommendationer', 'Training recommendations')} ({labelFor(PHASE_LABELS, floorballSettings.seasonPhase, locale)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
              {t(locale, 'Fokusera på:', 'Focus on:')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {localized(locale, item)}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
              {t(locale, 'Undvik:', 'Avoid:')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.avoid.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-500/10 border-red-500">
                  {localized(locale, item)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      {(floorballSettings.strengthFocus.length > 0 || floorballSettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              {t(locale, 'Styrkor & Utvecklingsområden', 'Strengths & Development Areas')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {floorballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  {t(locale, 'Styrkor:', 'Strengths:')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {floorballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] ? localized(locale, STRENGTH_LABELS[s]) : s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {floorballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  {t(locale, 'Att utveckla:', 'To develop:')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {floorballSettings.weaknesses.map((w) => (
                    <Badge key={w} variant="outline" className="text-xs bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[w] ? localized(locale, WEAKNESS_LABELS[w]) : w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Injury History */}
      {floorballSettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle
              className="flex items-center gap-2 text-base text-yellow-600"
              style={{ color: theme.colors.textPrimary }}
            >
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {floorballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] ? localized(locale, INJURY_LABELS[injury]) : injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Inkludera förebyggande övningar (Nordic curls, ljumskestärkande, etc.) i träningsprogrammet.', 'Include preventive exercises (Nordic curls, groin strengthening, etc.) in the training program.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            {t(locale, 'Positionsspecifik träning:', 'Position-specific training:')} {labelFor(POSITION_LABELS, floorballSettings.position, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {floorballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Lateral rörlighet, benarbete, positionering', 'Lateral mobility, footwork, positioning')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Höftflexorer, core, splitpositioner', 'Hip flexors, core, split positions')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Kortare intervaller, reaktionsträning', 'Shorter intervals, reaction training')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Höft, ljumske, fotled', 'Hip, groin, ankle')}
              </li>
            </ul>
          ) : floorballSettings.position === 'defender' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Låg position, täckningsarbete, speluppbyggnad', 'Low position, blocking work, build-up play')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Benstyrka, core-stabilitet, uthållighetsstyrka', 'Leg strength, core stability, strength endurance')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Intervaller, repeated sprint ability', 'Intervals, repeated sprint ability')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Ljumske, hamstrings, knä', 'Groin, hamstrings, knee')}
              </li>
            </ul>
          ) : floorballSettings.position === 'center' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Maximal aerob kapacitet, arbetskapacitet', 'Max aerobic capacity, work capacity')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Uthållighetsstyrka, funktionell styrka', 'Strength endurance, functional strength')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Högst krav - intervallfokus, Yo-Yo', 'Highest demand - interval focus, Yo-Yo')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Ljumske, hamstrings, höft', 'Groin, hamstrings, hip')}
              </li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Acceleration, snabbhet, avslut', 'Acceleration, speed, finishing')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Explosiv underkropp, rotationskraft', 'Explosive lower body, rotational power')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Sprint-återhämtning, korta intervaller', 'Sprint recovery, short intervals')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Hamstrings, ljumske, handled', 'Hamstrings, groin, wrist')}
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Training Access Summary */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            {t(locale, 'Träningsförutsättningar', 'Training access')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {floorballSettings.hasAccessToGym && <Badge variant="outline">🏋️ Gym</Badge>}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'träningspass/v', 'training sessions/wk')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_FLOORBALL"
        title={t(locale, 'Testhistorik - Innebandy', 'Test history - Floorball')}
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_20M: '20m Sprint',
          AGILITY_5_10_5: '5-10-5 Agility',
          PRO_AGILITY_5_10_5: '5-10-5 Agility',
          STANDING_LONG_JUMP: t(locale, 'Längdhopp', 'Standing long jump'),
        }}
        benchmarks={{
          YOYO_IR1: { value: positionBenchmarks.yoyoIR1 },
          SPRINT_20M: { value: positionBenchmarks.sprint20m, lowerIsBetter: true },
          AGILITY_5_10_5: { value: positionBenchmarks.agility, lowerIsBetter: true },
          PRO_AGILITY_5_10_5: { value: positionBenchmarks.agility, lowerIsBetter: true },
          STANDING_LONG_JUMP: { value: positionBenchmarks.longJump },
        }}
      />
    </div>
  )
}

export default FloorballAthleteView
