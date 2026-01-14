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

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  defender: 'Försvarare',
  midfielder: 'Mittfältare',
  forward: 'Anfallare',
}

const POSITION_DETAIL_LABELS: Record<string, string> = {
  goalkeeper: 'Målvakt',
  center_back: 'Mittback',
  left_back: 'Vänsterback',
  right_back: 'Högerback',
  wing_back: 'Wingback',
  sweeper: 'Libero',
  defensive_mid: 'Defensiv mittfältare (6:a)',
  central_mid: 'Central mittfältare (8:a)',
  attacking_mid: 'Offensiv mittfältare (10:a)',
  left_mid: 'Vänster mittfältare',
  right_mid: 'Höger mittfältare',
  striker: 'Nia/Striker',
  left_winger: 'Vänsterytter',
  right_winger: 'Högerytter',
  false_nine: 'Falsk nia',
  second_striker: 'Andraspets',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Korpen/Motion',
  division_4: 'Division 4',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  superettan: 'Superettan',
  allsvenskan: 'Allsvenskan',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  possession: 'Bollinnehav',
  counter: 'Kontring',
  pressing: 'Högt press',
  physical: 'Fysiskt',
}

const STRENGTH_LABELS: Record<string, string> = {
  sprint_speed: 'Sprintsnabbhet',
  acceleration: 'Acceleration',
  endurance: 'Uthållighet',
  jumping: 'Hoppkraft',
  shooting_power: 'Skottstyrka',
  agility: 'Kvickhet',
  strength_duels: 'Duellstyrka',
  core_stability: 'Core-stabilitet',
}

const WEAKNESS_LABELS: Record<string, string> = {
  weak_foot: 'Svaga foten',
  heading: 'Nickar',
  positioning: 'Positionering',
  first_touch: 'Första touch',
  passing: 'Passningar',
  finishing: 'Avslut',
  defensive_work: 'Defensivt arbete',
  stamina: 'Uthållighet',
}

const INJURY_LABELS: Record<string, string> = {
  hamstring: 'Hamstring',
  groin: 'Ljumske',
  ankle: 'Fotled',
  knee_acl: 'Knä (ACL)',
  knee_meniscus: 'Knä (Menisk)',
  quadriceps: 'Quadriceps',
  calf: 'Vad',
  back: 'Rygg',
}

const FOOT_LABELS: Record<string, string> = {
  right: 'Höger',
  left: 'Vänster',
  both: 'Tvåfotad',
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: string[]; avoid: string[] }> = {
  off_season: {
    focus: ['Aerob basträning', 'Maxstyrka (4-6 rep)', 'Rörlighet', 'Skaderehab'],
    avoid: ['Hög-intensiv sprintträning', 'Maximal match-simulering'],
  },
  pre_season: {
    focus: ['Intervaller (30-60 sek)', 'Explosiv styrka', 'Repeated Sprint Ability', 'Yo-Yo test'],
    avoid: ['Långdistans steady-state', 'Hög volym styrketräning'],
  },
  in_season: {
    focus: ['Underhållsstyrka (2x/v)', 'Aktiv återhämtning', 'Mobilitet', 'Skadeförebyggande (FIFA 11+)'],
    avoid: ['Hög volym off-field', 'Nya övningar', 'Tung styrketräning nära match'],
  },
  playoffs: {
    focus: ['Lätt aktivering', 'Mental förberedelse', 'Sömn & återhämtning', 'Aktivering MD-1'],
    avoid: ['Styrketräning', 'Konditionsträning', 'Allt som kan orsaka trötthet'],
  },
}

// Position-specific physical benchmarks (elite level references)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint10m: number; sprint30m: number; cmj: number }> = {
  goalkeeper: { yoyoIR1: 17.0, sprint10m: 1.75, sprint30m: 4.30, cmj: 42 },
  defender: { yoyoIR1: 19.0, sprint10m: 1.72, sprint30m: 4.20, cmj: 45 },
  midfielder: { yoyoIR1: 20.5, sprint10m: 1.70, sprint30m: 4.15, cmj: 43 },
  forward: { yoyoIR1: 19.5, sprint10m: 1.68, sprint30m: 4.10, cmj: 48 },
}

