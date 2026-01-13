'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, Target, TrendingUp, TrendingDown, AlertCircle, Dumbbell, Zap, Medal } from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { FunctionalFitnessSettings } from '@/components/onboarding/FunctionalFitnessOnboarding'

interface FunctionalFitnessAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
  competitor: 'Tävlande',
}

const FOCUS_LABELS: Record<string, string> = {
  general: 'Allmän fitness',
  strength: 'Styrka',
  endurance: 'Uthållighet',
  gymnastics: 'Gymnastik',
  competition: 'Tävling',
}

const BENCHMARK_INFO: Record<string, { name: string; description: string; targets: Record<string, number> }> = {
  fran: {
    name: 'Fran',
    description: '21-15-9 Thrusters + Pull-ups',
    targets: { beginner: 600, intermediate: 360, advanced: 240, competitor: 180 },
  },
  grace: {
    name: 'Grace',
    description: '30 Clean & Jerks',
    targets: { beginner: 360, intermediate: 240, advanced: 180, competitor: 120 },
  },
  diane: {
    name: 'Diane',
    description: '21-15-9 Deadlifts + HSPU',
    targets: { beginner: 720, intermediate: 420, advanced: 300, competitor: 210 },
  },
  helen: {
    name: 'Helen',
    description: '3R: 400m + KB + Pull-ups',
    targets: { beginner: 900, intermediate: 720, advanced: 540, competitor: 420 },
  },
  murph: {
    name: 'Murph',
    description: '1mi + 100/200/300 + 1mi',
    targets: { beginner: 4200, intermediate: 3600, advanced: 2700, competitor: 2100 },
  },
}

const LIFT_INFO: Record<string, string> = {
  backSquat1RM: 'Back Squat',
  frontSquat1RM: 'Front Squat',
  deadlift1RM: 'Deadlift',
  strictPress1RM: 'Strict Press',
  cleanAndJerk1RM: 'Clean & Jerk',
  snatch1RM: 'Snatch',
}

