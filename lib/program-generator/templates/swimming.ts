// lib/program-generator/templates/swimming.ts
// Swimming training program templates with CSS-based zones

import { PeriodPhase } from '@/types'

export interface SwimmingTemplateWorkout {
  type: 'endurance' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'technique' | 'openwater'
  name: string
  description: string
  duration: number // minutes
  distance: number // meters
  swimZone: number // Primary zone (1-5)
  structure?: string // Set structure like "8 x 100 m @ CSS"
  strokeFocus?: 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'im' | 'mixed'
}

export interface SwimmingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyDistance: number // meters
  weeklyHours: number
  keyWorkouts: SwimmingTemplateWorkout[]
}

/**
 * 8-Week CSS Improvement Program
 * Designed to increase Critical Swim Speed
 * Based on classic periodization with 3:1 load:recovery ratio
 */
export function get8WeekCssBuilder(
  currentCss: number, // seconds per 100m
  weeklyDistance: 10000 | 15000 | 20000 | 25000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 15000 // Normalize to 15km base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build aerobic base and test the starting point',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getBaseSwimWorkouts(1, distanceMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Continue aerobic development with longer sessions',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5.5),
      keyWorkouts: getBaseSwimWorkouts(2, distanceMultiplier),
    },

    // PHASE 2: Threshold Development (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introduce CSS intervals',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 6),
      keyWorkouts: getThresholdSwimWorkouts(3, distanceMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery week - reduce volume by 40%',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3.5),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },

    // PHASE 3: Intensive Threshold (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Longer CSS intervals to raise threshold',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 15000) * 6.5),
      keyWorkouts: getIntensiveThresholdWorkouts(5, distanceMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Peak threshold week - max adaptation',
      weeklyDistance: Math.round(weeklyDistance * 1.15),
      weeklyHours: Math.round((weeklyDistance / 15000) * 7),
      keyWorkouts: getIntensiveThresholdWorkouts(6, distanceMultiplier),
    },

    // PHASE 4: Peak & Test (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'VO2max intervals and fartlek',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 6),
      keyWorkouts: getPeakSwimWorkouts(distanceMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper and CSS retest',
      weeklyDistance: Math.round(weeklyDistance * 0.5),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3),
      keyWorkouts: getTestWeekSwimWorkouts(distanceMultiplier),
    },
  ]
}

/**
 * 12-Week Distance Swimmer Program
 * Focus on endurance swimming for 1500m-5000m events
 */
export function get12WeekDistanceProgram(
  targetEvent: 1500 | 3000 | 5000,
  weeklyDistance: 15000 | 20000 | 25000 | 30000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 20000
  const eventMultiplier = targetEvent / 1500

  const weeks: SwimmingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let volumeMultiplier = 1

    if (week <= 3) {
      focus = 'Basic aerobic development'
      volumeMultiplier = 0.7 + (week * 0.1)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Recovery week'
      volumeMultiplier = 0.6
    } else if (week <= 7) {
      focus = 'Build volume and endurance'
      volumeMultiplier = 0.9 + ((week - 4) * 0.05)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Race-specific training'
      volumeMultiplier = 1.0 + ((week - 8) * 0.05)
    } else {
      phase = 'RECOVERY'
      focus = 'Taper before race day'
      volumeMultiplier = 0.5
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyDistance: Math.round(weeklyDistance * volumeMultiplier),
      weeklyHours: Math.round((weeklyDistance / 20000) * 6 * volumeMultiplier),
      keyWorkouts: phase === 'RECOVERY'
        ? getRecoverySwimWorkouts(distanceMultiplier)
        : getDistanceWorkouts(week, distanceMultiplier, eventMultiplier),
    })
  }

  return weeks
}

/**
 * 8-Week Sprint Improvement Program
 * Focus on 50m-200m events
 */
