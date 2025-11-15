/**
 * Field Test Scheduling
 *
 * Automatically schedule benchmark tests to:
 * - Track fitness progression
 * - Update training zones
 * - Validate training effectiveness
 * - Adjust program if needed
 *
 * Test Types:
 * - Critical Velocity (30-min time trial)
 * - Lactate Threshold Field Test (20-30 min steady state)
 * - Cooper Test (12-min maximal)
 * - 5K Time Trial
 * - Submaximal HR Drift Test
 *
 * Philosophy:
 * - Test every 4-6 weeks for progression tracking
 * - Avoid testing during deload weeks
 * - Avoid testing week before races
 * - Test after recovery from previous test/race
 */

import { PeriodPhase } from '@/types'
import { AthleteLevel } from '@/lib/training-engine/methodologies'

export type FieldTestType =
  | 'CRITICAL_VELOCITY' // 30-min time trial
  | 'LACTATE_THRESHOLD' // 20-min steady state @ threshold
  | 'COOPER_TEST' // 12-min maximal distance
  | 'TIME_TRIAL_5K' // 5K race effort
  | 'HR_DRIFT' // Submaximal aerobic efficiency test
  | 'STEP_TEST' // Progressive intensity test

export interface FieldTest {
  weekNumber: number
  type: FieldTestType
  phase: PeriodPhase
  purpose: string
  preparation: string[]
  execution: string[]
  expectedMetrics: string[]
}

export interface FieldTestSchedule {
  tests: FieldTest[]
  warnings: string[]
  totalTests: number
  testingDensity: number // Tests per month
}

/**
 * Calculate field test schedule for program
 */
export function calculateFieldTestSchedule(
  totalWeeks: number,
  athleteLevel: AthleteLevel,
  phases: { weekNumber: number; phase: PeriodPhase }[],
  deloadWeeks: number[], // Weeks with deload
  raceWeeks: number[] // Weeks with races
): FieldTestSchedule {
  const warnings: string[] = []
  const tests: FieldTest[] = []

  // Test frequency based on athlete level
  const testFrequencyWeeks = getTestFrequency(athleteLevel)

  // Calculate ideal test weeks
  let nextTestWeek = getInitialTestWeek(athleteLevel) // Usually week 4-6
  let testCount = 0

  while (nextTestWeek <= totalWeeks) {
    // Validate test week
    const validation = validateTestWeek(
      nextTestWeek,
      deloadWeeks,
      raceWeeks,
      phases
    )

    if (validation.valid) {
      const currentPhase = phases.find(p => p.weekNumber === nextTestWeek)?.phase || 'BASE'
      const testType = selectTestType(currentPhase, athleteLevel, testCount)

      tests.push(createFieldTest(nextTestWeek, testType, currentPhase, testCount))
      testCount++
    } else {
      // Try to reschedule to nearby week
      const alternativeWeek = findAlternativeTestWeek(
        nextTestWeek,
        totalWeeks,
        deloadWeeks,
        raceWeeks,
        phases
      )

      if (alternativeWeek) {
        const currentPhase = phases.find(p => p.weekNumber === alternativeWeek)?.phase || 'BASE'
        const testType = selectTestType(currentPhase, athleteLevel, testCount)

        tests.push(createFieldTest(alternativeWeek, testType, currentPhase, testCount))
        warnings.push(
          `Test ${testCount + 1} rescheduled from week ${nextTestWeek} to week ${alternativeWeek}: ${validation.reason}`
        )
        testCount++
      } else {
        warnings.push(
          `Test ${testCount + 1} skipped at week ${nextTestWeek}: ${validation.reason}`
        )
      }
    }

    nextTestWeek += testFrequencyWeeks
  }

  // Validate total test count
  const testingDensity = (tests.length / (totalWeeks / 4)) // Tests per month
  if (testingDensity > 1.5) {
    warnings.push('High testing frequency - may impact training quality')
  } else if (testingDensity < 0.5 && totalWeeks > 12) {
    warnings.push('Low testing frequency - consider adding more benchmark tests')
  }

  return {
    tests,
    warnings,
    totalTests: tests.length,
    testingDensity,
  }
}

/**
 * Get test frequency based on athlete level
 */
function getTestFrequency(athleteLevel: AthleteLevel): number {
  const frequencies: Record<AthleteLevel, number> = {
    BEGINNER: 6, // Every 6 weeks (slower adaptation)
    RECREATIONAL: 5, // Every 5 weeks
    ADVANCED: 4, // Every 4 weeks
    ELITE: 4, // Every 4 weeks (close monitoring)
  }
  return frequencies[athleteLevel]
}

/**
 * Get initial test week (after base building period)
 */
function getInitialTestWeek(athleteLevel: AthleteLevel): number {
  // Beginners need more base before testing
  // Advanced athletes can test sooner
  const initialWeeks: Record<AthleteLevel, number> = {
    BEGINNER: 6, // Week 6
    RECREATIONAL: 5, // Week 5
    ADVANCED: 4, // Week 4
    ELITE: 4, // Week 4
  }
  return initialWeeks[athleteLevel]
}

