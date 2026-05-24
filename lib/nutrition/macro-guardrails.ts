export type NutritionActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'ACTIVE'
  | 'VERY_ACTIVE'
  | 'ATHLETE'

export type NutritionGoalType =
  | 'WEIGHT_LOSS'
  | 'WEIGHT_GAIN'
  | 'MAINTAIN'
  | 'BODY_RECOMP'

export type NutritionMacroProfile =
  | 'BALANCED'
  | 'HIGH_PROTEIN'
  | 'LOW_CARB'
  | 'ENDURANCE'
  | 'STRENGTH'
  | 'KETO'
  | 'CUSTOM'

export type CarbLoadCategory =
  | 'REST'
  | 'LIGHT'
  | 'NORMAL'
  | 'HARD'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'CARB_LOAD'

export interface ProteinTargetInput {
  weightKg: number
  goalType?: NutritionGoalType
  macroProfile?: NutritionMacroProfile | null
  activityLevel?: NutritionActivityLevel | null
  customProteinPerKg?: number | null
  workoutProteinBumpPerKg?: number
}

export interface ProteinTargetResult {
  grams: number
  gramsPerKg: number
  minPerKg: number
  maxPerKg: number
  warnings: string[]
}

export interface CarbGuardrailInput {
  carbsG: number
  weightKg: number
  activityLevel?: NutritionActivityLevel | null
  macroProfile?: NutritionMacroProfile | null
  ageYears?: number | null
  hasHighCarbTrigger?: boolean
  hasVeryHighCarbTrigger?: boolean
  hasCarbLoadTrigger?: boolean
  reason?: string | null
}

export interface CarbGuardrailResult {
  grams: number
  gramsPerKg: number
  capPerKg: number
  highCarbReason?: string
  warnings: string[]
}

const PROTEIN_RANGES: Record<NutritionActivityLevel, { min: number; recommended: number; max: number }> = {
  SEDENTARY: { min: 0.8, recommended: 1.2, max: 1.5 },
  LIGHTLY_ACTIVE: { min: 1.1, recommended: 1.4, max: 1.7 },
  ACTIVE: { min: 1.4, recommended: 1.6, max: 1.8 },
  VERY_ACTIVE: { min: 1.5, recommended: 1.75, max: 2.0 },
  ATHLETE: { min: 1.6, recommended: 1.9, max: 2.2 },
}

const REST_CARBS_PER_KG: Record<NutritionActivityLevel, number> = {
  SEDENTARY: 2.4,
  LIGHTLY_ACTIVE: 2.8,
  ACTIVE: 3.2,
  VERY_ACTIVE: 3.6,
  ATHLETE: 4.0,
}

const NO_TRIGGER_CARB_CAPS: Record<NutritionActivityLevel, number> = {
  SEDENTARY: 4.5,
  LIGHTLY_ACTIVE: 5.5,
  ACTIVE: 6.5,
  VERY_ACTIVE: 7.5,
  ATHLETE: 8.5,
}

export function roundPerKg(value: number): number {
  return Math.round(value * 10) / 10
}

export function normalizeNutritionActivityLevel(
  activityLevel?: string | null
): NutritionActivityLevel {
  if (
    activityLevel === 'SEDENTARY' ||
    activityLevel === 'LIGHTLY_ACTIVE' ||
    activityLevel === 'ACTIVE' ||
    activityLevel === 'VERY_ACTIVE' ||
    activityLevel === 'ATHLETE'
  ) {
    return activityLevel
  }

  if (activityLevel === 'LIGHT') return 'LIGHTLY_ACTIVE'
  if (activityLevel === 'MODERATE') return 'ACTIVE'

  return 'ACTIVE'
}

export function getProteinTarget(input: ProteinTargetInput): ProteinTargetResult {
  const activityLevel = normalizeNutritionActivityLevel(input.activityLevel)
  const goalType = input.goalType ?? 'MAINTAIN'
  const macroProfile = input.macroProfile ?? 'BALANCED'
  const warnings: string[] = []

  const range = { ...PROTEIN_RANGES[activityLevel] }

  if (goalType === 'WEIGHT_LOSS' || goalType === 'BODY_RECOMP') {
    range.min += 0.1
    range.recommended += 0.2
    range.max += 0.2
  } else if (goalType === 'WEIGHT_GAIN') {
    range.recommended += 0.1
  }

  if (macroProfile === 'HIGH_PROTEIN' || macroProfile === 'STRENGTH') {
    range.recommended += 0.15
    range.max += 0.2
  } else if (macroProfile === 'ENDURANCE') {
    range.recommended -= 0.05
  }

  range.min = Math.max(0.8, range.min)
  range.max = Math.min(2.2, range.max)

  let gramsPerKg = range.recommended + (input.workoutProteinBumpPerKg ?? 0)

  if (input.customProteinPerKg != null) {
    gramsPerKg = input.customProteinPerKg
  }

  if (gramsPerKg > 2.2) {
    warnings.push(`Protein target capped at 2.2 g/kg from ${roundPerKg(gramsPerKg)} g/kg.`)
    gramsPerKg = 2.2
  }

  if (gramsPerKg < 0.8) {
    warnings.push(`Protein target raised to the minimum 0.8 g/kg from ${roundPerKg(gramsPerKg)} g/kg.`)
    gramsPerKg = 0.8
  }

  gramsPerKg = Math.min(Math.max(gramsPerKg, range.min), range.max)

  return {
    grams: Math.round(input.weightKg * gramsPerKg),
    gramsPerKg: roundPerKg(gramsPerKg),
    minPerKg: roundPerKg(range.min),
    maxPerKg: roundPerKg(range.max),
    warnings,
  }
}

