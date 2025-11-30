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
  olympic: { swim: 1500, bike: 40, run: 10, name: 'Olympisk' },
  half_ironman: { swim: 1900, bike: 90, run: 21.1, name: 'Halv Ironman' },
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
      focus: 'Bygg grundläggande kondition i alla tre grenar',
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
      focus: 'Fortsätt bygga aerob bas',
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
      focus: 'Första brick-passet',
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
      focus: 'Återhämtningsvecka',
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
      focus: 'Introducera tröskelpas i alla grenar',
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
      focus: 'Öka intensiteten',
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
      focus: 'Peak träningsvecka',
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
      focus: 'Återhämtning och supercompensation',
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
      focus: 'Tävlingsspecifik träning',
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
      focus: 'Race-tempo och övergångar',
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
      focus: 'Skärpa utan trötthet',
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
      focus: 'TÄVLINGSVECKA!',
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
      focus: isRecovery ? 'Återhämtningsvecka' : `Bygg aerob kapacitet - vecka ${week}`,
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
      focus: isRecovery ? 'Återhämtningsvecka' : `Tröskelfokus - vecka ${week}`,
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
      focus: week <= 13 ? 'Race-specifik träning' : 'Taper',
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
    focus: 'TÄVLINGSVECKA!',
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
      focus: isRecovery ? 'Återhämtningsvecka' : `Aerob grund - vecka ${week}`,
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
      focus: isRecovery ? 'Återhämtningsvecka' : `Build 1: Ökad volym - vecka ${week}`,
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
      focus: isRecovery ? 'Återhämtningsvecka' : `Build 2: Race-specifikt - vecka ${week}`,
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
      focus: week === 17 ? 'Peak volym' : 'Taper',
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
    focus: 'TÄVLINGSVECKA - 70.3!',
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
      name: 'Teknik & Uthållighet',
      description: 'Fokus på simteknik och aerob kapacitet',
      duration: Math.round(35 * multiplier),
      swimDistance: Math.round(1500 * multiplier),
      intensity: 'easy',
      structure: 'Drills + kontinuerlig simning',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Aerob cykling',
      description: 'Bygg cykeluthållighet',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(25 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Lätt löpning',
      description: 'Aerob basträning',
      duration: Math.round(35 * multiplier),
      runDistance: Math.round(5 * multiplier),
      intensity: 'easy',
    },
    ...(week >= 3 ? [{
      discipline: 'brick' as TriathlonDiscipline,
      type: 'brick' as const,
      name: 'Intro Brick',
      description: 'Första brick-passet: cykel + kort löpning',
      duration: Math.round(50 * multiplier),
      bikeDistance: Math.round(15 * multiplier),
      runDistance: Math.round(2 * multiplier),
      intensity: 'easy' as const,
      structure: '30min cykel + 15min löp',
    }] : []),
  ]
}

function getSprintBuildWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'threshold',
      name: 'CSS-intervaller',
      description: 'Bygg simtröskel',
      duration: Math.round(40 * multiplier),
      swimDistance: Math.round(2000 * multiplier),
      intensity: 'hard',
      structure: '6x150m @CSS, 20s vila',
    },
    {
      discipline: 'swim',
      type: 'technique',
      name: 'Simteknik',
      description: 'Drills och effektivitet',
      duration: Math.round(30 * multiplier),
      swimDistance: Math.round(1200 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Sweet Spot',
      description: 'Cykeltröskel',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(28 * multiplier),
      intensity: 'hard',
      structure: '2x15min @88-94% FTP',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo-löpning',
      description: 'Tröskelträning',
      duration: Math.round(40 * multiplier),
      runDistance: Math.round(7 * multiplier),
      intensity: 'hard',
      structure: '15min tempo',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Race-tempo Brick',
      description: 'Simulera race-förhållanden',
      duration: Math.round(60 * multiplier),
      bikeDistance: Math.round(20 * multiplier),
      runDistance: Math.round(3 * multiplier),
      intensity: 'moderate',
      structure: '40min cykel @race pace + 15min löp',
    },
  ]
}

