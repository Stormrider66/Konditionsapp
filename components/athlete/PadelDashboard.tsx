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
  Users,
} from 'lucide-react'
import type { PadelSettings } from '@/components/onboarding/PadelOnboarding'
import {
  PADEL_POSITION_PROFILES,
  PADEL_SEASON_PHASES,
  PADEL_BENCHMARKS,
  getPositionRecommendations,
  getPartnerSynergyTips,
} from '@/lib/training-engine/padel'

interface PadelDashboardProps {
  settings: PadelSettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const ENGLISH_PHRASES: Record<string, string> = {
  'Offensiv spelare som dominerar med forehand från högersidan. Ansvarar för avslut och smash. Kräver explosiv kraft och aggressivt spel.': 'Offensive player who dominates with forehand from the right side. Responsible for finishing and smashes. Requires explosive power and aggressive play.',
  'Strategisk spelare som styr spelet från vänstersidan. Stark backhand och utmärkt läsförmåga. Fokus på placering och lobbar.': 'Strategic player who controls play from the left side. Strong backhand and excellent reading ability. Focuses on placement and lobs.',
  'Flexibel spelare som kan spela båda sidorna effektivt. Anpassar sig efter partner och motståndarpar. Taktiskt mångsidig.': 'Flexible player who can play both sides effectively. Adapts to partner and opponents. Tactically versatile.',
  Explosivitet: 'Explosiveness',
  Smashkraft: 'Smash power',
  Forehandstyrka: 'Forehand strength',
  Reaktionssnabbhet: 'Reaction speed',
  'Vertikalt hopp': 'Vertical jump',
  Spelförståelse: 'Game understanding',
  Backhandstyrka: 'Backhand strength',
  Uthållighet: 'Endurance',
  Positionering: 'Positioning',
  'Lateralt snabbhet': 'Lateral speed',
  Mångsidighet: 'Versatility',
  Anpassningsförmåga: 'Adaptability',
  Kondition: 'Conditioning',
  'Taktisk förståelse': 'Tactical understanding',
  Balans: 'Balance',
  'Höger sida, fokus på nätspel och smash': 'Right side, focused on net play and smash',
  'Vänster sida, täcker mittplan och lobbar': 'Left side, covers the middle and lobs',
  'Hela banan, flexibel positionering': 'Whole court, flexible positioning',
  Grundstyrka: 'Base strength',
  'Aerob bas': 'Aerobic base',
  Skadeförebyggande: 'Injury prevention',
  Teknikutveckling: 'Technique development',
  Rörlighet: 'Mobility',
  'Explosiv kraft': 'Explosive power',
  'Padelspecifik kondition': 'Padel-specific conditioning',
  Matchsimulering: 'Match simulation',
  Partnerspel: 'Partner play',
  Styrkeunderhåll: 'Strength maintenance',
  Återhämtning: 'Recovery',
  Matchförberedelse: 'Match preparation',
  'Taktisk anpassning': 'Tactical adaptation',
  'Peak performance': 'Peak performance',
  'Mental förberedelse': 'Mental preparation',
  'Taktisk perfektion': 'Tactical precision',
  'Maximal återhämtning': 'Maximal recovery',
  'Hypertrofi och maxstyrka med fokus på bål, axlar och ben': 'Hypertrophy and maximum strength focused on trunk, shoulders, and legs',
  'Aerob basträning och gradvis uppbyggnad av intensitet': 'Aerobic base training and gradual intensity build-up',
  'Kraftutveckling och rotationsstyrka för slag': 'Power development and rotational strength for shots',
  'Intervallträning och padelspecifika löpövningar': 'Interval training and padel-specific running drills',
  'Underhåll av styrka och explosivitet med låg volym': 'Strength and explosiveness maintenance with low volume',
  'Matchspecifik kondition och aktiv återhämtning': 'Match-specific conditioning and active recovery',
  'Endast aktiveringsövningar och lätt underhåll': 'Activation drills and light maintenance only',
  'Lätt rörelse och återhämtning mellan matcher': 'Light movement and recovery between matches',
  Rotatorkuff: 'Rotator cuff',
  Mobilitet: 'Mobility',
  Stabilitet: 'Stability',
  Styrka: 'Strength',
  Rehab: 'Rehab',
  Core: 'Core',
  'Anti-rotation': 'Anti-rotation',
  Kontroll: 'Control',
  Power: 'Power',
  Plyometrics: 'Plyometrics',
  Kvickhet: 'Agility',
  Reaktion: 'Reaction',
  'External rotation med band': 'Band external rotation',
  Greppträning: 'Grip training',
  'Greppträning med boll': 'Ball grip training',
  'Smash-hopp med medicinboll': 'Medicine ball smash jumps',
  Rotationskast: 'Rotational throws',
  '3x15 per arm': '3x15 per arm',
  '3x30s per sida': '3x30s per side',
  '3x12 per riktning': '3x12 per direction',
  '3x10 per sida': '3x10 per side',
  '3x8 per ben': '3x8 per leg',
  '3x30s per ben': '3x30s per leg',
  '3x12 per sida': '3x12 per side',
  '3x8 per sida': '3x8 per side',
  '3x8 per riktning': '3x8 per direction',
  'Armbågen vid sidan': 'Elbow at the side',
  'Försiktig posterior kapselstretch': 'Gentle posterior capsule stretch',
  'Fokus på scapula protraction': 'Focus on scapular protraction',
  'Hög kabel, utåtrotation': 'High cable, external rotation',
  'Både flexion och extension': 'Both flexion and extension',
  'Långsam excentrisk fas': 'Slow eccentric phase',
  'Med lätt vikt': 'With light weight',
  'Variera greppstyrka': 'Vary grip strength',
  'Kontrollerad rörelse': 'Controlled movement',
  'Ryggen i golvet': 'Back on the floor',
  'Flödande rörelse': 'Flowing movement',
  'Kontrollerad anti-rotation': 'Controlled anti-rotation',
  'Fokus på knäkontroll': 'Focus on knee control',
  'Padelspecifik rörelse': 'Padel-specific movement',
  'Med band': 'With band',
  Kontrollerad: 'Controlled',
  'Progressivt instabilt underlag': 'Progressively unstable surface',
  'Band runt fotleder': 'Band around ankles',
  'Full ROM': 'Full ROM',
  'Försiktig stretch': 'Gentle stretch',
  'Kläm och släpp': 'Squeeze and release',
  Höftrotation: 'Hip rotation',
  Halvknästående: 'Half-kneeling',
  'Gluteus medius': 'Gluteus medius',
  'Simulera smashrörelse': 'Simulate smash motion',
  'Forehand-specifik': 'Forehand-specific',
  'Backhand-specifik': 'Backhand-specific',
  Sidledsrörelse: 'Lateral movement',
  'Korta pauser': 'Short rests',
  'Alla plan': 'All planes',
  'Varierade mönster': 'Varied patterns',
  'Följ partnerns rörelser': 'Follow your partner movements',
  'Kommunicera tydligt med din partner om vem som tar lobben': 'Communicate clearly with your partner about who takes the lob',
  'Var beredd att täcka mitten när din partner går för smash': 'Be ready to cover the middle when your partner goes for a smash',
  'Fokusera på att avsluta poäng när du får chansen vid nätet': 'Focus on finishing points when you get the chance at the net',
  'Håll koll på motståndarnas positioner för att hitta öppningar': 'Track opponent positions to find openings',
  'Styr tempot i spelet och diktera var bollen ska gå': 'Control the pace and dictate where the ball should go',
  'Var beredd att täcka hela vänster sida inklusive lobbar': 'Be ready to cover the entire left side including lobs',
  'Kommunicera med din partner om positionsbyten': 'Communicate with your partner about position switches',
  'Använd lobbar strategiskt för att skapa tid': 'Use lobs strategically to create time',
  'Anpassa ditt spel efter din partners styrkor': 'Adapt your game to your partner strengths',
  'Var flexibel med sidbyten under matchen': 'Stay flexible with side switches during the match',
  'Kommunicera konstant om vem som tar vilken boll': 'Communicate constantly about who takes each ball',
  'Utnyttja din mångsidighet för att överraska motståndarna': 'Use your versatility to surprise opponents',
}

const phrase = (locale: AppLocale, value: string) => (
  locale === 'sv' ? value : ENGLISH_PHRASES[value] ?? value
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  right_side: { sv: 'Högersida', en: 'Right side' },
  left_side: { sv: 'Vänstersida', en: 'Left side' },
  all_court: { sv: 'Allround', en: 'All-court' },
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  tournament: { sv: 'Turnering', en: 'Tournament' },
}

const LEAGUE_LABELS: Record<string, Record<AppLocale, string>> = {
  recreational: { sv: 'Motionsspelare', en: 'Recreational player' },
  club: { sv: 'Klubbspelare', en: 'Club player' },
  division_4: { sv: 'Division 4', en: 'Division 4' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  padel_tour: { sv: 'Padel Tour', en: 'Padel Tour' },
  wpt: { sv: 'World Padel Tour', en: 'World Padel Tour' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  smash: { sv: 'Smash', en: 'Smash' },
  bandeja: { sv: 'Bandeja', en: 'Bandeja' },
  vibora: { sv: 'Víbora', en: 'Vibora' },
  lob: { sv: 'Lobb', en: 'Lob' },
  forehand: { sv: 'Forehand', en: 'Forehand' },
  backhand: { sv: 'Backhand', en: 'Backhand' },
  volley: { sv: 'Volley', en: 'Volley' },
  movement: { sv: 'Rörelse/Fotwork', en: 'Movement/footwork' },
  wall_play: { sv: 'Väggspel', en: 'Wall play' },
  mental: { sv: 'Mental styrka', en: 'Mental strength' },
}

export function PadelDashboard({ settings }: PadelDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Padel</CardTitle>
          <CardDescription>
            {t('padelNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const position = settings.position
  const positionProfile = PADEL_POSITION_PROFILES[position]
  const seasonPhase = PADEL_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = PADEL_BENCHMARKS[position]

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

  // Get partner synergy tips
  const partnerTips = getPartnerSynergyTips(position, locale)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-500" />
                {settings.clubName || 'Padel'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]?.[locale]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]?.[locale]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[settings.seasonPhase]?.[locale]}</Badge>
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
              <Ruler className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{settings.height ?? '-'}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'cm längd', 'cm height')}</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold">{settings.smashSpeed ?? '-'}</div>
              <div className="text-xs text-muted-foreground">km/h smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold">{settings.matchesPerWeek}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'matcher/v', 'matches/wk')}</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{settings.weeklyTrainingSessions}</div>
              <div className="text-xs text-muted-foreground">{text(locale, 'träning/v', 'sessions/wk')}</div>
            </div>
          </div>
          {settings.preferredPartner && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{text(locale, 'Partner:', 'Partner:')} {settings.preferredPartner}</span>
            </div>
          )}
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

