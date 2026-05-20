'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
import {
  Trophy,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  Ruler,
} from 'lucide-react'
import type { VolleyballSettings } from '@/components/onboarding/VolleyballOnboarding'
import {
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  getPositionRecommendations,
} from '@/lib/training-engine/volleyball'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface VolleyballDashboardProps {
  settings: VolleyballSettings
}

type AppLocale = 'en' | 'sv'

const appLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const POSITION_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    setter: 'Setter',
    outside_hitter: 'Outside hitter',
    opposite_hitter: 'Opposite hitter',
    middle_blocker: 'Middle blocker',
    libero: 'Libero',
  },
  sv: {
    setter: 'Passare',
    outside_hitter: 'Vänsterspiker',
    opposite_hitter: 'Diagonal',
    middle_blocker: 'Centerblockare',
    libero: 'Libero',
  },
}

const PHASE_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    off_season: 'Off-season',
    pre_season: 'Pre-season',
    in_season: 'In-season',
    playoffs: 'Playoffs',
  },
  sv: {
    off_season: 'Off-season',
    pre_season: 'Försäsong',
    in_season: 'Säsong',
    playoffs: 'Slutspel',
  },
}

const LEAGUE_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    recreational: 'Recreational',
    division_3: 'Division 3',
    division_2: 'Division 2',
    division_1: 'Division 1',
    elitserien: 'Elitserien',
    ssl: 'Svenska Superligan',
  },
  sv: {
    recreational: 'Korpen/Motion',
    division_3: 'Division 3',
    division_2: 'Division 2',
    division_1: 'Division 1',
    elitserien: 'Elitserien',
    ssl: 'Svenska Superligan',
  },
}

const STRENGTH_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    vertical_jump: 'Vertical jumping ability',
    spike_power: 'Spike power',
    blocking: 'Blocking technique',
    serving: 'Serving',
    reception: 'Reception',
    defense: 'Defense',
    court_vision: 'Court vision',
    agility: 'Agility',
  },
  sv: {
    vertical_jump: 'Vertikal hoppförmåga',
    spike_power: 'Slagstyrka',
    blocking: 'Blockteknik',
    serving: 'Serve',
    reception: 'Mottagning',
    defense: 'Försvarsspel',
    court_vision: 'Spelförståelse',
    agility: 'Kvickhet',
  },
}

