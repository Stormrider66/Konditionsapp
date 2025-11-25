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
import { WorkoutSlot, WorkoutDistributionParams } from './types'

export function distributeNorwegianDoublesWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { phase, trainingDays, weekInPhase, test } = params
  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using NORWEGIAN DOUBLES methodology for ${phase} phase, week ${weekInPhase}`)
  console.log(`[Norwegian Doubles] Elite training: AM (2.0-3.0 mmol/L) + PM (3.0-4.0 mmol/L) sessions`)

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
      console.log(`[Norwegian Doubles] Calculated individualized intensity:`)
      console.log(`  AM (Low Zone 2): ${doublesIntensity.am.targetLactateLow.toFixed(1)}-${doublesIntensity.am.targetLactateHigh.toFixed(1)} mmol/L`)
      console.log(`  AM Pace: ${doublesIntensity.am.paceLow.toFixed(1)}-${doublesIntensity.am.paceHigh.toFixed(1)} ${doublesIntensity.unit}`)
      console.log(`  PM (High Zone 2): ${doublesIntensity.pm.targetLactateLow.toFixed(1)}-${doublesIntensity.pm.targetLactateHigh.toFixed(1)} mmol/L`)
      console.log(`  PM Pace: ${doublesIntensity.pm.paceLow.toFixed(1)}-${doublesIntensity.pm.paceHigh.toFixed(1)} ${doublesIntensity.unit}`)
    } catch (error) {
      console.warn('[Norwegian Doubles] Could not calculate individualized intensity, using zone-based approach:', error)
    }
  } else {
    console.warn('[Norwegian Doubles] No lactate test data available, using zone-based approach')
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

    console.log(`[Norwegian Doubles] ${dayNum === 2 ? 'Tuesday' : 'Thursday'} AM: ${amDetails.description}`)

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

    console.log(`[Norwegian Doubles] ${dayNum === 2 ? 'Tuesday' : 'Thursday'} PM: ${pmDetails.description}`)

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
      params: { duration: 40, sessionTime: 'AM' }
    })
    if (trainingDays >= 10) {
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: { duration: 40, sessionTime: 'PM' }
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
    params: { distance: 18 }
  })

  return workouts
}

export function distributeNorwegianSinglesWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { phase, trainingDays, weekInPhase, test } = params
  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using NORWEGIAN_SINGLE methodology for ${phase} phase, week ${weekInPhase}`)
  console.log(`[Norwegian Singles] SUB-threshold training at LT2 - 0.7 to 1.7 mmol/L`)

  // Calculate individualized Norwegian Singles intensity from lactate test
  let singlesIntensity: ReturnType<typeof calculateNorwegianSinglesIntensity> | null = null

  if (test.anaerobicThreshold && test.testStages && test.testStages.length > 0) {
    try {
      singlesIntensity = calculateNorwegianSinglesIntensity(
        test.testStages,
        {
          ...test.anaerobicThreshold,
          lactate: test.anaerobicThreshold.lactate || 4.0
        }
      )
      console.log(`[Norwegian Singles] Calculated individualized intensity:`)
      console.log(`  Target lactate: ${singlesIntensity.targetLactateLow.toFixed(1)}-${singlesIntensity.targetLactateHigh.toFixed(1)} mmol/L`)
      console.log(`  Training pace: ${singlesIntensity.paceLow.toFixed(1)}-${singlesIntensity.paceHigh.toFixed(1)} ${singlesIntensity.unit}`)
      console.log(`  Training HR: ${singlesIntensity.hrLow}-${singlesIntensity.hrHigh} bpm`)
    } catch (error) {
      console.warn('[Norwegian Singles] Could not calculate individualized intensity, using zone-based approach:', error)
    }
  } else {
    console.warn('[Norwegian Singles] No lactate test data available, using zone-based approach')
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

    console.log(`[Norwegian Singles] Session ${sessionNumber} (${['Tue', 'Thu', 'Sat'][i]}): ${sessionDetails.description}`)

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

  // Easy runs on remaining days
  const easyDays = [1, 3, 5]
  for (const dayNum of easyDays) {
    if (trainingDays >= dayNum) {
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: { duration: 45 }
      })
    }
  }

  // Long run on Sunday
  workouts.push({
    dayNumber: 7,
    type: 'long',
    params: { distance: 16 }
  })

  // Add minimal strength for Norwegian Single
  if (trainingDays >= 6 && phase === 'BASE') {
    workouts.push({ dayNumber: 6, type: 'core', params: {} })
  }

  return workouts
}
