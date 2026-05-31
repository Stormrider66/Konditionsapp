// lib/program-generator/templates/skiing.ts
// Cross-country skiing training program templates with pace-based zones

import { PeriodPhase } from '@/types'

export interface SkiingTemplateWorkout {
  type: 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'sprint' | 'recovery' | 'technique' | 'distance'
  name: string
  description: string
  duration: number // minutes
  technique: 'classic' | 'skating' | 'both' | 'any'
  surface: 'snow' | 'roller_ski' | 'running' | 'any'
  paceZone: number // Primary zone (1-5)
  structure?: string // Interval structure like "4 x 8 min @ threshold"
}

export interface SkiingTemplateWeek {
  week: number
  phase: PeriodPhase
  focus: string
  weeklyHours: number
  keyWorkouts: SkiingTemplateWorkout[]
}

/**
 * 8-Week Threshold Builder Program (Competition Season)
 * Designed to improve lactate threshold pace for racing
 * Assumes athlete has snow access
 */
export function get8WeekThresholdBuilder(
  weeklyHours: 6 | 8 | 10 | 12
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 8 // Normalize to 8-hour base

  return [
    // PHASE 1: Base Building (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      focus: 'Build aerobic base and regain snow feel',
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseSkiingWorkouts(1, hourMultiplier),
    },
    {
      week: 2,
      phase: 'BASE',
      focus: 'Continue base training with a technical focus',
      weeklyHours: weeklyHours,
      keyWorkouts: getBaseSkiingWorkouts(2, hourMultiplier),
    },

    // PHASE 2: Tempo Development (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      focus: 'Introduce sub-threshold tempo sessions',
      weeklyHours: weeklyHours,
      keyWorkouts: getTempoSkiingWorkouts(3, hourMultiplier),
    },
    {
      week: 4,
      phase: 'RECOVERY',
      focus: 'Recovery week - technique focus',
      weeklyHours: Math.round(weeklyHours * 0.6),
      keyWorkouts: getRecoverySkiingWorkouts(hourMultiplier),
    },

    // PHASE 3: Threshold Development (Weeks 5-6)
    {
      week: 5,
      phase: 'BUILD',
      focus: 'Threshold intervals in classic technique',
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdSkiingWorkouts(5, 'classic', hourMultiplier),
    },
    {
      week: 6,
      phase: 'BUILD',
      focus: 'Threshold intervals in skating',
      weeklyHours: weeklyHours,
      keyWorkouts: getThresholdSkiingWorkouts(6, 'skating', hourMultiplier),
    },

    // PHASE 4: Peak & Race Prep (Weeks 7-8)
    {
      week: 7,
      phase: 'PEAK',
      focus: 'VO2max intervals and fartlek',
      weeklyHours: weeklyHours,
      keyWorkouts: getPeakSkiingWorkouts(hourMultiplier),
    },
    {
      week: 8,
      phase: 'RECOVERY',
      focus: 'Taper before racing',
      weeklyHours: Math.round(weeklyHours * 0.5),
      keyWorkouts: getTaperSkiingWorkouts(hourMultiplier),
    },
  ]
}

/**
 * 12-Week Preparation Phase Program (Summer/Fall)
 * Focus on building base with roller skiing and cross-training
 */
export function get12WeekPrepBuilder(
  weeklyHours: 6 | 8 | 10 | 12 | 15
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 10

  const weeks: SkiingTemplateWeek[] = []

  for (let week = 1; week <= 12; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let workouts: SkiingTemplateWorkout[] = []

    if (week <= 3) {
      focus = 'Basic aerobic development - roller skiing and running'
      workouts = getPrepBaseWorkouts(week, hourMultiplier)
    } else if (week === 4 || week === 8) {
      phase = 'RECOVERY'
      focus = 'Recovery week - easy training'
      workouts = getRecoverySkiingWorkouts(hourMultiplier * 0.7)
    } else if (week <= 7) {
      focus = 'Build volume with roller skiing'
      workouts = getPrepVolumeWorkouts(week, hourMultiplier)
    } else if (week <= 11) {
      phase = 'BUILD'
      focus = 'Increased intensity - tempo training'
      workouts = getPrepBuildWorkouts(week, hourMultiplier)
    } else {
      phase = 'RECOVERY'
      focus = 'Evaluation before season start'
      workouts = getEvaluationWorkouts(hourMultiplier)
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.6) : weeklyHours,
      keyWorkouts: workouts,
    })
  }

  return weeks
}

