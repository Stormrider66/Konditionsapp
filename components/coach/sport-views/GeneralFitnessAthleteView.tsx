'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Heart, Scale, Dumbbell, Calendar, CheckCircle2, Utensils, Activity } from 'lucide-react'
import { BodyCompositionTracker } from '@/components/coach/body-composition/BodyCompositionTracker'
import { NutritionRecommendations } from '@/components/coach/body-composition/NutritionRecommendations'

interface GeneralFitnessSettings {
  primaryGoal?: string
  secondaryGoals?: string[]
  fitnessLevel?: string
  yearsExercising?: number
  preferredActivities?: string[]
  dislikedActivities?: string[]
  currentWeight?: number | null
  targetWeight?: number | null
  height?: number | null
  age?: number | null
  restingHeartRate?: number | null
  weeklyWorkouts?: number
  sessionLength?: number
  hasGymAccess?: boolean
  homeEquipment?: string[]
}

interface GeneralFitnessAthleteViewProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
  clientData?: {
    gender?: 'MALE' | 'FEMALE'
    birthDate?: string
    height?: number
  }
}

const GOAL_LABELS: Record<string, { label: string; labelSv: string; icon: string; color: string }> = {
  weight_loss: { label: 'Weight loss', labelSv: 'Viktminskning', icon: '⚖️', color: 'bg-orange-100 text-orange-800' },
  general_health: { label: 'General Health', labelSv: 'Allmän Hälsa', icon: '❤️', color: 'bg-red-100 text-red-800' },
  strength: { label: 'Strength', labelSv: 'Styrka', icon: '💪', color: 'bg-blue-100 text-blue-800' },
  endurance: { label: 'Endurance', labelSv: 'Uthållighet', icon: '🏃', color: 'bg-emerald-100 text-emerald-800' },
  flexibility: { label: 'Mobility', labelSv: 'Rörlighet', icon: '🧘', color: 'bg-purple-100 text-purple-800' },
  stress_relief: { label: 'Stress relief', labelSv: 'Stresshantering', icon: '🧘‍♂️', color: 'bg-teal-100 text-teal-800' },
}

const LEVEL_LABELS: Record<string, { label: string; labelSv: string; description: string; descriptionSv: string }> = {
  sedentary: { label: 'Sedentary', labelSv: 'Stillasittande', description: 'Little or no training', descriptionSv: 'Lite eller ingen träning' },
  lightly_active: { label: 'Lightly Active', labelSv: 'Lätt aktiv', description: '1-2 sessions/week', descriptionSv: '1-2 pass/vecka' },
  moderately_active: { label: 'Moderately Active', labelSv: 'Måttligt aktiv', description: '3-4 sessions/week', descriptionSv: '3-4 pass/vecka' },
  very_active: { label: 'Very Active', labelSv: 'Mycket aktiv', description: '5-6 sessions/week', descriptionSv: '5-6 pass/vecka' },
  athlete: { label: 'Athlete', labelSv: 'Atlet', description: 'Daily training', descriptionSv: 'Daglig träning' },
}

const ACTIVITY_LABELS: Record<string, { sv: string; en: string }> = {
  walking: { sv: 'Promenader', en: 'Walking' },
  running: { sv: 'Löpning', en: 'Running' },
  cycling: { sv: 'Cykling', en: 'Cycling' },
  swimming: { sv: 'Simning', en: 'Swimming' },
  gym: { sv: 'Gym/Styrketräning', en: 'Gym/Strength training' },
  yoga: { sv: 'Yoga', en: 'Yoga' },
  pilates: { sv: 'Pilates', en: 'Pilates' },
  hiit: { sv: 'HIIT', en: 'HIIT' },
  dance: { sv: 'Dans', en: 'Dance' },
  martial_arts: { sv: 'Kampsport', en: 'Martial arts' },
  team_sports: { sv: 'Lagsport', en: 'Team sports' },
  outdoor: { sv: 'Friluftsliv', en: 'Outdoor' },
}

