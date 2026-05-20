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
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
} from 'lucide-react'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import { MatchScheduleWidget } from './MatchScheduleWidget'

interface HockeyDashboardProps {
  settings: HockeySettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  center: { sv: 'Center', en: 'Center' },
  wing: { sv: 'Forward (Wing)', en: 'Forward (Wing)' },
  defense: { sv: 'Back', en: 'Defense' },
  goalie: { sv: 'Målvakt', en: 'Goalie' },
}

const LEAGUE_LABELS: Record<string, Record<AppLocale, string>> = {
  recreational: { sv: 'Motionshockey', en: 'Recreational hockey' },
  junior: { sv: 'Junior', en: 'Junior' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  hockeyettan: { sv: 'Hockeyettan', en: 'Hockeyettan' },
  hockeyallsvenskan: { sv: 'Hockeyallsvenskan', en: 'Hockeyallsvenskan' },
  shl: { sv: 'SHL', en: 'SHL' },
}

const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const PLAYSTYLE_LABELS: Record<string, Record<AppLocale, string>> = {
  offensive: { sv: 'Offensiv', en: 'Offensive' },
  defensive: { sv: 'Defensiv', en: 'Defensive' },
  two_way: { sv: 'Tvåvägsspelare', en: 'Two-way player' },
  physical: { sv: 'Fysisk', en: 'Physical' },
  skill: { sv: 'Teknisk', en: 'Skill' },
}

const STRENGTH_LABELS: Record<string, Record<AppLocale, string>> = {
  skating_speed: { sv: 'Skridskohastighet', en: 'Skating speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  shot_power: { sv: 'Skottstyrka', en: 'Shot power' },
  physical_battles: { sv: 'Fysiska dueller', en: 'Physical battles' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  upper_body: { sv: 'Överkroppsstyrka', en: 'Upper-body strength' },
}

const WEAKNESS_LABELS: Record<string, Record<AppLocale, string>> = {
  skating_technique: { sv: 'Skridskoteknik', en: 'Skating technique' },
  backwards_skating: { sv: 'Baklängesåkning', en: 'Backward skating' },
  shot_accuracy: { sv: 'Skottaccuracy', en: 'Shot accuracy' },
  faceoffs: { sv: 'Tekningar', en: 'Faceoffs' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  puck_handling: { sv: 'Puckhantering', en: 'Puck handling' },
  passing: { sv: 'Passningar', en: 'Passing' },
  defensive_play: { sv: 'Defensivt spel', en: 'Defensive play' },
}

const INJURY_LABELS: Record<string, Record<AppLocale, string>> = {
  groin: { sv: 'Ljumske', en: 'Groin' },
  hip: { sv: 'Höft', en: 'Hip' },
  knee: { sv: 'Knä', en: 'Knee' },
  shoulder: { sv: 'Axel', en: 'Shoulder' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  back: { sv: 'Rygg', en: 'Back' },
  concussion: { sv: 'Hjärnskakning', en: 'Concussion' },
  wrist_hand: { sv: 'Handled/hand', en: 'Wrist/hand' },
}

// Season phase colors and recommendations
const PHASE_INFO: Record<string, { color: string; icon: typeof Flame; focus: Record<AppLocale, string[]> }> = {
  off_season: {
    color: 'bg-blue-500',
    icon: Flame,
    focus: {
      sv: ['Bygg aerob bas', 'Maxstyrka', 'Rörlighet', 'Vila och återhämtning'],
      en: ['Build aerobic base', 'Maximum strength', 'Mobility', 'Rest and recovery'],
    },
  },
  pre_season: {
    color: 'bg-orange-500',
    icon: Zap,
    focus: {
      sv: ['Sport-specifik kondition', 'Explosivitet', 'Isteknik', 'Lagspel'],
      en: ['Sport-specific conditioning', 'Explosiveness', 'On-ice technique', 'Team play'],
    },
  },
  in_season: {
    color: 'bg-green-500',
    icon: Target,
    focus: {
      sv: ['Underhåll styrka', 'Återhämtning', 'Matchförberedelse', 'Skadeförebyggande'],
      en: ['Maintain strength', 'Recovery', 'Match preparation', 'Injury prevention'],
    },
  },
  playoffs: {
    color: 'bg-purple-500',
    icon: Trophy,
    focus: {
      sv: ['Maximal återhämtning', 'Mental fokus', 'Lätt aktivering', 'Toppform'],
      en: ['Maximal recovery', 'Mental focus', 'Light activation', 'Peak form'],
    },
  },
}

import { Trophy } from 'lucide-react'

export function HockeyDashboard({ settings }: HockeyDashboardProps) {
  const locale = getAppLocale(useLocale())
  const t = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{text(locale, 'Ishockey', 'Ice hockey')}</CardTitle>
          <CardDescription>
            {t('hockeyNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const phaseInfo = PHASE_INFO[settings.seasonPhase]
  const PhaseIcon = phaseInfo?.icon || Flame

  // Calculate average shift length
  const avgShiftLength = settings.averageIceTimeMinutes && settings.shiftsPerGame
    ? Math.round((settings.averageIceTimeMinutes * 60) / settings.shiftsPerGame)
    : null

  return (
    <div className="space-y-6">
      {/* Header with Position & Team */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {settings.teamName || text(locale, 'Mitt lag', 'My team')}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{POSITION_LABELS[settings.position]?.[locale] || settings.position}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel]?.[locale] || settings.leagueLevel}</Badge>
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
            <PhaseIcon className={`h-5 w-5 ${phaseInfo?.color.replace('bg-', 'text-')}`} />
            {text(locale, 'Säsongsfas:', 'Season phase:')} {PHASE_LABELS[settings.seasonPhase]?.[locale]}
          </CardTitle>
          <CardDescription>
            {text(locale, 'Anpassad träning för din nuvarande fas', 'Training adapted to your current phase')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{text(locale, 'Säsongsframsteg', 'Season progress')}</span>
              <span>{PHASE_LABELS[settings.seasonPhase]?.[locale]}</span>
            </div>
            <div className="flex gap-1">
              {['off_season', 'pre_season', 'in_season', 'playoffs'].map((phase) => (
                <div
                  key={phase}
                  className={`h-2 flex-1 rounded-full ${
                    settings.seasonPhase === phase
                      ? phaseInfo?.color || 'bg-primary'
                      : ['off_season', 'pre_season', 'in_season', 'playoffs'].indexOf(phase) <=
                        ['off_season', 'pre_season', 'in_season', 'playoffs'].indexOf(settings.seasonPhase)
                      ? 'bg-muted-foreground/30'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Focus areas for current phase */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{text(locale, 'Fokusområden denna fas:', 'Focus areas this phase:')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {phaseInfo?.focus[locale].map((focus, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {focus}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ice Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text(locale, 'Istid/match', 'Ice time/game')}</p>
                <p className="text-2xl font-bold">
                  {settings.averageIceTimeMinutes ?? '-'}
                  <span className="text-sm font-normal text-muted-foreground"> min</span>
                </p>
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text(locale, 'Byten/match', 'Shifts/game')}</p>
                <p className="text-2xl font-bold">
                  {settings.shiftsPerGame ?? '-'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text(locale, 'Snitt byteslängd', 'Average shift length')}</p>
                <p className="text-2xl font-bold">
                  {avgShiftLength ?? '-'}
                  <span className="text-sm font-normal text-muted-foreground"> {text(locale, 'sek', 'sec')}</span>
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Play Style & Training Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Play Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              {text(locale, 'Spelstil', 'Play style')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`text-lg py-2 px-4 ${
              settings.playStyle === 'offensive' ? 'bg-red-500' :
              settings.playStyle === 'defensive' ? 'bg-blue-500' :
              settings.playStyle === 'physical' ? 'bg-orange-500' :
              settings.playStyle === 'skill' ? 'bg-purple-500' :
              'bg-green-500'
            }`}>
              {PLAYSTYLE_LABELS[settings.playStyle]?.[locale]}
            </Badge>

            {/* Position-specific training tips */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">{text(locale, 'Positionsspecifik träning:', 'Position-specific training:')}</h4>
              {settings.position === 'goalie' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {text(locale, 'Höftflexibilitet och lateral push', 'Hip flexibility and lateral push')}</li>
                  <li>• {text(locale, 'Reaktionsträning', 'Reaction training')}</li>
                  <li>• {text(locale, 'Core-stabilitet i alla positioner', 'Core stability in all positions')}</li>
                </ul>
              ) : settings.position === 'defense' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {text(locale, 'Aerob uthållighet för längre byten', 'Aerobic endurance for longer shifts')}</li>
                  <li>• {text(locale, 'Överkroppsstyrka för dueller', 'Upper-body strength for battles')}</li>
                  <li>• {text(locale, 'Baklängesåkning och pivotering', 'Backward skating and pivoting')}</li>
                </ul>
              ) : settings.position === 'center' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {text(locale, 'Core-styrka för tekningar', 'Core strength for faceoffs')}</li>
                  <li>• {text(locale, 'Tvåvägskondition', 'Two-way conditioning')}</li>
                  <li>• {text(locale, 'Snabb riktningsförändring', 'Quick changes of direction')}</li>
                </ul>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {text(locale, 'Explosiv acceleration', 'Explosive acceleration')}</li>
                  <li>• {text(locale, 'Skottstyrka och teknik', 'Shot power and technique')}</li>
                  <li>• {text(locale, 'Sprint-återhämtning', 'Sprint recovery')}</li>
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strength Focus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              {text(locale, 'Styrkor & Fokus', 'Strengths & Focus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{text(locale, 'Styrkor att bygga vidare på:', 'Strengths to build on:')}</h4>
                <div className="flex flex-wrap gap-2">
                  {settings.strengthFocus.map((strength) => (
                    <Badge key={strength} variant="outline" className="bg-green-500/10 border-green-500">
                      {STRENGTH_LABELS[strength]?.[locale] || strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {settings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{text(locale, 'Utvecklingsområden:', 'Development areas:')}</h4>
                <div className="flex flex-wrap gap-2">
                  {settings.weaknesses.map((weakness) => (
                    <Badge key={weakness} variant="outline" className="bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[weakness]?.[locale] || weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {settings.strengthFocus.length === 0 && settings.weaknesses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {text(locale, 'Inga styrkor eller utvecklingsområden valda ännu.', 'No strengths or development areas selected yet.')}
              </p>
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
              {text(locale, 'Skadehistorik att ta hänsyn till', 'Injury history to account for')}
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
              {text(locale, 'Träningsprogrammet inkluderar förebyggande övningar för dessa områden.', 'The training program includes preventive exercises for these areas.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Matches */}
      <MatchScheduleWidget />

      {/* Training Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {text(locale, 'Träningsrekommendationer', 'Training recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{text(locale, 'Off-ice träning', 'Off-ice training')}</h4>
              <div className="flex items-center gap-2 text-2xl font-bold">
                {settings.weeklyOffIceSessions}
                <span className="text-sm font-normal text-muted-foreground">{text(locale, 'pass/vecka', 'sessions/week')}</span>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{text(locale, 'Tillgång', 'Access')}</h4>
              <div className="flex gap-2">
                {settings.hasAccessToIce && (
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500">
                    {text(locale, 'Istid', 'Ice time')}
                  </Badge>
                )}
                {settings.hasAccessToGym && (
                  <Badge variant="outline" className="bg-green-500/10 border-green-500">
                    🏋️ Gym
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HockeyDashboard