const SKILL_LABELS: Record<string, Record<string, string>> = {
  pullUps: {
    none: 'Inga',
    banded: 'Band',
    strict: 'Strikta',
    kipping: 'Kipping',
    butterfly: 'Butterfly',
    muscle_up: 'MU',
  },
  handstandPushUps: {
    none: 'Inga',
    pike: 'Pike',
    box: 'Box',
    wall: 'Wall',
    strict: 'Strikta',
    kipping: 'Kipping',
    freestanding: 'Fristående',
  },
  doubleUnders: {
    none: 'Inga',
    learning: 'Lär sig',
    consistent: 'Konsekvent',
    unbroken_50: '50+ unbroken',
  },
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function FunctionalFitnessAthleteView({ clientId, clientName, settings }: FunctionalFitnessAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const ffSettings = settings as FunctionalFitnessSettings | undefined

  if (!ffSettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <span className="text-xl">🔥</span> Funktionell Fitness
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>Ingen data tillgänglig</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            Atleten har inte angett funktionell fitness-inställningar ännu.
          </p>
        </CardContent>
      </Card>
    )
  }

  const level = ffSettings.experienceLevel || 'beginner'

  // Calculate benchmark performance
  const benchmarkPerformance = Object.entries(BENCHMARK_INFO).map(([key, info]) => {
    const time = ffSettings.benchmarks?.[key as keyof typeof ffSettings.benchmarks] as number | null
    const target = info.targets[level]
    const percentage = time ? Math.min(100, Math.max(0, (target / time) * 100)) : null
    const status = time
      ? time <= target ? 'good' : time <= target * 1.3 ? 'average' : 'needs_work'
      : 'no_data'

    return {
      key,
      ...info,
      time,
      target,
      percentage,
      status,
    }
  })

  // Find best and worst benchmarks
  const benchmarksWithData = benchmarkPerformance.filter(b => b.time !== null)
  const bestBenchmark = benchmarksWithData.length > 0
    ? benchmarksWithData.reduce((best, curr) =>
        (curr.percentage || 0) > (best.percentage || 0) ? curr : best
      )
    : null
  const worstBenchmark = benchmarksWithData.length > 0
    ? benchmarksWithData.reduce((worst, curr) =>
        (curr.percentage || 100) < (worst.percentage || 100) ? curr : worst
      )
    : null

  // Get lifts with values
  const liftsWithData = Object.entries(LIFT_INFO)
    .map(([key, name]) => ({
      key,
      name,
      value: ffSettings.benchmarks?.[key as keyof typeof ffSettings.benchmarks] as number | null,
    }))
    .filter(lift => lift.value !== null)

  // Calculate total for comparison
  const totalLift = liftsWithData.reduce((sum, lift) => sum + (lift.value || 0), 0)

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: theme.colors.textPrimary }}>
                <span className="text-xl">🔥</span> Funktionell Fitness
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>Benchmarks och styrka</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                {EXPERIENCE_LABELS[level]}
              </Badge>
              <Badge variant="secondary">
                {FOCUS_LABELS[ffSettings.primaryFocus || 'general']}
              </Badge>
              {ffSettings.competitionInterest && (
                <Badge variant="default" className="bg-purple-500">
                  <Medal className="h-3 w-3 mr-1" />
                  Tävlar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Träning/vecka</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                {ffSettings.weeklyTrainingDays || '-'} pass
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <Target className="h-5 w-5 mx-auto mb-1" style={{ color: theme.colors.textMuted }} />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>WOD-längd</p>
              <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                ~{ffSettings.preferredWODDuration || 20} min
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4' }}
            >
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Bästa benchmark</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {bestBenchmark?.name || '-'}
              </p>
            </div>
            <div
              className="text-center p-3 rounded-lg"
              style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed' }}
            >
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>Fokusera på</p>
              <p className="font-medium text-sm truncate" style={{ color: theme.colors.textPrimary }}>
                {worstBenchmark?.name || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Times */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Clock className="h-4 w-4 text-red-500" />
            Benchmark Workouts
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Jämfört med {EXPERIENCE_LABELS[level].toLowerCase()}-mål
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {benchmarkPerformance.map((benchmark) => (
              <div
                key={benchmark.key}
                className="p-3 rounded-lg border text-center"
                style={{
                  borderColor: benchmark.status === 'good'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0')
                    : benchmark.status === 'average'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(234, 179, 8, 0.3)' : '#fef08a')
                    : benchmark.status === 'needs_work'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.3)' : '#fed7aa')
                    : theme.colors.border,
                  backgroundColor: benchmark.status === 'good'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(240, 253, 244, 0.5)')
                    : benchmark.status === 'average'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(254, 252, 232, 0.5)')
                    : benchmark.status === 'needs_work'
                    ? (theme.id === 'FITAPP_DARK' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 247, 237, 0.5)')
                    : (theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                }}
              >
                <div className="font-bold text-sm" style={{ color: theme.colors.textPrimary }}>
                  {benchmark.name}
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: theme.colors.textPrimary }}>
                  {benchmark.time ? formatTime(benchmark.time) : '-'}
                </div>
                {benchmark.time && (
                  <>
                    <Progress value={benchmark.percentage || 0} className="h-1.5 mt-2" />
                    <div className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                      Mål: {formatTime(benchmark.target)}
                    </div>
                  </>
                )}
                {!benchmark.time && (
                  <p className="text-xs mt-2 flex items-center justify-center gap-1" style={{ color: theme.colors.textMuted }}>
                    <AlertCircle className="h-3 w-3" />
                    Ej testad
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strength & Skills Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strength PRs */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Dumbbell className="h-4 w-4 text-blue-500" />
              Styrka (1RM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liftsWithData.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(LIFT_INFO).map(([key, name]) => {
                  const value = ffSettings.benchmarks?.[key as keyof typeof ffSettings.benchmarks] as number | null
                  return (
                    <div key={key} className="text-center">
                      <p className="text-xs" style={{ color: theme.colors.textMuted }}>{name}</p>
                      <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                        {value ? `${value}` : '-'}
                      </p>
                      {value && <p className="text-xs" style={{ color: theme.colors.textMuted }}>kg</p>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: theme.colors.textMuted }}>
                Inga 1RM registrerade
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gymnastics Skills */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Zap className="h-4 w-4 text-purple-500" />
              Gymnastik-skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>Pull-ups</p>
                <p className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>
                  {SKILL_LABELS.pullUps[ffSettings.gymnasticsSkills?.pullUps || 'none']}
                </p>
                {ffSettings.benchmarks?.maxPullUps && (
                  <p className="text-xs font-bold" style={{ color: theme.colors.textPrimary }}>
                    Max: {ffSettings.benchmarks.maxPullUps}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>HSPU</p>
                <p className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>
                  {SKILL_LABELS.handstandPushUps[ffSettings.gymnasticsSkills?.handstandPushUps || 'none']}
                </p>
                {ffSettings.benchmarks?.maxHSPU && (
                  <p className="text-xs font-bold" style={{ color: theme.colors.textPrimary }}>
                    Max: {ffSettings.benchmarks.maxHSPU}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>Double-unders</p>
                <p className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>
                  {SKILL_LABELS.doubleUnders[ffSettings.gymnasticsSkills?.doubleUnders || 'none']}
                </p>
                {ffSettings.benchmarks?.maxDoubleUnders && (
                  <p className="text-xs font-bold" style={{ color: theme.colors.textPrimary }}>
                    Max: {ffSettings.benchmarks.maxDoubleUnders}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Olympic Lifting */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Medal className="h-4 w-4 text-yellow-500" />
            Olympiska Lyft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Nivå</p>
              <p className="font-medium" style={{ color: theme.colors.textPrimary }}>
                {ffSettings.olympicLiftingLevel === 'none' ? 'Ingen erfarenhet' :
                 ffSettings.olympicLiftingLevel === 'learning' ? 'Lär sig' :
                 ffSettings.olympicLiftingLevel === 'competent' ? 'Kompetent' : 'Mycket duktig'}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>C&J</p>
                <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                  {ffSettings.benchmarks?.cleanAndJerk1RM || '-'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>Snatch</p>
                <p className="font-bold text-lg" style={{ color: theme.colors.textPrimary }}>
                  {ffSettings.benchmarks?.snatch1RM || '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
