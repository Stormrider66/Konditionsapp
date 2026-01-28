// lib/program-generator/workout-distribution/default.ts
// DEFAULT methodology workout distribution - Fallback logic

import { MethodologyConfig } from '@/lib/training-engine/methodologies'
import { PeriodPhase } from '@/types'
import { WorkoutSlot, WorkoutDistributionParams, IntensityDistribution } from './types'
import { logger } from '@/lib/logger'

export function distributeDefaultWorkouts(params: WorkoutDistributionParams): WorkoutSlot[] {
  const {
    phase,
    trainingDays,
    volumePercentage,
    methodologyConfig,
  } = params

  const workouts: WorkoutSlot[] = []
  const isRecoveryWeek = volumePercentage < 80

  logger.debug('Using DEFAULT workout distribution logic', { methodology: methodologyConfig.type })

  // Calculate intensity distribution from methodology
  const intensityDist = calculateMethodologyIntensityDistribution(
    trainingDays,
    methodologyConfig,
    phase
  )

  let currentDay = 1
  let easyCount = 0
  let moderateCount = 0
  let hardCount = 0

  switch (phase) {
    case 'BASE':
      distributeBasePhase(workouts, intensityDist, trainingDays, easyCount, currentDay)
      break

    case 'BUILD':
      distributeBuildPhase(workouts, intensityDist, trainingDays, isRecoveryWeek, easyCount, moderateCount, hardCount)
      break

    case 'PEAK':
      distributePeakPhase(workouts, intensityDist, trainingDays, easyCount, moderateCount, hardCount)
      break

    case 'TAPER':
      distributeTaperPhase(workouts, intensityDist, trainingDays, isRecoveryWeek)
      break

    case 'RECOVERY':
      distributeRecoveryPhase(workouts, trainingDays)
      break

    case 'TRANSITION':
      distributeTransitionPhase(workouts, trainingDays)
      break
  }

  return workouts
}

function calculateMethodologyIntensityDistribution(
  trainingDays: number,
  methodologyConfig: MethodologyConfig,
  phase: PeriodPhase
): IntensityDistribution {
  const dist = methodologyConfig.zoneDistribution3 || { zone1Percent: 80, zone2Percent: 0, zone3Percent: 20 }
  const { zone1Percent, zone2Percent, zone3Percent } = dist

  let adjustedZone1 = zone1Percent
  let adjustedZone2 = zone2Percent
  let adjustedZone3 = zone3Percent

  if (phase === 'BASE' || phase === 'TRANSITION') {
    adjustedZone1 += 5
    adjustedZone3 -= 5
  } else if (phase === 'PEAK') {
    adjustedZone3 += 5
    adjustedZone1 -= 5
  }

  const total = adjustedZone1 + adjustedZone2 + adjustedZone3
  adjustedZone1 = (adjustedZone1 / total) * 100
  adjustedZone2 = (adjustedZone2 / total) * 100
  adjustedZone3 = (adjustedZone3 / total) * 100

  const cardioWorkouts = Math.max(trainingDays - 1, 2)

  const easyWorkouts = Math.round((cardioWorkouts * adjustedZone1) / 100)
  const hardWorkouts = Math.round((cardioWorkouts * adjustedZone3) / 100)
  const moderateWorkouts = cardioWorkouts - easyWorkouts - hardWorkouts

  return {
    easyWorkouts: Math.max(easyWorkouts, 1),
    moderateWorkouts: Math.max(moderateWorkouts, 0),
    hardWorkouts: Math.max(hardWorkouts, 0),
  }
}

function distributeBasePhase(
  workouts: WorkoutSlot[],
  intensityDist: IntensityDistribution,
  trainingDays: number,
  easyCount: number,
  currentDay: number
): void {
  workouts.push({ dayNumber: 7, type: 'long', params: { distance: 15 } })
  easyCount++

  const baseEasyRemaining = intensityDist.easyWorkouts - 1
  for (let i = 0; i < baseEasyRemaining && currentDay <= 6; i++) {
    if (currentDay === 1 || currentDay === 3) {
      workouts.push({ dayNumber: currentDay, type: 'easy', params: { duration: 40 } })
      currentDay++
      easyCount++
    }
    currentDay++
  }

  if (trainingDays >= 4) {
    workouts.push({ dayNumber: 5, type: 'strength', params: { focus: 'full' } })
  }
  if (trainingDays >= 6) {
    workouts.push({ dayNumber: 4, type: 'core', params: {} })
  }
}