function getSprintRaceSpecificWorkouts(week: number, multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'race_simulation',
      name: 'Race-tempo sim',
      description: 'Simulera tävlingsstart',
      duration: Math.round(35 * multiplier),
      swimDistance: Math.round(1500 * multiplier),
      intensity: 'race_pace',
      structure: '750m race pace, vila, 750m race pace',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Race-tempo cykel',
      description: 'Tävlingstempo',
      duration: Math.round(50 * multiplier),
      bikeDistance: Math.round(22 * multiplier),
      intensity: 'race_pace',
    },
    {
      discipline: 'run',
      type: 'vo2max',
      name: 'Fartlek',
      description: 'Skärpa löpformen',
      duration: Math.round(35 * multiplier),
      runDistance: Math.round(6 * multiplier),
      intensity: 'hard',
      structure: '5x3min hård + 2min lätt',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full Sprint-simulering',
      description: 'Komplett race-simulering',
      duration: Math.round(75 * multiplier),
      bikeDistance: Math.round(20 * multiplier),
      runDistance: Math.round(5 * multiplier),
      intensity: 'race_pace',
      structure: 'Cykel + övergång + löpning @ race pace',
    },
  ]
}

function getSprintTaperWorkouts(multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'technique',
      name: 'Teknik + openers',
      description: 'Håll simkänslan',
      duration: Math.round(30 * multiplier),
      swimDistance: Math.round(1200 * multiplier),
      intensity: 'easy',
      structure: '4x100m race pace med full vila',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Lätt cykling',
      description: 'Aktiv vila',
      duration: Math.round(40 * multiplier),
      bikeDistance: Math.round(18 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Lätt löpning',
      description: 'Håll benen igång',
      duration: 25,
      runDistance: 4,
      intensity: 'easy',
      structure: '4x30s strides',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Kort brick',
      description: 'Påminn kroppen om övergångar',
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
      description: 'Aktivera systemen',
      duration: 20,
      swimDistance: 800,
      intensity: 'easy',
      structure: '4x50m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Lätt spinning',
      description: 'Håll benen fräscha',
      duration: 25,
      bikeDistance: 10,
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Shakeout',
      description: 'Lätt aktivering',
      duration: 15,
      runDistance: 2,
      intensity: 'easy',
      structure: '4x20s strides',
    },
  ]
}

