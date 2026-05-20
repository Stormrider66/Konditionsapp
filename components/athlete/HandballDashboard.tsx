'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
import {
  Trophy,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
} from 'lucide-react'
import type { HandballSettings } from '@/components/onboarding/HandballOnboarding'
import {
  HANDBALL_POSITION_PROFILES,
  HANDBALL_SEASON_PHASES,
  HANDBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/handball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface HandballDashboardProps {
  settings: HandballSettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const ENGLISH_PHRASES: Record<string, string> = {
  'Sista utposten - reaktionsförmåga, positionering och explosivitet': 'Last line of defense - reaction ability, positioning, and explosiveness',
  'Snabb och smidig - löpningar, genombrott och avslut från vinkel': 'Fast and agile - runs, breakthroughs, and finishes from wide angles',
  'Skyttekung - kraftfulla avslut, genombrott och speluppbyggnad': 'Shooter - powerful finishes, breakthroughs, and build-up play',
  'Spelmotor - dirigerar spelet, skapar lägen och överblick': 'Playmaker - directs play, creates chances, and reads the game',
  'Murbrytare - spärrar, blockerar och avslutar i trängsel': 'Screen setter - blocks, seals, and finishes in traffic',
  'Reaktionsförmåga': 'Reaction ability',
  'Lateral rörlighet': 'Lateral mobility',
  'Explosiv kraft': 'Explosive power',
  Flexibilitet: 'Flexibility',
  Sprintsnabbhet: 'Sprint speed',
  Kvickhet: 'Agility',
  Hoppkraft: 'Jump power',
  Uthållighet: 'Endurance',
  Skottstyrka: 'Shot power',
  Överkroppsstyrka: 'Upper-body strength',
  Acceleration: 'Acceleration',
  Spelsinne: 'Game sense',
  Beslutsfattande: 'Decision-making',
  Kroppsstyrka: 'Body strength',
  Balans: 'Balance',
  Kontaktstyrka: 'Contact strength',
  'Snabba fötter': 'Quick feet',
  'Aerob basträning': 'Aerobic base training',
  'Maxstyrka uppbyggnad': 'Maximum strength build-up',
  'Rörlighet och mobilitet': 'Flexibility and mobility',
  Skaderehabilitering: 'Injury rehabilitation',
  Teknikutveckling: 'Technique development',
  'Explosiv styrka och power': 'Explosive strength and power',
  'Sport-specifik kondition': 'Sport-specific conditioning',
  'Repeated sprint ability': 'Repeated sprint ability',
  'Plyometrics och hopp': 'Plyometrics and jumping',
  'Taktisk träning': 'Tactical training',
  'Underhåll av styrka och power': 'Strength and power maintenance',
  Matchförberedelse: 'Match preparation',
  Återhämtning: 'Recovery',
  Skadeförebyggande: 'Injury prevention',
  'Taktisk anpassning': 'Tactical adaptation',
  'Optimal återhämtning': 'Optimal recovery',
  'Mental förberedelse': 'Mental preparation',
  Matchskärpa: 'Match sharpness',
  'Injury prevention': 'Injury prevention',
  Lagsammanhållning: 'Team cohesion',
  'Hypertrofi och maxstyrka (4-8 rep, 70-85% 1RM)': 'Hypertrophy and maximum strength (4-8 reps, 70-85% 1RM)',
  'Aerob bas (låg-medel intensitet, 30-60 min)': 'Aerobic base (low-medium intensity, 30-60 min)',
  'Power och explosivitet (3-5 rep, 75-90% 1RM + plyometrics)': 'Power and explosiveness (3-5 reps, 75-90% 1RM + plyometrics)',
  'Intervaller (15-60 sek arbete, kortare vila)': 'Intervals (15-60 sec work, shorter rest)',
  'Underhåll (2-4 rep, 80-90% 1RM, låg volym)': 'Maintenance (2-4 reps, 80-90% 1RM, low volume)',
  'Matchspecifik (korta intervaller, spelsimulering)': 'Match-specific (short intervals, game simulation)',
  'Aktivering endast (lätt, explosivt)': 'Activation only (light, explosive)',
  'Minimal - endast aktivering': 'Minimal - activation only',
  'External Rotation med band': 'Band external rotation',
  'Calf Raises (raka knän)': 'Calf raises (straight knees)',
  'Finger Extensions med band': 'Band finger extensions',
  '3x10 varje position': '3x10 each position',
  '3x30 sek per arm': '3x30 sec per arm',
  '3x8 per ben': '3x8 per leg',
  '3x15 per ben': '3x15 per leg',
  '3x30 sek per ben': '3x30 sec per leg',
  '1x A-Z per fot': '1x A-Z per foot',
  '3x8 per sida': '3x8 per side',
  '3x12 per sida': '3x12 per side',
  '3x10 per sida': '3x10 per side',
  '3x10 sek håll': '3x10 sec hold',
  '3x6 per sida': '3x6 per side',
  '8x20m, 30 sek vila': '8x20m, 30 sec rest',
  '5x genomgång': '5x walkthroughs',
  'Armbågen fixerad vid sidan, kontrollerad rörelse': 'Elbow fixed at the side, controlled movement',
  'Liggande på mage, aktivera rotatorkuffen': 'Prone position, activate the rotator cuff',
  'Dra mot ansiktet, externa rotation i slutposition': 'Pull toward the face, external rotation at end range',
  'Liggande på sidan, försiktig stretch': 'Side-lying position, gentle stretch',
  'Kontrollerad excentrisk fas, partner eller maskin': 'Controlled eccentric phase, partner or machine',
  'Kontrollerad rörelse, aktivera hamstrings': 'Controlled movement, activate hamstrings',
  'Band runt knä, aktivera VMO': 'Band around knee, activate VMO',
  'Band runt knä bakom, skjut knäna framåt': 'Band behind knees, drive knees forward',
  'Full range of motion, kontrollera nedfasen': 'Full range of motion, control the lowering phase',
  'Progressera till instabil yta': 'Progress to an unstable surface',
  'Rita alfabetet med tårna': 'Draw the alphabet with your toes',
  'Gradvis progression, börja med kort hävarm': 'Gradual progression, start with a short lever',
  'Lyft underbenet, håll kvar i toppen': 'Lift the lower leg, pause at the top',
  'Bred ställning, aktivera adduktorer': 'Wide stance, activate adductors',
  'Aktivera core, håll ryggen neutral': 'Activate core, keep the spine neutral',
  'Pressa ländryggen mot golvet': 'Press the lower back into the floor',
  'Långsam, kontrollerad rörelse': 'Slow, controlled movement',
  'Band runt fingrarna, spreta ut': 'Band around fingers, spread them out',
  'Tennisboll eller grip trainer': 'Tennis ball or grip trainer',
  'Explosiv sidoförflyttning, stabil landning': 'Explosive lateral movement, stable landing',
  'Explosiv uppåt, mjuk landning': 'Explosive upward movement, soft landing',
  'Maximal intensitet, full återhämtning': 'Maximum intensity, full recovery',
  'Fokus på snabb respons från golvet': 'Focus on quick response from the floor',
  'Kraftfull rotation från höfterna': 'Powerful rotation from the hips',
  'Stående, enkelarms press med rotation': 'Standing single-arm press with rotation',
  'Olika mönster, fokus på snabba fötter': 'Different patterns, focus on quick feet',
  'Snabba vändningar, simulerar matchrörelser': 'Quick turns, simulates match movements',
  'Djup position, upprätthåll bålstabilitet': 'Deep position, maintain trunk stability',
  'Anti-rotation, stabil bål': 'Anti-rotation, stable trunk',
  strength: 'Strength',
  power: 'Power',
  endurance: 'Endurance',
  agility: 'Agility',
  mobility: 'Mobility',
  prevention: 'Prevention',
}

const phrase = (locale: AppLocale, value: string) => (
  locale === 'sv' ? value : ENGLISH_PHRASES[value] ?? value
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  wing: { sv: 'Ytter', en: 'Wing' },
  back: { sv: 'Vänster-/Högernia', en: 'Left/right back' },
  center_back: { sv: 'Mittnia', en: 'Center back' },
  pivot: { sv: 'Lansen', en: 'Pivot' },
}

const SIDE_LABELS: Record<string, Record<AppLocale, string>> = {
  left: { sv: 'Vänster', en: 'Left' },
  right: { sv: 'Höger', en: 'Right' },
  both: { sv: 'Båda', en: 'Both' },
  center: { sv: '', en: '' },
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
  allsvenskan: { sv: 'Allsvenskan', en: 'Allsvenskan' },
  handbollsligan: { sv: 'Handbollsligan', en: 'Handbollsligan' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  throwing_power: { sv: 'Skottstyrka', en: 'Throwing power' },
  sprint_speed: { sv: 'Sprintsnabbhet', en: 'Sprint speed' },
  jumping: { sv: 'Hoppkraft', en: 'Jump power' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  upper_body: { sv: 'Överkroppsstyrka', en: 'Upper-body strength' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  contact_strength: { sv: 'Kontaktstyrka', en: 'Contact strength' },
}

export function HandballDashboard({ settings }: HandballDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{text(locale, 'Handboll', 'Handball')}</CardTitle>
          <CardDescription>
            {t('handballNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const position = settings.position
  const positionProfile = HANDBALL_POSITION_PROFILES[position]
  const seasonPhase = HANDBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = HANDBALL_BENCHMARKS[position]

  // Get position display name with side
  const getPositionDisplay = () => {
    if (settings.positionSide && settings.positionSide !== 'center') {
      if (position === 'back') {
        return locale === 'sv'
          ? `${SIDE_LABELS[settings.positionSide]?.[locale]}nia`
          : `${SIDE_LABELS[settings.positionSide]?.[locale]} back`
      }
      return `${SIDE_LABELS[settings.positionSide]?.[locale]} ${POSITION_LABELS[position]?.[locale].toLowerCase()}`
    }
    return POSITION_LABELS[position]?.[locale]
  }

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

  // Get recommended exercises for position
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
                {settings.teamName || text(locale, 'Handboll', 'Handball')}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{getPositionDisplay()}</Badge>
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
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
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
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.throwingArm === 'right' ? text(locale, 'Höger', 'Right') : text(locale, 'Vänster', 'Left')}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'kastararm', 'throwing arm')}</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Yo-Yo IR1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Yo-Yo IR1</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.yoyoIR1Level,
                  benchmarks.elite.yoyoIR1Level,
                  benchmarks.good.yoyoIR1Level
                ))}>
                  {settings.benchmarks.yoyoIR1Level?.toFixed(1) ?? '-'}
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.yoyoIR1Level, benchmarks.elite.yoyoIR1Level) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.yoyoIR1Level}
              </div>
            </div>

            {/* Sprint 10m */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>10m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint10m,
                  benchmarks.elite.sprint10m,
                  benchmarks.good.sprint10m,
                  true
                ))}>
                  {settings.benchmarks.sprint10m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint10m, benchmarks.elite.sprint10m, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint10m} s
              </div>
            </div>

            {/* CMJ */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'CMJ hopp', 'CMJ jump')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.cmjHeight,
                  benchmarks.elite.cmjHeight,
                  benchmarks.good.cmjHeight
                ))}>
                  {settings.benchmarks.cmjHeight ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.cmjHeight, benchmarks.elite.cmjHeight) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.cmjHeight} cm
              </div>
            </div>

            {/* Medicine Ball */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Medicinboll', 'Medicine ball')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.medicineBallThrow,
                  benchmarks.elite.medicineBallThrow,
                  benchmarks.good.medicineBallThrow
                ))}>
                  {settings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.medicineBallThrow, benchmarks.elite.medicineBallThrow) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">
                {text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.medicineBallThrow} m
              </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

export default HandballDashboard
