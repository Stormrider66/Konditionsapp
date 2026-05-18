'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Heart, Target, Dumbbell, Activity, Flame, Scale } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface GeneralFitnessSettings {
  // Primary goals
  primaryGoal: 'weight_loss' | 'general_health' | 'strength' | 'endurance' | 'flexibility' | 'stress_relief'
  secondaryGoals: string[]

  // Current fitness level
  fitnessLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete'
  yearsExercising: number

  // Preferred activities
  preferredActivities: string[]
  dislikedActivities: string[]

  // Health metrics (optional)
  currentWeight: number | null
  targetWeight: number | null
  height: number | null
  age: number | null
  restingHeartRate: number | null

  // Training preferences
  weeklyWorkouts: number
  preferredWorkoutDuration: number // minutes
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  preferIndoor: boolean
  preferOutdoor: boolean
  preferGroup: boolean
  preferSolo: boolean

  // Equipment access
  hasGymAccess: boolean
  hasHomeEquipment: boolean
  homeEquipment: string[]

  // Limitations
  hasInjuries: boolean
  injuryNotes: string
  mobilityLimitations: string[]
}

export const DEFAULT_GENERAL_FITNESS_SETTINGS: GeneralFitnessSettings = {
  primaryGoal: 'general_health',
  secondaryGoals: [],

  fitnessLevel: 'moderately_active',
  yearsExercising: 1,

  preferredActivities: [],
  dislikedActivities: [],

  currentWeight: null,
  targetWeight: null,
  height: null,
  age: null,
  restingHeartRate: null,

  weeklyWorkouts: 3,
  preferredWorkoutDuration: 45,
  preferredTimeOfDay: 'flexible',
  preferIndoor: true,
  preferOutdoor: true,
  preferGroup: false,
  preferSolo: true,

  hasGymAccess: false,
  hasHomeEquipment: false,
  homeEquipment: [],

  hasInjuries: false,
  injuryNotes: '',
  mobilityLimitations: [],
}

const PRIMARY_GOALS = [
  { value: 'weight_loss', label: 'primaryGoals.weightLoss.label', icon: Scale, description: 'primaryGoals.weightLoss.description' },
  { value: 'general_health', label: 'primaryGoals.generalHealth.label', icon: Heart, description: 'primaryGoals.generalHealth.description' },
  { value: 'strength', label: 'primaryGoals.strength.label', icon: Dumbbell, description: 'primaryGoals.strength.description' },
  { value: 'endurance', label: 'primaryGoals.endurance.label', icon: Activity, description: 'primaryGoals.endurance.description' },
  { value: 'flexibility', label: 'primaryGoals.flexibility.label', icon: Target, description: 'primaryGoals.flexibility.description' },
  { value: 'stress_relief', label: 'primaryGoals.stressRelief.label', icon: Heart, description: 'primaryGoals.stressRelief.description' },
]

const SECONDARY_GOALS = [
  { id: 'betterSleep', label: 'secondaryGoals.betterSleep' },
  { id: 'moreEnergy', label: 'secondaryGoals.moreEnergy' },
  { id: 'betterPosture', label: 'secondaryGoals.betterPosture' },
  { id: 'socialLife', label: 'secondaryGoals.socialLife' },
  { id: 'moreConfidence', label: 'secondaryGoals.moreConfidence' },
  { id: 'injuryPrevention', label: 'secondaryGoals.injuryPrevention' },
  { id: 'betterBalance', label: 'secondaryGoals.betterBalance' },
  { id: 'mentalSharpness', label: 'secondaryGoals.mentalSharpness' },
]

const FITNESS_LEVELS = [
  { value: 'sedentary', label: 'fitnessLevels.sedentary.label', description: 'fitnessLevels.sedentary.description' },
  { value: 'lightly_active', label: 'fitnessLevels.lightlyActive.label', description: 'fitnessLevels.lightlyActive.description' },
  { value: 'moderately_active', label: 'fitnessLevels.moderatelyActive.label', description: 'fitnessLevels.moderatelyActive.description' },
  { value: 'very_active', label: 'fitnessLevels.veryActive.label', description: 'fitnessLevels.veryActive.description' },
  { value: 'athlete', label: 'fitnessLevels.athlete.label', description: 'fitnessLevels.athlete.description' },
]

