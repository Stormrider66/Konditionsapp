// lib/program-generator/pace-validator.ts
// Validation module for testing pace selection system with real athlete data

import { selectOptimalPaces, type RacePerformance, type AthleteProfileData, type LactateTestData } from '@/lib/training-engine/calculations/pace-selector'
import { calculateVDOTFromRace } from '@/lib/training-engine/calculations/vdot'
import { analyzeLactateProfile } from '@/lib/training-engine/calculations/lactate-profile-analyzer'
import { classifyAthlete } from '@/lib/training-engine/calculations/athlete-classifier'

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
  console.log('========================================')
  console.log('TEST CASE 1: 1:28 Half Marathon Runner')
  console.log('========================================\n')

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
  console.log('PRIMARY SOURCE:', result.primarySource)
  console.log('SECONDARY SOURCE:', result.secondarySource || 'None')
  console.log('CONFIDENCE:', result.confidence)
  console.log('\nATHLETE CLASSIFICATION:')
  console.log('  Level:', result.athleteClassification.level)
  console.log('  Metabolic Type:', result.athleteClassification.metabolicType)
  console.log('  Compression Factor:', (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%')
  console.log('\nVDOT ANALYSIS:')
  if (result.vdotResult) {
    console.log('  VDOT:', result.vdotResult.vdot)
    console.log('  Adjustments:', result.vdotResult.adjustments)
  }
  console.log('\nLACTATE PROFILE:')
  if (result.lactateProfile) {
    console.log('  Max Lactate:', result.lactateProfile.maxLactate.toFixed(1), 'mmol/L')
    console.log('  LT2 Lactate:', result.lactateProfile.lt2.lactate.toFixed(1), 'mmol/L')
    console.log('  LT2 Ratio:', (result.lactateProfile.lt2Ratio * 100).toFixed(1) + '%')
    console.log('  LT2 Speed:', result.lactateProfile.lt2.speed.toFixed(1), 'km/h')
    console.log('  LT2 HR:', result.lactateProfile.lt2.heartRate, 'bpm')
  }

  console.log('\n📊 CORE PACES:')
  console.log('  Easy:', result.easyPace.minPace, '-', result.easyPace.maxPace)
  console.log('  Marathon:', result.marathonPace.pace, `(${result.marathonPace.kmh.toFixed(1)} km/h)`)
  console.log('  Threshold:', result.thresholdPace.pace, `(${result.thresholdPace.kmh.toFixed(1)} km/h)`)
  console.log('  Interval:', result.intervalPace.pace, `(${result.intervalPace.kmh.toFixed(1)} km/h)`)
  console.log('  Repetition:', result.repetitionPace.pace, `(${result.repetitionPace.kmh.toFixed(1)} km/h)`)

  console.log('\n🎯 DANIELS ZONES:')
  console.log('  E:', result.zones.daniels.easy.minPace, '-', result.zones.daniels.easy.maxPace)
  console.log('  M:', result.zones.daniels.marathon.pace)
  console.log('  T:', result.zones.daniels.threshold.pace)
  console.log('  I:', result.zones.daniels.interval.pace)
  console.log('  R:', result.zones.daniels.repetition.pace)

  console.log('\n🇮🇹 CANOVA ZONES:')
  console.log('  Fundamental:', result.zones.canova.fundamental.pace, `(${result.zones.canova.fundamental.percentOfMP}% MP)`)
  console.log('  Progressive:', result.zones.canova.progressive.minPace, '-', result.zones.canova.progressive.maxPace, `(${result.zones.canova.progressive.percentOfMP} MP)`)
  console.log('  Marathon:', result.zones.canova.marathon.pace, `(${result.zones.canova.marathon.percentOfMP}% MP)`)
  console.log('  Specific:', result.zones.canova.specific.pace, `(${result.zones.canova.specific.percentOfMP}% MP)`)
  console.log('  Threshold:', result.zones.canova.threshold.pace, `(${result.zones.canova.threshold.percentOfMP}% MP)`)
  console.log('  5K:', result.zones.canova.fiveK.pace, `(${result.zones.canova.fiveK.percentOfMP}% MP)`)

  console.log('\n🇳🇴 NORWEGIAN ZONES:')
  console.log('  Green:', result.zones.norwegian.green.minPace, '-', result.zones.norwegian.green.maxPace, result.zones.norwegian.green.lactate)
  console.log('  Threshold:', result.zones.norwegian.threshold.pace, result.zones.norwegian.threshold.lactate)
  console.log('  Red:', result.zones.norwegian.red.minPace, '-', result.zones.norwegian.red.maxPace, result.zones.norwegian.red.lactate)

  console.log('\n⚠️ WARNINGS:')
  if (result.warnings.length > 0) {
    result.warnings.forEach(w => console.log('  -', w))
  } else {
    console.log('  None')
  }

  console.log('\n✅ VALIDATION:')
  console.log('  Sources Available:')
  console.log('    - VDOT:', result.validationResults.sourcesAvailable.vdot ? '✓' : '✗')
  console.log('    - Lactate:', result.validationResults.sourcesAvailable.lactate ? '✓' : '✗')
  console.log('    - HR Data:', result.validationResults.sourcesAvailable.hrData ? '✓' : '✗')
  console.log('  Consistency:')
  console.log('    - Marathon Pace:', result.validationResults.consistencyChecks.marathonPaceConsistent ? '✓' : '✗')
  console.log('    - Threshold Pace:', result.validationResults.consistencyChecks.thresholdPaceConsistent ? '✓' : '✗')
  if (result.validationResults.consistencyChecks.mismatchPercent) {
    console.log('    - Mismatch:', result.validationResults.consistencyChecks.mismatchPercent.toFixed(1) + '%')
  }

  // EXPECTED RESULT VALIDATION
  console.log('\n🔬 EXPECTED vs ACTUAL:')
  const expectedMarathonPaceMin = 4.25 // 4:25/km
  const expectedMarathonPaceMax = 4.50 // 4:30/km
  const expectedMarathonKmhMin = 60 / expectedMarathonPaceMax // ~13.33 km/h
  const expectedMarathonKmhMax = 60 / expectedMarathonPaceMin // ~14.12 km/h

  console.log('  Expected Marathon Pace: 4:25-4:30/km (13.3-14.1 km/h)')
  console.log('  Actual Marathon Pace:', result.marathonPace.pace, `(${result.marathonPace.kmh.toFixed(1)} km/h)`)

  const withinRange = result.marathonPace.kmh >= expectedMarathonKmhMin && result.marathonPace.kmh <= expectedMarathonKmhMax
  console.log('  ✓ Within Expected Range:', withinRange ? 'YES ✅' : 'NO ❌')

  console.log('\n========================================\n')

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
  console.log('========================================')
  console.log('TEST CASE 2: Elite Slow Twitch (Paula Type)')
  console.log('========================================\n')

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

  console.log('PRIMARY SOURCE:', result.primarySource)
  console.log('ATHLETE LEVEL:', result.athleteClassification.level)
  console.log('METABOLIC TYPE:', result.athleteClassification.metabolicType)
  console.log('COMPRESSION FACTOR:', (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%')
  console.log('\nVDOT:', result.vdotResult?.vdot)
  console.log('MAX LACTATE:', result.lactateProfile?.maxLactate.toFixed(1), 'mmol/L')
  console.log('LT2 LACTATE:', result.lactateProfile?.lt2.lactate.toFixed(1), 'mmol/L')
  console.log('LT2 RATIO:', (result.lactateProfile?.lt2Ratio ?? 0 * 100).toFixed(1) + '%')

  console.log('\nMARATHON PACE:', result.marathonPace.pace, `(${result.marathonPace.kmh.toFixed(1)} km/h)`)
  console.log('THRESHOLD PACE:', result.thresholdPace.pace, `(${result.thresholdPace.kmh.toFixed(1)} km/h)`)

  const expectedSlowTwitch = result.athleteClassification.metabolicType === 'SLOW_TWITCH'
  const expectedHighCompression = result.athleteClassification.compressionFactor >= 0.95

  console.log('\n✓ Metabolic Type = SLOW_TWITCH:', expectedSlowTwitch ? 'YES ✅' : 'NO ❌')
  console.log('✓ Compression Factor ≥ 95%:', expectedHighCompression ? 'YES ✅' : 'NO ❌')

  console.log('\n========================================\n')

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
  console.log('========================================')
  console.log('TEST CASE 3: Recreational Runner')
  console.log('========================================\n')

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

  console.log('PRIMARY SOURCE:', result.primarySource)
  console.log('ATHLETE LEVEL:', result.athleteClassification.level)
  console.log('COMPRESSION FACTOR:', (result.athleteClassification.compressionFactor * 100).toFixed(1) + '%')
  console.log('\nVDOT:', result.vdotResult?.vdot)
  console.log('MARATHON PACE:', result.marathonPace.pace, `(${result.marathonPace.kmh.toFixed(1)} km/h)`)
  console.log('EASY PACE:', result.easyPace.minPace, '-', result.easyPace.maxPace)

  const expectedRecreational = result.athleteClassification.level === 'RECREATIONAL' || result.athleteClassification.level === 'INTERMEDIATE'
  const expectedLowCompression = result.athleteClassification.compressionFactor <= 0.88

  console.log('\n✓ Level = RECREATIONAL/INTERMEDIATE:', expectedRecreational ? 'YES ✅' : 'NO ❌')
  console.log('✓ Compression Factor ≤ 88%:', expectedLowCompression ? 'YES ✅' : 'NO ❌')

  console.log('\n========================================\n')

  return {
    passed: expectedRecreational && expectedLowCompression,
    result
  }
}

/**
 * Run all validation tests
 */
export function runAllValidationTests() {
  console.log('\n\n')
  console.log('╔════════════════════════════════════════╗')
  console.log('║  PACE SELECTION VALIDATION TEST SUITE  ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('\n')

  const test1 = validateRealAthlete1()
  const test2 = validateEliteSlowTwitch()
  const test3 = validateRecreationalRunner()

  console.log('╔════════════════════════════════════════╗')
  console.log('║         TEST SUMMARY                   ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')
  console.log('Test 1 (1:28 HM Runner):', test1.passed ? '✅ PASSED' : '❌ FAILED')
  console.log('Test 2 (Elite Slow Twitch):', test2.passed ? '✅ PASSED' : '❌ FAILED')
  console.log('Test 3 (Recreational):', test3.passed ? '✅ PASSED' : '❌ FAILED')
  console.log('')
  console.log('Overall:', test1.passed && test2.passed && test3.passed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
  console.log('')

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
 * Select the most reliable marathon pace from a test
 * Used by program generator for Canova methodology
 */
export function selectReliableMarathonPace(
  test: any,
  goalType: string,
  targetRaceDate?: Date
): {
  marathonPaceKmh: number
  source: string
  confidence: string
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  // Try to get marathon pace from test's anaerobic threshold
  if (test.anaerobicThreshold && test.testStages) {
    const lt2Stage = test.testStages.find(
      (stage: any) => stage.sequence === test.anaerobicThreshold.sequence
    )

    if (lt2Stage && lt2Stage.speed) {
      // Use threshold speed to estimate marathon pace
      // Marathon pace is typically 88-92% of LT2 pace
      const marathonPaceKmh = lt2Stage.speed * 0.90

      return {
        marathonPaceKmh,
        source: 'LACTATE_TEST',
        confidence: 'HIGH',
        warnings,
        errors,
      }
    }
  }

  // Fallback: Use zone 2 from training zones
  if (test.trainingZones && test.trainingZones.length >= 2) {
    const zone2 = test.trainingZones[1] // Zone 2 = Marathon zone

    if (zone2.minSpeed && zone2.maxSpeed) {
      const marathonPaceKmh = (zone2.minSpeed + zone2.maxSpeed) / 2

      warnings.push('Using legacy zone 2 for marathon pace (less precise)')

      return {
        marathonPaceKmh,
        source: 'TRAINING_ZONES',
        confidence: 'MEDIUM',
        warnings,
        errors,
      }
    }
  }

  // No reliable pace available
  errors.push('No reliable marathon pace available from test')

  return {
    marathonPaceKmh: 12.0, // Fallback default
    source: 'DEFAULT',
    confidence: 'LOW',
    warnings,
    errors,
  }
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

// For running directly
if (require.main === module) {
  runAllValidationTests()
}
