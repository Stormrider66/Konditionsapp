'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
import {
  Trophy,
  Timer,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  Ruler,
} from 'lucide-react'
import type { BasketballSettings } from '@/components/onboarding/BasketballOnboarding'
import {
  BASKETBALL_POSITION_PROFILES,
  BASKETBALL_SEASON_PHASES,
  BASKETBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/basketball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface BasketballDashboardProps {
  settings: BasketballSettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const ENGLISH_PHRASES: Record<string, string> = {
  'Spelets regissör som styr tempo och skapar chanser. Kräver utmärkt spelförståelse, bollkontroll och uthållighet.': 'The floor general who controls tempo and creates chances. Requires excellent court vision, ball control, and endurance.',
  'Primär poänggörare från distans. Kräver explosivitet för att skapa skottlägen och god uthållighet för konstant rörelse.': 'Primary perimeter scorer. Requires explosiveness to create shot opportunities and strong endurance for constant movement.',
  'Allsidig spelare som bidrar i både anfall och försvar. Kombinerar guard-liknande rörlighet med forward-styrka.': 'Versatile player who contributes on offense and defense. Combines guard-like mobility with forward strength.',
  'Fysisk spelare som dominerar i målarområdet. Kräver explosiv styrka och förmåga att spela fysiskt.': 'Physical player who dominates in the paint. Requires explosive strength and the ability to play through contact.',
  'Lagets ankar i målarområdet. Fokus på rim protection, rebounds och inomhuspoäng. Kräver maximal styrka och vertikal kraft.': 'The team anchor in the paint. Focuses on rim protection, rebounds, and inside scoring. Requires maximal strength and vertical power.',
  Snabbhet: 'Speed',
  Kvickhet: 'Agility',
  Uthållighet: 'Endurance',
  Reaktionsförmåga: 'Reaction ability',
  Acceleration: 'Acceleration',
  'Vertikal hoppförmåga': 'Vertical jump ability',
  'Core-stabilitet': 'Core stability',
  Skottuthållighet: 'Shooting endurance',
  'Allsidig atletik': 'All-around athleticism',
  Styrka: 'Strength',
  'Explosiv styrka': 'Explosive strength',
  Kroppskontroll: 'Body control',
  Reboundförmåga: 'Rebounding ability',
  'Core-styrka': 'Core strength',
  Maxstyrka: 'Maximum strength',
  'Vertikal kraft': 'Vertical power',
  Kroppsmassa: 'Body mass',
  Timing: 'Timing',
  Fotarbete: 'Footwork',
  Explosivitet: 'Explosiveness',
  'Aerob bas': 'Aerobic base',
  Skadeförebyggande: 'Injury prevention',
  Teknikutveckling: 'Technique development',
  'Basketballspecifik kondition': 'Basketball-specific conditioning',
  Power: 'Power',
  Matchhärdighet: 'Match durability',
  Taktik: 'Tactics',
  Lagsamspel: 'Team play',
  Styrkeunderhåll: 'Strength maintenance',
  Återhämtning: 'Recovery',
  Matchprestation: 'Match performance',
  Skadeprevention: 'Injury prevention',
  'Maximal återhämtning': 'Maximal recovery',
  'Mental förberedelse': 'Mental preparation',
  'Taktisk perfektion': 'Tactical precision',
  'Peak performance': 'Peak performance',
  'Hypertrofi och maxstyrka med fokus på compound-lyft': 'Hypertrophy and maximum strength with a focus on compound lifts',
  'Aerob basträning och gradvis uppbyggnad av intensitet': 'Aerobic base training and gradual intensity build-up',
  'Kraftutveckling och power med basketballspecifika rörelser': 'Power development with basketball-specific movements',
  'Högintensiv intervallträning och spelliknande övningar': 'High-intensity interval training and game-like drills',
  'Underhåll av styrka med låg volym, hög intensitet': 'Strength maintenance with low volume and high intensity',
  'Matchspecifik kondition genom träning och matcher': 'Match-specific conditioning through practices and games',
  'Minimalt underhåll för att bevara explosivitet': 'Minimal maintenance to preserve explosiveness',
  'Endast matchspecifik aktivitet och aktiv återhämtning': 'Only match-specific activity and active recovery',
  Balans: 'Balance',
  Mobilitet: 'Mobility',
  Stabilitet: 'Stability',
  Rehab: 'Rehab',
  Kontroll: 'Control',
  Core: 'Core',
  Rotatorkuff: 'Rotator cuff',
  Excentrisk: 'Eccentric',
  Plyometrics: 'Plyometrics',
  Kondition: 'Conditioning',
  Teknik: 'Technique',
  '3x30s per ben': '3x30s per leg',
  '2 set per fot': '2 sets per foot',
  '3x15 per ben': '3x15 per leg',
  '3x12 per riktning': '3x12 per direction',
  '3x8 per ben': '3x8 per leg',
  '3x10 per ben': '3x10 per leg',
  '3x10 per sida': '3x10 per side',
  '3x12 per sida': '3x12 per side',
  '3x12 per arm': '3x12 per arm',
  '2x8 per position': '2x8 per position',
  '3x8 per sida': '3x8 per side',
  'Progression: blunda, instabil yta': 'Progression: eyes closed, unstable surface',
  'Rita alla bokstäver i luften': 'Draw every letter in the air',
  'Full ROM, kontrollerad excentrisk fas': 'Full ROM, controlled eccentric phase',
  'Håll knäna över tårna': 'Keep knees tracking over toes',
  'Kontrollerad excentrisk fas': 'Controlled eccentric phase',
  'Fokus på knäkontroll': 'Focus on knee control',
  'Med band runt knät': 'With band around the knee',
  'Långsam kontrollerad rörelse': 'Slow controlled movement',
  'Håll neutral rygg': 'Keep a neutral spine',
  'Pressa ländryggen mot golvet': 'Press the lower back into the floor',
  'Långsamma kontrollerade rörelser': 'Slow controlled movements',
  'Full höftextension': 'Full hip extension',
  'Drag ihop skulderbladen': 'Squeeze the shoulder blades together',
  'Med band eller lätt vikt': 'With a band or light weight',
  'Fokus på bakre deltoid': 'Focus on the rear deltoid',
  'Liggande på mage': 'Prone position',
  'Vid 70 graders knävinkel': 'At a 70-degree knee angle',
  'Med band runt knäna': 'With band around the knees',
  'Långsam excentrisk fas': 'Slow eccentric phase',
  '3s upp, 3s ner': '3s up, 3s down',
  'Fokus på snabb riktningsändring': 'Focus on quick changes of direction',
  'Med visuella signaler': 'With visual cues',
  'Variera fotsteg': 'Vary footwork',
  'Fokus på maximal höjd': 'Focus on maximum height',
  'Full kropp explosivitet': 'Full-body explosiveness',
  'Fullplans sprints': 'Full-court sprints',
  'Fokus på maxstyrka': 'Focus on maximum strength',
  'Minimal markkontakttid': 'Minimal ground-contact time',
  'Drop steps och pivots': 'Drop steps and pivots',
}

const phrase = (locale: AppLocale, value: string) => (
  locale === 'sv' ? value : ENGLISH_PHRASES[value] ?? value
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  point_guard: { sv: 'Playmaker (1)', en: 'Point Guard (1)' },
  shooting_guard: { sv: 'Shooting Guard (2)', en: 'Shooting Guard (2)' },
  small_forward: { sv: 'Small Forward (3)', en: 'Small Forward (3)' },
  power_forward: { sv: 'Power Forward (4)', en: 'Power Forward (4)' },
  center: { sv: 'Center (5)', en: 'Center (5)' },
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const LEAGUE_LABELS: Record<string, Record<AppLocale, string>> = {
  recreational: { sv: 'Korpen/Motion', en: 'Recreational' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  basketligan: { sv: 'Basketligan', en: 'Basketligan' },
  sbl: { sv: 'SBL', en: 'SBL' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  vertical_jump: { sv: 'Vertikal hoppförmåga', en: 'Vertical jump ability' },
  speed: { sv: 'Snabbhet', en: 'Speed' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  strength: { sv: 'Styrka', en: 'Strength' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  shooting: { sv: 'Skottförmåga', en: 'Shooting ability' },
  court_vision: { sv: 'Spelförståelse', en: 'Court vision' },
  defense: { sv: 'Försvarsspel', en: 'Defense' },
}

export function BasketballDashboard({ settings }: BasketballDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{text(locale, 'Basket', 'Basketball')}</CardTitle>
          <CardDescription>
            {t('basketballNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const position = settings.position
  const positionProfile = BASKETBALL_POSITION_PROFILES[position]
  const seasonPhase = BASKETBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = BASKETBALL_BENCHMARKS[position]

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
  const recommendations = getPositionRecommendations(position)
  const essentialExercises = recommendations.filter((r) => r.priority === 'essential').slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                {settings.teamName || text(locale, 'Basket', 'Basketball')}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]?.[locale]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]?.[locale]}</Badge>
                <Badge className="bg-orange-500">{PHASE_LABELS[settings.seasonPhase]?.[locale]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'års erfarenhet', 'years experience')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{settings.avgMinutesPerMatch ?? '-'}</div>
              <div className="text-xs text-muted-foreground">min/match</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.matchesPerWeek}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'matcher/v', 'matches/wk')}</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'träning/v', 'sessions/wk')}</div>
            </div>
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'cm längd', 'cm height')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {PHASE_LABELS[settings.seasonPhase]?.[locale]} - {text(locale, 'Träningsfokus', 'Training focus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">{text(locale, 'Fokusområden:', 'Focus areas:')}</h4>
              <div className="flex flex-wrap gap-1">
                {seasonPhase.focus.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {phrase(locale, item)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{text(locale, 'Styrka', 'Strength')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.strengthEmphasis)}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{text(locale, 'Kondition', 'Conditioning')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.conditioningEmphasis)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-red-500" />
            {text(locale, 'Fysiska tester', 'Physical tests')} - {POSITION_LABELS[position]?.[locale]}
          </CardTitle>
          <CardDescription>{text(locale, 'Dina resultat jämfört med elitnivå', 'Your results compared with elite level')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Vertikalhopp', 'Vertical jump')}</span>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.verticalJump} cm</div>
            </div>

            {/* 3/4 Court Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>3/4 Court sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint3_4Court,
                  benchmarks.elite.sprint3_4Court!,
                  benchmarks.good.sprint3_4Court!,
                  true
                ))}>
                  {settings.benchmarks.sprint3_4Court?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint3_4Court, benchmarks.elite.sprint3_4Court!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint3_4Court} s</div>
            </div>

            {/* Lane Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lane Agility</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.laneAgility,
                  benchmarks.elite.laneAgility!,
                  benchmarks.good.laneAgility!,
                  true
                ))}>
                  {settings.benchmarks.laneAgility?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.laneAgility, benchmarks.elite.laneAgility!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.laneAgility} s</div>
            </div>

            {/* Bench Press */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Bänkpress', 'Bench press')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.benchPress,
                  benchmarks.elite.benchPress!,
                  benchmarks.good.benchPress!
                ))}>
                  {settings.benchmarks.benchPress ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.benchPress, benchmarks.elite.benchPress!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.benchPress} kg</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Knäböj', 'Squat')}</span>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.squat} kg</div>
            </div>

            {/* Yo-Yo IR1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Yo-Yo IR1</span>
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
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.yoyoIR1Level}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {text(locale, 'Positionsprofil:', 'Position profile:')} {POSITION_LABELS[position]?.[locale]}
          </CardTitle>
          <CardDescription>{phrase(locale, positionProfile.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Matchdistans', 'Match distance')}</div>
              <div className="font-medium">
                {positionProfile.avgMatchDistanceKm.min}-{positionProfile.avgMatchDistanceKm.max} km
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Sprints/match</div>
              <div className="font-medium">
                {positionProfile.avgSprintsPerMatch.min}-{positionProfile.avgSprintsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Hopp/match', 'Jumps/match')}</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Speltid', 'Playing time')}</div>
              <div className="font-medium">
                {positionProfile.avgMinutesPerMatch.min}-{positionProfile.avgMinutesPerMatch.max} min
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">{text(locale, 'Nyckelegenskaper:', 'Key attributes:')}</div>
            <div className="flex flex-wrap gap-1">
              {positionProfile.keyPhysicalAttributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {phrase(locale, attr)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Exercises */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" />
            {text(locale, 'Rekommenderade övningar', 'Recommended exercises')}
          </CardTitle>
          <CardDescription>{text(locale, 'Baserat på din position och skadehistorik', 'Based on your position and injury history')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialExercises.map((exercise, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{phrase(locale, exercise.name)}</div>
                    <div className="text-xs text-muted-foreground">{phrase(locale, exercise.setsReps)}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {phrase(locale, exercise.category)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">{phrase(locale, exercise.notes)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {settings.strengthFocus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-500" />
              {text(locale, 'Dina styrkor', 'Your strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.strengthFocus.map((strength) => (
                <Badge key={strength} variant="secondary">
                  {STRENGTH_LABELS[strength]?.[locale] || strength}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Schedule */}
      <MatchScheduleWidget />
    </div>
  )
}

export default BasketballDashboard
