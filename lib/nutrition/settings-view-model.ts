import type { DietaryPreferences, NutritionGoal, SportProfile } from '@prisma/client'

export type DietaryStyle = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN' | 'PESCATARIAN' | 'FLEXITARIAN'
export type NutritionGoalType = 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
export type NutritionMacroProfile =
  | 'BALANCED'
  | 'HIGH_PROTEIN'
  | 'LOW_CARB'
  | 'ENDURANCE'
  | 'STRENGTH'
  | 'KETO'
  | 'CUSTOM'
export type NutritionTrainingAmbition = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'ACTIVE' | 'VERY_ACTIVE' | 'ATHLETE'
export type LifestyleActivityValue = 'SEDENTARY' | 'LIGHTLY_ACTIVE' | 'MODERATELY_ACTIVE' | 'VERY_ACTIVE'

export interface NutritionPreferencesFormData {
  dietaryStyle?: DietaryStyle
  allergies: string[]
  intolerances: string[]
  dislikedFoods: string[]
  preferLowFODMAP: boolean
  preferWholeGrain: boolean
  preferSwedishFoods: boolean
  enhancedMacroAnalysis: boolean
  memoryEnabled: boolean
}

export interface NutritionGoalFormData {
  goalType: NutritionGoalType
  targetWeightKg?: number | null
  weeklyChangeKg?: number | null
  targetBodyFatPercent?: number | null
  macroProfile?: NutritionMacroProfile | null
  activityLevel?: NutritionTrainingAmbition
  customBmrKcal?: number | null
  showMacroTargets?: boolean
  showHydration?: boolean
}

export interface NutritionSettingsViewModel {
  preferences: NutritionPreferencesFormData | null
  goal: NutritionGoalFormData | null
  lifestyleActivity: LifestyleActivityValue
  currentWeightKg?: number
}

interface NutritionSettingsSource {
  weight: number | null
  dietaryPreferences: DietaryPreferences | null
  nutritionGoal: NutritionGoal | null
  sportProfile: Pick<SportProfile, 'lifestyleActivity'> | null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function createNutritionSettingsViewModel(client: NutritionSettingsSource): NutritionSettingsViewModel {
  const preferences = client.dietaryPreferences
  const goal = client.nutritionGoal

  return {
    preferences: preferences
      ? {
          dietaryStyle: preferences.dietaryStyle as DietaryStyle | undefined,
          allergies: stringArray(preferences.allergies),
          intolerances: stringArray(preferences.intolerances),
          dislikedFoods: stringArray(preferences.dislikedFoods),
          preferLowFODMAP: preferences.preferLowFODMAP,
          preferWholeGrain: preferences.preferWholeGrain,
          preferSwedishFoods: preferences.preferSwedishFoods,
          enhancedMacroAnalysis: preferences.enhancedMacroAnalysis,
          memoryEnabled: preferences.memoryEnabled,
        }
      : null,
    goal: goal
      ? {
          goalType: goal.goalType as NutritionGoalType,
          targetWeightKg: goal.targetWeightKg,
          weeklyChangeKg: goal.weeklyChangeKg,
          targetBodyFatPercent: goal.targetBodyFatPercent,
          macroProfile: goal.macroProfile as NutritionMacroProfile | null,
          activityLevel: goal.activityLevel as NutritionTrainingAmbition,
          customBmrKcal: goal.customBmrKcal,
          showMacroTargets: goal.showMacroTargets,
          showHydration: goal.showHydration,
        }
      : null,
    lifestyleActivity: (client.sportProfile?.lifestyleActivity ?? 'SEDENTARY') as LifestyleActivityValue,
    currentWeightKg: client.weight ?? undefined,
  }
}