export function get8WeekSprintProgram(
  targetEvent: 50 | 100 | 200,
  weeklyDistance: 10000 | 15000 | 20000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 15000

  return [
    // Weeks 1-2: Technique & Base
    {
      week: 1,
      phase: 'BASE',
      focus: 'Technique focus and aerobic base',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 4.5),
      keyWorkouts: getTechniqueWorkouts(distanceMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Build base speed and efficiency',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getSprintBaseWorkouts(distanceMultiplier),
    },

    // Weeks 3-4: Speed Development
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introduce sprint intervals',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getSprintDevelopmentWorkouts(3, distanceMultiplier, targetEvent),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery week',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 15000) * 3),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },

    // Weeks 5-6: Race Pace
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Race pace and race-pace intervals',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 15000) * 5),
      keyWorkouts: getRacePaceWorkouts(5, distanceMultiplier, targetEvent),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Peak sprint training',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 15000) * 5.5),
      keyWorkouts: getRacePaceWorkouts(6, distanceMultiplier, targetEvent),
    },

    // Weeks 7-8: Taper & Race
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Sharpness and race starts',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 15000) * 4),
      keyWorkouts: getSprintPeakWorkouts(distanceMultiplier, targetEvent),
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Race week!',
      weeklyDistance: Math.round(weeklyDistance * 0.4),
      weeklyHours: Math.round((weeklyDistance / 15000) * 2),
      keyWorkouts: getSprintTaperWorkouts(distanceMultiplier, targetEvent),
    },
  ]
}

/**
 * 8-Week Open Water Preparation
 * Build endurance for open water events (1.5km-10km)
 */
