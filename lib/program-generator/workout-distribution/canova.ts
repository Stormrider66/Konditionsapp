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
import { selectReliableMarathonPace, formatPaceValidation, type RaceResultForPace } from '../pace-validator'
import { validateEliteZones } from '../elite-pace-integration'
import { calculateProgressivePace, formatPace, parseGoalTime, getCurrentFitnessPace, type ProgressivePaces } from '../pace-progression'
import { WorkoutSlot, WorkoutDistributionParams } from './types'

export function distributeCanovaWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const {
    phase,
    trainingDays,
    athleteLevel,
    weekInPhase,
    weekNumber,
    totalWeeks,
    test,
    params: programParams,
    elitePaces,
    recentRaceResult,
    progressivePaces: preCalculatedPaces
  } = params

  const workouts: WorkoutSlot[] = []

  console.log(`[Workout Distribution] Using CANOVA elite methodology for ${phase} phase, week ${weekInPhase}`)
  console.log(`[Canova] Program week ${weekNumber}/${totalWeeks}`)

  // Map periodization phases to Canova phases
  const canovaPhase: CanovaPhase =
    phase === 'BASE' && weekInPhase <= 4 ? 'GENERAL' :
    phase === 'BASE' ? 'FUNDAMENTAL' :
    phase === 'BUILD' ? 'SPECIAL' :
    phase === 'PEAK' ? 'SPECIFIC' :
    'TAPER'

  console.log(`[Canova] Mapped to Canova phase: ${canovaPhase}`)

  // === PROGRESSIVE MARATHON PACE CALCULATION ===
  // Per Canova: "Current Fitness: 10k/HM PRs used to calculate baseline"
  let marathonPaceKmh: number
  let progressivePaces: ProgressivePaces | null = null

  // First, get CURRENT fitness pace using the new prioritized function
  // Priority: Race result > D-max test > Other test > Default
  let currentPaceKmh: number
  let currentFitnessSource: string

  // Get test-based pace as fallback
  let testPaceKmh: number | undefined
  let testPaceSource: string | undefined

  if (elitePaces && validateEliteZones(elitePaces)) {
    testPaceKmh = elitePaces.canova.marathon.kmh
    testPaceSource = 'ELITE_PACES'
  } else {
    const paceValidation = selectReliableMarathonPace(
      test as any,
      programParams.goalType,
      programParams.targetRaceDate,
      recentRaceResult
    )
    testPaceKmh = paceValidation.marathonPaceKmh
    testPaceSource = paceValidation.source

    if (paceValidation.warnings.length > 0) {
      console.warn(`[Canova] ⚠️ Test pace warnings:`, paceValidation.warnings)
    }
  }

  // Use getCurrentFitnessPace which prioritizes race results
  const currentFitness = getCurrentFitnessPace(
    programParams.recentRaceDistance,
    programParams.recentRaceTime,
    testPaceKmh,
    testPaceSource
  )

  currentPaceKmh = currentFitness.marathonPaceKmh
  currentFitnessSource = currentFitness.source

  console.log(`[Canova] ✓ Current fitness (${currentFitness.source}, ${currentFitness.confidence} confidence): ${formatPace(currentPaceKmh)}/km (${currentPaceKmh.toFixed(1)} km/h)`)

  // Second, get TARGET pace from goal time
  let targetPaceKmh: number | null = null

  if (programParams.targetTime) {
    targetPaceKmh = parseGoalTime(programParams.targetTime, programParams.goalType)
    if (targetPaceKmh) {
      console.log(`[Canova] ✓ Target pace (${programParams.targetTime}): ${formatPace(targetPaceKmh)}/km (${targetPaceKmh.toFixed(1)} km/h)`)
    }
  }

  // Use pre-calculated progressive paces if available, otherwise calculate
  if (preCalculatedPaces) {
    progressivePaces = preCalculatedPaces
    marathonPaceKmh = preCalculatedPaces.marathonPaceKmh
  } else if (targetPaceKmh && targetPaceKmh > currentPaceKmh) {
    // Calculate progressive pace for this week
    progressivePaces = calculateProgressivePace({
      currentMarathonPaceKmh: currentPaceKmh,
      targetMarathonPaceKmh: targetPaceKmh,
      weekNumber: weekNumber || 1,
      totalWeeks: totalWeeks || 16,
      phase,
      weekInPhase
    })
    marathonPaceKmh = progressivePaces.marathonPaceKmh

    console.log(`[Canova] ✓ PROGRESSIVE pace for week ${weekNumber}: ${progressivePaces.marathonPaceMinKm}/km`)
    console.log(`[Canova]   Progression: ${progressivePaces.progressionPercent.toFixed(0)}% toward target`)
  } else {
    // No target or target is slower than current - use current fitness
    marathonPaceKmh = currentPaceKmh
    console.log(`[Canova] Using current fitness pace: ${formatPace(marathonPaceKmh)}/km`)
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
    programParams,
    weekNumber || 1,
    totalWeeks || 16
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

/**
 * Calculate progressive race pace volume for Canova methodology
 *
 * The key Canova insight: Volume at race pace increases CONTINUOUSLY throughout
 * the entire program - not just in PEAK phase. This is the "funnel" concept.
 *
 * BASE phase: Introduce 10-25 min of MP work (progressive long run finishes)
 * BUILD phase: 20-45 min of MP work (intervals + progressive long runs)
 * PEAK phase: 45-90 min of MP work (long intervals + specific long runs)
 *
 * @param weekNumber - Overall program week (1-based)
 * @param totalWeeks - Total program weeks
 * @param canovaPhase - Current Canova phase
 * @param weekInPhase - Week within current phase
 */
function calculateProgressiveRacePaceVolume(
  weekNumber: number,
  totalWeeks: number,
  canovaPhase: CanovaPhase,
  weekInPhase: number
): {
  tempoAtMPMinutes: number      // Minutes of tempo work at 98-100% MP
  longRunMPFinishKm: number     // Km at MP pace at end of long run
  intervalVolumeFactor: number  // Multiplier for interval volume (0.5 = start small)
  pacePercentBase: number       // Base pace percent (progresses toward 100%)
} {
  // Calculate overall progression (0-1)
  const overallProgress = weekNumber / totalWeeks

  switch (canovaPhase) {
    case 'GENERAL':
      // Very early: Build structure, minimal MP work
      // Progressive long run finish: 2-3km at 90% MP
      return {
        tempoAtMPMinutes: 0,
        longRunMPFinishKm: 2 + weekInPhase,  // 2km → 4km
        intervalVolumeFactor: 0,
        pacePercentBase: 85 + (weekInPhase * 2)  // 85% → 93%
      }

    case 'FUNDAMENTAL':
      // Building aerobic house: Introduce MP touches
      // Long run finish: 4-8km at 92-95% MP
      // Tempo: Last 10-15 min at 95% MP
      return {
        tempoAtMPMinutes: 10 + (weekInPhase * 2),  // 10min → 22min
        longRunMPFinishKm: 4 + weekInPhase,        // 4km → 10km
        intervalVolumeFactor: 0.3 + (weekInPhase * 0.1),  // 0.3 → 0.9
        pacePercentBase: 90 + (weekInPhase * 1.5)  // 90% → 99%
      }

    case 'SPECIAL':
      // Special period: Significant MP work with smooth transition
      // Long run: Progressive or alternating with 8-12km at MP
      // Intervals: Start at 98% MP, progress to 100%
      return {
        tempoAtMPMinutes: 20 + (weekInPhase * 3),  // 20min → 44min
        longRunMPFinishKm: 8 + weekInPhase,        // 8km → 16km
        intervalVolumeFactor: 0.7 + (weekInPhase * 0.05),  // 0.7 → 1.0
        pacePercentBase: 98 + (weekInPhase * 0.5)  // 98% → 102%
      }

    case 'SPECIFIC':
      // Race-specific: Peak MP volume
      // Long run: 15-20km at 98-100% MP
      // Intervals: Full volume at 100-103% MP
      return {
        tempoAtMPMinutes: 35 + (weekInPhase * 5),  // 35min → 60min+
        longRunMPFinishKm: 15 + weekInPhase,       // 15km → 25km
        intervalVolumeFactor: 1.0,
        pacePercentBase: 100 + (weekInPhase * 0.5) // 100% → 105%
      }

    case 'TAPER':
      // Maintain intensity, reduce volume
      return {
        tempoAtMPMinutes: 20,
        longRunMPFinishKm: 8,
        intervalVolumeFactor: 0.6,
        pacePercentBase: 100
      }

    default:
      return {
        tempoAtMPMinutes: 0,
        longRunMPFinishKm: 0,
        intervalVolumeFactor: 0,
        pacePercentBase: 80
      }
  }
}

/**
 * Get progressive interval parameters for smooth BUILD phase transition
 * Avoids the "jump" from no MP to 4×5km at 100% MP
 */
function getProgressiveIntervalParams(
  canovaPhase: CanovaPhase,
  weekInPhase: number,
  volumeFactor: number
): {
  reps: number
  workDistance: number
  pacePercent: number
  recoveryDistance: number
  recoveryPacePercent: number
} {
  if (canovaPhase === 'FUNDAMENTAL') {
    // BASE late: Introduce short MP segments
    // Week 1-2: 3×2km at 95% MP
    // Week 3-4: 4×2km at 97% MP
    // Week 5-6: 3×3km at 98% MP
    const options = [
      { reps: 3, work: 2, pace: 95 },
      { reps: 4, work: 2, pace: 97 },
      { reps: 3, work: 3, pace: 98 },
      { reps: 4, work: 3, pace: 98 },
    ]
    const idx = Math.min(Math.floor(weekInPhase / 2), options.length - 1)
    return {
      ...options[idx],
      workDistance: options[idx].work,
      pacePercent: options[idx].pace,
      recoveryDistance: 0.8,
      recoveryPacePercent: 80
    }
  }

  if (canovaPhase === 'SPECIAL') {
    // BUILD: Progressive increase, starting below 100% MP
    // Week 1-2: 3×4km at 98% MP
    // Week 3-4: 4×4km at 99% MP
    // Week 5-6: 4×5km at 100% MP
    // Week 7-8: 5×5km at 100% MP
    const options = [
      { reps: 3, work: 4, pace: 98 },
      { reps: 4, work: 4, pace: 99 },
      { reps: 4, work: 5, pace: 100 },
      { reps: 5, work: 5, pace: 100 },
    ]
    const idx = Math.min(Math.floor(weekInPhase / 2), options.length - 1)
    return {
      ...options[idx],
      workDistance: options[idx].work,
      pacePercent: options[idx].pace,
      recoveryDistance: 1.0,
      recoveryPacePercent: 85
    }
  }

  // SPECIFIC: Full Canova intervals
  const options = [
    { reps: 4, work: 5, pace: 100 },
    { reps: 5, work: 5, pace: 100 },
    { reps: 4, work: 6, pace: 100 },
    { reps: 5, work: 6, pace: 100 },
  ]
  const idx = Math.min(Math.floor(weekInPhase / 2), options.length - 1)
  return {
    ...options[idx],
    workDistance: options[idx].work,
    pacePercent: options[idx].pace,
    recoveryDistance: 1.0,
    recoveryPacePercent: 85
  }
}

function distributeNormalCanovaWeek(
  workouts: WorkoutSlot[],
  canovaPhase: CanovaPhase,
  weekInPhase: number,
  marathonPaceKmh: number,
  trainingDays: number,
  programParams: any,
  weekNumber: number = 1,
  totalWeeks: number = 16
): WorkoutSlot[] {
  // Calculate progressive race pace volume for this week
  const mpVolume = calculateProgressiveRacePaceVolume(
    weekNumber,
    totalWeeks,
    canovaPhase,
    weekInPhase
  )

  console.log(`[Canova] Week ${weekNumber} MP volume: tempo=${mpVolume.tempoAtMPMinutes}min, longFinish=${mpVolume.longRunMPFinishKm}km, pace=${mpVolume.pacePercentBase}%`)

  // === TUESDAY: Quality session 1 ===
  const quality1Type = selectCanovaWorkout(canovaPhase, weekInPhase, 'QUALITY_1')

  if (quality1Type === 'SPECIFIC_EXTENSIVE' || (canovaPhase === 'SPECIAL' || canovaPhase === 'SPECIFIC')) {
    // Use progressive interval parameters for smoother BUILD transition
    const intervalParams = getProgressiveIntervalParams(canovaPhase, weekInPhase, mpVolume.intervalVolumeFactor)
    workouts.push({
      dayNumber: 2,
      type: 'canovaIntervals',
      params: {
        reps: intervalParams.reps,
        workDistance: intervalParams.workDistance,
        pacePercent: intervalParams.pacePercent,
        recoveryDistance: intervalParams.recoveryDistance,
        recoveryPacePercent: intervalParams.recoveryPacePercent,
        marathonPace: marathonPaceKmh
      }
    })
  } else if (canovaPhase === 'FUNDAMENTAL' && weekInPhase >= 3) {
    // Late BASE: Introduce progressive tempo with MP finish
    // e.g., 20min at 85% + 15min at 95% MP
    const fundamentalDuration = 30 - Math.min(15, mpVolume.tempoAtMPMinutes)
    workouts.push({
      dayNumber: 2,
      type: 'tempo',
      params: {
        duration: 30,
        pacePercent: 85,
        progressiveFinish: true,
        progressiveMinutes: Math.min(15, mpVolume.tempoAtMPMinutes),
        progressivePacePercent: Math.min(98, mpVolume.pacePercentBase),
        description: `Progressive tempo: ${fundamentalDuration}min @ 85% MP + ${Math.min(15, mpVolume.tempoAtMPMinutes)}min @ ${Math.min(98, mpVolume.pacePercentBase)}% MP`,
        marathonPace: marathonPaceKmh
      }
    })
  } else {
    // Early BASE: Fundamental pace only (80-85% MP)
    const basePace = canovaPhase === 'GENERAL' ? 80 : 85
    workouts.push({
      dayNumber: 2,
      type: 'tempo',
      params: {
        duration: 30,
        pacePercent: basePace,
        description: `Fundamental run at ${basePace}% MP`,
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
        reps: 8 + Math.min(4, weekInPhase),  // Progress from 8 to 12 reps
        workSeconds: 35,
        rest: 3,
        description: 'Backsprints: Maximal ansträngning uppför backe',
      }
    })
  } else if (canovaPhase === 'FUNDAMENTAL' && weekInPhase >= 2) {
    // Late BASE Thursday: Short MP intervals introduction
    const shortIntervals = getProgressiveIntervalParams(canovaPhase, weekInPhase, mpVolume.intervalVolumeFactor)
    workouts.push({
      dayNumber: 4,
      type: 'canovaIntervals',
      params: {
        reps: shortIntervals.reps,
        workDistance: shortIntervals.workDistance,
        pacePercent: shortIntervals.pacePercent,
        recoveryDistance: shortIntervals.recoveryDistance,
        recoveryPacePercent: shortIntervals.recoveryPacePercent,
        marathonPace: marathonPaceKmh
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

  // === SUNDAY: Long Fast Run (Phase-specific with progressive MP finish) ===
  const longRunType = selectCanovaWorkout(canovaPhase, weekInPhase, 'LONG')

  // All phases now include progressive MP finish
  const longRunDistance = canovaPhase === 'GENERAL' ? 25 :
                         canovaPhase === 'FUNDAMENTAL' ? 30 :
                         canovaPhase === 'SPECIAL' ? 32 :
                         canovaPhase === 'SPECIFIC' ? 35 : 25

  // Calculate progressive finish based on MP volume
  const mpFinishKm = Math.min(mpVolume.longRunMPFinishKm, longRunDistance * 0.5) // Max 50% at MP
  const easyKm = longRunDistance - mpFinishKm

  if (canovaPhase === 'SPECIFIC' && longRunType === 'SPECIFIC_LONG_RUN') {
    // PEAK: Alternating pace long run
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRunDistance,
        alternating: true,
        fastPacePercent: 103,
        slowPacePercent: 90,
        description: `Specific Long Run: ${longRunDistance}km alternating 1km @ 103% MP / 1km @ 90% MP`,
        marathonPace: marathonPaceKmh
      }
    })
  } else if (mpFinishKm >= 2) {
    // All other phases: Progressive long run with MP finish
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRunDistance,
        progressive: true,
        segments: [
          { distance: easyKm, pacePercent: 80 },
          { distance: mpFinishKm, pacePercent: Math.min(100, mpVolume.pacePercentBase) }
        ],
        description: `Progressive Long Run: ${easyKm}km @ 80% MP + ${mpFinishKm}km @ ${Math.min(100, mpVolume.pacePercentBase)}% MP`,
        marathonPace: marathonPaceKmh
      }
    })
  } else {
    // Very early BASE: Continuous at fundamental pace
    workouts.push({
      dayNumber: 7,
      type: 'long',
      params: {
        distance: longRunDistance,
        pacePercent: 80,
        description: `Long run at fundamental pace (80% MP)`,
        marathonPace: marathonPaceKmh
      }
    })
  }

  // === EASY DAYS ===
  // Calculate how many running sessions we already have
  const existingRunningSessions = workouts.filter(w =>
    w.type !== 'strength' && w.type !== 'core'
  ).length

  // Target running sessions - use runningSessionsPerWeek if provided, otherwise trainingDays
  const targetRunningSessions = programParams.runningSessionsPerWeek || trainingDays || 4

  // How many more running sessions do we need?
  const runningSessionsNeeded = Math.max(0, targetRunningSessions - existingRunningSessions)

  console.log(`[Canova] Running sessions: ${existingRunningSessions} existing, ${targetRunningSessions} target, need ${runningSessionsNeeded} more`)

  // Available days for easy runs (days not already used for quality sessions)
  const availableDays = [1, 3, 5, 6]

  let addedSessions = 0
  for (const dayNum of availableDays) {
    if (addedSessions >= runningSessionsNeeded) break
    // Only add if this day doesn't already have a workout
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
      console.log(`[Canova] Added easy run on day ${dayNum}`)
    }
  }

  console.log(`[Canova] Final running session count: ${existingRunningSessions + addedSessions}`)

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
