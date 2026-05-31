// lib/program-generator/templates/5k-10k.ts
// 5K and 10K training templates

import { PeriodPhase } from '@/types'

export interface ShortRaceTemplateWeek {
  week: number
  phase: PeriodPhase
  longRunKm: number
  weeklyVolumeKm: number
  keyWorkouts: {
    type: 'long' | 'tempo' | 'intervals' | 'easy' | 'vo2max' | 'race-pace' | 'strength'
    description: string
    details: string
  }[]
}

/**
 * 8-week 10K training template
 * Focus on threshold and VO2max development
 */
export function get8Week10KTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): ShortRaceTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 20, peak: 40, longRun: 12 },
    intermediate: { start: 30, peak: 55, longRun: 16 },
    advanced: { start: 40, peak: 70, longRun: 20 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-3)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'easy', description: 'Easy run', details: 'Zone 1-2' },
        { type: 'tempo', description: 'Tempo run', details: '20 min Zone 3-4' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.8,
      weeklyVolumeKm: volumes.start * 1.15,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'intervals', description: 'Threshold intervals', details: '6 x 4 min Zone 4' },
        { type: 'easy', description: 'Recovery run', details: 'Zone 1-2' },
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.9,
      weeklyVolumeKm: volumes.start * 1.25,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'tempo', description: 'Tempo run', details: '25 min Zone 4' },
        { type: 'vo2max', description: 'VO2max intervals', details: '8 x 2 min Zone 5' },
      ],
    },

    // BUILD PHASE (Weeks 4-6)
    {
      week: 4,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.65, // Recovery week
      weeklyVolumeKm: volumes.start * 1.0,
      keyWorkouts: [
        { type: 'long', description: 'Moderate long run', details: 'Taper' },
        { type: 'easy', description: 'Easy jog', details: 'Recovery' },
      ],
    },
    {
      week: 5,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Long run with tempo', details: 'Last 5 km at 10K pace' },
        { type: 'vo2max', description: 'VO2max intervals', details: '10 x 3 min Zone 5' },
        { type: 'race-pace', description: '10K pace session', details: '5 km at 10K pace' },
      ],
    },
    {
      week: 6,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'intervals', description: '1 km intervals', details: '5 x 1 km at 10K pace' },
        { type: 'tempo', description: 'Tempo run', details: '30 min Zone 4' },
      ],
    },

    // PEAK & TAPER (Weeks 7-8)
    {
      week: 7,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.peak * 0.7,
      keyWorkouts: [
        { type: 'easy', description: 'Moderate session', details: 'Zone 2' },
        { type: 'vo2max', description: 'Short intervals', details: '6 x 2 min Zone 5' },
        { type: 'easy', description: 'Easy jog', details: 'Zone 1-2' },
      ],
    },
    {
      week: 8,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.4,
      weeklyVolumeKm: volumes.peak * 0.5,
      keyWorkouts: [
        { type: 'easy', description: 'Short and easy', details: 'Zone 1-2' },
        { type: 'race-pace', description: 'Short 10K pace', details: '2 km at race pace + strides' },
        { type: 'race-pace', description: 'RACE DAY!', details: '10K race' },
      ],
    },
  ]
}

/**
 * 6-week 5K training template
 * High intensity focus with VO2max and speed work
 */
export function get6Week5KTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): ShortRaceTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 15, peak: 30, longRun: 10 },
    intermediate: { start: 25, peak: 45, longRun: 13 },
    advanced: { start: 35, peak: 60, longRun: 16 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-2)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'tempo', description: 'Tempo run', details: '20 min Zone 4' },
        { type: 'vo2max', description: 'VO2max intervals', details: '6 x 2 min Zone 5' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.85,
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'intervals', description: 'Fast intervals', details: '8 x 400 m at 5K pace' },
        { type: 'easy', description: 'Recovery run', details: 'Zone 1-2' },
      ],
    },

    // BUILD PHASE (Weeks 3-4)
    {
      week: 3,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Long run with tempo', details: 'Last 2 km at 5K pace' },
        { type: 'vo2max', description: 'VO2max intervals', details: '10 x 1 min Zone 5' },
        { type: 'race-pace', description: '5K pace session', details: '3 km at 5K pace' },
      ],
    },
    {
      week: 4,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.6, // Recovery week
      weeklyVolumeKm: volumes.peak * 0.65,
      keyWorkouts: [
        { type: 'easy', description: 'Moderate session', details: 'Taper' },
        { type: 'tempo', description: 'Light tempo', details: '15 min Zone 3-4' },
      ],
    },

    // PEAK & TAPER (Weeks 5-6)
    {
      week: 5,
      phase: 'PEAK',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Last long run', details: 'Zone 2-3' },
        { type: 'intervals', description: '1 km intervals', details: '4 x 1 km at 5K pace' },
        { type: 'vo2max', description: 'Max intervals', details: '12 x 1 min Zone 5' },
      ],
    },
    {
      week: 6,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.4,
      weeklyVolumeKm: volumes.peak * 0.5,
      keyWorkouts: [
        { type: 'easy', description: 'Short and easy', details: 'Zone 1-2' },
        { type: 'race-pace', description: 'Short strides', details: '1 km + 6 x 100 m strides' },
        { type: 'race-pace', description: 'RACE DAY!', details: '5K race' },
      ],
    },
  ]
}

