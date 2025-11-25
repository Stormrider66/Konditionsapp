// lib/program-generator/workout-distribution/canova.ts
// CANOVA methodology workout distribution - Elite marathon training

import {
  getCanovaSpecialBlock,
  getCanovaLongFastRun,
  getCanovaIntervals,
  selectCanovaWorkout,
  calculateCanovaZones,
  type CanovaPhase,
  type CanovaBlockType
} from '@/lib/training-engine/methodologies/canova'
import { selectReliableMarathonPace, formatPaceValidation } from '../pace-validator'
import { validateEliteZones } from '../elite-pace-integration'
import { WorkoutSlot, WorkoutDistributionParams } from './types'

export function distributeCanovaWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const {
    phase,
    trainingDays,
    athleteLevel,
    weekInPhase,
    test,
    params: programParams,
    elitePaces
  } = params

  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using CANOVA elite methodology for ${phase} phase, week ${weekInPhase}`)

  // Map periodization phases to Canova phases
  const canovaPhase: CanovaPhase =
    phase === 'BASE' && weekInPhase <= 4 ? 'GENERAL' :
    phase === 'BASE' ? 'FUNDAMENTAL' :
    phase === 'BUILD' ? 'SPECIAL' :
    phase === 'PEAK' ? 'SPECIFIC' :
    'TAPER'

  console.log(`[Canova] Mapped to Canova phase: ${canovaPhase}`)

  // === SMART MARATHON PACE SELECTION ===
  let marathonPaceKmh: number

  if (elitePaces && validateEliteZones(elitePaces)) {
    marathonPaceKmh = elitePaces.canova.marathon.kmh
    console.log(`[Canova] ✓ Using ELITE marathon pace: ${elitePaces.canova.marathon.pace} (${marathonPaceKmh.toFixed(1)} km/h)`)
    console.log(`[Canova]   Source: ${elitePaces.source} (${elitePaces.confidence} confidence)`)
    console.log(`[Canova]   Athlete Level: ${elitePaces.athleteLevel}`)
  } else {
    const paceValidation = selectReliableMarathonPace(
      test as any,
      programParams.goalType,
      programParams.targetRaceDate
    )
    marathonPaceKmh = paceValidation.marathonPaceKmh
    console.log(`[Canova] ${formatPaceValidation(paceValidation)}`)

    if (paceValidation.warnings.length > 0) {
      console.warn(`[Canova] ⚠️ VARNINGAR:`, paceValidation.warnings)
    }
    if (paceValidation.errors.length > 0) {
      console.error(`[Canova] 🚨 FEL:`, paceValidation.errors)
    }
  }

  const canovaZones = calculateCanovaZones(marathonPaceKmh)

  // === SPECIAL BLOCK DAYS (every 3-4 weeks in SPECIAL/SPECIFIC phases) ===
  const isBlockWeek = (canovaPhase === 'SPECIAL' && weekInPhase % 4 === 0) ||
                      (canovaPhase === 'SPECIFIC' && weekInPhase % 3 === 0)

  if (isBlockWeek && trainingDays >= 6) {
    return distributeSpecialBlockWeek(
      workouts,
      canovaPhase,
      athleteLevel,
      weekInPhase,
      marathonPaceKmh,
      programParams
    )
  }

  // === NORMAL WEEKS (non-block weeks) ===
  return distributeNormalCanovaWeek(
    workouts,
    canovaPhase,
    weekInPhase,
    marathonPaceKmh,
    trainingDays,
    programParams
  )
}

function distributeSpecialBlockWeek(
  workouts: WorkoutSlot[],
  canovaPhase: CanovaPhase,
  athleteLevel: string,
  weekInPhase: number,
  marathonPaceKmh: number,
  programParams: any
): WorkoutSlot[] {
  console.log(`[Canova] ⭐ SPECIAL BLOCK WEEK - Double workout day`)

  const blockType: CanovaBlockType =
    canovaPhase === 'SPECIFIC' ? 'MIXED' :
    athleteLevel === 'ELITE' && weekInPhase % 2 === 0 ? 'EXTENSIVE' :
    'INTENSIVE'

  const specialBlock = getCanovaSpecialBlock(blockType, athleteLevel === 'ELITE' ? 'ELITE' : 'ADVANCED')

  console.log(`[Canova] Block type: ${blockType}`)
  console.log(`[Canova] Total volume: ${specialBlock.totalDailyVolume}km`)
  console.log(`[Canova] Nutritional strategy: ${specialBlock.nutritionalStrategy}`)

  // === TUESDAY: SPECIAL BLOCK DAY (AM + PM sessions) ===
  workouts.push({
    dayNumber: 2,
    type: 'tempo',
    params: {
      description: specialBlock.amSession.description,
      distance: specialBlock.amSession.totalDistance,
      pacePercent: specialBlock.amSession.segments[0].pacePercent,
      marathonPace: marathonPaceKmh,
      sessionTime: 'AM',
      specialBlock: true
    }
  })

  workouts.push({
    dayNumber: 2,
    type: blockType === 'MIXED' ? 'intervals' : 'tempo',
    params: {
      description: specialBlock.pmSession.description,
      distance: specialBlock.pmSession.totalDistance,
      pacePercent: specialBlock.pmSession.segments[0].pacePercent,
      marathonPace: marathonPaceKmh,
      sessionTime: 'PM',
      specialBlock: true
    }
  })

  // === REGENERATION DAYS (after block) ===
  for (let day = 3; day <= 4; day++) {
    workouts.push({
      dayNumber: day,
      type: 'easy',
      params: {
        duration: 40,
        pacePercent: 55,
        description: 'Regeneration: Very slow recovery (50-60% MP)',
        regeneration: true
      }
    })
  }

  // === FRIDAY: Moderate quality ===
  const moderateIntervals = getCanovaIntervals('SPECIFIC_INTENSIVE', weekInPhase)
  workouts.push({
    dayNumber: 5,
    type: 'canovaIntervals',
    params: {
      reps: moderateIntervals.reps,
      workDistance: moderateIntervals.workDistance,
      pacePercent: moderateIntervals.workPacePercent,
      recoveryDistance: moderateIntervals.recoveryDistance,
      recoveryPacePercent: moderateIntervals.recoveryPacePercent,
      marathonPace: marathonPaceKmh
    }
  })

  // === SUNDAY: Long Fast Run ===
  const longRun = getCanovaLongFastRun(canovaPhase, 'CONTINUOUS')
  workouts.push({
    dayNumber: 7,
    type: 'long',
    params: {
      distance: longRun.totalDistance,
      pacePercent: longRun.segments[0].pacePercent,
      description: longRun.description,
      marathonPace: marathonPaceKmh
    }
  })

  return workouts
}

function distributeNormalCanovaWeek(
  workouts: WorkoutSlot[],
  canovaPhase: CanovaPhase,
  weekInPhase: number,
  marathonPaceKmh: number,
  trainingDays: number,
  programParams: any
): WorkoutSlot[] {
  // === TUESDAY: Quality session 1 ===
  const quality1Type = selectCanovaWorkout(canovaPhase, weekInPhase, 'QUALITY_1')

  if (quality1Type === 'SPECIFIC_EXTENSIVE') {
    const intervals = getCanovaIntervals('SPECIFIC_EXTENSIVE', weekInPhase)
    workouts.push({
      dayNumber: 2,
      type: 'canovaIntervals',
      params: {
        reps: intervals.reps,
        workDistance: intervals.workDistance,
        pacePercent: intervals.workPacePercent,
        recoveryDistance: intervals.recoveryDistance,
        recoveryPacePercent: intervals.recoveryPacePercent,
        marathonPace: marathonPaceKmh
      }
    })
  } else {
    workouts.push({
      dayNumber: 2,
      type: 'tempo',
      params: {
        duration: 30,
        pacePercent: canovaPhase === 'GENERAL' ? 80 : 90,
        description: `Fundamental run at ${canovaPhase === 'GENERAL' ? '80' : '90'}% MP`,
        marathonPace: marathonPaceKmh
      }
    })
  }

  // === THURSDAY: Quality session 2 ===
  const quality2Type = selectCanovaWorkout(canovaPhase, weekInPhase, 'QUALITY_2')

  if (quality2Type === 'SPECIFIC_INTENSIVE') {
    const intervals = getCanovaIntervals('SPECIFIC_INTENSIVE', weekInPhase)
    workouts.push({
      dayNumber: 4,
      type: 'canovaIntervals',
      params: {
        reps: intervals.reps,
        workDistance: intervals.workDistance,
        pacePercent: intervals.workPacePercent,
        recoveryDistance: intervals.recoveryDistance,
        recoveryPacePercent: intervals.recoveryPacePercent,
        marathonPace: marathonPaceKmh
      }
    })
  } else if (quality2Type === 'HILL_SPRINTS') {
    workouts.push({
      dayNumber: 4,
      type: 'hillSprints',
      params: {
        reps: 8,
        workSeconds: 35,
        rest: 3,
        description: 'Backsprints: Maximal ansträngning uppför backe',
      }
    })
  } else {
    workouts.push({
      dayNumber: 4,
      type: 'easy',
      params: {
        duration: 45,
        pacePercent: 80,
        description: 'General aerobic run',
        marathonPace: marathonPaceKmh
      }
    })
  }

  // === SUNDAY: Long Fast Run (Phase-specific) ===
  const longRunType = selectCanovaWorkout(canovaPhase, weekInPhase, 'LONG')
  const longRunStyle: 'CONTINUOUS' | 'PROGRESSIVE' | 'ALTERNATING' =
    longRunType === 'LONG_PROGRESSIVE' ? 'PROGRESSIVE' :
    longRunType === 'LONG_ALTERNATING' || longRunType === 'SPECIFIC_LONG_RUN' ? 'ALTERNATING' :
    'CONTINUOUS'

  const longRun = getCanovaLongFastRun(canovaPhase, longRunStyle)

  if (longRun.type === 'PROGRESSIVE') {
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRun.totalDistance,
        progressive: true,
        segments: longRun.segments.map(seg => ({
          distance: seg.distance,
          pacePercent: seg.pacePercent
        })),
        description: longRun.description,
        marathonPace: marathonPaceKmh
      }
    })
  } else if (longRun.type === 'ALTERNATING') {
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRun.totalDistance,
        alternating: true,
        fastPacePercent: 103,
        slowPacePercent: 90,
        description: longRun.description + ' (no stopping!)',
        marathonPace: marathonPaceKmh
      }
    })
  } else {
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRun.totalDistance,
        pacePercent: longRun.segments[0].pacePercent,
        description: longRun.description,
        marathonPace: marathonPaceKmh
      }
    })
  }

  // === EASY DAYS ===
  const runningSessionsNeeded = (programParams.runningSessionsPerWeek || trainingDays) -
    workouts.filter(w => w.type !== 'strength' && w.type !== 'core').length
  const availableDays = [1, 3, 5, 6]

  let addedSessions = 0
  for (const dayNum of availableDays) {
    if (addedSessions >= runningSessionsNeeded) break
    if (!workouts.some(w => w.dayNumber === dayNum)) {
      workouts.push({
        dayNumber: dayNum,
        type: 'easy',
        params: {
          duration: 40,
          pacePercent: 75,
          description: 'Easy aerobic run',
          marathonPace: marathonPaceKmh
        }
      })
      addedSessions++
    }
  }

  // === STRENGTH SESSIONS ===
  addStrengthSessions(workouts, canovaPhase, programParams)

  // === CORE SESSIONS ===
  addCoreSessions(workouts, programParams)

  console.log(`[Canova] Generated ${workouts.length} workouts for ${canovaPhase} phase`)
  return workouts
}

function addStrengthSessions(
  workouts: WorkoutSlot[],
  canovaPhase: CanovaPhase,
  programParams: any
): void {
  const strengthSessionsNeeded = programParams.strengthSessionsPerWeek || 0
  if (strengthSessionsNeeded <= 0) return

  if (programParams.scheduleStrengthAfterRunning) {
    const runningDays = workouts
      .filter(w => w.type !== 'strength' && w.type !== 'core')
      .map(w => w.dayNumber)
      .sort()

    for (let i = 0; i < Math.min(strengthSessionsNeeded, runningDays.length); i++) {
      workouts.push({
        dayNumber: runningDays[i],
        type: 'strength',
        params: {
          focus: canovaPhase === 'GENERAL' || canovaPhase === 'FUNDAMENTAL' ? 'circuit' : 'maintenance',
          description: 'Strength training (PM session after running)',
          pmSession: true
        }
      })
    }
  } else {
    const strengthDays = [6, 5]
    for (let i = 0; i < Math.min(strengthSessionsNeeded, strengthDays.length); i++) {
      if (!workouts.some(w => w.dayNumber === strengthDays[i] && w.type === 'strength')) {
        workouts.push({
          dayNumber: strengthDays[i],
          type: 'strength',
          params: {
            focus: canovaPhase === 'GENERAL' || canovaPhase === 'FUNDAMENTAL' ? 'circuit' : 'maintenance',
            description: 'Strength training (standalone session)'
          }
        })
      }
    }
  }
}

function addCoreSessions(workouts: WorkoutSlot[], programParams: any): void {
  const coreSessionsNeeded = programParams.coreSessionsPerWeek || 0
  if (coreSessionsNeeded <= 0) return

  if (programParams.scheduleCoreAfterRunning) {
    const runningDays = workouts
      .filter(w => w.type !== 'strength' && w.type !== 'core')
      .map(w => w.dayNumber)
      .sort()

    let addedCore = 0
    for (const dayNum of runningDays) {
      if (addedCore >= coreSessionsNeeded) break
      if (!workouts.some(w => w.dayNumber === dayNum && w.type === 'strength' && w.params?.pmSession)) {
        workouts.push({
          dayNumber: dayNum,
          type: 'core',
          params: {
            duration: 20,
            description: 'Core training (PM session after running)',
            pmSession: true
          }
        })
        addedCore++
      }
    }
  } else {
    const coreDays = [3, 5]
    for (let i = 0; i < Math.min(coreSessionsNeeded, coreDays.length); i++) {
      if (!workouts.some(w => w.dayNumber === coreDays[i] && w.type === 'core')) {
        workouts.push({
          dayNumber: coreDays[i],
          type: 'core',
          params: {
            duration: 20,
            description: 'Core training (standalone session)'
          }
        })
      }
    }
  }
}