const ACTIVITIES = [
  { id: 'walking', label: 'activities.walking' },
  { id: 'running', label: 'activities.running' },
  { id: 'cycling', label: 'activities.cycling' },
  { id: 'swimming', label: 'activities.swimming' },
  { id: 'gym', label: 'activities.gym' },
  { id: 'yoga', label: 'activities.yoga' },
  { id: 'pilates', label: 'activities.pilates' },
  { id: 'dancing', label: 'activities.dancing' },
  { id: 'hiking', label: 'activities.hiking' },
  { id: 'group_classes', label: 'activities.groupClasses' },
  { id: 'martial_arts', label: 'activities.martialArts' },
  { id: 'tennis', label: 'activities.tennis' },
  { id: 'golf', label: 'activities.golf' },
  { id: 'skiing', label: 'activities.skiing' },
  { id: 'rowing', label: 'activities.rowing' },
]

const HOME_EQUIPMENT = [
  { id: 'dumbbells', label: 'homeEquipment.dumbbells' },
  { id: 'resistance_bands', label: 'homeEquipment.resistanceBands' },
  { id: 'yoga_mat', label: 'homeEquipment.yogaMat' },
  { id: 'kettlebell', label: 'homeEquipment.kettlebell' },
  { id: 'pull_up_bar', label: 'homeEquipment.pullUpBar' },
  { id: 'treadmill', label: 'homeEquipment.treadmill' },
  { id: 'exercise_bike', label: 'homeEquipment.exerciseBike' },
  { id: 'rowing_machine', label: 'homeEquipment.rowingMachine' },
  { id: 'foam_roller', label: 'homeEquipment.foamRoller' },
  { id: 'trx', label: 'homeEquipment.trx' },
]

interface GeneralFitnessOnboardingProps {
  settings: GeneralFitnessSettings
  onUpdate: (settings: GeneralFitnessSettings) => void
}