/**
 * Validate test week
 */
function validateTestWeek(
  weekNumber: number,
  deloadWeeks: number[],
  raceWeeks: number[],
  phases: { weekNumber: number; phase: PeriodPhase }[]
): { valid: boolean; reason: string } {
  // Don't test during deload
  if (deloadWeeks.includes(weekNumber)) {
    return { valid: false, reason: 'Deload week' }
  }

  // Don't test same week as race
  if (raceWeeks.includes(weekNumber)) {
    return { valid: false, reason: 'Race week' }
  }

  // Don't test week before race
  if (raceWeeks.includes(weekNumber + 1)) {
    return { valid: false, reason: 'Week before race' }
  }

  // Don't test during taper
  const currentPhase = phases.find(p => p.weekNumber === weekNumber)?.phase
  if (currentPhase === 'TAPER') {
    return { valid: false, reason: 'Taper phase' }
  }

  // Don't test during recovery phase
  if (currentPhase === 'RECOVERY') {
    return { valid: false, reason: 'Recovery phase' }
  }

  return { valid: true, reason: '' }
}

/**
 * Find alternative test week nearby
 */
function findAlternativeTestWeek(
  originalWeek: number,
  totalWeeks: number,
  deloadWeeks: number[],
  raceWeeks: number[],
  phases: { weekNumber: number; phase: PeriodPhase }[]
): number | null {
  // Try week before, then week after
  for (const offset of [-1, +1, -2, +2]) {
    const alternativeWeek = originalWeek + offset
    if (alternativeWeek < 1 || alternativeWeek > totalWeeks) continue

    const validation = validateTestWeek(alternativeWeek, deloadWeeks, raceWeeks, phases)
    if (validation.valid) {
      return alternativeWeek
    }
  }

  return null
}

/**
 * Select appropriate test type based on phase and athlete level
 */
function selectTestType(
  phase: PeriodPhase,
  athleteLevel: AthleteLevel,
  testNumber: number
): FieldTestType {
  // First test is always baseline
  if (testNumber === 0) {
    return 'CRITICAL_VELOCITY' // Comprehensive baseline
  }

  // Select based on phase
  if (phase === 'BASE') {
    // Base phase: aerobic efficiency tests
    return testNumber % 2 === 0 ? 'HR_DRIFT' : 'CRITICAL_VELOCITY'
  } else if (phase === 'BUILD') {
    // Build phase: threshold tests
    return 'LACTATE_THRESHOLD'
  } else if (phase === 'PEAK') {
    // Peak phase: race-specific tests
    return athleteLevel === 'ELITE' ? 'TIME_TRIAL_5K' : 'LACTATE_THRESHOLD'
  }

  // Default
  return 'CRITICAL_VELOCITY'
}

/**
 * Create field test details
 */
function createFieldTest(
  weekNumber: number,
  type: FieldTestType,
  phase: PeriodPhase,
  testNumber: number
): FieldTest {
  const testDetails = getFieldTestDetails(type)

  let purpose = testDetails.purpose
  if (testNumber === 0) {
    purpose = `Baseline assessment: ${purpose}`
  } else {
    purpose = `Progress check ${testNumber}: ${purpose}`
  }

  return {
    weekNumber,
    type,
    phase,
    purpose,
    preparation: testDetails.preparation,
    execution: testDetails.execution,
    expectedMetrics: testDetails.expectedMetrics,
  }
}

/**
 * Get field test protocol details
 */
