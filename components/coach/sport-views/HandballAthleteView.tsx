'use client'

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
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { HandballSettings } from '@/components/onboarding/HandballOnboarding'

interface HandballAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  wing: 'Ytter',
  back: 'Vänster-/Högernia',
  center_back: 'Mittnia/Playmaker',
  pivot: 'Lansen/Pivot',
}

const SIDE_LABELS: Record<string, string> = {
  left: 'Vänster',
  right: 'Höger',
  both: 'Båda sidor',
  center: '',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Korpen/Motion',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  allsvenskan: 'Allsvenskan',
  handbollsligan: 'Handbollsligan',
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
  all_round: 'Allround',
  specialist: 'Specialist',
}

const STRENGTH_LABELS: Record<string, string> = {
  throwing_power: 'Skottstyrka',
  sprint_speed: 'Sprintsnabbhet',
  jumping: 'Hoppkraft',
  agility: 'Kvickhet',
  endurance: 'Uthållighet',
  upper_body: 'Överkroppsstyrka',
  core_stability: 'Core-stabilitet',
  contact_strength: 'Kontaktstyrka',
}

const WEAKNESS_LABELS: Record<string, string> = {
  weak_arm: 'Svaga armen',
  finishing: 'Avslut',
  defense: 'Försvarsspel',
  positioning: 'Positionering',
  ball_handling: 'Bollhantering',
  passing: 'Passningar',
  stamina: 'Uthållighet',
  decision_making: 'Beslutsfattande',
}

