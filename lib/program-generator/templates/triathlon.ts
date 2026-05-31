// lib/program-generator/templates/triathlon.ts
// Triathlon training program templates with multi-discipline periodization

import { PeriodPhase } from '@/types'

export type TriathlonDiscipline = 'swim' | 'bike' | 'run' | 'brick' | 'strength' | 'rest'

export interface TriathlonTemplateWorkout {
  discipline: TriathlonDiscipline
  type: 'endurance' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'technique' | 'brick' | 'race_simulation'
  name: string
  description: string
  duration: number // minutes
  // Discipline-specific
  swimDistance?: number // meters
  bikeDistance?: number // km
  runDistance?: number // km
  intensity: 'easy' | 'moderate' | 'hard' | 'race_pace'
  structure?: string
}

export interface TriathlonTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyHours: number
  swimSessions: number
  bikeSessions: number
  runSessions: number
  brickSessions: number
  keyWorkouts: TriathlonTemplateWorkout[]
}

export type RaceDistance = 'super_sprint' | 'sprint' | 'olympic' | 'half_ironman' | 'ironman'

// Race distance specifications
const RACE_SPECS: Record<RaceDistance, { swim: number; bike: number; run: number; name: string }> = {
  super_sprint: { swim: 400, bike: 10, run: 2.5, name: 'Super Sprint' },
  sprint: { swim: 750, bike: 20, run: 5, name: 'Sprint' },
  olympic: { swim: 1500, bike: 40, run: 10, name: 'Olympic' },
  half_ironman: { swim: 1900, bike: 90, run: 21.1, name: 'Half Ironman' },
  ironman: { swim: 3800, bike: 180, run: 42.2, name: 'Ironman' },
}

/**
 * 12-Week Sprint Triathlon Program
 * For athletes targeting Sprint distance (750m/20km/5km)
 */
