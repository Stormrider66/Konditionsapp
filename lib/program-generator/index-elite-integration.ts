// lib/program-generator/index-elite-integration.ts
// Updated program generator with elite pace system integration
// This file contains the updated generateBaseProgram function

import { logger } from '@/lib/logger'
import {
  fetchElitePaces,
  validateEliteZones,
  getRecommendedMethodology,
  getZoneConfidenceWarnings,
  formatZoneSummary,
  type EliteZonePaces,
} from './elite-pace-integration'
import {
  calculateZonePaces,
  calculateZonePowers,
  type ZonePaces,
  type ZonePowers,
} from './zone-calculator'
import type {
  Test,
  Client,
  CreateTrainingProgramDTO,
} from '@/types'
import type { ProgramGenerationParams } from './index'

/**
 * UPDATED: Main program generation function with elite pace integration
 * Creates a complete training program from test results and/or race data
 */
export async function generateBaseProgramWithElitePaces(
  test: Test,
  client: Client,
  params: ProgramGenerationParams
): Promise<CreateTrainingProgramDTO> {
  logger.debug('ELITE PACE SYSTEM: Program Generation started', { clientId: client.id })

  // Step 1: Fetch elite paces from API
  logger.debug('Fetching elite paces', { step: '1/5', clientId: client.id })
  let elitePaces: EliteZonePaces | null = null

  try {
    elitePaces = await fetchElitePaces(client.id)

    if (elitePaces && validateEliteZones(elitePaces)) {
      const warnings = getZoneConfidenceWarnings(elitePaces)
      logger.debug('Elite paces fetched successfully', {
        source: elitePaces.source,
        confidence: elitePaces.confidence,
        athleteLevel: elitePaces.athleteLevel,
        metabolicType: elitePaces.metabolicType || 'N/A',
        zoneSummary: formatZoneSummary(elitePaces),
        warnings: warnings.length > 0 ? warnings : undefined,
      })
    } else {
      logger.debug('Elite paces not available, falling back to legacy zone calculation')
    }
  } catch (error) {
    logger.error('Error fetching elite paces, falling back to legacy zone calculation', { clientId: client.id }, error)
  }

  // Step 2: Determine zones to use (elite or legacy)
  logger.debug('Determining training zones', { step: '2/5' })
  let zones: ZonePaces | ZonePowers

  if (elitePaces && validateEliteZones(elitePaces)) {
    // Use elite paces (converted to legacy format for compatibility)
    zones = elitePaces.legacy
    logger.debug('Using ELITE pace system')
  } else {
    // Fallback to legacy calculation from test zones
    if (!test.trainingZones || test.trainingZones.length === 0) {
      throw new Error('Test must have training zones calculated OR client must have race results/lactate data')
    }

    zones = test.testType === 'CYCLING'
      ? calculateZonePowers(test.trainingZones)
      : calculateZonePaces(test.trainingZones)

    logger.debug('Using LEGACY zone calculation from test')
  }

  // Step 3: Auto-select methodology based on athlete classification
  logger.debug('Selecting training methodology', { step: '3/5' })
  let methodology = params.methodology

  if ((methodology as string) === 'AUTO' || !methodology) {
    if (elitePaces) {
      // Use elite pace system's recommendation
      const recommended = getRecommendedMethodology(
        elitePaces.athleteLevel,
        elitePaces.metabolicType,
        params.goalType
      )
      methodology = recommended
      logger.debug('Auto-selected methodology from elite paces', {
        methodology,
        reason: getMethodologyReason(elitePaces, params.goalType),
      })
    } else {
      // Fallback to simple rule-based selection
      const athleteLevel = mapExperienceLevelToAthleteLevel(params.experienceLevel)
      if (athleteLevel === 'ELITE' || athleteLevel === 'ADVANCED') {
        methodology = params.goalType === 'marathon' || params.goalType === 'half-marathon'
          ? 'CANOVA'
          : 'POLARIZED'
      } else {
        methodology = 'POLARIZED'
      }
      logger.debug('Auto-selected methodology using legacy rules', { methodology })
    }
  } else {
    logger.debug('Using specified methodology', { methodology })
  }

  // Step 4: Log zone data being used
  if (elitePaces) {
    logger.debug('Training zones for workouts (elite)', {
      step: '4/5',
      easy: elitePaces.core.easy,
      marathon: elitePaces.core.marathon,
      threshold: elitePaces.core.threshold,
      interval: elitePaces.core.interval,
    })
  } else {
    logger.debug('Training zones for workouts (legacy)', {
      step: '4/5',
      zone1Easy: zones.zone1,
      zone2Marathon: zones.zone2,
      zone3Threshold: zones.zone3,
      zone4Interval: zones.zone4,
      zone5Repetition: zones.zone5,
    })
  }

  // Step 5: Generate program (existing logic continues)
  logger.debug('Generating program structure', {
    step: '5/5',
    durationWeeks: params.durationWeeks,
    trainingDaysPerWeek: params.trainingDaysPerWeek,
    goal: params.goalType,
    methodology,
  })

  // NOTE: The rest of the function continues with existing logic
  // from the original generateBaseProgram function
  // The zones variable now contains elite-calculated paces (if available)
  // or falls back to legacy calculation

  // For now, this is a REFERENCE implementation showing how to integrate
  // The actual generateBaseProgram function in index.ts should be updated
  // to include these steps at the beginning

  logger.debug('Elite pace integration complete', { clientId: client.id })

  // Return type annotation - actual implementation would return complete program
  return {} as CreateTrainingProgramDTO
}