/**
 * 16-Week Vasaloppet Preparation
 * Long-distance race preparation (90km classic)
 */
export function get16WeekVasaloppetPrep(
  weeklyHours: 8 | 10 | 12 | 15
): SkiingTemplateWeek[] {
  const hourMultiplier = weeklyHours / 12

  const weeks: SkiingTemplateWeek[] = []

  for (let week = 1; week <= 16; week++) {
    let phase: PeriodPhase = 'BASE'
    let focus = ''
    let workouts: SkiingTemplateWorkout[] = []

    if (week <= 4) {
      focus = 'Build base endurance with long sessions'
      workouts = getDistanceBaseWorkouts(week, hourMultiplier)
    } else if (week === 5 || week === 9 || week === 13) {
      phase = 'RECOVERY'
      focus = 'Recovery week'
      workouts = getRecoverySkiingWorkouts(hourMultiplier * 0.6)
    } else if (week <= 8) {
      focus = 'Increased distance - classic hill training'
      workouts = getDistanceBuildWorkouts(week, 'classic', hourMultiplier)
    } else if (week <= 12) {
      phase = 'BUILD'
      focus = 'Race-specific training - long sessions with tempo'
      workouts = getVasaloppetSpecificWorkouts(week, hourMultiplier)
    } else if (week <= 15) {
      phase = 'PEAK'
      focus = 'Fine-tuning and simulations'
      workouts = getRaceSimulationWorkouts(week, hourMultiplier)
    } else {
      phase = 'RECOVERY'
      focus = 'Taper before Vasaloppet'
      workouts = getVasaloppetTaperWorkouts(hourMultiplier)
    }

    weeks.push({
      week,
      phase,
      focus,
      weeklyHours: phase === 'RECOVERY' ? Math.round(weeklyHours * 0.5) : weeklyHours,
      keyWorkouts: workouts,
    })
  }

  return weeks
}

// ============================================
// WORKOUT GENERATORS
// ============================================

function getBaseSkiingWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Long distance session',
      description: 'Easy pace in Z2. Focus on relaxed technique.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Base skating session',
      description: 'Medium-long session in Z2. Work on glide feel.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Technique session',
      description: `Exercises and drills for ${week === 1 ? 'classic' : 'skating'} technique.`,
      duration: Math.round(45 * multiplier),
      technique: week === 1 ? 'classic' : 'skating',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Recovery session',
      description: 'Very easy pace. Stretch afterward.',
      duration: Math.round(30 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getTempoSkiingWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'tempo',
      name: 'Classic tempo session',
      description: 'Controlled tempo in Z3. Hold an even rhythm.',
      duration: Math.round(75 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: '30 min warm-up + 30 min Z3 + 15 min cool-down',
    },
    {
      type: 'endurance',
      name: 'Long session',
      description: 'Distance session on varied terrain.',
      duration: Math.round(100 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'threshold',
      name: 'Short threshold intervals',
      description: 'Introduction to threshold work.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 4,
      structure: '4 x 4 min @ Z4 with 3 min recovery',
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Active recovery.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getThresholdSkiingWorkouts(
  week: number,
  technique: 'classic' | 'skating',
  multiplier: number
): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: `Threshold intervals ${technique === 'classic' ? 'classic' : 'skating'}`,
      description: `Intervals at lactate threshold in ${technique === 'classic' ? 'classic' : 'skating'} technique.`,
      duration: Math.round(75 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 4,
      structure: week === 5 ? '4 x 8 min @ Z4 with 4 min recovery' : '3 x 12 min @ Z4 with 5 min recovery',
    },
    {
      type: 'endurance',
      name: 'Distance session',
      description: 'Long session on hilly terrain.',
      duration: Math.round(120 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Fartlek',
      description: 'Playful tempo with natural variation.',
      duration: Math.round(60 * multiplier),
      technique: technique === 'classic' ? 'skating' : 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: 'Vary pace with the terrain, 1-3 min faster on climbs',
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Easy session with a technique focus.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getPeakSkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'vo2max',
      name: 'VO2max intervals',
      description: 'High intensity for maximum oxygen uptake.',
      duration: Math.round(60 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 5,
      structure: '5 x 3 min @ Z5 with 3 min recovery',
    },
    {
      type: 'threshold',
      name: 'Over/under intervals',
      description: 'Alternate just above and below threshold.',
      duration: Math.round(70 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 4,
      structure: '4 x (2 min @ Z5 + 4 min @ Z3) with 4 min recovery',
    },
    {
      type: 'distance',
      name: 'Long session with surges',
      description: 'Distance session with tempo increases.',
      duration: Math.round(100 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
      structure: '20 min Z2 + 10 min Z3 + 40 min Z2 + 10 min Z3 + 20 min Z2',
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Active rest.',
      duration: Math.round(30 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getRecoverySkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'technique',
      name: 'Classic technique session',
      description: 'Focus on diagonal stride and double poling.',
      duration: Math.round(45 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'technique',
      name: 'Skating technique session',
      description: 'Focus on V1, V2, and paddling.',
      duration: Math.round(45 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Easy distance',
      description: 'Relaxed skiing on beautiful terrain.',
      duration: Math.round(50 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getTaperSkiingWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Short openers',
      description: 'A few short intervals to stay sharp.',
      duration: Math.round(40 * multiplier),
      technique: 'skating',
      surface: 'snow',
      paceZone: 4,
      structure: '3 x 3 min @ Z4 with 3 min recovery',
    },
    {
      type: 'endurance',
      name: 'Easy distance',
      description: 'Keep the legs moving without tiring yourself out.',
      duration: Math.round(45 * multiplier),
      technique: 'both',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Activation',
      description: 'Short session the day before racing.',
      duration: Math.round(25 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
      structure: 'Include 4 x 30 s fast',
    },
  ]
}

// Preparation phase workouts (roller skiing)
function getPrepBaseWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Roller-ski distance',
      description: 'Long session on asphalt or gravel road.',
      duration: Math.round(80 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Hilly running',
      description: 'Running session on hilly terrain.',
      duration: Math.round(60 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Roller-ski technique session',
      description: 'Drills and exercises to improve technique.',
      duration: Math.round(45 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 1,
    },
    {
      type: 'recovery',
      name: 'Easy cycling/running',
      description: 'Active recovery.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getPrepVolumeWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Long roller-ski session',
      description: 'Build volume with longer sessions.',
      duration: Math.round(100 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Skating roller-skiing',
      description: 'Focus on skating technique.',
      duration: Math.round(70 * multiplier),
      technique: 'skating',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Hill repeats',
      description: 'Hill intervals for power and technique.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 3,
      structure: '8-10 x 2 min uphill with recovery downhill',
    },
    {
      type: 'recovery',
      name: 'Easy running',
      description: 'Relaxed running.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 1,
    },
  ]
}

function getPrepBuildWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Roller-ski threshold session',
      description: 'Intervals at lactate threshold.',
      duration: Math.round(75 * multiplier),
      technique: 'skating',
      surface: 'roller_ski',
      paceZone: 4,
      structure: '4 x 8 min @ Z4 with 4 min recovery',
    },
    {
      type: 'endurance',
      name: 'Varied long session',
      description: 'Alternate between classic and skating.',
      duration: Math.round(120 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Fartlek running',
      description: 'Varied pace on trails.',
      duration: Math.round(50 * multiplier),
      technique: 'any',
      surface: 'running',
      paceZone: 3,
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Active recovery.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getEvaluationWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'threshold',
      name: 'Threshold test',
      description: '30-minute max test to evaluate progress.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'roller_ski',
      paceZone: 4,
      structure: '20 min warm-up + 30 min all-out + cool-down',
    },
    {
      type: 'endurance',
      name: 'Final distance session',
      description: 'Last long session before the season starts.',
      duration: Math.round(90 * multiplier),
      technique: 'both',
      surface: 'roller_ski',
      paceZone: 2,
    },
  ]
}

// Vasaloppet-specific workouts
function getDistanceBaseWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Super-long distance session',
      description: 'Build endurance for Vasaloppet.',
      duration: Math.round(150 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'endurance',
      name: 'Medium distance',
      description: 'Standard long session.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'technique',
      name: 'Double poling',
      description: 'Focus on double-poling technique.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Active rest.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'any',
      paceZone: 1,
    },
  ]
}

function getDistanceBuildWorkouts(week: number, technique: 'classic' | 'skating', multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Long session with hills',
      description: 'Hilly course to build climbing strength.',
      duration: Math.round(180 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Hill tempo session',
      description: 'Specific hill training.',
      duration: Math.round(70 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 3,
      structure: '10 x 3 min uphill with recovery downhill',
    },
    {
      type: 'endurance',
      name: 'Medium session',
      description: 'Standard endurance session.',
      duration: Math.round(90 * multiplier),
      technique,
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Recovery',
      description: 'Easy session.',
      duration: Math.round(45 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getVasaloppetSpecificWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Race simulation',
      description: 'Simulate race distance and pace.',
      duration: Math.round(210 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
      structure: 'Visualize the race, practice drink/food intake',
    },
    {
      type: 'threshold',
      name: 'Pace changes',
      description: 'Practice race-like pace surges.',
      duration: Math.round(90 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: 'Every 20 min: increase pace for 5 min',
    },
    {
      type: 'endurance',
      name: 'Long session with double-poling focus',
      description: 'Lots of double poling for Vasaloppet.',
      duration: Math.round(120 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Recovery.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getRaceSimulationWorkouts(week: number, multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'distance',
      name: 'Last long session',
      description: 'Last truly long session before racing.',
      duration: Math.round(180 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Shakeout',
      description: 'Keep the feel without creating fatigue.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
      structure: 'Include 4-5 x 1 min at race pace',
    },
    {
      type: 'recovery',
      name: 'Easy session',
      description: 'Rest before racing.',
      duration: Math.round(40 * multiplier),
      technique: 'any',
      surface: 'snow',
      paceZone: 1,
    },
  ]
}

function getVasaloppetTaperWorkouts(multiplier: number): SkiingTemplateWorkout[] {
  return [
    {
      type: 'endurance',
      name: 'Medium-long session',
      description: 'Maintain base fitness.',
      duration: Math.round(60 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 2,
    },
    {
      type: 'tempo',
      name: 'Openers',
      description: 'Short tempo surges.',
      duration: Math.round(40 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 3,
      structure: '5 x 1 min race pace with full recovery',
    },
    {
      type: 'recovery',
      name: 'Activation',
      description: 'The day before Vasaloppet.',
      duration: Math.round(20 * multiplier),
      technique: 'classic',
      surface: 'snow',
      paceZone: 1,
      structure: '15 min easy + 4 x 30 s fast',
    },
  ]
}

// Export all skiing templates
export const SKIING_TEMPLATES = {
  'threshold-builder-8week': {
    name: 'Threshold pace builder (8 weeks)',
    description: 'Develop your threshold pace for the racing season.',
    duration: 8,
    generator: get8WeekThresholdBuilder,
  },
  'prep-phase-12week': {
    name: 'Preparation phase (12 weeks)',
    description: 'Summer/fall program with roller skiing and running.',
    duration: 12,
    generator: get12WeekPrepBuilder,
  },
  'vasaloppet-16week': {
    name: 'Vasaloppet preparation (16 weeks)',
    description: 'Complete preparation for Vasaloppet or another long-distance race.',
    duration: 16,
    generator: get16WeekVasaloppetPrep,
  },
}