export function getSprintTriathlonPlan(
  weeklyHours: 6 | 8 | 10 | 12
): TriathlonTemplateWeek[] {
  const hourMultiplier = weeklyHours / 8

  return [
    // Phase 1: Base Building (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build basic fitness across all three disciplines',
      weeklyHours: Math.round(weeklyHours * 0.8),
      swimSessions: 2,
      bikeSessions: 2,
      runSessions: 2,
      brickSessions: 0,
      keyWorkouts: getSprintBaseWorkouts(1, hourMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Continue building the aerobic base',
      weeklyHours: Math.round(weeklyHours * 0.85),
      swimSessions: 2,
      bikeSessions: 2,
      runSessions: 3,
      brickSessions: 0,
      keyWorkouts: getSprintBaseWorkouts(2, hourMultiplier),
    },
    {
      week: 3,
      phase: 'BASE',
      focus: 'First brick session',
      weeklyHours: Math.round(weeklyHours * 0.9),
      swimSessions: 2,
      bikeSessions: 2,
      runSessions: 2,
      brickSessions: 1,
      keyWorkouts: getSprintBaseWorkouts(3, hourMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery week',
      weeklyHours: Math.round(weeklyHours * 0.6),
      swimSessions: 2,
      bikeSessions: 1,
      runSessions: 2,
      brickSessions: 0,
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },

    // Phase 2: Build (Weeks 5-8)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Introduce threshold sessions across all disciplines',
      weeklyHours: weeklyHours,
      swimSessions: 3,
      bikeSessions: 2,
      runSessions: 3,
      brickSessions: 1,
      keyWorkouts: getSprintBuildWorkouts(5, hourMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Increase intensity',
      weeklyHours: Math.round(weeklyHours * 1.05),
      swimSessions: 3,
      bikeSessions: 3,
      runSessions: 3,
      brickSessions: 1,
      keyWorkouts: getSprintBuildWorkouts(6, hourMultiplier),
    },
    {
      week: 7,
      phase: 'BUILD',
      focus: 'Peak training week',
      weeklyHours: Math.round(weeklyHours * 1.1),
      swimSessions: 3,
      bikeSessions: 3,
      runSessions: 3,
      brickSessions: 1,
      keyWorkouts: getSprintBuildWorkouts(7, hourMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Recovery and supercompensation',
      weeklyHours: Math.round(weeklyHours * 0.6),
      swimSessions: 2,
      bikeSessions: 1,
      runSessions: 2,
      brickSessions: 0,
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },

    // Phase 3: Race Specific (Weeks 9-11)
    {
      week: 9,
      phase: 'PEAK',
      focus: 'Race-specific training',
      weeklyHours: weeklyHours,
      swimSessions: 3,
      bikeSessions: 2,
      runSessions: 3,
      brickSessions: 1,
      keyWorkouts: getSprintRaceSpecificWorkouts(9, hourMultiplier),
    },
    {
      week: 10,
      phase: 'PEAK',
      focus: 'Race pace and transitions',
      weeklyHours: Math.round(weeklyHours * 0.95),
      swimSessions: 2,
      bikeSessions: 2,
      runSessions: 3,
      brickSessions: 1,
      keyWorkouts: getSprintRaceSpecificWorkouts(10, hourMultiplier),
    },
    {
      week: 11,
      phase: 'PEAK',
      focus: 'Sharpness without fatigue',
      weeklyHours: Math.round(weeklyHours * 0.8),
      swimSessions: 2,
      bikeSessions: 2,
      runSessions: 2,
      brickSessions: 1,
      keyWorkouts: getSprintTaperWorkouts(hourMultiplier),
    },

    // Phase 4: Race Week
    {
      week: 12,
      phase: 'PEAK',
      focus: 'RACE WEEK!',
      weeklyHours: Math.round(weeklyHours * 0.4),
      swimSessions: 2,
      bikeSessions: 1,
      runSessions: 1,
      brickSessions: 0,
      keyWorkouts: getSprintRaceWeekWorkouts(),
    },
  ]
}

/**
 * 16-Week Olympic Triathlon Program
 * For athletes targeting Olympic distance (1.5km/40km/10km)
 */
export function getOlympicTriathlonPlan(
  weeklyHours: 8 | 10 | 12 | 15
): TriathlonTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10

  const weeks: TriathlonTemplateWeek[] = []

  // Base Phase (Weeks 1-5)
  for (let week = 1; week <= 5; week++) {
    const isRecovery = week === 4
    weeks.push({
      week,
      phase: isRecovery ? 'RECOVERY' : 'BASE',
      focus: isRecovery ? 'Recovery week' : `Build aerobic capacity - week ${week}`,
      weeklyHours: isRecovery ? Math.round(weeklyHours * 0.6) : Math.round(weeklyHours * (0.75 + week * 0.05)),
      swimSessions: isRecovery ? 2 : 3,
      bikeSessions: isRecovery ? 1 : 2 + (week > 2 ? 1 : 0),
      runSessions: isRecovery ? 2 : 3,
      brickSessions: isRecovery ? 0 : week >= 3 ? 1 : 0,
      keyWorkouts: isRecovery
        ? getRecoveryWorkouts(hourMultiplier)
        : getOlympicBaseWorkouts(week, hourMultiplier),
    })
  }

  // Build Phase (Weeks 6-11)
  for (let week = 6; week <= 11; week++) {
    const isRecovery = week === 8
    weeks.push({
      week,
      phase: isRecovery ? 'RECOVERY' : 'BUILD',
      focus: isRecovery ? 'Recovery week' : `Threshold focus - week ${week}`,
      weeklyHours: isRecovery ? Math.round(weeklyHours * 0.6) : Math.round(weeklyHours * (0.95 + (week - 6) * 0.02)),
      swimSessions: isRecovery ? 2 : 3,
      bikeSessions: isRecovery ? 1 : 3,
      runSessions: isRecovery ? 2 : 3,
      brickSessions: isRecovery ? 0 : 1,
      keyWorkouts: isRecovery
        ? getRecoveryWorkouts(hourMultiplier)
        : getOlympicBuildWorkouts(week, hourMultiplier),
    })
  }

  // Peak Phase (Weeks 12-15)
  for (let week = 12; week <= 15; week++) {
    weeks.push({
      week,
      phase: 'PEAK',
      focus: week <= 13 ? 'Race-specific training' : 'Taper',
      weeklyHours: Math.round(weeklyHours * (1.0 - (week - 12) * 0.15)),
      swimSessions: week <= 14 ? 3 : 2,
      bikeSessions: week <= 14 ? 2 : 1,
      runSessions: week <= 14 ? 3 : 2,
      brickSessions: week <= 14 ? 1 : 0,
      keyWorkouts: week <= 13
        ? getOlympicPeakWorkouts(week, hourMultiplier)
        : getOlympicTaperWorkouts(week, hourMultiplier),
    })
  }

  // Race Week
  weeks.push({
    week: 16,
    phase: 'PEAK',
    focus: 'RACE WEEK!',
    weeklyHours: Math.round(weeklyHours * 0.35),
    swimSessions: 2,
    bikeSessions: 1,
    runSessions: 1,
    brickSessions: 0,
    keyWorkouts: getOlympicRaceWeekWorkouts(),
  })

  return weeks
}

/**
 * 20-Week Half Ironman (70.3) Program
 * For athletes targeting 70.3 distance (1.9km/90km/21.1km)
 */
export function getHalfIronmanPlan(
  weeklyHours: 10 | 12 | 15 | 18
): TriathlonTemplateWeek[] {
  const hourMultiplier = weeklyHours / 12

  const weeks: TriathlonTemplateWeek[] = []

  // Base Phase (Weeks 1-6)
  for (let week = 1; week <= 6; week++) {
    const isRecovery = week === 4
    weeks.push({
      week,
      phase: isRecovery ? 'RECOVERY' : 'BASE',
      focus: isRecovery ? 'Recovery week' : `Aerobic base - week ${week}`,
      weeklyHours: isRecovery ? Math.round(weeklyHours * 0.55) : Math.round(weeklyHours * (0.7 + week * 0.05)),
      swimSessions: isRecovery ? 2 : 3,
      bikeSessions: isRecovery ? 1 : 2 + (week > 2 ? 1 : 0),
      runSessions: isRecovery ? 2 : 3,
      brickSessions: isRecovery ? 0 : week >= 3 ? 1 : 0,
      keyWorkouts: isRecovery
        ? getRecoveryWorkouts(hourMultiplier)
        : getHalfIronmanBaseWorkouts(week, hourMultiplier),
    })
  }

  // Build Phase 1 (Weeks 7-11)
  for (let week = 7; week <= 11; week++) {
    const isRecovery = week === 9
    weeks.push({
      week,
      phase: isRecovery ? 'RECOVERY' : 'BUILD',
      focus: isRecovery ? 'Recovery week' : `Build 1: Increased volume - week ${week}`,
      weeklyHours: isRecovery ? Math.round(weeklyHours * 0.55) : Math.round(weeklyHours * (0.9 + (week - 7) * 0.025)),
      swimSessions: isRecovery ? 2 : 3,
      bikeSessions: isRecovery ? 1 : 3,
      runSessions: isRecovery ? 2 : 3,
      brickSessions: isRecovery ? 0 : 1,
      keyWorkouts: isRecovery
        ? getRecoveryWorkouts(hourMultiplier)
        : getHalfIronmanBuild1Workouts(week, hourMultiplier),
    })
  }

  // Build Phase 2 (Weeks 12-16)
  for (let week = 12; week <= 16; week++) {
    const isRecovery = week === 14
    weeks.push({
      week,
      phase: isRecovery ? 'RECOVERY' : 'BUILD',
      focus: isRecovery ? 'Recovery week' : `Build 2: Race-specific - week ${week}`,
      weeklyHours: isRecovery ? Math.round(weeklyHours * 0.55) : Math.round(weeklyHours * (1.0 + (week - 12) * 0.02)),
      swimSessions: isRecovery ? 2 : 3,
      bikeSessions: isRecovery ? 1 : 3,
      runSessions: isRecovery ? 2 : 3,
      brickSessions: isRecovery ? 0 : 1,
      keyWorkouts: isRecovery
        ? getRecoveryWorkouts(hourMultiplier)
        : getHalfIronmanBuild2Workouts(week, hourMultiplier),
    })
  }

  // Peak Phase (Weeks 17-19)
  for (let week = 17; week <= 19; week++) {
    weeks.push({
      week,
      phase: 'PEAK',
      focus: week === 17 ? 'Peak volume' : 'Taper',
      weeklyHours: Math.round(weeklyHours * (1.1 - (week - 17) * 0.25)),
      swimSessions: week === 17 ? 3 : 2,
      bikeSessions: week === 17 ? 3 : 2,
      runSessions: week === 17 ? 3 : 2,
      brickSessions: week <= 18 ? 1 : 0,
      keyWorkouts: week === 17
        ? getHalfIronmanPeakWorkouts(hourMultiplier)
        : getHalfIronmanTaperWorkouts(week, hourMultiplier),
    })
  }

  // Race Week
  weeks.push({
    week: 20,
    phase: 'PEAK',
    focus: 'RACE WEEK - 70.3!',
    weeklyHours: Math.round(weeklyHours * 0.3),
    swimSessions: 2,
    bikeSessions: 1,
    runSessions: 1,
    brickSessions: 0,
    keyWorkouts: getHalfIronmanRaceWeekWorkouts(),
  })

  return weeks
}

// Helper functions for workout generation

function getSprintBaseWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'endurance',
      name: 'Technique & Endurance',
      description: 'Focus on swim technique and aerobic capacity',
      duration: Math.round(35 * multiplier),
      swimDistance: Math.round(1500 * multiplier),
      intensity: 'easy',
      structure: 'Drills + continuous swimming',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Aerobic cycling',
      description: 'Build bike endurance',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(25 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Easy running',
      description: 'Aerobic base training',
      duration: Math.round(35 * multiplier),
      runDistance: Math.round(5 * multiplier),
      intensity: 'easy',
    },
    ...(week >= 3 ? [{
      discipline: 'brick' as TriathlonDiscipline,
      type: 'brick' as const,
      name: 'Intro Brick',
      description: 'First brick session: bike + short run',
      duration: Math.round(50 * multiplier),
      bikeDistance: Math.round(15 * multiplier),
      runDistance: Math.round(2 * multiplier),
      intensity: 'easy' as const,
      structure: '30 min bike + 15 min run',
    }] : []),
  ]
}

function getSprintBuildWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'threshold',
      name: 'CSS intervals',
      description: 'Build swim threshold',
      duration: Math.round(40 * multiplier),
      swimDistance: Math.round(2000 * multiplier),
      intensity: 'hard',
      structure: '6 x 150 m @ CSS, 20 s recovery',
    },
    {
      discipline: 'swim',
      type: 'technique',
      name: 'Swim technique',
      description: 'Drills and efficiency',
      duration: Math.round(30 * multiplier),
      swimDistance: Math.round(1200 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Sweet Spot',
      description: 'Bike threshold',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(28 * multiplier),
      intensity: 'hard',
      structure: '2 x 15 min @ 88-94% FTP',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo running',
      description: 'Threshold training',
      duration: Math.round(40 * multiplier),
      runDistance: Math.round(7 * multiplier),
      intensity: 'hard',
      structure: '15min tempo',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Race-pace brick',
      description: 'Simulate race conditions',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(20 * multiplier),
      runDistance: Math.round(3 * multiplier),
      intensity: 'moderate',
      structure: '40 min bike @ race pace + 15 min run',
    },
  ]
}

function getSprintRaceSpecificWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'race_simulation',
      name: 'Race-pace swim',
      description: 'Simulate race start',
      duration: Math.round(35 * multiplier),
      swimDistance: Math.round(1500 * multiplier),
      intensity: 'race_pace',
      structure: '750 m race pace, recovery, 750 m race pace',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Race-pace bike',
      description: 'Race pace',
      duration: Math.round(50 * multiplier),
      bikeDistance: Math.round(22 * multiplier),
      intensity: 'race_pace',
    },
    {
      discipline: 'run',
      type: 'vo2max',
      name: 'Fartlek',
      description: 'Sharpen run form',
      duration: Math.round(35 * multiplier),
      runDistance: Math.round(6 * multiplier),
      intensity: 'hard',
      structure: '5 x 3 min hard + 2 min easy',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full sprint simulation',
      description: 'Complete race simulation',
      duration: Math.round(75 * multiplier),
      bikeDistance: Math.round(20 * multiplier),
      runDistance: Math.round(5 * multiplier),
      intensity: 'race_pace',
      structure: 'Bike + transition + run @ race pace',
    },
  ]
}