const ENGLISH_PHRASES: Record<string, string> = {
  'Spelets dirigent som sätter upp bollar för anfall. Kräver utmärkt bollkänsla, snabb reaktion och god spelförståelse.': 'The floor leader who sets up attacks. Requires excellent ball feel, quick reactions, and strong court vision.',
  'Primär anfallare från vänster sida. Allsidig spelare som både anfaller och försvarar. Kräver explosiv hoppkraft och stark axel.': 'Primary attacker from the left side. A versatile player who attacks and defends. Requires explosive jump power and a strong shoulder.',
  'Kraftfull anfallare från höger sida. Ofta lagets främsta poängplockare med fokus på anfall snarare än försvar.': "Powerful attacker from the right side. Often the team's top scorer, with more focus on attack than defense.",
  'Specialist på block och snabba anfall i mitten. Kräver timing, reaktionssnabbhet och maximal vertikal kraft.': 'Specialist in blocks and quick middle attacks. Requires timing, reaction speed, and maximal vertical power.',
  'Defensiv specialist som inte hoppar för anfall. Fokus på mottagning och försvar. Kräver utmärkt läsförmåga och reaktionssnabbhet.': 'Defensive specialist who does not jump to attack. Focuses on reception and defense. Requires excellent reading ability and reaction speed.',
  Kvickhet: 'Agility',
  Fingerflexibilitet: 'Finger flexibility',
  Reaktionssnabbhet: 'Reaction speed',
  Balans: 'Balance',
  Uthållighet: 'Endurance',
  'Vertikal hoppförmåga': 'Vertical jump ability',
  Axelstyrka: 'Shoulder strength',
  Explosivitet: 'Explosiveness',
  Mottagningsförmåga: 'Reception ability',
  'Maximal hoppkraft': 'Maximal jump power',
  Slagstyrka: 'Spike power',
  Blockförmåga: 'Blocking ability',
  'Core-styrka': 'Core strength',
  Timing: 'Timing',
  Sidledssnabbhet: 'Lateral speed',
  Räckvidd: 'Reach',
  Läsförmåga: 'Reading ability',
  Smidighet: 'Mobility',
  Maxstyrka: 'Maximum strength',
  'Vertikal kraft': 'Vertical power',
  'Aerob bas': 'Aerobic base',
  Skadeförebyggande: 'Injury prevention',
  Teknikutveckling: 'Technique development',
  'Explosiv kraft': 'Explosive power',
  Hoppträning: 'Jump training',
  'Volleybollspecifik kondition': 'Volleyball-specific conditioning',
  Lagspel: 'Team play',
  Styrkeunderhåll: 'Strength maintenance',
  Hoppunderhåll: 'Jump maintenance',
  Återhämtning: 'Recovery',
  Matchprestation: 'Match performance',
  'Maximal återhämtning': 'Maximal recovery',
  'Peak performance': 'Peak performance',
  'Mental förberedelse': 'Mental preparation',
  'Taktisk perfektion': 'Tactical precision',
  'Hypertrofi och maxstyrka med fokus på benpress och olympiska lyft': 'Hypertrophy and maximum strength with a focus on leg press and Olympic lifts',
  'Aerob basträning och gradvis uppbyggnad av hoppkapacitet': 'Aerobic base training and gradual jump-capacity build-up',
  'Kraftutveckling och plyometrics för maximal hoppförmåga': 'Power development and plyometrics for maximal jumping ability',
  'Intervallträning och volleybollspecifika övningar': 'Interval training and volleyball-specific drills',
  'Underhåll av styrka och explosivitet med låg volym': 'Strength and explosiveness maintenance with low volume',
  'Matchspecifik kondition genom träning och matcher': 'Match-specific conditioning through practices and matches',
  'Minimalt underhåll för att bevara explosivitet': 'Minimal maintenance to preserve explosiveness',
  'Endast matchspecifik aktivitet och aktiv återhämtning': 'Only match-specific activity and active recovery',
  Styrka: 'Strength',
  Rotatorkuff: 'Rotator cuff',
  Stabilitet: 'Stability',
  Mobilitet: 'Mobility',
  Rehab: 'Rehab',
  Kontroll: 'Control',
  Excentrisk: 'Eccentric',
  Reaktion: 'Reaction',
  Teknik: 'Technique',
  Power: 'Power',
  Plyometrics: 'Plyometrics',
  '3x12 per arm': '3x12 per arm',
  '2x10 per position': '2x10 per position',
  '3x30s per sida': '3x30s per side',
  '3x8 per ben': '3x8 per leg',
  '3x10 per ben': '3x10 per leg',
  '3x30s per ben': '3x30s per leg',
  '2 set per fot': '2 sets per foot',
  '3x12 per riktning': '3x12 per direction',
  '3x15 per ben': '3x15 per leg',
  '2x10s per finger': '2x10s per finger',
  '2x10 per hand': '2x10 per hand',
  '3x8 per sida': '3x8 per side',
  'Fokus på skulderbladsretraction': 'Focus on scapular retraction',
  'Med band eller lätt vikt': 'With a band or light weight',
  'Liggande på mage': 'Prone position',
  'Försiktig stretch': 'Gentle stretch',
  'Kontrollerad excentrisk fas': 'Controlled eccentric phase',
  'Fokus på knäkontroll': 'Focus on knee control',
  'Med band runt knät': 'With band around the knee',
  'Långsam kontrollerad rörelse': 'Slow controlled movement',
  'Progression: blunda, instabil yta': 'Progression: eyes closed, unstable surface',
  'Rita alla bokstäver': 'Draw every letter',
  'Knäna över tårna': 'Knees over toes',
  'Vid 70 graders knävinkel': 'At a 70-degree knee angle',
  'Med band runt knäna': 'With band around the knees',
  'Långsam excentrisk fas': 'Slow eccentric phase',
  '3s upp, 3s ner': '3s up, 3s down',
  'Med gummiband runt fingrarna': 'With a rubber band around the fingers',
  'Med tennisboll': 'With a tennis ball',
  'Flexion och extension': 'Flexion and extension',
  'Med boll och partner': 'With ball and partner',
  'Fokus på snabb reaktion': 'Focus on quick reaction',
  'Med full ansats': 'With full approach',
  Rotationskast: 'Rotational throws',
  'Minimal markkontakttid': 'Minimal ground-contact time',
  'Laterala blockhopp': 'Lateral block jumps',
  'Sidledes sedan hopp': 'Shuffle then jump',
  'Minimal vila mellan hopp': 'Minimal rest between jumps',
  'Kontrollerade dykningar': 'Controlled dives',
  'Stege eller konor': 'Ladder or cones',
  'I defensiv position': 'In defensive position',
  Reaktionsträning: 'Reaction training',
  Dykträning: 'Dive training',
}

const phrase = (locale: AppLocale, value: string) => (
  locale === 'sv' ? value : ENGLISH_PHRASES[value] ?? value
)

