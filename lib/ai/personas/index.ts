// lib/ai/personas/index.ts

import {
  buildWeightLossPersona,
  WEIGHT_LOSS_QUICK_TIPS,
  type WeightLossContext,
} from './weight-loss-persona'

import {
  buildMuscleBuildingPersona,
  MUSCLE_BUILDING_QUICK_TIPS,
  type MuscleBuildingContext,
} from './muscle-building-persona'

import {
  buildGeneralFitnessPersona,
  GENERAL_FITNESS_QUICK_TIPS,
  type GeneralFitnessContext,
} from './general-fitness-persona'

import {
  buildFunctionalFitnessPersona,
  FUNCTIONAL_FITNESS_QUICK_TIPS,
  type FunctionalFitnessContext,
} from './functional-fitness-persona'

// Re-export all personas
export {
  buildWeightLossPersona,
  WEIGHT_LOSS_QUICK_TIPS,
  type WeightLossContext,
} from './weight-loss-persona'

export {
  buildMuscleBuildingPersona,
  MUSCLE_BUILDING_QUICK_TIPS,
  type MuscleBuildingContext,
} from './muscle-building-persona'

export {
  buildGeneralFitnessPersona,
  GENERAL_FITNESS_QUICK_TIPS,
  type GeneralFitnessContext,
} from './general-fitness-persona'

export {
  buildFunctionalFitnessPersona,
  FUNCTIONAL_FITNESS_QUICK_TIPS,
  type FunctionalFitnessContext,
} from './functional-fitness-persona'

// Utility function to get persona based on goal type
export type GoalType = 'weight_loss' | 'muscle_building' | 'general_fitness' | 'functional_fitness'
export type PersonaLocale = 'en' | 'sv'

export function getPersonaForGoal(goalType: GoalType, context: Record<string, unknown>, locale: PersonaLocale = 'en'): string {
  switch (goalType) {
    case 'weight_loss':
      return buildWeightLossPersona(context as WeightLossContext, locale)
    case 'muscle_building':
      return buildMuscleBuildingPersona(context as MuscleBuildingContext, locale)
    case 'general_fitness':
      return buildGeneralFitnessPersona(context as GeneralFitnessContext, locale)
    case 'functional_fitness':
      return buildFunctionalFitnessPersona(context as FunctionalFitnessContext, locale)
    default:
      return buildGeneralFitnessPersona(context as GeneralFitnessContext, locale)
  }
}

export function getQuickTipsForGoal(goalType: GoalType, locale: PersonaLocale = 'en'): string[] {
  switch (goalType) {
    case 'weight_loss':
      return WEIGHT_LOSS_QUICK_TIPS[locale]
    case 'muscle_building':
      return MUSCLE_BUILDING_QUICK_TIPS[locale]
    case 'general_fitness':
      return GENERAL_FITNESS_QUICK_TIPS[locale]
    case 'functional_fitness':
      return FUNCTIONAL_FITNESS_QUICK_TIPS[locale]
    default:
      return GENERAL_FITNESS_QUICK_TIPS[locale]
  }
}
