'use client'

import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { SportTestHistory } from '@/components/tests/shared'
import { Badge } from '@/components/ui/badge'
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
import type { HandballSettings } from '@/components/onboarding/HandballOnboarding'

interface HandballAthleteViewProps {
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
  wing: { sv: 'Ytter', en: 'Wing' },
  back: { sv: 'Vänster-/Högernia', en: 'Left/right back' },
  center_back: { sv: 'Mittnia/Playmaker', en: 'Center back/playmaker' },
  pivot: { sv: 'Lansen/Pivot', en: 'Pivot' },
}

const SIDE_LABELS: Record<string, LocalizedText> = {
  left: { sv: 'Vänster', en: 'Left' },
  right: { sv: 'Höger', en: 'Right' },
  both: { sv: 'Båda sidor', en: 'Both sides' },
  center: { sv: '', en: '' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
  handbollsligan: { sv: 'Handbollsligan', en: 'Handbollsligan' },
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
  all_round: { sv: 'Allround', en: 'All-round' },
  specialist: { sv: 'Specialist', en: 'Specialist' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  throwing_power: { sv: 'Skottstyrka', en: 'Throwing power' },
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  jumping: { sv: 'Hoppkraft', en: 'Jump power' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  upper_body: { sv: 'Överkroppsstyrka', en: 'Upper-body strength' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  contact_strength: { sv: 'Kontaktstyrka', en: 'Contact strength' },
}

const WEAKNESS_LABELS: Record<string, LocalizedText> = {
  weak_arm: { sv: 'Svaga armen', en: 'Weak arm' },
  finishing: { sv: 'Avslut', en: 'Finishing' },
  defense: { sv: 'Försvarsspel', en: 'Defense' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  ball_handling: { sv: 'Bollhantering', en: 'Ball handling' },
  passing: { sv: 'Passningar', en: 'Passing' },
  stamina: { sv: 'Uthållighet', en: 'Stamina' },
  decision_making: { sv: 'Beslutsfattande', en: 'Decision-making' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  shoulder: { sv: 'Axel', en: 'Shoulder' },
  knee: { sv: 'Knä', en: 'Knee' },
  knee_acl: { sv: 'Knä (ACL)', en: 'Knee (ACL)' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  groin: { sv: 'Ljumske', en: 'Groin' },
  back: { sv: 'Rygg', en: 'Back' },
  finger: { sv: 'Fingrar', en: 'Fingers' },
  elbow: { sv: 'Armbåge', en: 'Elbow' },
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
      { sv: 'Repeated sprint ability', en: 'Repeated sprint ability' },
      { sv: 'Plyometrics', en: 'Plyometrics' },
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
      { sv: 'Mental förberedelse', en: 'Mental preparation' },
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
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint10m: number; cmj: number; medicineBall: number }> = {
  goalkeeper: { yoyoIR1: 17.5, sprint10m: 1.75, cmj: 45, medicineBall: 12.0 },
  wing: { yoyoIR1: 20.5, sprint10m: 1.65, cmj: 50, medicineBall: 11.5 },
  back: { yoyoIR1: 19.5, sprint10m: 1.68, cmj: 52, medicineBall: 14.0 },
  center_back: { yoyoIR1: 20.0, sprint10m: 1.70, cmj: 48, medicineBall: 12.5 },
  pivot: { yoyoIR1: 18.5, sprint10m: 1.72, cmj: 46, medicineBall: 13.5 },
}

export function HandballAthleteView({ clientId, clientName: _clientName, settings }: HandballAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const handballSettings = settings as HandballSettings | undefined

  if (!handballSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Trophy className="h-5 w-5" /> Handboll
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Ingen data tillgänglig', 'No data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Atleten har inte angett handbollsinställningar ännu.', 'The athlete has not entered handball settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations =
    PHASE_RECOMMENDATIONS[handballSettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season
  const positionBenchmarks = POSITION_BENCHMARKS[handballSettings.position] || POSITION_BENCHMARKS.back

  // Get position display with side
  const getPositionDisplay = () => {
    const baseName = labelFor(POSITION_LABELS, handballSettings.position, locale)
    if (handballSettings.positionSide && handballSettings.positionSide !== 'center') {
      return `${labelFor(SIDE_LABELS, handballSettings.positionSide, locale)} ${baseName.toLowerCase()}`
    }
    return baseName
  }

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
                {handballSettings.teamName || 'Handboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{getPositionDisplay()}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, handballSettings.leagueLevel, locale)}</Badge>
                <Badge className="bg-blue-500">{labelFor(PHASE_LABELS, handballSettings.seasonPhase, locale)}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.yearsPlaying}
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
              <Timer className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.avgMinutesPerMatch ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'min/match', 'min/game')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'matcher/v', 'games/wk')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'träning/v', 'training/wk')}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.throwingArm === 'right' ? t(locale, 'Höger', 'Right') : t(locale, 'Vänster', 'Left')}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'kastararm', 'throwing arm')}
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
                handballSettings.playStyle === 'offensive'
                  ? 'bg-red-500'
                  : handballSettings.playStyle === 'defensive'
                    ? 'bg-blue-500'
                    : handballSettings.playStyle === 'specialist'
                      ? 'bg-purple-500'
                      : 'bg-emerald-500'
              }
            >
              {labelFor(PLAYSTYLE_LABELS, handballSettings.playStyle, locale)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4" />
            {t(locale, 'Fysiska tester', 'Physical tests')} ({labelFor(POSITION_LABELS, handballSettings.position, locale)})
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
                {handballSettings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
              </div>
              {handballSettings.benchmarks.yoyoIR1Level && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.yoyoIR1Level >= positionBenchmarks.yoyoIR1
                      ? 'text-emerald-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* 10m Sprint */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                10m sprint
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.benchmarks.sprint10m?.toFixed(2) ?? '-'} s
              </div>
              {handballSettings.benchmarks.sprint10m && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.sprint10m <= positionBenchmarks.sprint10m
                      ? 'text-emerald-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.sprint10m, positionBenchmarks.sprint10m, true)}%
                  {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* CMJ */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'CMJ hopp', 'CMJ jump')}
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.benchmarks.cmjHeight ?? '-'} cm
              </div>
              {handballSettings.benchmarks.cmjHeight && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.cmjHeight >= positionBenchmarks.cmj
                      ? 'text-emerald-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.cmjHeight, positionBenchmarks.cmj)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* Medicine Ball */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                {t(locale, 'Medicinboll', 'Medicine ball')}
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
              </div>
              {handballSettings.benchmarks.medicineBallThrow && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.medicineBallThrow >= positionBenchmarks.medicineBall
                      ? 'text-emerald-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(
                    handballSettings.benchmarks.medicineBallThrow,
                    positionBenchmarks.medicineBall
                  )}
                  % {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>
          </div>

          {/* Additional benchmarks */}
          {(handballSettings.benchmarks.sprint20m || handballSettings.benchmarks.tTestAgility) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {handballSettings.benchmarks.sprint20m && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                    20m sprint
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {handballSettings.benchmarks.sprint20m.toFixed(2)} s
                  </div>
                </div>
              )}
              {handballSettings.benchmarks.tTestAgility && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                    T-test agility
                  </div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {handballSettings.benchmarks.tTestAgility.toFixed(1)} s
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
            {t(locale, 'Träningsrekommendationer', 'Training recommendations')} ({labelFor(PHASE_LABELS, handballSettings.seasonPhase, locale)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
              {t(locale, 'Fokusera på:', 'Focus on:')}
            </h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500">
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
      {(handballSettings.strengthFocus.length > 0 || handballSettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              {t(locale, 'Styrkor & Utvecklingsområden', 'Strengths & Development Areas')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {handballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  {t(locale, 'Styrkor:', 'Strengths:')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {handballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] ? localized(locale, STRENGTH_LABELS[s]) : s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {handballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  {t(locale, 'Att utveckla:', 'To develop:')}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {handballSettings.weaknesses.map((w) => (
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
      {handballSettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle
              className="flex items-center gap-2 text-base text-amber-600"
              style={{ color: theme.colors.textPrimary }}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {handballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-amber-500/10 border-amber-500">
                  {INJURY_LABELS[injury] ? localized(locale, INJURY_LABELS[injury]) : injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Inkludera förebyggande övningar (axelstabilisering, Nordic curls, etc.) i träningsprogrammet.', 'Include preventive exercises (shoulder stabilization, Nordic curls, etc.) in the training program.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            {t(locale, 'Positionsspecifik träning:', 'Position-specific training:')} {labelFor(POSITION_LABELS, handballSettings.position, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {handballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Reaktionsträning, lateral rörlighet, explosivitet', 'Reaction training, lateral mobility, explosiveness')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Höftflexorer, core, axelstabilitet', 'Hip flexors, core, shoulder stability')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Korta explosiva intervaller, snabb återhämtning', 'Short explosive intervals, fast recovery')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Höft, axlar, fingrar', 'Hip, shoulders, fingers')}
              </li>
            </ul>
          ) : handballSettings.position === 'wing' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Maximal sprintsnabbhet, kvickhet, hoppkraft', 'Max sprint speed, agility, jump power')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Explosiv underkropp, landningsstabilitet', 'Explosive lower body, landing stability')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Repeated sprint ability, hög aerob kapacitet', 'Repeated sprint ability, high aerobic capacity')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'ACL-program, fotled, hamstrings', 'ACL program, ankle, hamstrings')}
              </li>
            </ul>
          ) : handballSettings.position === 'back' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Skottstyrka, hoppkraft för hopp-skott', 'Throwing power, jump power for jump shots')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Rotationskraft, överkropp, core', 'Rotational power, upper body, core')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Intervaller med hopp och kast', 'Intervals with jumps and throws')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Axel (rotatorkuff), knä, armbåge', 'Shoulder (rotator cuff), knee, elbow')}
              </li>
            </ul>
          ) : handballSettings.position === 'center_back' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Aerob kapacitet, snabba fötter, spelsinne', 'Aerobic capacity, fast feet, game sense')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Uthållighetsstyrka, core för balans', 'Strength endurance, core for balance')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Högst krav på uthållighet - Yo-Yo fokus', 'Highest endurance demand - Yo-Yo focus')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Knä, ljumske, fotled', 'Knee, groin, ankle')}
              </li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Kontaktstyrka, balans i trängsel', 'Contact strength, balance in traffic')}
              </li>
              <li>
                - <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Kroppsstyrka, core-stabilitet, push/pull', 'Body strength, core stability, push/pull')}
              </li>
              <li>
                - <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Korta explosiva aktioner med vila', 'Short explosive actions with rest')}
              </li>
              <li>
                - <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Axlar, rygg, fingrar', 'Shoulders, back, fingers')}
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
              {handballSettings.hasAccessToGym && <Badge variant="outline">🏋️ Gym</Badge>}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.weeklyTrainingSessions}
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
        sport="TEAM_HANDBALL"
        title={t(locale, 'Testhistorik - Handboll', 'Test history - Handball')}
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_10M: '10m Sprint',
          VERTICAL_JUMP_CMJ: 'CMJ',
          MEDICINE_BALL_THROW: t(locale, 'Medicinboll', 'Medicine ball'),
        }}
        benchmarks={{
          YOYO_IR1: { value: positionBenchmarks.yoyoIR1 },
          SPRINT_10M: { value: positionBenchmarks.sprint10m, lowerIsBetter: true },
          VERTICAL_JUMP_CMJ: { value: positionBenchmarks.cmj },
          MEDICINE_BALL_THROW: { value: positionBenchmarks.medicineBall },
        }}
      />
    </div>
  )
}

export default HandballAthleteView