const INJURY_LABELS: Record<string, string> = {
  shoulder: 'Axel',
  knee: 'Knä',
  knee_acl: 'Knä (ACL)',
  ankle: 'Fotled',
  groin: 'Ljumske',
  back: 'Rygg',
  finger: 'Fingrar',
  elbow: 'Armbåge',
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: string[]; avoid: string[] }> = {
  off_season: {
    focus: ['Aerob basträning', 'Maxstyrka (4-6 rep)', 'Rörlighet', 'Skaderehabilitering'],
    avoid: ['Hög-intensiva intervaller', 'Maximal matchsimulering'],
  },
  pre_season: {
    focus: ['Explosiv styrka', 'Repeated sprint ability', 'Plyometrics', 'Matchsimulering'],
    avoid: ['Långdistans steady-state', 'Hög volym styrketräning'],
  },
  in_season: {
    focus: ['Underhållsstyrka (2x/v)', 'Aktiv återhämtning', 'Mobilitet', 'Skadeförebyggande'],
    avoid: ['Hög volym off-court', 'Nya övningar', 'Tung styrka nära match'],
  },
  playoffs: {
    focus: ['Lätt aktivering', 'Mental förberedelse', 'Sömn & återhämtning', 'Lagsammanhållning'],
    avoid: ['Styrketräning', 'Konditionsträning', 'Allt som kan orsaka trötthet'],
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

export function HandballAthleteView({ clientId, clientName, settings }: HandballAthleteViewProps) {
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
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett handbollsinställningar ännu.
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
    const baseName = POSITION_LABELS[handballSettings.position]
    if (handballSettings.positionSide && handballSettings.positionSide !== 'center') {
      return `${SIDE_LABELS[handballSettings.positionSide]} ${baseName.toLowerCase()}`
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
                <Trophy className="h-5 w-5 text-orange-500" />
                {handballSettings.teamName || 'Handboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{getPositionDisplay()}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[handballSettings.leagueLevel]}</Badge>
                <Badge className="bg-orange-500">{PHASE_LABELS[handballSettings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.yearsPlaying}
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
                {handballSettings.avgMinutesPerMatch ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                min/match
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                matcher/v
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                träning/v
              </div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.throwingArm === 'right' ? 'Höger' : 'Vänster'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                kastararm
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
                handballSettings.playStyle === 'offensive'
                  ? 'bg-red-500'
                  : handballSettings.playStyle === 'defensive'
                    ? 'bg-blue-500'
                    : handballSettings.playStyle === 'specialist'
                      ? 'bg-purple-500'
                      : 'bg-green-500'
              }
            >
              {PLAYSTYLE_LABELS[handballSettings.playStyle]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            Fysiska tester ({POSITION_LABELS[handballSettings.position]})
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
                {handballSettings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
              </div>
              {handballSettings.benchmarks.yoyoIR1Level && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.yoyoIR1Level >= positionBenchmarks.yoyoIR1
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% av
                  elit
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
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.sprint10m, positionBenchmarks.sprint10m, true)}%
                  av elit
                </div>
              )}
            </div>

            {/* CMJ */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                CMJ hopp
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.benchmarks.cmjHeight ?? '-'} cm
              </div>
              {handballSettings.benchmarks.cmjHeight && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.cmjHeight >= positionBenchmarks.cmj
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(handballSettings.benchmarks.cmjHeight, positionBenchmarks.cmj)}% av elit
                </div>
              )}
            </div>

            {/* Medicine Ball */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>
                Medicinboll
              </div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
              </div>
              {handballSettings.benchmarks.medicineBallThrow && (
                <div
                  className={`text-xs mt-1 ${
                    handballSettings.benchmarks.medicineBallThrow >= positionBenchmarks.medicineBall
                      ? 'text-green-500'
                      : 'text-orange-500'
                  }`}
                >
                  {getBenchmarkPercentage(
                    handballSettings.benchmarks.medicineBallThrow,
                    positionBenchmarks.medicineBall
                  )}
                  % av elit
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
            Träningsrekommendationer ({PHASE_LABELS[handballSettings.seasonPhase]})
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
      {(handballSettings.strengthFocus.length > 0 || handballSettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              Styrkor & Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {handballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  Styrkor:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {handballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {handballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>
                  Att utveckla:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {handballSettings.weaknesses.map((w) => (
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
      {handballSettings.injuryHistory.length > 0 && (
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
              {handballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              Inkludera förebyggande övningar (axelstabilisering, Nordic curls, etc.) i träningsprogrammet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            Positionsspecifik träning: {POSITION_LABELS[handballSettings.position]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {handballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Reaktionsträning, lateral rörlighet, explosivitet
              </li>
              <li>
                - <strong>Styrka:</strong> Höftflexorer, core, axelstabilitet
              </li>
              <li>
                - <strong>Kondition:</strong> Korta explosiva intervaller, snabb återhämtning
              </li>
              <li>
                - <strong>Förebyggande:</strong> Höft, axlar, fingrar
              </li>
            </ul>
          ) : handballSettings.position === 'wing' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Maximal sprintsnabbhet, kvickhet, hoppkraft
              </li>
              <li>
                - <strong>Styrka:</strong> Explosiv underkropp, landningsstabilitet
              </li>
              <li>
                - <strong>Kondition:</strong> Repeated sprint ability, hög aerob kapacitet
              </li>
              <li>
                - <strong>Förebyggande:</strong> ACL-program, fotled, hamstrings
              </li>
            </ul>
          ) : handballSettings.position === 'back' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Skottstyrka, hoppkraft för hopp-skott
              </li>
              <li>
                - <strong>Styrka:</strong> Rotationskraft, överkropp, core
              </li>
              <li>
                - <strong>Kondition:</strong> Intervaller med hopp och kast
              </li>
              <li>
                - <strong>Förebyggande:</strong> Axel (rotatorkuff), knä, armbåge
              </li>
            </ul>
          ) : handballSettings.position === 'center_back' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Aerob kapacitet, snabba fötter, spelsinne
              </li>
              <li>
                - <strong>Styrka:</strong> Uthållighetsstyrka, core för balans
              </li>
              <li>
                - <strong>Kondition:</strong> Högst krav på uthållighet - Yo-Yo fokus
              </li>
              <li>
                - <strong>Förebyggande:</strong> Knä, ljumske, fotled
              </li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>
                - <strong>Prioritet:</strong> Kontaktstyrka, balans i trängsel
              </li>
              <li>
                - <strong>Styrka:</strong> Kroppsstyrka, core-stabilitet, push/pull
              </li>
              <li>
                - <strong>Kondition:</strong> Korta explosiva aktioner med vila
              </li>
              <li>
                - <strong>Förebyggande:</strong> Axlar, rygg, fingrar
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
              {handballSettings.hasAccessToGym && <Badge variant="outline">🏋️ Gym</Badge>}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {handballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                träningspass/v
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HandballAthleteView
