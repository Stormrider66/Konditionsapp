'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

const GOAL_CONFIG: Record<string, { label: string; icon: typeof Target; color: string; description: string }> = {
  weight_loss: { label: 'Viktminskning', icon: Scale, color: 'text-orange-500', description: 'Fokus på kaloriförbränning och metabolisk träning' },
  general_health: { label: 'Allmän hälsa', icon: Heart, color: 'text-red-500', description: 'Balanserad träning för kropp och sinne' },
  strength: { label: 'Styrka', icon: Dumbbell, color: 'text-purple-500', description: 'Bygga muskler och öka maxstyrka' },
  endurance: { label: 'Uthållighet', icon: Activity, color: 'text-blue-500', description: 'Förbättra kondition och uthållighet' },
  flexibility: { label: 'Rörlighet', icon: Target, color: 'text-green-500', description: 'Öka flexibilitet och förebygga skador' },
  stress_relief: { label: 'Stresshantering', icon: Heart, color: 'text-pink-500', description: 'Mindfulness och avkopplande träning' },
}

const FITNESS_LEVEL_LABELS: Record<string, { label: string; description: string }> = {
  sedentary: { label: 'Stillasittande', description: 'Ny på träning' },
  lightly_active: { label: 'Lätt aktiv', description: '1-2 pass/vecka' },
  moderately_active: { label: 'Måttligt aktiv', description: '3-4 pass/vecka' },
  very_active: { label: 'Mycket aktiv', description: '5-6 pass/vecka' },
  athlete: { label: 'Idrottare', description: 'Daglig träning' },
}

const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Promenader',
  running: 'Löpning',
  cycling: 'Cykling',
  swimming: 'Simning',
  gym: 'Gym',
  yoga: 'Yoga',
  pilates: 'Pilates',
  dancing: 'Dans',
  hiking: 'Vandring',
  group_classes: 'Gruppträning',
  martial_arts: 'Kampsport',
  tennis: 'Tennis/Padel',
  golf: 'Golf',
  skiing: 'Skidåkning',
  rowing: 'Rodd',
}

const TIME_LABELS: Record<string, string> = {
  morning: 'Morgon',
  afternoon: 'Eftermiddag',
  evening: 'Kväll',
  flexible: 'Flexibel',
}

function calculateBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null
  const heightInMeters = height / 100
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10
}

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Undervikt', color: 'text-yellow-500' }
  if (bmi < 25) return { label: 'Normalvikt', color: 'text-green-500' }
  if (bmi < 30) return { label: 'Övervikt', color: 'text-orange-500' }
  return { label: 'Fetma', color: 'text-red-500' }
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
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME

  const goalConfig = GOAL_CONFIG[settings.primaryGoal]
  const GoalIcon = goalConfig?.icon || Target
  const fitnessLevel = FITNESS_LEVEL_LABELS[settings.fitnessLevel]
  const bmi = calculateBMI(settings.currentWeight, settings.height)
  const bmiCategory = bmi ? getBMICategory(bmi) : null
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
            {fitnessLevel?.label} • {settings.yearsExercising} års erfarenhet
          </p>
        </div>

        <Badge variant="outline" className={`text-lg px-4 py-2 ${goalConfig?.color}`}>
          <GoalIcon className="h-4 w-4 mr-2" />
          {goalConfig?.label}
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
              <h3 className="font-semibold text-lg" style={{ color: theme.colors.textPrimary }}>{goalConfig?.label}</h3>
              <p style={{ color: theme.colors.textMuted }}>{goalConfig?.description}</p>
              {settings.secondaryGoals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {settings.secondaryGoals.map((goal) => (
                    <Badge key={goal} variant="secondary" className="text-xs">
                      {goal}
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
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>pass/vecka</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.preferredWorkoutDuration}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>min/pass</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{weeklyMinutes}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>min/vecka</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{TIME_LABELS[settings.preferredTimeOfDay]}</div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>träningstid</div>
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
              Hälsomått
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
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>kg nu</div>
                </div>
              )}

              {settings.targetWeight && (
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                  <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{settings.targetWeight}</div>
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>kg mål</div>
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
                  <div className="text-sm" style={{ color: theme.colors.textMuted }}>vilopuls</div>
                </div>
              )}
            </div>

            {settings.currentWeight && settings.targetWeight && settings.currentWeight !== settings.targetWeight && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm" style={{ color: theme.colors.textSecondary }}>
                  <span>Viktmål framsteg</span>
                  <span>{Math.round(weightProgress)}%</span>
                </div>
                <Progress value={weightProgress} className="h-2" />
                <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {settings.currentWeight > settings.targetWeight
                    ? `${settings.currentWeight - settings.targetWeight} kg kvar till målet`
                    : `${settings.targetWeight - settings.currentWeight} kg kvar till målet`}
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
            <CardTitle className="text-lg" style={{ color: theme.colors.textPrimary }}>Dina aktiviteter</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.preferredActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.preferredActivities.map((activity) => (
                  <Badge key={activity} variant="default">
                    {ACTIVITY_LABELS[activity] || activity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Inga aktiviteter valda ännu</p>
            )}

            <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: theme.colors.border }}>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: settings.hasGymAccess ? '#22c55e' : theme.colors.textMuted }}>
                  {settings.hasGymAccess ? '✓' : '○'} Gymtillgång
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: settings.hasHomeEquipment ? '#22c55e' : theme.colors.textMuted }}>
                  {settings.hasHomeEquipment ? '✓' : '○'} Hemmaträningsutrustning
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-5 w-5 text-green-500" />
              Träningstips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm" style={{ color: theme.colors.textSecondary }}>
              {settings.primaryGoal === 'weight_loss' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    Kombinera styrka och kondition för bästa resultat
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    HIIT-pass 2-3 ggr/vecka boostar förbränningen
                  </li>
                </>
              )}
              {settings.primaryGoal === 'strength' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    Fokusera på progressiv överbelastning
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    Vila 48h mellan samma muskelgrupp
                  </li>
                </>
              )}
              {settings.primaryGoal === 'endurance' && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    80% av träningen i låg intensitet
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    Öka volymen gradvis - max 10%/vecka
                  </li>
                </>
              )}
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Prioritera sömn och återhämtning
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                Drick vatten före, under och efter träning
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
              <h3 className="font-semibold" style={{ color: theme.colors.textPrimary }}>Veckans mål</h3>
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                {settings.weeklyWorkouts} träningspass à {settings.preferredWorkoutDuration} minuter = {weeklyMinutes} minuter total träning
              </p>
              <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                {weeklyMinutes >= 150
                  ? '✓ Du uppfyller WHOs rekommendation på 150 min/vecka!'
                  : `${150 - weeklyMinutes} minuter kvar till WHOs rekommendation på 150 min/vecka`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
