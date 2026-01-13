'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Timer,
  Dumbbell,
  Zap,
  Medal,
  Flame,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { FunctionalFitnessSettings } from '@/components/onboarding/FunctionalFitnessOnboarding'

interface FunctionalFitnessDashboardProps {
  settings: FunctionalFitnessSettings
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

const GYM_TYPE_LABELS: Record<string, string> = {
  commercial: 'Vanligt gym',
  functional_box: 'Funktionell box',
  home: 'Hemmagym',
  garage: 'Garage gym',
}

const PULL_UP_LABELS: Record<string, string> = {
  none: 'Inga',
  banded: 'Med band',
  strict: 'Strikta',
  kipping: 'Kipping',
  butterfly: 'Butterfly',
  muscle_up: 'Muscle-ups',
}

const HSPU_LABELS: Record<string, string> = {
  none: 'Inga',
  pike: 'Pike push-ups',
  box: 'Box pike',
  wall: 'Wall facing',
  strict: 'Strikta',
  kipping: 'Kipping',
  freestanding: 'Fristående',
}

const TTB_LABELS: Record<string, string> = {
  none: 'Inga',
  hanging_knee: 'Hanging knee',
  kipping: 'Kipping',
  strict: 'Strikta',
}

const DU_LABELS: Record<string, string> = {
  none: 'Inga',
  learning: 'Lär sig',
  consistent: 'Konsekvent',
  unbroken_50: 'Unbroken 50+',
}

const ROPE_LABELS: Record<string, string> = {
  none: 'Inga',
  with_legs: 'Med bengrep',
  legless: 'Legless',
}

const OLYMPIC_LABELS: Record<string, string> = {
  none: 'Ingen erfarenhet',
  learning: 'Lär sig',
  competent: 'Kompetent',
  proficient: 'Mycket duktig',
}

// Target times for benchmarks (in seconds) by experience level
const BENCHMARK_TARGETS: Record<string, Record<string, number>> = {
  beginner: {
    fran: 600,      // 10:00
    grace: 360,     // 6:00
    diane: 720,     // 12:00
    helen: 900,     // 15:00
    murph: 4200,    // 70:00
  },
  intermediate: {
    fran: 360,      // 6:00
    grace: 240,     // 4:00
    diane: 420,     // 7:00
    helen: 720,     // 12:00
    murph: 3600,    // 60:00
  },
  advanced: {
    fran: 240,      // 4:00
    grace: 180,     // 3:00
    diane: 300,     // 5:00
    helen: 540,     // 9:00
    murph: 2700,    // 45:00
  },
  competitor: {
    fran: 180,      // 3:00
    grace: 120,     // 2:00
    diane: 210,     // 3:30
    helen: 420,     // 7:00
    murph: 2100,    // 35:00
  },
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getBenchmarkProgress(time: number | null, targetTime: number): number {
  if (time === null) return 0
  // Inverse progress - lower time = higher percentage (capped at 150%)
  const progress = (targetTime / time) * 100
  return Math.min(progress, 150)
}

function getSkillLevel(skill: string): { level: number; color: string } {
  const skillLevels: Record<string, { level: number; color: string }> = {
    none: { level: 0, color: 'bg-gray-300' },
    banded: { level: 20, color: 'bg-yellow-500' },
    learning: { level: 20, color: 'bg-yellow-500' },
    hanging_knee: { level: 25, color: 'bg-yellow-500' },
    pike: { level: 20, color: 'bg-yellow-500' },
    with_legs: { level: 40, color: 'bg-orange-500' },
    box: { level: 30, color: 'bg-orange-500' },
    consistent: { level: 50, color: 'bg-orange-500' },
    wall: { level: 40, color: 'bg-orange-500' },
    strict: { level: 60, color: 'bg-green-500' },
    kipping: { level: 75, color: 'bg-blue-500' },
    butterfly: { level: 90, color: 'bg-purple-500' },
    muscle_up: { level: 100, color: 'bg-purple-600' },
    freestanding: { level: 100, color: 'bg-purple-600' },
    legless: { level: 100, color: 'bg-purple-600' },
    unbroken_50: { level: 80, color: 'bg-blue-500' },
    short_distance: { level: 60, color: 'bg-green-500' },
    proficient: { level: 100, color: 'bg-purple-600' },
    wall_walks: { level: 30, color: 'bg-orange-500' },
  }
  return skillLevels[skill] || { level: 0, color: 'bg-gray-300' }
}

export function FunctionalFitnessDashboard({ settings }: FunctionalFitnessDashboardProps) {
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const targets = BENCHMARK_TARGETS[settings.experienceLevel]

  const benchmarks = [
    {
      key: 'fran',
      name: 'Fran',
      time: settings.benchmarks.fran,
      description: '21-15-9 Thrusters + Pull-ups',
      color: 'text-red-500'
    },
    {
      key: 'grace',
      name: 'Grace',
      time: settings.benchmarks.grace,
      description: '30 Clean & Jerks',
      color: 'text-orange-500'
    },
    {
      key: 'diane',
      name: 'Diane',
      time: settings.benchmarks.diane,
      description: '21-15-9 DL + HSPU',
      color: 'text-yellow-500'
    },
    {
      key: 'helen',
      name: 'Helen',
      time: settings.benchmarks.helen,
      description: '3R: 400m + KB + PU',
      color: 'text-green-500'
    },
    {
      key: 'murph',
      name: 'Murph',
      time: settings.benchmarks.murph,
      description: '1mi + 100/200/300 + 1mi',
      color: 'text-blue-500'
    },
  ]

  const lifts = [
    { key: 'backSquat1RM', name: 'Back Squat', value: settings.benchmarks.backSquat1RM, color: 'bg-red-500' },
    { key: 'frontSquat1RM', name: 'Front Squat', value: settings.benchmarks.frontSquat1RM, color: 'bg-orange-500' },
    { key: 'deadlift1RM', name: 'Deadlift', value: settings.benchmarks.deadlift1RM, color: 'bg-yellow-500' },
    { key: 'strictPress1RM', name: 'Strict Press', value: settings.benchmarks.strictPress1RM, color: 'bg-green-500' },
    { key: 'cleanAndJerk1RM', name: 'Clean & Jerk', value: settings.benchmarks.cleanAndJerk1RM, color: 'bg-blue-500' },
    { key: 'snatch1RM', name: 'Snatch', value: settings.benchmarks.snatch1RM, color: 'bg-purple-500' },
  ]

  const gymnasticsSkills = [
    { key: 'pullUps', name: 'Pull-ups', value: settings.gymnasticsSkills.pullUps, labels: PULL_UP_LABELS },
    { key: 'handstandPushUps', name: 'HSPU', value: settings.gymnasticsSkills.handstandPushUps, labels: HSPU_LABELS },
    { key: 'toeToBar', name: 'Toes to Bar', value: settings.gymnasticsSkills.toeToBar, labels: TTB_LABELS },
    { key: 'doubleUnders', name: 'Double-unders', value: settings.gymnasticsSkills.doubleUnders, labels: DU_LABELS },
    { key: 'ropeClimbs', name: 'Rope Climbs', value: settings.gymnasticsSkills.ropeClimbs, labels: ROPE_LABELS },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Flame className="h-6 w-6 text-orange-500" />
            Funktionell Fitness
          </h2>
          <p style={{ color: theme.colors.textMuted }}>
            {EXPERIENCE_LABELS[settings.experienceLevel]} • {FOCUS_LABELS[settings.primaryFocus]} • {GYM_TYPE_LABELS[settings.gymType]}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="h-3 w-3 mr-1" />
            {settings.weeklyTrainingDays} pass/vecka
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Timer className="h-3 w-3 mr-1" />
            ~{settings.preferredWODDuration} min WOD
          </Badge>
          {settings.competitionInterest && (
            <Badge variant="default" className="bg-purple-500 text-sm px-3 py-1">
              <Medal className="h-3 w-3 mr-1" />
              Tävlingsintresse
            </Badge>
          )}
        </div>
      </div>

      {/* Benchmark Workouts */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Timer className="h-5 w-5 text-red-500" />
            Benchmark Workouts
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Dina tider vs måltider för {EXPERIENCE_LABELS[settings.experienceLevel].toLowerCase()}-nivå
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {benchmarks.map((benchmark) => {
              const progress = getBenchmarkProgress(benchmark.time, targets[benchmark.key])
              return (
                <div
                  key={benchmark.key}
                  className="p-4 rounded-lg border text-center"
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                >
                  <div className={`text-lg font-bold ${benchmark.color}`}>{benchmark.name}</div>
                  <div className="text-2xl font-bold mt-2" style={{ color: theme.colors.textPrimary }}>
                    {formatTime(benchmark.time)}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    Mål: {formatTime(targets[benchmark.key])}
                  </div>
                  <Progress value={progress} className="h-1.5 mt-2" />
                  <div className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
                    {benchmark.description}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strength PRs */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Dumbbell className="h-5 w-5 text-blue-500" />
            Styrka (1RM)
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Dina max-lyft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {lifts.map((lift) => (
              <div
                key={lift.key}
                className="p-4 rounded-lg border text-center"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
              >
                <div className="text-sm font-medium" style={{ color: theme.colors.textMuted }}>
                  {lift.name}
                </div>
                <div className="text-2xl font-bold mt-2" style={{ color: theme.colors.textPrimary }}>
                  {lift.value ? `${lift.value}` : '-'}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>kg</div>
                <div className={`h-1 mt-2 rounded ${lift.value ? lift.color : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gymnastics Skills */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Zap className="h-5 w-5 text-purple-500" />
            Gymnastik-skills
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Din aktuella nivå på olika gymnastik-rörelser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {gymnasticsSkills.map((skill) => {
              const { level, color } = getSkillLevel(skill.value)
              return (
                <div
                  key={skill.key}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                >
                  <div className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                    {skill.name}
                  </div>
                  <div className="text-lg font-semibold mt-1" style={{ color: theme.colors.textPrimary }}>
                    {skill.labels[skill.value]}
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-300`}
                      style={{ width: `${level}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Max reps section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: theme.colors.border }}>
            <div className="text-center">
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>Max Pull-ups</div>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {settings.benchmarks.maxPullUps || '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>Max Muscle-ups</div>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {settings.benchmarks.maxMuscleUps || '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>Max HSPU</div>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {settings.benchmarks.maxHSPU || '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>Max DU (unbroken)</div>
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                {settings.benchmarks.maxDoubleUnders || '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Olympic Lifting & Training Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Medal className="h-5 w-5 text-yellow-500" />
              Olympiska Lyft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm" style={{ color: theme.colors.textMuted }}>Aktuell nivå</div>
                <div className="text-lg font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {OLYMPIC_LABELS[settings.olympicLiftingLevel]}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>Clean & Jerk</div>
                  <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                    {settings.benchmarks.cleanAndJerk1RM || '-'} kg
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>Snatch</div>
                  <div className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                    {settings.benchmarks.snatch1RM || '-'} kg
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5 text-green-500" />
              Träningstips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm" style={{ color: theme.colors.textPrimary }}>
              {settings.primaryFocus === 'strength' && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Fokusera på progressiv överbelastning med 2-for-2 regeln
                </li>
              )}
              {settings.primaryFocus === 'gymnastics' && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Öva skill-arbete när du är utvilad, innan styrkepass
                </li>
              )}
              {settings.olympicLiftingLevel === 'learning' && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  Prioritera teknik med lätta vikter före belastning
                </li>
              )}
              {settings.competitionInterest && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  Träna benchmark-workouts regelbundet för att mäta framsteg
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Balansera push/pull och över-/underkroppsarbete
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                Prioritera rörlighet och mobilitet för att förebygga skador
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Overview */}
      {settings.equipmentAvailable.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-sm" style={{ color: theme.colors.textMuted }}>
              Tillgänglig utrustning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {settings.equipmentAvailable.map((equipment) => (
                <Badge key={equipment} variant="secondary">
                  {equipment.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
