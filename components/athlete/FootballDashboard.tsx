'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale, useTranslations } from 'next-intl'
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
import type { FootballSettings } from '@/components/onboarding/FootballOnboarding'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface FootballDashboardProps {
  settings: FootballSettings | null | undefined
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

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  defender: { sv: 'Försvarare', en: 'Defender' },
  midfielder: { sv: 'Mittfältare', en: 'Midfielder' },
  forward: { sv: 'Anfallare', en: 'Forward' },
}

const POSITION_DETAIL_LABELS: Record<string, Record<AppLocale, string>> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  center_back: { sv: 'Mittback', en: 'Center back' },
  left_back: { sv: 'Vänsterback', en: 'Left back' },
  right_back: { sv: 'Högerback', en: 'Right back' },
  wing_back: { sv: 'Wingback', en: 'Wingback' },
  sweeper: { sv: 'Libero', en: 'Sweeper' },
  defensive_mid: { sv: 'Defensiv mittfältare', en: 'Defensive midfielder' },
  central_mid: { sv: 'Central mittfältare', en: 'Central midfielder' },
  attacking_mid: { sv: 'Offensiv mittfältare', en: 'Attacking midfielder' },
  left_mid: { sv: 'Vänster mittfältare', en: 'Left midfielder' },
  right_mid: { sv: 'Höger mittfältare', en: 'Right midfielder' },
  striker: { sv: 'Nia/Striker', en: 'Striker' },
  left_winger: { sv: 'Vänsterytter', en: 'Left winger' },
  right_winger: { sv: 'Högerytter', en: 'Right winger' },
  false_nine: { sv: 'Falsk nia', en: 'False nine' },
  second_striker: { sv: 'Andraspets', en: 'Second striker' },
}