export function getRestCarbsPerKg(input: {
  activityLevel?: NutritionActivityLevel | null
  goalType?: NutritionGoalType
  macroProfile?: NutritionMacroProfile | null
}): number {
  const activityLevel = normalizeNutritionActivityLevel(input.activityLevel)
  const goalType = input.goalType ?? 'MAINTAIN'
  const macroProfile = input.macroProfile ?? 'BALANCED'

  let carbsPerKg = REST_CARBS_PER_KG[activityLevel]

  if (goalType === 'WEIGHT_LOSS') carbsPerKg -= 0.4
  if (goalType === 'WEIGHT_GAIN') carbsPerKg += 0.3
  if (goalType === 'BODY_RECOMP') carbsPerKg -= 0.1

  if (macroProfile === 'ENDURANCE') carbsPerKg += 0.3
  if (macroProfile === 'STRENGTH') carbsPerKg += 0.1
  if (macroProfile === 'HIGH_PROTEIN') carbsPerKg -= 0.2
  if (macroProfile === 'LOW_CARB') carbsPerKg = Math.min(carbsPerKg, 2.2)
  if (macroProfile === 'KETO') carbsPerKg = 0.8

  return Math.max(0.8, roundPerKg(carbsPerKg))
}

export function getFatPerKg(input: {
  goalType?: NutritionGoalType
  macroProfile?: NutritionMacroProfile | null
}): number {
  const goalType = input.goalType ?? 'MAINTAIN'
  const macroProfile = input.macroProfile ?? 'BALANCED'

  let fatPerKg = 0.9

  if (goalType === 'WEIGHT_LOSS') fatPerKg -= 0.1
  if (goalType === 'WEIGHT_GAIN') fatPerKg += 0.1
  if (goalType === 'BODY_RECOMP') fatPerKg -= 0.05

  if (macroProfile === 'LOW_CARB') fatPerKg += 0.2
  if (macroProfile === 'KETO') fatPerKg = 1.5
  if (macroProfile === 'ENDURANCE') fatPerKg -= 0.05

  return Math.max(0.6, roundPerKg(fatPerKg))
}

export function getCarbFloorPerKg(category: CarbLoadCategory): number {
  switch (category) {
    case 'REST':
      return 2.4
    case 'LIGHT':
      return 3
    case 'NORMAL':
      return 4
    case 'HARD':
      return 5
    case 'HIGH':
      return 6
    case 'VERY_HIGH':
      return 7
    case 'CARB_LOAD':
      return 8
  }
}

export function applyCarbGuardrails(input: CarbGuardrailInput): CarbGuardrailResult {
  const activityLevel = normalizeNutritionActivityLevel(input.activityLevel)
  const macroProfile = input.macroProfile ?? 'BALANCED'
  const warnings: string[] = []

  let capPerKg = NO_TRIGGER_CARB_CAPS[activityLevel]

  if (input.hasCarbLoadTrigger) {
    capPerKg = activityLevel === 'ATHLETE' ? 12 : 10
  } else if (input.hasVeryHighCarbTrigger) {
    capPerKg =
      activityLevel === 'ATHLETE' ? 11 :
      activityLevel === 'VERY_ACTIVE' ? 10 :
      activityLevel === 'ACTIVE' ? 8.5 :
      7.5
  } else if (input.hasHighCarbTrigger) {
    capPerKg =
      activityLevel === 'ATHLETE' ? 9 :
      activityLevel === 'VERY_ACTIVE' ? 8 :
      activityLevel === 'ACTIVE' ? 7.5 :
      6.5
  } else if ((input.ageYears ?? 0) >= 60) {
    capPerKg -= 0.75
  } else if ((input.ageYears ?? 0) >= 45) {
    capPerKg -= 0.5
  }

  if (macroProfile === 'LOW_CARB') {
    capPerKg = Math.min(capPerKg, input.hasHighCarbTrigger ? 4.5 : 3)
  } else if (macroProfile === 'KETO') {
    capPerKg = Math.min(capPerKg, input.hasHighCarbTrigger ? 2.5 : 1.5)
  }

  const requestedPerKg = input.carbsG / input.weightKg
  let grams = input.carbsG

  if (requestedPerKg > capPerKg) {
    warnings.push(`Carbohydrate target capped at ${roundPerKg(capPerKg)} g/kg from ${roundPerKg(requestedPerKg)} g/kg.`)
    grams = input.weightKg * capPerKg
  }

  const gramsPerKg = grams / input.weightKg
  const highCarbReason = gramsPerKg > 6.5
    ? input.reason ?? 'High carbohydrate target because today has a clearly high training load.'
    : undefined

  return {
    grams: Math.round(grams),
    gramsPerKg: roundPerKg(gramsPerKg),
    capPerKg: roundPerKg(capPerKg),
    highCarbReason,
    warnings,
  }
}
