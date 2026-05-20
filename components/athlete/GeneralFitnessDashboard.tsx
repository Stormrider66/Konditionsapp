'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'
import {
  Target,
  Heart,
  Dumbbell,
  Activity,
  Flame,
  TrendingUp,
  Calendar,
  Scale,
  Clock
} from 'lucide-react'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'

interface GeneralFitnessSettings {
  primaryGoal: 'weight_loss' | 'general_health' | 'strength' | 'endurance' | 'flexibility' | 'stress_relief'
  secondaryGoals: string[]
  fitnessLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete'
  yearsExercising: number
  preferredActivities: string[]
  currentWeight: number | null
  targetWeight: number | null
  height: number | null
  age: number | null
  restingHeartRate: number | null
  weeklyWorkouts: number
  preferredWorkoutDuration: number
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  hasGymAccess: boolean
  hasHomeEquipment: boolean
}

interface GeneralFitnessDashboardProps {
  settings: GeneralFitnessSettings
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const text = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const GOAL_CONFIG: Record<string, { label: Record<AppLocale, string>; icon: typeof Target; color: string; description: Record<AppLocale, string> }> = {
  weight_loss: { label: { sv: 'Viktminskning', en: 'Weight loss' }, icon: Scale, color: 'text-orange-500', description: { sv: 'Fokus på kaloriförbränning och metabolisk träning', en: 'Focus on calorie burn and metabolic training' } },
  general_health: { label: { sv: 'Allmän hälsa', en: 'General health' }, icon: Heart, color: 'text-red-500', description: { sv: 'Balanserad träning för kropp och sinne', en: 'Balanced training for body and mind' } },
  strength: { label: { sv: 'Styrka', en: 'Strength' }, icon: Dumbbell, color: 'text-purple-500', description: { sv: 'Bygga muskler och öka maxstyrka', en: 'Build muscle and increase maximal strength' } },
  endurance: { label: { sv: 'Uthållighet', en: 'Endurance' }, icon: Activity, color: 'text-blue-500', description: { sv: 'Förbättra kondition och uthållighet', en: 'Improve conditioning and stamina' } },
  flexibility: { label: { sv: 'Rörlighet', en: 'Mobility' }, icon: Target, color: 'text-green-500', description: { sv: 'Öka flexibilitet och förebygga skador', en: 'Improve flexibility and prevent injuries' } },
  stress_relief: { label: { sv: 'Stresshantering', en: 'Stress relief' }, icon: Heart, color: 'text-pink-500', description: { sv: 'Mindfulness och avkopplande träning', en: 'Mindfulness and restorative training' } },
}

const FITNESS_LEVEL_LABELS: Record<string, { label: Record<AppLocale, string>; description: Record<AppLocale, string> }> = {
  sedentary: { label: { sv: 'Stillasittande', en: 'Sedentary' }, description: { sv: 'Ny på träning', en: 'New to training' } },
  lightly_active: { label: { sv: 'Lätt aktiv', en: 'Lightly active' }, description: { sv: '1-2 pass/vecka', en: '1-2 sessions/week' } },
  moderately_active: { label: { sv: 'Måttligt aktiv', en: 'Moderately active' }, description: { sv: '3-4 pass/vecka', en: '3-4 sessions/week' } },
  very_active: { label: { sv: 'Mycket aktiv', en: 'Very active' }, description: { sv: '5-6 pass/vecka', en: '5-6 sessions/week' } },
  athlete: { label: { sv: 'Idrottare', en: 'Athlete' }, description: { sv: 'Daglig träning', en: 'Daily training' } },
}

const ACTIVITY_LABELS: Record<string, Record<AppLocale, string>> = {
  walking: { sv: 'Promenader', en: 'Walking' },
  running: { sv: 'Löpning', en: 'Running' },
  cycling: { sv: 'Cykling', en: 'Cycling' },
  swimming: { sv: 'Simning', en: 'Swimming' },
  gym: { sv: 'Gym', en: 'Gym' },
  yoga: { sv: 'Yoga', en: 'Yoga' },
  pilates: { sv: 'Pilates', en: 'Pilates' },
  dancing: { sv: 'Dans', en: 'Dancing' },
  hiking: { sv: 'Vandring', en: 'Hiking' },
  group_classes: { sv: 'Gruppträning', en: 'Group classes' },
  martial_arts: { sv: 'Kampsport', en: 'Martial arts' },
  tennis: { sv: 'Tennis/Padel', en: 'Tennis/Padel' },
  golf: { sv: 'Golf', en: 'Golf' },
  skiing: { sv: 'Skidåkning', en: 'Skiing' },
  rowing: { sv: 'Rodd', en: 'Rowing' },
}

const TIME_LABELS: Record<string, Record<AppLocale, string>> = {
  morning: { sv: 'Morgon', en: 'Morning' },
  afternoon: { sv: 'Eftermiddag', en: 'Afternoon' },
  evening: { sv: 'Kväll', en: 'Evening' },
  flexible: { sv: 'Flexibel', en: 'Flexible' },
}

function calculateBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null
  const heightInMeters = height / 100
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10
}