const LEAGUE_LABELS: Record<string, Record<AppLocale, string>> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_4: { sv: 'Division 4', en: 'Division 4' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  superettan: { sv: 'Superettan', en: 'Superettan' },
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const PLAYSTYLE_LABELS: Record<string, Record<AppLocale, string>> = {
  possession: { sv: 'Bollinnehav', en: 'Possession' },
  counter: { sv: 'Kontring', en: 'Counterattack' },
  pressing: { sv: 'Högt press', en: 'High press' },
  physical: { sv: 'Fysiskt', en: 'Physical' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  jumping: { sv: 'Hoppkraft', en: 'Jump power' },
  shooting_power: { sv: 'Skottstyrka', en: 'Shooting power' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  strength_duels: { sv: 'Duellstyrka', en: 'Duel strength' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
}

const WEAKNESS_LABELS: Record<string, Record<AppLocale, string>> = {
  weak_foot: { sv: 'Svaga foten', en: 'Weak foot' },
  heading: { sv: 'Nickar', en: 'Heading' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  first_touch: { sv: 'Första touch', en: 'First touch' },
  passing: { sv: 'Passningar', en: 'Passing' },
  finishing: { sv: 'Avslut', en: 'Finishing' },
  defensive_work: { sv: 'Defensivt arbete', en: 'Defensive work' },
  stamina: { sv: 'Uthållighet', en: 'Stamina' },
}

const INJURY_LABELS: Record<string, Record<AppLocale, string>> = {
  hamstring: { sv: 'Hamstring', en: 'Hamstring' },
  groin: { sv: 'Ljumske', en: 'Groin' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  knee_acl: { sv: 'Knä (ACL)', en: 'Knee (ACL)' },
  knee_meniscus: { sv: 'Knä (Menisk)', en: 'Knee (meniscus)' },
  quadriceps: { sv: 'Quadriceps', en: 'Quadriceps' },
  calf: { sv: 'Vad', en: 'Calf' },
  back: { sv: 'Rygg', en: 'Back' },
}

// Position-specific expected distances
const EXPECTED_DISTANCE: Record<string, { min: number; max: number }> = {
  goalkeeper: { min: 5, max: 6 },
  defender: { min: 9, max: 11 },
  midfielder: { min: 10, max: 13 },
  forward: { min: 9, max: 11 },
}

// Phase training focus
const PHASE_FOCUS: Record<string, { focus: Record<AppLocale, string[]>; icon: typeof Flame }> = {
  off_season: {
    focus: {
      sv: ['Bygga aerob bas', 'Maxstyrka', 'Åtgärda skador', 'Mental vila'],
      en: ['Build aerobic base', 'Maximum strength', 'Address injuries', 'Mental rest'],
    },
    icon: Flame,
  },
  pre_season: {
    focus: {
      sv: ['Fotbollsspecifik kondition', 'Explosivitet', 'Taktik', 'Match-simulering'],
      en: ['Football-specific conditioning', 'Explosiveness', 'Tactics', 'Match simulation'],
    },
    icon: Zap,
  },
  in_season: {
    focus: {
      sv: ['Underhåll styrka', 'Återhämtning', 'Matchförberedelse', 'Skadeförebyggande'],
      en: ['Maintain strength', 'Recovery', 'Match preparation', 'Injury prevention'],
    },
    icon: Target,
  },
  playoffs: {
    focus: {
      sv: ['Maximal återhämtning', 'Mental fokus', 'Toppform', 'Aktivering'],
      en: ['Maximal recovery', 'Mental focus', 'Peak form', 'Activation'],
    },
    icon: Shield,
  },
}

export function FootballDashboard({ settings, recentGPSData = [] }: FootballDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            {text(locale, 'Fotboll', 'Football')}
          </CardTitle>
          <CardDescription>
            {t('footballNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
                {settings.teamName || text(locale, 'Mitt lag', 'My team')}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline">
                  {settings.positionDetail
                    ? POSITION_DETAIL_LABELS[settings.positionDetail]?.[locale] || settings.positionDetail
                    : POSITION_LABELS[settings.position]?.[locale]}
                </Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]?.[locale]}</Badge>
                <Badge className="bg-green-500">{PHASE_LABELS[settings.seasonPhase]?.[locale]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-sm text-muted-foreground">{text(locale, 'års erfarenhet', 'years experience')}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Season Phase Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhaseIcon className="h-5 w-5 text-green-500" />
            {text(locale, 'Säsongsfas:', 'Season phase:')} {PHASE_LABELS[settings.seasonPhase]?.[locale]}
          </CardTitle>
          <CardDescription>
            {text(locale, 'Anpassad träning för din nuvarande fas', 'Training adapted to your current phase')}
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
            <h4 className="font-medium text-sm">{text(locale, 'Fokusområden denna fas:', 'Focus areas this phase:')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {phaseFocus?.focus[locale].map((focus, i) => (
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
                <p className="text-sm text-muted-foreground">{text(locale, 'Matcher/vecka', 'Matches/week')}</p>
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
                <p className="text-sm text-muted-foreground">{text(locale, 'Minuter/match', 'Minutes/match')}</p>
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
                <p className="text-sm text-muted-foreground">{text(locale, 'Träning/vecka', 'Training/week')}</p>
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
                <p className="text-sm text-muted-foreground">{text(locale, 'Spelstil', 'Play style')}</p>
                <p className="text-lg font-bold">{PLAYSTYLE_LABELS[settings.playStyle]?.[locale]}</p>
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
              {settings.gpsProvider ? text(locale, `Från ${settings.gpsProvider}`, `From ${settings.gpsProvider}`) : text(locale, 'Matchbelastning', 'Match load')}
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
                <p className="text-sm text-muted-foreground">{text(locale, 'Snitt matchdistans', 'Average match distance')}</p>
                {expectedDistance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {text(locale, 'Förväntat:', 'Expected:')} {expectedDistance.min}-{expectedDistance.max} km
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">
                  {avgGPSStats?.avgSprint.toFixed(0) || settings.avgSprintDistanceM || '-'}
                  <span className="text-sm font-normal text-muted-foreground"> m</span>
                </div>
                <p className="text-sm text-muted-foreground">{text(locale, 'Snitt sprintdistans', 'Average sprint distance')}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold">
                  {avgGPSStats?.avgMaxSpeed.toFixed(1) || '-'}
                  <span className="text-sm font-normal text-muted-foreground"> km/h</span>
                </div>
                <p className="text-sm text-muted-foreground">{text(locale, 'Snitt max hastighet', 'Average max speed')}</p>
              </div>
            </div>

            {recentGPSData.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {text(locale, 'Lägg till matchdata för att se GPS-statistik.', 'Add match data to view GPS statistics.')}
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
              {text(locale, 'Fysiska tester', 'Physical tests')}
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
                  <p className="text-xs text-muted-foreground">{text(locale, 'CMJ hopp', 'CMJ jump')}</p>
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
              {text(locale, 'Styrkor', 'Strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings.strengthFocus.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.strengthFocus.map((strength) => (
                  <Badge key={strength} variant="outline" className="bg-green-500/10 border-green-500">
                    {STRENGTH_LABELS[strength]?.[locale] || strength}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{text(locale, 'Inga styrkor valda ännu.', 'No strengths selected yet.')}</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-orange-500" />
              {text(locale, 'Utvecklingsområden', 'Development areas')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings.weaknesses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.weaknesses.map((weakness) => (
                  <Badge key={weakness} variant="outline" className="bg-orange-500/10 border-orange-500">
                    {WEAKNESS_LABELS[weakness]?.[locale] || weakness}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{text(locale, 'Inga utvecklingsområden valda.', 'No development areas selected.')}</p>
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
              {text(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury]?.[locale] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {text(locale, 'Träningsprogrammet inkluderar FIFA 11+ och specifika förebyggande övningar.', 'The training program includes FIFA 11+ and specific preventive exercises.')}
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
            {text(locale, 'Träningsrekommendationer för', 'Training recommendations for')} {POSITION_LABELS[settings.position]?.[locale]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings.position === 'goalkeeper' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>{text(locale, 'Styrka:', 'Strength:')}</strong> {text(locale, 'Explosiv benkraft, axelstabilitet, core', 'Explosive leg power, shoulder stability, core')}</li>
              <li>• <strong>{text(locale, 'Kondition:', 'Conditioning:')}</strong> {text(locale, 'Korta reaktionsintervaller, lateral rörelse', 'Short reaction intervals, lateral movement')}</li>
              <li>• <strong>{text(locale, 'Förebyggande:', 'Prevention:')}</strong> {text(locale, 'Axel-/axelmuskler, handleder, höfter', 'Shoulders/shoulder muscles, wrists, hips')}</li>
              <li>• <strong>{text(locale, 'Test att följa:', 'Tests to track:')}</strong> {text(locale, 'Reaktionstid, vertikalt hopp, lateral push', 'Reaction time, vertical jump, lateral push')}</li>
            </ul>
          ) : settings.position === 'defender' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>{text(locale, 'Styrka:', 'Strength:')}</strong> {text(locale, 'Överkropp för dueller, hoppkraft för nickar', 'Upper body for duels, jump power for headers')}</li>
              <li>• <strong>{text(locale, 'Kondition:', 'Conditioning:')}</strong> {text(locale, 'Aerob bas, repeated sprint ability', 'Aerobic base, repeated sprint ability')}</li>
              <li>• <strong>{text(locale, 'Förebyggande:', 'Prevention:')}</strong> {text(locale, 'Nordic curls, Copenhagen plank, nackstyrka', 'Nordic curls, Copenhagen plank, neck strength')}</li>
              <li>• <strong>{text(locale, 'Test att följa:', 'Tests to track:')}</strong> {text(locale, 'Yo-Yo IR2, CMJ hopp, 10m/30m sprint', 'Yo-Yo IR2, CMJ jump, 10m/30m sprint')}</li>
            </ul>
          ) : settings.position === 'midfielder' ? (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>{text(locale, 'Styrka:', 'Strength:')}</strong> {text(locale, 'Uthållighetsstyrka, core för dueller', 'Strength endurance, core for duels')}</li>
              <li>• <strong>{text(locale, 'Kondition:', 'Conditioning:')}</strong> {text(locale, 'Maximal Yo-Yo, 4x4 intervaller, repeated sprints', 'Maximal Yo-Yo, 4x4 intervals, repeated sprints')}</li>
              <li>• <strong>{text(locale, 'Förebyggande:', 'Prevention:')}</strong> {text(locale, 'Hamstring (hög risk), ljumske, överbelastning', 'Hamstring (high risk), groin, overload')}</li>
              <li>• <strong>{text(locale, 'Test att följa:', 'Tests to track:')}</strong> {text(locale, 'Yo-Yo IR2 (primärt), VO2max, RSA', 'Yo-Yo IR2 (primary), VO2max, RSA')}</li>
            </ul>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>{text(locale, 'Styrka:', 'Strength:')}</strong> {text(locale, 'Explosiv power, skottstyrka (rotation)', 'Explosive power, shooting power (rotation)')}</li>
              <li>• <strong>{text(locale, 'Kondition:', 'Conditioning:')}</strong> {text(locale, 'Sprint-uthållighet, acceleration, anaerob kapacitet', 'Sprint endurance, acceleration, anaerobic capacity')}</li>
              <li>• <strong>{text(locale, 'Förebyggande:', 'Prevention:')}</strong> {text(locale, 'Hamstring (kritiskt!), quadriceps, ljumske', 'Hamstring (critical), quadriceps, groin')}</li>
              <li>• <strong>{text(locale, 'Test att följa:', 'Tests to track:')}</strong> {text(locale, '10m/20m sprint, flying 20m, RSA', '10m/20m sprint, flying 20m, RSA')}</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FootballDashboard