/**
 * Get VO2max workout recommendations for 5K/10K
 */
export function getVO2maxWorkouts(): {
  name: string
  description: string
  workout: string
  purpose: string
}[] {
  return [
    {
      name: '400 m repetitions',
      description: 'Classic short intervals',
      workout: '12-16 x 400 m at 5K pace, 200 m jog recovery',
      purpose: 'Develops VO2max and speed endurance',
    },
    {
      name: '1000 m intervals',
      description: 'Longer VO2max work',
      workout: '5-6 x 1000 m at 5K-10K pace, 2 min recovery',
      purpose: 'Improves oxygen uptake capacity',
    },
    {
      name: 'Pyramid intervals',
      description: 'Varied interval training',
      workout: '400-800-1200-1600-1200-800-400 m, jog recovery',
      purpose: 'Broad development of aerobic power',
    },
    {
      name: 'Fartlek',
      description: 'Unstructured interval training',
      workout: '45 min with 2-4 min hard sections (Zone 5), 2 min recovery',
      purpose: 'Fun and varied VO2max training',
    },
  ]
}

/**
 * Get race-week protocol for 5K/10K
 */
export function getShortRaceWeekProtocol(distance: '5k' | '10k'): {
  day: number
  activity: string
  notes: string
}[] {
  if (distance === '5k') {
    return [
      { day: 1, activity: 'Easy jog 25 min', notes: 'Zone 1-2' },
      { day: 2, activity: 'Short intervals', notes: '5 x 1 min Zone 5, stay sharp' },
      { day: 3, activity: 'Rest or walk', notes: 'Active recovery' },
      { day: 4, activity: 'Short jog 15 min + strides', notes: '4-6 x 100 m strides' },
      { day: 5, activity: 'Rest', notes: 'Full rest' },
      { day: 6, activity: 'Short jog 10 min', notes: 'Just keep the legs moving' },
      { day: 7, activity: 'RACE DAY', notes: '5K race - go for it!' },
    ]
  } else {
    return [
      { day: 1, activity: 'Easy jog 30 min', notes: 'Zone 1-2' },
      { day: 2, activity: 'Short intervals', notes: '6 x 1 min Zone 5' },
      { day: 3, activity: 'Easy jog 25 min', notes: 'Zone 2' },
      { day: 4, activity: 'Rest or walk', notes: 'Active recovery' },
      { day: 5, activity: 'Short jog 20 min + strides', notes: '4 x 100 m strides' },
      { day: 6, activity: 'Rest or short jog', notes: 'Optional 10 min easy jog' },
      { day: 7, activity: 'RACE DAY', notes: '10K race - good luck!' },
    ]
  }
}

/**
 * Pace guidance for 5K/10K racing
 */
export function getRacePaceStrategy(distance: '5k' | '10k'): {
  segment: string
  strategy: string
  pacing: string
}[] {
  if (distance === '5k') {
    return [
      { segment: 'First kilometer', strategy: 'Start controlled', pacing: '2-3 sec/km slower than target pace' },
      { segment: 'Kilometers 2-4', strategy: 'Find the rhythm', pacing: 'Target pace, even and steady' },
      { segment: 'Last kilometer', strategy: 'Empty the tank', pacing: 'Increase pace, sprint the final 400 m' },
    ]
  } else {
    return [
      { segment: 'First 2 km', strategy: 'Start controlled', pacing: '2-3 sec/km slower than target pace' },
      { segment: 'Kilometers 3-7', strategy: 'Hold even pace', pacing: 'Target pace, focus on form' },
      { segment: 'Kilometers 8-9', strategy: 'Build gradually', pacing: 'Start lifting the pace slightly' },
      { segment: 'Last kilometer', strategy: 'Sprint', pacing: 'Give everything you have left' },
    ]
  }
}