function getBMICategory(bmi: number, locale: AppLocale): { label: string; color: string } {
  if (bmi < 18.5) return { label: text(locale, 'Undervikt', 'Underweight'), color: 'text-yellow-500' }
  if (bmi < 25) return { label: text(locale, 'Normalvikt', 'Normal weight'), color: 'text-green-500' }
  if (bmi < 30) return { label: text(locale, 'Övervikt', 'Overweight'), color: 'text-orange-500' }
  return { label: text(locale, 'Fetma', 'Obesity'), color: 'text-red-500' }
}

function calculateWeightProgress(current: number | null, target: number | null): number {
  if (!current || !target) return 0
  if (target === current) return 100
  // For weight loss goals
  if (target < current) {
    const startWeight = current * 1.1 // Assume started 10% higher
    const progress = ((startWeight - current) / (startWeight - target)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }
  // For weight gain goals
  const startWeight = current * 0.9
  const progress = ((current - startWeight) / (target - startWeight)) * 100
  return Math.min(Math.max(progress, 0), 100)
}

export function GeneralFitnessDashboard({ settings }: GeneralFitnessDashboardProps) {
  const locale = getAppLocale(useLocale())
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const dashboardT = useTranslations('components.athleteDashboard')

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{text(locale, 'Allmän fitness', 'General fitness')}</CardTitle>
          <CardDescription>
            {dashboardT('generalFitnessNoSettings')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const goalConfig = GOAL_CONFIG[settings.primaryGoal]
  const GoalIcon = goalConfig?.icon || Target
  const fitnessLevel = FITNESS_LEVEL_LABELS[settings.fitnessLevel]
  const bmi = calculateBMI(settings.currentWeight, settings.height)
  const bmiCategory = bmi ? getBMICategory(bmi, locale) : null
  const weightProgress = calculateWeightProgress(settings.currentWeight, settings.targetWeight)

  const weeklyMinutes = settings.weeklyWorkouts * settings.preferredWorkoutDuration

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            Fitness Dashboard
          </h2>
          <p className="text-muted-foreground">
            {fitnessLevel?.label[locale]} • {settings.yearsExercising} {text(locale, 'års erfarenhet', 'years experience')}
          </p>
        </div>

        <Badge variant="outline" className={`text-lg px-4 py-2 ${goalConfig?.color}`}>
          <GoalIcon className="h-4 w-4 mr-2" />
          {goalConfig?.label[locale]}
        </Badge>
      </div>

      {/* Goal Card */}
      <Card
        className="border-0"
        style={{
          background: theme.id === 'FITAPP_DARK'
            ? 'linear-gradient(to right, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15))'
            : 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
        }}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <GoalIcon className={`h-10 w-10 ${goalConfig?.color} flex-shrink-0`} />
            <div>
              <h3 className="font-semibold text-lg" style={{ color: theme.colors.textPrimary }}>{goalConfig?.label[locale]}</h3>
              <p style={{ color: theme.colors.textMuted }}>{goalConfig?.description[locale]}</p>
              {settings.secondaryGoals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {settings.secondaryGoals.map((goal) => (
                    <Badge key={goal} variant="secondary" className="text-xs">
                      {GOAL_CONFIG[goal]?.label[locale] || goal}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.weeklyWorkouts}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'pass/vecka', 'sessions/week')}</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.preferredWorkoutDuration}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'min/pass', 'min/session')}</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{weeklyMinutes}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'min/vecka', 'min/week')}</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{TIME_LABELS[settings.preferredTimeOfDay]?.[locale]}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'träningstid', 'training time')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics */}
      {(settings.currentWeight || settings.targetWeight || bmi) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Scale className="h-5 w-5 text-blue-500" />
              {text(locale, 'Hälsomått', 'Health metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {settings.currentWeight && (
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.currentWeight}</div>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'kg nu', 'kg now')}</div>
                </div>
              )}

              {settings.targetWeight && (
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.targetWeight}</div>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'kg mål', 'kg target')}</div>
                </div>
              )}

              {bmi && (
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <div className={`text-2xl font-bold ${bmiCategory?.color}`}>{bmi}</div>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>BMI ({bmiCategory?.label})</div>
                </div>
              )}

              {settings.restingHeartRate && (
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.restingHeartRate}</div>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'vilopuls', 'resting HR')}</div>
                </div>
              )}
            </div>

            {settings.currentWeight && settings.targetWeight && settings.currentWeight !== settings.targetWeight && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm" style={{ color: theme.colors.textSecondary }}>
                  <span>{text(locale, 'Viktmål framsteg', 'Weight goal progress')}</span>
                  <span>{Math.round(weightProgress)}%</span>
                </div>
                <Progress value={weightProgress} className="h-2" />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {settings.currentWeight > settings.targetWeight
                    ? text(locale, `${settings.currentWeight - settings.targetWeight} kg kvar till målet`, `${settings.currentWeight - settings.targetWeight} kg left to target`)
                    : text(locale, `${settings.targetWeight - settings.currentWeight} kg kvar till målet`, `${settings.targetWeight - settings.currentWeight} kg left to target`)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preferred Activities & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: theme.colors.textPrimary }}>{text(locale, 'Dina aktiviteter', 'Your activities')}</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.preferredActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.preferredActivities.map((activity) => (
                  <Badge key={activity} variant="default">
                    {ACTIVITY_LABELS[activity]?.[locale] || activity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>{text(locale, 'Inga aktiviteter valda ännu', 'No activities selected yet')}</p>
            )}

            <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: theme.colors.border }}>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: settings.hasGymAccess ? '#22c55e' : theme.colors.textMuted }}>
                  {settings.hasGymAccess ? '✓' : '○'} {text(locale, 'Gymtillgång', 'Gym access')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: settings.hasHomeEquipment ? '#22c55e' : theme.colors.textMuted }}>
                  {settings.hasHomeEquipment ? '✓' : '○'} {text(locale, 'Hemmaträningsutrustning', 'Home training equipment')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5 text-green-500" />
              {text(locale, 'Träningstips', 'Training tips')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm" style={{ color: theme.colors.textSecondary }}>
              {settings.primaryGoal === 'weight_loss' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    {text(locale, 'Kombinera styrka och kondition för bästa resultat', 'Combine strength and cardio for best results')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    {text(locale, 'HIIT-pass 2-3 ggr/vecka boostar förbränningen', 'HIIT sessions 2-3 times/week boost calorie burn')}
                  </li>
                </>
              )}
              {settings.primaryGoal === 'strength' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    {text(locale, 'Fokusera på progressiv överbelastning', 'Focus on progressive overload')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    {text(locale, 'Vila 48h mellan samma muskelgrupp', 'Rest 48h before training the same muscle group')}
                  </li>
                </>
              )}
              {settings.primaryGoal === 'endurance' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {text(locale, '80% av träningen i låg intensitet', 'Keep 80% of training at low intensity')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {text(locale, 'Öka volymen gradvis - max 10%/vecka', 'Increase volume gradually - max 10%/week')}
                  </li>
                </>
              )}
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                {text(locale, 'Prioritera sömn och återhämtning', 'Prioritize sleep and recovery')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                {text(locale, 'Drick vatten före, under och efter träning', 'Drink water before, during, and after training')}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Target */}
      <Card
        style={{
          backgroundColor: theme.id === 'FITAPP_DARK' ? '#172554' : '#eff6ff',
          borderColor: theme.id === 'FITAPP_DARK' ? '#1e40af' : '#bfdbfe',
        }}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Target className="h-10 w-10 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold" style={{ color: theme.colors.textPrimary }}>{text(locale, 'Veckans mål', 'Weekly goal')}</h3>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {settings.weeklyWorkouts} {text(locale, 'träningspass à', 'training sessions at')} {settings.preferredWorkoutDuration} {text(locale, 'minuter', 'minutes')} = {weeklyMinutes} {text(locale, 'minuter total träning', 'minutes total training')}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                {weeklyMinutes >= 150
                  ? text(locale, '✓ Du uppfyller WHOs rekommendation på 150 min/vecka!', '✓ You meet the WHO recommendation of 150 min/week!')
                  : text(locale, `${150 - weeklyMinutes} minuter kvar till WHOs rekommendation på 150 min/vecka`, `${150 - weeklyMinutes} minutes left to reach the WHO recommendation of 150 min/week`)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
