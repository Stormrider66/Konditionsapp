'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import {
  Trophy,
  Target,
  TrendingUp,
  Zap,
  Activity,
  Calendar,
  Dumbbell,
  AlertTriangle,
  Ruler,
} from 'lucide-react'
import {
  VOLLEYBALL_POSITION_PROFILES,
  VOLLEYBALL_SEASON_PHASES,
  VOLLEYBALL_BENCHMARKS,
  getPositionRecommendations,
  type VolleyballPosition,
} from '@/lib/training-engine/volleyball'
import { SportTestHistory } from '@/components/tests/shared'

interface VolleyballSettings {
  position: VolleyballPosition
  teamName: string
  leagueLevel: string
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgSetsPerMatch: number | null
  yearsPlaying: number
  playStyle: string
  benchmarks: {
    verticalJump: number | null
    spikeJump: number | null
    blockJump: number | null
    standingReach: number | null
    agilityTTest: number | null
    sprint5m: number | null
    yoyoIR1Level: number | null
    squat: number | null
    powerClean: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: string
  height: number | null
  spikeHeight: number | null
  blockHeight: number | null
}

interface VolleyballAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const POSITION_LABELS: Record<string, string> = {
  setter: 'Passare',
  outside_hitter: 'Vänsterspiker',
  opposite_hitter: 'Diagonal',
  middle_blocker: 'Centerblockare',
  libero: 'Libero',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Korpen/Motion',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  elitserien: 'Elitserien',
  ssl: 'Svenska Superligan',
}

const PLAY_STYLE_LABELS: Record<string, string> = {
  power: 'Kraftspelare',
  finesse: 'Tekniker',
  defensive: 'Försvarare',
  allround: 'Allround',
}

const STRENGTH_LABELS: Record<string, string> = {
  vertical_jump: 'Vertikal hoppförmåga',
  spike_power: 'Slagstyrka',
  blocking: 'Blockteknik',
  serving: 'Serve',
  reception: 'Mottagning',
  defense: 'Försvarsspel',
  court_vision: 'Spelförståelse',
  agility: 'Kvickhet',
}

const INJURY_LABELS: Record<string, string> = {
  shoulder: 'Axelskada',
  knee_patellar: 'Hopparknä',
  knee_acl: 'Knäskada (ACL/MCL)',
  ankle: 'Fotledsskada',
  back: 'Ryggproblem',
  finger: 'Fingerskada',
  wrist: 'Handledsbesvär',
}

export function VolleyballAthleteView({
  clientId,
  clientName,
  settings: rawSettings,
}: VolleyballAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Volleyboll</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Ingen volleybollprofil hittades för {clientName}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const settings = rawSettings as unknown as VolleyballSettings
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
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Trophy className="h-5 w-5 text-yellow-500" />
                {clientName} - {settings.teamName || 'Volleyboll'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{POSITION_LABELS[position]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel] || settings.leagueLevel}</Badge>
                <Badge className="bg-yellow-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
                <Badge variant="outline">{PLAY_STYLE_LABELS[settings.playStyle] || settings.playStyle}</Badge>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.yearsPlaying}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>års erfarenhet</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm längd</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.spikeHeight ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm smash</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.blockHeight ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm block</div>
            </div>
            <div className="text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.matchesPerWeek}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>matcher/v</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyTrainingSessions}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>träning/v</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Phase Focus */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            {PHASE_LABELS[settings.seasonPhase]} - Träningsfokus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Fokusområden:</h4>
              <div className="flex flex-wrap gap-1">
                {seasonPhase.focus.map((item, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>Styrka</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{seasonPhase.strengthEmphasis}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.backgroundAccent }}>
                <div className="text-xs mb-1" style={{ color: theme.colors.textMuted }}>Kondition</div>
                <div className="text-sm" style={{ color: theme.colors.textPrimary }}>{seasonPhase.conditioningEmphasis}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jump Benchmarks */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-red-500" />
            Hopptester - {POSITION_LABELS[position]}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Resultat jämfört med elitnivå</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Vertical Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Vertikalhopp</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.verticalJump} cm</div>
            </div>

            {/* Spike Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Smash-hopp</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.spikeJump} cm</div>
            </div>

            {/* Block Jump */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Block-hopp</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.blockJump} cm</div>
            </div>

            {/* T-Test Agility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>T-test agility</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.agilityTTest} s</div>
            </div>

            {/* Squat */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Knäböj</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.squat} kg</div>
            </div>

            {/* Power Clean */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Power clean</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.powerClean} kg</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            Positionsprofil: {positionProfile.displayName}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{positionProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Hopp/set</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerSet.min}-{positionProfile.avgJumpsPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Hopp/match</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max}
              </div>
            </div>
            {position !== 'libero' && (
              <div>
                <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Smash-höjd</div>
                <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                  +{positionProfile.avgSpikeHeight.min}-{positionProfile.avgSpikeHeight.max} cm
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Nyckelegenskaper:</div>
            <div className="flex flex-wrap gap-1">
              {positionProfile.keyPhysicalAttributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {attr}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Exercises */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Dumbbell className="h-4 w-4" />
            Rekommenderade övningar
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Baserat på position och skadehistorik</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialExercises.map((exercise, i) => (
              <div key={i} className="p-3 border rounded-lg" style={{ borderColor: theme.colors.border }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>{exercise.name}</div>
                    <div className="text-xs" style={{ color: theme.colors.textMuted }}>{exercise.setsReps}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {exercise.category}
                  </Badge>
                </div>
                <div className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>{exercise.notes}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.strengthFocus.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Zap className="h-4 w-4 text-yellow-500" />
                Styrkor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.strengthFocus.map((strength) => (
                  <Badge key={strength} variant="secondary">
                    {STRENGTH_LABELS[strength] || strength}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {settings.weaknesses.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Target className="h-4 w-4 text-blue-500" />
                Utvecklingsområden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.weaknesses.map((weakness) => (
                  <Badge key={weakness} variant="outline">
                    {STRENGTH_LABELS[weakness] || weakness}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Injury History */}
      {settings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Skadehistorik
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              Tidigare skador att ta hänsyn till i träningsplaneringen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                  {INJURY_LABELS[injury] || injury}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            Träningsrekommendationer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Position:</strong> Som {positionProfile.displayName.toLowerCase()} bör {clientName} fokusera på{' '}
              {positionProfile.keyPhysicalAttributes.slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Hoppbelastning:</strong> Typisk hoppbelastning för positionen är{' '}
              {positionProfile.avgJumpsPerMatch.min}-{positionProfile.avgJumpsPerMatch.max} hopp per match. Övervaka för att undvika överbelastning.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Säsongsfas:</strong> Under {PHASE_LABELS[settings.seasonPhase].toLowerCase()} rekommenderas{' '}
              {seasonPhase.weeklyStructure.strengthSessions} styrkepass och {seasonPhase.weeklyStructure.conditioningSessions} konditionspass per vecka.
            </p>
            {settings.injuryHistory.length > 0 && (
              <p>
                <strong style={{ color: theme.colors.textPrimary }}>Skadeprevention:</strong> Med tanke på tidigare{' '}
                {settings.injuryHistory.map(i => INJURY_LABELS[i]?.toLowerCase() || i).join(', ')}, inkludera alltid skadeförebyggande övningar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_VOLLEYBALL"
        title="Testhistorik - Volleyboll"
        protocolLabels={{
          SPIKE_JUMP: 'Spike Jump',
          VERTICAL_JUMP_CMJ: 'CMJ / Block Jump',
          T_TEST: 'T-Test',
        }}
      />
    </div>
  )
}

export default VolleyballAthleteView
