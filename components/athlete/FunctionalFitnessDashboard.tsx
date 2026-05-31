'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
import {
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

type AppLocale = 'en' | 'sv'
type LocalizedLabels = Record<string, Record<AppLocale, string>>

function getAppLocale(locale: string): AppLocale {
  return locale.startsWith('sv') ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const EXPERIENCE_LABELS: LocalizedLabels = {
  beginner: { sv: 'Nybörjare', en: 'Beginner' },
  intermediate: { sv: 'Medel', en: 'Intermediate' },
  advanced: { sv: 'Avancerad', en: 'Advanced' },
  competitor: { sv: 'Tävlande', en: 'Competitor' },
}

const FOCUS_LABELS: LocalizedLabels = {
  general: { sv: 'Allmän fitness', en: 'General fitness' },
  strength: { sv: 'Styrka', en: 'Strength' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  gymnastics: { sv: 'Gymnastik', en: 'Gymnastics' },
  competition: { sv: 'Tävling', en: 'Competition' },
}

const GYM_TYPE_LABELS: LocalizedLabels = {
  commercial: { sv: 'Vanligt gym', en: 'Commercial gym' },
  functional_box: { sv: 'Funktionell box', en: 'Functional fitness box' },
  home: { sv: 'Hemmagym', en: 'Home gym' },
  garage: { sv: 'Garage gym', en: 'Garage gym' },
}

const PULL_UP_LABELS: LocalizedLabels = {
  none: { sv: 'Inga', en: 'None' },
  banded: { sv: 'Med band', en: 'Banded' },
  strict: { sv: 'Strikta', en: 'Strict' },
  kipping: { sv: 'Kipping', en: 'Kipping' },
  butterfly: { sv: 'Butterfly', en: 'Butterfly' },
  muscle_up: { sv: 'Muscle-ups', en: 'Muscle-ups' },
}

const HSPU_LABELS: LocalizedLabels = {
  none: { sv: 'Inga', en: 'None' },
  pike: { sv: 'Pike push-ups', en: 'Pike push-ups' },
  box: { sv: 'Box pike', en: 'Box pike' },
  wall: { sv: 'Wall facing', en: 'Wall facing' },
  strict: { sv: 'Strikta', en: 'Strict' },
  kipping: { sv: 'Kipping', en: 'Kipping' },
  freestanding: { sv: 'Fristående', en: 'Freestanding' },
}

const TTB_LABELS: LocalizedLabels = {
  none: { sv: 'Inga', en: 'None' },
  hanging_knee: { sv: 'Hanging knee', en: 'Hanging knee' },
  kipping: { sv: 'Kipping', en: 'Kipping' },
  strict: { sv: 'Strikta', en: 'Strict' },
}

const DU_LABELS: LocalizedLabels = {
  none: { sv: 'Inga', en: 'None' },
  learning: { sv: 'Lär sig', en: 'Learning' },
  consistent: { sv: 'Konsekvent', en: 'Consistent' },
  unbroken_50: { sv: 'Unbroken 50+', en: 'Unbroken 50+' },
}

const ROPE_LABELS: LocalizedLabels = {
  none: { sv: 'Inga', en: 'None' },
  with_legs: { sv: 'Med bengrep', en: 'With legs' },
  legless: { sv: 'Legless', en: 'Legless' },
}

const OLYMPIC_LABELS: LocalizedLabels = {
  none: { sv: 'Ingen erfarenhet', en: 'No experience' },
  learning: { sv: 'Lär sig', en: 'Learning' },
  competent: { sv: 'Kompetent', en: 'Competent' },
  proficient: { sv: 'Mycket duktig', en: 'Proficient' },
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
  const t = useTranslations('components.athleteDashboard')
  const locale = getAppLocale(useLocale())

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Functional Fitness</CardTitle>
          <CardDescription>
            {t('functionalFitnessNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const targets = BENCHMARK_TARGETS[settings.experienceLevel]
  const experienceLabel = EXPERIENCE_LABELS[settings.experienceLevel]?.[locale] ?? settings.experienceLevel
  const focusLabel = FOCUS_LABELS[settings.primaryFocus]?.[locale] ?? settings.primaryFocus
  const gymTypeLabel = GYM_TYPE_LABELS[settings.gymType]?.[locale] ?? settings.gymType

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
            {text(locale, 'Funktionell Fitness', 'Functional Fitness')}
          </h2>
          <p style={{ color: theme.colors.textMuted }}>
            {experienceLabel} • {focusLabel} • {gymTypeLabel}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="h-3 w-3 mr-1" />
            {settings.weeklyTrainingDays} {text(locale, 'pass/vecka', 'sessions/week')}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Timer className="h-3 w-3 mr-1" />
            ~{settings.preferredWODDuration} min WOD
          </Badge>
          {settings.competitionInterest && (
            <Badge variant="default" className="bg-purple-500 text-sm px-3 py-1">
              <Medal className="h-3 w-3 mr-1" />
              {text(locale, 'Tävlingsintresse', 'Competition interest')}
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
            {text(
              locale,
              `Dina tider vs riktider för ${experienceLabel.toLowerCase()}-nivå`,
              `Your times vs targets for ${experienceLabel.toLowerCase()} level`
            )}
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
                    {text(locale, 'Mål', 'Target')}: {formatTime(targets[benchmark.key])}
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
            {text(locale, 'Styrka (1RM)', 'Strength (1RM)')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {text(locale, 'Dina max-lyft', 'Your max lifts')}
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
            {text(locale, 'Gymnastik-skills', 'Gymnastics skills')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {text(locale, 'Din aktuella nivå på olika gymnastik-rörelser', 'Your current level across gymnastics movements')}
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
                    {skill.labels[skill.value]?.[locale] ?? skill.value}
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
              {text(locale, 'Olympiska Lyft', 'Olympic Lifting')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'Aktuell nivå', 'Current level')}</div>
                <div className="text-lg font-semibold" style={{ color: theme.colors.textPrimary }}>
                  {OLYMPIC_LABELS[settings.olympicLiftingLevel]?.[locale] ?? settings.olympicLiftingLevel}
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
              {text(locale, 'Träningstips', 'Training tips')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm" style={{ color: theme.colors.textPrimary }}>
              {settings.primaryFocus === 'strength' && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {text(locale, 'Fokusera på progressiv överbelastning med 2-for-2 regeln', 'Focus on progressive overload using the 2-for-2 rule')}
                </li>
              )}
              {settings.primaryFocus === 'gymnastics' && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  {text(locale, 'Öva skill-arbete när du är utvilad, innan styrkepass', 'Practice skill work while fresh, before strength sessions')}
                </li>
              )}
              {settings.olympicLiftingLevel === 'learning' && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {text(locale, 'Prioritera teknik med lätta vikter före belastning', 'Prioritize technique with light weights before loading')}
                </li>
              )}
              {settings.competitionInterest && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  {text(locale, 'Träna benchmark-workouts regelbundet för att mäta framsteg', 'Train benchmark workouts regularly to measure progress')}
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                {text(locale, 'Balansera push/pull och över-/underkroppsarbete', 'Balance push/pull and upper/lower body work')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                {text(locale, 'Prioritera rörlighet och mobilitet för att förebygga skador', 'Prioritize flexibility and mobility to prevent injuries')}
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
              {text(locale, 'Tillgänglig utrustning', 'Available equipment')}
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
