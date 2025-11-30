// lib/program-generator/workout-distribution/index.ts
// Main entry point for workout distribution module

import { WorkoutSlot, WorkoutDistributionParams } from './types'
import { distributeCanovaWorkouts } from './canova'
import { distributePolarizedWorkouts } from './polarized'
import { distributeNorwegianDoublesWorkouts, distributeNorwegianSinglesWorkouts } from './norwegian'
import { distributePyramidalWorkouts } from './pyramidal'
import { distributeDefaultWorkouts } from './default'

export type { WorkoutSlot, WorkoutDistributionParams } from './types'

/**
 * Determine workout distribution for a week based on methodology
 */
export function determineWorkoutDistribution(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { methodologyConfig, phase, trainingDays } = params
  const methodologyType = methodologyConfig?.type

  console.log(`[Workout Distribution] Methodology type: ${methodologyType || 'undefined'}, phase: ${phase}, trainingDays: ${trainingDays}`)

  // Validate methodology config
  if (!methodologyConfig || !methodologyType) {
    console.warn('[Workout Distribution] ⚠️ No methodology config provided, using default')
    return distributeDefaultWorkouts(params)
  }

  switch (methodologyType) {
    case 'CANOVA':
      console.log('[Workout Distribution] → Using CANOVA distribution')
      return distributeCanovaWorkouts(params)

    case 'POLARIZED':
      console.log('[Workout Distribution] → Using POLARIZED distribution')
      return distributePolarizedWorkouts(params)

    case 'NORWEGIAN':
      console.log('[Workout Distribution] → Using NORWEGIAN doubles distribution')
      return distributeNorwegianDoublesWorkouts(params)

    case 'NORWEGIAN_SINGLE':
      console.log('[Workout Distribution] → Using NORWEGIAN singles distribution')
      return distributeNorwegianSinglesWorkouts(params)

    case 'PYRAMIDAL':
      console.log('[Workout Distribution] → Using PYRAMIDAL distribution')
      return distributePyramidalWorkouts(params)

    default:
      console.log(`[Workout Distribution] → Unknown methodology '${methodologyType}', using default`)
      return distributeDefaultWorkouts(params)
  }
}
