// lib/program-generator/workout-distribution/pyramidal.ts
// PYRAMIDAL methodology workout distribution - Daniels/Pfitzinger/Lydiard integration

import {
  getCruiseIntervalSession,
  getContinuousTempoSession,
  getAdvancedThresholdSession,
  calculateEventSpecificPyramid,
  selectCruiseInterval,
  selectContinuousTempo,
  type PyramidalPhase,
  type PyramidalEventType,
} from '@/lib/training-engine/methodologies/pyramidal'
import { WorkoutSlot, WorkoutDistributionParams } from './types'

export function distributePyramidalWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const {
    phase,
    trainingDays,
    weekInPhase,
    params: programParams
  } = params

  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using PYRAMIDAL methodology (Daniels/Pfitzinger/Lydiard) for ${phase} phase, week ${weekInPhase}`)

  // Map periodization phases to Pyramidal (Lydiard) phases
  const pyramidalPhase: PyramidalPhase =
    phase === 'BASE' && weekInPhase <= 4 ? 'BASE' :
    phase === 'BASE' ? 'STRENGTH' :
    phase === 'BUILD' ? 'SHARPENING' :
    phase === 'PEAK' ? 'COORDINATION' :
    'COORDINATION'

  // Map goal type to event type
  const pyramidalEvent: PyramidalEventType =
    programParams.goalType === 'marathon' ? 'MARATHON' :
    programParams.goalType === '5k' ? '5K' :
    programParams.goalType === '10k' ? '10K' :
    'HALF_MARATHON'

  console.log(`[Pyramidal] Mapped to Pyramidal phase: ${pyramidalPhase}`)
  console.log(`[Pyramidal] Event type: ${pyramidalEvent}`)

  const weeklyMileage = trainingDays * 7
  const totalWeeks = programParams.durationWeeks
  const weeksToRace = Math.max(0, totalWeeks - weekInPhase)

  // Apply event-specific distribution adjustments
  const eventDistribution = calculateEventSpecificPyramid(
    pyramidalEvent,
    pyramidalPhase,
    weeksToRace
  )

  console.log(`[Pyramidal] Zone distribution: Z1=${eventDistribution.zone1Percent}%, Z2=${eventDistribution.zone2Percent}%, Z3=${eventDistribution.zone3Percent}%`)

  // Check for special cases
  if (pyramidalEvent === '5K' && weeksToRace <= 4) {
    console.log(`[Pyramidal] ⚡ 5K POLARIZED SWITCH activated (${weeksToRace} weeks to race)`)
    console.log(`[Pyramidal] Dropping Zone 2 work, maximizing VO2max sharpening`)
  } else if (pyramidalEvent === 'MARATHON' && weeksToRace <= 8) {
    console.log(`[Pyramidal] 🔒 MARATHON Z3 LOCK activated (${weeksToRace} weeks to race)`)
    console.log(`[Pyramidal] Removing all VO2max work to prevent glycogen wastage`)
  }

  // === TUESDAY: THRESHOLD WORK (Key session) ===
  if (pyramidalPhase === 'STRENGTH' || pyramidalPhase === 'SHARPENING' || (pyramidalPhase as string) === 'MARATHON_SPECIFIC') {
    const useCruiseIntervals = weekInPhase % 2 === 0

    if (useCruiseIntervals) {
      const cruiseType = selectCruiseInterval(pyramidalPhase, weeklyMileage, weekInPhase)
      const cruiseSession = getCruiseIntervalSession(cruiseType, weeklyMileage)

      console.log(`[Pyramidal] Tuesday: ${cruiseSession.description}`)
      console.log(`[Pyramidal] ${cruiseSession.danielsRule}`)

      workouts.push({
        dayNumber: 2,
        type: 'intervals',
        params: {
          reps: cruiseSession.reps,
          work: cruiseSession.workDistance,
          rest: cruiseSession.restDuration / 60,
          zone: 4,
          description: cruiseSession.description,
          danielsProtocol: true,
          targetPace: 'T_PACE'
        }
      })
    } else {
      const tempoType = selectContinuousTempo(pyramidalPhase, pyramidalEvent, weekInPhase)
      const tempoSession = getContinuousTempoSession(tempoType)

      console.log(`[Pyramidal] Tuesday: ${tempoSession.description}`)
      console.log(`[Pyramidal] ${tempoSession.pfitzingerNote}`)

      workouts.push({
        dayNumber: 2,
        type: 'tempo',
        params: {
          duration: tempoSession.duration,
          zone: 4,
          description: tempoSession.description,
          pfitzingerProtocol: true,
          targetPace: tempoSession.targetPace
        }
      })
    }
  } else {
    workouts.push({
      dayNumber: 2,
      type: 'easy',
      params: { duration: 45 }
    })
  }

  // === THURSDAY: INTERVALS OR SECOND QUALITY ===
  if (eventDistribution.zone3Percent > 0) {
    if (pyramidalPhase === 'SHARPENING' || (pyramidalEvent === '5K' && weeksToRace <= 4)) {
      workouts.push({
        dayNumber: 4,
        type: 'intervals',
        params: {
          reps: 5,
          work: 3,
          rest: 2,
          zone: 5,
          description: 'Classic VO2max: 5 × 3 min @ 5K pace'
        }
      })
    } else {
      workouts.push({
        dayNumber: 4,
        type: 'intervals',
        params: {
          reps: 4,
          work: 5,
          rest: 2,
          zone: 4,
          description: 'Threshold intervals'
        }
      })
    }
  } else if (eventDistribution.zone2Percent > 0) {
    const tempoSession = getContinuousTempoSession('CT_20MIN')
    workouts.push({
      dayNumber: 4,
      type: 'tempo',
      params: {
        duration: tempoSession.duration,
        zone: 4,
        description: 'Second threshold session (marathon-specific)'
      }
    })
  } else {
    workouts.push({
      dayNumber: 4,
      type: 'easy',
      params: { duration: 40 }
    })
  }

  // === SATURDAY: ADVANCED THRESHOLD WORK (Optional) ===
  if (pyramidalEvent === 'MARATHON' && (pyramidalPhase as string) === 'MARATHON_SPECIFIC') {
    const advancedSession = getAdvancedThresholdSession('FATIGUED_THRESHOLD')
    console.log(`[Pyramidal] Saturday: ${advancedSession.description}`)
    console.log(`[Pyramidal] Mechanism: ${advancedSession.mechanism}`)

    workouts.push({
      dayNumber: 6,
      type: 'tempo',
      params: {
        description: advancedSession.description,
        structure: advancedSession.structure,
        fatigued: true,
        zone: 4
      }
    })
  } else if (trainingDays >= 6 && pyramidalPhase === 'STRENGTH') {
    workouts.push({
      dayNumber: 6,
      type: 'intervals',
      params: {
        reps: 8,
        work: 0.5,
        rest: 3,
        zone: 5,
        description: 'Hill repeats: 8 × 30s max effort uphill'
      }
    })
  }

  // === SUNDAY: LONG RUN ===
  const longRunDistance = phase === 'TAPER' ? 12 :
                         phase === 'PEAK' && pyramidalEvent === 'MARATHON' ? 20 :
                         phase === 'PEAK' ? 16 :
                         15

  workouts.push({
    dayNumber: 7,
    type: 'long',
    params: {
      distance: longRunDistance,
      description: 'Long Slow Distance - strict Zone 1'
    }
  })

  // === EASY DAYS: Monday, Wednesday, Friday ===
  const easyDays = [1, 3, 5]
  for (const dayNum of easyDays) {
    if (trainingDays >= dayNum && !workouts.some(w => w.dayNumber === dayNum)) {
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: {
          duration: 40,
          description: 'General Aerobic - conversational pace'
        }
      })
    }
  }

  // === STRENGTH WORK (Optional, BASE/STRENGTH phases) ===
  if (trainingDays >= 6 && (pyramidalPhase === 'BASE' || pyramidalPhase === 'STRENGTH')) {
    workouts.push({
      dayNumber: 3,
      type: 'strength',
      params: {
        focus: pyramidalPhase === 'BASE' ? 'full' : 'lower',
        description: 'Strength training (Lydiard general strength)'
      }
    })
  }

  console.log(`[Pyramidal] Generated ${workouts.length} workouts for ${pyramidalPhase} phase`)
  return workouts
}
