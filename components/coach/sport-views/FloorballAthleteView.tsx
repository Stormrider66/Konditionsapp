'use client'

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

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  defender: 'Back',
  center: 'Center',
  forward: 'Forward',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Korpen/Motion',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  allsvenskan: 'Allsvenskan',
  ssl: 'Svenska Superligan',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  offensive: 'Offensiv',
  defensive: 'Defensiv',
  playmaker: 'Spelmotor',
  physical: 'Fysisk',
}

const STRENGTH_LABELS: Record<string, string> = {
  sprint_speed: 'Sprintsnabbhet',
  acceleration: 'Acceleration',
  endurance: 'Uthållighet',
  agility: 'Kvickhet',
  shooting_power: 'Skottstyrka',
  core_stability: 'Core-stabilitet',
  leg_strength: 'Benstyrka',
  low_position: 'Låg position',
}

const WEAKNESS_LABELS: Record<string, string> = {
  weak_hand: 'Svaga handen',
  finishing: 'Avslut',
  defense: 'Försvarsspel',
  positioning: 'Positionering',
  stick_handling: 'Teknik',
  passing: 'Passningar',
  stamina: 'Uthållighet',
  game_reading: 'Spelläsning',
}

const INJURY_LABELS: Record<string, string> = {
  groin: 'Ljumske',
  hamstring: 'Hamstring',
  knee: 'Knä',
  ankle: 'Fotled',
  hip: 'Höft',
  back: 'Rygg',
  wrist: 'Handled',
  shoulder: 'Axel',
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: string[]; avoid: string[] }> = {
  off_season: {
    focus: ['Aerob basträning', 'Maxstyrka (4-6 rep)', 'Rörlighet', 'Skaderehabilitering'],
    avoid: ['Hög-intensiva intervaller', 'Maximal matchsimulering'],
  },
  pre_season: {
    focus: ['Explosiv styrka', 'Intervallträning', 'Snabbhet & agility', 'Matchsimulering'],
    avoid: ['Långdistans steady-state', 'Hög volym styrketräning'],
  },
  in_season: {
    focus: ['Underhållsstyrka (2x/v)', 'Aktiv återhämtning', 'Mobilitet', 'Skadeförebyggande'],
    avoid: ['Hög volym off-court', 'Nya övningar', 'Tung styrka nära match'],
  },
  playoffs: {
    focus: ['Lätt aktivering', 'Mental skärpa', 'Sömn & återhämtning', 'Lagsammanhållning'],
    avoid: ['Styrketräning', 'Konditionsträning', 'Allt som kan orsaka trötthet'],
  },
}

// Position-specific physical benchmarks (elite level references)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint20m: number; agility: number; longJump: number }> = {
  goalkeeper: { yoyoIR1: 17.0, sprint20m: 3.20, agility: 4.8, longJump: 230 },
  defender: { yoyoIR1: 19.5, sprint20m: 3.05, agility: 4.5, longJump: 260 },
  center: { yoyoIR1: 21.0, sprint20m: 3.00, agility: 4.4, longJump: 265 },
  forward: { yoyoIR1: 20.0, sprint20m: 2.95, agility: 4.3, longJump: 270 },
}

export function FloorballAthleteView({ clientId, clientName, settings }: FloorballAthleteViewProps) {
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
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett innebandyinställningar ännu.
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
                <Badge variant="outline">{POSITION_LABELS[floorballSettings.position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[floorballSettings.leagueLevel]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[floorballSettings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                års erfarenhet
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
                min/match
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                matcher/v
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                träning/v
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {floorballSettings.stickHand === 'right' ? 'Höger' : 'Vänster'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                klubbhand
              </div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>
              Spelstil:
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
              {PLAYSTYLE_LABELS[floorballSettings.playStyle]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            Fysiska tester ({POSITION_LABELS[floorballSettings.position]})
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Jämfört med elitreferensvärden för positionen
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
                  {getBenchmarkPercentage(floorballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% av
                  elit
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
                  av elit
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
                  av elit
                </div>
              )}
            </div>

            {/* Standing Long Jump */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                Längdhopp
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
                  % av elit
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
            Träningsrekommendationer ({PHASE_LABELS[floorballSettings.seasonPhase]})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
              Fokusera på:
            </h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
              Undvik:
            </h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.avoid.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-500/10 border-red-500">
                  {item}
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
              Styrkor & Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {floorballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  Styrkor:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {floorballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {floorballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  Att utveckla:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {floorballSettings.weaknesses.map((w) => (
                    <Badge key={w} variant="outline" className="text-xs bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[w] || w}
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
              Skadehistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {floorballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              Inkludera förebyggande övningar (Nordic curls, ljumskestärkande, etc.) i träningsprogrammet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            Positionsspecifik träning: {POSITION_LABELS[floorballSettings.position]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {floorballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Lateral rörlighet, benarbete, positionering
              </li>
              <li>
                - <strong>Styrka:</strong> Höftflexorer, core, splitpositioner
              </li>
              <li>
                - <strong>Kondition:</strong> Kortare intervaller, reaktionsträning
              </li>
              <li>
                - <strong>Förebyggande:</strong> Höft, ljumske, fotled
              </li>
            </ul>
          ) : floorballSettings.position === 'defender' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Låg position, täckningsarbete, speluppbyggnad
              </li>
              <li>
                - <strong>Styrka:</strong> Benstyrka, core-stabilitet, uthållighetsstyrka
              </li>
              <li>
                - <strong>Kondition:</strong> Intervaller, repeated sprint ability
              </li>
              <li>
                - <strong>Förebyggande:</strong> Ljumske, hamstrings, knä
              </li>
            </ul>
          ) : floorballSettings.position === 'center' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Maximal aerob kapacitet, arbetskapacitet
              </li>
              <li>
                - <strong>Styrka:</strong> Uthållighetsstyrka, funktionell styrka
              </li>
              <li>
                - <strong>Kondition:</strong> Högst krav - intervallfokus, Yo-Yo
              </li>
              <li>
                - <strong>Förebyggande:</strong> Ljumske, hamstrings, höft
              </li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Acceleration, snabbhet, avslut
              </li>
              <li>
                - <strong>Styrka:</strong> Explosiv underkropp, rotationskraft
              </li>
              <li>
                - <strong>Kondition:</strong> Sprint-återhämtning, korta intervaller
              </li>
              <li>
                - <strong>Förebyggande:</strong> Hamstrings, ljumske, handled
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
            Träningsförutsättningar
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
                träningspass/v
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_FLOORBALL"
        title="Testhistorik - Innebandy"
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_20M: '20m Sprint',
          AGILITY_5_10_5: '5-10-5 Agility',
          PRO_AGILITY_5_10_5: '5-10-5 Agility',
          STANDING_LONG_JUMP: 'Längdhopp',
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