function getRecoveryWorkouts(multiplier: number): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'recovery',
      name: 'Återhämtningssim',
      description: 'Lätt simning, blanda simtag',
      duration: Math.round(25 * multiplier),
      swimDistance: Math.round(1000 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Lätt cykling',
      description: 'Aktiv återhämtning',
      duration: Math.round(35 * multiplier),
      bikeDistance: Math.round(15 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Lätt löpning',
      description: 'Aktiv vila',
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
      name: 'Uthållighetssim',
      description: 'Bygg simkapacitet',
      duration: Math.round((40 + week * 5) * multiplier),
      swimDistance: Math.round((1800 + week * 200) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Långpass',
      description: 'Aerob cykling',
      duration: Math.round((70 + week * 10) * multiplier),
      bikeDistance: Math.round((30 + week * 5) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Långpass',
      description: 'Bygg löputhållighet',
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
      description: 'Tröskelsimning',
      duration: Math.round(45 * multiplier),
      swimDistance: Math.round(2500 * multiplier),
      intensity: 'hard',
      structure: '8x200m @CSS',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'FTP-intervaller',
      description: 'Cykeltröskel',
      duration: Math.round(75 * multiplier),
      bikeDistance: Math.round(35 * multiplier),
      intensity: 'hard',
      structure: '3x12min @95-100% FTP',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo-intervaller',
      description: 'Löptröskel',
      duration: Math.round(50 * multiplier),
      runDistance: Math.round(10 * multiplier),
      intensity: 'hard',
      structure: '3x10min tempo',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Race-brick',
      description: 'Tävlingsliknande brick',
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
      name: '1500m-simulering',
      description: 'Fulldistans race-tempo',
      duration: Math.round(40 * multiplier),
      swimDistance: 1500,
      intensity: 'race_pace',
    },
    {
      discipline: 'bike',
      type: 'race_simulation',
      name: '40km-tempo',
      description: 'Race-paceträning',
      duration: Math.round(75 * multiplier),
      bikeDistance: 40,
      intensity: 'race_pace',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full simulering',
      description: 'Komplett Olympic-simulering',
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
      name: 'Uthållighetssim',
      description: 'Bygg simdistans',
      duration: Math.round((45 + week * 5) * multiplier),
      swimDistance: Math.round((2000 + week * 200) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Långpass',
      description: 'Bygg cykelvolym',
      duration: Math.round((90 + week * 15) * multiplier),
      bikeDistance: Math.round((40 + week * 8) * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Långpass',
      description: 'Bygg löpvolym',
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
      description: 'Tröskelsimning',
      duration: Math.round(50 * multiplier),
      swimDistance: Math.round(3000 * multiplier),
      intensity: 'hard',
      structure: '6x400m @CSS',
    },
    {
      discipline: 'bike',
      type: 'endurance',
      name: 'Mega-långpass',
      description: 'Bygg maximal cykeluthållighet',
      duration: Math.round(150 * multiplier),
      bikeDistance: Math.round(70 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'run',
      type: 'endurance',
      name: 'Långpass',
      description: 'Halvmaraton-förberedelse',
      duration: Math.round(90 * multiplier),
      runDistance: Math.round(15 * multiplier),
      intensity: 'easy',
    },
    {
      discipline: 'brick',
      type: 'brick',
      name: 'Halvmaraton-brick',
      description: 'Simulera 70.3 bike-run',
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
      name: 'Race-pace sim',
      description: 'Tävlingsspecifik simning',
      duration: Math.round(50 * multiplier),
      swimDistance: 1900,
      intensity: 'race_pace',
    },
    {
      discipline: 'bike',
      type: 'threshold',
      name: 'Race-pace cykel',
      description: 'Tävlingsspecifik cykling',
      duration: Math.round(180 * multiplier),
      bikeDistance: 90,
      intensity: 'race_pace',
    },
    {
      discipline: 'run',
      type: 'threshold',
      name: 'Tempo-löpning',
      description: 'Halvmaraton-tempo',
      duration: Math.round(75 * multiplier),
      runDistance: 14,
      intensity: 'moderate',
      structure: 'Negative split',
    },
    {
      discipline: 'brick',
      type: 'race_simulation',
      name: 'Full 70.3-simulering',
      description: 'Race-simulering',
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
      name: 'Taper-sim',
      description: 'Håll simkänslan',
      duration: Math.round(35 * multiplier * taperMultiplier),
      swimDistance: Math.round(1500 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '4x200m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Taper-cykling',
      description: 'Lätt med openers',
      duration: Math.round(60 * multiplier * taperMultiplier),
      bikeDistance: Math.round(30 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '3x5min race pace',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Taper-löpning',
      description: 'Lätt med strides',
      duration: Math.round(40 * multiplier * taperMultiplier),
      runDistance: Math.round(6 * multiplier * taperMultiplier),
      intensity: 'easy',
      structure: '6x30s strides',
    },
  ]
}

function getHalfIronmanRaceWeekWorkouts(): TriathlonTemplateWorkout[] {
  return [
    {
      discipline: 'swim',
      type: 'recovery',
      name: 'Opener swim',
      description: 'Aktivera systemen',
      duration: 25,
      swimDistance: 1000,
      intensity: 'easy',
      structure: '5x100m race pace',
    },
    {
      discipline: 'bike',
      type: 'recovery',
      name: 'Lätt spinning',
      description: 'Håll benen fräscha',
      duration: 30,
      bikeDistance: 15,
      intensity: 'easy',
      structure: '3x3min race pace',
    },
    {
      discipline: 'run',
      type: 'recovery',
      name: 'Shakeout',
      description: 'Lätt aktivering dagen före',
      duration: 20,
      runDistance: 3,
      intensity: 'easy',
      structure: '4x20s strides',
    },
  ]
}

/**
 * Get triathlon workout type descriptions in Swedish
 */
export function getTriathlonWorkoutTypeDescriptions(): Record<string, { name: string; description: string }> {
  return {
    endurance: {
      name: 'Uthållighet',
      description: 'Låg intensitet för aerob bas. Bekväm träning.',
    },
    threshold: {
      name: 'Tröskel',
      description: 'Vid eller strax under tröskel. Utmanande men hanterbart.',
    },
    vo2max: {
      name: 'VO2max',
      description: 'Hög intensitet intervaller. Andningen blir tung.',
    },
    sprint: {
      name: 'Sprint',
      description: 'Maximal ansträngning, korta intervaller.',
    },
    recovery: {
      name: 'Återhämtning',
      description: 'Mycket lätt träning för aktiv vila.',
    },
    technique: {
      name: 'Teknik',
      description: 'Fokus på effektivitet och form.',
    },
    brick: {
      name: 'Brick',
      description: 'Kombinationspass (vanligtvis cykel + löpning).',
    },
    race_simulation: {
      name: 'Tävlingssimulering',
      description: 'Träning vid tävlingstempo och förhållanden.',
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
    description: `Rekommenderat för ${race.name} som ${experience === 'beginner' ? 'nybörjare' : experience === 'intermediate' ? 'mellanliggande' : experience === 'advanced' ? 'avancerad' : 'elit'}`,
  }
}