function getSprintTaperWorkouts(multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'technique',
      name: 'Technique + openers',
      description: 'Keep swim feel sharp',
      duration: Math.round(30 * multiplier),
      swimDistance: Math.round(1200 * multiplier),
      intensity: 'easy',
      structure: '4 x 100 m race pace with full recovery',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Easy cycling',
      description: 'Active rest',
      duration: Math.round(40 * multiplier),
      bikeDistance: Math.round(18 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Easy running',
      description: 'Keep the legs moving',
      duration: 25,
      runDistance: 4,
      intensity: 'easy',
      structure: '4 x 30 s strides',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Short brick',
      description: 'Remind the body about transitions',
      duration: 35,
      bikeDistance: 10,
      runDistance: 1.5,
      intensity: 'moderate',
    },
  ]
}

function getSprintRaceWeekWorkouts(): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'recovery',
      name: 'Opener swim',
      description: 'Activate the systems',
      duration: 20,
      swimDistance: 800,
      intensity: 'easy',
      structure: '4 x 50 m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Easy spinning',
      description: 'Keep the legs fresh',
      duration: 25,
      bikeDistance: 10,
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Shakeout',
      description: 'Light activation',
      duration: 15,
      runDistance: 2,
      intensity: 'easy',
      structure: '4 x 20 s strides',
    },
  ]
}