export function VolleyballDashboard({ settings }: VolleyballDashboardProps) {
  const t = useTranslations('components.athleteDashboard')
  const locale = appLocale(useLocale())
  const text = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const positionLabels = POSITION_LABELS[locale]
  const phaseLabels = PHASE_LABELS[locale]
  const leagueLabels = LEAGUE_LABELS[locale]
  const strengthLabels = STRENGTH_LABELS[locale]

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{text('Volleyboll', 'Volleyball')}</CardTitle>
          <CardDescription>
            {t('volleyballNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const position = settings.position
  const positionProfile = VOLLEYBALL_POSITION_PROFILES[position]
  const seasonPhase = VOLLEYBALL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = VOLLEYBALL_BENCHMARKS[position]

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
                <Trophy className="h-5 w-5 text-yellow-500" />
                {settings.teamName || text('Volleyboll', 'Volleyball')}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{positionLabels[position]}</Badge>
                <Badge variant="secondary">{leagueLabels[settings.leagueLevel]}</Badge>
                <Badge className="bg-yellow-500">{phaseLabels[settings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{settings.yearsPlaying}</div>
              <div className="text-xs text-muted-foreground">{text('års erfarenhet', 'years experience')}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">{text('cm längd', 'cm height')}</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.spikeHeight ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{settings.blockHeight ?? '-'}</div>
              <div className="text-xs text-muted-foreground">cm block</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">{text('träning/v', 'sessions/wk')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            {phaseLabels[settings.seasonPhase]} - {text('Träningsfokus', 'Training focus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">{text('Fokusområden:', 'Focus areas:')}</h4>
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
                <div className="text-xs text-muted-foreground mb-1">{text('Styrka', 'Strength')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.strengthEmphasis)}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">{text('Kondition', 'Conditioning')}</div>
                <div className="text-sm">{phrase(locale, seasonPhase.conditioningEmphasis)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jump Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-red-500" />
            {text('Hopptester', 'Jump tests')} - {positionLabels[position]}
          </CardTitle>
          <CardDescription>{text('Dina resultat jämfört med elitnivå', 'Your results compared with elite level')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text('Vertikalhopp', 'Vertical jump')}</span>
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
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.verticalJump} cm</div>
            </div>

            {/* Spike Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text('Smash-hopp', 'Spike jump')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.spikeJump,
                  benchmarks.elite.spikeJump!,
                  benchmarks.good.spikeJump!
                ))}>
                  {settings.benchmarks.spikeJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.spikeJump, benchmarks.elite.spikeJump!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.spikeJump} cm</div>
            </div>

            {/* Block Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text('Block-hopp', 'Block jump')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.blockJump,
                  benchmarks.elite.blockJump!,
                  benchmarks.good.blockJump!
                ))}>
                  {settings.benchmarks.blockJump ?? '-'} cm
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.blockJump, benchmarks.elite.blockJump!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.blockJump} cm</div>
            </div>

            {/* T-Test Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>T-test agility</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.agilityTTest,
                  benchmarks.elite.agilityTTest!,
                  benchmarks.good.agilityTTest!,
                  true
                ))}>
                  {settings.benchmarks.agilityTTest?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.agilityTTest, benchmarks.elite.agilityTTest!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.agilityTTest} s</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text('Knäböj', 'Squat')}</span>
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
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.squat} kg</div>
            </div>

            {/* Power Clean */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Power clean</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.powerClean,
                  benchmarks.elite.powerClean!,
                  benchmarks.good.powerClean!
                ))}>
                  {settings.benchmarks.powerClean ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.powerClean, benchmarks.elite.powerClean!) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text('Elit', 'Elite')}: {benchmarks.elite.powerClean} kg</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {text('Positionsprofil', 'Position profile')}: {positionLabels[position] || positionProfile.displayName}
          </CardTitle>
          <CardDescription>{phrase(locale, positionProfile.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text('Hopp/set', 'Jumps/set')}</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerSet.min}-{positionProfile.avgJumpsPerSet.max}
              </div>
            </div>
            <div>
                <div className="text-sm text-muted-foreground mb-1">{text('Hopp/match', 'Jumps/match')}</div>
              <div className="font-medium">
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            {position !== 'libero' && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">{text('Smash-höjd', 'Spike height')}</div>
                <div className="font-medium">
                  +{positionProfile.avgSpikeHeight.min}-{positionProfile.avgSpikeHeight.max} cm
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">{text('Nyckelegenskaper:', 'Key attributes:')}</div>
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
            {text('Rekommenderade övningar', 'Recommended exercises')}
          </CardTitle>
          <CardDescription>{text('Baserat på din position och skadehistorik', 'Based on your position and injury history')}</CardDescription>
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
              {text('Dina styrkor', 'Your strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.strengthFocus.map((strength) => (
                <Badge key={strength} variant="secondary">
                  {strengthLabels[strength] || strength}
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

export default VolleyballDashboard