      {/* Speed Benchmarks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-blue-500" />
            {text(locale, 'Fysiska tester', 'Physical tests')} - {POSITION_LABELS[position]?.[locale]}
          </CardTitle>
          <CardDescription>{text(locale, 'Dina resultat jämfört med elitnivå', 'Your results compared with elite level')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 5m Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>5m sprint</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.sprint5m,
                  benchmarks.elite.sprint5m!,
                  benchmarks.good.sprint5m!,
                  true
                ))}>
                  {settings.benchmarks.sprint5m?.toFixed(2) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.sprint5m, benchmarks.elite.sprint5m!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.sprint5m} s</div>
            </div>

            {/* Spider Drill */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Spider drill</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.agilitySpider,
                  benchmarks.elite.agilitySpider!,
                  benchmarks.good.agilitySpider!,
                  true
                ))}>
                  {settings.benchmarks.agilitySpider?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.agilitySpider, benchmarks.elite.agilitySpider!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.agilitySpider} s</div>
            </div>

            {/* Lateral Shuffle */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lateral shuffle</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.lateralShuffle,
                  benchmarks.elite.lateralShuffle!,
                  benchmarks.good.lateralShuffle!,
                  true
                ))}>
                  {settings.benchmarks.lateralShuffle?.toFixed(1) ?? '-'} s
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.lateralShuffle, benchmarks.elite.lateralShuffle!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.lateralShuffle} s</div>
            </div>

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

            {/* Reaction Time */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Reaktionstid', 'Reaction time')}</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.reactionTime,
                  benchmarks.elite.reactionTime!,
                  benchmarks.good.reactionTime!,
                  true
                ))}>
                  {settings.benchmarks.reactionTime ?? '-'} ms
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.reactionTime, benchmarks.elite.reactionTime!, true) ?? 0}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground">{text(locale, 'Elit:', 'Elite:')} {benchmarks.elite.reactionTime} ms</div>
            </div>

            {/* Yo-Yo */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Rallys/set', 'Rallies/set')}</div>
              <div className="font-medium">
                {positionProfile.avgRalliesPerSet.min}-{positionProfile.avgRalliesPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Poäng/match', 'Points/match')}</div>
              <div className="font-medium">
                {positionProfile.avgPointsPerMatch.min}-{positionProfile.avgPointsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">{text(locale, 'Bantäckning', 'Court coverage')}</div>
              <div className="font-medium text-sm">
                {phrase(locale, positionProfile.courtCoverage)}
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

      {/* Partner Synergy Tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-500" />
            {text(locale, 'Partnerspelets tips', 'Partner play tips')}
          </CardTitle>
          <CardDescription>{text(locale, 'Tips för bättre samspel med din partner', 'Tips for better teamwork with your partner')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {partnerTips.map((tip, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-500 mt-1">-</span>
                <span>{phrase(locale, tip)}</span>
              </li>
            ))}
          </ul>
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
              <Zap className="h-4 w-4 text-blue-500" />
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
    </div>
  )
}

export default PadelDashboard
