// lib/program-generator/workout-distribution/norwegian.ts
// NORWEGIAN methodology workout distribution - Double threshold (AM/PM) and Singles

import {
  selectNorwegianDoublesSession,
  getNorwegianDoublesSession,
  calculateNorwegianDoublesIntensity,
  selectNorwegianSinglesSessionType,
  getNorwegianSinglesSession,
  calculateNorwegianSinglesIntensity
} from '@/lib/training-engine/methodologies/norwegian'
import { selectReliableMarathonPace } from '../pace-validator'
import { validateEliteZones } from '../elite-pace-integration'
import { getCurrentFitnessPace, formatPace } from '../pace-progression'
import { WorkoutSlot, WorkoutDistributionParams } from './types'
import { logger } from '@/lib/logger'

/**
 * Calculate marathon pace from available data sources
 */
function calculateMarathonPaceForNorwegian(params: WorkoutDistributionParams): number {
  const { test, params: programParams, elitePaces, recentRaceResult } = params
  let marathonPaceKmh = 12.0 // Default ~5:00/km

  // Try elite paces first
  if (elitePaces && validateEliteZones(elitePaces)) {
    marathonPaceKmh = elitePaces.canova?.marathon?.kmh || 12.0
    logger.debug('[Norwegian] Using elite pace', { pace: formatPace(marathonPaceKmh) })
  } else {
    // Try test-based or race-based pace
    const paceValidation = selectReliableMarathonPace(
      test as any,
      programParams.goalType,
      programParams.targetRaceDate,
      recentRaceResult
    )

    const currentFitness = getCurrentFitnessPace(
      programParams.recentRaceDistance,
      programParams.recentRaceTime,
      paceValidation.marathonPaceKmh,
      paceValidation.source
    )

    marathonPaceKmh = currentFitness.marathonPaceKmh
    logger.debug('[Norwegian] Using calculated pace', { source: currentFitness.source, pace: formatPace(marathonPaceKmh) })
  }

  return marathonPaceKmh
}

export function distributeNorwegianDoublesWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { phase, trainingDays, weekInPhase, test } = params
  const workouts: WorkoutSlot[] = []

  logger.debug('[Norwegian Doubles] Distributing workouts', {
    methodology: 'NORWEGIAN DOUBLES',
    phase,
    weekInPhase,
    description: 'Elite training: AM (2.0-3.0 mmol/L) + PM (3.0-4.0 mmol/L) sessions'
  })

  // Calculate marathon pace for distance calculations
  const marathonPaceKmh = calculateMarathonPaceForNorwegian(params)

  // Calculate individualized Norwegian Doubles intensity from lactate test
  let doublesIntensity: ReturnType<typeof calculateNorwegianDoublesIntensity> | null = null

  if (test.anaerobicThreshold && test.testStages && test.testStages.length > 0) {
    try {
      doublesIntensity = calculateNorwegianDoublesIntensity(
        test.testStages,
        {
          ...test.anaerobicThreshold,
          lactate: test.anaerobicThreshold.lactate || 4.0
        }
      )
      logger.debug('[Norwegian Doubles] Calculated individualized intensity', {
        am: {
          zone: 'Low Zone 2',
          lactateMmolL: `${doublesIntensity.am.targetLactateLow.toFixed(1)}-${doublesIntensity.am.targetLactateHigh.toFixed(1)}`,
          pace: `${doublesIntensity.am.paceLow.toFixed(1)}-${doublesIntensity.am.paceHigh.toFixed(1)}`,
          unit: doublesIntensity.unit
        },
        pm: {
          zone: 'High Zone 2',
          lactateMmolL: `${doublesIntensity.pm.targetLactateLow.toFixed(1)}-${doublesIntensity.pm.targetLactateHigh.toFixed(1)}`,
          pace: `${doublesIntensity.pm.paceLow.toFixed(1)}-${doublesIntensity.pm.paceHigh.toFixed(1)}`,
          unit: doublesIntensity.unit
        }
      })
    } catch (error) {
      logger.warn('[Norwegian Doubles] Could not calculate individualized intensity, using zone-based approach', {}, error)
    }
  } else {
    logger.warn('[Norwegian Doubles] No lactate test data available, using zone-based approach')
  }

  // Norwegian Doubles: Tuesday and Thursday are double-threshold days
  const doubleThresholdDays = [2, 4]

  for (const dayNum of doubleThresholdDays) {
    // === AM SESSION (Low Zone 2: 2.0-3.0 mmol/L) ===
    const amSessionType = selectNorwegianDoublesSession(
      phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
      weekInPhase,
      'AM'
    )
    const amDetails = getNorwegianDoublesSession(amSessionType)

    logger.debug('[Norwegian Doubles] AM session scheduled', {
      day: dayNum === 2 ? 'Tuesday' : 'Thursday',
      description: amDetails.description
    })

    const amParams: any = {
      reps: amDetails.reps,
      work: amDetails.workType === 'distance'
        ? amDetails.work * 1000 / 200
        : amDetails.work,
      rest: amDetails.rest / 60,
      zone: 3,
      description: amDetails.description,
      workType: amDetails.workType,
      sessionTime: 'AM'
    }

    if (doublesIntensity) {
      amParams.targetPace = doublesIntensity.am.paceHigh
      amParams.targetHR = doublesIntensity.am.hrHigh
      amParams.targetLactate = amDetails.targetLactate
    }

    workouts.push({
      dayNumber: dayNum,
      type: 'intervals',
      params: amParams
    })

    // === PM SESSION (High Zone 2: 3.0-4.0 mmol/L) ===
    const pmSessionType = selectNorwegianDoublesSession(
      phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
      weekInPhase,
      'PM'
    )
    const pmDetails = getNorwegianDoublesSession(pmSessionType)

    logger.debug('[Norwegian Doubles] PM session scheduled', {
      day: dayNum === 2 ? 'Tuesday' : 'Thursday',
      description: pmDetails.description
    })

    const pmParams: any = {
      reps: pmDetails.reps,
      work: pmDetails.workType === 'distance'
        ? pmDetails.work * 1000 / 200
        : pmDetails.work,
      rest: pmDetails.rest / 60,
      zone: 4,
      description: pmDetails.description,
      workType: pmDetails.workType,
      sessionTime: 'PM'
    }

    if (doublesIntensity) {
      pmParams.targetPace = doublesIntensity.pm.paceHigh
      pmParams.targetHR = doublesIntensity.pm.hrHigh
      pmParams.targetLactate = pmDetails.targetLactate
    }

    workouts.push({
      dayNumber: dayNum,
      type: 'intervals',
      params: pmParams
    })
  }

  // Easy days: Monday, Wednesday, Friday (often double easy runs)
  const easyDays = [1, 3, 5]
  for (const dayNum of easyDays) {
    workouts.push({
      dayNumber: dayNum,
      type: 'easy',
      params: {
        duration: 40,
        pacePercent: 75,
        marathonPace: marathonPaceKmh,
        sessionTime: 'AM'
      }
    })
    if (trainingDays >= 10) {
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: {
          duration: 40,
          pacePercent: 75,
          marathonPace: marathonPaceKmh,
          sessionTime: 'PM'
        }
      })
    }
  }

  // Saturday: Zone 4 HIT session
  workouts.push({
    dayNumber: 6,
    type: 'intervals',
    params: {
      reps: 20,
      work: 0.2,
      rest: 2,
      zone: 5,
      description: 'Zone 4 HIT: 20 × 200m hills (>6.0 mmol/L)'
    }
  })

  // Sunday: Long easy run
  workouts.push({
    dayNumber: 7,
    type: 'long',
    params: {
      distance: 18,
      pacePercent: 75,
      marathonPace: marathonPaceKmh,
      description: 'Long easy run at Green zone pace'
    }
  })

  return workouts
}

export function distributeNorwegianSinglesWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { phase, trainingDays, weekInPhase, test } = params
  const workouts: WorkoutSlot[] = []

  logger.debug('[Norwegian Singles] Distributing workouts', {
    methodology: 'NORWEGIAN_SINGLE',
    phase,
    weekInPhase,
    trainingDays,
    description: 'SUB-threshold training at LT2 - 0.7 to 1.7 mmol/L'
  })

  // Calculate marathon pace for distance calculations
  const marathonPaceKmh = calculateMarathonPaceForNorwegian(params)

  // Calculate individualized Norwegian Singles intensity from lactate test
  let singlesIntensity: ReturnType<typeof calculateNorwegianSinglesIntensity> | null = null

  // Only try to calculate intensity if we have valid test data
  if (test && test.anaerobicThreshold && test.testStages && test.testStages.length > 0) {
    try {
      singlesIntensity = calculateNorwegianSinglesIntensity(
        test.testStages,
        {
          ...test.anaerobicThreshold,
          lactate: test.anaerobicThreshold.lactate || 4.0
        }
      )
      logger.debug('[Norwegian Singles] Calculated individualized intensity', {
        targetLactateMmolL: `${singlesIntensity.targetLactateLow.toFixed(1)}-${singlesIntensity.targetLactateHigh.toFixed(1)}`,
        pace: `${singlesIntensity.paceLow.toFixed(1)}-${singlesIntensity.paceHigh.toFixed(1)}`,
        unit: singlesIntensity.unit,
        hrBpm: `${singlesIntensity.hrLow}-${singlesIntensity.hrHigh}`
      })
    } catch (error) {
      logger.warn('[Norwegian Singles] Could not calculate individualized intensity, using zone-based approach', {}, error)
    }
  } else {
    logger.warn('[Norwegian Singles] No lactate test data available, using zone-based approach')
  }

  // Norwegian Singles uses 2-3 quality sessions per week
  const qualitySessions = trainingDays >= 6 ? 3 : 2
  let sessionNumber: 1 | 2 | 3 = 1
  const qualityDays = [2, 4, 6]

  for (let i = 0; i < qualitySessions; i++) {
    const dayNum = qualityDays[i]

    const sessionType = selectNorwegianSinglesSessionType(
      phase as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
      weekInPhase,
      sessionNumber as 1 | 2 | 3
    )
    const sessionDetails = getNorwegianSinglesSession(sessionType)

    logger.debug('[Norwegian Singles] Quality session scheduled', {
      sessionNumber,
      day: ['Tue', 'Thu', 'Sat'][i],
      description: sessionDetails.description
    })

    const workoutParams: any = {
      reps: sessionDetails.reps,
      work: sessionDetails.workType === 'distance'
        ? sessionDetails.work * 1000 / 200
        : sessionDetails.work,
      rest: sessionDetails.rest / 60,
      zone: 3,
      description: sessionDetails.description,
      workType: sessionDetails.workType
    }

    if (singlesIntensity) {
      workoutParams.targetPace = singlesIntensity.paceHigh
      workoutParams.targetHR = singlesIntensity.hrHigh
      workoutParams.targetLactate = `${singlesIntensity.targetLactateLow.toFixed(1)}-${singlesIntensity.targetLactateHigh.toFixed(1)} mmol/L`
    }

    workouts.push({
      dayNumber: dayNum,
      type: 'intervals',
      params: workoutParams
    })

    sessionNumber++
  }

  // Easy runs on remaining days (Mon, Wed, Fri)
  // Number of easy days depends on total training days minus quality sessions minus long run
  const easyDays = [1, 3, 5]
  const numEasyDays = Math.max(0, trainingDays - qualitySessions - 1) // -1 for long run

  for (let i = 0; i < Math.min(numEasyDays, easyDays.length); i++) {
    const dayNum = easyDays[i]
    workouts.push({
      dayNumber: dayNum,
      type: 'easy',
      params: {
        duration: 45,
        pacePercent: 75,
        marathonPace: marathonPaceKmh
      }
    })
  }

  // Long run on Sunday
  workouts.push({
    dayNumber: 7,
    type: 'long',
    params: {
      distance: 16,
      pacePercent: 75,
      marathonPace: marathonPaceKmh,
      description: 'Long easy run'
    }
  })

  // Add minimal strength for Norwegian Single
  if (trainingDays >= 6 && phase === 'BASE') {
    workouts.push({ dayNumber: 6, type: 'core', params: {} })
  }

  return workouts
}
