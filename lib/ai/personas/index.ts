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

export function getPersonaForGoal(goalType: GoalType, context: Record<string, unknown>): string {
  switch (goalType) {
    case 'weight_loss':
      return buildWeightLossPersona(context as WeightLossContext)
    case 'muscle_building':
      return buildMuscleBuildingPersona(context as MuscleBuildingContext)
    case 'general_fitness':
      return buildGeneralFitnessPersona(context as GeneralFitnessContext)
    case 'functional_fitness':
      return buildFunctionalFitnessPersona(context as FunctionalFitnessContext)
    default:
      return buildGeneralFitnessPersona(context as GeneralFitnessContext)
  }
}

export function getQuickTipsForGoal(goalType: GoalType): string[] {
  switch (goalType) {
    case 'weight_loss':
      return WEIGHT_LOSS_QUICK_TIPS
    case 'muscle_building':
      return MUSCLE_BUILDING_QUICK_TIPS
    case 'general_fitness':
      return GENERAL_FITNESS_QUICK_TIPS
    case 'functional_fitness':
      return FUNCTIONAL_FITNESS_QUICK_TIPS
    default:
      return GENERAL_FITNESS_QUICK_TIPS
  }
}
