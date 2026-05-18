'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Target, Scale, TrendingDown, TrendingUp, Minus, Activity, Leaf, Utensils } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface NutritionSettings {
  goalType: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
  targetWeightKg: number | null
  weeklyChangeKg: number
  macroProfile: 'BALANCED' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'ENDURANCE' | 'STRENGTH' | 'KETO' | 'CUSTOM'
  dietaryStyle: 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN' | 'PESCATARIAN' | 'FLEXITARIAN'
  allergies: string[]
  intolerances: string[]
  activityLevel: 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'ACTIVE' | 'VERY_ACTIVE' | 'ATHLETE'
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  goalType: 'MAINTAIN',
  targetWeightKg: null,
  weeklyChangeKg: 0.5,
  macroProfile: 'BALANCED',
  dietaryStyle: 'OMNIVORE',
  allergies: [],
  intolerances: [],
  activityLevel: 'ACTIVE',
}

const GOAL_TYPES = [
  { value: 'WEIGHT_LOSS', label: 'goalTypes.weightLoss.label', icon: TrendingDown, description: 'goalTypes.weightLoss.description' },
  { value: 'WEIGHT_GAIN', label: 'goalTypes.weightGain.label', icon: TrendingUp, description: 'goalTypes.weightGain.description' },
  { value: 'MAINTAIN', label: 'goalTypes.maintain.label', icon: Minus, description: 'goalTypes.maintain.description' },
  { value: 'BODY_RECOMP', label: 'goalTypes.bodyRecomp.label', icon: Target, description: 'goalTypes.bodyRecomp.description' },
] as const

const MACRO_PROFILES = [
  { value: 'BALANCED', label: 'macroProfiles.balanced.label', description: 'macroProfiles.balanced.description' },
  { value: 'HIGH_PROTEIN', label: 'macroProfiles.highProtein.label', description: 'macroProfiles.highProtein.description' },
  { value: 'LOW_CARB', label: 'macroProfiles.lowCarb.label', description: 'macroProfiles.lowCarb.description' },
  { value: 'KETO', label: 'macroProfiles.keto.label', description: 'macroProfiles.keto.description' },
  { value: 'ENDURANCE', label: 'macroProfiles.endurance.label', description: 'macroProfiles.endurance.description' },
  { value: 'STRENGTH', label: 'macroProfiles.strength.label', description: 'macroProfiles.strength.description' },
] as const

const DIETARY_STYLES = [
  { value: 'OMNIVORE', label: 'dietaryStyles.omnivore' },
  { value: 'FLEXITARIAN', label: 'dietaryStyles.flexitarian' },
  { value: 'PESCATARIAN', label: 'dietaryStyles.pescatarian' },
  { value: 'VEGETARIAN', label: 'dietaryStyles.vegetarian' },
  { value: 'VEGAN', label: 'dietaryStyles.vegan' },
] as const

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'activityLevels.sedentary.label', description: 'activityLevels.sedentary.description' },
  { value: 'LIGHTLY_ACTIVE', label: 'activityLevels.lightlyActive.label', description: 'activityLevels.lightlyActive.description' },
  { value: 'ACTIVE', label: 'activityLevels.active.label', description: 'activityLevels.active.description' },
  { value: 'VERY_ACTIVE', label: 'activityLevels.veryActive.label', description: 'activityLevels.veryActive.description' },
  { value: 'ATHLETE', label: 'activityLevels.athlete.label', description: 'activityLevels.athlete.description' },
] as const

const COMMON_ALLERGIES = [
  'nuts', 'peanuts', 'milk', 'eggs', 'soy', 'wheatGluten', 'fish', 'shellfish',
]

const COMMON_INTOLERANCES = [
  'lactose', 'gluten', 'fruitSugars', 'histamine', 'fodmap',
]

interface NutritionOnboardingProps {
  settings: NutritionSettings
  onUpdate: (settings: NutritionSettings) => void
}

export function NutritionOnboarding({ settings, onUpdate }: NutritionOnboardingProps) {
  const t = useTranslations('components.onboarding.nutrition')

  const updateField = <K extends keyof NutritionSettings>(field: K, value: NutritionSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const toggleArrayItem = (field: 'allergies' | 'intolerances', item: string) => {
    const current = settings[field]
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateField(field, updated)
  }

  return (
    <div className="space-y-6">
      {/* Goal Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            {t('titles.goal')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GOAL_TYPES.map((goal) => {
              const Icon = goal.icon
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => updateField('goalType', goal.value)}
                  className={`text-left rounded-lg border-2 p-3 transition-all ${
                    settings.goalType === goal.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-sm">{t(goal.label)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(goal.description)}</p>
                </button>
              )
            })}
          </div>

          {(settings.goalType === 'WEIGHT_LOSS' || settings.goalType === 'WEIGHT_GAIN') && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  {t('labels.targetWeight')}
                </Label>
                <Input
                  type="number"
                  placeholder={t('placeholders.targetWeight')}
                  value={settings.targetWeightKg ?? ''}
                  onChange={(e) => updateField('targetWeightKg', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{t('labels.weeklyChange')}</Label>
                <div className="flex gap-2">
                  {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => updateField('weeklyChangeKg', rate)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                        settings.weeklyChangeKg === rate
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {rate} {t('units.kg')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Macro Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-emerald-500" />
            {t('titles.macroProfile')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MACRO_PROFILES.map((profile) => (
              <button
                key={profile.value}
                type="button"
                onClick={() => updateField('macroProfile', profile.value)}
                className={`text-left rounded-lg border-2 p-3 transition-all ${
                  settings.macroProfile === profile.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-sm block">{t(profile.label)}</span>
                <span className="text-xs text-muted-foreground">{t(profile.description)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dietary Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-500" />
            {t('titles.dietStyle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIETARY_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => updateField('dietaryStyle', style.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                  settings.dietaryStyle === style.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {t(style.label)}
              </button>
            ))}
          </div>

          {/* Allergies */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">{t('sections.allergies')}</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <label key={allergy} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={settings.allergies.includes(allergy)}
                    onCheckedChange={() => toggleArrayItem('allergies', allergy)}
                  />
                  {t(`commonAllergies.${allergy}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Intolerances */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">{t('sections.intolerances')}</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTOLERANCES.map((intolerance) => (
                <label key={intolerance} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={settings.intolerances.includes(intolerance)}
                    onCheckedChange={() => toggleArrayItem('intolerances', intolerance)}
                  />
                  {t(`commonIntolerances.${intolerance}`)}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            {t('titles.activityLevel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => updateField('activityLevel', level.value)}
                className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                  settings.activityLevel === level.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-sm">{t(level.label)}</span>
                <span className="text-xs text-muted-foreground ml-2">{t(level.description)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