export function GeneralFitnessAthleteView({ clientId, clientName, settings, clientData }: GeneralFitnessAthleteViewProps) {
  const locale = useLocale()
  const isSv = locale === 'sv'
  const t = (sv: string, en: string) => isSv ? sv : en
  const fitnessSettings = settings as GeneralFitnessSettings | undefined
  const [activeTab, setActiveTab] = useState('overview')

  const renderTabs = () => (
    <TabsList className="mb-4">
      <TabsTrigger value="overview" className="gap-2">
        <Activity className="h-4 w-4" />
        {t('Översikt', 'Overview')}
      </TabsTrigger>
      <TabsTrigger value="body" className="gap-2">
        <Scale className="h-4 w-4" />
        {t('Kroppssammansättning', 'Body Composition')}
      </TabsTrigger>
      <TabsTrigger value="nutrition" className="gap-2">
        <Utensils className="h-4 w-4" />
        {t('Näring', 'Nutrition')}
      </TabsTrigger>
    </TabsList>
  )

  // Build client data for nutrition component
  const nutritionClientData = clientData && fitnessSettings ? {
    name: clientName,
    gender: clientData.gender || 'MALE',
    birthDate: clientData.birthDate || new Date().toISOString(),
    height: clientData.height || fitnessSettings.height || 170,
    weight: fitnessSettings.currentWeight || undefined,
    sport: 'GENERAL_FITNESS',
  } : null

  if (!fitnessSettings) {
    // Still show body composition even without fitness settings
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {renderTabs()}

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏋️</span> {t('Fitnessprofil', 'Fitness Profile')}
              </CardTitle>
              <CardDescription>{t('Ingen fitnessdata tillgänglig', 'No fitness data available')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('Atleten har inte angett fitnessinställningar ännu.', 'The athlete has not entered fitness settings yet.')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="body">
          <BodyCompositionTracker clientId={clientId} clientName={clientName} />
        </TabsContent>

        <TabsContent value="nutrition">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('Lägg till kroppssammansättningsdata först för näringsrekommendationer.', 'Add body composition data first to get nutrition recommendations.')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    )
  }

  const primaryGoal = GOAL_LABELS[fitnessSettings.primaryGoal || ''] || {
    label: fitnessSettings.primaryGoal || 'Ej angivet',
    labelSv: fitnessSettings.primaryGoal || 'Ej angivet',
    icon: '🎯',
    color: 'bg-slate-100 text-slate-800'
  }

  const fitnessLevel = LEVEL_LABELS[fitnessSettings.fitnessLevel || ''] || {
    label: fitnessSettings.fitnessLevel || 'Ej angivet',
    labelSv: fitnessSettings.fitnessLevel || 'Ej angivet',
    description: '',
    descriptionSv: '',
  }

  // Calculate weight progress if applicable
  const hasWeightGoal = fitnessSettings.primaryGoal === 'weight_loss' &&
    fitnessSettings.currentWeight &&
    fitnessSettings.targetWeight
  const weightToLose = hasWeightGoal
    ? fitnessSettings.currentWeight! - fitnessSettings.targetWeight!
    : 0
  const weightProgress = hasWeightGoal && weightToLose > 0
    ? Math.max(0, 100 - ((fitnessSettings.currentWeight! - fitnessSettings.targetWeight!) / weightToLose) * 100)
    : 0

  // Calculate BMI if data available
  const bmi = fitnessSettings.currentWeight && fitnessSettings.height
    ? (fitnessSettings.currentWeight / Math.pow(fitnessSettings.height / 100, 2)).toFixed(1)
    : null

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      {renderTabs()}

      <TabsContent value="overview">
        <div className="space-y-4">
          {/* Goals Overview */}
          <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏋️</span> {t('Fitnessöversikt', 'Fitness Dashboard')}
              </CardTitle>
              <CardDescription>{t('Mål och framsteg', 'Goals and progress')}</CardDescription>
            </div>
            <Badge className={primaryGoal.color}>
              {primaryGoal.icon} {isSv ? primaryGoal.labelSv : primaryGoal.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('Nivå', 'Level')}</p>
              <p className="font-bold text-sm">{isSv ? fitnessLevel.labelSv : fitnessLevel.label}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('Pass/vecka', 'Sessions/week')}</p>
              <p className="font-bold text-lg">{fitnessSettings.weeklyWorkouts || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Gym</p>
              <p className="font-bold text-sm">{fitnessSettings.hasGymAccess ? t('Ja', 'Yes') : t('Nej', 'No')}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Heart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('Vila HF', 'Resting HR')}</p>
              <p className="font-bold text-lg">
                {fitnessSettings.restingHeartRate ? `${fitnessSettings.restingHeartRate}` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Progress (if applicable) */}
      {hasWeightGoal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              {t('Viktmål', 'Weight Goal')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t('Nuvarande', 'Current')}: {fitnessSettings.currentWeight}kg</span>
                <span>{t('Mål', 'Goal')}: {fitnessSettings.targetWeight}kg</span>
              </div>
              <Progress value={weightProgress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {weightToLose > 0 ? t(`${weightToLose.toFixed(1)}kg kvar till mål`, `${weightToLose.toFixed(1)}kg remaining to goal`) : t('Mål uppnått!', 'Goal reached!')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Hälsomått', 'Health Metrics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">{t('Vikt', 'Weight')}</p>
              <p className="font-bold">{fitnessSettings.currentWeight ? `${fitnessSettings.currentWeight}kg` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Längd', 'Height')}</p>
              <p className="font-bold">{fitnessSettings.height ? `${fitnessSettings.height}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">BMI</p>
              <p className="font-bold">{bmi || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Ålder', 'Age')}</p>
              <p className="font-bold">{fitnessSettings.age ? `${fitnessSettings.age} ${t('år', 'yrs')}` : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Preferred Activities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {t('Föredragna aktiviteter', 'Preferred Activities')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fitnessSettings.preferredActivities && fitnessSettings.preferredActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fitnessSettings.preferredActivities.map((activity) => (
                  <Badge key={activity} variant="secondary" className="bg-emerald-100 text-emerald-800">
                    {ACTIVITY_LABELS[activity]?.[isSv ? 'sv' : 'en'] || activity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('Inga angivna', 'None specified')}</p>
            )}
          </CardContent>
        </Card>

        {/* Secondary Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              {t('Sekundära mål', 'Secondary Goals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fitnessSettings.secondaryGoals && fitnessSettings.secondaryGoals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fitnessSettings.secondaryGoals.map((goal) => {
                  const goalInfo = GOAL_LABELS[goal]
                  return (
                    <Badge key={goal} variant="outline">
                      {goalInfo?.icon} {goalInfo ? (isSv ? goalInfo.labelSv : goalInfo.label) : goal}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('Inga angivna', 'None specified')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Träningsdetaljer', 'Training Details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('Passlängd', 'Session length')}</p>
              <p className="font-medium">
                {fitnessSettings.sessionLength ? `${fitnessSettings.sessionLength} min` : t('Ej angivet', 'Not specified')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Erfarenhet', 'Experience')}</p>
              <p className="font-medium">
                {fitnessSettings.yearsExercising !== undefined
                  ? `${fitnessSettings.yearsExercising} ${t('år', 'yrs')}`
                  : t('Ej angivet', 'Not specified')}
              </p>
            </div>
          </div>
          {fitnessSettings.homeEquipment && fitnessSettings.homeEquipment.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">{t('Hemmaträning utrustning', 'Home training equipment')}</p>
              <div className="flex flex-wrap gap-1">
                {fitnessSettings.homeEquipment.map((equip) => (
                  <Badge key={equip} variant="outline" className="text-xs">
                    {equip}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </TabsContent>

      <TabsContent value="body">
        <BodyCompositionTracker clientId={clientId} clientName={clientName} />
      </TabsContent>

      <TabsContent value="nutrition">
        {nutritionClientData ? (
          <NutritionRecommendations
            clientId={clientId}
            clientData={nutritionClientData}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('Lägg till kroppssammansättningsdata först för näringsrekommendationer.', 'Add body composition data first to get nutrition recommendations.')}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