export function GeneralFitnessOnboarding({ settings, onUpdate }: GeneralFitnessOnboardingProps) {
  const t = useTranslations('components.onboarding.generalFitness')
  const updateField = <K extends keyof GeneralFitnessSettings>(field: K, value: GeneralFitnessSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const toggleArrayItem = (field: 'preferredActivities' | 'dislikedActivities' | 'secondaryGoals' | 'homeEquipment' | 'mobilityLimitations', item: string) => {
    const current = settings[field] as string[]
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateField(field, updated)
  }

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            {t('titles.primaryGoal')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.primaryGoal')}
          </CardDescription>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRIMARY_GOALS.map((goal) => {
              const Icon = goal.icon
              const isSelected = settings.primaryGoal === goal.value
              return (
                <div
                  key={goal.value}
                  onClick={() => updateField('primaryGoal', goal.value as GeneralFitnessSettings['primaryGoal'])}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-transparent bg-muted hover:border-green-200'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-sm">{t(goal.label)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t(goal.description)}</div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 space-y-2">
            <Label>{t('labels.secondaryGoals')}</Label>
            <div className="flex flex-wrap gap-2">
              {SECONDARY_GOALS.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => toggleArrayItem('secondaryGoals', goal.id)}
                  className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-all ${
                    settings.secondaryGoals.includes(goal.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t(goal.label)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitness Level */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {t('titles.currentFitness')}
            </CardTitle>
            <CardDescription>
            {t('descriptions.currentFitness')}
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.fitnessLevel')}</Label>
            <Select
              value={settings.fitnessLevel}
              onValueChange={(value) => updateField('fitnessLevel', value as GeneralFitnessSettings['fitnessLevel'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectFitnessLevel')} />
              </SelectTrigger>
              <SelectContent>
                {FITNESS_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{t(level.label)}</div>
                      <div className="text-xs text-muted-foreground">{t(level.description)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.yearsExercising')}</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={settings.yearsExercising}
              onChange={(e) => updateField('yearsExercising', parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {t('titles.healthMetrics')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.healthMetrics')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.currentWeight')}</Label>
              <Input
                type="number"
                min={30}
                max={250}
                value={settings.currentWeight || ''}
                onChange={(e) => updateField('currentWeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.currentWeight')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.targetWeight')}</Label>
              <Input
                type="number"
                min={30}
                max={250}
                value={settings.targetWeight || ''}
                onChange={(e) => updateField('targetWeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.targetWeight')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.height')}</Label>
              <Input
                type="number"
                min={100}
                max={250}
                value={settings.height || ''}
                onChange={(e) => updateField('height', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.height')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.age')}</Label>
              <Input
                type="number"
                min={16}
                max={100}
                value={settings.age || ''}
                onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.age')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.restingHeartRate')}</Label>
              <Input
                type="number"
                min={30}
                max={120}
                value={settings.restingHeartRate || ''}
                onChange={(e) => updateField('restingHeartRate', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.restingHeartRate')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferred Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('titles.activities')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.activities')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.preferredActivities')}</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => toggleArrayItem('preferredActivities', activity.id)}
                  className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                    settings.preferredActivities.includes(activity.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t(activity.label)}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.dislikedActivities')}</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => toggleArrayItem('dislikedActivities', activity.id)}
                  className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                    settings.dislikedActivities.includes(activity.id)
                      ? 'bg-red-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t(activity.label)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-500" />
            {t('titles.trainingPreferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.weeklyWorkouts', { count: settings.weeklyWorkouts })}</Label>
              <Slider
                value={[settings.weeklyWorkouts]}
                onValueChange={([value]) => updateField('weeklyWorkouts', value)}
                min={1}
                max={7}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('labels.preferredWorkoutDuration', {
                  minutes: settings.preferredWorkoutDuration,
                })}
              </Label>
              <Slider
                value={[settings.preferredWorkoutDuration]}
                onValueChange={([value]) => updateField('preferredWorkoutDuration', value)}
                min={15}
                max={120}
                step={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.preferredTimeOfDay')}</Label>
            <Select
              value={settings.preferredTimeOfDay}
              onValueChange={(value) => updateField('preferredTimeOfDay', value as GeneralFitnessSettings['preferredTimeOfDay'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">{t('timeOfDay.morning')}</SelectItem>
                <SelectItem value="afternoon">{t('timeOfDay.afternoon')}</SelectItem>
                <SelectItem value="evening">{t('timeOfDay.evening')}</SelectItem>
                <SelectItem value="flexible">{t('timeOfDay.flexible')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="indoor"
                checked={settings.preferIndoor}
                onCheckedChange={(checked) => updateField('preferIndoor', checked === true)}
              />
              <Label htmlFor="indoor">{t('trainingMode.indoor')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="outdoor"
                checked={settings.preferOutdoor}
                onCheckedChange={(checked) => updateField('preferOutdoor', checked === true)}
              />
              <Label htmlFor="outdoor">{t('trainingMode.outdoor')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group"
                checked={settings.preferGroup}
                onCheckedChange={(checked) => updateField('preferGroup', checked === true)}
              />
              <Label htmlFor="group">{t('trainingMode.group')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="solo"
                checked={settings.preferSolo}
                onCheckedChange={(checked) => updateField('preferSolo', checked === true)}
              />
              <Label htmlFor="solo">{t('trainingMode.solo')}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>{t('titles.equipment')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gym"
                checked={settings.hasGymAccess}
                onCheckedChange={(checked) => updateField('hasGymAccess', checked === true)}
              />
              <Label htmlFor="gym">{t('labels.hasGymAccess')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="homeequip"
                checked={settings.hasHomeEquipment}
                onCheckedChange={(checked) => updateField('hasHomeEquipment', checked === true)}
              />
              <Label htmlFor="homeequip">{t('labels.hasHomeEquipment')}</Label>
            </div>
          </div>

          {settings.hasHomeEquipment && (
            <div className="space-y-2">
              <Label>{t('labels.homeEquipment')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {HOME_EQUIPMENT.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleArrayItem('homeEquipment', item.id)}
                    className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                      settings.homeEquipment.includes(item.id)
                        ? 'bg-purple-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                    {t(item.label)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>{t('titles.limitations')}</CardTitle>
          <CardDescription>
            {t('descriptions.limitations')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="injuries"
              checked={settings.hasInjuries}
              onCheckedChange={(checked) => updateField('hasInjuries', checked === true)}
            />
            <Label htmlFor="injuries">{t('labels.hasInjuries')}</Label>
          </div>

          {settings.hasInjuries && (
            <div className="space-y-2">
              <Label>{t('labels.injuryNotes')}</Label>
              <Input
                value={settings.injuryNotes}
                onChange={(e) => updateField('injuryNotes', e.target.value)}
                placeholder={t('placeholders.injuryNotes')}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
