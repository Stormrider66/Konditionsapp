'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const GOAL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  weight_loss: { label: 'Viktminskning', icon: '⚖️', color: 'bg-orange-100 text-orange-800' },
  general_health: { label: 'Allmän Hälsa', icon: '❤️', color: 'bg-red-100 text-red-800' },
  strength: { label: 'Styrka', icon: '💪', color: 'bg-blue-100 text-blue-800' },
  endurance: { label: 'Uthållighet', icon: '🏃', color: 'bg-green-100 text-green-800' },
  flexibility: { label: 'Rörlighet', icon: '🧘', color: 'bg-purple-100 text-purple-800' },
  stress_relief: { label: 'Stresshantering', icon: '🧘‍♂️', color: 'bg-teal-100 text-teal-800' },
}

const LEVEL_LABELS: Record<string, { label: string; description: string }> = {
  sedentary: { label: 'Stillasittande', description: 'Lite eller ingen träning' },
  lightly_active: { label: 'Lätt Aktiv', description: '1-2 pass/vecka' },
  moderately_active: { label: 'Måttligt Aktiv', description: '3-4 pass/vecka' },
  very_active: { label: 'Mycket Aktiv', description: '5-6 pass/vecka' },
  athlete: { label: 'Atlet', description: 'Daglig träning' },
}

const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Promenader',
  running: 'Löpning',
  cycling: 'Cykling',
  swimming: 'Simning',
  gym: 'Gym/Styrketräning',
  yoga: 'Yoga',
  pilates: 'Pilates',
  hiit: 'HIIT',
  dance: 'Dans',
  martial_arts: 'Kampsport',
  team_sports: 'Lagsport',
  outdoor: 'Friluftsliv',
}

export function GeneralFitnessAthleteView({ clientId, clientName, settings, clientData }: GeneralFitnessAthleteViewProps) {
  const fitnessSettings = settings as GeneralFitnessSettings | undefined
  const [activeTab, setActiveTab] = useState('overview')

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
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Översikt
          </TabsTrigger>
          <TabsTrigger value="body" className="gap-2">
            <Scale className="h-4 w-4" />
            Kroppssammansättning
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="gap-2">
            <Utensils className="h-4 w-4" />
            Näring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏋️</span> Fitness Profil
              </CardTitle>
              <CardDescription>Ingen fitnessdata tillgänglig</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Atleten har inte angett fitnessinställningar ännu.
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
              Lägg till kroppssammansättningsdata först för näringsrekommendationer.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    )
  }

  const primaryGoal = GOAL_LABELS[fitnessSettings.primaryGoal || ''] || {
    label: fitnessSettings.primaryGoal || 'Ej angivet',
    icon: '🎯',
    color: 'bg-gray-100 text-gray-800'
  }

  const fitnessLevel = LEVEL_LABELS[fitnessSettings.fitnessLevel || ''] || {
    label: fitnessSettings.fitnessLevel || 'Ej angivet',
    description: ''
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
      <TabsList className="mb-4">
        <TabsTrigger value="overview" className="gap-2">
          <Activity className="h-4 w-4" />
          Översikt
        </TabsTrigger>
        <TabsTrigger value="body" className="gap-2">
          <Scale className="h-4 w-4" />
          Kroppssammansättning
        </TabsTrigger>
        <TabsTrigger value="nutrition" className="gap-2">
          <Utensils className="h-4 w-4" />
          Näring
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="space-y-4">
          {/* Goals Overview */}
          <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏋️</span> Fitness Dashboard
              </CardTitle>
              <CardDescription>Mål och framsteg</CardDescription>
            </div>
            <Badge className={primaryGoal.color}>
              {primaryGoal.icon} {primaryGoal.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">Nivå</p>
              <p className="font-bold text-sm">{fitnessLevel.label}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs text-muted-foreground">Pass/vecka</p>
              <p className="font-bold text-lg">{fitnessSettings.weeklyWorkouts || '-'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-xs text-muted-foreground">Gym</p>
              <p className="font-bold text-sm">{fitnessSettings.hasGymAccess ? 'Ja' : 'Nej'}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-xs text-muted-foreground">Vila HF</p>
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
              Viktmål
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Nuvarande: {fitnessSettings.currentWeight}kg</span>
                <span>Mål: {fitnessSettings.targetWeight}kg</span>
              </div>
              <Progress value={weightProgress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {weightToLose > 0 ? `${weightToLose.toFixed(1)}kg kvar till mål` : 'Mål uppnått!'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hälsomått</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Vikt</p>
              <p className="font-bold">{fitnessSettings.currentWeight ? `${fitnessSettings.currentWeight}kg` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Längd</p>
              <p className="font-bold">{fitnessSettings.height ? `${fitnessSettings.height}cm` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">BMI</p>
              <p className="font-bold">{bmi || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ålder</p>
              <p className="font-bold">{fitnessSettings.age ? `${fitnessSettings.age} år` : '-'}</p>
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
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Föredragna Aktiviteter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fitnessSettings.preferredActivities && fitnessSettings.preferredActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fitnessSettings.preferredActivities.map((activity) => (
                  <Badge key={activity} variant="secondary" className="bg-green-100 text-green-800">
                    {ACTIVITY_LABELS[activity] || activity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga angivna</p>
            )}
          </CardContent>
        </Card>

        {/* Secondary Goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Sekundära Mål
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fitnessSettings.secondaryGoals && fitnessSettings.secondaryGoals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fitnessSettings.secondaryGoals.map((goal) => {
                  const goalInfo = GOAL_LABELS[goal]
                  return (
                    <Badge key={goal} variant="outline">
                      {goalInfo?.icon} {goalInfo?.label || goal}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga angivna</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Träningsdetaljer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Passlängd</p>
              <p className="font-medium">
                {fitnessSettings.sessionLength ? `${fitnessSettings.sessionLength} min` : 'Ej angivet'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Erfarenhet</p>
              <p className="font-medium">
                {fitnessSettings.yearsExercising !== undefined
                  ? `${fitnessSettings.yearsExercising} år`
                  : 'Ej angivet'}
              </p>
            </div>
          </div>
          {fitnessSettings.homeEquipment && fitnessSettings.homeEquipment.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Hemmaträning utrustning</p>
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
              Lägg till kroppssammansättningsdata först för näringsrekommendationer.
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
