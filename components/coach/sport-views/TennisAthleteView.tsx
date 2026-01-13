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
  TENNIS_PLAYSTYLE_PROFILES,
  TENNIS_SEASON_PHASES,
  TENNIS_BENCHMARKS,
  getPlayStyleRecommendations,
  getSurfaceConsiderations,
  type TennisPlayStyle,
} from '@/lib/training-engine/tennis'

interface TennisSettings {
  playStyle: TennisPlayStyle
  clubName: string
  leagueLevel: string
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'tournament'
  matchesPerWeek: number
  yearsPlaying: number
  preferredSurface: string
  benchmarks: {
    sprint5m: number | null
    sprint10m: number | null
    sprint20m: number | null
    agilitySpider: number | null
    agility505: number | null
    verticalJump: number | null
    medicineBallThrow: number | null
    yoyoIR1Level: number | null
    shoulderStrengthRatio: number | null
    gripStrength: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: string
  height: number | null
  serveSpeed: number | null
  forehandGrip: string
  backhandType: string
}

interface TennisAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const PLAYSTYLE_LABELS: Record<string, string> = {
  aggressive_baseliner: 'Aggressiv Baslinjespelare',
  serve_and_volleyer: 'Serve-Volleyspelare',
  all_court: 'Allroundspelare',
  counter_puncher: 'Defensiv Spelare',
  big_server: 'Servkung',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  tournament: 'Turnering',
}

const LEAGUE_LABELS: Record<string, string> = {
  recreational: 'Motionsspelare',
  club: 'Klubbspelare',
  division_4: 'Division 4',
  division_3: 'Division 3',
  division_2: 'Division 2',
  division_1: 'Division 1',
  elitserien: 'Elitserien',
  atp_wta: 'ATP/WTA',
}

const SURFACE_LABELS: Record<string, string> = {
  hard: 'Hardcourt',
  clay: 'Grus',
  grass: 'Gräs',
  indoor: 'Inomhus',
  all: 'Alla underlag',
}

const STRENGTH_LABELS: Record<string, string> = {
  serve: 'Serve',
  forehand: 'Forehand',
  backhand: 'Backhand',
  volley: 'Volley',
  return: 'Return',
  movement: 'Rörelse/Fotwork',
  mental: 'Mental styrka',
  endurance: 'Uthållighet',
}

const INJURY_LABELS: Record<string, string> = {
  shoulder: 'Axelskada',
  elbow: 'Tennisarmbåge',
  wrist: 'Handledsbesvär',
  back: 'Ryggproblem',
  knee: 'Knäskada',
  ankle: 'Fotledsskada',
  hip: 'Höftproblem',
  abdominal: 'Magbesvär',
}

const GRIP_LABELS: Record<string, string> = {
  eastern: 'Eastern',
  semi_western: 'Semi-Western',
  western: 'Western',
  continental: 'Continental',
}

const BACKHAND_LABELS: Record<string, string> = {
  one_handed: 'Enhands',
  two_handed: 'Tvåhands',
}

export function TennisAthleteView({
  clientName,
  settings: rawSettings,
}: TennisAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  if (!rawSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle style={{ color: theme.colors.textPrimary }}>Tennis</CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Ingen tennisprofil hittades för {clientName}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const settings = rawSettings as unknown as TennisSettings
  const playStyle = settings.playStyle
  const playStyleProfile = TENNIS_PLAYSTYLE_PROFILES[playStyle]
  const seasonPhase = TENNIS_SEASON_PHASES[settings.seasonPhase]
  const benchmarks = TENNIS_BENCHMARKS[playStyle]

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
  const recommendations = getPlayStyleRecommendations(playStyle)
  const essentialExercises = recommendations.filter((r) => r.priority === 'essential').slice(0, 4)

  // Get surface considerations
  const surfaceConsiderations = settings.preferredSurface !== 'all'
    ? getSurfaceConsiderations(settings.preferredSurface as 'hard' | 'clay' | 'grass' | 'indoor')
    : []

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Trophy className="h-5 w-5 text-green-500" />
                {clientName} - {settings.clubName || 'Tennis'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{PLAYSTYLE_LABELS[playStyle]}</Badge>
                <Badge variant="secondary">{LEAGUE_LABELS[settings.leagueLevel] || settings.leagueLevel}</Badge>
                <Badge className="bg-green-500">{PHASE_LABELS[settings.seasonPhase]}</Badge>
                <Badge variant="outline">{SURFACE_LABELS[settings.preferredSurface] || settings.preferredSurface}</Badge>
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
              <Ruler className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.height ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>cm längd</div>
            </div>
            <div className="text-center">
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{settings.serveSpeed ?? '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>km/h serve</div>
            </div>
            <div className="text-center">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>{GRIP_LABELS[settings.forehandGrip] || '-'}</div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>FH-grepp</div>
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
          <div className="mt-3 text-center text-sm" style={{ color: theme.colors.textMuted }}>
            {settings.dominantHand === 'right' ? 'Högerhänt' : 'Vänsterhänt'} |{' '}
            {BACKHAND_LABELS[settings.backhandType] || settings.backhandType} backhand
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

      {/* Speed Benchmarks */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-green-500" />
            Fysiska tester - {PLAYSTYLE_LABELS[playStyle]}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Resultat jämfört med elitnivå</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 5m Sprint */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>5m sprint</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.sprint5m} s</div>
            </div>

            {/* Spider Drill */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Spider drill</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.agilitySpider} s</div>
            </div>

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

            {/* Medicine Ball */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Medicinbollkast</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.medicineBallThrow,
                  benchmarks.elite.medicineBallThrow!,
                  benchmarks.good.medicineBallThrow!
                ))}>
                  {settings.benchmarks.medicineBallThrow?.toFixed(1) ?? '-'} m
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.medicineBallThrow, benchmarks.elite.medicineBallThrow!) ?? 0}
                className="h-2"
              />
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.medicineBallThrow} m</div>
            </div>

            {/* Grip Strength */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Greppstyrka</span>
                <span className={getRatingColor(getBenchmarkRating(
                  settings.benchmarks.gripStrength,
                  benchmarks.elite.gripStrength!,
                  benchmarks.good.gripStrength!
                ))}>
                  {settings.benchmarks.gripStrength ?? '-'} kg
                </span>
              </div>
              <Progress
                value={getBenchmarkPercentage(settings.benchmarks.gripStrength, benchmarks.elite.gripStrength!) ?? 0}
                className="h-2"
              />
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.gripStrength} kg</div>
            </div>

            {/* Yo-Yo */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme.colors.textPrimary }}>Yo-Yo IR1</span>
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
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>Elit: {benchmarks.elite.yoyoIR1Level}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Play Style Profile */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <TrendingUp className="h-4 w-4" />
            Spelstilsprofil: {playStyleProfile.displayName}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{playStyleProfile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Rallys/set</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.avgRalliesPerSet.min}-{playStyleProfile.avgRalliesPerSet.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Poäng/match</div>
              <div className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.avgPointsPerMatch.min}-{playStyleProfile.avgPointsPerMatch.max}
              </div>
            </div>
            <div>
              <div className="text-sm mb-1" style={{ color: theme.colors.textMuted }}>Bantäckning</div>
              <div className="font-medium capitalize" style={{ color: theme.colors.textPrimary }}>
                {playStyleProfile.courtCoverage.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Nyckelegenskaper:</div>
            <div className="flex flex-wrap gap-1">
              {playStyleProfile.keyPhysicalAttributes.map((attr, i) => (
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
          <CardDescription style={{ color: theme.colors.textMuted }}>Baserat på spelstil och skadehistorik</CardDescription>
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

      {/* Surface Considerations */}
      {surfaceConsiderations.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <Target className="h-4 w-4 text-green-500" />
              {SURFACE_LABELS[settings.preferredSurface]} - Överväganden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {surfaceConsiderations.map((tip, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: theme.colors.textMuted }}>
                  <span className="text-green-500 mt-1">-</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.strengthFocus.length > 0 && (
          <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Zap className="h-4 w-4 text-green-500" />
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
              <strong style={{ color: theme.colors.textPrimary }}>Spelstil:</strong> Som {playStyleProfile.displayName.toLowerCase()} bör {clientName} fokusera på{' '}
              {playStyleProfile.keyPhysicalAttributes.slice(0, 3).join(', ').toLowerCase()}.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Matchbelastning:</strong> Typisk matchbelastning för spelstilen innebär{' '}
              {playStyleProfile.avgRalliesPerSet.min}-{playStyleProfile.avgRalliesPerSet.max} rallys per set. Längre rallys för defensiva spelare.
            </p>
            <p>
              <strong style={{ color: theme.colors.textPrimary }}>Säsongsfas:</strong> Under {PHASE_LABELS[settings.seasonPhase].toLowerCase()} rekommenderas{' '}
              {seasonPhase.weeklyStructure.strengthSessions} styrkepass och {seasonPhase.weeklyStructure.technicalSessions} tekniska pass per vecka.
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
    </div>
  )
}

export default TennisAthleteView