function getRecoveryWorkouts(multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'recovery',
      name: 'Recovery swim',
      description: 'Easy swimming, mix strokes',
      duration: Math.round(25 * multiplier),
      swimDistance: Math.round(1000 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Easy cycling',
      description: 'Active recovery',
      duration: Math.round(35 * multiplier),
      bikeDistance: Math.round(15 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Easy running',
      description: 'Active rest',
      duration: Math.round(25 * multiplier),
      runDistance: Math.round(4 * multiplier),
      intensity: 'easy',
    },
  ]
}

// Olympic distance helpers
function getOlympicBaseWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'endurance',
      name: 'Endurance swim',
      description: 'Build swim capacity',
      duration: Math.round((40 + week * 5) * multiplier),
      swimDistance: Math.round((1800 + week * 200) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Long ride',
      description: 'Aerobic cycling',
      duration: Math.round((70 + week * 10) * multiplier),
      bikeDistance: Math.round((30 + week * 5) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Long run',
      description: 'Build run endurance',
      duration: Math.round((40 + week * 5) * multiplier),
      runDistance: Math.round((6 + week * 1) * multiplier),
      intensity: 'easy',
    },
  ]
}

function getOlympicBuildWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'threshold',
      name: 'CSS-set',
      description: 'Threshold swimming',
      duration: Math.round(45 * multiplier),
      swimDistance: Math.round(2500 * multiplier),
      intensity: 'hard',
      structure: '8 x 200 m @ CSS',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'FTP intervals',
      description: 'Bike threshold',
      duration: Math.round(75 * multiplier),
      bikeDistance: Math.round(35 * multiplier),
      intensity: 'hard',
      structure: '3 x 12 min @ 95-100% FTP',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo intervals',
      description: 'Run threshold',
      duration: Math.round(50 * multiplier),
      runDistance: Math.round(10 * multiplier),
      intensity: 'hard',
      structure: '3 x 10 min tempo',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Race-brick',
      description: 'Race-like brick',
      duration: Math.round(90 * multiplier),
      bikeDistance: Math.round(35 * multiplier),
      runDistance: Math.round(6 * multiplier),
      intensity: 'moderate',
    },
  ]
}

function getOlympicPeakWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'race_simulation',
      name: '1500 m simulation',
      description: 'Full-distance race pace',
      duration: Math.round(40 * multiplier),
      swimDistance: 1500,
      intensity: 'race_pace',
    },
    {
      discipline: 'bike',
      type: 'race_simulation',
      name: '40 km tempo',
      description: 'Race-pace training',
      duration: Math.round(75 * multiplier),
      bikeDistance: 40,
      intensity: 'race_pace',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full simulation',
      description: 'Complete Olympic simulation',
      duration: Math.round(120 * multiplier),
      bikeDistance: 40,
      runDistance: 10,
      intensity: 'race_pace',
    },
  ]
}

function getOlympicTaperWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return getSprintTaperWorkouts(multiplier * 1.1)
}

function getOlympicRaceWeekWorkouts(): TriathlonTemplateWorkout[] {
  return getSprintRaceWeekWorkouts()
}

// Half Ironman helpers
function getHalfIronmanBaseWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'endurance',
      name: 'Endurance swim',
      description: 'Build swim distance',
      duration: Math.round((45 + week * 5) * multiplier),
      swimDistance: Math.round((2000 + week * 200) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Long ride',
      description: 'Build bike volume',
      duration: Math.round((90 + week * 15) * multiplier),
      bikeDistance: Math.round((40 + week * 8) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Long run',
      description: 'Build run volume',
      duration: Math.round((50 + week * 8) * multiplier),
      runDistance: Math.round((8 + week * 1.5) * multiplier),
      intensity: 'easy',
    },
  ]
}

function getHalfIronmanBuild1Workouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'threshold',
      name: 'CSS-set',
      description: 'Threshold swimming',
      duration: Math.round(50 * multiplier),
      swimDistance: Math.round(3000 * multiplier),
      intensity: 'hard',
      structure: '6 x 400 m @ CSS',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Mega long ride',
      description: 'Build maximum bike endurance',
      duration: Math.round(150 * multiplier),
      bikeDistance: Math.round(70 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Long run',
      description: 'Half-marathon preparation',
      duration: Math.round(90 * multiplier),
      runDistance: Math.round(15 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Half-marathon brick',
      description: 'Simulate 70.3 bike-run',
      duration: Math.round(120 * multiplier),
      bikeDistance: Math.round(50 * multiplier),
      runDistance: Math.round(10 * multiplier),
      intensity: 'moderate',
    },
  ]
}

function getHalfIronmanBuild2Workouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'threshold',
      name: 'Race-pace swim',
      description: 'Race-specific swimming',
      duration: Math.round(50 * multiplier),
      swimDistance: 1900,
      intensity: 'race_pace',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Race-pace bike',
      description: 'Race-specific cycling',
      duration: Math.round(180 * multiplier),
      bikeDistance: 90,
      intensity: 'race_pace',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo running',
      description: 'Half-marathon tempo',
      duration: Math.round(75 * multiplier),
      runDistance: 14,
      intensity: 'moderate',
      structure: 'Negative split',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full 70.3 simulation',
      description: 'Race simulation',
      duration: Math.round(240 * multiplier),
      bikeDistance: 90,
      runDistance: 15,
      intensity: 'race_pace',
    },
  ]
}

function getHalfIronmanPeakWorkouts(multiplier: number): TriathlonTemplateWorkout[] {
  return getHalfIronmanBuild2Workouts(16, multiplier)
}

function getHalfIronmanTaperWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  const taperMultiplier = 1.0 - (week - 17) * 0.25
  return [
    {
      discipline: 'swim',
      type: 'technique',
      name: 'Taper swim',
      description: 'Keep swim feel sharp',
      duration: Math.round(35 * multiplier * taperMultiplier),
      swimDistance: Math.round(1500 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '4 x 200 m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Taper cycling',
      description: 'Easy with openers',
      duration: Math.round(60 * multiplier * taperMultiplier),
      bikeDistance: Math.round(30 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '3 x 5 min race pace',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Taper running',
      description: 'Easy with strides',
      duration: Math.round(40 * multiplier * taperMultiplier),
      runDistance: Math.round(6 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '6 x 30 s strides',
    },
  ]
}

function getHalfIronmanRaceWeekWorkouts(): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'recovery',
      name: 'Opener swim',
      description: 'Activate the systems',
      duration: 25,
      swimDistance: 1000,
      intensity: 'easy',
      structure: '5 x 100 m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Easy spinning',
      description: 'Keep the legs fresh',
      duration: 30,
      bikeDistance: 15,
      intensity: 'easy',
      structure: '3 x 3 min race pace',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Shakeout',
      description: 'Light activation the day before',
      duration: 20,
      runDistance: 3,
      intensity: 'easy',
      structure: '4 x 20 s strides',
    },
  ]
}

/**
 * Get triathlon workout type descriptions
 */
export function getTriathlonWorkoutTypeDescriptions(): Record<string, { name: string; description: string }> {
  return {
    endurance: {
      name: 'Endurance',
      description: 'Low intensity for aerobic base. Comfortable training.',
    },
    threshold: {
      name: 'Threshold',
      description: 'At or just below threshold. Challenging but manageable.',
    },
    vo2max: {
      name: 'VO2max',
      description: 'High-intensity intervals. Breathing becomes heavy.',
    },
    sprint: {
      name: 'Sprint',
      description: 'Maximal effort, short intervals.',
    },
    recovery: {
      name: 'Recovery',
      description: 'Very easy training for active rest.',
    },
    technique: {
      name: 'Technique',
      description: 'Focus on efficiency and form.',
    },
    brick: {
      name: 'Brick',
      description: 'Combination session, usually bike + run.',
    },
    race_simulation: {
      name: 'Race simulation',
      description: 'Training at race pace and race conditions.',
    },
  }
}

/**
 * Calculate recommended weekly hours based on race distance and experience
 */
export function getRecommendedWeeklyHours(
  raceDistance: RaceDistance,
  experience: 'beginner' | 'intermediate' | 'advanced' | 'elite'
): { minHours: number; maxHours: number; description: string } {
  const hourRanges = {
    super_sprint: { beginner: { min: 4, max: 6 }, intermediate: { min: 5, max: 8 }, advanced: { min: 6, max: 10 }, elite: { min: 8, max: 12 } },
    sprint: { beginner: { min: 5, max: 8 }, intermediate: { min: 6, max: 10 }, advanced: { min: 8, max: 12 }, elite: { min: 10, max: 15 } },
    olympic: { beginner: { min: 7, max: 10 }, intermediate: { min: 8, max: 12 }, advanced: { min: 10, max: 15 }, elite: { min: 12, max: 20 } },
    half_ironman: { beginner: { min: 8, max: 12 }, intermediate: { min: 10, max: 15 }, advanced: { min: 12, max: 18 }, elite: { min: 15, max: 25 } },
    ironman: { beginner: { min: 12, max: 16 }, intermediate: { min: 14, max: 20 }, advanced: { min: 16, max: 25 }, elite: { min: 20, max: 35 } },
  }

  const range = hourRanges[raceDistance][experience]
  const race = RACE_SPECS[raceDistance]

  return {
    minHours: range.min,
    maxHours: range.max,
    description: `Recommended for ${race.name} as ${experience === 'beginner' ? 'a beginner' : experience === 'intermediate' ? 'an intermediate athlete' : experience === 'advanced' ? 'an advanced athlete' : 'an elite athlete'}`,
  }
}
