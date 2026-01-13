'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
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
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'

interface HockeyAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
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

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: string[]; avoid: string[] }> = {
  off_season: {
    focus: ['Aerob basträning', 'Maxstyrka (4-6 rep)', 'Rörlighet', 'Skaderehab'],
    avoid: ['Hög-intensiv sprintträning', 'Maximal is-träning'],
  },
  pre_season: {
    focus: ['Intervaller (30-60 sek)', 'Explosiv styrka', 'Plyometrics', 'Is-kondition'],
    avoid: ['Långdistans steady-state', 'Hög volym styrketräning'],
  },
  in_season: {
    focus: ['Underhållsstyrka (2x/v)', 'Aktiv återhämtning', 'Mobilitet', 'Skadeförebyggande'],
    avoid: ['Hög volym off-ice', 'Nya övningar', 'Tung styrketräning nära match'],
  },
  playoffs: {
    focus: ['Lätt aktivering', 'Pool-återhämtning', 'Mental förberedelse', 'Sömn'],
    avoid: ['Styrketräning', 'Off-ice kondition', 'Allt som kan orsaka trötthet'],
  },
}

export function HockeyAthleteView({ clientId, clientName, settings }: HockeyAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const hockeySettings = settings as HockeySettings | undefined

  if (!hockeySettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Shield className="h-5 w-5" /> Ishockey
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett hockey-inställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations = PHASE_RECOMMENDATIONS[hockeySettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season

  // Calculate average shift length
  const avgShiftLength = hockeySettings.averageIceTimeMinutes && hockeySettings.shiftsPerGame
    ? Math.round((hockeySettings.averageIceTimeMinutes * 60) / hockeySettings.shiftsPerGame)
    : null

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Shield className="h-5 w-5 text-blue-500" />
                {hockeySettings.teamName || 'Ishockey'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{POSITION_LABELS[hockeySettings.position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[hockeySettings.leagueLevel]}</Badge>
                <Badge className="bg-blue-500">{PHASE_LABELS[hockeySettings.seasonPhase]}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.yearsPlaying}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playing stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.averageIceTimeMinutes ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>min/match</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.shiftsPerGame ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>byten</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {avgShiftLength ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>sek/byte</div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>Spelstil:</span>
            <Badge className={
              hockeySettings.playStyle === 'offensive' ? 'bg-red-500' :
              hockeySettings.playStyle === 'defensive' ? 'bg-blue-500' :
              hockeySettings.playStyle === 'physical' ? 'bg-orange-500' :
              hockeySettings.playStyle === 'skill' ? 'bg-purple-500' :
              'bg-green-500'
            }>
              {PLAYSTYLE_LABELS[hockeySettings.playStyle]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Training Recommendations for Current Phase */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4" />
            Träningsrekommendationer ({PHASE_LABELS[hockeySettings.seasonPhase]})
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
      {(hockeySettings.strengthFocus.length > 0 || hockeySettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              Styrkor & Utvecklingsområden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hockeySettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Styrkor:</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] || s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {hockeySettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>Att utveckla:</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.weaknesses.map((w) => (
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
      {hockeySettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Skadehistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {hockeySettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              Inkludera förebyggande övningar för dessa områden i träningsprogrammet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            Positionsspecifik träning: {POSITION_LABELS[hockeySettings.position]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hockeySettings.position === 'goalie' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Höftrörlighet, lateral power</li>
              <li>• <strong>Styrka:</strong> Core-stabilitet, quadriceps</li>
              <li>• <strong>Kondition:</strong> Korta explosiva intervaller</li>
              <li>• <strong>Förebyggande:</strong> Höft, ljumske, knä</li>
            </ul>
          ) : hockeySettings.position === 'defense' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Aerob bas (längre byten), baklängesåkning</li>
              <li>• <strong>Styrka:</strong> Överkropp för dueller, höft/gluteal</li>
              <li>• <strong>Kondition:</strong> Uthållighet + återhämtning</li>
              <li>• <strong>Förebyggande:</strong> Höft, ljumske, axlar</li>
            </ul>
          ) : hockeySettings.position === 'center' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Core för tekningar, tvåvägskondition</li>
              <li>• <strong>Styrka:</strong> Rotation, överkropp, explosivitet</li>
              <li>• <strong>Kondition:</strong> Sprint-återhämtning</li>
              <li>• <strong>Förebyggande:</strong> Ljumske, handled</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>Prioritet:</strong> Maximal sprint, skottstyrka</li>
              <li>• <strong>Styrka:</strong> Explosiv power, rotation</li>
              <li>• <strong>Kondition:</strong> Anaerob kapacitet</li>
              <li>• <strong>Förebyggande:</strong> Hamstrings, ljumske</li>
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
              {hockeySettings.hasAccessToIce && (
                <Badge variant="outline">❄️ Istid</Badge>
              )}
              {hockeySettings.hasAccessToGym && (
                <Badge variant="outline">🏋️ Gym</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.weeklyOffIceSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>off-ice pass/v</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HockeyAthleteView
