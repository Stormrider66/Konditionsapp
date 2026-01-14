'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  Timer,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
  MapPin,
  Activity,
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { FootballSettings } from '@/components/onboarding/FootballOnboarding'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface FootballDashboardProps {
  settings: FootballSettings
  recentGPSData?: GPSMatchData[]
}

interface GPSMatchData {
  matchId: string
  opponent: string
  date: Date
  distanceKm: number
  sprintDistanceM: number
  highSpeedRunningM: number
  maxSpeedKmh: number
  minutesPlayed: number
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
  defensive_mid: 'Defensiv mittfältare',
  central_mid: 'Central mittfältare',
  attacking_mid: 'Offensiv mittfältare',
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

// Position-specific expected distances
const EXPECTED_DISTANCE: Record<string, { min: number; max: number }> = {
  goalkeeper: { min: 5, max: 6 },
  defender: { min: 9, max: 11 },
  midfielder: { min: 10, max: 13 },
  forward: { min: 9, max: 11 },
}

// Phase training focus
const PHASE_FOCUS: Record<string, { focus: string[]; icon: typeof Flame }> = {
  off_season: {
    focus: ['Bygga aerob bas', 'Maxstyrka', 'Åtgärda skador', 'Mental vila'],
    icon: Flame,
  },
  pre_season: {
    focus: ['Fotbollsspecifik kondition', 'Explosivitet', 'Taktik', 'Match-simulering'],
    icon: Zap,
  },
  in_season: {
    focus: ['Underhåll styrka', 'Återhämtning', 'Matchförberedelse', 'Skadeförebyggande'],
    icon: Target,
  },
  playoffs: {
    focus: ['Maximal återhämtning', 'Mental fokus', 'Toppform', 'Aktivering'],
    icon: Shield,
  },
}

export function FootballDashboard({ settings, recentGPSData = [] }: FootballDashboardProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const phaseFocus = PHASE_FOCUS[settings.seasonPhase]
  const PhaseIcon = phaseFocus?.icon || Flame

  const expectedDistance = EXPECTED_DISTANCE[settings.position]

  // Calculate GPS stats if available
  const avgGPSStats = recentGPSData.length > 0 ? {
    avgDistance: recentGPSData.reduce((sum, d) => sum + d.distanceKm, 0) / recentGPSData.length,
    avgSprint: recentGPSData.reduce((sum, d) => sum + d.sprintDistanceM, 0) / recentGPSData.length,
    avgMaxSpeed: recentGPSData.reduce((sum, d) => sum + d.maxSpeedKmh, 0) / recentGPSData.length,
  } : null

  return (
    <div className="space-y-6">
      {/* Header with Position & Team */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                {settings.teamName || 'Mitt lag'}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline">
                  {settings.positionDetail
                    ? POSITION_DETAIL_LABELS[settings.positionDetail] || settings.positionDetail
                    : POSITION_LABELS[settings.position]}
                </Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]}</Badge>
                <Badge className="bg-green-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-sm text-muted-foreground">års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Season Phase Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhaseIcon className="h-5 w-5 text-green-500" />
            Säsongsfas: {PHASE_LABELS[settings.seasonPhase]}
          </CardTitle>
          <CardDescription>
            Anpassad träning för din nuvarande fas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase progress */}
          <div className="flex gap-1">
            {['off_season', 'pre_season', 'in_season', 'playoffs'].map((phase) => (
              <div
                key={phase}
                className={`h-2 flex-1 rounded-full ${
                  settings.seasonPhase === phase
                    ? 'bg-green-500'
                    : ['off_season', 'pre_season', 'in_season', 'playoffs'].indexOf(phase) <=
                      ['off_season', 'pre_season', 'in_season', 'playoffs'].indexOf(settings.seasonPhase)
                    ? 'bg-green-500/30'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Focus areas */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Fokusområden denna fas:</h4>
            <div className="grid grid-cols-2 gap-2">
              {phaseFocus?.focus.map((focus, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {focus}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Load Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Matcher/vecka</p>
                <p className="text-2xl font-bold">{settings.matchesPerWeek}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Minuter/match</p>
                <p className="text-2xl font-bold">{settings.avgMinutesPerMatch ?? '-'}</p>
              </div>
              <Timer className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Träning/vecka</p>
                <p className="text-2xl font-bold">{settings.weeklyTrainingSessions}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spelstil</p>
                <p className="text-lg font-bold">{PLAYSTYLE_LABELS[settings.playStyle]}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPS Data Section */}
      {settings.hasGPSData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-500" />
              GPS-data
            </CardTitle>
            <CardDescription>
              {settings.gpsProvider ? `Från ${settings.gpsProvider}` : 'Matchbelastning'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">
                  {avgGPSStats?.avgDistance.toFixed(1) || settings.avgMatchDistanceKm || '-'}
                  <span className="text-sm font-normal text-muted-foreground"> km</span>
                </div>
                <p className="text-sm text-muted-foreground">Snitt matchdistans</p>
                {expectedDistance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Förväntat: {expectedDistance.min}-{expectedDistance.max} km
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">
                  {avgGPSStats?.avgSprint.toFixed(0) || settings.avgSprintDistanceM || '-'}
                  <span className="text-sm font-normal text-muted-foreground"> m</span>
                </div>
                <p className="text-sm text-muted-foreground">Snitt sprintdistans</p>
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold">
                  {avgGPSStats?.avgMaxSpeed.toFixed(1) || '-'}
                  <span className="text-sm font-normal text-muted-foreground"> km/h</span>
                </div>
                <p className="text-sm text-muted-foreground">Snitt max hastighet</p>
              </div>
            </div>

            {recentGPSData.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Lägg till matchdata för att se GPS-statistik.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Physical Benchmarks */}
      {(settings.benchmarks.yoyoIR1Level || settings.benchmarks.sprint30m || settings.benchmarks.cmjHeight) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              Fysiska tester
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {settings.benchmarks.yoyoIR1Level && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.yoyoIR1Level}</p>
                  <p className="text-xs text-muted-foreground">Yo-Yo IR1</p>
                </div>
              )}
              {settings.benchmarks.yoyoIR2Level && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.yoyoIR2Level}</p>
                  <p className="text-xs text-muted-foreground">Yo-Yo IR2</p>
                </div>
              )}
              {settings.benchmarks.sprint10m && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.sprint10m}s</p>
                  <p className="text-xs text-muted-foreground">10m sprint</p>
                </div>
              )}
              {settings.benchmarks.sprint30m && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.sprint30m}s</p>
                  <p className="text-xs text-muted-foreground">30m sprint</p>
                </div>
              )}
              {settings.benchmarks.cmjHeight && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.cmjHeight} cm</p>
                  <p className="text-xs text-muted-foreground">CMJ hopp</p>
                </div>
              )}
              {settings.benchmarks.agilityTest && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-lg font-bold">{settings.benchmarks.agilityTest}s</p>
                  <p className="text-xs text-muted-foreground">Agility</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Styrkor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings.strengthFocus.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.strengthFocus.map((strength) => (
                  <Badge key={strength} variant="outline" className="bg-green-500/10 border-green-500">
                    {STRENGTH_LABELS[strength] || strength}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga styrkor valda ännu.</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-orange-500" />
              Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings.weaknesses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.weaknesses.map((weakness) => (
                  <Badge key={weakness} variant="outline" className="bg-orange-500/10 border-orange-500">
                    {WEAKNESS_LABELS[weakness] || weakness}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga utvecklingsområden valda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Injury History */}
      {settings.injuryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Skadehistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Träningsprogrammet inkluderar FIFA 11+ och specifika förebyggande övningar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Matches */}
      <MatchScheduleWidget />

      {/* Position-Specific Training Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Träningsrekommendationer för {POSITION_LABELS[settings.position]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings.position === 'goalkeeper' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Styrka:</strong> Explosiv benkraft, axelstabilitet, core</li>
              <li>• <strong>Kondition:</strong> Korta reaktionsintervaller, lateral rörelse</li>
              <li>• <strong>Förebyggande:</strong> Axel-/axelmuskler, handleder, höfter</li>
              <li>• <strong>Test att följa:</strong> Reaktionstid, vertikalt hopp, lateral push</li>
            </ul>
          ) : settings.position === 'defender' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Styrka:</strong> Överkropp för dueller, hoppkraft för nickar</li>
              <li>• <strong>Kondition:</strong> Aerob bas, repeated sprint ability</li>
              <li>• <strong>Förebyggande:</strong> Nordic curls, Copenhagen plank, nackstyrka</li>
              <li>• <strong>Test att följa:</strong> Yo-Yo IR2, CMJ hopp, 10m/30m sprint</li>
            </ul>
          ) : settings.position === 'midfielder' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Styrka:</strong> Uthållighetsstyrka, core för dueller</li>
              <li>• <strong>Kondition:</strong> Maximal Yo-Yo, 4x4 intervaller, repeated sprints</li>
              <li>• <strong>Förebyggande:</strong> Hamstring (hög risk), ljumske, överbelastning</li>
              <li>• <strong>Test att följa:</strong> Yo-Yo IR2 (primärt), VO2max, RSA</li>
            </ul>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Styrka:</strong> Explosiv power, skottstyrka (rotation)</li>
              <li>• <strong>Kondition:</strong> Sprint-uthållighet, acceleration, anaerob kapacitet</li>
              <li>• <strong>Förebyggande:</strong> Hamstring (kritiskt!), quadriceps, ljumske</li>
              <li>• <strong>Test att följa:</strong> 10m/20m sprint, flying 20m, RSA</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FootballDashboard