function distributeBuildPhase(
  workouts: WorkoutSlot[],
  intensityDist: IntensityDistribution,
  trainingDays: number,
  isRecoveryWeek: boolean,
  easyCount: number,
  moderateCount: number,
  hardCount: number
): void {
  workouts.push({ dayNumber: 7, type: 'long', params: { distance: 18 } })
  easyCount++

  for (let i = 0; i < intensityDist.hardWorkouts && hardCount < intensityDist.hardWorkouts; i++) {
    if (!isRecoveryWeek) {
      workouts.push({
        dayNumber: 2,
        type: 'intervals',
        params: { reps: 5, work: 4, rest: 2, zone: 4 }
      })
      hardCount++
    }
  }

  for (let i = 0; i < intensityDist.moderateWorkouts && moderateCount < intensityDist.moderateWorkouts; i++) {
    if (!isRecoveryWeek) {
      workouts.push({ dayNumber: 4, type: 'tempo', params: { duration: 25 } })
      moderateCount++
    }
  }

  const buildEasyRemaining = intensityDist.easyWorkouts - 1
  for (let i = 0; i < buildEasyRemaining; i++) {
    if (easyCount < intensityDist.easyWorkouts) {
      const day = i === 0 ? 5 : 1
      workouts.push({ dayNumber: day, type: 'easy', params: { duration: 40 } })
      easyCount++
    }
  }

  if (trainingDays >= 5) {
    workouts.push({ dayNumber: 3, type: 'strength', params: { focus: 'lower' } })
  }
  if (trainingDays >= 6) {
    workouts.push({ dayNumber: 6, type: 'core', params: {} })
  }
}

function distributePeakPhase(
  workouts: WorkoutSlot[],
  intensityDist: IntensityDistribution,
  trainingDays: number,
  easyCount: number,
  moderateCount: number,
  hardCount: number
): void {
  workouts.push({ dayNumber: 7, type: 'long', params: { distance: 20 } })
  easyCount++

  workouts.push({
    dayNumber: 4,
    type: 'intervals',
    params: { reps: 6, work: 5, rest: 2, zone: 5 }
  })
  hardCount++

  if (intensityDist.moderateWorkouts > 0) {
    workouts.push({ dayNumber: 1, type: 'tempo', params: { duration: 30 } })
    moderateCount++
  }

  for (let i = easyCount; i < intensityDist.easyWorkouts; i++) {
    workouts.push({ dayNumber: 2 + i, type: 'easy', params: { duration: 45 } })
  }

  if (trainingDays >= 5) {
    workouts.push({ dayNumber: 3, type: 'plyometric', params: {} })
  }
}

function distributeTaperPhase(
  workouts: WorkoutSlot[],
  intensityDist: IntensityDistribution,
  trainingDays: number,
  isRecoveryWeek: boolean
): void {
  workouts.push({ dayNumber: 2, type: 'easy', params: { duration: 30 } })
  workouts.push({ dayNumber: 6, type: 'easy', params: { duration: 40 } })

  if (intensityDist.hardWorkouts > 0 && !isRecoveryWeek) {
    workouts.push({
      dayNumber: 4,
      type: 'intervals',
      params: { reps: 4, work: 3, rest: 3, zone: 5 }
    })
  }

  if (trainingDays >= 4) {
    workouts.push({ dayNumber: 1, type: 'recovery', params: {} })
  }
}

function distributeRecoveryPhase(workouts: WorkoutSlot[], trainingDays: number): void {
  for (let i = 0; i < Math.min(trainingDays, 3); i++) {
    const days = [2, 5, 3]
    const types = ['recovery', 'easy', 'core']
    workouts.push({
      dayNumber: days[i],
      type: types[i],
      params: i === 1 ? { duration: 30 } : {}
    })
  }
}

function distributeTransitionPhase(workouts: WorkoutSlot[], trainingDays: number): void {
  for (let i = 0; i < Math.min(trainingDays, 3); i++) {
    const days = [2, 7, 4]
    const types = ['easy', 'easy', 'strength']
    const params = i === 0 ? { duration: 40 } : i === 1 ? { duration: 50 } : { focus: 'full' }
    workouts.push({ dayNumber: days[i], type: types[i], params })
  }
}
