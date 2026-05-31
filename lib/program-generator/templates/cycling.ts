// lib/program-generator/templates/cycling.ts
// Cycling training program templates with power-based zones

import { PeriodPhase } from '@/types'

export interface CyclingTemplateWorkout {
  type: 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'sweetspot'
  name: string
  description: string
  duration: number // minutes
  tssTarget: number // Training Stress Score target
  powerZone: number // Primary zone (1-7)
  structure?: string // Interval structure like "3 x 10 min @ 95% FTP"
}

export interface CyclingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyTss: number
  weeklyHours: number
  keyWorkouts: CyclingTemplateWorkout[]
}

/**
 * 8-Week FTP Builder Program
 * Designed to increase Functional Threshold Power
 * Based on classic periodization with 3:1 load:recovery ratio
 */
export function get8WeekFtpBuilder(
  currentFtp: number,
  weeklyHours: 6 | 8 | 10 | 12
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 8 // Normalize to 8-hour base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build aerobic base and test the starting point',
      weeklyTss: Math.round(300 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseWorkouts(1, hourMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Continue aerobic development with longer sessions',
      weeklyTss: Math.round(330 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseWorkouts(2, hourMultiplier),
    },

    // PHASE 2: Sweet Spot (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introduce sweet spot intervals (88-94% FTP)',
      weeklyTss: Math.round(380 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getSweetSpotWorkouts(3, hourMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery week - reduce volume by 40%',
      weeklyTss: Math.round(230 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },

    // PHASE 3: Threshold Development (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Threshold intervals to raise FTP',
      weeklyTss: Math.round(420 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdWorkouts(5, hourMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Longer threshold intervals - max adaptation',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdWorkouts(6, hourMultiplier),
    },

    // PHASE 4: Peak & Test (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Over-under intervals and VO2max',
      weeklyTss: Math.round(400 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: getPeakWorkouts(hourMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper and FTP retest',
      weeklyTss: Math.round(200 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.5),
      keyWorkouts: getTestWeekWorkouts(hourMultiplier),
    },
  ]
}

/**
 * 12-Week Base Building Program
 * Focus on aerobic development for endurance cycling
 */
export function get12WeekBaseBuilder(
  weeklyHours: 6 | 8 | 10 | 12 | 15
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10

  const weeks: CyclingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let tssMultiplier = 1

    if (week <= 3) {
      focus = 'Basic aerobic development'
      tssMultiplier = 0.7 + (week * 0.1)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Recovery week'
      tssMultiplier = 0.6
    } else if (week <= 7) {
      focus = 'Build volume and endurance'
      tssMultiplier = 0.9 + ((week - 4) * 0.05)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Increased intensity with tempo'
      tssMultiplier = 1.0 + ((week - 8) * 0.05)
    } else {
      phase = 'RECOVERY'
      focus = 'Evaluation and rest'
      tssMultiplier = 0.5
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyTss: Math.round(350 * hourMultiplier * tssMultiplier),
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.6) : weeklyHours,
      keyWorkouts: phase === 'RECOVERY'
        ? getRecoveryWorkouts(hourMultiplier)
        : getEnduranceWorkouts(week, hourMultiplier),
    })
  }

  return weeks
}

/**
 * 8-Week Gran Fondo Preparation
 * Build endurance for long events (100-200km)
 */
export function getGranFondoPrep(
  eventDistanceKm: 100 | 150 | 200,
  weeklyHours: 8 | 10 | 12 | 15
): CyclingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10
  const distanceMultiplier = eventDistanceKm / 150

  return [
    // Weeks 1-2: Volume building
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build distance capacity',
      weeklyTss: Math.round(350 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long ride',
          description: `Endurance ride ${Math.round(60 * distanceMultiplier)} km in Z2`,
          duration: Math.round(180 * distanceMultiplier),
          tssTarget: Math.round(150 * distanceMultiplier),
          powerZone: 2,
        },
        {
          type: 'tempo',
          name: 'Tempo intervals',
          description: 'Builds efficiency at race pace',
          duration: 90,
          tssTarget: 85,
          powerZone: 3,
          structure: '3 x 15 min @ 80-85% FTP',
        },
        {
          type: 'endurance',
          name: 'Medium distance',
          description: 'Steady Z2 training',
          duration: 120,
          tssTarget: 90,
          powerZone: 2,
        },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Increase long-ride duration',
      weeklyTss: Math.round(400 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long ride',
          description: `Endurance ride ${Math.round(80 * distanceMultiplier)} km`,
          duration: Math.round(210 * distanceMultiplier),
          tssTarget: Math.round(180 * distanceMultiplier),
          powerZone: 2,
        },
        {
          type: 'sweetspot',
          name: 'Sweet Spot',
          description: 'Efficient training near threshold',
          duration: 90,
          tssTarget: 95,
          powerZone: 4,
          structure: '2 x 20 min @ 88-94% FTP',
        },
        {
          type: 'endurance',
          name: 'Recovery ride',
          description: 'Active recovery',
          duration: 60,
          tssTarget: 35,
          powerZone: 1,
        },
      ],
    },
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Simulate race conditions',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long ride with tempo',
          description: `${Math.round(100 * distanceMultiplier)} km with tempo blocks`,
          duration: Math.round(240 * distanceMultiplier),
          tssTarget: Math.round(220 * distanceMultiplier),
          powerZone: 2,
          structure: 'Z2 with 4 x 10 min @ tempo',
        },
        {
          type: 'threshold',
          name: 'FTP intervals',
          description: 'Raise threshold capacity',
          duration: 75,
          tssTarget: 90,
          powerZone: 4,
          structure: '3 x 12 min @ 95-100% FTP',
        },
        {
          type: 'endurance',
          name: 'Medium distance',
          description: 'Steady aerobic training',
          duration: 90,
          tssTarget: 70,
          powerZone: 2,
        },
      ],
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery and supercompensation',
      weeklyTss: Math.round(250 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoveryWorkouts(hourMultiplier),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Peak volume - longest ride',
      weeklyTss: Math.round(500 * hourMultiplier),
      weeklyHours: weeklyHours + 2,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Peak long ride',
          description: `${Math.round(120 * distanceMultiplier)} km - simulates racing`,
          duration: Math.round(300 * distanceMultiplier),
          tssTarget: Math.round(270 * distanceMultiplier),
          powerZone: 2,
          structure: 'Include climbing and tempo blocks',
        },
        {
          type: 'vo2max',
          name: 'VO2max intervals',
          description: 'Builds top-end capacity',
          duration: 60,
          tssTarget: 85,
          powerZone: 5,
          structure: '5 x 4 min @ 105-115% FTP',
        },
        {
          type: 'recovery',
          name: 'Active rest',
          description: 'Easy spinning',
          duration: 45,
          tssTarget: 25,
          powerZone: 1,
        },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Specific race preparation',
      weeklyTss: Math.round(450 * hourMultiplier),
      weeklyHours: weeklyHours,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long ride with climbing',
          description: 'Focus on hilly terrain',
          duration: 180,
          tssTarget: 180,
          powerZone: 2,
          structure: 'Include 1500+ meters of elevation gain',
        },
        {
          type: 'sweetspot',
          name: 'Sweet Spot intervals',
          description: 'Efficient intensity',
          duration: 90,
          tssTarget: 100,
          powerZone: 4,
          structure: '3 x 15 min @ 90% FTP',
        },
        {
          type: 'tempo',
          name: 'Group tempo',
          description: 'Simulate a race situation',
          duration: 90,
          tssTarget: 90,
          powerZone: 3,
        },
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Sharpness without fatigue',
      weeklyTss: Math.round(350 * hourMultiplier),
      weeklyHours: weeklyHours - 2,
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Medium distance',
          description: 'Keep the legs moving',
          duration: 120,
          tssTarget: 90,
          powerZone: 2,
        },
        {
          type: 'threshold',
          name: 'Opener intervals',
          description: 'Activate the systems',
          duration: 60,
          tssTarget: 70,
          powerZone: 4,
          structure: '2 x 8 min @ 100% FTP',
        },
        {
          type: 'recovery',
          name: 'Easy spinning',
          description: 'Active rest',
          duration: 45,
          tssTarget: 25,
          powerZone: 1,
        },
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Race week!',
      weeklyTss: Math.round(200 * hourMultiplier),
      weeklyHours: Math.round(weeklyHours * 0.4),
      keyWorkouts: [
        {
          type: 'recovery',
          name: 'Easy spinning',
          description: 'Keep the legs fresh',
          duration: 40,
          tssTarget: 20,
          powerZone: 1,
        },
        {
          type: 'threshold',
          name: 'Opener',
          description: 'Short activation the day before',
          duration: 30,
          tssTarget: 25,
          powerZone: 4,
          structure: '2 x 5 min @ 95% FTP with full recovery',
        },
        {
          type: 'endurance',
          name: 'RACE DAY!',
          description: `Gran Fondo ${eventDistanceKm} km`,
          duration: Math.round(eventDistanceKm * 2.5),
          tssTarget: Math.round(eventDistanceKm * 1.5),
          powerZone: 3,
        },
      ],
    },
  ]
}

