// lib/program-generator/workout-distribution/polarized.ts
// POLARIZED methodology workout distribution - Seiler 80/20 protocols

import {
  generatePolarizedWeekAdvanced,
  getSeilerInterval,
  getLSDSession,
  calculateSessionDistribution,
  type PolarizedPhase,
} from '@/lib/training-engine/methodologies/polarized'
import { selectReliableMarathonPace } from '../pace-validator'
import { validateEliteZones } from '../elite-pace-integration'
import { getCurrentFitnessPace, formatPace } from '../pace-progression'
import { WorkoutSlot, WorkoutDistributionParams } from './types'

export function distributePolarizedWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const { phase, trainingDays, weekInPhase, test, params: programParams, elitePaces, recentRaceResult } = params
  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using POLARIZED methodology (Seiler) for ${phase} phase, week ${weekInPhase}`)

  // === CALCULATE MARATHON PACE FOR DISTANCE CALCULATIONS ===
  let marathonPaceKmh = 12.0 // Default ~5:00/km

  // Try elite paces first
  if (elitePaces && validateEliteZones(elitePaces)) {
    marathonPaceKmh = elitePaces.canova?.marathon?.kmh || elitePaces.core?.marathon ?
      parseFloat(elitePaces.core.marathon.replace(/[^0-9.]/g, '')) || 12.0 : 12.0
    console.log(`[Polarized] Using elite pace: ${formatPace(marathonPaceKmh)}/km`)
  } else {
    // Try test-based or race-based pace
    let testPaceKmh: number | undefined
    let testPaceSource: string | undefined

    const paceValidation = selectReliableMarathonPace(
      test as any,
      programParams.goalType,
      programParams.targetRaceDate,
      recentRaceResult
    )
    testPaceKmh = paceValidation.marathonPaceKmh
    testPaceSource = paceValidation.source

    const currentFitness = getCurrentFitnessPace(
      programParams.recentRaceDistance,
      programParams.recentRaceTime,
      testPaceKmh,
      testPaceSource
    )

    marathonPaceKmh = currentFitness.marathonPaceKmh
    console.log(`[Polarized] Using ${currentFitness.source} pace: ${formatPace(marathonPaceKmh)}/km`)
  }

  // Map periodization phases to Polarized phases
  const polarizedPhase: PolarizedPhase =
    phase === 'BASE' || phase === 'BUILD' ? 'BASE' : 'SPECIFIC'

  console.log(`[Polarized] Mapped to Polarized phase: ${polarizedPhase}`)

  // Calculate session distribution (80/20 by SESSION COUNT)
  const sessionDist = calculateSessionDistribution(trainingDays)
  console.log(`[Polarized] Session distribution: ${sessionDist.distribution}`)
  if (sessionDist.warning) {
    console.log(`[Polarized] ⚠️  ${sessionDist.warning}`)
  }

  // Generate advanced Polarized week structure
  const polarizedSchedule = generatePolarizedWeekAdvanced(
    trainingDays,
    polarizedPhase,
    weekInPhase
  )

  console.log(`[Polarized] Generated ${polarizedSchedule.length} sessions`)

  // Convert Polarized schedule to WorkoutSlot format
  for (const session of polarizedSchedule) {
    if (session.type === 'LSD') {
      const lsdSession = session.session as ReturnType<typeof getLSDSession>
      // Calculate distance from duration at easy pace (~70% MP)
      const easyPaceKmh = marathonPaceKmh * 0.70
      const distance = Math.round((lsdSession.duration / 60) * easyPaceKmh * 10) / 10
      workouts.push({
        dayNumber: session.dayNumber,
        type: 'long',
        params: {
          distance,
          pacePercent: 70,
          marathonPace: marathonPaceKmh,
          description: lsdSession.description,
          hrDriftMonitoring: lsdSession.driftMonitoring,
          maxHRPercent: lsdSession.maxHeartRate
        }
      })
    } else if (session.type === 'SEILER_INTERVALS') {
      const intervalSession = session.session as ReturnType<typeof getSeilerInterval>

      if (intervalSession.type === '30_15') {
        // Rønnestad micro-intervals
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'intervals',
          params: {
            reps: 13,
            sets: 3,
            work: intervalSession.workDuration / 60,
            rest: intervalSession.restDuration / 60,
            setRest: 3,
            zone: 5,
            description: intervalSession.description,
            seilerProtocol: true
          }
        })
      } else if (intervalSession.type === 'HILL_REPEATS') {
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'intervals',
          params: {
            reps: intervalSession.reps,
            work: intervalSession.workDuration,
            rest: intervalSession.restDuration,
            zone: 5,
            description: intervalSession.description,
            hillRepeats: true,
            seilerProtocol: true
          }
        })
      } else {
        // Classic Seiler intervals (4×6, 4×7, 4×8, 5×8)
        workouts.push({
          dayNumber: session.dayNumber,
          type: 'intervals',
          params: {
            reps: intervalSession.reps,
            work: intervalSession.workDuration,
            rest: intervalSession.restDuration,
            zone: 5,
            description: intervalSession.description,
            intensity: intervalSession.intensity,
            seilerProtocol: true
          }
        })
      }
    } else if (session.type === 'SPECIFIC_TEMPO') {
      const tempoSession = session.session
      workouts.push({
        dayNumber: session.dayNumber,
        type: 'tempo',
        params: {
          duration: tempoSession.duration,
          pacePercent: 90, // Threshold pace ~90% MP
          marathonPace: marathonPaceKmh,
          description: tempoSession.description + ' (Canova integration in SPECIFIC phase)'
        }
      })
    } else if (session.type === 'EASY') {
      workouts.push({
        dayNumber: session.dayNumber,
        type: 'easy',
        params: {
          duration: session.session.duration,
          pacePercent: 75,
          marathonPace: marathonPaceKmh,
          description: session.session.description,
          maxHRPercent: 75
        }
      })
    } else if (session.type === 'RECOVERY') {
      workouts.push({
        dayNumber: session.dayNumber,
        type: 'easy', // Use easy builder for accurate distance
        params: {
          duration: session.session.duration,
          pacePercent: 70, // Recovery is slower
          marathonPace: marathonPaceKmh,
          description: session.session.description,
          maxHRPercent: 70
        }
      })
    }
  }

  // Add strength work for Polarized (not part of 80/20 calculation)
  if (trainingDays >= 5 && phase !== 'TAPER') {
    workouts.push({
      dayNumber: 3,
      type: 'strength',
      params: {
        focus: phase === 'BASE' ? 'full' : 'lower',
        description: 'Strength training (not counted in 80/20 distribution)'
      }
    })
  }

  console.log(`[Polarized] Generated ${workouts.length} workouts for ${polarizedPhase} phase`)
  return workouts
}