/**
 * Helper: Get methodology selection reason
 */
function getMethodologyReason(elitePaces: EliteZonePaces, goalType: string): string {
  if (elitePaces.athleteLevel === 'ELITE' && elitePaces.metabolicType) {
    if (goalType === 'marathon' || goalType === 'half-marathon') {
      return `Elite ${elitePaces.metabolicType} marathoner → Canova system`
    }
    return `Elite athlete with lactate monitoring → Norwegian system`
  }

  if (elitePaces.athleteLevel === 'ADVANCED') {
    if (goalType === 'marathon' || goalType === 'half-marathon') {
      return 'Advanced marathoner → Canova system'
    }
    return 'Advanced athlete → Polarized system'
  }

  if (elitePaces.athleteLevel === 'INTERMEDIATE') {
    return 'Intermediate athlete → Pyramidal system (progressive volume)'
  }

  return 'Recreational athlete → Polarized system (safest, most researched)'
}

/**
 * Helper: Map experience level to athlete level
 */
function mapExperienceLevelToAthleteLevel(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): 'RECREATIONAL' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' {
  switch (experienceLevel) {
    case 'beginner':
      return 'RECREATIONAL'
    case 'intermediate':
      return 'INTERMEDIATE'
    case 'advanced':
      return 'ADVANCED'
    default:
      return 'RECREATIONAL'
  }
}

/**
 * Instructions for integrating into existing index.ts
 * =======================================================
 *
 * To integrate the elite pace system into the existing program generator:
 *
 * 1. At the TOP of generateBaseProgram(), add:
 *    ```typescript
 *    import { logger } from '@/lib/logger'
 *    import { fetchElitePaces, validateEliteZones, formatZoneSummary } from './elite-pace-integration'
 *
 *    // Fetch elite paces
 *    let elitePaces: EliteZonePaces | null = null
 *    try {
 *      elitePaces = await fetchElitePaces(client.id)
 *      if (elitePaces && validateEliteZones(elitePaces)) {
 *        logger.debug('Using elite pace system', { zoneSummary: formatZoneSummary(elitePaces) })
 *      }
 *    } catch (error) {
 *      logger.error('Error fetching elite paces, using legacy', { clientId: client.id }, error)
 *    }
 *    ```
 *
 * 2. REPLACE the zone calculation (lines 192-195):
 *    ```typescript
 *    // OLD:
 *    const zones = test.testType === 'CYCLING'
 *      ? calculateZonePowers(test.trainingZones)
 *      : calculateZonePaces(test.trainingZones)
 *
 *    // NEW:
 *    const zones = (elitePaces && validateEliteZones(elitePaces))
 *      ? elitePaces.legacy
 *      : (test.testType === 'CYCLING'
 *          ? calculateZonePowers(test.trainingZones)
 *          : calculateZonePaces(test.trainingZones))
 *    ```
 *
 * 3. PASS elitePaces to buildWeek() (add parameter):
 *    ```typescript
 *    const week = await buildWeek(
 *      // ... existing parameters
 *      elitePaces // Add this
 *    )
 *    ```
 *
 * 4. UPDATE buildWeek signature:
 *    ```typescript
 *    async function buildWeek(
 *      // ... existing parameters
 *      elitePaces: EliteZonePaces | null // Add this
 *    ): Promise<CreateTrainingWeekDTO>
 *    ```
 *
 * 5. In buildWeek, PASS elitePaces to workout builders:
 *    ```typescript
 *    buildLongRun(distance, zones, trainingZones, elitePaces)
 *    buildIntervals(reps, work, rest, zones, trainingZones, elitePaces)
 *    // etc.
 *    ```
 *
 * 6. UPDATE workout builders to accept elitePaces:
 *    - They can use elite zones when available
 *    - Fall back to legacy zones if not
 *    - Access methodology-specific zones (Daniels, Canova, Norwegian)
 *
 * This approach maintains backward compatibility while enabling
 * the elite pace system when data is available.
 */