// Helper functions for workout generation

function getBaseWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Long ride',
      description: 'Build aerobic base at low intensity',
      duration: Math.round((90 + week * 15) * multiplier),
      tssTarget: Math.round((60 + week * 10) * multiplier),
      powerZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medium distance',
      description: 'Steady Z2 training',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 2,
    },
    {
      type: 'tempo',
      name: 'Tempo introduction',
      description: 'First taste of higher intensity',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 3,
      structure: '2 x 10 min @ 75-85% FTP',
    },
    {
      type: 'recovery',
      name: 'Active recovery',
      description: 'Easy spinning, focus on cadence work',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getSweetSpotWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'sweetspot',
      name: 'Sweet Spot intervals',
      description: 'Efficient training just below threshold',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(85 * multiplier),
      powerZone: 4,
      structure: week === 3 ? '3 x 12 min @ 88-94% FTP' : '3 x 15 min @ 88-94% FTP',
    },
    {
      type: 'endurance',
      name: 'Long ride',
      description: 'Aerobic base with tempo surges',
      duration: Math.round(120 * multiplier),
      tssTarget: Math.round(95 * multiplier),
      powerZone: 2,
    },
    {
      type: 'sweetspot',
      name: 'Over-under intro',
      description: 'Learn to handle threshold fluctuations',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(75 * multiplier),
      powerZone: 4,
      structure: '3 x (3 min @ 105% + 3 min @ 85%)',
    },
    {
      type: 'recovery',
      name: 'Recovery ride',
      description: 'Active rest',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getThresholdWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  const intervalLength = week === 5 ? 10 : 15

  return [
    {
      type: 'threshold',
      name: 'FTP intervals',
      description: 'Main session for FTP development',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(90 * multiplier),
      powerZone: 4,
      structure: `3 x ${intervalLength} min @ 95-100% FTP`,
    },
    {
      type: 'endurance',
      name: 'Long ride',
      description: 'Volume and recovery',
      duration: Math.round(150 * multiplier),
      tssTarget: Math.round(120 * multiplier),
      powerZone: 2,
    },
    {
      type: 'threshold',
      name: 'Tempo + Threshold',
      description: 'Mixed intensity',
      duration: Math.round(90 * multiplier),
      tssTarget: Math.round(100 * multiplier),
      powerZone: 4,
      structure: '20 min tempo + 2 x 10 min @ FTP',
    },
    {
      type: 'recovery',
      name: 'Active rest',
      description: 'Easy spinning',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

function getPeakWorkouts(multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max intervals',
      description: 'Peak your capacity',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(90 * multiplier),
      powerZone: 5,
      structure: '5 x 4 min @ 105-120% FTP',
    },
    {
      type: 'threshold',
      name: 'Over-Under intervals',
      description: 'Classic FTP raiser',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(95 * multiplier),
      powerZone: 4,
      structure: '3 x (5 min @ 105% + 5 min @ 95%)',
    },
    {
      type: 'endurance',
      name: 'Medium-long ride',
      description: 'Recovery between hard sessions',
      duration: Math.round(90 * multiplier),
      tssTarget: Math.round(70 * multiplier),
      powerZone: 2,
    },
    {
      type: 'sprint',
      name: 'Sprint intervals',
      description: 'Neuromuscular activation',
      duration: Math.round(45 * multiplier),
      tssTarget: Math.round(50 * multiplier),
      powerZone: 7,
      structure: '6 x 30 s all-out with full recovery',
    },
  ]
}

function getRecoveryWorkouts(multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Active recovery',
      description: 'Easy spinning, high cadence',
      duration: 60,
      tssTarget: 30,
      powerZone: 1,
    },
    {
      type: 'endurance',
      name: 'Easy endurance',
      description: 'Steady Z2, enjoy the ride',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(50 * multiplier),
      powerZone: 2,
    },
    {
      type: 'recovery',
      name: 'Technique session',
      description: 'Focus on pedaling and cadence',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
      structure: 'Single-leg drills, high cadence intervals',
    },
  ]
}