export function getOpenWaterPrep(
  eventDistanceKm: 1.5 | 3 | 5 | 10,
  weeklyDistance: 15000 | 20000 | 25000 | 30000
): SwimmingTemplateWeek[] {
  const distanceMultiplier = weeklyDistance / 20000
  const eventMultiplier = eventDistanceKm / 3

  return [
    // Weeks 1-2: Pool Base
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build endurance base in the pool',
      weeklyDistance: Math.round(weeklyDistance * 0.8),
      weeklyHours: Math.round((weeklyDistance / 20000) * 5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long swim',
          description: 'Endurance swimming at an even pace',
          duration: 60,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Continuous swimming in Z2',
          strokeFocus: 'freestyle',
        },
        {
          type: 'threshold',
          name: 'CSS intervals',
          description: 'Build threshold durability',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 3,
          structure: '5 x 400 m @ CSS, 30 s recovery',
        },
        {
          type: 'technique',
          name: 'Stroke technique',
          description: 'Focus on efficiency',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Catch-up, fingertip drag, fist drills',
        },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Increase distance and introduce open-water-specific training',
      weeklyDistance: Math.round(weeklyDistance * 0.9),
      weeklyHours: Math.round((weeklyDistance / 20000) * 5.5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Long swim with pace changes',
          description: 'Simulate open-water conditions',
          duration: 70,
          distance: Math.round(3500 * distanceMultiplier),
          swimZone: 2,
          structure: '5 x (500 m Z2 + 100 m Z3)',
        },
        {
          type: 'openwater',
          name: 'Sighting & navigation',
          description: 'Learn to sight while swimming',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Include sighting every 6th stroke',
        },
        {
          type: 'threshold',
          name: 'Pyramid session',
          description: 'Variable-distance intervals',
          duration: 55,
          distance: Math.round(2800 * distanceMultiplier),
          swimZone: 3,
          structure: '200-400-600-400-200 m @ CSS',
        },
      ],
    },
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Increase intensity and simulate racing',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 20000) * 6),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Ultra-long swim',
          description: `${Math.round(eventDistanceKm * 0.7)} km continuous`,
          duration: Math.round(45 * eventMultiplier),
          distance: Math.round(eventDistanceKm * 700),
          swimZone: 2,
          structure: 'Include tempo blocks',
        },
        {
          type: 'openwater',
          name: 'Mass-start simulation',
          description: 'Practice starts and positioning',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 3,
          structure: '10 x 100 m race-pace start + 150 m steady',
        },
        {
          type: 'threshold',
          name: 'Race pace-block',
          description: 'Race pace with short recovery periods',
          duration: 55,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 3,
          structure: '3 x 800 m @ target race pace, 45 s recovery',
        },
      ],
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery and supercompensation',
      weeklyDistance: Math.round(weeklyDistance * 0.6),
      weeklyHours: Math.round((weeklyDistance / 20000) * 3.5),
      keyWorkouts: getRecoverySwimWorkouts(distanceMultiplier),
    },
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Peak volume - longest session',
      weeklyDistance: Math.round(weeklyDistance * 1.1),
      weeklyHours: Math.round((weeklyDistance / 20000) * 6.5),
      keyWorkouts: [
        {
          type: 'openwater',
          name: 'Race simulation',
          description: `Full ${eventDistanceKm} km simulation`,
          duration: Math.round(60 * eventMultiplier),
          distance: Math.round(eventDistanceKm * 1000),
          swimZone: 3,
          structure: 'Include sighting, pace changes, final sprint',
        },
        {
          type: 'vo2max',
          name: 'VO2max intervals',
          description: 'Builds top-end capacity',
          duration: 45,
          distance: Math.round(2000 * distanceMultiplier),
          swimZone: 4,
          structure: '8 x 100 m @ 90% effort, 30 s recovery',
        },
        {
          type: 'technique',
          name: 'Bilateral breathing',
          description: 'Practice breathing to both sides for open water',
          duration: 40,
          distance: Math.round(1800 * distanceMultiplier),
          swimZone: 2,
          structure: 'Alternate: 3-stroke breathing, right, left',
        },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Specific race preparation',
      weeklyDistance: weeklyDistance,
      weeklyHours: Math.round((weeklyDistance / 20000) * 6),
      keyWorkouts: [
        {
          type: 'openwater',
          name: 'Open-water session',
          description: 'Train in an open-water environment if possible',
          duration: 60,
          distance: Math.round(3000 * distanceMultiplier),
          swimZone: 2,
          structure: 'Include navigation and pace control',
        },
        {
          type: 'threshold',
          name: 'Negative split drill',
          description: 'Learn to distribute effort correctly',
          duration: 55,
          distance: Math.round(2800 * distanceMultiplier),
          swimZone: 3,
          structure: '2 x 1000 m with the second 500 m faster',
        },
        {
          type: 'sprint',
          name: 'Finishing sprints',
          description: 'Practice the finishing kick',
          duration: 40,
          distance: Math.round(1500 * distanceMultiplier),
          swimZone: 5,
          structure: '10 x 50 m all-out, 45 s recovery',
        },
      ],
    },
    {
      week: 7,
      phase: 'PEAK',
      focus: 'Sharpness without fatigue',
      weeklyDistance: Math.round(weeklyDistance * 0.75),
      weeklyHours: Math.round((weeklyDistance / 20000) * 4.5),
      keyWorkouts: [
        {
          type: 'endurance',
          name: 'Steady session',
          description: 'Keep swim feel sharp',
          duration: 50,
          distance: Math.round(2500 * distanceMultiplier),
          swimZone: 2,
        },
        {
          type: 'openwater',
          name: 'Opener',
          description: 'Race-pace blocks',
          duration: 40,
          distance: Math.round(1800 * distanceMultiplier),
          swimZone: 3,
          structure: '3 x 400 m @ race pace',
        },
        {
          type: 'recovery',
          name: 'Easy swimming',
          description: 'Active rest',
          duration: 30,
          distance: Math.round(1200 * distanceMultiplier),
          swimZone: 1,
        },
      ],
    },
    {
      week: 8,
      phase: 'PEAK',
      focus: 'Race week!',
      weeklyDistance: Math.round(weeklyDistance * 0.4),
      weeklyHours: Math.round((weeklyDistance / 20000) * 2.5),
      keyWorkouts: [
        {
          type: 'recovery',
          name: 'Easy swimming',
          description: 'Keep the body fresh',
          duration: 30,
          distance: 1500,
          swimZone: 1,
        },
        {
          type: 'threshold',
          name: 'Activation',
          description: 'Short race-pace work the day before',
          duration: 25,
          distance: 1000,
          swimZone: 3,
          structure: '4 x 100 m @ race pace with full recovery',
        },
        {
          type: 'openwater',
          name: 'RACE DAY!',
          description: `Open water ${eventDistanceKm} km`,
          duration: Math.round(eventDistanceKm * 20),
          distance: eventDistanceKm * 1000,
          swimZone: 3,
        },
      ],
    },
  ]
}

// Helper functions for workout generation

function getBaseSwimWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Long swim',
      description: 'Build aerobic base with steady swimming',
      duration: Math.round((45 + week * 10) * multiplier),
      distance: Math.round((2500 + week * 500) * multiplier),
      swimZone: 2,
      strokeFocus: 'freestyle',
    },
    {
      type: 'technique',
      name: 'Technique session',
      description: 'Focus on swim efficiency and SWOLF',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2000 * multiplier),
      swimZone: 2,
      structure: 'Drills: Catch-up, fingertip, 6-kick switch',
      strokeFocus: 'mixed',
    },
    {
      type: 'endurance',
      name: 'Intervals with recovery',
      description: 'Build aerobic capacity with short recovery periods',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
      structure: '10 x 200 m @ Z2, 15 s recovery',
    },
    {
      type: 'recovery',
      name: 'Active recovery',
      description: 'Easy swimming, mix strokes',
      duration: 30,
      distance: 1500,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
  ]
}

function getThresholdSwimWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'CSS intervals',
      description: 'Main session for raising threshold',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: week === 3 ? '6 x 300 m @ CSS, 20 s recovery' : '8 x 300 m @ CSS, 20 s recovery',
    },
    {
      type: 'endurance',
      name: 'Long swim',
      description: 'Steady aerobic swimming',
      duration: Math.round(60 * multiplier),
      distance: Math.round(3200 * multiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'Broken 1000',
      description: 'Race-like intensity with short pauses',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 3,
      structure: '2 x (5 x 200 m @ CSS, 10 s recovery) with 60 s between blocks',
    },
    {
      type: 'recovery',
      name: 'Technique & recovery',
      description: 'Easy swimming with a technique focus',
      duration: 35,
      distance: 1800,
      swimZone: 1,
      structure: 'Drills and easy swimming',
    },
  ]
}

function getIntensiveThresholdWorkouts(week: number, multiplier: number): SwimmingTemplateWorkout[] {
  const intervalLength = week === 5 ? 300 : 400

  return [
    {
      type: 'threshold',
      name: 'Long CSS intervals',
      description: 'Maximize time at threshold',
      duration: Math.round(55 * multiplier),
      distance: Math.round(3000 * multiplier),
      swimZone: 3,
      structure: `6 x ${intervalLength} m @ CSS, 20-30 s recovery`,
    },
    {
      type: 'vo2max',
      name: 'VO2max-set',
      description: 'Raise maximum oxygen uptake',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '8 x 100 m @ 90-95% max, 20 s recovery',
    },
    {
      type: 'endurance',
      name: 'Pyramid',
      description: 'Variable distance for mental endurance',
      duration: Math.round(60 * multiplier),
      distance: Math.round(3500 * multiplier),
      swimZone: 2,
      structure: '100-200-300-400-500-400-300-200-100 m @ Z2-3',
    },
    {
      type: 'recovery',
      name: 'Recovery swim',
      description: 'Active recovery',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getPeakSwimWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max intervals',
      description: 'Peak your capacity',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '5 x 200 m @ 95% max, 30 s recovery',
    },
    {
      type: 'threshold',
      name: 'Over-Under',
      description: 'Learn to handle pace changes',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: '4 x (200 m @ 105% CSS + 200 m @ 90% CSS)',
    },
    {
      type: 'endurance',
      name: 'Steady distance session',
      description: 'Recovery between hard sessions',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 2,
    },
    {
      type: 'sprint',
      name: 'Sprint intervals',
      description: 'Neuromuscular activation',
      duration: Math.round(35 * multiplier),
      distance: Math.round(1500 * multiplier),
      swimZone: 5,
      structure: '10 x 50 m all-out, 45 s recovery',
    },
  ]
}

function getRecoverySwimWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Active recovery',
      description: 'Easy swimming, mix strokes',
      duration: 40,
      distance: 2000,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
    {
      type: 'technique',
      name: 'Technique session',
      description: 'Focus on efficiency',
      duration: 35,
      distance: 1800,
      swimZone: 1,
      structure: 'Drills and easy swimming',
    },
    {
      type: 'endurance',
      name: 'Easy endurance',
      description: 'Steady Z2, enjoy the swimming',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
  ]
}

function getTestWeekSwimWorkouts(_multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Easy swimming',
      description: 'Rest before the test',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
    {
      type: 'threshold',
      name: 'CSS-TEST!',
      description: '400 m + 200 m time trial for CSS calculation',
      duration: 45,
      distance: 1800,
      swimZone: 3,
      structure: '400 m TT, 10 min recovery, 200 m TT',
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Rest and celebrate your new CSS!',
      duration: 25,
      distance: 1200,
      swimZone: 1,
    },
  ]
}

