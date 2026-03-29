'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Target, Scale, TrendingDown, TrendingUp, Minus, Activity, Leaf, Utensils } from 'lucide-react'

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
  { value: 'WEIGHT_LOSS', label: 'Gå ner i vikt', icon: TrendingDown, description: 'Hälsosam viktnedgång med bibehållen muskelmassa' },
  { value: 'WEIGHT_GAIN', label: 'Gå upp i vikt', icon: TrendingUp, description: 'Bygga massa med fokus på muskler' },
  { value: 'MAINTAIN', label: 'Bibehåll vikt', icon: Minus, description: 'Håll stabil vikt med bra näring' },
  { value: 'BODY_RECOMP', label: 'Kroppssammansättning', icon: Target, description: 'Minska fett och öka muskler samtidigt' },
] as const

const MACRO_PROFILES = [
  { value: 'BALANCED', label: 'Balanserad', description: '40% kolhydrater, 30% protein, 30% fett' },
  { value: 'HIGH_PROTEIN', label: 'Hög protein', description: '35% kolhydrater, 40% protein, 25% fett' },
  { value: 'LOW_CARB', label: 'Lågkolhydrat', description: '20% kolhydrater, 35% protein, 45% fett' },
  { value: 'KETO', label: 'Keto', description: '5% kolhydrater, 25% protein, 70% fett' },
  { value: 'ENDURANCE', label: 'Uthållighet', description: '55% kolhydrater, 20% protein, 25% fett' },
  { value: 'STRENGTH', label: 'Styrka', description: '40% kolhydrater, 35% protein, 25% fett' },
] as const

const DIETARY_STYLES = [
  { value: 'OMNIVORE', label: 'Allätare' },
  { value: 'FLEXITARIAN', label: 'Flexitarian' },
  { value: 'PESCATARIAN', label: 'Pescatarian' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
] as const

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Stillasittande', description: 'Lite eller ingen träning' },
  { value: 'LIGHTLY_ACTIVE', label: 'Lätt aktiv', description: '1-2 pass/vecka' },
  { value: 'ACTIVE', label: 'Aktiv', description: '3-4 pass/vecka' },
  { value: 'VERY_ACTIVE', label: 'Mycket aktiv', description: '5-6 pass/vecka' },
  { value: 'ATHLETE', label: 'Idrottare', description: 'Daglig träning' },
] as const

const COMMON_ALLERGIES = [
  'Nötter', 'Jordnötter', 'Mjölk', 'Ägg', 'Soja', 'Vete/Gluten', 'Fisk', 'Skaldjur',
]

const COMMON_INTOLERANCES = [
  'Laktos', 'Gluten', 'Fruktjuice/Fruktos', 'Histamin', 'FODMAP',
]

interface NutritionOnboardingProps {
  settings: NutritionSettings
  onUpdate: (settings: NutritionSettings) => void
}

export function NutritionOnboarding({ settings, onUpdate }: NutritionOnboardingProps) {
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
            Vad är ditt mål?
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
                    <span className="font-medium text-sm">{goal.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{goal.description}</p>
                </button>
              )
            })}
          </div>

          {(settings.goalType === 'WEIGHT_LOSS' || settings.goalType === 'WEIGHT_GAIN') && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  Målvikt (kg)
                </Label>
                <Input
                  type="number"
                  placeholder="75"
                  value={settings.targetWeightKg ?? ''}
                  onChange={(e) => updateField('targetWeightKg', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Förändring per vecka (kg)</Label>
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
                      {rate} kg
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
            Makroprofil
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
                <span className="font-medium text-sm block">{profile.label}</span>
                <span className="text-xs text-muted-foreground">{profile.description}</span>
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
            Koststil
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
                {style.label}
              </button>
            ))}
          </div>

          {/* Allergies */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">Allergier</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <label key={allergy} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={settings.allergies.includes(allergy)}
                    onCheckedChange={() => toggleArrayItem('allergies', allergy)}
                  />
                  {allergy}
                </label>
              ))}
            </div>
          </div>

          {/* Intolerances */}
          <div className="mt-4 space-y-2">
            <Label className="text-sm font-medium">Intoleranser</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTOLERANCES.map((intolerance) => (
                <label key={intolerance} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={settings.intolerances.includes(intolerance)}
                    onCheckedChange={() => toggleArrayItem('intolerances', intolerance)}
                  />
                  {intolerance}
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
            Aktivitetsnivå
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
                <span className="font-medium text-sm">{level.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{level.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
