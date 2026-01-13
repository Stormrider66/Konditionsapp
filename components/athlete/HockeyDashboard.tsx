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
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'

interface HockeyDashboardProps {
  settings: HockeySettings
  // Match schedule can be added later when API is ready
  upcomingMatches?: MatchInfo[]
}

interface MatchInfo {
  id: string
  opponent: string
  isHome: boolean
  scheduledDate: Date
  venue?: string
}

const POSITION_LABELS: Record<string, string> = {
  center: 'Center',
  wing: 'Forward (Wing)',
  defense: 'Back',
  goalie: 'Målvakt',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Motionshockey',
  junior: 'Junior',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  hockeyettan: 'Hockeyettan',
  hockeyallsvenskan: 'Hockeyallsvenskan',
  shl: 'SHL',
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
  two_way: 'Tvåvägsspelare',
  physical: 'Fysisk',
  skill: 'Teknisk',
}

const STRENGTH_LABELS: Record<string, string> = {
  skating_speed: 'Skridskohastighet',
  acceleration: 'Acceleration',
  shot_power: 'Skottstyrka',
  physical_battles: 'Fysiska dueller',
  endurance: 'Uthållighet',
  agility: 'Kvickhet',
  core_stability: 'Core-stabilitet',
  upper_body: 'Överkroppsstyrka',
}

const WEAKNESS_LABELS: Record<string, string> = {
  skating_technique: 'Skridskoteknik',
  backwards_skating: 'Baklängesåkning',
  shot_accuracy: 'Skottaccuracy',
  faceoffs: 'Tekningar',
  positioning: 'Positionering',
  puck_handling: 'Puckhantering',
  passing: 'Passningar',
  defensive_play: 'Defensivt spel',
}

const INJURY_LABELS: Record<string, string> = {
  groin: 'Ljumske',
  hip: 'Höft',
  knee: 'Knä',
  shoulder: 'Axel',
  ankle: 'Fotled',
  back: 'Rygg',
  concussion: 'Hjärnskakning',
  wrist_hand: 'Handled/hand',
}

// Season phase colors and recommendations
const PHASE_INFO: Record<string, { color: string; icon: typeof Flame; focus: string[] }> = {
  off_season: {
    color: 'bg-blue-500',
    icon: Flame,
    focus: ['Bygg aerob bas', 'Maxstyrka', 'Rörlighet', 'Vila och återhämtning'],
  },
  pre_season: {
    color: 'bg-orange-500',
    icon: Zap,
    focus: ['Sport-specifik kondition', 'Explosivitet', 'Isteknik', 'Lagspel'],
  },
  in_season: {
    color: 'bg-green-500',
    icon: Target,
    focus: ['Underhåll styrka', 'Återhämtning', 'Matchförberedelse', 'Skadeförebyggande'],
  },
  playoffs: {
    color: 'bg-purple-500',
    icon: Trophy,
    focus: ['Maximal återhämtning', 'Mental fokus', 'Lätt aktivering', 'Toppform'],
  },
}

import { Trophy } from 'lucide-react'

function getPhaseProgress(phase: string): number {
  const phases = ['off_season', 'pre_season', 'in_season', 'playoffs']
  const index = phases.indexOf(phase)
  return ((index + 1) / phases.length) * 100
}

export function HockeyDashboard({ settings, upcomingMatches = [] }: HockeyDashboardProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

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
                {settings.teamName || 'Mitt lag'}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{POSITION_LABELS[settings.position] || settings.position}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel] || settings.leagueLevel}</Badge>
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
            <PhaseIcon className={`h-5 w-5 ${phaseInfo?.color.replace('bg-', 'text-')}`} />
            Säsongsfas: {PHASE_LABELS[settings.seasonPhase]}
          </CardTitle>
          <CardDescription>
            Anpassad träning för din nuvarande fas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Säsongsframsteg</span>
              <span>{PHASE_LABELS[settings.seasonPhase]}</span>
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
            <h4 className="font-medium text-sm">Fokusområden denna fas:</h4>
            <div className="grid grid-cols-2 gap-2">
              {phaseInfo?.focus.map((focus, i) => (
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
                <p className="text-sm text-muted-foreground">Istid/match</p>
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
                <p className="text-sm text-muted-foreground">Byten/match</p>
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
                <p className="text-sm text-muted-foreground">Snitt byteslängd</p>
                <p className="text-2xl font-bold">
                  {avgShiftLength ?? '-'}
                  <span className="text-sm font-normal text-muted-foreground"> sek</span>
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
              Spelstil
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
              {PLAYSTYLE_LABELS[settings.playStyle]}
            </Badge>

            {/* Position-specific training tips */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Positionsspecifik träning:</h4>
              {settings.position === 'goalie' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Höftflexibilitet och lateral push</li>
                  <li>• Reaktionsträning</li>
                  <li>• Core-stabilitet i alla positioner</li>
                </ul>
              ) : settings.position === 'defense' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Aerob uthållighet för längre byten</li>
                  <li>• Överkroppsstyrka för dueller</li>
                  <li>• Baklängesåkning och pivotering</li>
                </ul>
              ) : settings.position === 'center' ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Core-styrka för tekningar</li>
                  <li>• Tvåvägskondition</li>
                  <li>• Snabb riktningsförändring</li>
                </ul>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Explosiv acceleration</li>
                  <li>• Skottstyrka och teknik</li>
                  <li>• Sprint-återhämtning</li>
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
              Styrkor & Fokus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Styrkor att bygga vidare på:</h4>
                <div className="flex flex-wrap gap-2">
                  {settings.strengthFocus.map((strength) => (
                    <Badge key={strength} variant="outline" className="bg-green-500/10 border-green-500">
                      {STRENGTH_LABELS[strength] || strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {settings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Utvecklingsområden:</h4>
                <div className="flex flex-wrap gap-2">
                  {settings.weaknesses.map((weakness) => (
                    <Badge key={weakness} variant="outline" className="bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[weakness] || weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {settings.strengthFocus.length === 0 && settings.weaknesses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Inga styrkor eller utvecklingsområden valda ännu.
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
              Skadehistorik att ta hänsyn till
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
              Träningsprogrammet inkluderar förebyggande övningar för dessa områden.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kommande matcher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMatches.slice(0, 5).map((match) => (
                <div key={match.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">
                      {match.isHome ? 'vs' : '@'} {match.opponent}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {match.venue || (match.isHome ? 'Hemmamatch' : 'Bortamatch')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {new Date(match.scheduledDate).toLocaleDateString('sv-SE', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(match.scheduledDate).toLocaleTimeString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Träningsrekommendationer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Off-ice träning</h4>
              <div className="flex items-center gap-2 text-2xl font-bold">
                {settings.weeklyOffIceSessions}
                <span className="text-sm font-normal text-muted-foreground">pass/vecka</span>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Tillgång</h4>
              <div className="flex gap-2">
                {settings.hasAccessToIce && (
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500">
                    ❄️ Istid
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