function getDistanceWorkouts(week: number, multiplier: number, eventMultiplier: number): SwimmingTemplateWorkout[] {
  const baseDuration = 50 + Math.min(week * 5, 30)
  const baseDistance = 2500 + Math.min(week * 250, 1500)

  return [
    {
      type: 'endurance',
      name: 'Long swim',
      description: 'Main session for aerobic development',
      duration: Math.round(baseDuration * multiplier * eventMultiplier),
      distance: Math.round(baseDistance * multiplier * eventMultiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'CSS intervals',
      description: 'Threshold-raising session',
      duration: Math.round(50 * multiplier),
      distance: Math.round(2800 * multiplier),
      swimZone: 3,
      structure: '6 x 400 m @ CSS, 20 s recovery',
    },
    {
      type: 'technique',
      name: 'Technique & efficiency',
      description: 'Build better SWOLF',
      duration: 40,
      distance: 2000,
      swimZone: 2,
      structure: 'Focus on stroke length and cadence',
    },
    {
      type: 'recovery',
      name: 'Active rest',
      description: 'Easy swimming',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getTechniqueWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'technique',
      name: 'Fundamental technique',
      description: 'Focus on water feel and stroke technique',
      duration: 45,
      distance: Math.round(2000 * multiplier),
      swimZone: 2,
      structure: 'Catch-up, fingertip drag, one-arm drills',
      strokeFocus: 'freestyle',
    },
    {
      type: 'endurance',
      name: 'Aerobic base',
      description: 'Steady swimming',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
    {
      type: 'technique',
      name: 'Turns & starts',
      description: 'Improve turn technique',
      duration: 40,
      distance: Math.round(1800 * multiplier),
      swimZone: 2,
      structure: '16 x 50 m with a focus on turns',
    },
    {
      type: 'recovery',
      name: 'Active rest',
      description: 'Easy swimming, all strokes',
      duration: 30,
      distance: 1500,
      swimZone: 1,
      strokeFocus: 'mixed',
    },
  ]
}

function getSprintBaseWorkouts(multiplier: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Aerobic base',
      description: 'Build base capacity',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2500 * multiplier),
      swimZone: 2,
    },
    {
      type: 'threshold',
      name: 'Fartlek swim',
      description: 'Variable pace',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 3,
      structure: '16 x 100 m (fast/easy)',
    },
    {
      type: 'technique',
      name: 'Start technique',
      description: 'Pool starts and underwater work',
      duration: 35,
      distance: 1500,
      swimZone: 2,
      structure: 'Starter, streamline, dolphin kicks',
    },
    {
      type: 'recovery',
      name: 'Easy swimming',
      description: 'Active recovery',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getSprintDevelopmentWorkouts(week: number, multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  const intervalDistance = targetEvent <= 100 ? 50 : 100

  return [
    {
      type: 'sprint',
      name: 'Sprint intervals',
      description: 'Build maximum speed',
      duration: Math.round(40 * multiplier),
      distance: Math.round(1800 * multiplier),
      swimZone: 5,
      structure: `12 x ${intervalDistance} m @ 95%, 45 s recovery`,
    },
    {
      type: 'threshold',
      name: 'Lactate tolerance',
      description: 'Learn to tolerate lactate',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2200 * multiplier),
      swimZone: 4,
      structure: '8 x 100 m @ 85-90%, 20 s recovery',
    },
    {
      type: 'technique',
      name: 'Race technique',
      description: 'Turns and finishes',
      duration: 35,
      distance: 1500,
      swimZone: 2,
      structure: 'Focus on efficient turns and finish touches',
    },
    {
      type: 'endurance',
      name: 'Aerobic base',
      description: 'Recovery and volume',
      duration: Math.round(40 * multiplier),
      distance: Math.round(2300 * multiplier),
      swimZone: 2,
    },
  ]
}

function getRacePaceWorkouts(week: number, multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'sprint',
      name: 'Race-pace intervals',
      description: 'Simulate race pace',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2000 * multiplier),
      swimZone: 5,
      structure: `6 x ${targetEvent} m @ race pace, full recovery`,
    },
    {
      type: 'vo2max',
      name: 'VO2max-set',
      description: 'Raise oxygen uptake capacity',
      duration: Math.round(40 * multiplier),
      distance: Math.round(1800 * multiplier),
      swimZone: 4,
      structure: '8 x 75 m @ max effort, 30 s recovery',
    },
    {
      type: 'threshold',
      name: 'Descending set',
      description: 'Negative split drill',
      duration: Math.round(45 * multiplier),
      distance: Math.round(2400 * multiplier),
      swimZone: 3,
      structure: '4 x 300 m descending, each faster than the previous one',
    },
    {
      type: 'recovery',
      name: 'Easy swimming',
      description: 'Active rest',
      duration: 30,
      distance: 1500,
      swimZone: 1,
    },
  ]
}

