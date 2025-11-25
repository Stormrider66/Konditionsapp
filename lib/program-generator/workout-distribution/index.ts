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
  const { methodologyConfig } = params

  switch (methodologyConfig.type) {
    case 'CANOVA':
      return distributeCanovaWorkouts(params)

    case 'POLARIZED':
      return distributePolarizedWorkouts(params)

    case 'NORWEGIAN':
      return distributeNorwegianDoublesWorkouts(params)

    case 'NORWEGIAN_SINGLE':
      return distributeNorwegianSinglesWorkouts(params)

    case 'PYRAMIDAL':
      return distributePyramidalWorkouts(params)

    default:
      return distributeDefaultWorkouts(params)
  }
}
