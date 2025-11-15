/**
 * Validate critical calculation modules against known-good reference data.
 * Intended to run in CI to catch silent regressions in numerical routines.
 */

import { calculateDmax } from '@/lib/training-engine/calculations/dmax'
import { calculateVDOT } from '@/lib/calculations/vdot'
import { validateNorwegianMethodEligibility } from '@/lib/training-engine/integration/norwegian-validation'
import { handleInjuryDetection } from '@/lib/training-engine/injury-management/injury-handler'
import {
  validateARaceSpacing,
  assessSeasonFeasibility
} from '@/lib/training-engine/advanced-features/multi-race-planning'
import {
  calculateWBGT,
  calculatePaceAdjustment,
  calculateAltitudeAdjustment
} from '@/lib/training-engine/advanced-features/environmental-adjustments'

console.log('Running calculation validation suite...')

type DistanceKey = '5K' | 'HALF_MARATHON'

const DISTANCE_TO_METERS: Record<DistanceKey, number> = {
  '5K': 5000,
  HALF_MARATHON: 21097
}

const REFERENCE_DATA = {
  dmax: {
    input: {
      intensity: [10, 11, 12, 13, 14, 15, 16],
      lactate: [1.2, 1.5, 1.8, 2.3, 3.2, 5.1, 8.5],
      heartRate: [130, 140, 148, 158, 168, 178, 188],
      unit: 'km/h' as const
    },
    expectedThreshold: 14.2,
    tolerance: 0.5
  },
  vdot: {
    tests: [
      { timeSeconds: 1260, distance: '5K' as DistanceKey, expectedVDOT: 47 },
      { timeSeconds: 1440, distance: '5K' as DistanceKey, expectedVDOT: 40 },
      { timeSeconds: 5040, distance: 'HALF_MARATHON' as DistanceKey, expectedVDOT: 55 }
    ],
    tolerance: 2
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

function generateTrainingLoads(avgWeeklyKm: number, weeks = 4) {
  const days = weeks * 7
  const dailyDistance = avgWeeklyKm / 7
  return Array.from({ length: days }, (_, idx) => ({
    distance: dailyDistance,
    date: new Date(Date.now() - idx * DAY_MS)
  }))
}

function createNorwegianPrismaMock(weeklyVolume: number) {
  return {
    athleteProfile: {
      findUnique: async () => ({
        yearsRunning: 3,
        hasLactateMeter: true,
        client: {
          userId: 'coach-1',
          tests: [{ testDate: new Date(Date.now() - 7 * DAY_MS) }],
          trainingLoads: generateTrainingLoads(weeklyVolume)
        }
      })
    }
  }
}

class InjuryPrismaMock {
  workouts: any[] = []
  crossTrainingSessions: any[] = []

  workout = {
    create: async ({ data }: { data: any }) => {
      const workout = { id: `workout-${this.workouts.length + 1}`, ...data }
      this.workouts.push(workout)
      return workout
    },
    findFirst: async ({ where }: { where: any }) => {
      return this.workouts.find(
        workout =>
          workout.clientId === where.clientId &&
          new Date(workout.scheduledDate).toDateString() === new Date(where.scheduledDate).toDateString()
      ) || null
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const workout = this.workouts.find(w => w.id === where.id)
      if (workout) {
        Object.assign(workout, data)
      }
      return workout
    }
  }

  crossTrainingSession = {
    create: async ({ data }: { data: any }) => {
      const session = { id: `cts-${this.crossTrainingSessions.length + 1}`, ...data }
      this.crossTrainingSessions.push(session)
      return session
    }
  }
}

function validateDmax() {
  const result = calculateDmax(REFERENCE_DATA.dmax.input)
  const error = Math.abs(result.intensity - REFERENCE_DATA.dmax.expectedThreshold)

  if (error > REFERENCE_DATA.dmax.tolerance) {
    throw new Error(
      `D-max validation failed: expected ${REFERENCE_DATA.dmax.expectedThreshold.toFixed(1)} km/h, ` +
      `got ${result.intensity.toFixed(2)} km/h`
    )
  }

  console.log('✅ D-max calculation validated against known-good lactate curve')
}

function validateVDOT() {
  for (const test of REFERENCE_DATA.vdot.tests) {
    const distanceMeters = DISTANCE_TO_METERS[test.distance]
    if (!distanceMeters) {
      throw new Error(`No meter conversion defined for ${test.distance}`)
    }

    const result = calculateVDOT(distanceMeters, test.timeSeconds)
    const error = Math.abs(result - test.expectedVDOT)

    if (error > REFERENCE_DATA.vdot.tolerance) {
      throw new Error(
        `VDOT validation failed for ${test.distance}: expected ${test.expectedVDOT}, got ${result} (error ${error.toFixed(2)})`
      )
    }
  }

  console.log('✅ VDOT calculation validated against Jack Daniels reference data')
}

async function validateNorwegianScenario() {
  const prisma = createNorwegianPrismaMock(65)
  const result = await validateNorwegianMethodEligibility('test-athlete', prisma as any)

  if (!result.eligible) {
    throw new Error('Norwegian eligibility validation failed for qualified athlete')
  }

  console.log('✅ Norwegian eligibility validation passed')
}

async function validateInjuryScenario() {
  const prisma = new InjuryPrismaMock()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.workout.create({
    data: {
      clientId: 'test-athlete',
      scheduledDate: today,
      status: 'PLANNED',
      type: 'THRESHOLD'
    }
  })

  await handleInjuryDetection(
    {
      clientId: 'test-athlete',
      painLevel: 6,
      painLocation: 'ACHILLES',
      gaitAffected: true,
      assessment: 'REST_2_3_DAYS'
    },
    prisma as any
  )

  const workout = await prisma.workout.findFirst({
    where: { clientId: 'test-athlete', scheduledDate: today }
  })

  if (workout?.status !== 'CANCELLED') {
    throw new Error('Workout was not cancelled for rest directive')
  }

  console.log('✅ Injury handler validation passed')
}

function validateMultiRaceScenarios() {
  const spacingResult = validateARaceSpacing([
    {
      name: 'Spring Marathon',
      date: new Date('2025-03-01'),
      classification: 'A',
      distance: 'MARATHON'
    },
    {
      name: 'Early Summer Marathon',
      date: new Date('2025-04-15'),
      classification: 'A',
      distance: 'MARATHON'
    }
  ])

  if (spacingResult.valid) {
    throw new Error('A-race spacing validation failed to detect conflict')
  }

  const feasibility = assessSeasonFeasibility(
    [
      {
        name: 'Test',
        date: new Date('2025-03-01'),
        classification: 'A',
        distance: 'HALF'
      },
      {
        name: 'Test 2',
        date: new Date('2025-05-01'),
        classification: 'A',
        distance: 'MARATHON'
      },
      {
        name: 'Test 3',
        date: new Date('2025-07-01'),
        classification: 'A',
        distance: 'HALF'
      },
      {
        name: 'Test 4',
        date: new Date('2025-09-01'),
        classification: 'A',
        distance: 'HALF'
      }
    ],
    { experienceLevel: 'RECREATIONAL', currentWeeklyVolume: 50 },
    { maxWeeklyVolume: 80, sessionsPerWeek: 5 }
  )

  if (feasibility.risk !== 'CRITICAL') {
    throw new Error('Season feasibility failed to flag excessive A-races')
  }

  console.log('✅ Multi-race planning validations passed')
}

function validateEnvironmentalScenarios() {
  const wbgt = calculateWBGT({
    temperatureC: 32,
    humidityPercent: 70,
    dewPointC: 26
  })

  if (wbgt < 25) {
    throw new Error('WBGT calculation lower than expected for hot conditions')
  }

  const paceAdjustment = calculatePaceAdjustment({ wbgt: 30, heatAcclimated: false })
  if (paceAdjustment.paceSlowdownPercent < 15) {
    throw new Error('Heat pace adjustment too small for extreme WBGT')
  }

  const altitudeAdjustment = calculateAltitudeAdjustment({
    altitudeMeters: 2000,
    acclimatizationDays: 14,
    workoutIntensity: 'THRESHOLD'
  })

  if (altitudeAdjustment <= 0) {
    throw new Error('Altitude adjustment should be positive above 1000m')
  }

  console.log('✅ Environmental adjustment validations passed')
}

export async function runValidationSuite() {
  validateDmax()
  validateVDOT()
  await validateNorwegianScenario()
  await validateInjuryScenario()
  validateMultiRaceScenarios()
  validateEnvironmentalScenarios()
  console.log('✅ All calculations validated against known-good data')
}

runValidationSuite().catch(error => {
  console.error('❌ Calculation validation failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