function getSprintPeakWorkouts(multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'sprint',
      name: 'Race-starts',
      description: 'Practice race starts',
      duration: 35,
      distance: Math.round(1200 * multiplier),
      swimZone: 5,
      structure: `8 x ${targetEvent <= 100 ? 25 : 50} m race start, full recovery`,
    },
    {
      type: 'threshold',
      name: 'Opener session',
      description: 'Activate the systems',
      duration: 40,
      distance: Math.round(1800 * multiplier),
      swimZone: 3,
      structure: '4 x 200 m @ 85% with full recovery',
    },
    {
      type: 'technique',
      name: 'Race prep',
      description: 'Mental and physical preparation',
      duration: 30,
      distance: 1200,
      swimZone: 2,
      structure: 'Visualization + easy drills',
    },
  ]
}

function getSprintTaperWorkouts(multiplier: number, targetEvent: number): SwimmingTemplateWorkout[] {
  return [
    {
      type: 'recovery',
      name: 'Easy swimming',
      description: 'Keep swim feel sharp',
      duration: 25,
      distance: 1200,
      swimZone: 1,
    },
    {
      type: 'sprint',
      name: 'Activation',
      description: 'Short race-pace work',
      duration: 25,
      distance: 800,
      swimZone: 5,
      structure: `4 x ${targetEvent <= 100 ? 25 : 50} m @ race pace, full recovery`,
    },
    {
      type: 'sprint',
      name: 'RACE DAY!',
      description: `${targetEvent} m sprint`,
      duration: Math.round(targetEvent / 25),
      distance: targetEvent,
      swimZone: 5,
    },
  ]
}

/**
 * Get swimming workout type descriptions
 */
export function getSwimmingWorkoutTypeDescriptions(): Record<SwimmingTemplateWorkout['type'], { name: string; description: string; zoneRange: string }> {
  return {
    endurance: {
      name: 'Endurance',
      description: 'Low intensity for aerobic base. Comfortable swimming at an even pace.',
      zoneRange: 'Zone 2 (83-93% CSS)',
    },
    threshold: {
      name: 'Threshold (CSS)',
      description: 'At or just below CSS. Maximum sustainable pace for about 30 minutes.',
      zoneRange: 'Zone 3 (93-102% CSS)',
    },
    vo2max: {
      name: 'VO2max',
      description: 'High-intensity intervals. Breathing becomes heavy.',
      zoneRange: 'Zone 4 (102-111% CSS)',
    },
    sprint: {
      name: 'Sprint',
      description: 'Maximal effort, short intervals. Full recovery between reps.',
      zoneRange: 'Zone 5 (111%+ CSS)',
    },
    recovery: {
      name: 'Recovery',
      description: 'Very easy swimming for active rest.',
      zoneRange: 'Zone 1 (74-83% CSS)',
    },
    technique: {
      name: 'Technique',
      description: 'Focus on swim efficiency, drills, and SWOLF improvement.',
      zoneRange: 'Zone 1-2',
    },
    openwater: {
      name: 'Open water',
      description: 'Specific training for open-water swimming.',
      zoneRange: 'Varies',
    },
  }
}

/**
 * Calculate recommended weekly distance based on experience and goals
 */
export function getRecommendedWeeklyDistance(
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite',
  goal: 'maintenance' | 'building' | 'racing'
): { minDistance: number; maxDistance: number; description: string } {
  const distanceRanges = {
    beginner: { maintenance: { min: 6000, max: 10000 }, building: { min: 10000, max: 15000 }, racing: { min: 12000, max: 18000 } },
    intermediate: { maintenance: { min: 12000, max: 18000 }, building: { min: 18000, max: 25000 }, racing: { min: 20000, max: 30000 } },
    advanced: { maintenance: { min: 20000, max: 30000 }, building: { min: 30000, max: 40000 }, racing: { min: 35000, max: 50000 } },
    elite: { maintenance: { min: 35000, max: 50000 }, building: { min: 50000, max: 70000 }, racing: { min: 60000, max: 80000 } },
  }

  const range = distanceRanges[fitnessLevel][goal]

  const descriptions = {
    beginner: 'Build cautiously and focus on technique',
    intermediate: 'Balance volume with quality using a 3:1 ratio',
    advanced: 'Can handle higher volumes with proper periodization',
    elite: 'Maximum adaptations require maximum load and recovery',
  }

  return {
    minDistance: range.min,
    maxDistance: range.max,
    description: descriptions[fitnessLevel],
  }
}