function getFieldTestDetails(type: FieldTestType): {
  purpose: string
  preparation: string[]
  execution: string[]
  expectedMetrics: string[]
} {
  const protocols: Record<
    FieldTestType,
    {
      purpose: string
      preparation: string[]
      execution: string[]
      expectedMetrics: string[]
    }
  > = {
    CRITICAL_VELOCITY: {
      purpose: 'Determine sustainable pace and update threshold zones',
      preparation: [
        'Flat course or track',
        '2-3 easy days before test',
        'Good warm-up (15-20 min easy + strides)',
        'GPS watch or track for accurate distance',
      ],
      execution: [
        'Run 30 minutes at maximal sustainable effort',
        'Aim for even pacing (negative split acceptable)',
        'Record total distance and average HR',
        'Cool down 10-15 minutes easy',
      ],
      expectedMetrics: [
        'Total distance (km)',
        'Average pace (min/km)',
        'Average HR',
        'Max HR',
        'Perceived effort (RPE 1-10)',
      ],
    },
    LACTATE_THRESHOLD: {
      purpose: 'Update LT pace and HR zones',
      preparation: [
        'Flat course or track',
        '2 easy days before',
        'Standard warm-up (15 min easy)',
        'HR monitor required',
      ],
      execution: [
        'Run 20 minutes at comfortably hard pace',
        'Pace should feel "hard but sustainable"',
        'Last 10 minutes should be steady HR',
        'Record average HR from final 10 minutes',
      ],
      expectedMetrics: [
        'Average HR (final 10 min)',
        'Average pace',
        'Distance covered',
        'Perceived effort',
      ],
    },
    COOPER_TEST: {
      purpose: 'VO2max estimation and aerobic capacity',
      preparation: [
        'Track or measured flat course',
        '2-3 easy days before',
        'Thorough warm-up (20 min)',
        'Good weather conditions',
      ],
      execution: [
        'Run maximally for 12 minutes',
        'Track total distance covered',
        'All-out effort from start',
        'Record laps if on track',
      ],
      expectedMetrics: [
        'Total distance (meters)',
        'VO2max estimation',
        'Average pace',
        'Max HR',
      ],
    },
    TIME_TRIAL_5K: {
      purpose: 'Race-specific fitness and pacing practice',
      preparation: [
        'Flat 5K course',
        '3 easy days before',
        'Race-day warm-up routine',
        'Nutrition and hydration planned',
      ],
      execution: [
        'Run 5K at race effort',
        'Practice pacing strategy',
        'Even or negative split',
        'Record splits each km',
      ],
      expectedMetrics: [
        'Total time',
        'Km splits',
        'Average HR',
        'Max HR',
        'VDOT calculation',
      ],
    },
    HR_DRIFT: {
      purpose: 'Assess aerobic efficiency and fatigue',
      preparation: [
        'Flat course or treadmill',
        'Well-rested (no hard training 48h before)',
        'HR monitor required',
        'Consistent pace target',
      ],
      execution: [
        'Run 60 minutes at steady easy-moderate pace',
        'Keep pace constant throughout',
        'Monitor HR drift over time',
        'Record HR every 10 minutes',
      ],
      expectedMetrics: [
        'Starting HR (min 10-20)',
        'Ending HR (min 50-60)',
        'HR drift percentage',
        'Pace consistency',
        'Aerobic efficiency score',
      ],
    },
    STEP_TEST: {
      purpose: 'Progressive threshold detection',
      preparation: [
        'Track or treadmill',
        '2 easy days before',
        'Standard warm-up',
        'HR monitor and pace tracking',
      ],
      execution: [
        'Start at easy pace (Zone 1)',
        'Increase pace every 3 minutes',
        '5-6 steps total',
        'Record HR at end of each step',
        'Stop when unable to maintain pace or HR maximal',
      ],
      expectedMetrics: [
        'HR at each step',
        'Pace at each step',
        'Lactate threshold HR estimation',
        'Anaerobic threshold HR estimation',
      ],
    },
  }

  return protocols[type]
}

/**
 * Get test week recommendations
 */
export function getTestWeekRecommendations(test: FieldTest): {
  weekStructure: string[]
  nutritionTips: string[]
  recoveryGuidance: string
} {
  return {
    weekStructure: [
      'Monday-Tuesday: Easy running, normal training',
      'Wednesday: Moderate workout (not too hard)',
      'Thursday: Easy recovery run',
      `Friday: Rest or very easy 20-30 min (test on ${getTestDay(test.type)})`,
      `${getTestDay(test.type)}: Field test`,
      'Day after test: Complete rest or very easy recovery',
    ],
    nutritionTips: [
      'Maintain normal nutrition throughout week',
      'Hydrate well in days leading up to test',
      'Light meal 2-3 hours before test',
      'No new foods or supplements on test day',
    ],
    recoveryGuidance:
      test.type === 'TIME_TRIAL_5K' || test.type === 'COOPER_TEST'
        ? 'Allow 2-3 days easy recovery after maximal effort test'
        : 'Resume normal training 1-2 days after test',
  }
}

/**
 * Get recommended test day
 */
function getTestDay(type: FieldTestType): string {
  // Most tests best on weekend with fresh legs
  if (type === 'TIME_TRIAL_5K' || type === 'COOPER_TEST') {
    return 'Saturday or Sunday' // Maximal tests on weekend
  }
  return 'Saturday' // Other tests can be midweek or weekend
}

/**
 * Validate field test schedule
 */
export function validateFieldTestSchedule(
  schedule: FieldTestSchedule,
  totalWeeks: number
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings = [...schedule.warnings]

  // Check minimum spacing between tests
  for (let i = 0; i < schedule.tests.length - 1; i++) {
    const gap = schedule.tests[i + 1].weekNumber - schedule.tests[i].weekNumber
    if (gap < 3) {
      errors.push(
        `Insufficient recovery between tests: Week ${schedule.tests[i].weekNumber} and ${schedule.tests[i + 1].weekNumber} (${gap} weeks apart, minimum 3 weeks)`
      )
    }
  }

  // Check for tests in final 2 weeks
  const finalWeekTests = schedule.tests.filter(t => t.weekNumber > totalWeeks - 2)
  if (finalWeekTests.length > 0) {
    warnings.push('Field test scheduled in final weeks - may interfere with taper')
  }

  // Check testing density
  if (schedule.testingDensity > 1.5) {
    warnings.push('Very frequent testing may impact training quality and recovery')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
