// lib/program-generator/templates/marathon.ts
// Marathon training template (16-20 weeks)

import { PeriodPhase } from '@/types'

export interface MarathonTemplateWeek {
  week: number
  phase: PeriodPhase
  longRunKm: number
  weeklyVolumeKm: number
  keyWorkouts: {
    type: 'long' | 'tempo' | 'intervals' | 'easy' | 'strength' | 'race-pace'
    description: string
    details: string
  }[]
}

/**
 * Standard 16-week marathon training template
 * Based on proven periodization principles
 */
export function get16WeekMarathonTemplate(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): MarathonTemplateWeek[] {
  const baseVolumes = {
    beginner: { start: 30, peak: 55, longRun: 25 },
    intermediate: { start: 45, peak: 75, longRun: 32 },
    advanced: { start: 60, peak: 95, longRun: 35 },
  }

  const volumes = baseVolumes[experienceLevel]

  return [
    // BASE PHASE (Weeks 1-8)
    {
      week: 1,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.start,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2, comfortable pace' },
        { type: 'easy', description: 'Easy run', details: 'Zone 1-2' },
        { type: 'strength', description: 'Full-body strength', details: '3 x 12-15 reps' },
      ],
    },
    {
      week: 2,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.65,
      weeklyVolumeKm: volumes.start * 1.1,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2' },
        { type: 'easy', description: 'Easy jog', details: 'Zone 1-2' },
        { type: 'strength', description: 'Leg strength', details: 'Focus on squats and lunges' },
      ],
    },
    {
      week: 3,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.7,
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2, light Zone 3 for the last 15 min' },
        { type: 'easy', description: 'Recovery run', details: 'Zone 1-2' },
        { type: 'tempo', description: 'Light tempo run', details: '20 min in Zone 3' },
      ],
    },
    {
      week: 4,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.55, // Recovery week
      weeklyVolumeKm: volumes.start * 0.9,
      keyWorkouts: [
        { type: 'long', description: 'Moderate long run', details: 'Zone 2, taper' },
        { type: 'easy', description: 'Easy jog', details: 'Recovery' },
      ],
    },
    {
      week: 5,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.75,
      weeklyVolumeKm: volumes.start * 1.3,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'tempo', description: 'Tempo run', details: '25 min in Zone 3-4' },
        { type: 'strength', description: 'Full-body strength', details: 'Increase the weights' },
      ],
    },
    {
      week: 6,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.8,
      weeklyVolumeKm: volumes.start * 1.4,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2-3' },
        { type: 'intervals', description: 'Light intervals', details: '6 x 4 min Zone 3-4' },
        { type: 'easy', description: 'Easy run', details: 'Zone 2' },
      ],
    },
    {
      week: 7,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.85,
      weeklyVolumeKm: volumes.start * 1.5,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Increase the distance' },
        { type: 'tempo', description: 'Tempo run', details: '30 min Zone 4' },
        { type: 'easy', description: 'Recovery run', details: 'Zone 1-2' },
      ],
    },
    {
      week: 8,
      phase: 'BASE',
      longRunKm: volumes.longRun * 0.65, // Recovery week
      weeklyVolumeKm: volumes.start * 1.2,
      keyWorkouts: [
        { type: 'long', description: 'Moderate long run', details: 'Taper' },
        { type: 'easy', description: 'Easy jog', details: 'Recovery' },
      ],
    },

    // BUILD PHASE (Weeks 9-12)
    {
      week: 9,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.9,
      weeklyVolumeKm: volumes.peak * 0.8,
      keyWorkouts: [
        { type: 'long', description: 'Long run', details: 'Zone 2, last 30 min at marathon pace' },
        { type: 'tempo', description: 'Threshold run', details: '35 min Zone 4' },
        { type: 'intervals', description: 'VO2 intervals', details: '8 x 3 min Zone 5' },
      ],
    },
    {
      week: 10,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.95,
      weeklyVolumeKm: volumes.peak * 0.85,
      keyWorkouts: [
        { type: 'long', description: 'Long run with tempo', details: 'Build to marathon pace halfway through' },
        { type: 'race-pace', description: 'Marathon pace session', details: '15 km at marathon pace' },
        { type: 'easy', description: 'Recovery run', details: 'Zone 1-2' },
      ],
    },
    {
      week: 11,
      phase: 'BUILD',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak * 0.9,
      keyWorkouts: [
        { type: 'long', description: 'Peak long run', details: 'Zone 2-3' },
        { type: 'tempo', description: 'Tempo run', details: '40 min Zone 4' },
        { type: 'intervals', description: 'Fast intervals', details: '10 x 2 min Zone 5' },
      ],
    },
    {
      week: 12,
      phase: 'BUILD',
      longRunKm: volumes.longRun * 0.7, // Recovery week
      weeklyVolumeKm: volumes.peak * 0.7,
      keyWorkouts: [
        { type: 'long', description: 'Moderate long run', details: 'Taper' },
        { type: 'easy', description: 'Easy jog', details: 'Recovery' },
      ],
    },

    // PEAK PHASE (Weeks 13-14)
    {
      week: 13,
      phase: 'PEAK',
      longRunKm: volumes.longRun,
      weeklyVolumeKm: volumes.peak,
      keyWorkouts: [
        { type: 'long', description: 'Last long run', details: 'Zone 2, last 45 min at marathon pace' },
        { type: 'race-pace', description: 'Marathon pace session', details: '18 km at marathon pace' },
        { type: 'intervals', description: 'Final intervals', details: '6 x 5 min Zone 4-5' },
      ],
    },
    {
      week: 14,
      phase: 'PEAK',
      longRunKm: volumes.longRun * 0.6,
      weeklyVolumeKm: volumes.peak * 0.75,
      keyWorkouts: [
        { type: 'long', description: 'Moderate long run', details: 'Start tapering' },
        { type: 'tempo', description: 'Tempo run', details: '30 min Zone 4' },
        { type: 'easy', description: 'Easy jog', details: 'Zone 1-2' },
      ],
    },

    // TAPER PHASE (Weeks 15-16)
    {
      week: 15,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.45,
      weeklyVolumeKm: volumes.peak * 0.6,
      keyWorkouts: [
        { type: 'easy', description: 'Moderate session', details: 'Zone 2' },
        { type: 'intervals', description: 'Short intervals', details: '5 x 2 min Zone 5, stay sharp' },
        { type: 'easy', description: 'Easy jog', details: 'Zone 1-2' },
      ],
    },
    {
      week: 16,
      phase: 'TAPER',
      longRunKm: volumes.longRun * 0.3,
      weeklyVolumeKm: volumes.peak * 0.4,
      keyWorkouts: [
        { type: 'easy', description: 'Short and easy', details: 'Zone 1-2' },
        { type: 'easy', description: 'Easy jogs', details: 'Save energy' },
        { type: 'race-pace', description: 'RACE DAY!', details: 'Marathon - 42.2 km' },
      ],
    },
  ]
}

