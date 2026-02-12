// lib/program-generator/pace-validator.ts
// Validation module for testing pace selection system with real athlete data

import { logger } from '@/lib/logger'
import { selectOptimalPaces, type RacePerformance, type AthleteProfileData, type LactateTestData } from '@/lib/training-engine/calculations/pace-selector'
import { calculateVDOTFromRace } from '@/lib/training-engine/calculations/vdot'
import { analyzeLactateProfile } from '@/lib/training-engine/calculations/lactate-profile-analyzer'
import { classifyAthlete } from '@/lib/training-engine/calculations/athlete-classifier'
import { calculateVDOT } from '@/lib/calculations/race-predictions'

/**
 * TEST CASE 1: User's 1:28 HM athlete
 *
 * Real data:
 * - Half marathon: 1:28:00 (88 minutes)
 * - Max lactate: 20.3 mmol/L at 13 km/h
 * - Real LT2: ~10 mmol/L (50% of max) - fast twitch marathoner
 * - Expected marathon pace: 4:25-4:30/km (13.5-13.6 km/h)
 * - Max HR: 194 bpm
 * - Avg HR during HM: 181 bpm (93% max)
 */
export function validateRealAthlete1() {
  logger.debug('========================================')
  logger.debug('TEST CASE 1: 1:28 Half Marathon Runner')
  logger.debug('========================================')

  // Athlete profile
  const profile: AthleteProfileData = {
    age: 30,
    gender: 'MALE',
    weeklyKm: 70,
    trainingAge: 5,
    restingHR: 55,
    maxHR: 194,
  }

  // Race performance
  const races: RacePerformance[] = [
    {
      distance: 'HALF_MARATHON',
      timeMinutes: 88, // 1:28:00
      date: new Date('2025-11-15'),
      age: 30,
      gender: 'MALE'
    }
  ]

  // Lactate test data (from real test)
  const lactateTest: LactateTestData = {
    testStages: [
      { sequence: 1, speed: 9.0, heartRate: 135, lactate: 1.5 },
      { sequence: 2, speed: 10.0, heartRate: 145, lactate: 2.0 },
      { sequence: 3, speed: 11.0, heartRate: 155, lactate: 3.5 },
      { sequence: 4, speed: 12.0, heartRate: 165, lactate: 6.8 },
      { sequence: 5, speed: 13.0, heartRate: 175, lactate: 10.2 }, // LT2
      { sequence: 6, speed: 14.0, heartRate: 185, lactate: 15.5 },
      { sequence: 7, speed: 15.0, heartRate: 192, lactate: 20.3 }  // Max
    ],
    maxHR: 194
  }

  // Run pace selection
  const result = selectOptimalPaces(profile, races, lactateTest)

  // Display results
  logger.debug('Pace selection result', {
    primarySource: result.primarySource,
    secondarySource: result.secondarySource || 'None',
    confidence: result.confidence,
    athleteClassification: {
      level: result.athleteClassification.level,
      metabolicType: result.athleteClassification.metabolicType,
      compressionFactor: (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%'
    },
    vdotResult: result.vdotResult ? {
      vdot: result.vdotResult.vdot,
      adjustments: result.vdotResult.adjustments
    } : null,
    lactateProfile: result.lactateProfile ? {
      maxLactate: result.lactateProfile.maxLactate.toFixed(1) + ' mmol/L',
      lt2Lactate: result.lactateProfile.lt2.lactate.toFixed(1) + ' mmol/L',
      lt2Ratio: (result.lactateProfile.lt2Ratio * 100).toFixed(1) + '%',
      lt2Speed: result.lactateProfile.lt2.speed.toFixed(1) + ' km/h',
      lt2HR: result.lactateProfile.lt2.heartRate + ' bpm'
    } : null
  })

  logger.debug('CORE PACES', {
    easy: `${result.easyPace.minPace} - ${result.easyPace.maxPace}`,
    marathon: `${result.marathonPace.pace} (${result.marathonPace.kmh.toFixed(1)} km/h)`,
    threshold: `${result.thresholdPace.pace} (${result.thresholdPace.kmh.toFixed(1)} km/h)`,
    interval: `${result.intervalPace.pace} (${result.intervalPace.kmh.toFixed(1)} km/h)`,
    repetition: `${result.repetitionPace.pace} (${result.repetitionPace.kmh.toFixed(1)} km/h)`
  })

  logger.debug('DANIELS ZONES', {
    E: `${result.zones.daniels.easy.minPace} - ${result.zones.daniels.easy.maxPace}`,
    M: result.zones.daniels.marathon.pace,
    T: result.zones.daniels.threshold.pace,
    I: result.zones.daniels.interval.pace,
    R: result.zones.daniels.repetition.pace
  })

  logger.debug('CANOVA ZONES', {
    fundamental: `${result.zones.canova.fundamental.pace} (${result.zones.canova.fundamental.percentOfMP}% MP)`,
    progressive: `${result.zones.canova.progressive.minPace} - ${result.zones.canova.progressive.maxPace} (${result.zones.canova.progressive.percentOfMP} MP)`,
    marathon: `${result.zones.canova.marathon.pace} (${result.zones.canova.marathon.percentOfMP}% MP)`,
    specific: `${result.zones.canova.specific.pace} (${result.zones.canova.specific.percentOfMP}% MP)`,
    threshold: `${result.zones.canova.threshold.pace} (${result.zones.canova.threshold.percentOfMP}% MP)`,
    fiveK: `${result.zones.canova.fiveK.pace} (${result.zones.canova.fiveK.percentOfMP}% MP)`
  })

  logger.debug('NORWEGIAN ZONES', {
    green: `${result.zones.norwegian.green.minPace} - ${result.zones.norwegian.green.maxPace} ${result.zones.norwegian.green.lactate}`,
    threshold: `${result.zones.norwegian.threshold.pace} ${result.zones.norwegian.threshold.lactate}`,
    red: `${result.zones.norwegian.red.minPace} - ${result.zones.norwegian.red.maxPace} ${result.zones.norwegian.red.lactate}`
  })

  logger.debug('WARNINGS', {
    warnings: result.warnings.length > 0 ? result.warnings : ['None']
  })

  logger.debug('VALIDATION', {
    sourcesAvailable: {
      vdot: result.validationResults.sourcesAvailable.vdot,
      lactate: result.validationResults.sourcesAvailable.lactate,
      hrData: result.validationResults.sourcesAvailable.hrData
    },
    consistencyChecks: {
      marathonPaceConsistent: result.validationResults.consistencyChecks.marathonPaceConsistent,
      thresholdPaceConsistent: result.validationResults.consistencyChecks.thresholdPaceConsistent,
      mismatchPercent: result.validationResults.consistencyChecks.mismatchPercent?.toFixed(1) + '%'
    }
  })

  // EXPECTED RESULT VALIDATION
  const expectedMarathonPaceMin = 4.25 // 4:25/km
  const expectedMarathonPaceMax = 4.50 // 4:30/km
  const expectedMarathonKmhMin = 60 / expectedMarathonPaceMax // ~13.33 km/h
  const expectedMarathonKmhMax = 60 / expectedMarathonPaceMin // ~14.12 km/h

  const withinRange = result.marathonPace.kmh >= expectedMarathonKmhMin && result.marathonPace.kmh <= expectedMarathonKmhMax

  logger.debug('EXPECTED vs ACTUAL', {
    expectedMarathonPace: '4:25-4:30/km (13.3-14.1 km/h)',
    actualMarathonPace: `${result.marathonPace.pace} (${result.marathonPace.kmh.toFixed(1)} km/h)`,
    withinExpectedRange: withinRange
  })

  logger.debug('========================================')

  return {
    passed: withinRange,
    result
  }
}

/**
 * TEST CASE 2: Elite marathoner with low lactate (Paula Radcliffe type)
 *
 * Expected behavior:
 * - VDOT ~75 (2:15 marathon)
 * - Max lactate <6 mmol/L
 * - LT2 ~2 mmol/L (slow twitch)
 * - High compression factor (96-98%)
 */
export function validateEliteSlowTwitch() {
  logger.debug('========================================')
  logger.debug('TEST CASE 2: Elite Slow Twitch (Paula Type)')
  logger.debug('========================================')

  const profile: AthleteProfileData = {
    age: 28,
    gender: 'FEMALE',
    weeklyKm: 180,
    trainingAge: 15,
    restingHR: 40,
    maxHR: 190,
  }

  const races: RacePerformance[] = [
    {
      distance: 'MARATHON',
      timeMinutes: 135, // 2:15:00
      date: new Date('2025-10-01'),
      age: 28,
      gender: 'FEMALE'
    }
  ]

  const lactateTest: LactateTestData = {
    testStages: [
      { sequence: 1, speed: 14.0, heartRate: 140, lactate: 0.8 },
      { sequence: 2, speed: 15.0, heartRate: 150, lactate: 1.2 },
      { sequence: 3, speed: 16.0, heartRate: 160, lactate: 1.6 },
      { sequence: 4, speed: 17.0, heartRate: 170, lactate: 2.1 }, // LT2
      { sequence: 5, speed: 18.0, heartRate: 178, lactate: 3.2 },
      { sequence: 6, speed: 19.0, heartRate: 186, lactate: 4.8 }  // Max
    ],
    maxHR: 190
  }

  const result = selectOptimalPaces(profile, races, lactateTest)

  logger.debug('Elite slow twitch result', {
    primarySource: result.primarySource,
    athleteLevel: result.athleteClassification.level,
    metabolicType: result.athleteClassification.metabolicType,
    compressionFactor: (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%',
    vdot: result.vdotResult?.vdot,
    maxLactate: result.lactateProfile?.maxLactate.toFixed(1) + ' mmol/L',
    lt2Lactate: result.lactateProfile?.lt2.lactate.toFixed(1) + ' mmol/L',
    lt2Ratio: (result.lactateProfile?.lt2Ratio ?? 0 * 100).toFixed(1) + '%',
    marathonPace: `${result.marathonPace.pace} (${result.marathonPace.kmh.toFixed(1)} km/h)`,
    thresholdPace: `${result.thresholdPace.pace} (${result.thresholdPace.kmh.toFixed(1)} km/h)`
  })

  const expectedSlowTwitch = result.athleteClassification.metabolicType === 'SLOW_TWITCH'
  const expectedHighCompression = result.athleteClassification.compressionFactor >= 0.95

  logger.debug('Elite slow twitch validation', {
    metabolicTypeSlowTwitch: expectedSlowTwitch,
    compressionFactorAbove95: expectedHighCompression
  })

  logger.debug('========================================')

  return {
    passed: expectedSlowTwitch && expectedHighCompression,
    result
  }
}

/**
 * TEST CASE 3: Recreational runner with limited data
 *
 * Expected behavior:
 * - VDOT ~40 (4:00 marathon)
 * - Profile estimation if no lactate test
 * - Lower compression factor (78-82%)
 */
export function validateRecreationalRunner() {
  logger.debug('========================================')
  logger.debug('TEST CASE 3: Recreational Runner')
  logger.debug('========================================')

  const profile: AthleteProfileData = {
    age: 45,
    gender: 'MALE',
    weeklyKm: 35,
    trainingAge: 2,
    restingHR: 65,
    maxHR: 175,
  }

  const races: RacePerformance[] = [
    {
      distance: '10K',
      timeMinutes: 50, // 50:00 (5:00/km)
      date: new Date('2025-09-01'),
      age: 45,
      gender: 'MALE'
    }
  ]

  const result = selectOptimalPaces(profile, races)

  logger.debug('Recreational runner result', {
    primarySource: result.primarySource,
    athleteLevel: result.athleteClassification.level,
    compressionFactor: (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%',
    vdot: result.vdotResult?.vdot,
    marathonPace: `${result.marathonPace.pace} (${result.marathonPace.kmh.toFixed(1)} km/h)`,
    easyPace: `${result.easyPace.minPace} - ${result.easyPace.maxPace}`
  })

  const expectedRecreational = result.athleteClassification.level === 'RECREATIONAL' || result.athleteClassification.level === 'INTERMEDIATE'
  const expectedLowCompression = result.athleteClassification.compressionFactor <= 0.88

  logger.debug('Recreational runner validation', {
    levelRecreationalOrIntermediate: expectedRecreational,
    compressionFactorBelow88: expectedLowCompression
  })

  logger.debug('========================================')

  return {
    passed: expectedRecreational && expectedLowCompression,
    result
  }
}

/**
 * Run all validation tests
 */
export function runAllValidationTests() {
  logger.debug('PACE SELECTION VALIDATION TEST SUITE')

  const test1 = validateRealAthlete1()
  const test2 = validateEliteSlowTwitch()
  const test3 = validateRecreationalRunner()

  logger.debug('TEST SUMMARY', {
    test1_128HMRunner: test1.passed ? 'PASSED' : 'FAILED',
    test2_EliteSlowTwitch: test2.passed ? 'PASSED' : 'FAILED',
    test3_Recreational: test3.passed ? 'PASSED' : 'FAILED',
    overall: test1.passed && test2.passed && test3.passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'
  })

  return {
    allPassed: test1.passed && test2.passed && test3.passed,
    results: {
      test1,
      test2,
      test3
    }
  }
}

/**
 * Race result data for VDOT-based pace calculation
 */
export interface RaceResultForPace {
  distanceMeters: number  // e.g., 21097.5 for half marathon
  timeSeconds: number     // e.g., 5280 for 1:28:00
  date?: Date
}

/**
 * Calculate marathon pace from race result using VDOT
 */
function calculateMarathonPaceFromRace(raceResult: RaceResultForPace): number {
  // Calculate VDOT from race performance
  const vdot = calculateVDOT(raceResult.distanceMeters, raceResult.timeSeconds)

  // Marathon time prediction (using same VDOT logic)
  // For half marathon to marathon: multiply time by ~2.1 (typical ratio)
  // But VDOT is more accurate - use the VDOT to predict marathon pace directly

  // Marathon pace in sec/km = predicted marathon time / 42.195
  // Using VDOT-based prediction
  const marathonDistanceKm = 42.195

  // Solve for marathon pace from VDOT
  // percentMax for marathon ≈ 0.80-0.85
  const percentMax = 0.82

  const targetVO2 = vdot * percentMax

  // Solve: targetVO2 = -4.60 + 0.182258*v + 0.000104*v^2
  const a = 0.000104
  const b = 0.182258
  const c = -4.60 - targetVO2
  const velocity = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a) // m/min

  const marathonPaceKmh = velocity * 60 / 1000 // Convert m/min to km/h

  logger.debug('[Pace Validator] Marathon pace calculated from race', {
    raceResult: `${(raceResult.distanceMeters/1000).toFixed(1)}km in ${Math.floor(raceResult.timeSeconds/60)}:${String(raceResult.timeSeconds%60).padStart(2,'0')}`,
    calculatedVDOT: vdot.toFixed(1),
    predictedMarathonPace: `${marathonPaceKmh.toFixed(1)} km/h`
  })

  return marathonPaceKmh
}

/**
 * Select the most reliable marathon pace from a test
 * Used by program generator for Canova methodology
 *
 * PRIORITY ORDER (Updated):
 * 1. Real D-max calculated LT2 (individual physiological data - highest priority)
 * 2. Recent race results (VDOT) - Performance validation
 * 3. Coach manual input (clicked graph to set LT2)
 * 4. Default LT2 (4.0 mmol/L) - Lowest priority, with warning
 * 5. Training zones fallback
 * 6. Default fallback
 */
export function selectReliableMarathonPace(
  test: any,
  goalType: string,
  targetRaceDate?: Date,
  recentRaceResult?: RaceResultForPace // Optional race result for VDOT
): {
  marathonPaceKmh: number
  source: string
  confidence: string
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  // Check LT2 status
  const lt2Status = classifyLT2Source(test)

  logger.debug('[Pace Validator] LT2 Status', {
    source: lt2Status.source,
    lactate: lt2Status.lactateAtLT2?.toFixed(1) || 'unknown',
    unit: 'mmol/L'
  })

  // ===== PRIORITY 1: Real D-max calculated LT2 =====
  // D-max from lactate test is the gold standard - individualized physiological data
  if (lt2Status.source === 'DMAX' || lt2Status.source === 'CALCULATED') {
    const thresholdValue = test.anaerobicThreshold?.value
    const thresholdUnit = test.anaerobicThreshold?.unit

    if (thresholdValue && thresholdUnit) {
      let lt2SpeedKmh: number = convertToKmh(thresholdValue, thresholdUnit)

      if (lt2SpeedKmh > 0) {
        const marathonPaceKmh = lt2SpeedKmh * 0.90

        logger.debug('[Pace Validator] PRIORITY 1: Using D-max LT2', {
          lt2Speed: `${lt2SpeedKmh.toFixed(1)} km/h`,
          lt2Lactate: `${lt2Status.lactateAtLT2?.toFixed(1)} mmol/L`,
          marathonPace: `${marathonPaceKmh.toFixed(1)} km/h (90% of LT2)`
        })

        return {
          marathonPaceKmh,
          source: 'LACTATE_TEST_DMAX',
          confidence: 'VERY_HIGH',
          warnings,
          errors,
        }
      }
    }

    // Fallback: Try to find stage by matching heart rate
    if (test.testStages && test.anaerobicThreshold?.heartRate) {
      const lt2HR = test.anaerobicThreshold.heartRate
      const lt2Stage = test.testStages.find(
        (stage: any) => Math.abs(stage.heartRate - lt2HR) <= 2
      )

      if (lt2Stage && lt2Stage.speed) {
        const marathonPaceKmh = lt2Stage.speed * 0.90
        logger.debug('[Pace Validator] PRIORITY 1: D-max LT2 from HR match', {
          lt2Speed: `${lt2Stage.speed.toFixed(1)} km/h`,
          marathonPace: `${marathonPaceKmh.toFixed(1)} km/h`
        })

        return {
          marathonPaceKmh,
          source: 'LACTATE_TEST_DMAX',
          confidence: 'VERY_HIGH',
          warnings,
          errors,
        }
      }
    }
  }

  // ===== PRIORITY 2: Recent race result (VDOT-based) =====
  // Race performance provides validation of actual capability
  if (recentRaceResult && recentRaceResult.distanceMeters && recentRaceResult.timeSeconds) {
    const marathonPaceKmh = calculateMarathonPaceFromRace(recentRaceResult)

    if (marathonPaceKmh > 8 && marathonPaceKmh < 25) { // Sanity check: 2:24/km to 7:30/km pace
      logger.debug('[Pace Validator] PRIORITY 2: Using race result (VDOT)')

      if (lt2Status.source === 'DEFAULT') {
        warnings.push('D-max calculation failed - using race result instead')
      }

      return {
        marathonPaceKmh,
        source: 'RACE_RESULT_VDOT',
        confidence: 'HIGH',
        warnings,
        errors,
      }
    }
  }

  // ===== PRIORITY 3: Coach manual input (non-default, non-D-max LT2) =====
  // Coach clicked graph to manually set LT2 point
  if (lt2Status.source === 'MANUAL' && test.anaerobicThreshold) {
    const thresholdValue = test.anaerobicThreshold.value
    const thresholdUnit = test.anaerobicThreshold.unit

    if (thresholdValue && thresholdUnit) {
      let lt2SpeedKmh: number = convertToKmh(thresholdValue, thresholdUnit)

      if (lt2SpeedKmh > 0) {
        const marathonPaceKmh = lt2SpeedKmh * 0.90

        logger.debug('[Pace Validator] PRIORITY 3: Using coach manual LT2', {
          lt2Speed: `${lt2SpeedKmh.toFixed(1)} km/h`,
          marathonPace: `${marathonPaceKmh.toFixed(1)} km/h (90% of LT2)`
        })

        return {
          marathonPaceKmh,
          source: 'COACH_MANUAL_INPUT',
          confidence: 'MEDIUM',
          warnings,
          errors,
        }
      }
    }
  }

  // ===== PRIORITY 4: Default LT2 (4.0 mmol/L) - WITH WARNING =====
  if (lt2Status.source === 'DEFAULT' && test.anaerobicThreshold) {
    const thresholdValue = test.anaerobicThreshold.value
    const thresholdUnit = test.anaerobicThreshold.unit

    if (thresholdValue && thresholdUnit) {
      let lt2SpeedKmh: number = convertToKmh(thresholdValue, thresholdUnit)

      if (lt2SpeedKmh > 0) {
        const marathonPaceKmh = lt2SpeedKmh * 0.90

        // Add warning about default LT2
        warnings.push('LT2 based on default 4.0 mmol/L (D-max calculation failed)')
        warnings.push('For high lactate producers, this may underestimate true threshold')
        warnings.push('Consider: 1) Adding race result, 2) Manually set LT2 on graph')

        logger.debug('[Pace Validator] PRIORITY 4: Using DEFAULT LT2', {
          lt2Speed: `${lt2SpeedKmh.toFixed(1)} km/h`,
          warning: 'May be inaccurate for this athlete!',
          marathonPace: `${marathonPaceKmh.toFixed(1)} km/h`
        })

        return {
          marathonPaceKmh,
          source: 'LACTATE_TEST_DEFAULT',
          confidence: 'LOW',
          warnings,
          errors,
        }
      }
    }
  }

  // ===== PRIORITY 5: Training zones fallback =====
  if (test.trainingZones && test.trainingZones.length >= 2) {
    const zone2 = test.trainingZones[1] // Zone 2 = Marathon zone

    if (zone2.minSpeed && zone2.maxSpeed) {
      const marathonPaceKmh = (zone2.minSpeed + zone2.maxSpeed) / 2

      warnings.push('Using legacy zone 2 for marathon pace (less precise)')

      return {
        marathonPaceKmh,
        source: 'TRAINING_ZONES',
        confidence: 'LOW',
        warnings,
        errors,
      }
    }
  }

  // ===== PRIORITY 6: Default fallback =====
  errors.push('No reliable marathon pace available from test')

  return {
    marathonPaceKmh: 12.0, // Fallback default (~5:00/km)
    source: 'DEFAULT',
    confidence: 'VERY_LOW',
    warnings,
    errors,
  }
}

/**
 * Convert threshold value to km/h
 */
function convertToKmh(value: number, unit: string): number {
  if (unit === 'km/h') {
    return value
  } else if (unit === 'min/km') {
    return 60 / value
  } else if (unit === 'watt') {
    logger.debug('[Pace Validator] Power-based threshold, cannot convert to pace')
    return 0
  } else {
    return value // Assume km/h
  }
}

/**
 * Classify the source of LT2 threshold
 * Returns: 'DMAX' | 'CALCULATED' | 'MANUAL' | 'DEFAULT' | 'NONE'
 */
function classifyLT2Source(test: any): {
  source: 'DMAX' | 'CALCULATED' | 'MANUAL' | 'DEFAULT' | 'NONE'
  lactateAtLT2: number | null
} {
  if (!test.anaerobicThreshold) {
    return { source: 'NONE', lactateAtLT2: null }
  }

  // Check if we have a ThresholdCalculation record
  if (test.thresholdCalculation) {
    const method = test.thresholdCalculation.method
    const lt2Lactate = test.thresholdCalculation.lt2Lactate

    if (method === 'D-MAX' || method === 'MOD-DMAX') {
      return { source: 'DMAX', lactateAtLT2: lt2Lactate }
    }
    if (method === 'MANUAL' || method === 'COACH_INPUT') {
      return { source: 'MANUAL', lactateAtLT2: lt2Lactate }
    }
    if (method === 'OBLA') {
      return { source: 'DEFAULT', lactateAtLT2: 4.0 }
    }
    // Other calculation methods
    return { source: 'CALCULATED', lactateAtLT2: lt2Lactate }
  }

  // Fallback: Check lactate at LT2 HR from test stages
  if (!test.testStages || test.testStages.length === 0) {
    return { source: 'DEFAULT', lactateAtLT2: 4.0 }
  }

  const lt2HR = test.anaerobicThreshold.heartRate
  if (!lt2HR) {
    return { source: 'DEFAULT', lactateAtLT2: 4.0 }
  }

  const lt2Stage = test.testStages.find(
    (stage: any) => Math.abs(stage.heartRate - lt2HR) <= 2
  )

  if (!lt2Stage) {
    return { source: 'DEFAULT', lactateAtLT2: 4.0 }
  }

  const lactateAtLT2 = lt2Stage.lactate

  // If lactate at LT2 is exactly 4.0 or very close, it's likely a default OBLA value
  if (Math.abs(lactateAtLT2 - 4.0) < 0.2) {
    logger.debug('[Pace Validator] LT2 lactate is ~4.0 mmol/L - likely default OBLA')
    return { source: 'DEFAULT', lactateAtLT2 }
  }

  // Non-4.0 lactate - could be D-max or manual
  // Without ThresholdCalculation, we assume it's a real calculation
  // If it's far from typical D-max values (usually 2-6 mmol/L for most athletes),
  // it might be manual input
  if (lactateAtLT2 < 1.5 || lactateAtLT2 > 8.0) {
    // Unusual value - might be manual
    return { source: 'MANUAL', lactateAtLT2 }
  }

  // Assume real D-max calculation
  return { source: 'CALCULATED', lactateAtLT2 }
}

/**
 * Format pace validation results for logging
 */
export function formatPaceValidation(validation: {
  marathonPaceKmh: number
  source: string
  confidence: string
  warnings: string[]
  errors: string[]
}): string {
  const minPerKm = 60 / validation.marathonPaceKmh
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  const pace = `${minutes}:${String(seconds).padStart(2, '0')}/km`

  return `Marathon pace: ${pace} (${validation.marathonPaceKmh.toFixed(1)} km/h) from ${validation.source} (${validation.confidence} confidence)`
}

