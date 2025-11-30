// lib/program-generator/index-elite-integration.ts
// Updated program generator with elite pace system integration
// This file contains the updated generateBaseProgram function

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
  console.log('=====================================')
  console.log('ELITE PACE SYSTEM: Program Generation')
  console.log('=====================================')

  // Step 1: Fetch elite paces from API
  console.log(`\n[1/5] Fetching elite paces for client: ${client.id}`)
  let elitePaces: EliteZonePaces | null = null

  try {
    elitePaces = await fetchElitePaces(client.id)

    if (elitePaces && validateEliteZones(elitePaces)) {
      console.log('✓ Elite paces fetched successfully')
      console.log('  Source:', elitePaces.source)
      console.log('  Confidence:', elitePaces.confidence)
      console.log('  Athlete Level:', elitePaces.athleteLevel)
      console.log('  Metabolic Type:', elitePaces.metabolicType || 'N/A')
      console.log('\n' + formatZoneSummary(elitePaces))

      // Check for warnings
      const warnings = getZoneConfidenceWarnings(elitePaces)
      if (warnings.length > 0) {
        console.log('\n⚠️  Zone Confidence Warnings:')
        warnings.forEach((w) => console.log('   -', w))
      }
    } else {
      console.log('⚠️  Elite paces not available, falling back to legacy zone calculation')
    }
  } catch (error) {
    console.error('❌ Error fetching elite paces:', error)
    console.log('   Falling back to legacy zone calculation')
  }

  // Step 2: Determine zones to use (elite or legacy)
  console.log('\n[2/5] Determining training zones')
  let zones: ZonePaces | ZonePowers

  if (elitePaces && validateEliteZones(elitePaces)) {
    // Use elite paces (converted to legacy format for compatibility)
    zones = elitePaces.legacy
    console.log('✓ Using ELITE pace system')
  } else {
    // Fallback to legacy calculation from test zones
    if (!test.trainingZones || test.trainingZones.length === 0) {
      throw new Error('Test must have training zones calculated OR client must have race results/lactate data')
    }

    zones = test.testType === 'CYCLING'
      ? calculateZonePowers(test.trainingZones)
      : calculateZonePaces(test.trainingZones)

    console.log('✓ Using LEGACY zone calculation (from test)')
  }

  // Step 3: Auto-select methodology based on athlete classification
  console.log('\n[3/5] Selecting training methodology')
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
      console.log(`✓ Auto-selected methodology: ${methodology}`)
      console.log(`   Reason: ${getMethodologyReason(elitePaces, params.goalType)}`)
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
      console.log(`✓ Auto-selected methodology: ${methodology} (legacy rules)`)
    }
  } else {
    console.log(`✓ Using specified methodology: ${methodology}`)
  }

  // Step 4: Log zone data being used
  console.log('\n[4/5] Training zones for workouts:')
  if (elitePaces) {
    console.log('  Easy:', elitePaces.core.easy)
    console.log('  Marathon:', elitePaces.core.marathon)
    console.log('  Threshold:', elitePaces.core.threshold)
    console.log('  Interval:', elitePaces.core.interval)
  } else {
    console.log('  Zone 1 (Easy):', zones.zone1)
    console.log('  Zone 2 (Marathon):', zones.zone2)
    console.log('  Zone 3 (Threshold):', zones.zone3)
    console.log('  Zone 4 (Interval):', zones.zone4)
    console.log('  Zone 5 (Repetition):', zones.zone5)
  }

  // Step 5: Generate program (existing logic continues)
  console.log('\n[5/5] Generating program structure')
  console.log('  Duration:', params.durationWeeks, 'weeks')
  console.log('  Training days per week:', params.trainingDaysPerWeek)
  console.log('  Goal:', params.goalType)
  console.log('  Methodology:', methodology)

  // NOTE: The rest of the function continues with existing logic
  // from the original generateBaseProgram function
  // The zones variable now contains elite-calculated paces (if available)
  // or falls back to legacy calculation

  // For now, this is a REFERENCE implementation showing how to integrate
  // The actual generateBaseProgram function in index.ts should be updated
  // to include these steps at the beginning

  console.log('\n✓ Elite pace integration complete')
  console.log('=====================================\n')

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
 *    import { fetchElitePaces, validateEliteZones, formatZoneSummary } from './elite-pace-integration'
 *
 *    // Fetch elite paces
 *    let elitePaces: EliteZonePaces | null = null
 *    try {
 *      elitePaces = await fetchElitePaces(client.id)
 *      if (elitePaces && validateEliteZones(elitePaces)) {
 *        console.log('Using elite pace system:', formatZoneSummary(elitePaces))
 *      }
 *    } catch (error) {
 *      console.error('Error fetching elite paces, using legacy:', error)
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