/**
 * Get weekly mileage progression for marathon
 */
export function getMarathonMilestones(weeks: number): {
  week: number
  milestone: string
  advice: string
}[] {
  const milestones = [
    { week: 4, milestone: 'First recovery week', advice: 'Let the body adapt' },
    { week: 8, milestone: 'Base phase complete', advice: 'Base fitness is built, now intensity increases' },
    { week: 10, milestone: 'First long marathon-pace session', advice: 'Get familiar with your race pace' },
    { week: 12, milestone: 'Second recovery week', advice: 'Important taper before the peak phase' },
    { week: 13, milestone: 'Peak week', advice: 'Maximum volume, final hard week' },
    { week: 14, milestone: 'Begin taper', advice: 'Reduce volume, maintain intensity' },
    { week: 15, milestone: 'Taper week 1', advice: 'Less volume, body recovers' },
    { week: 16, milestone: 'Race week!', advice: 'Minimal training, maximum rest' },
  ]

  return milestones.filter(m => m.week <= weeks)
}

/**
 * Get race-week taper protocol
 */
export function getRaceWeekProtocol(): {
  day: number
  activity: string
  notes: string
}[] {
  return [
    { day: 1, activity: 'Easy jog 30 min', notes: 'Zone 1-2, just keep moving' },
    { day: 2, activity: 'Rest or easy walk', notes: 'Active recovery' },
    { day: 3, activity: 'Short jog 20 min + strides', notes: 'Stay sharp' },
    { day: 4, activity: 'Rest', notes: 'Full rest, light stretching' },
    { day: 5, activity: 'Short jog 15 min', notes: 'Final small session' },
    { day: 6, activity: 'Rest', notes: 'Prepare and carbohydrate load' },
    { day: 7, activity: 'RACE DAY', notes: 'Marathon. Execute your plan.' },
  ]
}