function getTestWeekWorkouts(_multiplier: number): CyclingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Easy spinning',
      description: 'Rest before the test',
      duration: 40,
      tssTarget: 20,
      powerZone: 1,
    },
    {
      type: 'threshold',
      name: 'FTP-TEST!',
      description: '20-min FTP-test (x0.95 = FTP)',
      duration: 60,
      tssTarget: 65,
      powerZone: 4,
      structure: '20 min all-out after warm-up',
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Rest and celebrate your new FTP!',
      duration: 30,
      tssTarget: 15,
      powerZone: 1,
    },
  ]
}

function getEnduranceWorkouts(week: number, multiplier: number): CyclingTemplateWorkout[] {
  const baseDuration = 90 + Math.min(week * 10, 60)

  return [
    {
      type: 'endurance',
      name: 'Long ride',
      description: 'Main session for aerobic development',
      duration: Math.round(baseDuration * multiplier),
      tssTarget: Math.round((baseDuration * 0.65) * multiplier),
      powerZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medium distance',
      description: 'Steady Z2',
      duration: Math.round(75 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 2,
    },
    {
      type: 'tempo',
      name: 'Tempo session',
      description: 'Build efficiency',
      duration: Math.round(60 * multiplier),
      tssTarget: Math.round(55 * multiplier),
      powerZone: 3,
      structure: '2 x 15 min @ 75-85% FTP',
    },
    {
      type: 'recovery',
      name: 'Active rest',
      description: 'Easy spinning',
      duration: 45,
      tssTarget: 25,
      powerZone: 1,
    },
  ]
}

/**
 * Get cycling workout type descriptions
 */
export function getCyclingWorkoutTypeDescriptions(): Record<CyclingTemplateWorkout['type'], { name: string; description: string; zoneRange: string }> {
  return {
    endurance: {
      name: 'Endurance',
      description: 'Low intensity for aerobic base. The effort should feel comfortable.',
      zoneRange: 'Zone 2 (56-75% FTP)',
    },
    tempo: {
      name: 'Tempo',
      description: 'Moderate intensity, "comfortably hard". Short sentences are possible.',
      zoneRange: 'Zone 3 (76-90% FTP)',
    },
    sweetspot: {
      name: 'Sweet Spot',
      description: 'High efficiency just below threshold. Challenging but manageable.',
      zoneRange: 'Zone 4 low (88-94% FTP)',
    },
    threshold: {
      name: 'Threshold',
      description: 'At or just above FTP. Maximum sustainable effort for about 60 minutes.',
      zoneRange: 'Zone 4 (95-105% FTP)',
    },
    vo2max: {
      name: 'VO2max',
      description: 'High-intensity intervals. Breathing becomes heavy.',
      zoneRange: 'Zone 5 (106-120% FTP)',
    },
    sprint: {
      name: 'Sprint/Neuromuscular',
      description: 'Maximal effort, short intervals. Full recovery between reps.',
      zoneRange: 'Zone 6-7 (121%+ FTP)',
    },
    recovery: {
      name: 'Recovery',
      description: 'Very easy cycling for active rest.',
      zoneRange: 'Zone 1 (0-55% FTP)',
    },
  }
}

/**
 * Calculate recommended weekly TSS based on experience and goals
 */
export function getRecommendedWeeklyTss(
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite',
  goal: 'maintenance' | 'building' | 'racing'
): { minTss: number; maxTss: number; description: string } {
  const tssRanges = {
    beginner: { maintenance: { min: 200, max: 300 }, building: { min: 300, max: 400 }, racing: { min: 350, max: 450 } },
    intermediate: { maintenance: { min: 350, max: 450 }, building: { min: 450, max: 600 }, racing: { min: 500, max: 700 } },
    advanced: { maintenance: { min: 500, max: 650 }, building: { min: 650, max: 850 }, racing: { min: 700, max: 900 } },
    elite: { maintenance: { min: 700, max: 900 }, building: { min: 900, max: 1200 }, racing: { min: 1000, max: 1400 } },
  }

  const range = tssRanges[fitnessLevel][goal]

  const descriptions = {
    beginner: 'Build cautiously and let the body adapt',
    intermediate: 'Balance load with recovery using a 3:1 ratio',
    advanced: 'Can handle higher volumes with proper periodization',
    elite: 'Maximum adaptations require maximum load and recovery',
  }

  return {
    minTss: range.min,
    maxTss: range.max,
    description: descriptions[fitnessLevel],
  }
}