export function FootballAthleteView({ clientId, clientName, settings }: FootballAthleteViewProps) {
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
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett fotbollsinställningar ännu.
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
                    ? POSITION_DETAIL_LABELS[footballSettings.positionDetail]
                    : POSITION_LABELS[footballSettings.position]}
                </Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[footballSettings.leagueLevel]}</Badge>
                <Badge className="bg-green-500">{PHASE_LABELS[footballSettings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>års erfarenhet</div>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>min/match</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.matchesPerWeek}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>matcher/v</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.weeklyTrainingSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>träning/v</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {FOOT_LABELS[footballSettings.preferredFootwork]}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>favoritfot</div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>Spelstil:</span>
            <Badge className={
              footballSettings.playStyle === 'possession' ? 'bg-blue-500' :
              footballSettings.playStyle === 'counter' ? 'bg-yellow-500' :
              footballSettings.playStyle === 'pressing' ? 'bg-red-500' :
              'bg-orange-500'
            }>
              {PLAYSTYLE_LABELS[footballSettings.playStyle]}
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
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>leverantör</div>
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
            Fysiska tester ({POSITION_LABELS[footballSettings.position]})
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Jämfört med elitreferensvärden för positionen
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
                  {getBenchmarkPercentage(footballSettings.benchmarks.yoyoIR1Level, positionBenchmarks.yoyoIR1)}% av elit
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
                  {getBenchmarkPercentage(footballSettings.benchmarks.sprint10m, positionBenchmarks.sprint10m, true)}% av elit
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
                  {getBenchmarkPercentage(footballSettings.benchmarks.sprint30m, positionBenchmarks.sprint30m, true)}% av elit
                </div>
              )}
            </div>

            {/* CMJ */}
            <div className="text-center p-2 rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <div className="text-sm font-medium mb-1" style={{ color: theme.colors.textMuted }}>CMJ hopp</div>
              <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {footballSettings.benchmarks.cmjHeight ?? '-'} cm
              </div>
              {footballSettings.benchmarks.cmjHeight && (
                <div className={`text-xs mt-1 ${
                  footballSettings.benchmarks.cmjHeight >= positionBenchmarks.cmj ? 'text-green-500' : 'text-orange-500'
                }`}>
                  {getBenchmarkPercentage(footballSettings.benchmarks.cmjHeight, positionBenchmarks.cmj)}% av elit
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
            Träningsrekommendationer ({PHASE_LABELS[footballSettings.seasonPhase]})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Fokusera på:</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Undvik:</h4>
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
      {(footballSettings.strengthFocus.length > 0 || footballSettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              Styrkor & Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {footballSettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Styrkor:</h4>
                <div className="flex flex-wrap gap-1">
                  {footballSettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {footballSettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Att utveckla:</h4>
                <div className="flex flex-wrap gap-1">
                  {footballSettings.weaknesses.map((w) => (
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
      {footballSettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Skadehistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {footballSettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              Inkludera FIFA 11+ och positionsspecifika förebyggande övningar i träningsprogrammet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            Positionsspecifik träning: {
              footballSettings.positionDetail
                ? POSITION_DETAIL_LABELS[footballSettings.positionDetail]
                : POSITION_LABELS[footballSettings.position]
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {footballSettings.position === 'goalkeeper' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Reaktion, lateral rörlighet, positionering</li>
              <li>• <strong>Styrka:</strong> Explosiv kraft i ben, core, axelstabilitet</li>
              <li>• <strong>Kondition:</strong> Korta explosiva intervaller, recovery</li>
              <li>• <strong>Förebyggande:</strong> Axlar, handleder, knän</li>
            </ul>
          ) : footballSettings.position === 'defender' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Duellstyrka, hoppkraft för nickar, positionering</li>
              <li>• <strong>Styrka:</strong> Överkropp för dueller, höft/gluteal, Nordic curls</li>
              <li>• <strong>Kondition:</strong> Aerob bas + repeated sprint ability</li>
              <li>• <strong>Förebyggande:</strong> Hamstring, ljumske, fotled</li>
            </ul>
          ) : footballSettings.position === 'midfielder' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Maximal aerob kapacitet (Yo-Yo), box-to-box</li>
              <li>• <strong>Styrka:</strong> Uthållighetsstyrka, core för balans i dueller</li>
              <li>• <strong>Kondition:</strong> Högst krav - 10-13km/match, intervaller</li>
              <li>• <strong>Förebyggande:</strong> Ljumske, knä, överbelastning</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Maximal sprint, acceleration 0-10m</li>
              <li>• <strong>Styrka:</strong> Explosiv power, skottstyrka (rotation)</li>
              <li>• <strong>Kondition:</strong> Anaerob kapacitet, sprint recovery</li>
              <li>• <strong>Förebyggande:</strong> Hamstring (kritiskt!), quadriceps</li>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>träningspass/v</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_FOOTBALL"
        title="Testhistorik - Fotboll"
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
