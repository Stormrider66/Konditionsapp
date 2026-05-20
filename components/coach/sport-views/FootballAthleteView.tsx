'use client'

import { useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  MapPin,
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { FootballSettings } from '@/components/onboarding/FootballOnboarding'
import { SportTestHistory } from '@/components/tests/shared'

interface FootballAthleteViewProps {
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
  defender: { sv: 'Försvarare', en: 'Defender' },
  midfielder: { sv: 'Mittfältare', en: 'Midfielder' },
  forward: { sv: 'Anfallare', en: 'Forward' },
}

const POSITION_DETAIL_LABELS: Record<string, LocalizedText> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  center_back: { sv: 'Mittback', en: 'Center back' },
  left_back: { sv: 'Vänsterback', en: 'Left back' },
  right_back: { sv: 'Högerback', en: 'Right back' },
  wing_back: { sv: 'Wingback', en: 'Wingback' },
  sweeper: { sv: 'Libero', en: 'Sweeper' },
  defensive_mid: { sv: 'Defensiv mittfältare (6:a)', en: 'Defensive midfielder (6)' },
  central_mid: { sv: 'Central mittfältare (8:a)', en: 'Central midfielder (8)' },
  attacking_mid: { sv: 'Offensiv mittfältare (10:a)', en: 'Attacking midfielder (10)' },
  left_mid: { sv: 'Vänster mittfältare', en: 'Left midfielder' },
  right_mid: { sv: 'Höger mittfältare', en: 'Right midfielder' },
  striker: { sv: 'Nia/Striker', en: 'Striker' },
  left_winger: { sv: 'Vänsterytter', en: 'Left winger' },
  right_winger: { sv: 'Högerytter', en: 'Right winger' },
  false_nine: { sv: 'Falsk nia', en: 'False nine' },
  second_striker: { sv: 'Andraspets', en: 'Second striker' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_4: { sv: 'Division 4', en: 'Division 4' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  superettan: { sv: 'Superettan', en: 'Superettan' },
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
}

const PHASE_LABELS: Record<string, LocalizedText> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const PLAYSTYLE_LABELS: Record<string, LocalizedText> = {
  possession: { sv: 'Bollinnehav', en: 'Possession' },
  counter: { sv: 'Kontring', en: 'Counter-attacking' },
  pressing: { sv: 'Högt press', en: 'High press' },
  physical: { sv: 'Fysiskt', en: 'Physical' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  jumping: { sv: 'Hoppkraft', en: 'Jump power' },
  shooting_power: { sv: 'Skottstyrka', en: 'Shot power' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  strength_duels: { sv: 'Duellstyrka', en: 'Duel strength' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
}

const WEAKNESS_LABELS: Record<string, LocalizedText> = {
  weak_foot: { sv: 'Svaga foten', en: 'Weak foot' },
  heading: { sv: 'Nickar', en: 'Heading' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  first_touch: { sv: 'Första touch', en: 'First touch' },
  passing: { sv: 'Passningar', en: 'Passing' },
  finishing: { sv: 'Avslut', en: 'Finishing' },
  defensive_work: { sv: 'Defensivt arbete', en: 'Defensive work' },
  stamina: { sv: 'Uthållighet', en: 'Stamina' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  hamstring: { sv: 'Hamstring', en: 'Hamstring' },
  groin: { sv: 'Ljumske', en: 'Groin' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  knee_acl: { sv: 'Knä (ACL)', en: 'Knee (ACL)' },
  knee_meniscus: { sv: 'Knä (Menisk)', en: 'Knee (meniscus)' },
  quadriceps: { sv: 'Quadriceps', en: 'Quadriceps' },
  calf: { sv: 'Vad', en: 'Calf' },
  back: { sv: 'Rygg', en: 'Back' },
}

const FOOT_LABELS: Record<string, LocalizedText> = {
  right: { sv: 'Höger', en: 'Right' },
  left: { sv: 'Vänster', en: 'Left' },
  both: { sv: 'Tvåfotad', en: 'Two-footed' },
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: LocalizedText[]; avoid: LocalizedText[] }> = {
  off_season: {
    focus: [
      { sv: 'Aerob basträning', en: 'Aerobic base training' },
      { sv: 'Maxstyrka (4-6 rep)', en: 'Max strength (4-6 reps)' },
      { sv: 'Rörlighet', en: 'Mobility' },
      { sv: 'Skaderehab', en: 'Injury rehab' },
    ],
    avoid: [
      { sv: 'Hög-intensiv sprintträning', en: 'High-intensity sprint training' },
      { sv: 'Maximal match-simulering', en: 'Maximal match simulation' },
    ],
  },
  pre_season: {
    focus: [
      { sv: 'Intervaller (30-60 sek)', en: 'Intervals (30-60 sec)' },
      { sv: 'Explosiv styrka', en: 'Explosive strength' },
      { sv: 'Repeated Sprint Ability', en: 'Repeated Sprint Ability' },
      { sv: 'Yo-Yo test', en: 'Yo-Yo test' },
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
      { sv: 'Skadeförebyggande (FIFA 11+)', en: 'Injury prevention (FIFA 11+)' },
    ],
    avoid: [
      { sv: 'Hög volym off-field', en: 'High off-field volume' },
      { sv: 'Nya övningar', en: 'New exercises' },
      { sv: 'Tung styrketräning nära match', en: 'Heavy strength training close to games' },
    ],
  },
  playoffs: {
    focus: [
      { sv: 'Lätt aktivering', en: 'Light activation' },
      { sv: 'Mental förberedelse', en: 'Mental preparation' },
      { sv: 'Sömn & återhämtning', en: 'Sleep & recovery' },
      { sv: 'Aktivering MD-1', en: 'MD-1 activation' },
    ],
    avoid: [
      { sv: 'Styrketräning', en: 'Strength training' },
      { sv: 'Konditionsträning', en: 'Conditioning training' },
      { sv: 'Allt som kan orsaka trötthet', en: 'Anything that can create fatigue' },
    ],
  },
}

// Position-specific physical benchmarks (elite level references)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint10m: number; sprint30m: number; cmj: number }> = {
  goalkeeper: { yoyoIR1: 17.0, sprint10m: 1.75, sprint30m: 4.30, cmj: 42 },
  defender: { yoyoIR1: 19.0, sprint10m: 1.72, sprint30m: 4.20, cmj: 45 },
  midfielder: { yoyoIR1: 20.5, sprint10m: 1.70, sprint30m: 4.15, cmj: 43 },
  forward: { yoyoIR1: 19.5, sprint10m: 1.68, sprint30m: 4.10, cmj: 48 },
}

export function FootballAthleteView({ clientId, clientName: _clientName, settings }: FootballAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const footballSettings = settings as FootballSettings | undefined

  if (!footballSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Trophy className="h-5 w-5" /> Fotboll
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{t(locale, 'Ingen data tillgänglig', 'No data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Atleten har inte angett fotbollsinställningar ännu.', 'The athlete has not entered football settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations = PHASE_RECOMMENDATIONS[footballSettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season
  const positionBenchmarks = POSITION_BENCHMARKS[footballSettings.position] || POSITION_BENCHMARKS.midfielder

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
                <Trophy className="h-5 w-5 text-green-500" />
                {footballSettings.teamName || 'Fotboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">
                  {footballSettings.positionDetail
                    ? labelFor(POSITION_DETAIL_LABELS, footballSettings.positionDetail, locale)
                    : labelFor(POSITION_LABELS, footballSettings.position, locale)}
                </Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, footballSettings.leagueLevel, locale)}</Badge>
                <Badge className="bg-green-500">{labelFor(PHASE_LABELS, footballSettings.seasonPhase, locale)}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'års erfarenhet', 'years experience')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playing stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.avgMinutesPerMatch ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'min/match', 'min/game')}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'matcher/v', 'games/wk')}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'träning/v', 'training/wk')}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {labelFor(FOOT_LABELS, footballSettings.preferredFootwork, locale)}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'favoritfot', 'preferred foot')}</div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>{t(locale, 'Spelstil:', 'Play style:')}</span>
            <Badge className={
              footballSettings.playStyle === 'possession' ? 'bg-blue-500' :
              footballSettings.playStyle === 'counter' ? 'bg-yellow-500' :
              footballSettings.playStyle === 'pressing' ? 'bg-red-500' :
              'bg-orange-500'
            }>
              {labelFor(PLAYSTYLE_LABELS, footballSettings.playStyle, locale)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* GPS Data Card */}
      {footballSettings.hasGPSData && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <MapPin className="h-4 w-4 text-purple-500" />
              GPS-data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                  {footballSettings.avgMatchDistanceKm?.toFixed(1) ?? '-'}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>km/match</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                  {footballSettings.avgSprintDistanceM ?? '-'}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>m sprint/match</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                  {footballSettings.gpsProvider}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'leverantör', 'provider')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Physical Benchmarks Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            {t(locale, 'Fysiska tester', 'Physical tests')} ({labelFor(POSITION_LABELS, footballSettings.position, locale)})
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t(locale, 'Jämfört med elitreferensvärden för positionen', 'Compared with elite reference values for the position')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Yo-Yo IR1 */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>Yo-Yo IR1</div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
              </div>
              {footballSettings.benchmarks.yoyoIR1Level && (
                <div className={`text-xs mt-1 ${
                  footballSettings.benchmarks.yoyoIR1Level >= positionBenchmarks.yoyoIR1 ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {getBenchmarkPercentage(footballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* 10m Sprint */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>10m sprint</div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.benchmarks.sprint10m?.toFixed(2) ?? '-'} s
              </div>
              {footballSettings.benchmarks.sprint10m && (
                <div className={`text-xs mt-1 ${
                  footballSettings.benchmarks.sprint10m <= positionBenchmarks.sprint10m ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {getBenchmarkPercentage(footballSettings.benchmarks.sprint10m, positionBenchmarks.sprint10m, true)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* 30m Sprint */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>30m sprint</div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.benchmarks.sprint30m?.toFixed(2) ?? '-'} s
              </div>
              {footballSettings.benchmarks.sprint30m && (
                <div className={`text-xs mt-1 ${
                  footballSettings.benchmarks.sprint30m <= positionBenchmarks.sprint30m ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {getBenchmarkPercentage(footballSettings.benchmarks.sprint30m, positionBenchmarks.sprint30m, true)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>

            {/* CMJ */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>{t(locale, 'CMJ hopp', 'CMJ jump')}</div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.benchmarks.cmjHeight ?? '-'} cm
              </div>
              {footballSettings.benchmarks.cmjHeight && (
                <div className={`text-xs mt-1 ${
                  footballSettings.benchmarks.cmjHeight >= positionBenchmarks.cmj ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {getBenchmarkPercentage(footballSettings.benchmarks.cmjHeight, positionBenchmarks.cmj)}% {t(locale, 'av elit', 'of elite')}
                </div>
              )}
            </div>
          </div>

          {/* Additional benchmarks */}
          {(footballSettings.benchmarks.yoyoIR2Level || footballSettings.benchmarks.agilityTest) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {footballSettings.benchmarks.yoyoIR2Level && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>Yo-Yo IR2</div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {footballSettings.benchmarks.yoyoIR2Level.toFixed(1)}
                  </div>
                </div>
              )}
              {footballSettings.benchmarks.agilityTest && (
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>Agility test</div>
                  <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                    {footballSettings.benchmarks.agilityTest.toFixed(2)} s
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
            {t(locale, 'Träningsrekommendationer', 'Training recommendations')} ({labelFor(PHASE_LABELS, footballSettings.seasonPhase, locale)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Fokusera på:', 'Focus on:')}</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {localized(locale, item)}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Undvik:', 'Avoid:')}</h4>
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
      {(footballSettings.strengthFocus.length > 0 || footballSettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              {t(locale, 'Styrkor & Utvecklingsområden', 'Strengths & Development Areas')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {footballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Styrkor:', 'Strengths:')}</h4>
                <div className="flex flex-wrap gap-1">
                  {footballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] ? localized(locale, STRENGTH_LABELS[s]) : s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {footballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{t(locale, 'Att utveckla:', 'To develop:')}</h4>
                <div className="flex flex-wrap gap-1">
                  {footballSettings.weaknesses.map((w) => (
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
      {footballSettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {footballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] ? localized(locale, INJURY_LABELS[injury]) : injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              {t(locale, 'Inkludera FIFA 11+ och positionsspecifika förebyggande övningar i träningsprogrammet.', 'Include FIFA 11+ and position-specific preventive exercises in the training program.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            {t(locale, 'Positionsspecifik träning:', 'Position-specific training:')} {
              footballSettings.positionDetail
                ? labelFor(POSITION_DETAIL_LABELS, footballSettings.positionDetail, locale)
                : labelFor(POSITION_LABELS, footballSettings.position, locale)
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {footballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Reaktion, lateral rörlighet, positionering', 'Reaction, lateral mobility, positioning')}</li>
              <li>• <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Explosiv kraft i ben, core, axelstabilitet', 'Explosive leg power, core, shoulder stability')}</li>
              <li>• <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Korta explosiva intervaller, recovery', 'Short explosive intervals, recovery')}</li>
              <li>• <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Axlar, handleder, knän', 'Shoulders, wrists, knees')}</li>
            </ul>
          ) : footballSettings.position === 'defender' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Duellstyrka, hoppkraft för nickar, positionering', 'Duel strength, jumping power for headers, positioning')}</li>
              <li>• <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Överkropp för dueller, höft/gluteal, Nordic curls', 'Upper body for duels, hip/gluteal, Nordic curls')}</li>
              <li>• <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Aerob bas + repeated sprint ability', 'Aerobic base + repeated sprint ability')}</li>
              <li>• <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Hamstring, ljumske, fotled', 'Hamstring, groin, ankle')}</li>
            </ul>
          ) : footballSettings.position === 'midfielder' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Maximal aerob kapacitet (Yo-Yo), box-to-box', 'Max aerobic capacity (Yo-Yo), box-to-box')}</li>
              <li>• <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Uthållighetsstyrka, core för balans i dueller', 'Strength endurance, core for balance in duels')}</li>
              <li>• <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Högst krav - 10-13km/match, intervaller', 'Highest demand - 10-13 km/game, intervals')}</li>
              <li>• <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Ljumske, knä, överbelastning', 'Groin, knee, overload')}</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{t(locale, 'Prioritet:', 'Priority:')}</strong> {t(locale, 'Maximal sprint, acceleration 0-10m', 'Max sprint, 0-10 m acceleration')}</li>
              <li>• <strong>{t(locale, 'Styrka:', 'Strength:')}</strong> {t(locale, 'Explosiv power, skottstyrka (rotation)', 'Explosive power, shot power (rotation)')}</li>
              <li>• <strong>{t(locale, 'Kondition:', 'Conditioning:')}</strong> {t(locale, 'Anaerob kapacitet, sprint recovery', 'Anaerobic capacity, sprint recovery')}</li>
              <li>• <strong>{t(locale, 'Förebyggande:', 'Prevention:')}</strong> {t(locale, 'Hamstring (kritiskt!), quadriceps', 'Hamstring (critical), quadriceps')}</li>
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
              {footballSettings.hasAccessToGym && (
                <Badge variant="outline">🏋️ Gym</Badge>
              )}
              {footballSettings.hasGPSData && (
                <Badge variant="outline">📍 GPS</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t(locale, 'träningspass/v', 'training sessions/wk')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_FOOTBALL"
        title={t(locale, 'Testhistorik - Fotboll', 'Test history - Football')}
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_10M: '10m Sprint',
          SPRINT_30M: '30m Sprint',
          VERTICAL_JUMP_CMJ: 'CMJ',
        }}
        benchmarks={{
          YOYO_IR1: { value: positionBenchmarks.yoyoIR1 },
          SPRINT_10M: { value: positionBenchmarks.sprint10m, lowerIsBetter: true },
          SPRINT_30M: { value: positionBenchmarks.sprint30m, lowerIsBetter: true },
          VERTICAL_JUMP_CMJ: { value: positionBenchmarks.cmj },
        }}
      />
    </div>
  )
}

export default FootballAthleteView
