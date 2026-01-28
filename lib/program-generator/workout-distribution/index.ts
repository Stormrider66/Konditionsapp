// lib/program-generator/workout-distribution/index.ts
// Main entry point for workout distribution module

import { logger } from '@/lib/logger'
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

  logger.debug('Determining workout distribution', {
    methodologyType: methodologyType || 'undefined',
    phase,
    trainingDays,
  })

  // Validate methodology config
  if (!methodologyConfig || !methodologyType) {
    logger.warn('No methodology config provided, using default')
    return distributeDefaultWorkouts(params)
  }

  switch (methodologyType) {
    case 'CANOVA':
      logger.debug('Using CANOVA distribution')
      return distributeCanovaWorkouts(params)

    case 'POLARIZED':
      logger.debug('Using POLARIZED distribution')
      return distributePolarizedWorkouts(params)

    case 'NORWEGIAN':
      logger.debug('Using NORWEGIAN doubles distribution')
      return distributeNorwegianDoublesWorkouts(params)

    case 'NORWEGIAN_SINGLE':
      logger.debug('Using NORWEGIAN singles distribution')
      return distributeNorwegianSinglesWorkouts(params)

    case 'PYRAMIDAL':
      logger.debug('Using PYRAMIDAL distribution')
      return distributePyramidalWorkouts(params)

    default:
      logger.debug('Unknown methodology, using default', { methodologyType })
      return distributeDefaultWorkouts(params)
  }
}
