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
import { selectReliableMarathonPace } from '../pace-validator'
import { validateEliteZones } from '../elite-pace-integration'
import { getCurrentFitnessPace, formatPace } from '../pace-progression'
import { WorkoutSlot, WorkoutDistributionParams } from './types'
import { logger } from '@/lib/logger'

export function distributePyramidalWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const {
    phase,
    trainingDays,
    weekInPhase,
    test,
    params: programParams,
    elitePaces,
    recentRaceResult
  } = params

  const workouts: WorkoutSlot[] = []

  logger.debug('[Workout Distribution] Using PYRAMIDAL methodology (Daniels/Pfitzinger/Lydiard)', { phase, weekInPhase })

  // === CALCULATE MARATHON PACE FOR DISTANCE CALCULATIONS ===
  let marathonPaceKmh = 12.0 // Default ~5:00/km

  // Try elite paces first
  if (elitePaces && validateEliteZones(elitePaces)) {
    marathonPaceKmh = elitePaces.canova?.marathon?.kmh || 12.0
    logger.debug('[Pyramidal] Using elite pace', { pace: formatPace(marathonPaceKmh), paceKmh: marathonPaceKmh })
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
    logger.debug('[Pyramidal] Using fitness-based pace', { source: currentFitness.source, pace: formatPace(marathonPaceKmh), paceKmh: marathonPaceKmh })
  }

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

  logger.debug('[Pyramidal] Phase and event mapping', { pyramidalPhase, pyramidalEvent })

  const weeklyMileage = trainingDays * 7
  const totalWeeks = programParams.durationWeeks
  const weeksToRace = Math.max(0, totalWeeks - weekInPhase)

  // Apply event-specific distribution adjustments
  const eventDistribution = calculateEventSpecificPyramid(
    pyramidalEvent,
    pyramidalPhase,
    weeksToRace
  )

  logger.debug('[Pyramidal] Zone distribution', {
    zone1Percent: eventDistribution.zone1Percent,
    zone2Percent: eventDistribution.zone2Percent,
    zone3Percent: eventDistribution.zone3Percent
  })

  // Check for special cases
  if (pyramidalEvent === '5K' && weeksToRace <= 4) {
    logger.debug('[Pyramidal] 5K POLARIZED SWITCH activated - Dropping Zone 2 work, maximizing VO2max sharpening', { weeksToRace })
  } else if (pyramidalEvent === 'MARATHON' && weeksToRace <= 8) {
    logger.debug('[Pyramidal] MARATHON Z3 LOCK activated - Removing all VO2max work to prevent glycogen wastage', { weeksToRace })
  }

  // === TUESDAY: THRESHOLD WORK (Key session) ===
  if (pyramidalPhase === 'STRENGTH' || pyramidalPhase === 'SHARPENING' || (pyramidalPhase as string) === 'MARATHON_SPECIFIC') {
    const useCruiseIntervals = weekInPhase % 2 === 0

    if (useCruiseIntervals) {
      const cruiseType = selectCruiseInterval(pyramidalPhase, weeklyMileage, weekInPhase)
      const cruiseSession = getCruiseIntervalSession(cruiseType, weeklyMileage)

      logger.debug('[Pyramidal] Tuesday cruise interval session', {
        description: cruiseSession.description,
        danielsRule: cruiseSession.danielsRule
      })

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

      logger.debug('[Pyramidal] Tuesday tempo session', {
        description: tempoSession.description,
        pfitzingerNote: tempoSession.pfitzingerNote
      })

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
      params: {
        duration: 45,
        pacePercent: 75,
        marathonPace: marathonPaceKmh
      }
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
      params: {
        duration: 40,
        pacePercent: 75,
        marathonPace: marathonPaceKmh
      }
    })
  }

  // === SATURDAY: ADVANCED THRESHOLD WORK (Optional) ===
  if (pyramidalEvent === 'MARATHON' && (pyramidalPhase as string) === 'MARATHON_SPECIFIC') {
    const advancedSession = getAdvancedThresholdSession('FATIGUED_THRESHOLD')
    logger.debug('[Pyramidal] Saturday advanced threshold session', {
      description: advancedSession.description,
      mechanism: advancedSession.mechanism
    })

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
      pacePercent: 70,
      marathonPace: marathonPaceKmh,
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
          pacePercent: 75,
          marathonPace: marathonPaceKmh,
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

  logger.debug('[Pyramidal] Generated workouts', { workoutCount: workouts.length, phase: pyramidalPhase })
  return workouts
}
